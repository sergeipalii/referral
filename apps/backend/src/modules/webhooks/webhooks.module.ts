import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConversionsModule } from '../conversions/conversions.module';
import { MmpWebhooksController } from './mmp-webhooks.controller';

@Module({
  imports: [AuthModule, ConversionsModule],
  controllers: [MmpWebhooksController],
})
export class WebhooksModule {}
