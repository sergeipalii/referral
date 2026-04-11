import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type SyncJobStatus = 'running' | 'completed' | 'failed';

@Entity('analytics_sync_jobs')
export class AnalyticsSyncJobEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  integrationId: string;

  @Column({ type: 'varchar', length: 32 })
  status: SyncJobStatus;

  @Column({ type: 'timestamp' })
  rangeStart: Date;

  @Column({ type: 'timestamp' })
  rangeEnd: Date;

  @Column({ type: 'int', default: 0 })
  rawEventsCount: number;

  @Column({ type: 'int', default: 0 })
  conversionsCount: number;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
