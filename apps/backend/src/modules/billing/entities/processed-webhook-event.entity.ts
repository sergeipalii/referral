import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Idempotency ledger for Stripe webhooks. Every `evt_*` id we've successfully
 * processed lands here via INSERT ... ON CONFLICT DO NOTHING; if the insert
 * conflicts we know we've already handled that event and skip re-processing.
 *
 * Rows are cleaned up by a scheduled job after 30 days — by which point
 * Stripe has given up retrying anyway.
 */
@Entity('processed_webhook_events')
@Index('IDX_processed_webhook_events_processedAt', ['processedAt'])
export class ProcessedWebhookEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  stripeEventId: string;

  @Column({ type: 'varchar', length: 128 })
  type: string;

  @CreateDateColumn()
  processedAt: Date;
}
