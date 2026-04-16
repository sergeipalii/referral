import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPartnerCredentials1776100000000 implements MigrationInterface {
  name = 'AddPartnerCredentials1776100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "partners" ADD COLUMN "email" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "partners" ADD COLUMN "hashedPassword" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "partners" ADD COLUMN "invitationToken" character varying(64)`,
    );
    await queryRunner.query(
      `ALTER TABLE "partners" ADD COLUMN "invitationExpiresAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "partners" ADD COLUMN "lastLoginAt" TIMESTAMP`,
    );

    // Email is used as the partner login identifier. Globally unique when set
    // — for MVP partners use plus-aliases if they need to join multiple
    // programs with the same base address.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_partners_email" ON "partners" ("email") WHERE "email" IS NOT NULL`,
    );

    // Invitation token is opaque and should be looked up by value, so index
    // it for constant-time accept flows.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_partners_invitationToken" ON "partners" ("invitationToken") WHERE "invitationToken" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_partners_invitationToken"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_partners_email"`);
    await queryRunner.query(
      `ALTER TABLE "partners" DROP COLUMN IF EXISTS "lastLoginAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "partners" DROP COLUMN IF EXISTS "invitationExpiresAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "partners" DROP COLUMN IF EXISTS "invitationToken"`,
    );
    await queryRunner.query(
      `ALTER TABLE "partners" DROP COLUMN IF EXISTS "hashedPassword"`,
    );
    await queryRunner.query(
      `ALTER TABLE "partners" DROP COLUMN IF EXISTS "email"`,
    );
  }
}
