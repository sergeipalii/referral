import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiSecurity,
} from '@nestjs/swagger';
import { HmacAuthGuard } from '../auth/guards/hmac-auth.guard';
import { CombinedAuthGuard } from '../auth/guards/combined-auth.guard';
import { ApiKeyThrottleGuard } from '../../common/guards/api-key-throttle.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { ConversionsService } from './conversions.service';
import { IdempotencyService } from './idempotency.service';
import { PartnersService } from '../partners/partners.service';
import { AccrualRulesService } from '../accrual-rules/accrual-rules.service';
import { ConversionsQueryDto } from './dto/requests/conversions-query.dto';
import { TrackConversionDto } from './dto/requests/track-conversion.dto';
import { ConversionEventDto } from './dto/responses/conversion-event.dto';
import { TrackResultDto } from './dto/responses/track-result.dto';
import { PartnerSummaryDto } from './dto/responses/partner-summary.dto';
import { PaginatedResponseDto } from '../../common/dto/pagination-meta.dto';

@ApiTags('conversions')
@Controller('conversions')
export class ConversionsController {
  constructor(
    private readonly conversionsService: ConversionsService,
    private readonly idempotencyService: IdempotencyService,
    private readonly partnersService: PartnersService,
    private readonly accrualRulesService: AccrualRulesService,
  ) {}

  @Post('track')
  @UseGuards(HmacAuthGuard, ApiKeyThrottleGuard)
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Track a conversion event' })
  @ApiHeader({ name: 'X-API-Key', required: true })
  @ApiHeader({
    name: 'X-Signature',
    required: false,
    description: 'HMAC-SHA256 signature: sha256=<hex>',
  })
  @ApiResponse({ status: 201, type: TrackResultDto })
  async track(
    @GetUser('id') userId: string,
    @Body() dto: TrackConversionDto,
  ): Promise<TrackResultDto> {
    if (dto.idempotencyKey) {
      const cached = await this.idempotencyService.check(
        userId,
        dto.idempotencyKey,
      );
      if (cached) return cached as TrackResultDto;
    }

    const partner = await this.partnersService.findByCode(
      userId,
      dto.partnerCode,
    );
    if (!partner || !partner.isActive) {
      throw new NotFoundException(
        `Partner with code "${dto.partnerCode}" not found`,
      );
    }

    const eventDate = dto.eventDate ?? new Date().toISOString().slice(0, 10);
    const count = dto.count ?? 1;
    const revenue = dto.revenue ?? 0;

    const rule = await this.accrualRulesService.findApplicableRule(
      userId,
      partner.id,
      dto.eventName,
    );

    let accrualAmount = 0;
    if (rule) {
      if (rule.ruleType === 'fixed') {
        accrualAmount = parseFloat(rule.amount) * count;
      } else if (rule.ruleType === 'percentage') {
        accrualAmount = (parseFloat(rule.amount) / 100) * revenue;
      }
    }

    await this.conversionsService.addToBucket({
      userId,
      partnerId: partner.id,
      eventName: dto.eventName,
      eventDate,
      count,
      revenueSum: revenue,
      accrualAmount,
      accrualRuleId: rule?.id ?? null,
    });

    const result: TrackResultDto = {
      success: true,
      partnerId: partner.id,
      eventName: dto.eventName,
      eventDate,
      count,
      revenue,
      accrualAmount: accrualAmount.toFixed(6),
      accrualRuleId: rule?.id ?? null,
    };

    if (dto.idempotencyKey) {
      await this.idempotencyService.store(userId, dto.idempotencyKey, result);
    }

    return result;
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(CombinedAuthGuard)
  @ApiOperation({ summary: 'List conversion events' })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  findAll(
    @GetUser('id') userId: string,
    @Query() query: ConversionsQueryDto,
  ): Promise<PaginatedResponseDto<ConversionEventDto>> {
    return this.conversionsService.findAll(userId, query);
  }

  @Get('summary')
  @ApiBearerAuth()
  @UseGuards(CombinedAuthGuard)
  @ApiOperation({ summary: 'Get per-partner accrual summary' })
  @ApiResponse({ status: 200, type: [PartnerSummaryDto] })
  getSummary(
    @GetUser('id') userId: string,
    @Query('partnerId') partnerId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<PartnerSummaryDto[]> {
    return this.conversionsService.getPartnerSummaries(
      userId,
      dateFrom,
      dateTo,
    );
  }

  @Get('partners/:partnerId')
  @ApiBearerAuth()
  @UseGuards(CombinedAuthGuard)
  @ApiOperation({ summary: 'List conversion events for a specific partner' })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  findByPartner(
    @GetUser('id') userId: string,
    @Param('partnerId', ParseUUIDPipe) partnerId: string,
    @Query() query: ConversionsQueryDto,
  ): Promise<PaginatedResponseDto<ConversionEventDto>> {
    return this.conversionsService.findByPartner(userId, partnerId, query);
  }
}
