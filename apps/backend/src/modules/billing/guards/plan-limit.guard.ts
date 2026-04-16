import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { BillingService } from '../billing.service';
import {
  getLimit,
  hasCapability,
  smallestPlanCovering,
  smallestPlanWith,
  type Capability,
  type CountableLimit,
} from '../plans';
import {
  PLAN_CAPABILITY_KEY,
  PLAN_LIMIT_KEY,
} from '../decorators/plan-gate.decorators';

/**
 * Checks that the authenticated tenant's plan allows the requested action.
 * Runs AFTER JwtAuthGuard — reads `request.user.id` to look up the current
 * subscription. Throws HttpException(402) with a structured body so the
 * frontend can render an "upgrade to <plan>" modal.
 *
 * Relies on metadata set by `@RequireCapability` / `@RequireWithinLimit`.
 * Handlers without either decorator pass through untouched — this guard is
 * safe to register globally on a controller that mixes gated and open
 * endpoints.
 */
@Injectable()
export class PlanLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly billingService: BillingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const capability = this.reflector.getAllAndOverride<Capability | undefined>(
      PLAN_CAPABILITY_KEY,
      [context.getHandler(), context.getClass()],
    );
    const limit = this.reflector.getAllAndOverride<CountableLimit | undefined>(
      PLAN_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!capability && !limit) return true;

    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: { id?: string } }>();
    const userId = req.user?.id;
    if (!userId) {
      // PlanLimitGuard depends on auth populating `request.user`. If it isn't
      // present the route is misconfigured — fail closed.
      throw new HttpException('Unauthenticated', HttpStatus.UNAUTHORIZED);
    }

    const sub = await this.billingService.getSubscriptionEntity(userId);

    if (capability && !hasCapability(sub.planKey, capability)) {
      throw new HttpException(
        {
          error: 'plan_limit',
          reason: 'capability',
          capability,
          currentPlan: sub.planKey,
          requiredPlan: smallestPlanWith(capability),
          message: `This action requires a plan with "${capability}" enabled`,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    if (limit) {
      const cap = getLimit(sub.planKey, limit);
      if (cap !== null) {
        const used = await this.billingService.currentUsageCount(userId, limit);
        if (used >= cap) {
          throw new HttpException(
            {
              error: 'plan_limit',
              reason: 'count',
              limit,
              used,
              cap,
              currentPlan: sub.planKey,
              requiredPlan: smallestPlanCovering(limit, used + 1),
              message: `You're at the ${limit} cap on the ${sub.planKey} plan (${used}/${cap})`,
            },
            HttpStatus.PAYMENT_REQUIRED,
          );
        }
      }
    }

    return true;
  }
}
