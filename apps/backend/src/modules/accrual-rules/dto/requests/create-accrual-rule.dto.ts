import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumberString,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import type { RuleType } from '../../entities/accrual-rule.entity';

const RULE_TYPES = [
  'fixed',
  'percentage',
  'recurring_fixed',
  'recurring_percentage',
] as const;

export class CreateAccrualRuleDto {
  @ApiPropertyOptional({
    description:
      'Partner ID. If omitted, rule applies to all partners (global rule)',
  })
  @IsOptional()
  @IsUUID()
  partnerId?: string;

  @ApiProperty({ example: 'purchase', description: 'Amplitude event name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  eventName: string;

  @ApiProperty({
    enum: RULE_TYPES,
    example: 'fixed',
    description:
      'fixed/percentage pay once per event; recurring_* pay on every matching event while the attribution window is open',
  })
  @IsEnum(RULE_TYPES)
  ruleType: RuleType;

  @ApiProperty({
    example: '10.000000',
    description: 'Fixed amount in currency units, or percentage (10.5 = 10.5%)',
  })
  @IsNumberString()
  amount: string;

  @ApiPropertyOptional({
    example: 'revenue',
    description:
      'Event property name containing revenue value (used with ruleType=percentage or recurring_percentage)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  revenueProperty?: string;

  @ApiPropertyOptional({
    example: 12,
    description:
      'Recurring window in months. null/omitted = pay forever. Only meaningful for recurring_* rules — ignored otherwise.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  recurrenceDurationMonths?: number | null;
}
