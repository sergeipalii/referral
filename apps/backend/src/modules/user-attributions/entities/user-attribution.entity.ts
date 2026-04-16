import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

/**
 * First-touch attribution: maps a customer-app's user identifier to the
 * partner who receives credit for that user's conversions. Row is created on
 * the first conversion carrying `externalUserId`; subsequent events reuse it
 * even if a different partnerCode is supplied — this is the backbone of
 * recurring commissions.
 */
@Entity('user_attributions')
@Unique('UQ_user_attributions_tenant_external', ['userId', 'externalUserId'])
@Index('IDX_user_attributions_tenant_partner', ['userId', 'partnerId'])
export class UserAttributionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  externalUserId: string;

  @Column({ type: 'uuid' })
  partnerId: string;

  @Column({ type: 'timestamp' })
  firstConversionAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
