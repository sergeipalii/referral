import { INestApplication } from '@nestjs/common';
import {
  cleanDatabase,
  createApiKey,
  createPartner,
  createRule,
  createTestApp,
  registerUser,
  request,
  signBody,
  TestUser,
} from './helpers/test-app';

/**
 * Phase A of billing: auto-created subscription, read-only view with plan
 * limits/usage. Stripe integration comes later — these tests only exercise
 * local bookkeeping.
 */
describe('Billing subscription (e2e)', () => {
  let app: INestApplication;

  const server = () => app.getHttpServer();

  beforeAll(async () => {
    app = await createTestApp();
    await cleanDatabase(app);
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await app.close();
  });

  describe('GET /api/billing/subscription', () => {
    it('returns a free-plan subscription automatically after registration', async () => {
      const user = await registerUser(app, {
        email: 'billing-fresh@example.com',
      });

      const res = await request(server())
        .get('/api/billing/subscription')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(res.body.plan).toBe('free');
      expect(res.body.status).toBe('active');
      expect(res.body.priceCents).toBe(0);
      expect(res.body.cancelAtPeriodEnd).toBe(false);

      // Free-plan features are gated off — these become true on Pro/Business.
      expect(res.body.features).toEqual({
        mmpWebhook: false,
        csvExport: false,
        batchPayouts: false,
        recurringRules: false,
      });

      // All usage buckets default to 0 for a brand-new tenant, none exceed.
      expect(res.body.usage.partners).toEqual({
        used: 0,
        limit: 5,
        exceeded: false,
      });
      expect(res.body.usage.apiKeys).toEqual({
        used: 0,
        limit: 1,
        exceeded: false,
      });
      expect(res.body.usage.conversions).toMatchObject({
        used: 0,
        limit: 1_000,
        exceeded: false,
      });
    });

    it('reflects current partner count in the partners bucket', async () => {
      const user = await registerUser(app, {
        email: 'billing-partners@example.com',
      });
      await createPartner(app, user.accessToken, 'P1');
      await createPartner(app, user.accessToken, 'P2');
      await createPartner(app, user.accessToken, 'P3');

      const res = await request(server())
        .get('/api/billing/subscription')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(res.body.usage.partners.used).toBe(3);
    });

    it('counts conversion events into the current period', async () => {
      const user = await registerUser(app, {
        email: 'billing-convs@example.com',
      });
      const apiKey = await createApiKey(app, user.accessToken);
      const partner = await createPartner(app, user.accessToken);
      await createRule(app, user.accessToken, {
        eventName: 'signup',
        ruleType: 'fixed',
        amount: '1',
      });

      // Three signup events today, `count=2` each → total of 6 conversions.
      const today = new Date().toISOString().slice(0, 10);
      for (let i = 0; i < 3; i++) {
        const body = JSON.stringify({
          partnerCode: partner.code,
          eventName: 'signup',
          eventDate: today,
          count: 2,
          idempotencyKey: `bill_usage_${i}`,
        });
        await request(server())
          .post('/api/conversions/track')
          .set('X-API-Key', apiKey.key)
          .set('X-Signature', signBody(body, apiKey.signingSecret))
          .set('Content-Type', 'application/json')
          .send(body)
          .expect(201);
      }

      const res = await request(server())
        .get('/api/billing/subscription')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(res.body.usage.conversions.used).toBe(6);
      expect(res.body.usage.conversions.exceeded).toBe(false);
    });

    it('flags the partners bucket as exceeded when at the cap', async () => {
      const user = await registerUser(app, {
        email: 'billing-cap@example.com',
      });
      // Free plan cap is 5; creating exactly 5 should flip `exceeded` to true
      // (limit-reached is the trigger, not just strictly over).
      for (let i = 0; i < 5; i++) {
        await createPartner(app, user.accessToken, `P${i}`);
      }

      const res = await request(server())
        .get('/api/billing/subscription')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(res.body.usage.partners.used).toBe(5);
      expect(res.body.usage.partners.exceeded).toBe(true);
    });

    it('rejects unauthenticated', async () => {
      await request(server()).get('/api/billing/subscription').expect(401);
    });

    it('isolates usage across tenants', async () => {
      const alice = await registerUser(app, {
        email: 'billing-alice@example.com',
      });
      const bob = await registerUser(app, {
        email: 'billing-bob@example.com',
      });

      await createPartner(app, alice.accessToken, 'A');
      await createPartner(app, alice.accessToken, 'B');

      const aliceSub = await request(server())
        .get('/api/billing/subscription')
        .set('Authorization', `Bearer ${alice.accessToken}`)
        .expect(200);
      const bobSub = await request(server())
        .get('/api/billing/subscription')
        .set('Authorization', `Bearer ${bob.accessToken}`)
        .expect(200);

      expect(aliceSub.body.usage.partners.used).toBe(2);
      expect(bobSub.body.usage.partners.used).toBe(0);
    });
  });
});
