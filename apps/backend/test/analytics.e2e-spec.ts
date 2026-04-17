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
  signBody,
  userIdFromToken,
  TestUser,
  TestApiKey,
  TestPartner,
} from './helpers/test-app';

describe('Analytics (e2e)', () => {
  let app: INestApplication;
  let user: TestUser;
  let apiKey: TestApiKey;
  let partnerA: TestPartner;
  let partnerB: TestPartner;

  const server = () => app.getHttpServer();
  const today = new Date().toISOString().slice(0, 10);

  const track = (body: Record<string, unknown>) => {
    const raw = JSON.stringify(body);
    return request(server())
      .post('/api/conversions/track')
      .set('X-API-Key', apiKey.key)
      .set('X-Signature', signBody(raw, apiKey.signingSecret))
      .set('Content-Type', 'application/json')
      .send(raw);
  };

  beforeAll(async () => {
    app = await createTestApp();
    await cleanDatabase(app);
    user = await registerUser(app);
    await setTenantPlan(app, userIdFromToken(user.accessToken), 'business');
    apiKey = await createApiKey(app, user.accessToken);
    partnerA = await createPartner(app, user.accessToken, 'Alpha');
    partnerB = await createPartner(app, user.accessToken, 'Beta');

    await createRule(app, user.accessToken, {
      eventName: 'signup',
      ruleType: 'fixed',
      amount: '10',
    });
    await createRule(app, user.accessToken, {
      eventName: 'purchase',
      ruleType: 'percentage',
      amount: '20',
    });

    // Seed: A gets 5 signups + 2 purchases, B gets 3 signups
    await track({
      partnerCode: partnerA.code,
      eventName: 'signup',
      count: 5,
      eventDate: today,
    }).expect(201);
    await track({
      partnerCode: partnerA.code,
      eventName: 'purchase',
      count: 2,
      revenue: 100,
      eventDate: today,
    }).expect(201);
    await track({
      partnerCode: partnerB.code,
      eventName: 'signup',
      count: 3,
      eventDate: today,
    }).expect(201);
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await app.close();
  });

  describe('GET /api/analytics/kpis', () => {
    it('returns totals for the current period', async () => {
      const res = await request(server())
        .get('/api/analytics/kpis')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .query({ dateFrom: today, dateTo: today })
        .expect(200);

      // 5+2+3 = 10 total conversions
      expect(res.body.totalConversions).toBe(10);
      // revenue from purchase: 100
      expect(Number(res.body.totalRevenue)).toBe(100);
      // accrual: 5*10 + 20%*100 + 3*10 = 50+20+30 = 100
      expect(Number(res.body.totalAccrual)).toBe(100);
      // prev period should exist (may be zero)
      expect(res.body.prev).toBeDefined();
    });

    it('rejects unauthenticated', async () => {
      await request(server()).get('/api/analytics/kpis').expect(401);
    });
  });

  describe('GET /api/analytics/timeseries', () => {
    it('returns daily data points', async () => {
      const res = await request(server())
        .get('/api/analytics/timeseries')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .query({ dateFrom: today, dateTo: today })
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      // Date may differ by ±1 day due to UTC vs local timezone on the DB's
      // DATE column — check the shape, not the exact value.
      expect(res.body[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // Sum across all returned points (should be exactly 1 point for today).
      const total = res.body.reduce(
        (s: number, p: { conversions: number }) => s + p.conversions,
        0,
      );
      expect(total).toBe(10);
    });

    it('filters by partnerId', async () => {
      const res = await request(server())
        .get('/api/analytics/timeseries')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .query({
          dateFrom: today,
          dateTo: today,
          partnerId: partnerA.id,
        })
        .expect(200);

      // Only Alpha's conversions: 5 signups + 2 purchases = 7
      expect(res.body[0].conversions).toBe(7);
    });

    it('filters by eventName', async () => {
      const res = await request(server())
        .get('/api/analytics/timeseries')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .query({ dateFrom: today, dateTo: today, eventName: 'purchase' })
        .expect(200);

      expect(res.body[0].conversions).toBe(2);
    });
  });

  describe('GET /api/analytics/top-partners', () => {
    it('returns partners ranked by conversions', async () => {
      const res = await request(server())
        .get('/api/analytics/top-partners')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .query({ dateFrom: today, dateTo: today, limit: 5 })
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBe(2);
      // Alpha (7) should rank above Beta (3)
      expect(res.body[0].partnerName).toBe('Alpha');
      expect(res.body[0].conversions).toBe(7);
      expect(res.body[1].partnerName).toBe('Beta');
      expect(res.body[1].conversions).toBe(3);
    });
  });

  describe('GET /api/analytics/event-breakdown', () => {
    it('returns breakdown by event name', async () => {
      const res = await request(server())
        .get('/api/analytics/event-breakdown')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .query({ dateFrom: today, dateTo: today })
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      const signup = res.body.find(
        (e: { eventName: string }) => e.eventName === 'signup',
      );
      const purchase = res.body.find(
        (e: { eventName: string }) => e.eventName === 'purchase',
      );
      expect(signup.conversions).toBe(8); // 5+3
      expect(purchase.conversions).toBe(2);
    });
  });

  describe('Cross-tenant isolation', () => {
    it('other tenant sees no data', async () => {
      const other = await registerUser(app, {
        email: 'analytics-other@example.com',
      });
      const res = await request(server())
        .get('/api/analytics/kpis')
        .set('Authorization', `Bearer ${other.accessToken}`)
        .query({ dateFrom: today, dateTo: today })
        .expect(200);

      expect(res.body.totalConversions).toBe(0);
    });
  });
});
