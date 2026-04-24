import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Idempotency ledger for Paddle webhooks. Every event id we've successfully
 * processed lands here via INSERT ... ON CONFLICT DO NOTHING; if the insert
 * conflicts we know we've already handled that event and skip re-processing.
 *
 * Rows are cleaned up by a scheduled job after 30 days — by which point
 * Paddle has given up retrying anyway.
 */
@Entity('processed_webhook_events')
@Index('IDX_processed_webhook_events_processedAt', ['processedAt'])
export class ProcessedWebhookEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  paddleEventId: string;

  @Column({ type: 'varchar', length: 128 })
  type: string;

  @CreateDateColumn()
  processedAt: Date;
}
