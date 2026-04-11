import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserDto } from './dto/responses/user.dto';
import type { RequestUser } from '../../common/interfaces/authenticated-request.interface';

@Controller('users')
@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('self')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, type: UserDto })
  async self(@GetUser() user: RequestUser): Promise<UserDto> {
    const entity = await this.usersService.self(user);
    return UserDto.fromEntity(entity);
  }
}
