import { MigrationInterface, QueryRunner } from 'typeorm';
import * as crypto from 'crypto';

export class AddApiKeyWebhookToken1776000000000 implements MigrationInterface {
  name = 'AddApiKeyWebhookToken1776000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add nullable column first so existing rows can be backfilled individually.
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD COLUMN "webhookToken" character varying(64)`,
    );

    // Backfill existing keys with unique random tokens so direct MMP webhooks
    // can be used without recreating every key.
    const rows: { id: string }[] = await queryRunner.query(
      `SELECT "id" FROM "api_keys" WHERE "webhookToken" IS NULL`,
    );
    for (const row of rows) {
      const token = crypto.randomBytes(32).toString('hex');
      await queryRunner.query(
        `UPDATE "api_keys" SET "webhookToken" = $1 WHERE "id" = $2`,
        [token, row.id],
      );
    }

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_api_keys_webhookToken" ON "api_keys" ("webhookToken")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_api_keys_webhookToken"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" DROP COLUMN IF EXISTS "webhookToken"`,
    );
  }
}
