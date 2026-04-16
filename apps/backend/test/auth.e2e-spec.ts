import { INestApplication } from '@nestjs/common';
import {
  createTestApp,
  cleanDatabase,
  registerUser,
  request,
  setTenantPlan,
  userIdFromToken,
} from './helpers/test-app';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
    await cleanDatabase(app);
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await app.close();
  });

  const server = () => app.getHttpServer();

  describe('POST /api/auth/register', () => {
    it('should register a new user and return tokens', async () => {
      const res = await request(server())
        .post('/api/auth/register')
        .send({
          email: 'auth-test@example.com',
          password: 'Password123',
          name: 'Auth Test',
        })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      await request(server())
        .post('/api/auth/register')
        .send({
          email: 'auth-test@example.com',
          password: 'Password123',
        })
        .expect(409);
    });

    it('should reject weak password', async () => {
      await request(server())
        .post('/api/auth/register')
        .send({ email: 'weak@example.com', password: 'short' })
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(server())
        .post('/api/auth/login')
        .send({
          email: 'auth-test@example.com',
          password: 'Password123',
        })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('should reject wrong password', async () => {
      await request(server())
        .post('/api/auth/login')
        .send({
          email: 'auth-test@example.com',
          password: 'WrongPassword',
        })
        .expect(401);
    });

    it('should reject non-existent user', async () => {
      await request(server())
        .post('/api/auth/login')
        .send({ email: 'noone@example.com', password: 'Password123' })
        .expect(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens', async () => {
      const user = await registerUser(app, {
        email: 'refresh-test@example.com',
      });

      const res = await request(server())
        .post('/api/auth/refresh')
        .send({ refreshToken: user.refreshToken })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('should reject invalid token', async () => {
      await request(server())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });

  describe('API Keys', () => {
    let accessToken: string;

    beforeAll(async () => {
      const user = await registerUser(app, {
        email: 'apikey-test@example.com',
      });
      accessToken = user.accessToken;
      // Need ≥2 api keys in the suite (Create + Revoke Me). Free plan caps
      // at 1, so upgrade to Business for this block.
      await setTenantPlan(app, userIdFromToken(accessToken), 'business');
    });

    it('should create an API key with signing secret', async () => {
      const res = await request(server())
        .post('/api/auth/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Test Key' })
        .expect(201);

      expect(res.body.key).toMatch(/^rk_/);
      expect(res.body.signingSecret).toBeDefined();
      expect(res.body.signingSecret).toHaveLength(64);
    });

    it('should list API keys without revealing secrets', async () => {
      const res = await request(server())
        .get('/api/auth/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].prefix).toMatch(/^rk_/);
      expect(res.body[0].key).toBeUndefined();
      expect(res.body[0].signingSecret).toBeUndefined();
    });

    it('should revoke an API key', async () => {
      const created = await request(server())
        .post('/api/auth/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Revoke Me' })
        .expect(201);

      await request(server())
        .delete(`/api/auth/api-keys/${created.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should reject unauthenticated requests', async () => {
      await request(server()).get('/api/auth/api-keys').expect(401);
    });
  });
});
