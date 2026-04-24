import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { ApiKeyEntity } from '../auth/entities/api-key.entity';
import { PartnerEntity } from '../partners/entities/partner.entity';
import { ConversionEventEntity } from '../conversions/entities/conversion-event.entity';
import { BillingController } from './billing.controller';
import { PaddleWebhookController } from './paddle-webhook.controller';
import { BillingService } from './billing.service';
import { BillingCronService } from './billing-cron.service';
import { PaddleService } from './paddle.service';
import { PlanLimitGuard } from './guards/plan-limit.guard';
import { SubscriptionEntity } from './entities/subscription.entity';
import { InvoiceEntity } from './entities/invoice.entity';
import { ProcessedWebhookEventEntity } from './entities/processed-webhook-event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SubscriptionEntity,
      InvoiceEntity,
      ProcessedWebhookEventEntity,
      PartnerEntity,
      ApiKeyEntity,
      ConversionEventEntity,
    ]),
    UsersModule,
    // forwardRef: AuthModule consumes BillingService (for free-plan
    // bootstrap on register) while BillingModule consumes JwtAuthGuard from
    // AuthModule (to protect /billing endpoints). Nest resolves the cycle
    // only when both sides declare it.
    forwardRef(() => AuthModule),
  ],
  controllers: [BillingController, PaddleWebhookController],
  providers: [
    BillingService,
    PaddleService,
    PlanLimitGuard,
    BillingCronService,
  ],
  exports: [BillingService, PaddleService, PlanLimitGuard],
})
export class BillingModule {}
