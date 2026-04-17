import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { ConversionEventEntity } from './entities/conversion-event.entity';
import { ConversionsQueryDto } from './dto/requests/conversions-query.dto';
import { TrackConversionDto } from './dto/requests/track-conversion.dto';
import { ConversionEventDto } from './dto/responses/conversion-event.dto';
import { PartnerSummaryDto } from './dto/responses/partner-summary.dto';
import { TrackResultDto } from './dto/responses/track-result.dto';
import {
  PaginatedResponseDto,
  PaginationMetaDto,
} from '../../common/dto/pagination-meta.dto';
import { PartnersService } from '../partners/partners.service';
import { AccrualRulesService } from '../accrual-rules/accrual-rules.service';
import {
  AccrualRuleEntity,
  isRecurringRuleType,
} from '../accrual-rules/entities/accrual-rule.entity';
import { IdempotencyService } from './idempotency.service';
import { UserAttributionsService } from '../user-attributions/user-attributions.service';
import { UserAttributionEntity } from '../user-attributions/entities/user-attribution.entity';
import { PromoCodesService } from '../promo-codes/promo-codes.service';
import { ClicksService } from '../clicks/clicks.service';

export interface UpsertConversionBucketData {
  userId: string;
  partnerId: string;
  eventName: string;
  eventDate: string;
  count: number;
  revenueSum: number;
  accrualAmount: number;
  accrualRuleId: string | null;
}

/**
 * Add `n` calendar months to `date`. Mirrors JS Date arithmetic so "plus 1
 * month" on Jan 31 lands on the last day of February, not March 3rd.
 */
function addMonths(date: Date, n: number): Date {
  const d = new Date(date.getTime());
  const targetMonth = d.getMonth() + n;
  d.setMonth(targetMonth);
  // If the original day-of-month doesn't exist in the target month (e.g.
  // Mar 31 → Feb), JS rolls over; clamp to the last day of the target month.
  const expectedMonth = ((targetMonth % 12) + 12) % 12;
  if (d.getMonth() !== expectedMonth) {
    d.setDate(0);
  }
  return d;
}

@Injectable()
export class ConversionsService {
  constructor(
    @InjectRepository(ConversionEventEntity)
    private readonly conversionsRepository: Repository<ConversionEventEntity>,
    private readonly partnersService: PartnersService,
    private readonly accrualRulesService: AccrualRulesService,
    private readonly idempotencyService: IdempotencyService,
    private readonly userAttributionsService: UserAttributionsService,
    private readonly promoCodesService: PromoCodesService,
    private readonly clicksService: ClicksService,
  ) {}

  /**
   * Full tracking pipeline: idempotency → resolve partner (from attribution
   * if we've seen `externalUserId` before, else from `partnerCode`) → accrual
   * calculation (gated by the recurring-window if the rule is recurring) →
   * additive upsert → idempotency store. Reused by both the HMAC-authenticated
   * `/conversions/track` endpoint and the direct MMP webhook endpoints.
   */
  async track(
    userId: string,
    dto: TrackConversionDto,
  ): Promise<TrackResultDto> {
    if (dto.idempotencyKey) {
      const cached = await this.idempotencyService.check(
        userId,
        dto.idempotencyKey,
      );
      if (cached) return cached as TrackResultDto;
    }

    // ── Resolve partner ─────────────────────────────────────────────────
    // First-touch attribution wins: if we've seen this externalUserId before,
    // the stored partner gets credit even if the caller passes a different
    // partnerCode on this event.
    let attribution: UserAttributionEntity | null = null;
    if (dto.externalUserId) {
      attribution = await this.userAttributionsService.findByExternalUserId(
        userId,
        dto.externalUserId,
      );
    }

    let partnerId: string;
    if (attribution) {
      partnerId = attribution.partnerId;
    } else if (dto.promoCode) {
      // ── Promo code resolution (highest priority after attribution) ────
      // Atomically increments usedCount and auto-deactivates on limit.
      const resolved = await this.promoCodesService.resolveAndIncrement(
        userId,
        dto.promoCode,
      );
      if (!resolved) {
        throw new NotFoundException(
          `Promo code "${dto.promoCode}" not found or exhausted`,
        );
      }
      partnerId = resolved.partnerId;

      if (dto.externalUserId) {
        attribution = await this.userAttributionsService.getOrCreate(
          userId,
          dto.externalUserId,
          partnerId,
          new Date(),
        );
        partnerId = attribution.partnerId;
      }
    } else if (dto.clickId) {
      // ── Click-based resolution ──────────────────────────────────────
      const click = await this.clicksService.findValid(userId, dto.clickId);
      if (!click) {
        // Expired or unknown click — fall through to partnerCode if present
        if (dto.partnerCode) {
          const partner = await this.partnersService.findByCode(
            userId,
            dto.partnerCode,
          );
          if (!partner || !partner.isActive) {
            throw new NotFoundException(
              `Partner with code "${dto.partnerCode}" not found`,
            );
          }
          partnerId = partner.id;
        } else {
          throw new BadRequestException(
            'Click has expired and no fallback partnerCode provided',
          );
        }
      } else {
        partnerId = click.partnerId;
      }

      if (dto.externalUserId) {
        attribution = await this.userAttributionsService.getOrCreate(
          userId,
          dto.externalUserId,
          partnerId,
          new Date(),
        );
        partnerId = attribution.partnerId;
      }
    } else if (dto.partnerCode) {
      const partner = await this.partnersService.findByCode(
        userId,
        dto.partnerCode,
      );
      if (!partner || !partner.isActive) {
        throw new NotFoundException(
          `Partner with code "${dto.partnerCode}" not found`,
        );
      }
      partnerId = partner.id;

      if (dto.externalUserId) {
        attribution = await this.userAttributionsService.getOrCreate(
          userId,
          dto.externalUserId,
          partnerId,
          new Date(),
        );
        partnerId = attribution.partnerId;
      }
    } else {
      throw new BadRequestException(
        'Provide partnerCode, promoCode, or externalUserId with an existing attribution',
      );
    }

    const eventDate = dto.eventDate ?? new Date().toISOString().slice(0, 10);
    const count = dto.count ?? 1;
    const revenue = dto.revenue ?? 0;

    const rule = await this.accrualRulesService.findApplicableRule(
      userId,
      partnerId,
      dto.eventName,
    );

    const accrualAmount = this.calculateAccrual(
      rule,
      count,
      revenue,
      attribution,
    );

    await this.addToBucket({
      userId,
      partnerId,
      eventName: dto.eventName,
      eventDate,
      count,
      revenueSum: revenue,
      accrualAmount,
      accrualRuleId: rule?.id ?? null,
    });

    const result: TrackResultDto = {
      success: true,
      partnerId,
      eventName: dto.eventName,
      eventDate,
      count,
      revenue,
      accrualAmount: accrualAmount.toFixed(6),
      accrualRuleId: rule?.id ?? null,
    };

    if (dto.idempotencyKey) {
      await this.idempotencyService.store(userId, dto.idempotencyKey, result);
    }

    return result;
  }

  /**
   * Compute the accrual amount for an event. Recurring rules additionally
   * require (a) an attribution row so we know when the relationship started,
   * and (b) for that attribution to still fall inside the configured window.
   */
  private calculateAccrual(
    rule: AccrualRuleEntity | null,
    count: number,
    revenue: number,
    attribution: UserAttributionEntity | null,
  ): number {
    if (!rule) return 0;

    if (isRecurringRuleType(rule.ruleType)) {
      if (!attribution) {
        // Recurring payout requires an attribution row — without it we can't
        // tell if the event is within the commission window.
        return 0;
      }
      if (
        rule.recurrenceDurationMonths !== null &&
        rule.recurrenceDurationMonths !== undefined
      ) {
        const expiresAt = addMonths(
          attribution.firstConversionAt,
          rule.recurrenceDurationMonths,
        );
        if (Date.now() > expiresAt.getTime()) return 0;
      }
    }

    if (rule.ruleType === 'fixed' || rule.ruleType === 'recurring_fixed') {
      return parseFloat(rule.amount) * count;
    }
    // percentage / recurring_percentage
    return (parseFloat(rule.amount) / 100) * revenue;
  }

  async findAll(
    userId: string,
    query: ConversionsQueryDto,
  ): Promise<PaginatedResponseDto<ConversionEventDto>> {
    const {
      page = 1,
      limit = 20,
      partnerId,
      eventName,
      dateFrom,
      dateTo,
    } = query;
    const offset = (page - 1) * limit;

    const where = this.buildWhere(userId, {
      partnerId,
      eventName,
      dateFrom,
      dateTo,
    });

    const [events, totalItems] = await this.conversionsRepository.findAndCount({
      where,
      skip: offset,
      take: limit,
      order: { eventDate: 'DESC' },
    });

    const totalPages = Math.ceil(totalItems / limit);
    const meta: PaginationMetaDto = {
      page,
      limit,
      totalItems,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    };

    return { data: events.map(ConversionEventDto.fromEntity), meta };
  }

  async findByPartner(
    userId: string,
    partnerId: string,
    query: ConversionsQueryDto,
  ): Promise<PaginatedResponseDto<ConversionEventDto>> {
    await this.partnersService.findOneOrFail(userId, partnerId);
    return this.findAll(userId, { ...query, partnerId });
  }

  /**
   * Aggregate conversion-side totals for a single partner. Used by the partner
   * portal dashboard alongside payment-side totals from `PaymentsService`.
   */
  async getPartnerConversionTotals(
    userId: string,
    partnerId: string,
  ): Promise<{ totalConversions: number; lastConversionDate: string | null }> {
    const row = await this.conversionsRepository
      .createQueryBuilder('ce')
      .select('COALESCE(SUM(ce."count"), 0)::int', 'totalConversions')
      .addSelect('MAX(ce."eventDate")', 'lastConversionDate')
      .where('ce."userId" = :userId AND ce."partnerId" = :partnerId', {
        userId,
        partnerId,
      })
      .getRawOne<{ totalConversions: number; lastConversionDate: string | null }>();

    return {
      totalConversions: Number(row?.totalConversions ?? 0),
      lastConversionDate: row?.lastConversionDate ?? null,
    };
  }

  async getPartnerSummaries(
    userId: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<PartnerSummaryDto[]> {
    const qb = this.conversionsRepository
      .createQueryBuilder('ce')
      .select('ce."partnerId"', 'partnerId')
      .addSelect('p."name"', 'partnerName')
      .addSelect('p."code"', 'partnerCode')
      .addSelect('COALESCE(SUM(ce."count"), 0)::int', 'totalConversions')
      .addSelect(
        'COALESCE(SUM(ce."accrualAmount"::numeric), 0)::text',
        'totalAccrualAmount',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN pay."status" = 'completed' THEN pay."amount"::numeric ELSE 0 END), 0)::text`,
        'totalPaid',
      )
      // `partners.id` is uuid; `conversion_events.partnerId` and
      // `payments.partnerId` are varchar (legacy migration). Cast explicitly
      // so Postgres accepts the join predicate.
      .innerJoin(
        'partners',
        'p',
        'p."id"::text = ce."partnerId" AND p."userId" = ce."userId"',
      )
      .leftJoin(
        'payments',
        'pay',
        'pay."partnerId" = ce."partnerId" AND pay."userId" = ce."userId"',
      )
      .where('ce."userId" = :userId', { userId })
      .groupBy('ce."partnerId"')
      .addGroupBy('p."name"')
      .addGroupBy('p."code"');

    if (dateFrom) {
      qb.andWhere('ce."eventDate" >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      qb.andWhere('ce."eventDate" <= :dateTo', { dateTo });
    }

    const rows = await qb.getRawMany<{
      partnerId: string;
      partnerName: string;
      partnerCode: string;
      totalConversions: number;
      totalAccrualAmount: string;
      totalPaid: string;
    }>();

    return rows.map((row) => ({
      partnerId: row.partnerId,
      partnerName: row.partnerName,
      partnerCode: row.partnerCode,
      totalConversions: Number(row.totalConversions),
      totalAccrualAmount: row.totalAccrualAmount,
      totalPaid: row.totalPaid,
      balance: (
        parseFloat(row.totalAccrualAmount) - parseFloat(row.totalPaid)
      ).toFixed(6),
    }));
  }

  /**
   * Additive upsert: increments count/revenue/accrual for an existing bucket,
   * or creates a new one. Used by the track endpoint.
   * Requires UNIQUE constraint on (userId, partnerId, eventName, eventDate).
   */
  async addToBucket(
    data: UpsertConversionBucketData,
  ): Promise<ConversionEventEntity> {
    const rows: ConversionEventEntity[] =
      await this.conversionsRepository.query(
        `INSERT INTO conversion_events ("userId", "partnerId", "eventName", "eventDate", "count", "revenueSum", "accrualAmount", "accrualRuleId")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT ("userId", "partnerId", "eventName", "eventDate")
       DO UPDATE SET
         "count" = conversion_events."count" + EXCLUDED."count",
         "revenueSum" = conversion_events."revenueSum" + EXCLUDED."revenueSum",
         "accrualAmount" = conversion_events."accrualAmount" + EXCLUDED."accrualAmount",
         "accrualRuleId" = EXCLUDED."accrualRuleId",
         "updatedAt" = NOW()
       RETURNING *`,
        [
          data.userId,
          data.partnerId,
          data.eventName,
          data.eventDate,
          data.count,
          data.revenueSum.toFixed(6),
          data.accrualAmount.toFixed(6),
          data.accrualRuleId,
        ],
      );

    return rows[0];
  }

  private buildWhere(
    userId: string,
    filters: {
      partnerId?: string;
      eventName?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ): Record<string, any> {
    const where: Record<string, any> = { userId };

    if (filters.partnerId) where.partnerId = filters.partnerId;
    if (filters.eventName) where.eventName = filters.eventName;

    if (filters.dateFrom && filters.dateTo) {
      where.eventDate = Between(filters.dateFrom, filters.dateTo);
    } else if (filters.dateFrom) {
      where.eventDate = MoreThanOrEqual(filters.dateFrom);
    } else if (filters.dateTo) {
      where.eventDate = LessThanOrEqual(filters.dateTo);
    }

    return where;
  }
}
