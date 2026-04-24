import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type RuleType =
  | 'fixed'
  | 'percentage'
  | 'recurring_fixed'
  | 'recurring_percentage';

export const RECURRING_RULE_TYPES: RuleType[] = [
  'recurring_fixed',
  'recurring_percentage',
];

export function isRecurringRuleType(type: RuleType): boolean {
  return type === 'recurring_fixed' || type === 'recurring_percentage';
}

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

  /**
   * Only meaningful for recurring rules. null = pays forever, any positive
   * int = window closes that many months after firstConversionAt.
   */
  @Column({ type: 'int', nullable: true })
  recurrenceDurationMonths: number | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
