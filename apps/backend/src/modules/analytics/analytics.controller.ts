import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AnalyticsService } from './analytics.service';
import { BillingService } from '../billing/billing.service';
import {
  AnalyticsQueryDto,
  TopPartnersQueryDto,
} from './dto/analytics-query.dto';
import {
  EventBreakdownDto,
  KpiDto,
  TimeseriesPointDto,
  TopPartnerDto,
} from './dto/analytics-response.dto';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly billingService: BillingService,
  ) {}

  @Get('kpis')
  @ApiOperation({ summary: 'KPI summary with trend vs previous period' })
  @ApiResponse({ status: 200, type: KpiDto })
  async getKpis(
    @GetUser('id') userId: string,
    @Query() query: AnalyticsQueryDto,
  ): Promise<KpiDto> {
    const cap = await this.billingService.effectiveDateTo(userId, query.dateTo);
    return this.analyticsService.getKpis(userId, query.dateFrom, cap.dateTo);
  }

  @Get('timeseries')
  @ApiOperation({
    summary: 'Daily conversions/revenue/accrual for charting',
  })
  @ApiResponse({ status: 200, type: [TimeseriesPointDto] })
  async getTimeseries(
    @GetUser('id') userId: string,
    @Query() query: AnalyticsQueryDto,
  ): Promise<TimeseriesPointDto[]> {
    const cap = await this.billingService.effectiveDateTo(userId, query.dateTo);
    return this.analyticsService.getTimeseries(
      userId,
      query.dateFrom,
      cap.dateTo,
      query.partnerId,
      query.eventName,
    );
  }

  @Get('top-partners')
  @ApiOperation({ summary: 'Top N partners by conversion count' })
  @ApiResponse({ status: 200, type: [TopPartnerDto] })
  async getTopPartners(
    @GetUser('id') userId: string,
    @Query() query: TopPartnersQueryDto,
  ): Promise<TopPartnerDto[]> {
    const cap = await this.billingService.effectiveDateTo(userId, query.dateTo);
    return this.analyticsService.getTopPartners(
      userId,
      query.limit ?? 10,
      query.dateFrom,
      cap.dateTo,
    );
  }

  @Get('event-breakdown')
  @ApiOperation({ summary: 'Conversion/revenue/accrual breakdown by event name' })
  @ApiResponse({ status: 200, type: [EventBreakdownDto] })
  async getEventBreakdown(
    @GetUser('id') userId: string,
    @Query() query: AnalyticsQueryDto,
  ): Promise<EventBreakdownDto[]> {
    const cap = await this.billingService.effectiveDateTo(userId, query.dateTo);
    return this.analyticsService.getEventBreakdown(
      userId,
      query.dateFrom,
      cap.dateTo,
    );
  }
}
