import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { AccrualRuleEntity } from './entities/accrual-rule.entity';
import { CreateAccrualRuleDto } from './dto/requests/create-accrual-rule.dto';
import { UpdateAccrualRuleDto } from './dto/requests/update-accrual-rule.dto';
import { AccrualRulesQueryDto } from './dto/requests/accrual-rules-query.dto';
import { AccrualRuleDto } from './dto/responses/accrual-rule.dto';
import {
  PaginatedResponseDto,
  PaginationMetaDto,
} from '../../common/dto/pagination-meta.dto';
import { StandardResponseDto } from '../../common/dto/standard-response.dto';

@Injectable()
export class AccrualRulesService {
  constructor(
    @InjectRepository(AccrualRuleEntity)
    private readonly rulesRepository: Repository<AccrualRuleEntity>,
  ) {}

  async findAll(
    userId: string,
    query: AccrualRulesQueryDto,
  ): Promise<PaginatedResponseDto<AccrualRuleDto>> {
    const { page = 1, limit = 20, partnerId, eventName, isActive } = query;
    const offset = (page - 1) * limit;

    const where: Record<string, any> = { userId };
    if (partnerId !== undefined) where.partnerId = partnerId;
    if (eventName !== undefined) where.eventName = eventName;
    if (isActive !== undefined) where.isActive = isActive;

    const [rules, totalItems] = await this.rulesRepository.findAndCount({
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

    return { data: rules.map(AccrualRuleDto.fromEntity), meta };
  }

  async findOneOrFail(userId: string, id: string): Promise<AccrualRuleEntity> {
    const rule = await this.rulesRepository.findOne({ where: { id, userId } });
    if (!rule) {
      throw new NotFoundException(`Accrual rule with ID ${id} not found`);
    }
    return rule;
  }

  /**
   * Find the applicable rule for a given partner+event.
   * Partner-specific rule takes precedence over global rule.
   */
  async findApplicableRule(
    userId: string,
    partnerId: string,
    eventName: string,
  ): Promise<AccrualRuleEntity | null> {
    const partnerRule = await this.rulesRepository.findOne({
      where: { userId, partnerId, eventName, isActive: true },
    });
    if (partnerRule) return partnerRule;

    return this.rulesRepository.findOne({
      where: { userId, partnerId: IsNull(), eventName, isActive: true },
    });
  }

  async create(
    userId: string,
    dto: CreateAccrualRuleDto,
  ): Promise<AccrualRuleDto> {
    const rule = this.rulesRepository.create({
      ...dto,
      userId,
      partnerId: dto.partnerId ?? null,
      revenueProperty: dto.revenueProperty ?? null,
    });
    const saved = await this.rulesRepository.save(rule);
    return AccrualRuleDto.fromEntity(saved);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateAccrualRuleDto,
  ): Promise<AccrualRuleDto> {
    const rule = await this.findOneOrFail(userId, id);
    Object.assign(rule, dto);
    const saved = await this.rulesRepository.save(rule);
    return AccrualRuleDto.fromEntity(saved);
  }

  async remove(userId: string, id: string): Promise<StandardResponseDto> {
    await this.findOneOrFail(userId, id);
    await this.rulesRepository.delete({ id, userId });
    return { success: true, message: 'Accrual rule deleted successfully' };
  }
}
