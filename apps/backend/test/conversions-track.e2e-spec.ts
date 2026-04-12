import { INestApplication } from '@nestjs/common';
import {
  createTestApp,
  cleanDatabase,
  registerUser,
  createApiKey,
  signBody,
  request,
  TestUser,
  TestApiKey,
} from './helpers/test-app';

describe('Conversions Track (e2e)', () => {
  let app: INestApplication;
  let user: TestUser;
  let apiKey: TestApiKey;

  const server = () => app.getHttpServer();

  beforeAll(async () => {
    app = await createTestApp();
    await cleanDatabase(app);

    // Set up user + API key
    user = await registerUser(app);
    apiKey = await createApiKey(app, user.accessToken);

    // Create a partner
    await request(server())
      .post('/api/partners')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ code: 'PARTNER_1', name: 'Test Partner' })
      .expect(201);

    // Create a global accrual rule (fixed $10 per signup)
    await request(server())
      .post('/api/accrual-rules')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        eventName: 'signup',
        ruleType: 'fixed',
        amount: '10',
      })
      .expect(201);

    // Create a percentage rule for purchases
    await request(server())
      .post('/api/accrual-rules')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        eventName: 'purchase',
        ruleType: 'percentage',
        amount: '15',
      })
      .expect(201);
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await app.close();
  });

  describe('Authentication', () => {
    it('should reject requests without API key', async () => {
      await request(server())
        .post('/api/conversions/track')
        .send({ partnerCode: 'PARTNER_1', eventName: 'signup' })
        .expect(401);
    });

    it('should reject requests with invalid API key', async () => {
      await request(server())
        .post('/api/conversions/track')
        .set('X-API-Key', 'rk_invalid')
        .send({ partnerCode: 'PARTNER_1', eventName: 'signup' })
        .expect(401);
    });

    it('should reject requests with missing HMAC signature', async () => {
      await request(server())
        .post('/api/conversions/track')
        .set('X-API-Key', apiKey.key)
        .send({ partnerCode: 'PARTNER_1', eventName: 'signup' })
        .expect(401);
    });

    it('should reject requests with invalid HMAC signature', async () => {
      const body = JSON.stringify({
        partnerCode: 'PARTNER_1',
        eventName: 'signup',
      });
      await request(server())
        .post('/api/conversions/track')
        .set('X-API-Key', apiKey.key)
        .set('X-Signature', 'sha256=0000000000000000000000000000000000000000000000000000000000000000')
        .set('Content-Type', 'application/json')
        .send(body)
        .expect(401);
    });

    it('should reject requests with wrong signature format', async () => {
      await request(server())
        .post('/api/conversions/track')
        .set('X-API-Key', apiKey.key)
        .set('X-Signature', 'invalid-format')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ partnerCode: 'PARTNER_1', eventName: 'signup' }))
        .expect(401);
    });
  });

  describe('Validation', () => {
    const sendSigned = (body: Record<string, unknown>) => {
      const raw = JSON.stringify(body);
      return request(server())
        .post('/api/conversions/track')
        .set('X-API-Key', apiKey.key)
        .set('X-Signature', signBody(raw, apiKey.signingSecret))
        .set('Content-Type', 'application/json')
        .send(raw);
    };

    it('should reject missing partnerCode', async () => {
      await sendSigned({ eventName: 'signup' }).expect(400);
    });

    it('should reject missing eventName', async () => {
      await sendSigned({ partnerCode: 'PARTNER_1' }).expect(400);
    });

    it('should reject unknown partner code', async () => {
      await sendSigned({
        partnerCode: 'NONEXISTENT',
        eventName: 'signup',
      }).expect(404);
    });

    it('should reject negative count', async () => {
      await sendSigned({
        partnerCode: 'PARTNER_1',
        eventName: 'signup',
        count: -1,
      }).expect(400);
    });
  });

  describe('Tracking conversions', () => {
    const sendSigned = (body: Record<string, unknown>) => {
      const raw = JSON.stringify(body);
      return request(server())
        .post('/api/conversions/track')
        .set('X-API-Key', apiKey.key)
        .set('X-Signature', signBody(raw, apiKey.signingSecret))
        .set('Content-Type', 'application/json')
        .send(raw);
    };

    it('should track a fixed-rule conversion', async () => {
      const res = await sendSigned({
        partnerCode: 'PARTNER_1',
        eventName: 'signup',
      }).expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.eventName).toBe('signup');
      expect(res.body.count).toBe(1);
      expect(parseFloat(res.body.accrualAmount)).toBe(10);
      expect(res.body.accrualRuleId).toBeDefined();
    });

    it('should track a percentage-rule conversion with revenue', async () => {
      const res = await sendSigned({
        partnerCode: 'PARTNER_1',
        eventName: 'purchase',
        revenue: 200,
      }).expect(201);

      expect(res.body.success).toBe(true);
      // 15% of 200 = 30
      expect(parseFloat(res.body.accrualAmount)).toBe(30);
    });

    it('should track a conversion with custom count', async () => {
      const res = await sendSigned({
        partnerCode: 'PARTNER_1',
        eventName: 'signup',
        count: 5,
        eventDate: '2026-01-15',
      }).expect(201);

      expect(res.body.count).toBe(5);
      // 5 * $10 = $50
      expect(parseFloat(res.body.accrualAmount)).toBe(50);
    });

    it('should return accrualAmount 0 when no rule matches', async () => {
      const res = await sendSigned({
        partnerCode: 'PARTNER_1',
        eventName: 'unknown_event',
      }).expect(201);

      expect(res.body.success).toBe(true);
      expect(parseFloat(res.body.accrualAmount)).toBe(0);
      expect(res.body.accrualRuleId).toBeNull();
    });

    it('should additively aggregate same-day conversions', async () => {
      const date = '2026-03-01';

      await sendSigned({
        partnerCode: 'PARTNER_1',
        eventName: 'signup',
        eventDate: date,
        count: 2,
      }).expect(201);

      await sendSigned({
        partnerCode: 'PARTNER_1',
        eventName: 'signup',
        eventDate: date,
        count: 3,
      }).expect(201);

      // Verify via the conversions list endpoint
      const res = await request(server())
        .get('/api/conversions')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .query({ dateFrom: date, dateTo: date })
        .expect(200);

      const signupEvents = res.body.data.filter(
        (c: any) => c.eventName === 'signup' && c.eventDate === date,
      );
      expect(signupEvents).toHaveLength(1);
      expect(signupEvents[0].count).toBe(5); // 2 + 3
    });
  });

  describe('Idempotency', () => {
    const sendSigned = (body: Record<string, unknown>) => {
      const raw = JSON.stringify(body);
      return request(server())
        .post('/api/conversions/track')
        .set('X-API-Key', apiKey.key)
        .set('X-Signature', signBody(raw, apiKey.signingSecret))
        .set('Content-Type', 'application/json')
        .send(raw);
    };

    it('should return cached response for duplicate idempotency key', async () => {
      const body = {
        partnerCode: 'PARTNER_1',
        eventName: 'signup',
        eventDate: '2026-06-01',
        idempotencyKey: 'idem_test_1',
      };

      const first = await sendSigned(body).expect(201);
      const second = await sendSigned(body).expect(201);

      expect(first.body).toEqual(second.body);
    });

    it('should not double-count with same idempotency key', async () => {
      const date = '2026-06-02';
      const body = {
        partnerCode: 'PARTNER_1',
        eventName: 'signup',
        eventDate: date,
        count: 7,
        idempotencyKey: 'idem_no_double',
      };

      await sendSigned(body).expect(201);
      await sendSigned(body).expect(201);

      const res = await request(server())
        .get('/api/conversions')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .query({ dateFrom: date, dateTo: date })
        .expect(200);

      const events = res.body.data.filter(
        (c: any) => c.eventDate === date && c.eventName === 'signup',
      );
      expect(events).toHaveLength(1);
      expect(events[0].count).toBe(7); // not 14
    });

    it('should process different idempotency keys independently', async () => {
      const date = '2026-06-03';

      await sendSigned({
        partnerCode: 'PARTNER_1',
        eventName: 'signup',
        eventDate: date,
        idempotencyKey: 'idem_a',
      }).expect(201);

      await sendSigned({
        partnerCode: 'PARTNER_1',
        eventName: 'signup',
        eventDate: date,
        idempotencyKey: 'idem_b',
      }).expect(201);

      const res = await request(server())
        .get('/api/conversions')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .query({ dateFrom: date, dateTo: date })
        .expect(200);

      const events = res.body.data.filter(
        (c: any) => c.eventDate === date && c.eventName === 'signup',
      );
      expect(events).toHaveLength(1);
      expect(events[0].count).toBe(2); // 1 + 1
    });
  });

  describe('Conversions list', () => {
    it('should list tracked conversions via GET /conversions', async () => {
      const res = await request(server())
        .get('/api/conversions')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.meta.totalItems).toBeGreaterThan(0);
    });
  });
});
