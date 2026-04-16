import { INestApplication } from '@nestjs/common';
import {
  cleanDatabase,
  createApiKey,
  createPartner,
  createRule,
  createTestApp,
  registerUser,
  request,
  setTenantPlan,
  userIdFromToken,
  TestUser,
} from './helpers/test-app';

/**
 * Phase C — PlanLimitGuard enforcement. Verifies that Free-plan callers
 * hitting gated resources get 402 with a structured body the frontend can
 * use to render an upgrade CTA, and that upgrading (via direct DB write —
 * we skip Stripe in this suite) removes the gate.
 */
describe('Billing plan gates (e2e)', () => {
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

  describe('Count-based limits', () => {
    it('blocks creating the 6th partner on Free (maxPartners=5)', async () => {
      const user = await registerUser(app, {
        email: 'cap-partner@example.com',
      });
      for (let i = 0; i < 5; i++) {
        await createPartner(app, user.accessToken, `P${i}`);
      }
      const res = await request(server())
        .post('/api/partners')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ name: 'P6' })
        .expect(402);

      expect(res.body.error).toBe('plan_limit');
      expect(res.body.reason).toBe('count');
      expect(res.body.limit).toBe('maxPartners');
      expect(res.body.requiredPlan).toBe('pro');
      expect(res.body.currentPlan).toBe('free');
    });

    it('allows creating partners after upgrade', async () => {
      const user = await registerUser(app, {
        email: 'upgrade-partner@example.com',
      });
      for (let i = 0; i < 5; i++) {
        await createPartner(app, user.accessToken, `P${i}`);
      }
      await setTenantPlan(app, userIdFromToken(user.accessToken), 'pro');

      await createPartner(app, user.accessToken, 'P6');
    });

    it('blocks creating the 2nd API key on Free (maxApiKeys=1)', async () => {
      const user = await registerUser(app, {
        email: 'cap-apikey@example.com',
      });
      await createApiKey(app, user.accessToken, 'First');

      const res = await request(server())
        .post('/api/auth/api-keys')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ name: 'Second' })
        .expect(402);

      expect(res.body.error).toBe('plan_limit');
      expect(res.body.limit).toBe('maxApiKeys');
    });
  });

  describe('Capability gates', () => {
    it('blocks CSV export on Free (csvExport=false)', async () => {
      const user = await registerUser(app, {
        email: 'cap-csv@example.com',
      });
      const res = await request(server())
        .get('/api/payments/export')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(402);
      expect(res.body.capability).toBe('csvExport');
      expect(res.body.requiredPlan).toBe('pro');
    });

    it('blocks batch payouts on Pro (batchPayouts=false)', async () => {
      const user = await registerUser(app, {
        email: 'cap-batch-pro@example.com',
      });
      await setTenantPlan(app, userIdFromToken(user.accessToken), 'pro');

      const res = await request(server())
        .post('/api/payments/batch')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ periodStart: '2026-01-01', periodEnd: '2026-01-31' })
        .expect(402);
      expect(res.body.capability).toBe('batchPayouts');
      expect(res.body.requiredPlan).toBe('business');
    });

    it('blocks creating recurring accrual rule on Free', async () => {
      const user = await registerUser(app, {
        email: 'cap-recurring@example.com',
      });
      const res = await request(server())
        .post('/api/accrual-rules')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          eventName: 'renewal',
          ruleType: 'recurring_percentage',
          amount: '20',
          recurrenceDurationMonths: 12,
        })
        .expect(402);
      expect(res.body.capability).toBe('recurringRules');
      expect(res.body.requiredPlan).toBe('pro');
    });

    it('allows the same recurring rule creation on Pro', async () => {
      const user = await registerUser(app, {
        email: 'pro-recurring@example.com',
      });
      await setTenantPlan(app, userIdFromToken(user.accessToken), 'pro');

      await createRule(app, user.accessToken, {
        eventName: 'renewal',
        ruleType: 'recurring_percentage',
        amount: '20',
        recurrenceDurationMonths: 12,
      });
    });

    it('allows non-recurring rule creation on Free', async () => {
      const user = await registerUser(app, {
        email: 'free-fixed@example.com',
      });
      // Fixed/percentage don't need the recurringRules capability.
      await createRule(app, user.accessToken, {
        eventName: 'signup',
        ruleType: 'fixed',
        amount: '5',
      });
    });
  });

  describe('Cross-tenant gate isolation', () => {
    it('one tenant hitting a cap does not affect another', async () => {
      const alice = await registerUser(app, {
        email: 'iso-alice@example.com',
      });
      const bob = await registerUser(app, {
        email: 'iso-bob@example.com',
      });

      // Fill Alice's partner quota
      for (let i = 0; i < 5; i++) {
        await createPartner(app, alice.accessToken, `A${i}`);
      }
      // Alice is blocked on 6th
      await request(server())
        .post('/api/partners')
        .set('Authorization', `Bearer ${alice.accessToken}`)
        .send({ name: 'A6' })
        .expect(402);

      // Bob can still create — his plan usage is independent
      await createPartner(app, bob.accessToken, 'B1');
    });
  });
});
