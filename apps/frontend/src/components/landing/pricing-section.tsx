'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api, ApiError } from '@/lib/api';
import type { PlanKey, SubscriptionView } from '@/lib/types';

// ─── Static pricing data ─────────────────────────────────────────────────
// Duplicated from backend plans.ts intentionally — guests see this without
// a round-trip. If plan limits/prices change, update both files.

interface PlanCard {
  key: PlanKey;
  name: string;
  price: string;
  period: string;
  description: string;
  badge?: string;
  highlighted: boolean;
  features: string[];
  limits: string[];
}

const PLANS: PlanCard[] = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Evaluate the product. Wire up tracking, invite yourself as a test partner, see how rules behave.',
    highlighted: false,
    limits: [
      'Up to 5 partners',
      '1,000 conversions / month',
      '1 API key',
    ],
    features: [
      'Partner management',
      'Conversion tracking API',
      'Fixed & percentage rules',
      'Manual payment recording',
    ],
  },
  {
    key: 'starter',
    name: 'Starter',
    price: '$19',
    period: '/ month',
    description: 'For small programs with real partners. Self-serve portal with their own logins.',
    badge: '14-day free trial',
    highlighted: false,
    limits: [
      'Up to 20 partners',
      '5,000 conversions / month',
      '2 API keys',
    ],
    features: [
      'Everything in Free, plus:',
      'Partner portal with self-serve login',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$49',
    period: '/ month',
    description: 'For growing programs with mobile attribution, finance exports and recurring payouts.',
    badge: '14-day free trial',
    highlighted: true,
    limits: [
      'Up to 100 partners',
      '50,000 conversions / month',
      '5 API keys',
    ],
    features: [
      'Everything in Starter, plus:',
      'Recurring commission rules',
      'Direct MMP webhook (AppsFlyer)',
      'CSV export for finance',
      'Batch pending-payout generation',
    ],
  },
  {
    key: 'business',
    name: 'Business',
    price: '$199',
    period: '/ month',
    description: 'For established programs at scale.',
    badge: '14-day free trial',
    highlighted: false,
    limits: [
      'Unlimited partners',
      '500,000 conversions / month',
      'Unlimited API keys',
    ],
    features: [
      'Everything in Pro, plus:',
      'Priority support',
    ],
  },
];

// ─── Plan ordering for comparison ─────────────────────────────────────────

const PLAN_ORDER: Record<PlanKey, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  business: 3,
};

export function PricingSection() {
  const { user } = useAuth();
  const [sub, setSub] = useState<SubscriptionView | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState<PlanKey | null>(null);

  // Fetch subscription only if logged in — guests see static cards.
  useEffect(() => {
    if (!user) {
      setSub(null);
      return;
    }
    let cancelled = false;
    api
      .getSubscription()
      .then((s) => {
        if (!cancelled) setSub(s);
      })
      .catch(() => {
        /* best-effort — guest-like view if billing is down */
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const currentPlan = sub?.plan ?? null;
  const isPastDue = sub?.status === 'past_due' || sub?.status === 'unpaid';

  const handleUpgrade = async (planKey: 'starter' | 'pro' | 'business') => {
    setCheckoutBusy(planKey);
    try {
      const res = await api.createCheckout(planKey);
      window.location.href = res.url;
    } catch (err) {
      alert(
        err instanceof ApiError ? err.message : 'Could not start checkout',
      );
      setCheckoutBusy(null);
    }
  };

  return (
    <section id="pricing" className="border-t border-gray-200 bg-gray-50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="text-center text-3xl font-bold text-gray-900">
          Simple, transparent pricing
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600">
          Start free. Upgrade when you need more partners, higher volume, or
          advanced features. All paid plans include a 14-day free trial.
          No transaction fees on any plan.
        </p>

        <div className="mt-16 grid gap-8 lg:grid-cols-4">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.key;
            const isLower =
              currentPlan !== null &&
              PLAN_ORDER[plan.key] < PLAN_ORDER[currentPlan];
            const isHigher =
              currentPlan !== null &&
              PLAN_ORDER[plan.key] > PLAN_ORDER[currentPlan];

            return (
              <div
                key={plan.key}
                className={`rounded-2xl border bg-white p-8 flex flex-col ${
                  plan.highlighted
                    ? 'border-indigo-600 ring-2 ring-indigo-600'
                    : 'border-gray-200'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">
                    {plan.name}
                  </h3>
                  <div className="flex gap-2">
                    {plan.badge && (
                      <Badge variant="yellow">{plan.badge}</Badge>
                    )}
                    {isCurrent && <Badge variant="green">Current plan</Badge>}
                  </div>
                </div>

                {/* Price */}
                <div className="mt-4">
                  <span className="text-4xl font-extrabold text-gray-900">
                    {plan.price}
                  </span>
                  <span className="ml-1 text-sm text-gray-500">
                    {plan.period}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  {plan.description}
                </p>

                {/* Limits */}
                <ul className="mt-6 space-y-2">
                  {plan.limits.map((l) => (
                    <li
                      key={l}
                      className="flex items-center gap-2 text-sm text-gray-800"
                    >
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold">
                        #
                      </span>
                      {l}
                    </li>
                  ))}
                </ul>

                {/* Features */}
                <ul className="mt-4 space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-gray-700"
                    >
                      <span className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-green-100 text-green-700 text-[10px]">
                        ✓
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="mt-8">
                  <PlanCTA
                    planKey={plan.key}
                    isCurrent={isCurrent}
                    isLower={isLower}
                    isHigher={isHigher}
                    isPastDue={isPastDue}
                    isLoggedIn={!!user}
                    checkoutBusy={checkoutBusy}
                    onUpgrade={handleUpgrade}
                    highlighted={plan.highlighted}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PlanCTA({
  planKey,
  isCurrent,
  isLower,
  isHigher,
  isPastDue,
  isLoggedIn,
  checkoutBusy,
  onUpgrade,
  highlighted,
}: {
  planKey: PlanKey;
  isCurrent: boolean;
  isLower: boolean;
  isHigher: boolean;
  isPastDue: boolean;
  isLoggedIn: boolean;
  checkoutBusy: PlanKey | null;
  onUpgrade: (key: 'starter' | 'pro' | 'business') => void;
  highlighted: boolean;
}) {
  // ── Guest (not logged in) ───────────────────────────────────────────
  if (!isLoggedIn) {
    if (planKey === 'free') {
      return (
        <Link href="/register" className="block">
          <Button
            variant={highlighted ? 'primary' : 'secondary'}
            className="w-full"
          >
            Start for free
          </Button>
        </Link>
      );
    }
    const ctaLabel =
      planKey === 'starter'
        ? 'Start Starter trial'
        : planKey === 'pro'
          ? 'Start Pro trial'
          : 'Start Business trial';
    return (
      <Link href={`/register?plan=${planKey}`} className="block">
        <Button
          variant={highlighted ? 'primary' : 'secondary'}
          className="w-full"
        >
          {ctaLabel}
        </Button>
      </Link>
    );
  }

  // ── Past due / unpaid — urge them to fix payment ────────────────────
  if (isPastDue && isCurrent) {
    return (
      <Link href="/billing" className="block">
        <Button variant="danger" className="w-full">
          Fix payment
        </Button>
      </Link>
    );
  }

  // ── Current plan ────────────────────────────────────────────────────
  if (isCurrent) {
    return (
      <Link href="/billing" className="block">
        <Button variant="secondary" className="w-full">
          Manage
        </Button>
      </Link>
    );
  }

  // ── Lower plan (already on a higher tier) ───────────────────────────
  if (isLower) {
    return (
      <Button variant="ghost" className="w-full" disabled>
        Included in your plan
      </Button>
    );
  }

  // ── Higher plan (upgrade available) ─────────────────────────────────
  if (
    isHigher &&
    (planKey === 'starter' || planKey === 'pro' || planKey === 'business')
  ) {
    const label =
      planKey === 'starter'
        ? 'Starter'
        : planKey === 'pro'
          ? 'Pro'
          : 'Business';
    return (
      <Button
        variant={highlighted ? 'primary' : 'secondary'}
        className="w-full"
        loading={checkoutBusy === planKey}
        onClick={() => onUpgrade(planKey)}
      >
        Upgrade to {label}
      </Button>
    );
  }

  // Fallback (shouldn't hit in practice)
  return (
    <Link href="/billing" className="block">
      <Button variant="secondary" className="w-full">
        View plans
      </Button>
    </Link>
  );
}
