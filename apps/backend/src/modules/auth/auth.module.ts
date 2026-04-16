import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { BillingModule } from '../billing/billing.module';
import { ApiKeyEntity } from './entities/api-key.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiKeyAuthGuard } from './guards/api-key-auth.guard';
import { CombinedAuthGuard } from './guards/combined-auth.guard';
import { HmacAuthGuard } from './guards/hmac-auth.guard';

@Module({
  imports: [
    PassportModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([ApiKeyEntity]),
    UsersModule,
    // BillingModule depends on AuthModule (for JwtAuthGuard on /billing
    // endpoints) and AuthModule depends on BillingService (to bootstrap a
    // free subscription on register). Break the cycle with forwardRef on
    // both sides.
    forwardRef(() => BillingModule),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    ApiKeyAuthGuard,
    CombinedAuthGuard,
    HmacAuthGuard,
  ],
  controllers: [AuthController],
  exports: [
    AuthService,
    JwtModule,
    JwtAuthGuard,
    ApiKeyAuthGuard,
    CombinedAuthGuard,
    HmacAuthGuard,
  ],
})
export class AuthModule {}
