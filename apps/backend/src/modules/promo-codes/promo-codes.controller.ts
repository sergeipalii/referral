import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeyAuthGuard } from '../auth/guards/api-key-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { PromoCodesService } from './promo-codes.service';
import {
  CreatePromoCodeDto,
  PromoCodeResponseDto,
  ResolvedPromoCodeDto,
  UpdatePromoCodeDto,
} from './dto/promo-code.dto';

@ApiTags('promo-codes')
@Controller('promo-codes')
export class PromoCodesController {
  constructor(private readonly promoCodesService: PromoCodesService) {}

  // ─── Owner CRUD (JWT auth) ──────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a promo code for a partner' })
  @ApiResponse({ status: 201, type: PromoCodeResponseDto })
  create(
    @GetUser('id') userId: string,
    @Body() dto: CreatePromoCodeDto,
  ): Promise<PromoCodeResponseDto> {
    return this.promoCodesService.create(userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List promo codes (optionally filter by partnerId)',
  })
  @ApiResponse({ status: 200, type: [PromoCodeResponseDto] })
  findAll(
    @GetUser('id') userId: string,
    @Query('partnerId') partnerId?: string,
  ): Promise<PromoCodeResponseDto[]> {
    return this.promoCodesService.findAll(userId, partnerId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update promo code (usageLimit, isActive, metadata)',
  })
  @ApiResponse({ status: 200, type: PromoCodeResponseDto })
  update(
    @GetUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePromoCodeDto,
  ): Promise<PromoCodeResponseDto> {
    return this.promoCodesService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a promo code' })
  async remove(
    @GetUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.promoCodesService.remove(userId, id);
  }

  // ─── Integration: resolve (API key auth) ────────────────────────────────

  @Get('resolve')
  @UseGuards(ApiKeyAuthGuard)
  @ApiSecurity('api-key')
  @ApiOperation({
    summary:
      'Resolve a promo code to a partner (for checkout integrations). Auth via X-API-Key header.',
  })
  @ApiResponse({ status: 200, type: ResolvedPromoCodeDto })
  @ApiResponse({ status: 404, description: 'Code not found or inactive' })
  resolve(
    @GetUser('id') userId: string,
    @Query('code') code: string,
  ): Promise<ResolvedPromoCodeDto> {
    return this.promoCodesService.resolve(userId, code);
  }
}
