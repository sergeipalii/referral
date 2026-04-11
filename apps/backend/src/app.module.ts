import { Module } from '@nestjs/common';
import configuration from './modules/config/configuration';
import { configValidationSchema } from './modules/config/configuration.schema';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PartnersModule } from './modules/partners/partners.module';
import { AccrualRulesModule } from './modules/accrual-rules/accrual-rules.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ConversionsModule } from './modules/conversions/conversions.module';
import { PaymentsModule } from './modules/payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: configValidationSchema,
      validationOptions: {
        abortEarly: true,
      },
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        entities: ['dist/**/*.entity{.ts,.js}'],
        synchronize: configService.get('database.synchronize'),
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    PartnersModule,
    AccrualRulesModule,
    AnalyticsModule,
    ConversionsModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
