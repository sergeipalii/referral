import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('analytics_integrations')
export class AnalyticsIntegrationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userId: string;

  @Column({ type: 'varchar', length: 64 })
  providerType: string;

  @Column({ type: 'text' })
  encryptedConfig: string;

  @Column({ type: 'varchar', length: 128, default: 'utm_source' })
  utmParameterName: string;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncedAt: Date | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
