import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccrualRuleEntity } from './entities/accrual-rule.entity';
import { AccrualRulesService } from './accrual-rules.service';
import { AccrualRulesController } from './accrual-rules.controller';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccrualRuleEntity]),
    forwardRef(() => BillingModule),
  ],
  controllers: [AccrualRulesController],
  providers: [AccrualRulesService],
  exports: [AccrualRulesService],
})
export class AccrualRulesModule {}
