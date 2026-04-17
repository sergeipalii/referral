import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  hashedPassword: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string | null;

  /** How many days a click remains valid for conversion attribution.
   *  Default 30 — the industry standard. Configurable per tenant. */
  @Column({ type: 'int', default: 30 })
  attributionWindowDays: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
