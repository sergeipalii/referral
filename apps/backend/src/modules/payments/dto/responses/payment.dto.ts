import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { PaymentStatus } from '../../entities/payment.entity';
import { PaymentEntity } from '../../entities/payment.entity';

export class PaymentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  partnerId: string;

  @ApiProperty()
  amount: string;

  @ApiProperty({ enum: ['pending', 'completed', 'cancelled'] })
  status: PaymentStatus;

  @ApiPropertyOptional()
  reference: string | null;

  @ApiPropertyOptional()
  notes: string | null;

  @ApiPropertyOptional()
  periodStart: string | null;

  @ApiPropertyOptional()
  periodEnd: string | null;

  @ApiPropertyOptional()
  paidAt: Date | null;

  @ApiPropertyOptional()
  metadata: Record<string, any> | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: PaymentEntity): PaymentDto {
    const dto = new PaymentDto();
    dto.id = entity.id;
    dto.userId = entity.userId;
    dto.partnerId = entity.partnerId;
    dto.amount = entity.amount;
    dto.status = entity.status;
    dto.reference = entity.reference;
    dto.notes = entity.notes;
    dto.periodStart = entity.periodStart;
    dto.periodEnd = entity.periodEnd;
    dto.paidAt = entity.paidAt;
    dto.metadata = entity.metadata;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
