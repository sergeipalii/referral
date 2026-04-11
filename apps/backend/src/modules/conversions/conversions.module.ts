import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversionEventEntity } from './entities/conversion-event.entity';
import { ConversionsService } from './conversions.service';
import { ConversionsController } from './conversions.controller';
import { PartnersModule } from '../partners/partners.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConversionEventEntity]),
    PartnersModule,
  ],
  controllers: [ConversionsController],
  providers: [ConversionsService],
  exports: [ConversionsService],
})
export class ConversionsModule {}
