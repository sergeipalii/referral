import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumberString,
  IsInt,
  Min,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import type { RuleType } from '../../entities/accrual-rule.entity';

const RULE_TYPES = [
  'fixed',
  'percentage',
  'recurring_fixed',
  'recurring_percentage',
] as const;

export class UpdateAccrualRuleDto {
  @ApiPropertyOptional({ example: 'subscription_start' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  eventName?: string;

  @ApiPropertyOptional({ enum: RULE_TYPES })
  @IsOptional()
  @IsEnum(RULE_TYPES)
  ruleType?: RuleType;

  @ApiPropertyOptional({ example: '15.000000' })
  @IsOptional()
  @IsNumberString()
  amount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  revenueProperty?: string;

  @ApiPropertyOptional({
    example: 12,
    description:
      'Recurring window in months. null = pay forever. Only applies to recurring_* rule types.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  recurrenceDurationMonths?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
