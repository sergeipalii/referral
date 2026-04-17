import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClickEntity } from './entities/click.entity';
import { ClicksService } from './clicks.service';
import { ClicksController } from './clicks.controller';
import { PartnersModule } from '../partners/partners.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClickEntity]),
    PartnersModule,
    UsersModule,
  ],
  controllers: [ClicksController],
  providers: [ClicksService],
  exports: [ClicksService],
})
export class ClicksModule {}
