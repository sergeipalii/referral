import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBilling1776400000000 implements MigrationInterface {
  name = 'AddBilling1776400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── subscriptions ─────────────────────────────────────────────────────
    // 1:1 с tenant-ом (`userId`). `stripe*` поля null у free-плана — в Stripe
    // клиента создаём лениво при первом апгрейде, чтобы не засорять их БД
    // неактивными юзерами и не тащить compliance-overhead в free-onboarding.
    await queryRunner.query(`
      CREATE TABLE "subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "planKey" character varying(32) NOT NULL,
        "status" character varying(32) NOT NULL,
        "stripeCustomerId" character varying(255),
        "stripeSubscriptionId" character varying(255),
        "currentPeriodStart" TIMESTAMP,
        "currentPeriodEnd" TIMESTAMP,
        "cancelAtPeriodEnd" boolean NOT NULL DEFAULT false,
        "trialEndsAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_subscriptions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_subscriptions_userId" UNIQUE ("userId")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_subscriptions_stripeCustomerId" ON "subscriptions" ("stripeCustomerId") WHERE "stripeCustomerId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_subscriptions_stripeSubscriptionId" ON "subscriptions" ("stripeSubscriptionId") WHERE "stripeSubscriptionId" IS NOT NULL`,
    );

    // ── invoices (mirror of Stripe invoices) ─────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "invoices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "stripeInvoiceId" character varying(255) NOT NULL,
        "stripeSubscriptionId" character varying(255),
        "amountDue" numeric(20,2) NOT NULL,
        "amountPaid" numeric(20,2) NOT NULL,
        "currency" character varying(8) NOT NULL,
        "status" character varying(32) NOT NULL,
        "hostedInvoiceUrl" character varying(1024),
        "invoicePdfUrl" character varying(1024),
        "periodStart" TIMESTAMP,
        "periodEnd" TIMESTAMP,
        "paidAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_invoices" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_invoices_stripeInvoiceId" UNIQUE ("stripeInvoiceId")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_invoices_user" ON "invoices" ("userId", "createdAt")`,
    );

    // ── processed_webhook_events (idempotency for Stripe webhooks) ───────
    // Аналог idempotency_keys, но scope per event_id вне tenant-а. Cron
    // `BillingService` чистит записи старше 30 дней.
    await queryRunner.query(`
      CREATE TABLE "processed_webhook_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "stripeEventId" character varying(255) NOT NULL,
        "type" character varying(128) NOT NULL,
        "processedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_processed_webhook_events" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_processed_webhook_events_stripeEventId" UNIQUE ("stripeEventId")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_processed_webhook_events_processedAt" ON "processed_webhook_events" ("processedAt")`,
    );

    // ── Backfill: every existing user gets a free subscription row ────────
    // Idempotent via ON CONFLICT — migration is safe to re-run (TypeORM
    // normally doesn't, but we want graceful behaviour if someone does).
    await queryRunner.query(`
      INSERT INTO "subscriptions" ("userId", "planKey", "status")
      SELECT "id", 'free', 'active' FROM "users"
      ON CONFLICT ("userId") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_processed_webhook_events_processedAt"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "processed_webhook_events"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_invoices_user"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "invoices"`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_subscriptions_stripeSubscriptionId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_subscriptions_stripeCustomerId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "subscriptions"`);
  }
}
