import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { RuleType } from '../../entities/accrual-rule.entity';
import { AccrualRuleEntity } from '../../entities/accrual-rule.entity';

export class AccrualRuleDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiPropertyOptional({ description: 'null means global rule' })
  partnerId: string | null;

  @ApiProperty()
  eventName: string;

  @ApiProperty({ enum: ['fixed', 'percentage'] })
  ruleType: RuleType;

  @ApiProperty()
  amount: string;

  @ApiPropertyOptional()
  revenueProperty: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: AccrualRuleEntity): AccrualRuleDto {
    const dto = new AccrualRuleDto();
    dto.id = entity.id;
    dto.userId = entity.userId;
    dto.partnerId = entity.partnerId;
    dto.eventName = entity.eventName;
    dto.ruleType = entity.ruleType;
    dto.amount = entity.amount;
    dto.revenueProperty = entity.revenueProperty;
    dto.isActive = entity.isActive;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
