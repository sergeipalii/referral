import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type RuleType = 'fixed' | 'percentage';

@Entity('accrual_rules')
export class AccrualRuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  partnerId: string | null;

  @Column({ type: 'varchar', length: 255 })
  eventName: string;

  @Column({ type: 'varchar', length: 32 })
  ruleType: RuleType;

  @Column({ type: 'decimal', precision: 20, scale: 6 })
  amount: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  revenueProperty: string | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
