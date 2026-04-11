import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { AnalyticsIntegrationEntity } from './entities/analytics-integration.entity';
import { AnalyticsSyncJobEntity } from './entities/analytics-sync-job.entity';
import { AnalyticsConfigService } from './analytics-config.service';
import { AnalyticsSyncService } from './analytics-sync.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsProviderFactory } from './providers/analytics-provider.factory';
import { AmplitudeProvider } from './providers/amplitude/amplitude.provider';
import { AmplitudeApiClient } from './providers/amplitude/amplitude-api.client';
import { PartnersModule } from '../partners/partners.module';
import { AccrualRulesModule } from '../accrual-rules/accrual-rules.module';
import { ConversionsModule } from '../conversions/conversions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AnalyticsIntegrationEntity, AnalyticsSyncJobEntity]),
    HttpModule,
    PartnersModule,
    AccrualRulesModule,
    ConversionsModule,
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsConfigService,
    AnalyticsSyncService,
    AnalyticsProviderFactory,
    AmplitudeProvider,
    AmplitudeApiClient,
  ],
  exports: [AnalyticsConfigService],
})
export class AnalyticsModule {}
