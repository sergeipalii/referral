import {
  Controller,
  Get,
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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { ConversionsService } from './conversions.service';
import { ConversionsQueryDto } from './dto/requests/conversions-query.dto';
import { ConversionEventDto } from './dto/responses/conversion-event.dto';
import { PartnerSummaryDto } from './dto/responses/partner-summary.dto';
import { PaginatedResponseDto } from '../../common/dto/pagination-meta.dto';

@ApiTags('conversions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversions')
export class ConversionsController {
  constructor(private readonly conversionsService: ConversionsService) {}

  @Get()
  @ApiOperation({ summary: 'List conversion events' })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  findAll(
    @GetUser('id') userId: string,
    @Query() query: ConversionsQueryDto,
  ): Promise<PaginatedResponseDto<ConversionEventDto>> {
    return this.conversionsService.findAll(userId, query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get per-partner accrual summary' })
  @ApiResponse({ status: 200, type: [PartnerSummaryDto] })
  getSummary(
    @GetUser('id') userId: string,
    @Query('partnerId') partnerId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<PartnerSummaryDto[]> {
    return this.conversionsService.getPartnerSummaries(userId, dateFrom, dateTo);
  }

  @Get('partners/:partnerId')
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
