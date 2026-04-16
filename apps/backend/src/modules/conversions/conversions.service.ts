import { Injectable, NotFoundException } from '@nestjs/common';
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
import { IdempotencyService } from './idempotency.service';

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

@Injectable()
export class ConversionsService {
  constructor(
    @InjectRepository(ConversionEventEntity)
    private readonly conversionsRepository: Repository<ConversionEventEntity>,
    private readonly partnersService: PartnersService,
    private readonly accrualRulesService: AccrualRulesService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  /**
   * Full tracking pipeline: idempotency check → partner lookup → accrual
   * calculation → additive upsert → idempotency store. Reused by both the
   * HMAC-authenticated `/conversions/track` endpoint and the direct MMP
   * webhook endpoints.
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

    const partner = await this.partnersService.findByCode(
      userId,
      dto.partnerCode,
    );
    if (!partner || !partner.isActive) {
      throw new NotFoundException(
        `Partner with code "${dto.partnerCode}" not found`,
      );
    }

    const eventDate = dto.eventDate ?? new Date().toISOString().slice(0, 10);
    const count = dto.count ?? 1;
    const revenue = dto.revenue ?? 0;

    const rule = await this.accrualRulesService.findApplicableRule(
      userId,
      partner.id,
      dto.eventName,
    );

    let accrualAmount = 0;
    if (rule) {
      if (rule.ruleType === 'fixed') {
        accrualAmount = parseFloat(rule.amount) * count;
      } else if (rule.ruleType === 'percentage') {
        accrualAmount = (parseFloat(rule.amount) / 100) * revenue;
      }
    }

    await this.addToBucket({
      userId,
      partnerId: partner.id,
      eventName: dto.eventName,
      eventDate,
      count,
      revenueSum: revenue,
      accrualAmount,
      accrualRuleId: rule?.id ?? null,
    });

    const result: TrackResultDto = {
      success: true,
      partnerId: partner.id,
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
      .innerJoin(
        'partners',
        'p',
        'p."id" = ce."partnerId" AND p."userId" = ce."userId"',
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
