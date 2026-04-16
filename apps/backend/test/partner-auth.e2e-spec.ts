import { INestApplication } from '@nestjs/common';
import {
  createTestApp,
  cleanDatabase,
  createPartner,
  invitePartner,
  onboardPartner,
  registerUser,
  request,
  TestUser,
} from './helpers/test-app';

describe('Partner Auth (e2e)', () => {
  let app: INestApplication;
  let owner: TestUser;

  const server = () => app.getHttpServer();

  beforeAll(async () => {
    app = await createTestApp();
    await cleanDatabase(app);
    owner = await registerUser(app, { email: 'owner@example.com' });
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await app.close();
  });

  describe('POST /api/partner-auth/invitations (owner creates invitation)', () => {
    it('creates invitation with token + expiresAt', async () => {
      const partner = await createPartner(app, owner.accessToken);

      const res = await request(server())
        .post('/api/partner-auth/invitations')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ partnerId: partner.id, email: 'alice@example.com' })
        .expect(201);

      expect(res.body.token).toHaveLength(64);
      expect(new Date(res.body.expiresAt).getTime()).toBeGreaterThan(
        Date.now(),
      );
      expect(res.body.partnerId).toBe(partner.id);
      expect(res.body.email).toBe('alice@example.com');
    });

    it('rejects invitation for unknown partner (404)', async () => {
      await request(server())
        .post('/api/partner-auth/invitations')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          partnerId: '00000000-0000-0000-0000-000000000000',
          email: 'unknown@example.com',
        })
        .expect(404);
    });

    it('rejects invitation for another tenant’s partner (404)', async () => {
      // Second tenant + their partner
      const otherOwner = await registerUser(app, {
        email: 'other-owner@example.com',
      });
      const otherPartner = await createPartner(app, otherOwner.accessToken);

      // First owner tries to invite the other owner's partner
      await request(server())
        .post('/api/partner-auth/invitations')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ partnerId: otherPartner.id, email: 'leak@example.com' })
        .expect(404);
    });

    it('rejects if email is already linked to another partner (409)', async () => {
      const email = `dup-${Date.now()}@example.com`;
      const partnerA = await createPartner(app, owner.accessToken, 'A');
      const partnerB = await createPartner(app, owner.accessToken, 'B');

      await request(server())
        .post('/api/partner-auth/invitations')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ partnerId: partnerA.id, email })
        .expect(201);

      await request(server())
        .post('/api/partner-auth/invitations')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ partnerId: partnerB.id, email })
        .expect(409);
    });

    it('rejects unauthenticated', async () => {
      await request(server())
        .post('/api/partner-auth/invitations')
        .send({ partnerId: 'x', email: 'x@example.com' })
        .expect(401);
    });
  });

  describe('POST /api/partner-auth/accept-invite', () => {
    it('accepts a valid invitation and returns tokens', async () => {
      const partner = await createPartner(app, owner.accessToken);
      const { token } = await invitePartner(
        app,
        owner.accessToken,
        partner.id,
        'accept-me@example.com',
      );

      const res = await request(server())
        .post('/api/partner-auth/accept-invite')
        .send({ token, password: 'StrongPass1' })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('rejects unknown token (401)', async () => {
      await request(server())
        .post('/api/partner-auth/accept-invite')
        .send({ token: 'f'.repeat(64), password: 'StrongPass1' })
        .expect(401);
    });

    it('rejects passwords shorter than 8 chars (400)', async () => {
      const partner = await createPartner(app, owner.accessToken);
      const { token } = await invitePartner(
        app,
        owner.accessToken,
        partner.id,
        `weak-${Date.now()}@example.com`,
      );
      await request(server())
        .post('/api/partner-auth/accept-invite')
        .send({ token, password: 'short' })
        .expect(400);
    });

    it('consumes the token — second accept fails', async () => {
      const partner = await createPartner(app, owner.accessToken);
      const { token } = await invitePartner(
        app,
        owner.accessToken,
        partner.id,
        `once-${Date.now()}@example.com`,
      );

      await request(server())
        .post('/api/partner-auth/accept-invite')
        .send({ token, password: 'StrongPass1' })
        .expect(201);

      await request(server())
        .post('/api/partner-auth/accept-invite')
        .send({ token, password: 'StrongPass1' })
        .expect(401);
    });
  });

  describe('POST /api/partner-auth/login', () => {
    it('logs in with valid credentials', async () => {
      const { account } = await onboardPartner(app, owner.accessToken, {
        email: 'login-test@example.com',
        password: 'LoginPass123',
      });

      const res = await request(server())
        .post('/api/partner-auth/login')
        .send({ email: account.email, password: account.password })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('rejects wrong password (401)', async () => {
      const { account } = await onboardPartner(app, owner.accessToken, {
        email: `wrong-pw-${Date.now()}@example.com`,
      });
      await request(server())
        .post('/api/partner-auth/login')
        .send({ email: account.email, password: 'Incorrect0' })
        .expect(401);
    });

    it('rejects unknown email (401)', async () => {
      await request(server())
        .post('/api/partner-auth/login')
        .send({ email: 'nobody@example.com', password: 'AnyPass123' })
        .expect(401);
    });
  });

  describe('POST /api/partner-auth/refresh', () => {
    it('refreshes tokens', async () => {
      const { account } = await onboardPartner(app, owner.accessToken, {
        email: `refresh-${Date.now()}@example.com`,
      });
      const res = await request(server())
        .post('/api/partner-auth/refresh')
        .send({ refreshToken: account.refreshToken })
        .expect(200);
      expect(res.body.accessToken).toBeDefined();
    });

    it('rejects owner-issued refresh token (wrong type)', async () => {
      // Owner's refresh token has type "refresh", not "partner-refresh"
      await request(server())
        .post('/api/partner-auth/refresh')
        .send({ refreshToken: owner.refreshToken })
        .expect(401);
    });
  });

  describe('GET /api/partner-portal/self', () => {
    it('returns partner profile including email', async () => {
      const { partner, account } = await onboardPartner(
        app,
        owner.accessToken,
        { email: `self-${Date.now()}@example.com`, name: 'Self Test' },
      );

      const res = await request(server())
        .get('/api/partner-portal/self')
        .set('Authorization', `Bearer ${account.accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(partner.id);
      expect(res.body.email).toBe(account.email);
      expect(res.body.code).toBe(partner.code);
      expect(res.body.name).toBe('Self Test');
      expect(res.body.isActive).toBe(true);
    });

    it('rejects request with owner JWT (wrong token type)', async () => {
      await request(server())
        .get('/api/partner-portal/self')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(401);
    });

    it('rejects request without token', async () => {
      await request(server()).get('/api/partner-portal/self').expect(401);
    });
  });

  describe('PATCH /api/partner-portal/self', () => {
    it('updates description and payoutDetails', async () => {
      const { account } = await onboardPartner(app, owner.accessToken, {
        email: `upd-${Date.now()}@example.com`,
      });

      const res = await request(server())
        .patch('/api/partner-portal/self')
        .set('Authorization', `Bearer ${account.accessToken}`)
        .send({
          description: 'YouTube creator',
          payoutDetails: {
            method: 'paypal',
            details: 'me@example.com',
            notes: null,
          },
        })
        .expect(200);

      expect(res.body.description).toBe('YouTube creator');
      expect(res.body.payoutDetails).toMatchObject({
        method: 'paypal',
        details: 'me@example.com',
      });
    });

    it('strips unknown fields (whitelist)', async () => {
      const { account } = await onboardPartner(app, owner.accessToken, {
        email: `strip-${Date.now()}@example.com`,
      });

      // Attempt to overwrite name / isActive through self-update should 400
      // because the ValidationPipe has forbidNonWhitelisted.
      await request(server())
        .patch('/api/partner-portal/self')
        .set('Authorization', `Bearer ${account.accessToken}`)
        .send({ name: 'Hacked Name', isActive: false })
        .expect(400);
    });
  });

  describe('DELETE /api/partner-auth/invitations/:partnerId (revoke)', () => {
    it('clears pending invitation; accept now fails', async () => {
      const partner = await createPartner(app, owner.accessToken);
      const { token } = await invitePartner(
        app,
        owner.accessToken,
        partner.id,
        `revoke-${Date.now()}@example.com`,
      );

      await request(server())
        .delete(`/api/partner-auth/invitations/${partner.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(204);

      await request(server())
        .post('/api/partner-auth/accept-invite')
        .send({ token, password: 'StrongPass1' })
        .expect(401);
    });

    it('does not invalidate already-accepted password', async () => {
      const { account } = await onboardPartner(app, owner.accessToken, {
        email: `keep-pw-${Date.now()}@example.com`,
      });

      // Revoke the (already-consumed) invitation
      await request(server())
        .delete(`/api/partner-auth/invitations/${account.partnerId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(204);

      // Login still works
      await request(server())
        .post('/api/partner-auth/login')
        .send({ email: account.email, password: account.password })
        .expect(200);
    });
  });

  describe('Cross-tenant isolation', () => {
    it("partner's token cannot access another tenant’s data", async () => {
      // Tenant 1: owner + partner
      const { account: partnerA } = await onboardPartner(
        app,
        owner.accessToken,
        { email: `iso-a-${Date.now()}@example.com` },
      );

      // Tenant 2: different owner
      const otherOwner = await registerUser(app, {
        email: `iso-owner-${Date.now()}@example.com`,
      });
      const otherPartner = await createPartner(app, otherOwner.accessToken);

      // Partner A is signed in; their token should NOT resolve other tenant's
      // partner. Self-endpoint scopes by (partnerId, userId) from JWT → it
      // returns partner A regardless of what exists elsewhere.
      const res = await request(server())
        .get('/api/partner-portal/self')
        .set('Authorization', `Bearer ${partnerA.accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(partnerA.partnerId);
      expect(res.body.id).not.toBe(otherPartner.id);
    });
  });
});
