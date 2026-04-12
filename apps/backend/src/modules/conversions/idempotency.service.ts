import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { IdempotencyKeyEntity } from './entities/idempotency-key.entity';

@Injectable()
export class IdempotencyService {
  constructor(
    @InjectRepository(IdempotencyKeyEntity)
    private readonly repository: Repository<IdempotencyKeyEntity>,
  ) {}

  async check(
    userId: string,
    key: string,
  ): Promise<Record<string, any> | null> {
    const existing = await this.repository.findOne({
      where: { userId, key },
    });
    return existing?.response ?? null;
  }

  async store(
    userId: string,
    key: string,
    response: Record<string, any>,
  ): Promise<void> {
    const entity = this.repository.create({ userId, key, response });
    await this.repository.save(entity);
  }

  @Cron('0 3 * * *')
  async cleanup(): Promise<void> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await this.repository.delete({ createdAt: LessThan(cutoff) });
  }
}
