import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserEntity } from '../../entities/user.entity';

export class UserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  name: string | null;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(user: UserEntity): UserDto {
    const dto = new UserDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.name = user.name;
    dto.createdAt = user.createdAt;
    return dto;
  }
}
