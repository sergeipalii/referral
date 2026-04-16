import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import {
  AccrualRuleEntity,
  isRecurringRuleType,
  type RuleType,
} from './entities/accrual-rule.entity';
import { BillingService } from '../billing/billing.service';
import { hasCapability, smallestPlanWith } from '../billing/plans';
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
    // forwardRef: BillingModule consumes accrual-rules data indirectly (via
    // ConversionsModule for accrual computation); we consume BillingService
    // here to gate recurring rule creation. Either direction would trigger
    // the Nest cycle detector without forwardRef on this side.
    @Inject(forwardRef(() => BillingService))
    private readonly billingService: BillingService,
  ) {}

  /**
   * Recurring rules can only be created/updated on plans that include the
   * `recurringRules` capability. We can't hang a static decorator on the
   * route — the check is input-dependent — so do it here before writing.
   */
  private async assertPlanAllowsRuleType(
    userId: string,
    ruleType: RuleType | undefined,
  ): Promise<void> {
    if (!ruleType || !isRecurringRuleType(ruleType)) return;
    const sub = await this.billingService.getSubscriptionEntity(userId);
    if (!hasCapability(sub.planKey, 'recurringRules')) {
      throw new HttpException(
        {
          error: 'plan_limit',
          reason: 'capability',
          capability: 'recurringRules',
          currentPlan: sub.planKey,
          requiredPlan: smallestPlanWith('recurringRules'),
          message: 'Recurring rules require a plan with recurringRules enabled',
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  }

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
    await this.assertPlanAllowsRuleType(userId, dto.ruleType);
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
    // Use the effective new ruleType if the client is changing it; otherwise
    // re-check against the existing one (the plan could have been downgraded
    // since the rule was created — don't silently re-save a now-gated rule).
    await this.assertPlanAllowsRuleType(userId, dto.ruleType ?? rule.ruleType);
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
