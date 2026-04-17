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
  TestApiKey,
  TestPartner,
  TestUser,
} from './helpers/test-app';

describe('Promo codes (e2e)', () => {
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
    partner = await createPartner(app, user.accessToken, 'Promo Partner');

    await createRule(app, user.accessToken, {
      eventName: 'purchase',
      ruleType: 'fixed',
      amount: '10',
    });
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await app.close();
  });

  describe('Owner CRUD', () => {
    it('creates a promo code (stored lowercase)', async () => {
      const res = await request(server())
        .post('/api/promo-codes')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ partnerId: partner.id, code: 'SUMMER2026' })
        .expect(201);

      expect(res.body.code).toBe('summer2026');
      expect(res.body.partnerId).toBe(partner.id);
      expect(res.body.usedCount).toBe(0);
      expect(res.body.isActive).toBe(true);
    });

    it('rejects duplicate code (409)', async () => {
      await request(server())
        .post('/api/promo-codes')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ partnerId: partner.id, code: 'summer2026' })
        .expect(409);
    });

    it('lists promo codes', async () => {
      const res = await request(server())
        .get('/api/promo-codes')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('filters by partnerId', async () => {
      const otherPartner = await createPartner(app, user.accessToken, 'Other');
      await request(server())
        .post('/api/promo-codes')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ partnerId: otherPartner.id, code: 'OTHERCODE' })
        .expect(201);

      const res = await request(server())
        .get('/api/promo-codes')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .query({ partnerId: partner.id })
        .expect(200);

      for (const code of res.body) {
        expect(code.partnerId).toBe(partner.id);
      }
    });

    it('deletes a promo code', async () => {
      const created = await request(server())
        .post('/api/promo-codes')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ partnerId: partner.id, code: 'DELETEME' })
        .expect(201);

      await request(server())
        .delete(`/api/promo-codes/${created.body.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(204);
    });
  });

  describe('Resolve (API key auth)', () => {
    it('resolves a valid code to partnerId + partnerCode', async () => {
      const res = await request(server())
        .get('/api/promo-codes/resolve')
        .set('X-API-Key', apiKey.key)
        .query({ code: 'SUMMER2026' })
        .expect(200);

      expect(res.body.partnerId).toBe(partner.id);
      expect(res.body.partnerCode).toBe(partner.code);
    });

    it('resolves case-insensitively', async () => {
      const res = await request(server())
        .get('/api/promo-codes/resolve')
        .set('X-API-Key', apiKey.key)
        .query({ code: 'Summer2026' })
        .expect(200);

      expect(res.body.partnerId).toBe(partner.id);
    });

    it('404s on unknown code', async () => {
      await request(server())
        .get('/api/promo-codes/resolve')
        .set('X-API-Key', apiKey.key)
        .query({ code: 'NONEXISTENT' })
        .expect(404);
    });

    it('rejects without API key', async () => {
      // ApiKeyAuthGuard (Passport) returns 403 when no API key is provided,
      // unlike JwtAuthGuard which returns 401.
      await request(server())
        .get('/api/promo-codes/resolve')
        .query({ code: 'SUMMER2026' })
        .expect(403);
    });
  });

  describe('Track with promoCode', () => {
    it('tracks a conversion using promoCode instead of partnerCode', async () => {
      const res = await track({
        promoCode: 'SUMMER2026',
        eventName: 'purchase',
      }).expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.partnerId).toBe(partner.id);
      expect(parseFloat(res.body.accrualAmount)).toBe(10);
    });

    it('increments usedCount after track', async () => {
      const codes = await request(server())
        .get('/api/promo-codes')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .query({ partnerId: partner.id })
        .expect(200);

      const summer = codes.body.find(
        (c: { code: string }) => c.code === 'summer2026',
      );
      expect(summer.usedCount).toBeGreaterThanOrEqual(1);
    });

    it('promoCode overrides partnerCode when both provided', async () => {
      const other = await createPartner(app, user.accessToken, 'Override');
      const res = await track({
        partnerCode: other.code,
        promoCode: 'SUMMER2026',
        eventName: 'purchase',
      }).expect(201);

      // promoCode wins — partner should be the one linked to SUMMER2026
      expect(res.body.partnerId).toBe(partner.id);
    });
  });

  describe('Usage limit', () => {
    it('auto-deactivates after reaching usageLimit', async () => {
      // Create a code with limit=2
      await request(server())
        .post('/api/promo-codes')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          partnerId: partner.id,
          code: 'LIMITED2',
          usageLimit: 2,
        })
        .expect(201);

      // Use it twice → should succeed
      await track({ promoCode: 'LIMITED2', eventName: 'purchase' }).expect(201);
      await track({ promoCode: 'LIMITED2', eventName: 'purchase' }).expect(201);

      // Third time → 404 (auto-deactivated)
      await track({ promoCode: 'LIMITED2', eventName: 'purchase' }).expect(404);

      // Verify isActive=false
      const codes = await request(server())
        .get('/api/promo-codes')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);
      const limited = codes.body.find(
        (c: { code: string }) => c.code === 'limited2',
      );
      expect(limited.isActive).toBe(false);
      expect(limited.usedCount).toBe(2);
    });
  });

  describe('Cross-tenant isolation', () => {
    it('cannot resolve another tenants code', async () => {
      const otherUser = await registerUser(app, {
        email: 'promo-other@example.com',
      });
      await setTenantPlan(
        app,
        userIdFromToken(otherUser.accessToken),
        'business',
      );
      const otherApiKey = await createApiKey(app, otherUser.accessToken);

      // Try to resolve user's code with otherUser's API key
      await request(server())
        .get('/api/promo-codes/resolve')
        .set('X-API-Key', otherApiKey.key)
        .query({ code: 'SUMMER2026' })
        .expect(404);
    });
  });
});
