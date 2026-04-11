import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartnerEntity } from '../../entities/partner.entity';

export class PartnerDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiPropertyOptional()
  metadata: Record<string, any> | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: PartnerEntity): PartnerDto {
    const dto = new PartnerDto();
    dto.id = entity.id;
    dto.userId = entity.userId;
    dto.code = entity.code;
    dto.name = entity.name;
    dto.description = entity.description;
    dto.metadata = entity.metadata;
    dto.isActive = entity.isActive;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
