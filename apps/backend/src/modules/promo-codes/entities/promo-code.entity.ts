import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('promo_codes')
@Unique('UQ_promo_codes_tenant_code', ['userId', 'code'])
@Index('IDX_promo_codes_partner', ['userId', 'partnerId'])
export class PromoCodeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'uuid' })
  partnerId: string;

  /** Always stored lowercase for case-insensitive lookup. */
  @Column({ type: 'varchar', length: 64 })
  code: string;

  /** null = unlimited uses. */
  @Column({ type: 'int', nullable: true })
  usageLimit: number | null;

  @Column({ type: 'int', default: 0 })
  usedCount: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
