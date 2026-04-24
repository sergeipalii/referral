import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPartnerPayoutDetails1776200000000 implements MigrationInterface {
  name = 'AddPartnerPayoutDetails1776200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Free-form JSON so different partners can describe their preferred rail
    // (IBAN, PayPal email, Wise tag, crypto address, whatever) without the
    // backend dictating a schema. The portal form guides shape; the column
    // itself is schema-less.
    await queryRunner.query(
      `ALTER TABLE "partners" ADD COLUMN "payoutDetails" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "partners" DROP COLUMN IF EXISTS "payoutDetails"`,
    );
  }
}
