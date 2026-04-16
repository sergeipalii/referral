import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRecurringAttribution1776300000000
  implements MigrationInterface
{
  name = 'AddRecurringAttribution1776300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. New column on accrual_rules. Only meaningful when ruleType is one of
    //    the two recurring variants — null there means "forever". For the
    //    non-recurring variants the column is ignored.
    await queryRunner.query(
      `ALTER TABLE "accrual_rules" ADD COLUMN "recurrenceDurationMonths" int`,
    );

    // 2. First-touch attribution table. Maps an external (customer-app) user
    //    ID to the partner who gets credit for their conversions. Once set,
    //    never rewritten unless explicitly deleted — recurring rules rely on
    //    `firstConversionAt` to gate the payment window.
    await queryRunner.query(`
      CREATE TABLE "user_attributions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "externalUserId" character varying(255) NOT NULL,
        "partnerId" uuid NOT NULL,
        "firstConversionAt" TIMESTAMP NOT NULL DEFAULT now(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_attributions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_attributions_tenant_external"
          UNIQUE ("userId", "externalUserId")
      )
    `);

    // Scope every attribution lookup by the partner as well (e.g. when we
    // display attribution stats per partner). Keep it simple: one composite
    // index for the common read path.
    await queryRunner.query(
      `CREATE INDEX "IDX_user_attributions_tenant_partner"
         ON "user_attributions" ("userId", "partnerId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_user_attributions_tenant_partner"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "user_attributions"`);
    await queryRunner.query(
      `ALTER TABLE "accrual_rules" DROP COLUMN IF EXISTS "recurrenceDurationMonths"`,
    );
  }
}
