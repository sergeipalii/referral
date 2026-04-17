import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThan, Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { ClickEntity } from './entities/click.entity';
import { PartnersService } from '../partners/partners.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class ClicksService {
  private readonly logger = new Logger(ClicksService.name);

  constructor(
    @InjectRepository(ClickEntity)
    private readonly repo: Repository<ClickEntity>,
    private readonly partnersService: PartnersService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Record a click for a partner and return the click id + expiry. The
   * caller (redirect endpoint or first-party POST) passes the click id to
   * the end-user (via cookie or response body) so it can be attached to
   * the eventual conversion track call.
   */
  async create(args: {
    partnerCode: string;
    /** Tenant userId — resolved from the partner's owning user. */
    userId?: string;
    ip?: string;
    userAgent?: string;
    referer?: string;
    landingUrl?: string;
  }): Promise<{ clickId: string; expiresAt: Date; partnerId: string; landingUrl: string | null }> {
    // Resolve partner — also tells us the owning userId (tenant).
    let partner;
    if (args.userId) {
      partner = await this.partnersService.findByCode(
        args.userId,
        args.partnerCode,
      );
    } else {
      // Public endpoint — look up partner by code across all tenants.
      // In a multi-tenant system this is ambiguous; for now, find the
      // first active partner with this code. When partner codes are
      // globally unique (hex-generated), collision is astronomically rare.
      partner = await this.partnersService.findByCodeGlobal(args.partnerCode);
    }
    if (!partner || !partner.isActive) {
      throw new NotFoundException(
        `Partner with code "${args.partnerCode}" not found`,
      );
    }

    // Read the tenant's attribution window setting.
    const user = await this.usersService.findById(partner.userId);
    const windowDays = user?.attributionWindowDays ?? 30;

    const expiresAt = new Date(
      Date.now() + windowDays * 24 * 60 * 60 * 1000,
    );

    const click = this.repo.create({
      userId: partner.userId,
      partnerId: partner.id,
      expiresAt,
      ip: args.ip ?? null,
      userAgent: args.userAgent ?? null,
      referer: args.referer ?? null,
      landingUrl: args.landingUrl ?? null,
    });
    const saved = await this.repo.save(click);

    return {
      clickId: saved.id,
      expiresAt: saved.expiresAt,
      partnerId: partner.id,
      landingUrl: args.landingUrl ?? null,
    };
  }

  /**
   * Find a click by id and verify it hasn't expired. Returns null if the
   * click doesn't exist, belongs to a different tenant, or has expired.
   */
  async findValid(
    userId: string,
    clickId: string,
  ): Promise<ClickEntity | null> {
    return this.repo.findOne({
      where: {
        id: clickId,
        userId,
        expiresAt: MoreThan(new Date()),
      },
    });
  }

  /** Delete clicks that expired more than 7 days ago (grace for analytics). */
  @Cron('30 4 * * *')
  async cleanup(): Promise<void> {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const result = await this.repo.delete({
      expiresAt: LessThan(cutoff),
    });
    if (result.affected && result.affected > 0) {
      this.logger.log(`Cleaned up ${result.affected} expired click(s)`);
    }
  }
}
