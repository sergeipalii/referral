import { SetMetadata } from '@nestjs/common';
import type { Capability, CountableLimit } from '../plans';

/**
 * Metadata keys picked up by PlanLimitGuard. Using discriminated unions
 * keeps the decorator arguments type-checked at call sites.
 */
export const PLAN_CAPABILITY_KEY = 'plan:capability';
export const PLAN_LIMIT_KEY = 'plan:limit';

/**
 * Gate a handler behind a plan feature flag. Free-tier callers hitting a
 * capability they don't have get 402 + an upgrade hint.
 */
export const RequireCapability = (capability: Capability) =>
  SetMetadata(PLAN_CAPABILITY_KEY, capability);

/**
 * Gate a CREATE endpoint against a count-based limit (partners, apiKeys).
 * The guard counts current usage before the request adds a new row and
 * returns 402 when adding one more would break the cap.
 */
export const RequireWithinLimit = (limit: CountableLimit) =>
  SetMetadata(PLAN_LIMIT_KEY, limit);
