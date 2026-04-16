import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('partners')
export class PartnerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'varchar', length: 128 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ default: true })
  isActive: boolean;

  // ─── Partner portal credentials ──────────────────────────────────────────
  // A partner gains portal access via: owner generates invitation (sets
  // email + token) → partner follows invite URL → sets password (hashedPassword
  // is written, token cleared). `email` is the login identifier.

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  hashedPassword: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  invitationToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  invitationExpiresAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
