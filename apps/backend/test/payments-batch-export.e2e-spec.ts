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

/**
 * Covers the batch-payout and CSV-export flow that runs a program's monthly
 * payout cycle:
 *   1. Generate conversions so partners accrue balances.
 *   2. POST /payments/batch — one pending payment per eligible partner.
 *   3. GET /payments/export — CSV with partner/payout details for finance.
 */
describe('Payments batch + CSV export (e2e)', () => {
  let app: INestApplication;
  let user: TestUser;
  let apiKey: TestApiKey;
  let partnerA: TestPartner;
  let partnerB: TestPartner;
  let partnerC: TestPartner; // no balance, should be skipped by batch

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
    // Business plan unlocks CSV export + batch payouts and lifts partner/
    // api-key caps so we're only testing the feature under test.
    await setTenantPlan(app, userIdFromToken(user.accessToken), 'business');
    apiKey = await createApiKey(app, user.accessToken);

    partnerA = await createPartner(app, user.accessToken, 'Partner A');
    partnerB = await createPartner(app, user.accessToken, 'Partner B');
    partnerC = await createPartner(app, user.accessToken, 'Partner C');

    // Global rule: $10 fixed per signup.
    await createRule(app, user.accessToken, {
      eventName: 'signup',
      ruleType: 'fixed',
      amount: '10',
    });

    // Seed balances: A → $30, B → $50, C → $0
    await track({
      partnerCode: partnerA.code,
      eventName: 'signup',
      count: 3,
    }).expect(201);
    await track({
      partnerCode: partnerB.code,
      eventName: 'signup',
      count: 5,
    }).expect(201);
    // Partner C: no conversions, no balance.
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await app.close();
  });

  describe('POST /api/payments/batch', () => {
    it('creates one pending payment per partner with positive balance', async () => {
      const res = await request(server())
        .post('/api/payments/batch')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          periodStart: '2026-01-01',
          periodEnd: '2026-01-31',
          reference: 'jan-batch',
        })
        .expect(201);

      expect(res.body.created).toBe(2); // A and B; C skipped
      expect(res.body.skippedPartners).toBe(1);
      expect(parseFloat(res.body.totalAmount)).toBe(80); // 30 + 50
      expect(res.body.paymentIds).toHaveLength(2);

      // Verify the created payments are pending, tagged, and scoped correctly.
      const list = await request(server())
        .get('/api/payments')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .query({ status: 'pending' })
        .expect(200);

      const janBatch = list.body.data.filter(
        (p: { reference: string }) => p.reference === 'jan-batch',
      );
      expect(janBatch).toHaveLength(2);
      const partnerIds = janBatch.map(
        (p: { partnerId: string }) => p.partnerId,
      );
      expect(partnerIds).toContain(partnerA.id);
      expect(partnerIds).toContain(partnerB.id);
      expect(partnerIds).not.toContain(partnerC.id);
    });

    it('respects minAmount threshold', async () => {
      // Mark the previous batch's payments as completed so balances "reset".
      const prev = await request(server())
        .get('/api/payments')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .query({ status: 'pending' })
        .expect(200);
      for (const p of prev.body.data as { id: string }[]) {
        await request(server())
          .patch(`/api/payments/${p.id}`)
          .set('Authorization', `Bearer ${user.accessToken}`)
          .send({ status: 'completed' })
          .expect(200);
      }

      // Accrue small balances: A → $10, B → $40
      await track({
        partnerCode: partnerA.code,
        eventName: 'signup',
        count: 1,
      }).expect(201);
      await track({
        partnerCode: partnerB.code,
        eventName: 'signup',
        count: 4,
      }).expect(201);

      const res = await request(server())
        .post('/api/payments/batch')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          periodStart: '2026-02-01',
          periodEnd: '2026-02-28',
          minAmount: 20,
          reference: 'feb-batch',
        })
        .expect(201);

      // Only B ($40) clears the $20 threshold; A ($10) and C ($0) don't.
      expect(res.body.created).toBe(1);
      expect(res.body.skippedPartners).toBe(2);
      expect(parseFloat(res.body.totalAmount)).toBe(40);
    });

    it('scopes to specified partnerIds when provided', async () => {
      const res = await request(server())
        .post('/api/payments/batch')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          periodStart: '2026-03-01',
          periodEnd: '2026-03-31',
          partnerIds: [partnerA.id],
          reference: 'mar-batch-a-only',
        })
        .expect(201);

      // A still has balance; partnerIds restricts B and C out completely.
      expect(res.body.created).toBeLessThanOrEqual(1);
      const paymentsList = await request(server())
        .get('/api/payments')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .query({ status: 'pending' })
        .expect(200);
      const marBatch = paymentsList.body.data.filter(
        (p: { reference: string }) => p.reference === 'mar-batch-a-only',
      );
      for (const p of marBatch) {
        expect(p.partnerId).toBe(partnerA.id);
      }
    });

    it('creates zero rows when nobody qualifies', async () => {
      const res = await request(server())
        .post('/api/payments/batch')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          periodStart: '2026-04-01',
          periodEnd: '2026-04-30',
          minAmount: 1_000_000, // impossibly high
          reference: 'huge-threshold',
        })
        .expect(201);

      expect(res.body.created).toBe(0);
      expect(parseFloat(res.body.totalAmount)).toBe(0);
    });

    it('rejects unauthenticated', async () => {
      await request(server())
        .post('/api/payments/batch')
        .send({ periodStart: '2026-01-01', periodEnd: '2026-01-31' })
        .expect(401);
    });

    it('rejects missing period dates', async () => {
      await request(server())
        .post('/api/payments/batch')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('GET /api/payments/export (CSV)', () => {
    beforeAll(async () => {
      // Onboard the EXISTING partnerA so the payments we created earlier
      // point at a partner whose payoutDetails contain commas/quotes — the
      // CSV escaping is what we're here to stress-test. Invite + accept is
      // the same flow `onboardPartner` runs, but bound to partnerA.id.
      const email = `csv-pa-${Date.now()}@example.com`;
      const inviteRes = await request(server())
        .post('/api/partner-auth/invitations')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ partnerId: partnerA.id, email })
        .expect(201);
      const acceptRes = await request(server())
        .post('/api/partner-auth/accept-invite')
        .send({ token: inviteRes.body.token, password: 'PartnerPass123' })
        .expect(201);

      await request(server())
        .patch('/api/partner-portal/self')
        .set('Authorization', `Bearer ${acceptRes.body.accessToken}`)
        .send({
          description: 'Creator, YouTube',
          payoutDetails: {
            method: 'bank',
            details: 'IBAN "DE89 3704 0044", Commerzbank',
          },
        })
        .expect(200);
    });

    it('returns text/csv with header and rows', async () => {
      const res = await request(server())
        .get('/api/payments/export')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(
        /attachment; filename="payments-\d{4}-\d{2}-\d{2}\.csv"/,
      );

      const body = res.text;
      const lines = body.split('\n');
      expect(lines[0]).toBe(
        'payment_id,partner_name,partner_code,partner_email,amount,status,period_start,period_end,reference,notes,payout_details,paid_at,created_at',
      );
      // Should have at least 1 data row (from earlier pending payments).
      expect(lines.length).toBeGreaterThan(1);
    });

    it('escapes commas and quotes in payout details', async () => {
      const res = await request(server())
        .get('/api/payments/export')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      // payoutDetails is JSON-stringified, then dropped into the CSV as a
      // single field. Per RFC 4180, each double-quote in the JSON (the key
      // quotes and the value quotes) is doubled when the field is wrapped.
      // Sanity-check a few markers that could only appear if both JSON
      // serialization and CSV escaping ran correctly:
      expect(res.text).toContain('""method""');
      expect(res.text).toContain('""bank""');
      // The literal IBAN digits survive verbatim inside the JSON value.
      expect(res.text).toContain('DE89 3704 0044');
      // The opening wrap of the whole payoutDetails field.
      expect(res.text).toContain('"{""method"":""bank""');
    });

    it('filters by status', async () => {
      const res = await request(server())
        .get('/api/payments/export')
        .query({ status: 'pending' })
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      const lines = res.text.split('\n').filter((l) => l.length > 0);
      // Header + at least the pending rows we created earlier in this suite.
      expect(lines.length).toBeGreaterThanOrEqual(2);
      for (const line of lines.slice(1)) {
        // status column is 6th (0-indexed: 5), but escaping makes naive split
        // wrong. Quick structural check: status is one of pending/completed/cancelled
        // and we only care about "pending" here.
        expect(line).toContain(',pending,');
      }
    });

    it('rejects unauthenticated', async () => {
      await request(server()).get('/api/payments/export').expect(401);
    });
  });
});
