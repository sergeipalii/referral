import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversionEventEntity } from '../conversions/entities/conversion-event.entity';
import { PaymentEntity } from '../payments/entities/payment.entity';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConversionEventEntity, PaymentEntity]),
    forwardRef(() => AuthModule),
    forwardRef(() => BillingModule),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
