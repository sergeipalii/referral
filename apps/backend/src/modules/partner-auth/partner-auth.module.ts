import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnerEntity } from '../partners/entities/partner.entity';
import { AuthModule } from '../auth/auth.module';
import { PartnersModule } from '../partners/partners.module';
import { ConversionsModule } from '../conversions/conversions.module';
import { PaymentsModule } from '../payments/payments.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PromoCodesModule } from '../promo-codes/promo-codes.module';
import { PartnerAuthController } from './partner-auth.controller';
import { PartnerPortalController } from './partner-portal.controller';
import { PartnerAuthService } from './partner-auth.service';
import { PartnerJwtStrategy } from './strategies/partner-jwt.strategy';
import { PartnerJwtAuthGuard } from './guards/partner-jwt-auth.guard';

@Module({
  imports: [
    PassportModule,
    ConfigModule,
    // Share the same signing secret as owner auth — token type (`partner-access`
    // vs `access`) is what distinguishes them.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([PartnerEntity]),
    // AuthModule exports JwtAuthGuard (used on invitation endpoints).
    AuthModule,
    // Partner portal reuses existing services — no duplicated query logic.
    PartnersModule,
    ConversionsModule,
    PaymentsModule,
    AnalyticsModule,
    PromoCodesModule,
  ],
  controllers: [PartnerAuthController, PartnerPortalController],
  providers: [PartnerAuthService, PartnerJwtStrategy, PartnerJwtAuthGuard],
  exports: [PartnerAuthService, PartnerJwtAuthGuard, PartnerJwtStrategy],
})
export class PartnerAuthModule {}
