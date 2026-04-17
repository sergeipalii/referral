import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('clicks')
@Index('IDX_clicks_tenant_partner', ['userId', 'partnerId'])
@Index('IDX_clicks_expiresAt', ['expiresAt'])
export class ClickEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  /** Stored as varchar (not uuid) to match conversion_events.partnerId. */
  @Column()
  partnerId: string;

  @CreateDateColumn()
  createdAt: Date;

  /** Click expires after attributionWindowDays — conversions past this
   *  timestamp will not be attributed to this click's partner. */
  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  referer: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  landingUrl: string | null;
}
