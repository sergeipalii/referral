import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
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
import { ConversionsQueryDto } from './dto/requests/conversions-query.dto';
import { TrackConversionDto } from './dto/requests/track-conversion.dto';
import { ConversionEventDto } from './dto/responses/conversion-event.dto';
import { TrackResultDto } from './dto/responses/track-result.dto';
import { PartnerSummaryDto } from './dto/responses/partner-summary.dto';
import { PaginatedResponseDto } from '../../common/dto/pagination-meta.dto';

@ApiTags('conversions')
@Controller('conversions')
export class ConversionsController {
  constructor(private readonly conversionsService: ConversionsService) {}

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
  track(
    @GetUser('id') userId: string,
    @Body() dto: TrackConversionDto,
  ): Promise<TrackResultDto> {
    return this.conversionsService.track(userId, dto);
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
