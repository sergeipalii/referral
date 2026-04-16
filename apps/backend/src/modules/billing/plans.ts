import type { PlanKey } from './entities/subscription.entity';

/**
 * Which features are gated behind paid plans. Narrow string union so every
 * `@RequireCapability` call site is typo-checked at compile time.
 */
export type Capability =
  | 'mmpWebhook'
  | 'csvExport'
  | 'batchPayouts'
  | 'recurringRules';

/**
 * Countable resources we cap per plan. `null` means unlimited.
 */
export type CountableLimit =
  | 'maxPartners'
  | 'maxConversionsPerMonth'
  | 'maxApiKeys';

export interface PlanDefinition {
  key: PlanKey;
  label: string;
  /** Environment variable name that holds the Stripe Price id (null on free). */
  stripePriceEnv: string | null;
  /** Monthly price in the smallest currency unit (cents for USD). 0 for free. */
  priceCents: number;
  currency: string;
  /** Optional trial in days. `undefined` disables trial on this plan. */
  trialDays?: number;
  limits: Record<CountableLimit, number | null>;
  features: Record<Capability, boolean>;
}

/**
 * The single source of truth for plan limits and pricing. Numbers are tuned
 * for SMB SaaS — revisit after we have signal from real customers.
 */
export const PLANS: Record<PlanKey, PlanDefinition> = {
  free: {
    key: 'free',
    label: 'Free',
    stripePriceEnv: null,
    priceCents: 0,
    currency: 'usd',
    limits: {
      maxPartners: 5,
      maxConversionsPerMonth: 1_000,
      maxApiKeys: 1,
    },
    features: {
      mmpWebhook: false,
      csvExport: false,
      batchPayouts: false,
      recurringRules: false,
    },
  },
  pro: {
    key: 'pro',
    label: 'Pro',
    stripePriceEnv: 'STRIPE_PRICE_PRO',
    priceCents: 4_900,
    currency: 'usd',
    trialDays: 14,
    limits: {
      maxPartners: 50,
      maxConversionsPerMonth: 50_000,
      maxApiKeys: 5,
    },
    features: {
      mmpWebhook: true,
      csvExport: true,
      batchPayouts: false,
      recurringRules: true,
    },
  },
  business: {
    key: 'business',
    label: 'Business',
    stripePriceEnv: 'STRIPE_PRICE_BUSINESS',
    priceCents: 19_900,
    currency: 'usd',
    trialDays: 14,
    limits: {
      maxPartners: null,
      maxConversionsPerMonth: 500_000,
      maxApiKeys: null,
    },
    features: {
      mmpWebhook: true,
      csvExport: true,
      batchPayouts: true,
      recurringRules: true,
    },
  },
};

export function getPlan(key: PlanKey): PlanDefinition {
  return PLANS[key];
}

export function hasCapability(key: PlanKey, capability: Capability): boolean {
  return PLANS[key].features[capability] === true;
}

export function getLimit(
  key: PlanKey,
  limit: CountableLimit,
): number | null {
  return PLANS[key].limits[limit];
}

/**
 * Smallest plan key that unlocks the given capability. Used to populate the
 * `requiredPlan` field in 402 error responses — frontend renders the CTA
 * pointing at this plan on the upgrade modal.
 */
export function smallestPlanWith(capability: Capability): PlanKey | null {
  // Order matters: walk cheapest → most expensive and return the first match.
  for (const key of ['free', 'pro', 'business'] as PlanKey[]) {
    if (hasCapability(key, capability)) return key;
  }
  return null;
}

/**
 * Smallest plan key whose limit for the given resource covers `needed`
 * (`null` = unlimited — always covers). Used for count-based 402 responses.
 */
export function smallestPlanCovering(
  limit: CountableLimit,
  needed: number,
): PlanKey | null {
  for (const key of ['free', 'pro', 'business'] as PlanKey[]) {
    const cap = getLimit(key, limit);
    if (cap === null || cap >= needed) return key;
  }
  return null;
}
