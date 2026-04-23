import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversionEventEntity } from './entities/conversion-event.entity';
import { IdempotencyKeyEntity } from './entities/idempotency-key.entity';
import { ConversionsService } from './conversions.service';
import { IdempotencyService } from './idempotency.service';
import { ConversionsController } from './conversions.controller';
import { PartnersModule } from '../partners/partners.module';
import { AccrualRulesModule } from '../accrual-rules/accrual-rules.module';
import { AuthModule } from '../auth/auth.module';
import { UserAttributionsModule } from '../user-attributions/user-attributions.module';
import { PromoCodesModule } from '../promo-codes/promo-codes.module';
import { ClicksModule } from '../clicks/clicks.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConversionEventEntity, IdempotencyKeyEntity]),
    PartnersModule,
    AccrualRulesModule,
    AuthModule,
    UserAttributionsModule,
    PromoCodesModule,
    ClicksModule,
    forwardRef(() => BillingModule),
  ],
  controllers: [ConversionsController],
  providers: [ConversionsService, IdempotencyService],
  exports: [ConversionsService],
})
export class ConversionsModule {}
