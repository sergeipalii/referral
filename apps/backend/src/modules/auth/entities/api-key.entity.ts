import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('api_keys')
export class ApiKeyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  /** SHA-256 hash of the actual key */
  @Column({ type: 'varchar', length: 64 })
  hashedKey: string;

  /** First 8 chars of the key for display purposes (e.g., "rk_a1b2c3d4...") */
  @Column({ type: 'varchar', length: 16 })
  prefix: string;

  /** Plaintext shared secret for HMAC request signing (shown once at creation) */
  @Column({ type: 'varchar', length: 64, nullable: true })
  signingSecret: string | null;

  /**
   * Plaintext token used in direct MMP webhook URLs
   * (POST /api/webhooks/mmp/<provider>/:webhookToken).
   * Shown to the user once at creation — grants tracking-only access with no
   * HMAC, so it must be treated as a shared secret.
   */
  @Column({ type: 'varchar', length: 64, nullable: true, unique: true })
  webhookToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
