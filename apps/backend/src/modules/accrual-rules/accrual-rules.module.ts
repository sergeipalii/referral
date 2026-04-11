import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccrualRuleEntity } from './entities/accrual-rule.entity';
import { AccrualRulesService } from './accrual-rules.service';
import { AccrualRulesController } from './accrual-rules.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AccrualRuleEntity])],
  controllers: [AccrualRulesController],
  providers: [AccrualRulesService],
  exports: [AccrualRulesService],
})
export class AccrualRulesModule {}
