import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumberString,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import type { RuleType } from '../../entities/accrual-rule.entity';

export class UpdateAccrualRuleDto {
  @ApiPropertyOptional({ example: 'subscription_start' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  eventName?: string;

  @ApiPropertyOptional({ enum: ['fixed', 'percentage'] })
  @IsOptional()
  @IsEnum(['fixed', 'percentage'])
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
