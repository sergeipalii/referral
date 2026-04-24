import { INestApplication } from '@nestjs/common';
import {
  cleanDatabase,
  createApiKey,
  createPartner,
  createRule,
  createTestApp,
  dbQuery,
  registerUser,
  request,
  setTenantPlan,
  signBody,
  userIdFromToken,
  TestApiKey,
  TestPartner,
  TestUser,
} from './helpers/test-app';

describe('Click tracking (e2e)', () => {
  let app: INestApplication;
  let user: TestUser;
  let apiKey: TestApiKey;
  let partner: TestPartner;

  const server = () => app.getHttpServer();

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
    partner = await createPartner(app, user.accessToken, 'Click Partner');

    await createRule(app, user.accessToken, {
      eventName: 'signup',
      ruleType: 'fixed',
      amount: '10',
    });
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await app.close();
  });

  describe('GET /api/r/:partnerCode (redirect)', () => {
    it('302-redirects to the landing URL', async () => {
      const res = await request(server())
        .get(`/api/r/${partner.code}`)
        .query({ to: 'https://example.com/landing' })
        .expect(302);

      expect(res.headers.location).toBe('https://example.com/landing');
    });

    it('sets rk_click cookie', async () => {
      const res = await request(server())
        .get(`/api/r/${partner.code}`)
        .query({ to: 'https://example.com' })
        .expect(302);

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const clickCookie = Array.isArray(cookies)
        ? cookies.find((c: string) => c.startsWith('rk_click='))
        : typeof cookies === 'string' && cookies.startsWith('rk_click=')
          ? cookies
          : undefined;
      expect(clickCookie).toBeDefined();
    });

    it('redirects to / when no to param (invalid partner still redirects)', async () => {
      const res = await request(server())
        .get('/api/r/nonexistent_code')
        .expect(302);

      expect(res.headers.location).toBe('/');
    });
  });

  describe('POST /api/clicks (first-party)', () => {
    it('returns clickId + expiresAt', async () => {
      const res = await request(server())
        .post('/api/clicks')
        .send({ partnerCode: partner.code })
        .expect(201);

      expect(res.body.clickId).toBeDefined();
      expect(res.body.expiresAt).toBeDefined();
      // Default window = 30 days; expiry should be ~30 days from now
      const expiresMs = new Date(res.body.expiresAt).getTime() - Date.now();
      const daysDiff = expiresMs / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeGreaterThan(28);
      expect(daysDiff).toBeLessThan(31);
    });

    it('rejects unknown partner code', async () => {
      await request(server())
        .post('/api/clicks')
        .send({ partnerCode: 'unknown_code' })
        .expect(404);
    });
  });

  describe('Track with clickId', () => {
    it('resolves partner from a valid click', async () => {
      // Create a click via first-party endpoint
      const clickRes = await request(server())
        .post('/api/clicks')
        .send({ partnerCode: partner.code })
        .expect(201);

      const res = await track({
        clickId: clickRes.body.clickId,
        eventName: 'signup',
      }).expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.partnerId).toBe(partner.id);
      expect(parseFloat(res.body.accrualAmount)).toBe(10);
    });

    it('falls back to partnerCode when click has expired', async () => {
      // Create a click then manually expire it
      const clickRes = await request(server())
        .post('/api/clicks')
        .send({ partnerCode: partner.code })
        .expect(201);

      await dbQuery(
        app,
        `UPDATE clicks SET "expiresAt" = NOW() - INTERVAL '1 day' WHERE "id" = $1`,
        [clickRes.body.clickId],
      );

      // Track with expired clickId + fallback partnerCode
      const res = await track({
        clickId: clickRes.body.clickId,
        partnerCode: partner.code,
        eventName: 'signup',
      }).expect(201);

      expect(res.body.partnerId).toBe(partner.id);
    });

    it('errors when click expired and no fallback partnerCode', async () => {
      const clickRes = await request(server())
        .post('/api/clicks')
        .send({ partnerCode: partner.code })
        .expect(201);

      await dbQuery(
        app,
        `UPDATE clicks SET "expiresAt" = NOW() - INTERVAL '1 day' WHERE "id" = $1`,
        [clickRes.body.clickId],
      );

      await track({
        clickId: clickRes.body.clickId,
        eventName: 'signup',
      }).expect(400);
    });
  });

  describe('Priority: promoCode > clickId > partnerCode', () => {
    it('promoCode wins over clickId', async () => {
      const otherPartner = await createPartner(
        app,
        user.accessToken,
        'PromoPartner',
      );
      await request(server())
        .post('/api/promo-codes')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ partnerId: otherPartner.id, code: 'CLICK_VS_PROMO' })
        .expect(201);

      const clickRes = await request(server())
        .post('/api/clicks')
        .send({ partnerCode: partner.code })
        .expect(201);

      const res = await track({
        clickId: clickRes.body.clickId,
        promoCode: 'CLICK_VS_PROMO',
        eventName: 'signup',
      }).expect(201);

      // promoCode wins — partner should be otherPartner
      expect(res.body.partnerId).toBe(otherPartner.id);
    });
  });

  describe('Cross-tenant isolation', () => {
    it('click from one tenant cannot be used by another', async () => {
      const clickRes = await request(server())
        .post('/api/clicks')
        .send({ partnerCode: partner.code })
        .expect(201);

      // Different tenant
      const other = await registerUser(app, {
        email: 'click-other@example.com',
      });
      await setTenantPlan(app, userIdFromToken(other.accessToken), 'business');
      const otherKey = await createApiKey(app, other.accessToken);

      // Track with other tenant's API key — click belongs to first tenant
      const body = JSON.stringify({
        clickId: clickRes.body.clickId,
        eventName: 'signup',
      });
      await request(server())
        .post('/api/conversions/track')
        .set('X-API-Key', otherKey.key)
        .set('X-Signature', signBody(body, otherKey.signingSecret))
        .set('Content-Type', 'application/json')
        .send(body)
        .expect(400); // click not found for this tenant → no fallback → 400
    });
  });
});
