import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';

// supertest v7 ships as ESM-with-CJS-compat; handle both shapes
// eslint-disable-next-line @typescript-eslint/no-require-imports
const supertest = require('supertest');
const request: typeof import('supertest').default =
  supertest.default ?? supertest;

export { request };

export interface TestUser {
  accessToken: string;
  refreshToken: string;
  email: string;
  password: string;
}

export interface TestApiKey {
  id: string;
  key: string;
  signingSecret: string;
}

export async function createTestApp(): Promise<INestApplication> {
  // Force synchronize for tests so schema matches entities
  process.env.DB_SYNCHRONIZE = 'true';

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication({ rawBody: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api');

  await app.init();
  return app;
}

export async function cleanDatabase(app: INestApplication): Promise<void> {
  const dataSource = app.get(DataSource);
  const entities = dataSource.entityMetadatas;

  await dataSource.query('SET session_replication_role = replica');
  for (const entity of entities) {
    await dataSource.query(`TRUNCATE TABLE "${entity.tableName}" CASCADE`);
  }
  await dataSource.query('SET session_replication_role = DEFAULT');
}

export async function registerUser(
  app: INestApplication,
  overrides?: { email?: string; password?: string; name?: string },
): Promise<TestUser> {
  const email = overrides?.email ?? `test-${Date.now()}@example.com`;
  const password = overrides?.password ?? 'TestPassword123';

  const server = app.getHttpServer();
  const res = await request(server)
    .post('/api/auth/register')
    .send({ email, password, name: overrides?.name ?? 'Test User' })
    .expect(201);

  return {
    accessToken: res.body.accessToken as string,
    refreshToken: res.body.refreshToken as string,
    email,
    password,
  };
}

export async function createApiKey(
  app: INestApplication,
  accessToken: string,
  name = 'Test Key',
): Promise<TestApiKey> {
  const server = app.getHttpServer();
  const res = await request(server)
    .post('/api/auth/api-keys')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ name })
    .expect(201);

  return {
    id: res.body.id as string,
    key: res.body.key as string,
    signingSecret: res.body.signingSecret as string,
  };
}

export function signBody(body: string, signingSecret: string): string {
  const sig = crypto
    .createHmac('sha256', signingSecret)
    .update(body)
    .digest('hex');
  return `sha256=${sig}`;
}

// ─── Partner helpers ─────────────────────────────────────────────────────

export interface TestPartner {
  id: string;
  code: string;
  name: string;
}

export interface TestPartnerAccount {
  partnerId: string;
  email: string;
  password: string;
  accessToken: string;
  refreshToken: string;
}

export async function createPartner(
  app: INestApplication,
  ownerAccessToken: string,
  name = 'Test Partner',
): Promise<TestPartner> {
  const res = await request(app.getHttpServer())
    .post('/api/partners')
    .set('Authorization', `Bearer ${ownerAccessToken}`)
    .send({ name })
    .expect(201);
  return {
    id: res.body.id as string,
    code: res.body.code as string,
    name: res.body.name as string,
  };
}

export async function invitePartner(
  app: INestApplication,
  ownerAccessToken: string,
  partnerId: string,
  email: string,
): Promise<{ token: string; expiresAt: string }> {
  const res = await request(app.getHttpServer())
    .post('/api/partner-auth/invitations')
    .set('Authorization', `Bearer ${ownerAccessToken}`)
    .send({ partnerId, email })
    .expect(201);
  return {
    token: res.body.token as string,
    expiresAt: res.body.expiresAt as string,
  };
}

/**
 * Invite a partner, accept the invitation with a freshly-set password, and
 * return everything the caller might want — the partner record, tokens, and
 * credentials. One-stop helper for setting up a logged-in partner in tests.
 */
export async function onboardPartner(
  app: INestApplication,
  ownerAccessToken: string,
  opts?: { name?: string; email?: string; password?: string },
): Promise<{ partner: TestPartner; account: TestPartnerAccount }> {
  const partner = await createPartner(
    app,
    ownerAccessToken,
    opts?.name ?? 'Test Partner',
  );
  const email =
    opts?.email ??
    `partner-${Date.now()}-${partner.id.slice(0, 8)}@example.com`;
  const password = opts?.password ?? 'PartnerPass123';

  const { token } = await invitePartner(
    app,
    ownerAccessToken,
    partner.id,
    email,
  );

  const acceptRes = await request(app.getHttpServer())
    .post('/api/partner-auth/accept-invite')
    .send({ token, password })
    .expect(201);

  return {
    partner,
    account: {
      partnerId: partner.id,
      email,
      password,
      accessToken: acceptRes.body.accessToken as string,
      refreshToken: acceptRes.body.refreshToken as string,
    },
  };
}

// ─── Accrual rule helper ─────────────────────────────────────────────────

export async function createRule(
  app: INestApplication,
  ownerAccessToken: string,
  rule: {
    eventName: string;
    ruleType:
      | 'fixed'
      | 'percentage'
      | 'recurring_fixed'
      | 'recurring_percentage';
    amount: string;
    partnerId?: string;
    revenueProperty?: string;
    recurrenceDurationMonths?: number;
  },
): Promise<{ id: string }> {
  const res = await request(app.getHttpServer())
    .post('/api/accrual-rules')
    .set('Authorization', `Bearer ${ownerAccessToken}`)
    .send(rule)
    .expect(201);
  return { id: res.body.id as string };
}

// ─── Raw SQL helper ──────────────────────────────────────────────────────

/**
 * Execute a raw query against the test DB. Useful for time-travel simulation
 * (e.g. backdating user_attributions.firstConversionAt to test recurring
 * windows expiring).
 */
export async function dbQuery<T = unknown>(
  app: INestApplication,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const dataSource = app.get(DataSource);
  return dataSource.query(sql, params) as Promise<T[]>;
}
