import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { PartnerAuthService } from './partner-auth.service';
import {
  AcceptPartnerInvitationDto,
  CreatePartnerInvitationDto,
  PartnerAuthTokensDto,
  PartnerInvitationCreatedDto,
  PartnerLoginDto,
  PartnerRefreshTokenDto,
} from './dto/partner-auth.dto';

@ApiTags('partner-auth')
@Controller('partner-auth')
export class PartnerAuthController {
  constructor(private readonly partnerAuthService: PartnerAuthService) {}

  // ─── Owner endpoints (JWT of the tenant owner) ──────────────────────────

  @Post('invitations')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Generate an invitation for a partner. Returns a one-time token the owner forwards to the partner (e.g. via their own email or messenger).',
  })
  @ApiResponse({ status: 201, type: PartnerInvitationCreatedDto })
  createInvitation(
    @GetUser('id') ownerUserId: string,
    @Body() dto: CreatePartnerInvitationDto,
  ): Promise<PartnerInvitationCreatedDto> {
    return this.partnerAuthService.createInvitation(
      ownerUserId,
      dto.partnerId,
      dto.email,
    );
  }

  @Delete('invitations/:partnerId')
  @HttpCode(204)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Revoke a pending invitation for a partner' })
  @ApiResponse({ status: 204 })
  async revokeInvitation(
    @GetUser('id') ownerUserId: string,
    @Param('partnerId', ParseUUIDPipe) partnerId: string,
  ): Promise<void> {
    await this.partnerAuthService.revokeInvitation(ownerUserId, partnerId);
  }

  // ─── Partner endpoints (public) ─────────────────────────────────────────

  @Post('accept-invite')
  @ApiOperation({
    summary:
      'Set a password via an invitation token. Consumes the token and returns a fresh partner token pair.',
  })
  @ApiResponse({ status: 201, type: PartnerAuthTokensDto })
  acceptInvitation(
    @Body() dto: AcceptPartnerInvitationDto,
  ): Promise<PartnerAuthTokensDto> {
    return this.partnerAuthService.acceptInvitation(dto.token, dto.password);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Partner portal login' })
  @ApiResponse({ status: 200, type: PartnerAuthTokensDto })
  login(@Body() dto: PartnerLoginDto): Promise<PartnerAuthTokensDto> {
    return this.partnerAuthService.login(dto.email, dto.password);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Exchange a refresh token for a fresh pair' })
  @ApiResponse({ status: 200, type: PartnerAuthTokensDto })
  refresh(@Body() dto: PartnerRefreshTokenDto): Promise<PartnerAuthTokensDto> {
    return this.partnerAuthService.refresh(dto.refreshToken);
  }
}
