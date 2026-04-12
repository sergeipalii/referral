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
