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
  signBody,
  TestApiKey,
  TestPartner,
  TestUser,
} from './helpers/test-app';

/**
 * Covers the recurring-commissions pipeline end-to-end:
 *   - First-touch attribution establishment on the first conversion.
 *   - Recurring rule pays on subsequent events inside the window.
 *   - Recurring rule pays nothing once the window has closed (simulated by
 *     back-dating `firstConversionAt` via raw SQL).
 *   - First-touch wins: a different `partnerCode` on a later event is ignored.
 *   - Non-recurring rules still behave as before.
 */
describe('Recurring commissions (e2e)', () => {
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

  const getConversions = (params?: Record<string, string>) =>
    request(server())
      .get('/api/conversions')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .query(params ?? {});

  beforeAll(async () => {
    app = await createTestApp();
    await cleanDatabase(app);
    user = await registerUser(app);
    apiKey = await createApiKey(app, user.accessToken);
    partner = await createPartner(app, user.accessToken, 'Recurring Partner');

    // Base rules covering every scenario we exercise below.
    // Non-recurring one-off signup — $5 flat.
    await createRule(app, user.accessToken, {
      eventName: 'signup',
      ruleType: 'fixed',
      amount: '5',
    });
    // Recurring monthly %, 12-month window.
    await createRule(app, user.accessToken, {
      eventName: 'subscription_renewal',
      ruleType: 'recurring_percentage',
      amount: '20',
      recurrenceDurationMonths: 12,
    });
    // Recurring forever, fixed per event.
    await createRule(app, user.accessToken, {
      eventName: 'forever_event',
      ruleType: 'recurring_fixed',
      amount: '2',
    });
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await app.close();
  });

  describe('First-touch attribution', () => {
    it('creates attribution on first conversion with externalUserId', async () => {
      const res = await track({
        partnerCode: partner.code,
        externalUserId: 'user_first_touch',
        eventName: 'signup',
      }).expect(201);

      expect(res.body.partnerId).toBe(partner.id);
      expect(parseFloat(res.body.accrualAmount)).toBe(5);

      const rows = await dbQuery<{ partnerId: string }>(
        app,
        'SELECT "partnerId" FROM user_attributions WHERE "externalUserId" = $1',
        ['user_first_touch'],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].partnerId).toBe(partner.id);
    });

    it('subsequent events without partnerCode use the stored attribution', async () => {
      await track({
        partnerCode: partner.code,
        externalUserId: 'user_no_code_later',
        eventName: 'signup',
      }).expect(201);

      // Renewal — no partnerCode, just externalUserId.
      const res = await track({
        externalUserId: 'user_no_code_later',
        eventName: 'subscription_renewal',
        revenue: 100,
      }).expect(201);

      expect(res.body.partnerId).toBe(partner.id);
      // 20% of 100 = 20
      expect(parseFloat(res.body.accrualAmount)).toBe(20);
    });

    it("rejects event with neither partnerCode nor known externalUserId (400)", async () => {
      await track({
        externalUserId: 'unknown_user_no_partner',
        eventName: 'signup',
      }).expect(400);
    });

    it('ignores partnerCode on subsequent event — first-touch wins', async () => {
      // Onboard second partner
      const partnerB = await createPartner(app, user.accessToken, 'Partner B');

      await track({
        partnerCode: partner.code,
        externalUserId: 'first_touch_wins',
        eventName: 'signup',
      }).expect(201);

      // Even though partnerB is passed, accrual still goes to partner.
      const res = await track({
        partnerCode: partnerB.code,
        externalUserId: 'first_touch_wins',
        eventName: 'subscription_renewal',
        revenue: 50,
      }).expect(201);

      expect(res.body.partnerId).toBe(partner.id);
      expect(res.body.partnerId).not.toBe(partnerB.id);
    });
  });

  describe('Recurring window enforcement', () => {
    it('pays inside the 12-month window', async () => {
      const extId = 'inside_window_user';
      await track({
        partnerCode: partner.code,
        externalUserId: extId,
        eventName: 'signup',
      }).expect(201);

      const res = await track({
        externalUserId: extId,
        eventName: 'subscription_renewal',
        revenue: 200,
      }).expect(201);

      // 20% of 200 = 40
      expect(parseFloat(res.body.accrualAmount)).toBe(40);
    });

    it('pays nothing once the window has closed', async () => {
      const extId = 'outside_window_user';
      await track({
        partnerCode: partner.code,
        externalUserId: extId,
        eventName: 'signup',
      }).expect(201);

      // Time-travel: backdate the attribution so the 12-month window closed
      // 2 months ago. Raw SQL is fine — the `addMonths` helper on the server
      // computes expiry from firstConversionAt, so shifting that timestamp
      // simulates the passage of time.
      await dbQuery(
        app,
        `UPDATE user_attributions
           SET "firstConversionAt" = NOW() - INTERVAL '14 months'
         WHERE "externalUserId" = $1`,
        [extId],
      );

      const res = await track({
        externalUserId: extId,
        eventName: 'subscription_renewal',
        revenue: 200,
      }).expect(201);

      expect(parseFloat(res.body.accrualAmount)).toBe(0);
    });

    it('pays forever when recurrenceDurationMonths is null', async () => {
      const extId = 'forever_user';
      await track({
        partnerCode: partner.code,
        externalUserId: extId,
        eventName: 'signup',
      }).expect(201);

      // Even with firstConversionAt 5 years ago, the `forever_event` rule has
      // no duration cap and should still pay.
      await dbQuery(
        app,
        `UPDATE user_attributions
           SET "firstConversionAt" = NOW() - INTERVAL '60 months'
         WHERE "externalUserId" = $1`,
        [extId],
      );

      const res = await track({
        externalUserId: extId,
        eventName: 'forever_event',
      }).expect(201);

      expect(parseFloat(res.body.accrualAmount)).toBe(2);
    });
  });

  describe('Safety nets', () => {
    it('recurring event without externalUserId / no attribution → accrual = 0', async () => {
      // Fresh tenant so we don't cross-contaminate with earlier attributions.
      const res = await track({
        partnerCode: partner.code,
        eventName: 'subscription_renewal',
        revenue: 100,
      }).expect(201);

      // Recurring rule requires attribution; without externalUserId we can't
      // build one, so we treat it as "no window to pay on".
      expect(parseFloat(res.body.accrualAmount)).toBe(0);
      expect(res.body.accrualRuleId).toBeDefined();
    });

    it('non-recurring rule still pays without externalUserId', async () => {
      const res = await track({
        partnerCode: partner.code,
        eventName: 'signup',
      }).expect(201);
      expect(parseFloat(res.body.accrualAmount)).toBe(5);
    });

    it('attribution is race-safe — same externalUserId, parallel first events pick one partner', async () => {
      const partnerB = await createPartner(app, user.accessToken, 'Race B');
      const extId = `race_${Date.now()}`;

      // Fire both simultaneously. Whichever wins the ON CONFLICT race should
      // attribute; the other is force-mapped back via getOrCreate re-read.
      const [resA, resB] = await Promise.all([
        track({
          partnerCode: partner.code,
          externalUserId: extId,
          eventName: 'signup',
        }),
        track({
          partnerCode: partnerB.code,
          externalUserId: extId,
          eventName: 'signup',
        }),
      ]);

      expect([resA.status, resB.status]).toEqual([201, 201]);
      // Both should point to the SAME partner (whichever won the race).
      expect(resA.body.partnerId).toBe(resB.body.partnerId);

      const rows = await dbQuery<{ partnerId: string }>(
        app,
        'SELECT "partnerId" FROM user_attributions WHERE "externalUserId" = $1',
        [extId],
      );
      expect(rows).toHaveLength(1);
    });
  });

  describe('Conversion bucket still updates for recurring events', () => {
    it('renewals accumulate into a bucket even when accrual is 0', async () => {
      const extId = 'bucket_expiry_user';
      const dateA = '2026-07-10';

      await track({
        partnerCode: partner.code,
        externalUserId: extId,
        eventName: 'signup',
        eventDate: dateA,
      }).expect(201);

      // Close the window — accrual will be 0 but the event should still land
      // in the conversions table (for analytics / audit).
      await dbQuery(
        app,
        `UPDATE user_attributions
           SET "firstConversionAt" = NOW() - INTERVAL '20 months'
         WHERE "externalUserId" = $1`,
        [extId],
      );

      const renewalDate = '2026-07-15';
      await track({
        externalUserId: extId,
        eventName: 'subscription_renewal',
        revenue: 50,
        eventDate: renewalDate,
      }).expect(201);

      const list = await getConversions({
        dateFrom: renewalDate,
        dateTo: renewalDate,
      }).expect(200);
      const renewal = list.body.data.find(
        (c: { eventName: string; eventDate: string }) =>
          c.eventName === 'subscription_renewal' &&
          c.eventDate === renewalDate,
      );
      expect(renewal).toBeDefined();
      expect(parseFloat(renewal.accrualAmount)).toBe(0);
      expect(renewal.count).toBe(1);
    });
  });
});
