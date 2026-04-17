import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPromoCodes1776500000000 implements MigrationInterface {
  name = 'AddPromoCodes1776500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "promo_codes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "partnerId" uuid NOT NULL,
        "code" character varying(64) NOT NULL,
        "usageLimit" int,
        "usedCount" int NOT NULL DEFAULT 0,
        "metadata" jsonb,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_promo_codes" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_promo_codes_tenant_code" UNIQUE ("userId", "code")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_promo_codes_partner" ON "promo_codes" ("userId", "partnerId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_promo_codes_partner"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "promo_codes"`);
  }
}
