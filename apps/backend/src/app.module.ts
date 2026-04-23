import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { SentryModule, SentryGlobalFilter } from '@sentry/nestjs/setup';
import configuration from './modules/config/configuration';
import { configValidationSchema } from './modules/config/configuration.schema';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PartnersModule } from './modules/partners/partners.module';
import { PartnerAuthModule } from './modules/partner-auth/partner-auth.module';
import { AccrualRulesModule } from './modules/accrual-rules/accrual-rules.module';
import { ConversionsModule } from './modules/conversions/conversions.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { UserAttributionsModule } from './modules/user-attributions/user-attributions.module';
import { BillingModule } from './modules/billing/billing.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { PromoCodesModule } from './modules/promo-codes/promo-codes.module';
import { ClicksModule } from './modules/clicks/clicks.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: configValidationSchema,
      validationOptions: {
        abortEarly: true,
      },
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60000, limit: 100 }] }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        autoLoadEntities: true,
        synchronize: configService.get('database.synchronize'),
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    PartnersModule,
    PartnerAuthModule,
    AccrualRulesModule,
    UserAttributionsModule,
    ConversionsModule,
    PaymentsModule,
    WebhooksModule,
    BillingModule,
    AnalyticsModule,
    PromoCodesModule,
    ClicksModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Forwards unhandled exceptions to Sentry *and* re-throws them so NestJS
    // can still produce its default HTTP response. Must be the first APP_FILTER.
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
  ],
})
export class AppModule {}
