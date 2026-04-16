import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([ConversionEventEntity, IdempotencyKeyEntity]),
    PartnersModule,
    AccrualRulesModule,
    AuthModule,
    UserAttributionsModule,
  ],
  controllers: [ConversionsController],
  providers: [ConversionsService, IdempotencyService],
  exports: [ConversionsService],
})
export class ConversionsModule {}
