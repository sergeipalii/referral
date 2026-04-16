import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConversionsModule } from '../conversions/conversions.module';
import { BillingModule } from '../billing/billing.module';
import { MmpWebhooksController } from './mmp-webhooks.controller';

@Module({
  imports: [AuthModule, ConversionsModule, forwardRef(() => BillingModule)],
  controllers: [MmpWebhooksController],
})
export class WebhooksModule {}
