import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConversionEventEntity } from '../../entities/conversion-event.entity';

export class ConversionEventDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  partnerId: string;

  @ApiProperty()
  eventName: string;

  @ApiProperty()
  eventDate: string;

  @ApiProperty()
  count: number;

  @ApiProperty()
  revenueSum: string;

  @ApiProperty()
  accrualAmount: string;

  @ApiPropertyOptional()
  accrualRuleId: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: ConversionEventEntity): ConversionEventDto {
    const dto = new ConversionEventDto();
    dto.id = entity.id;
    dto.userId = entity.userId;
    dto.partnerId = entity.partnerId;
    dto.eventName = entity.eventName;
    dto.eventDate = entity.eventDate;
    dto.count = entity.count;
    dto.revenueSum = entity.revenueSum;
    dto.accrualAmount = entity.accrualAmount;
    dto.accrualRuleId = entity.accrualRuleId;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
