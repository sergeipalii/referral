import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1775640950984 implements MigrationInterface {
  name = 'Init1775640950984';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "hashedPassword" character varying NOT NULL, "name" character varying(255), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "partnerId" character varying NOT NULL, "amount" numeric(20,6) NOT NULL, "status" character varying(32) NOT NULL DEFAULT 'completed', "reference" character varying(512), "notes" text, "periodStart" date, "periodEnd" date, "paidAt" TIMESTAMP, "metadata" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "partners" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "code" character varying(128) NOT NULL, "name" character varying(255) NOT NULL, "description" text, "metadata" jsonb, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_998645b20820e4ab99aeae03b41" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "conversion_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "partnerId" character varying NOT NULL, "eventName" character varying(255) NOT NULL, "eventDate" date NOT NULL, "count" integer NOT NULL DEFAULT '0', "revenueSum" numeric(20,6) NOT NULL DEFAULT '0', "accrualAmount" numeric(20,6) NOT NULL DEFAULT '0', "accrualRuleId" uuid, "syncJobId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3153e3513a6cd44a85bf528705f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "api_keys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "name" character varying(255) NOT NULL, "hashedKey" character varying(64) NOT NULL, "prefix" character varying(16) NOT NULL, "lastUsedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5c8a79801b44bd27b79228e1dad" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "analytics_sync_jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "integrationId" character varying NOT NULL, "status" character varying(32) NOT NULL, "rangeStart" TIMESTAMP NOT NULL, "rangeEnd" TIMESTAMP NOT NULL, "rawEventsCount" integer NOT NULL DEFAULT '0', "conversionsCount" integer NOT NULL DEFAULT '0', "errorMessage" text, "completedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3878371c4254d50b147988251e5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "analytics_integrations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "providerType" character varying(64) NOT NULL, "encryptedConfig" text NOT NULL, "utmParameterName" character varying(128) NOT NULL DEFAULT 'utm_source', "lastSyncedAt" TIMESTAMP, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_2f358496b7676f5158424c805c5" UNIQUE ("userId"), CONSTRAINT "PK_002f37d6ebe2691f25882af961a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "accrual_rules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "partnerId" uuid, "eventName" character varying(255) NOT NULL, "ruleType" character varying(32) NOT NULL, "amount" numeric(20,6) NOT NULL, "revenueProperty" character varying(255), "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_836ccf12a79e66bae8eb97fc5c3" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "accrual_rules"`);
    await queryRunner.query(`DROP TABLE "analytics_integrations"`);
    await queryRunner.query(`DROP TABLE "analytics_sync_jobs"`);
    await queryRunner.query(`DROP TABLE "api_keys"`);
    await queryRunner.query(`DROP TABLE "conversion_events"`);
    await queryRunner.query(`DROP TABLE "partners"`);
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
