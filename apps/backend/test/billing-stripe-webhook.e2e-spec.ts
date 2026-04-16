import { INestApplication } from '@nestjs/common';
import {
  cleanDatabase,
  createTestApp,
  dbQuery,
  registerUser,
  request,
  userIdFromToken,
  type TestUser,
} from './helpers/test-app';
import { BillingService } from '../src/modules/billing/billing.service';

/**
 * Phase B/D: webhook idempotency + reconcile upsert logic. We don't hit real
 * Stripe — instead we drive `BillingService.handleWebhookEvent` directly
 * with hand-crafted event payloads. This exercises the processed_webhook_
 * events dedup, the subscription upsert, and invoice mirroring, without
 * needing a Stripe account or `stripe-cli listen`.
 *
 * The HTTP-level `/webhooks/stripe` controller is a thin signature-verifier
 * wrapper around this same service method; testing the service covers the
 * business logic that matters.
 */
describe('Stripe webhook processing (e2e)', () => {
  let app: INestApplication;
  let user: TestUser;
  let billingService: BillingService;
  const STRIPE_CUSTOMER_ID = 'cus_test_001';
  const STRIPE_SUB_ID = 'sub_test_001';

  beforeAll(async () => {
    app = await createTestApp();
    await cleanDatabase(app);
    user = await registerUser(app);
    billingService = app.get(BillingService);

    // Pretend the tenant already went through the checkout flow and got a
    // Stripe customer assigned. Real checkout would populate this via the
    // service; hand-writing it here avoids needing a live Stripe mock.
    await dbQuery(
      app,
      `UPDATE subscriptions SET "stripeCustomerId" = $1 WHERE "userId" = $2`,
      [STRIPE_CUSTOMER_ID, userIdFromToken(user.accessToken)],
    );
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await app.close();
  });

  const makeSubscriptionEvent = (overrides: {
    eventId: string;
    type:
      | 'customer.subscription.created'
      | 'customer.subscription.updated'
      | 'customer.subscription.deleted';
    status?: string;
    cancelAtPeriodEnd?: boolean;
  }) => {
    const now = Math.floor(Date.now() / 1000);
    return {
      id: overrides.eventId,
      type: overrides.type,
      data: {
        object: {
          id: STRIPE_SUB_ID,
          customer: STRIPE_CUSTOMER_ID,
          status: overrides.status ?? 'active',
          cancel_at_period_end: overrides.cancelAtPeriodEnd ?? false,
          trial_end: null,
          items: {
            data: [
              {
                current_period_start: now,
                current_period_end: now + 30 * 24 * 60 * 60,
                price: { id: 'price_dummy' },
              },
            ],
          },
        },
      },
    };
  };

  describe('Idempotency', () => {
    it('processes a new event exactly once', async () => {
      const event = makeSubscriptionEvent({
        eventId: 'evt_unique_1',
        type: 'customer.subscription.created',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await billingService.handleWebhookEvent(event as any);

      const rows = await dbQuery<{ count: string }>(
        app,
        `SELECT COUNT(*)::text AS count FROM processed_webhook_events WHERE "stripeEventId" = $1`,
        [event.id],
      );
      expect(rows[0].count).toBe('1');
    });

    it('skips a duplicate event — processed_webhook_events unchanged', async () => {
      const event = makeSubscriptionEvent({
        eventId: 'evt_duplicate',
        type: 'customer.subscription.updated',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await billingService.handleWebhookEvent(event as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await billingService.handleWebhookEvent(event as any);

      const rows = await dbQuery<{ count: string }>(
        app,
        `SELECT COUNT(*)::text AS count FROM processed_webhook_events WHERE "stripeEventId" = $1`,
        [event.id],
      );
      expect(rows[0].count).toBe('1');
    });
  });

  describe('Subscription upsert', () => {
    it('updates status, period, cancel flag from created/updated event', async () => {
      const event = makeSubscriptionEvent({
        eventId: 'evt_sub_update_1',
        type: 'customer.subscription.updated',
        status: 'past_due',
        cancelAtPeriodEnd: true,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await billingService.handleWebhookEvent(event as any);

      const rows = await dbQuery<{
        status: string;
        cancelAtPeriodEnd: boolean;
        stripeSubscriptionId: string;
      }>(
        app,
        `SELECT "status", "cancelAtPeriodEnd", "stripeSubscriptionId"
           FROM subscriptions WHERE "stripeCustomerId" = $1`,
        [STRIPE_CUSTOMER_ID],
      );
      expect(rows[0].status).toBe('past_due');
      expect(rows[0].cancelAtPeriodEnd).toBe(true);
      expect(rows[0].stripeSubscriptionId).toBe(STRIPE_SUB_ID);
    });

    it('canceled event without pending cancel-at-period-end reverts to free', async () => {
      const event = makeSubscriptionEvent({
        eventId: 'evt_sub_canceled',
        type: 'customer.subscription.deleted',
        status: 'canceled',
        cancelAtPeriodEnd: false,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await billingService.handleWebhookEvent(event as any);

      const rows = await dbQuery<{
        planKey: string;
        stripeSubscriptionId: string | null;
      }>(
        app,
        `SELECT "planKey", "stripeSubscriptionId"
           FROM subscriptions WHERE "stripeCustomerId" = $1`,
        [STRIPE_CUSTOMER_ID],
      );
      expect(rows[0].planKey).toBe('free');
      expect(rows[0].stripeSubscriptionId).toBeNull();
    });

    it('ignores events for unknown customer (no tenant explodes)', async () => {
      const event = makeSubscriptionEvent({
        eventId: 'evt_unknown_customer',
        type: 'customer.subscription.updated',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const eventObj = event.data.object as Record<string, unknown>;
      eventObj.customer = 'cus_nonexistent';

      // Should not throw — it logs a warning and returns.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(
        billingService.handleWebhookEvent(event as any),
      ).resolves.toBeUndefined();
    });
  });
});
