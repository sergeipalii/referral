import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAttributionEntity } from './entities/user-attribution.entity';
import { UserAttributionsService } from './user-attributions.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserAttributionEntity])],
  providers: [UserAttributionsService],
  exports: [UserAttributionsService],
})
export class UserAttributionsModule {}
