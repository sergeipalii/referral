import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveAnalyticsAddTracking1775900000000 implements MigrationInterface {
  name = 'RemoveAnalyticsAddTracking1775900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add signing secret to api_keys for HMAC request verification
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD COLUMN "signingSecret" character varying(64)`,
    );

    // 2. Create idempotency_keys table
    await queryRunner.query(`
      CREATE TABLE "idempotency_keys" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "key" character varying(255) NOT NULL,
        "response" jsonb NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_idempotency_keys" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_idempotency_user_key" UNIQUE ("userId", "key")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_idempotency_created" ON "idempotency_keys" ("createdAt")`,
    );

    // 3. Deduplicate conversion_events before adding unique constraint
    await queryRunner.query(`
      DELETE FROM "conversion_events" a
      USING "conversion_events" b
      WHERE a."id" < b."id"
        AND a."userId" = b."userId"
        AND a."partnerId" = b."partnerId"
        AND a."eventName" = b."eventName"
        AND a."eventDate" = b."eventDate"
    `);

    // 4. Add unique constraint for additive upsert
    await queryRunner.query(`
      ALTER TABLE "conversion_events"
      ADD CONSTRAINT "UQ_conv_bucket" UNIQUE ("userId", "partnerId", "eventName", "eventDate")
    `);

    // 5. Drop syncJobId column from conversion_events
    await queryRunner.query(
      `ALTER TABLE "conversion_events" DROP COLUMN IF EXISTS "syncJobId"`,
    );

    // 6. Drop analytics tables
    await queryRunner.query(`DROP TABLE IF EXISTS "analytics_sync_jobs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "analytics_integrations"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore analytics tables
    await queryRunner.query(`
      CREATE TABLE "analytics_integrations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "providerType" character varying(64) NOT NULL,
        "encryptedConfig" text NOT NULL,
        "utmParameterName" character varying(128) NOT NULL DEFAULT 'utm_source',
        "lastSyncedAt" TIMESTAMP,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_2f358496b7676f5158424c805c5" UNIQUE ("userId"),
        CONSTRAINT "PK_002f37d6ebe2691f25882af961a" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "analytics_sync_jobs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "integrationId" character varying NOT NULL,
        "status" character varying(32) NOT NULL,
        "rangeStart" TIMESTAMP NOT NULL,
        "rangeEnd" TIMESTAMP NOT NULL,
        "rawEventsCount" integer NOT NULL DEFAULT '0',
        "conversionsCount" integer NOT NULL DEFAULT '0',
        "errorMessage" text,
        "completedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_3878371c4254d50b147988251e5" PRIMARY KEY ("id")
      )
    `);

    // Restore syncJobId column
    await queryRunner.query(
      `ALTER TABLE "conversion_events" ADD COLUMN "syncJobId" uuid`,
    );

    // Drop unique constraint
    await queryRunner.query(
      `ALTER TABLE "conversion_events" DROP CONSTRAINT IF EXISTS "UQ_conv_bucket"`,
    );

    // Drop idempotency table
    await queryRunner.query(`DROP TABLE IF EXISTS "idempotency_keys"`);

    // Remove signing secret from api_keys
    await queryRunner.query(
      `ALTER TABLE "api_keys" DROP COLUMN IF EXISTS "signingSecret"`,
    );
  }
}
