import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rename all Stripe-specific billing columns + indexes + constraints to their
 * Paddle equivalents. No paying customers exist at migration time (launch
 * window), so we wipe prior `invoices` and `processed_webhook_events` rows
 * instead of trying to map Stripe IDs onto Paddle IDs. `subscriptions.paddle*`
 * is set to NULL for the same reason — the next Paddle checkout repopulates.
 *
 * Safe to run on any environment: the down migration reverses every step.
 */
export class SwitchStripeToPaddle1776700000000 implements MigrationInterface {
  name = 'SwitchStripeToPaddle1776700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── subscriptions ─────────────────────────────────────────────────────
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_subscriptions_stripeCustomerId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_subscriptions_stripeSubscriptionId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" RENAME COLUMN "stripeCustomerId" TO "paddleCustomerId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" RENAME COLUMN "stripeSubscriptionId" TO "paddleSubscriptionId"`,
    );
    await queryRunner.query(
      `UPDATE "subscriptions" SET "paddleCustomerId" = NULL, "paddleSubscriptionId" = NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_subscriptions_paddleCustomerId" ON "subscriptions" ("paddleCustomerId") WHERE "paddleCustomerId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_subscriptions_paddleSubscriptionId" ON "subscriptions" ("paddleSubscriptionId") WHERE "paddleSubscriptionId" IS NOT NULL`,
    );

    // ── invoices ──────────────────────────────────────────────────────────
    // Wipe rows before renaming the unique constraint — the stored Stripe
    // IDs are no longer meaningful and won't round-trip against Paddle.
    await queryRunner.query(`DELETE FROM "invoices"`);
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "UQ_invoices_stripeInvoiceId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" RENAME COLUMN "stripeInvoiceId" TO "paddleTransactionId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" RENAME COLUMN "stripeSubscriptionId" TO "paddleSubscriptionId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD CONSTRAINT "UQ_invoices_paddleTransactionId" UNIQUE ("paddleTransactionId")`,
    );

    // ── processed_webhook_events ──────────────────────────────────────────
    // Same story: stored Stripe event IDs are meaningless for Paddle.
    await queryRunner.query(`DELETE FROM "processed_webhook_events"`);
    await queryRunner.query(
      `ALTER TABLE "processed_webhook_events" DROP CONSTRAINT IF EXISTS "UQ_processed_webhook_events_stripeEventId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "processed_webhook_events" RENAME COLUMN "stripeEventId" TO "paddleEventId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "processed_webhook_events" ADD CONSTRAINT "UQ_processed_webhook_events_paddleEventId" UNIQUE ("paddleEventId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ── processed_webhook_events ──────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "processed_webhook_events" DROP CONSTRAINT IF EXISTS "UQ_processed_webhook_events_paddleEventId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "processed_webhook_events" RENAME COLUMN "paddleEventId" TO "stripeEventId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "processed_webhook_events" ADD CONSTRAINT "UQ_processed_webhook_events_stripeEventId" UNIQUE ("stripeEventId")`,
    );

    // ── invoices ──────────────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "UQ_invoices_paddleTransactionId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" RENAME COLUMN "paddleSubscriptionId" TO "stripeSubscriptionId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" RENAME COLUMN "paddleTransactionId" TO "stripeInvoiceId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD CONSTRAINT "UQ_invoices_stripeInvoiceId" UNIQUE ("stripeInvoiceId")`,
    );

    // ── subscriptions ─────────────────────────────────────────────────────
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_subscriptions_paddleSubscriptionId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_subscriptions_paddleCustomerId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" RENAME COLUMN "paddleSubscriptionId" TO "stripeSubscriptionId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" RENAME COLUMN "paddleCustomerId" TO "stripeCustomerId"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_subscriptions_stripeCustomerId" ON "subscriptions" ("stripeCustomerId") WHERE "stripeCustomerId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_subscriptions_stripeSubscriptionId" ON "subscriptions" ("stripeSubscriptionId") WHERE "stripeSubscriptionId" IS NOT NULL`,
    );
  }
}
