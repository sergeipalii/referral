import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { PaymentEntity } from './entities/payment.entity';
import { PartnerEntity } from '../partners/entities/partner.entity';
import { CreatePaymentDto } from './dto/requests/create-payment.dto';
import { UpdatePaymentDto } from './dto/requests/update-payment.dto';
import { PaymentsQueryDto } from './dto/requests/payments-query.dto';
import { PaymentsExportQueryDto } from './dto/requests/payments-export-query.dto';
import {
  BatchPaymentsResultDto,
  CreateBatchPaymentsDto,
} from './dto/requests/create-batch-payments.dto';
import { PaymentDto } from './dto/responses/payment.dto';
import { PartnerBalanceDto } from './dto/responses/partner-balance.dto';
import {
  PaginatedResponseDto,
  PaginationMetaDto,
} from '../../common/dto/pagination-meta.dto';
import { StandardResponseDto } from '../../common/dto/standard-response.dto';
import { PartnersService } from '../partners/partners.service';

/**
 * RFC 4180 CSV field escaping: wrap in double quotes if the value contains
 * a delimiter, quote, or newline; double any embedded quotes.
 */
function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentsRepository: Repository<PaymentEntity>,
    private readonly partnersService: PartnersService,
  ) {}

  async findAll(
    userId: string,
    query: PaymentsQueryDto,
  ): Promise<PaginatedResponseDto<PaymentDto>> {
    const { page = 1, limit = 20, partnerId, status, dateFrom, dateTo } = query;
    const offset = (page - 1) * limit;

    const where: Record<string, any> = { userId };
    if (partnerId) where.partnerId = partnerId;
    if (status) where.status = status;

    if (dateFrom && dateTo) {
      where.createdAt = Between(new Date(dateFrom), new Date(dateTo));
    } else if (dateFrom) {
      where.createdAt = MoreThanOrEqual(new Date(dateFrom));
    } else if (dateTo) {
      where.createdAt = LessThanOrEqual(new Date(dateTo));
    }

    const [payments, totalItems] = await this.paymentsRepository.findAndCount({
      where,
      skip: offset,
      take: limit,
      order: { createdAt: 'DESC' },
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

    return { data: payments.map(PaymentDto.fromEntity), meta };
  }

  async findOneOrFail(userId: string, id: string): Promise<PaymentEntity> {
    const payment = await this.paymentsRepository.findOne({
      where: { id, userId },
    });
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
    return payment;
  }

  async create(userId: string, dto: CreatePaymentDto): Promise<PaymentDto> {
    await this.partnersService.findOneOrFail(userId, dto.partnerId);

    const payment = this.paymentsRepository.create({
      userId,
      partnerId: dto.partnerId,
      amount: dto.amount,
      status: dto.status ?? 'completed',
      reference: dto.reference ?? null,
      notes: dto.notes ?? null,
      periodStart: dto.periodStart ?? null,
      periodEnd: dto.periodEnd ?? null,
      paidAt: dto.paidAt ? new Date(dto.paidAt) : null,
      metadata: dto.metadata ?? null,
    });

    const saved = await this.paymentsRepository.save(payment);
    return PaymentDto.fromEntity(saved);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdatePaymentDto,
  ): Promise<PaymentDto> {
    const payment = await this.findOneOrFail(userId, id);
    Object.assign(payment, {
      ...dto,
      paidAt: dto.paidAt ? new Date(dto.paidAt) : payment.paidAt,
    });
    const saved = await this.paymentsRepository.save(payment);
    return PaymentDto.fromEntity(saved);
  }

  async remove(userId: string, id: string): Promise<StandardResponseDto> {
    await this.findOneOrFail(userId, id);
    await this.paymentsRepository.delete({ id, userId });
    return { success: true, message: 'Payment deleted successfully' };
  }

  /**
   * Same filters as `findAll` but without pagination — materialises the full
   * result set as a CSV string. Joins partner details so a finance team can
   * take the file straight to a bank portal or send it to accounting without
   * doing their own lookups.
   */
  async exportCsv(
    userId: string,
    query: PaymentsExportQueryDto,
  ): Promise<string> {
    // `partners.id` is uuid; `payments.partnerId` is character varying (legacy
    // migration). Postgres won't implicitly compare them, so cast on join.
    const qb = this.paymentsRepository
      .createQueryBuilder('p')
      .innerJoin(
        'partners',
        'partner',
        'partner."id"::text = p."partnerId" AND partner."userId" = p."userId"',
      )
      .select([
        'p."id" AS "paymentId"',
        'partner."name" AS "partnerName"',
        'partner."code" AS "partnerCode"',
        'partner."email" AS "partnerEmail"',
        'partner."payoutDetails" AS "payoutDetails"',
        'p."amount" AS "amount"',
        'p."status" AS "status"',
        'p."periodStart" AS "periodStart"',
        'p."periodEnd" AS "periodEnd"',
        'p."reference" AS "reference"',
        'p."notes" AS "notes"',
        'p."paidAt" AS "paidAt"',
        'p."createdAt" AS "createdAt"',
      ])
      .where('p."userId" = :userId', { userId })
      .orderBy('p."createdAt"', 'DESC');

    if (query.partnerId) {
      qb.andWhere('p."partnerId" = :partnerId', { partnerId: query.partnerId });
    }
    if (query.status) {
      qb.andWhere('p."status" = :status', { status: query.status });
    }
    if (query.dateFrom) {
      qb.andWhere('p."createdAt" >= :dateFrom', {
        dateFrom: new Date(query.dateFrom),
      });
    }
    if (query.dateTo) {
      qb.andWhere('p."createdAt" <= :dateTo', {
        dateTo: new Date(query.dateTo),
      });
    }

    const rows = await qb.getRawMany<{
      paymentId: string;
      partnerName: string;
      partnerCode: string;
      partnerEmail: string | null;
      payoutDetails: Record<string, unknown> | null;
      amount: string;
      status: string;
      periodStart: string | null;
      periodEnd: string | null;
      reference: string | null;
      notes: string | null;
      paidAt: Date | null;
      createdAt: Date;
    }>();

    const header = [
      'payment_id',
      'partner_name',
      'partner_code',
      'partner_email',
      'amount',
      'status',
      'period_start',
      'period_end',
      'reference',
      'notes',
      'payout_details',
      'paid_at',
      'created_at',
    ];

    const lines = [header.map(csvEscape).join(',')];
    for (const r of rows) {
      lines.push(
        [
          r.paymentId,
          r.partnerName,
          r.partnerCode,
          r.partnerEmail ?? '',
          r.amount,
          r.status,
          r.periodStart ?? '',
          r.periodEnd ?? '',
          r.reference ?? '',
          r.notes ?? '',
          r.payoutDetails ? JSON.stringify(r.payoutDetails) : '',
          r.paidAt ? new Date(r.paidAt).toISOString() : '',
          new Date(r.createdAt).toISOString(),
        ]
          .map(csvEscape)
          .join(','),
      );
    }
    return lines.join('\n');
  }

  /**
   * Create one `pending` payment per eligible partner. Eligibility = partner
   * is active, belongs to the tenant, optionally in `partnerIds`, and unallocated
   * balance (totalAccrued − totalCompleted − totalPending) > minAmount.
   *
   * Pending rows are treated as already allocated: a second click on "Generate
   * pending payouts" must be a no-op if the previous batch is still pending,
   * otherwise duplicate rows stack up for the same earned amount.
   *
   * Not transactional on purpose: partial failure means the caller still sees
   * whatever was created and can fix up the rest.
   */
  async createBatch(
    userId: string,
    dto: CreateBatchPaymentsDto,
  ): Promise<BatchPaymentsResultDto> {
    const minAmount = dto.minAmount ?? 0;

    // Query every partner's balance in a single shot so we don't N+1 when
    // batching hundreds of partners. Only partners with a row in either
    // conversion_events or payments appear; partners with no activity can't
    // have a positive balance anyway.
    const partnerFilter = dto.partnerIds && dto.partnerIds.length > 0;
    const qb = this.paymentsRepository.manager
      .createQueryBuilder(PartnerEntity, 'partner')
      .select('partner."id"', 'partnerId')
      // `conversion_events.partnerId` and `payments.partnerId` are varchar by
      // legacy migration; `partner.id` is uuid. Cast explicitly on both sides
      // of each correlation so Postgres accepts the comparison.
      .addSelect(
        `COALESCE((
            SELECT SUM(ce."accrualAmount"::numeric)
            FROM conversion_events ce
            WHERE ce."partnerId" = partner."id"::text
              AND ce."userId" = partner."userId"
          ), 0)::text`,
        'totalAccrued',
      )
      // Both `completed` and `pending` count as allocated — pending is money
      // already committed by a previous batch run, just not yet paid out.
      // Only `canceled` rows are ignored.
      .addSelect(
        `COALESCE((
            SELECT SUM(pay."amount"::numeric)
            FROM payments pay
            WHERE pay."partnerId" = partner."id"::text
              AND pay."userId" = partner."userId"
              AND pay."status" IN ('completed', 'pending')
          ), 0)::text`,
        'totalAllocated',
      )
      .where('partner."userId" = :userId', { userId })
      .andWhere('partner."isActive" = true');

    if (partnerFilter) {
      qb.andWhere('partner."id" IN (:...partnerIds)', {
        partnerIds: dto.partnerIds,
      });
    }

    const rows = await qb.getRawMany<{
      partnerId: string;
      totalAccrued: string;
      totalAllocated: string;
    }>();

    const toCreate: PaymentEntity[] = [];
    let skipped = 0;
    for (const row of rows) {
      const unallocated =
        parseFloat(row.totalAccrued) - parseFloat(row.totalAllocated);
      if (unallocated <= minAmount) {
        skipped++;
        continue;
      }
      toCreate.push(
        this.paymentsRepository.create({
          userId,
          partnerId: row.partnerId,
          amount: unallocated.toFixed(6),
          status: 'pending',
          reference: dto.reference ?? null,
          periodStart: dto.periodStart,
          periodEnd: dto.periodEnd,
        }),
      );
    }

    const saved =
      toCreate.length > 0 ? await this.paymentsRepository.save(toCreate) : [];
    const totalAmount = saved
      .reduce((acc, p) => acc + parseFloat(p.amount), 0)
      .toFixed(6);

    return {
      created: saved.length,
      totalAmount,
      skippedPartners: skipped,
      paymentIds: saved.map((p) => p.id),
    };
  }

  async getPartnerBalance(
    userId: string,
    partnerId: string,
  ): Promise<PartnerBalanceDto> {
    const partner = await this.partnersService.findOneOrFail(userId, partnerId);

    const accrualResult = await this.paymentsRepository.manager
      .getRepository('conversion_events')
      .createQueryBuilder('ce')
      .select(
        'COALESCE(SUM(ce."accrualAmount"::numeric), 0)::text',
        'totalAccrued',
      )
      .where('ce."userId" = :userId AND ce."partnerId" = :partnerId', {
        userId,
        partnerId,
      })
      .getRawOne<{ totalAccrued: string }>();

    const paymentResult = await this.paymentsRepository
      .createQueryBuilder('p')
      .select(
        `COALESCE(SUM(CASE WHEN p."status" = 'completed' THEN p."amount"::numeric ELSE 0 END), 0)::text`,
        'totalPaid',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN p."status" = 'pending' THEN p."amount"::numeric ELSE 0 END), 0)::text`,
        'pendingPayments',
      )
      .where('p."userId" = :userId AND p."partnerId" = :partnerId', {
        userId,
        partnerId,
      })
      .getRawOne<{ totalPaid: string; pendingPayments: string }>();

    const totalAccrued = accrualResult?.totalAccrued ?? '0';
    const totalPaid = paymentResult?.totalPaid ?? '0';
    const pendingPayments = paymentResult?.pendingPayments ?? '0';
    const balance = (parseFloat(totalAccrued) - parseFloat(totalPaid)).toFixed(
      6,
    );

    return {
      partnerId: partner.id,
      partnerName: partner.name,
      partnerCode: partner.code,
      totalAccrued,
      totalPaid,
      balance,
      pendingPayments,
    };
  }
}
