import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AnalyticsConfigService } from './analytics-config.service';
import { AnalyticsSyncService } from './analytics-sync.service';
import { UpsertIntegrationDto } from './dto/requests/upsert-integration.dto';
import { TriggerSyncDto } from './dto/requests/trigger-sync.dto';
import { AnalyticsIntegrationDto } from './dto/responses/analytics-integration.dto';
import { AnalyticsSyncJobDto } from './dto/responses/analytics-sync-job.dto';
import { PaginatedResponseDto } from '../../common/dto/pagination-meta.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { StandardResponseDto } from '../../common/dto/standard-response.dto';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsConfigService: AnalyticsConfigService,
    private readonly analyticsSyncService: AnalyticsSyncService,
  ) {}

  @Get('integration')
  @ApiOperation({ summary: 'Get analytics integration config' })
  @ApiResponse({ status: 200, type: AnalyticsIntegrationDto })
  async getIntegration(
    @GetUser('id') userId: string,
  ): Promise<AnalyticsIntegrationDto> {
    const integration = await this.analyticsConfigService.findByUserIdOrFail(userId);
    return AnalyticsIntegrationDto.fromEntity(integration);
  }

  @Put('integration')
  @ApiOperation({ summary: 'Create or update analytics integration' })
  @ApiResponse({ status: 200, type: AnalyticsIntegrationDto })
  upsertIntegration(
    @GetUser('id') userId: string,
    @Body() dto: UpsertIntegrationDto,
  ): Promise<AnalyticsIntegrationDto> {
    return this.analyticsConfigService.upsert(userId, dto);
  }

  @Delete('integration')
  @ApiOperation({ summary: 'Remove analytics integration' })
  @ApiResponse({ status: 200, type: StandardResponseDto })
  removeIntegration(
    @GetUser('id') userId: string,
  ): Promise<StandardResponseDto> {
    return this.analyticsConfigService.remove(userId);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Trigger a manual sync from the analytics provider' })
  @ApiResponse({ status: 201, type: AnalyticsSyncJobDto })
  triggerSync(
    @GetUser('id') userId: string,
    @Body() dto: TriggerSyncDto,
  ): Promise<AnalyticsSyncJobDto> {
    return this.analyticsSyncService.triggerSync(userId, dto);
  }

  @Get('sync')
  @ApiOperation({ summary: 'List sync jobs' })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  findSyncJobs(
    @GetUser('id') userId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<AnalyticsSyncJobDto>> {
    return this.analyticsSyncService.findSyncJobs(userId, query);
  }

  @Get('sync/:id')
  @ApiOperation({ summary: 'Get sync job by ID' })
  @ApiResponse({ status: 200, type: AnalyticsSyncJobDto })
  findSyncJob(
    @GetUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AnalyticsSyncJobDto> {
    return this.analyticsSyncService.findSyncJob(userId, id);
  }
}
