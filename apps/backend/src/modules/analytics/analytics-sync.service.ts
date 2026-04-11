import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { AnalyticsSyncJobEntity } from './entities/analytics-sync-job.entity';
import { AnalyticsConfigService } from './analytics-config.service';
import { AnalyticsProviderFactory } from './providers/analytics-provider.factory';
import { PartnersService } from '../partners/partners.service';
import { AccrualRulesService } from '../accrual-rules/accrual-rules.service';
import { ConversionsService } from '../conversions/conversions.service';
import { TriggerSyncDto } from './dto/requests/trigger-sync.dto';
import { AnalyticsSyncJobDto } from './dto/responses/analytics-sync-job.dto';
import {
  PaginatedResponseDto,
  PaginationMetaDto,
} from '../../common/dto/pagination-meta.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AnalyticsEvent } from './providers/analytics-provider.interface';

@Injectable()
export class AnalyticsSyncService {
  private readonly logger = new Logger(AnalyticsSyncService.name);

  constructor(
    @InjectRepository(AnalyticsSyncJobEntity)
    private readonly syncJobRepository: Repository<AnalyticsSyncJobEntity>,
    private readonly analyticsConfigService: AnalyticsConfigService,
    private readonly analyticsProviderFactory: AnalyticsProviderFactory,
    private readonly partnersService: PartnersService,
    private readonly accrualRulesService: AccrualRulesService,
    private readonly conversionsService: ConversionsService,
    private readonly configService: ConfigService,
  ) {}

  /** Daily cron: sync all active integrations at 02:00 UTC */
  @Cron('0 2 * * *')
  async runDailySync(): Promise<void> {
    if (this.configService.get<boolean>('cron.disabled')) return;

    const integrations = await this.analyticsConfigService.findAllActive();
    this.logger.log(`Daily sync: processing ${integrations.length} integration(s)`);

    for (const integration of integrations) {
      const rangeEnd = new Date();
      const rangeStart = integration.lastSyncedAt
        ? new Date(integration.lastSyncedAt)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      await this.syncForUser(integration.userId, { }).catch((err: Error) =>
        this.logger.error(
          `Daily sync failed for userId ${integration.userId}: ${err.message}`,
          err.stack,
        ),
      );
    }
  }

  async triggerSync(userId: string, dto: TriggerSyncDto): Promise<AnalyticsSyncJobDto> {
    const job = await this.syncForUser(userId, dto);
    return AnalyticsSyncJobDto.fromEntity(job);
  }

  async findSyncJobs(
    userId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<AnalyticsSyncJobDto>> {
    const { page = 1, limit = 20 } = query;
    const offset = (page - 1) * limit;

    const [jobs, totalItems] = await this.syncJobRepository.findAndCount({
      where: { userId },
      skip: offset,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const totalPages = Math.ceil(totalItems / limit);
    const meta: PaginationMetaDto = {
      page,
      limit,
      totalItems,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    };

    return { data: jobs.map(AnalyticsSyncJobDto.fromEntity), meta };
  }

  async findSyncJob(userId: string, id: string): Promise<AnalyticsSyncJobDto> {
    const job = await this.syncJobRepository.findOne({ where: { id, userId } });
    if (!job) {
      throw new ConflictException(`Sync job ${id} not found`);
    }
    return AnalyticsSyncJobDto.fromEntity(job);
  }

  // ─── Private sync orchestration ───────────────────────────────────────────

  private async syncForUser(userId: string, dto: TriggerSyncDto): Promise<AnalyticsSyncJobEntity> {
    const integration = await this.analyticsConfigService.findByUserIdOrFail(userId);

    // Prevent concurrent runs
    const running = await this.syncJobRepository.findOne({
      where: { userId, status: 'running' },
    });
    if (running) {
      return running;
    }

    const rangeEnd = dto.rangeEnd ? new Date(dto.rangeEnd) : new Date();
    const rangeStart = dto.rangeStart
      ? new Date(dto.rangeStart)
      : integration.lastSyncedAt
        ? new Date(integration.lastSyncedAt)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const job = await this.syncJobRepository.save(
      this.syncJobRepository.create({
        userId,
        integrationId: integration.id,
        status: 'running',
        rangeStart,
        rangeEnd,
        rawEventsCount: 0,
        conversionsCount: 0,
      }),
    );

    // Run async — do not await, return job immediately
    this.runSync(job, integration.encryptedConfig, integration.utmParameterName, integration.providerType, rangeEnd).catch(
      (err: Error) =>
        this.logger.error(`Sync job ${job.id} failed unexpectedly`, err.stack),
    );

    return job;
  }

  private async runSync(
    job: AnalyticsSyncJobEntity,
    encryptedConfig: string,
    utmParamName: string,
    providerType: string,
    rangeEnd: Date,
  ): Promise<void> {
    const encryptionKey = this.configService.get<string>('encryption.key')!;

    try {
      const provider = this.analyticsProviderFactory.getProvider(providerType);
      const rawEvents = await provider.fetchEvents(
        encryptedConfig,
        encryptionKey,
        utmParamName,
        job.rangeStart,
        job.rangeEnd,
      );

      job.rawEventsCount = rawEvents.length;

      // Delete existing data for the period (idempotent)
      const dateFrom = job.rangeStart.toISOString().slice(0, 10);
      const dateTo = job.rangeEnd.toISOString().slice(0, 10);
      await this.conversionsService.deleteForRange(job.userId, dateFrom, dateTo);

      const conversionsCount = await this.processEvents(job, rawEvents);

      // Advance watermark
      await this.syncJobRepository.manager
        .getRepository('analytics_integrations')
        .update({ userId: job.userId }, { lastSyncedAt: rangeEnd });

      job.conversionsCount = conversionsCount;
      job.status = 'completed';
      job.completedAt = new Date();
    } catch (err: any) {
      job.status = 'failed';
      job.errorMessage = err?.message ?? 'Unknown error';
      job.completedAt = new Date();
      this.logger.error(`Sync job ${job.id} failed: ${job.errorMessage}`);
    }

    await this.syncJobRepository.save(job);
  }

  private async processEvents(
    job: AnalyticsSyncJobEntity,
    events: AnalyticsEvent[],
  ): Promise<number> {
    // Group by (partnerCode, eventName, eventDate)
    type BucketKey = string;
    const buckets = new Map<BucketKey, { count: number; revenueSum: number; partnerCode: string; eventName: string; eventDate: string }>();

    for (const event of events) {
      const key: BucketKey = `${event.partnerCode}::${event.eventName}::${event.eventDate}`;
      const existing = buckets.get(key);
      if (existing) {
        existing.count += 1;
        existing.revenueSum += event.revenueAmount ?? 0;
      } else {
        buckets.set(key, {
          count: 1,
          revenueSum: event.revenueAmount ?? 0,
          partnerCode: event.partnerCode,
          eventName: event.eventName,
          eventDate: event.eventDate,
        });
      }
    }

    let conversionsCount = 0;

    for (const bucket of buckets.values()) {
      const partner = await this.partnersService.findByCode(job.userId, bucket.partnerCode);
      if (!partner || !partner.isActive) continue;

      const rule = await this.accrualRulesService.findApplicableRule(
        job.userId,
        partner.id,
        bucket.eventName,
      );
      if (!rule) continue;

      let accrualAmount = 0;
      if (rule.ruleType === 'fixed') {
        accrualAmount = parseFloat(rule.amount) * bucket.count;
      } else {
        accrualAmount = (parseFloat(rule.amount) / 100) * bucket.revenueSum;
      }

      await this.conversionsService.upsertBucket({
        userId: job.userId,
        partnerId: partner.id,
        eventName: bucket.eventName,
        eventDate: bucket.eventDate,
        count: bucket.count,
        revenueSum: bucket.revenueSum,
        accrualAmount,
        accrualRuleId: rule.id,
        syncJobId: job.id,
      });

      conversionsCount++;
    }

    return conversionsCount;
  }
}
