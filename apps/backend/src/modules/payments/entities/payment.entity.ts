import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PaymentStatus = 'pending' | 'completed' | 'cancelled';

@Entity('payments')
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  partnerId: string;

  @Column({ type: 'decimal', precision: 20, scale: 6 })
  amount: string;

  @Column({ type: 'varchar', length: 32, default: 'completed' })
  status: PaymentStatus;

  @Column({ type: 'varchar', length: 512, nullable: true })
  reference: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'date', nullable: true })
  periodStart: string | null;

  @Column({ type: 'date', nullable: true })
  periodEnd: string | null;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
