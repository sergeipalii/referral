import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversionEventEntity } from '../conversions/entities/conversion-event.entity';
import { PaymentEntity } from '../payments/entities/payment.entity';
import {
  EventBreakdownDto,
  KpiDto,
  TimeseriesPointDto,
  TopPartnerDto,
} from './dto/analytics-response.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(ConversionEventEntity)
    private readonly conversions: Repository<ConversionEventEntity>,
    @InjectRepository(PaymentEntity)
    private readonly payments: Repository<PaymentEntity>,
  ) {}

  // ─── Timeseries ─────────────────────────────────────────────────────────

  async getTimeseries(
    userId: string,
    dateFrom?: string,
    dateTo?: string,
    partnerId?: string,
    eventName?: string,
  ): Promise<TimeseriesPointDto[]> {
    const qb = this.conversions
      .createQueryBuilder('ce')
      .select('ce."eventDate"', 'date')
      .addSelect('COALESCE(SUM(ce."count"), 0)::int', 'conversions')
      .addSelect('COALESCE(SUM(ce."revenueSum"::numeric), 0)::text', 'revenue')
      .addSelect(
        'COALESCE(SUM(ce."accrualAmount"::numeric), 0)::text',
        'accrual',
      )
      .where('ce."userId" = :userId', { userId })
      .groupBy('ce."eventDate"')
      .orderBy('ce."eventDate"', 'ASC');

    if (dateFrom) qb.andWhere('ce."eventDate" >= :dateFrom', { dateFrom });
    if (dateTo) qb.andWhere('ce."eventDate" <= :dateTo', { dateTo });
    if (partnerId)
      qb.andWhere('ce."partnerId" = :partnerId', { partnerId });
    if (eventName)
      qb.andWhere('ce."eventName" = :eventName', { eventName });

    const rows = await qb.getRawMany<{
      date: string;
      conversions: number;
      revenue: string;
      accrual: string;
    }>();

    return rows.map((r) => ({
      date: typeof r.date === 'string' ? r.date : new Date(r.date).toISOString().slice(0, 10),
      conversions: Number(r.conversions),
      revenue: r.revenue,
      accrual: r.accrual,
    }));
  }

  // ─── Top partners ───────────────────────────────────────────────────────

  async getTopPartners(
    userId: string,
    limit = 10,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<TopPartnerDto[]> {
    const qb = this.conversions
      .createQueryBuilder('ce')
      .select('ce."partnerId"', 'partnerId')
      .addSelect('p."name"', 'partnerName')
      .addSelect('p."code"', 'partnerCode')
      .addSelect('COALESCE(SUM(ce."count"), 0)::int', 'conversions')
      .addSelect('COALESCE(SUM(ce."revenueSum"::numeric), 0)::text', 'revenue')
      .addSelect(
        'COALESCE(SUM(ce."accrualAmount"::numeric), 0)::text',
        'accrual',
      )
      .innerJoin(
        'partners',
        'p',
        'p."id"::text = ce."partnerId" AND p."userId" = ce."userId"',
      )
      .where('ce."userId" = :userId', { userId })
      .groupBy('ce."partnerId"')
      .addGroupBy('p."name"')
      .addGroupBy('p."code"')
      .orderBy('COALESCE(SUM(ce."count"), 0)', 'DESC')
      .limit(limit);

    if (dateFrom) qb.andWhere('ce."eventDate" >= :dateFrom', { dateFrom });
    if (dateTo) qb.andWhere('ce."eventDate" <= :dateTo', { dateTo });

    return qb.getRawMany<TopPartnerDto>();
  }

  // ─── Event breakdown ────────────────────────────────────────────────────

  async getEventBreakdown(
    userId: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<EventBreakdownDto[]> {
    const qb = this.conversions
      .createQueryBuilder('ce')
      .select('ce."eventName"', 'eventName')
      .addSelect('COALESCE(SUM(ce."count"), 0)::int', 'conversions')
      .addSelect('COALESCE(SUM(ce."revenueSum"::numeric), 0)::text', 'revenue')
      .addSelect(
        'COALESCE(SUM(ce."accrualAmount"::numeric), 0)::text',
        'accrual',
      )
      .where('ce."userId" = :userId', { userId })
      .groupBy('ce."eventName"')
      .orderBy('COALESCE(SUM(ce."count"), 0)', 'DESC');

    if (dateFrom) qb.andWhere('ce."eventDate" >= :dateFrom', { dateFrom });
    if (dateTo) qb.andWhere('ce."eventDate" <= :dateTo', { dateTo });

    return qb.getRawMany<EventBreakdownDto>();
  }

  // ─── KPIs with trend ────────────────────────────────────────────────────

  async getKpis(
    userId: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<KpiDto> {
    const current = await this.periodKpis(userId, dateFrom, dateTo);

    // Compute the previous period of equal length for trend comparison.
    let prev = { totalConversions: 0, totalRevenue: '0', totalAccrual: '0', totalPaid: '0' };
    if (dateFrom && dateTo) {
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      const daysDiff = Math.ceil(
        (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24),
      );
      const prevTo = new Date(from.getTime() - 1000 * 60 * 60 * 24); // day before dateFrom
      const prevFrom = new Date(
        prevTo.getTime() - daysDiff * 1000 * 60 * 60 * 24,
      );
      prev = await this.periodKpis(
        userId,
        prevFrom.toISOString().slice(0, 10),
        prevTo.toISOString().slice(0, 10),
      );
    }

    return { ...current, prev };
  }

  private async periodKpis(
    userId: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<{
    totalConversions: number;
    totalRevenue: string;
    totalAccrual: string;
    totalPaid: string;
  }> {
    const convQb = this.conversions
      .createQueryBuilder('ce')
      .select('COALESCE(SUM(ce."count"), 0)::int', 'totalConversions')
      .addSelect(
        'COALESCE(SUM(ce."revenueSum"::numeric), 0)::text',
        'totalRevenue',
      )
      .addSelect(
        'COALESCE(SUM(ce."accrualAmount"::numeric), 0)::text',
        'totalAccrual',
      )
      .where('ce."userId" = :userId', { userId });

    if (dateFrom) convQb.andWhere('ce."eventDate" >= :dateFrom', { dateFrom });
    if (dateTo) convQb.andWhere('ce."eventDate" <= :dateTo', { dateTo });

    const convRow = await convQb.getRawOne<{
      totalConversions: number;
      totalRevenue: string;
      totalAccrual: string;
    }>();

    const payQb = this.payments
      .createQueryBuilder('p')
      .select(
        `COALESCE(SUM(CASE WHEN p."status" = 'completed' THEN p."amount"::numeric ELSE 0 END), 0)::text`,
        'totalPaid',
      )
      .where('p."userId" = :userId', { userId });

    if (dateFrom)
      payQb.andWhere('p."createdAt" >= :dateFrom', {
        dateFrom: new Date(dateFrom),
      });
    if (dateTo)
      payQb.andWhere('p."createdAt" <= :dateTo', {
        dateTo: new Date(dateTo),
      });

    const payRow = await payQb.getRawOne<{ totalPaid: string }>();

    return {
      totalConversions: Number(convRow?.totalConversions ?? 0),
      totalRevenue: convRow?.totalRevenue ?? '0',
      totalAccrual: convRow?.totalAccrual ?? '0',
      totalPaid: payRow?.totalPaid ?? '0',
    };
  }
}
