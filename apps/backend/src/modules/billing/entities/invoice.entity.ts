import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Local mirror of a Paddle transaction (Paddle's term for an invoice).
 * Populated from `transaction.*` webhook events so we can render billing
 * history without a round-trip to Paddle on every /billing page view.
 * Source of truth remains Paddle — we only store what we need to display.
 */
@Entity('invoices')
@Index('IDX_invoices_user', ['userId', 'createdAt'])
export class InvoiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  paddleTransactionId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  paddleSubscriptionId: string | null;

  @Column({ type: 'decimal', precision: 20, scale: 2 })
  amountDue: string;

  @Column({ type: 'decimal', precision: 20, scale: 2 })
  amountPaid: string;

  @Column({ type: 'varchar', length: 8 })
  currency: string;

  @Column({ type: 'varchar', length: 32 })
  status: string;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  hostedInvoiceUrl: string | null;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  invoicePdfUrl: string | null;

  @Column({ type: 'timestamp', nullable: true })
  periodStart: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  periodEnd: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
