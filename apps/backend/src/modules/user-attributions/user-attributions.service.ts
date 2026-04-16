import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserAttributionEntity } from './entities/user-attribution.entity';

@Injectable()
export class UserAttributionsService {
  constructor(
    @InjectRepository(UserAttributionEntity)
    private readonly repo: Repository<UserAttributionEntity>,
  ) {}

  async findByExternalUserId(
    userId: string,
    externalUserId: string,
  ): Promise<UserAttributionEntity | null> {
    return this.repo.findOne({ where: { userId, externalUserId } });
  }

  /**
   * First-touch attribution: if no row exists for `(userId, externalUserId)`,
   * create one pointing at `partnerId`; otherwise return the existing row
   * unchanged. Race-safe via ON CONFLICT DO NOTHING — two concurrent calls for
   * the same pair both end up with the same row.
   */
  async getOrCreate(
    userId: string,
    externalUserId: string,
    partnerId: string,
    firstConversionAt: Date,
  ): Promise<UserAttributionEntity> {
    await this.repo.query(
      `INSERT INTO user_attributions ("userId", "externalUserId", "partnerId", "firstConversionAt")
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ("userId", "externalUserId") DO NOTHING`,
      [userId, externalUserId, partnerId, firstConversionAt],
    );

    // Always re-read after the upsert so callers observe the authoritative
    // row (either the one we just inserted or the pre-existing one).
    const row = await this.repo.findOne({
      where: { userId, externalUserId },
    });
    if (!row) {
      // Shouldn't happen, but throw rather than return undefined so the type
      // signature stays clean and any bug surfaces loudly.
      throw new Error(
        `Attribution upsert returned no row for (${userId}, ${externalUserId})`,
      );
    }
    return row;
  }
}
