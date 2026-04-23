import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  CreateApiKeyDto,
  AuthTokensDto,
  ApiKeyCreatedDto,
  ApiKeyDto,
} from './dto/auth.dto';
import { StandardResponseDto } from '../../common/dto/standard-response.dto';
import { PlanLimitGuard } from '../billing/guards/plan-limit.guard';
import { RequireWithinLimit } from '../billing/decorators/plan-gate.decorators';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register a new account' })
  @ApiResponse({ status: 201, type: AuthTokensDto })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  register(@Body() dto: RegisterDto): Promise<AuthTokensDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, type: AuthTokensDto })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  login(@Body() dto: LoginDto): Promise<AuthTokensDto> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, type: AuthTokensDto })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokensDto> {
    return this.authService.refreshToken(dto.refreshToken);
  }

  // ─── API Keys ─────────────────────────────────────────────────────────

  @Post('api-keys')
  @UseGuards(JwtAuthGuard, PlanLimitGuard)
  @RequireWithinLimit('maxApiKeys')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an API key (key is shown only once)' })
  @ApiResponse({ status: 201, type: ApiKeyCreatedDto })
  createApiKey(
    @GetUser('id') userId: string,
    @Body() dto: CreateApiKeyDto,
  ): Promise<ApiKeyCreatedDto> {
    return this.authService.createApiKey(userId, dto);
  }

  @Get('api-keys')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List API keys (without the actual key value)' })
  @ApiResponse({ status: 200, type: [ApiKeyDto] })
  listApiKeys(@GetUser('id') userId: string): Promise<ApiKeyDto[]> {
    return this.authService.listApiKeys(userId);
  }

  @Delete('api-keys/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 200, type: StandardResponseDto })
  async revokeApiKey(
    @GetUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StandardResponseDto> {
    await this.authService.revokeApiKey(userId, id);
    return { success: true, message: 'API key revoked' };
  }
}
