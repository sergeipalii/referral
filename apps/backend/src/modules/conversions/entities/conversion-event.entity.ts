import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity('conversion_events')
@Unique('UQ_conv_bucket', ['userId', 'partnerId', 'eventName', 'eventDate'])
export class ConversionEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  partnerId: string;

  @Column({ type: 'varchar', length: 255 })
  eventName: string;

  @Column({ type: 'date' })
  eventDate: string;

  @Column({ type: 'int', default: 0 })
  count: number;

  @Column({ type: 'decimal', precision: 20, scale: 6, default: '0' })
  revenueSum: string;

  @Column({ type: 'decimal', precision: 20, scale: 6, default: '0' })
  accrualAmount: string;

  @Column({ type: 'uuid', nullable: true })
  accrualRuleId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
