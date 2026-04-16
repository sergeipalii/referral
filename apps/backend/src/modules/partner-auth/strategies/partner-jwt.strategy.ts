import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PartnerJwtPayload } from '../partner-auth.service';

export interface AuthenticatedPartner {
  /** partner UUID */
  id: string;
  /** owning userId (tenant) — needed for multi-tenant scoping */
  userId: string;
}

/**
 * Passport strategy for partner-portal requests. Registered as `partner-jwt`
 * (separate name from the `jwt` strategy used for owners) so we can apply
 * different guards to different controller groups.
 */
@Injectable()
export class PartnerJwtStrategy extends PassportStrategy(
  Strategy,
  'partner-jwt',
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret')!,
    });
  }

  validate(payload: PartnerJwtPayload): AuthenticatedPartner {
    if (payload.type !== 'partner-access') {
      throw new UnauthorizedException('Invalid token type');
    }
    return { id: payload.sub, userId: payload.uid };
  }
}
