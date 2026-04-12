import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { PaymentEntity } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/requests/create-payment.dto';
import { UpdatePaymentDto } from './dto/requests/update-payment.dto';
import { PaymentsQueryDto } from './dto/requests/payments-query.dto';
import { PaymentDto } from './dto/responses/payment.dto';
import { PartnerBalanceDto } from './dto/responses/partner-balance.dto';
import {
  PaginatedResponseDto,
  PaginationMetaDto,
} from '../../common/dto/pagination-meta.dto';
import { StandardResponseDto } from '../../common/dto/standard-response.dto';
import { PartnersService } from '../partners/partners.service';

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
