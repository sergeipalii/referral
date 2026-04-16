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

  // ─── Account status (for owner-side UI only) ─────────────────────────────
  // These fields expose whether the partner has portal access so the owner
  // can render "invite / pending / accepted" states. No sensitive material
  // (password hash, invitation token) ever leaves the backend.

  @ApiPropertyOptional({ description: 'Login email if the partner was invited' })
  email: string | null;

  @ApiProperty({
    description:
      'True once the partner has accepted the invitation and set a password',
  })
  hasPassword: boolean;

  @ApiPropertyOptional({
    description:
      'Present while an invitation is outstanding; used to detect expired invites on the client',
  })
  invitationExpiresAt: Date | null;

  @ApiPropertyOptional({
    description: 'Last successful portal sign-in (null if never)',
  })
  lastLoginAt: Date | null;

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
    dto.email = entity.email;
    dto.hasPassword = entity.hashedPassword !== null;
    dto.invitationExpiresAt =
      entity.invitationToken !== null ? entity.invitationExpiresAt : null;
    dto.lastLoginAt = entity.lastLoginAt;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
