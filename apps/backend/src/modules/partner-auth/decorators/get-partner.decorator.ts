import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedPartner } from '../strategies/partner-jwt.strategy';

interface PartnerRequest extends Request {
  user?: AuthenticatedPartner;
}

/**
 * Pulls the authenticated partner out of the request (populated by
 * `PartnerJwtStrategy.validate`). Pass a field name to grab just that value —
 * `@GetPartner('id')` → partnerId, `@GetPartner('userId')` → owning tenant.
 */
export const GetPartner = createParamDecorator(
  (
    data: keyof AuthenticatedPartner | undefined,
    ctx: ExecutionContext,
  ): AuthenticatedPartner | string | undefined => {
    const request = ctx.switchToHttp().getRequest<PartnerRequest>();
    const partner = request.user;
    if (!partner) return undefined;
    if (data) return partner[data];
    return partner;
  },
);
