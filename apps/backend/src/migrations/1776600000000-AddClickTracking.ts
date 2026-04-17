import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClickTracking1776600000000 implements MigrationInterface {
  name = 'AddClickTracking1776600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Clicks table — one row per partner-link click, used to attribute
    // conversions that happen within the attribution window.
    await queryRunner.query(`
      CREATE TABLE "clicks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "partnerId" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "expiresAt" TIMESTAMP NOT NULL,
        "ip" character varying(45),
        "userAgent" character varying(1024),
        "referer" character varying(2048),
        "landingUrl" character varying(2048),
        CONSTRAINT "PK_clicks" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_clicks_tenant_partner" ON "clicks" ("userId", "partnerId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_clicks_expiresAt" ON "clicks" ("expiresAt")`,
    );

    // Per-tenant attribution window setting. Default 30 days — the industry
    // standard for affiliate programs. Stored on the users table (one value
    // per tenant, override per-partner not in MVP).
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "attributionWindowDays" int NOT NULL DEFAULT 30`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "attributionWindowDays"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_clicks_expiresAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_clicks_tenant_partner"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "clicks"`);
  }
}
