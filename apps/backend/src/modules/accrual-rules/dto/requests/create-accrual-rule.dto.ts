import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumberString,
  MaxLength,
} from 'class-validator';
import type { RuleType } from '../../entities/accrual-rule.entity';

export class CreateAccrualRuleDto {
  @ApiPropertyOptional({
    description: 'Partner ID. If omitted, rule applies to all partners (global rule)',
  })
  @IsOptional()
  @IsUUID()
  partnerId?: string;

  @ApiProperty({ example: 'purchase', description: 'Amplitude event name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  eventName: string;

  @ApiProperty({ enum: ['fixed', 'percentage'], example: 'fixed' })
  @IsEnum(['fixed', 'percentage'])
  ruleType: RuleType;

  @ApiProperty({
    example: '10.000000',
    description: 'Fixed amount in currency units, or percentage (10.5 = 10.5%)',
  })
  @IsNumberString()
  amount: string;

  @ApiPropertyOptional({
    example: 'revenue',
    description: 'Event property name containing revenue value (used with ruleType=percentage)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  revenueProperty?: string;
}
