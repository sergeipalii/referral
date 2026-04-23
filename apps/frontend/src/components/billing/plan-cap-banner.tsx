'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { SubscriptionView } from '@/lib/types';

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

function nextPlan(
  current: SubscriptionView['plan'],
): 'starter' | 'pro' | 'business' {
  // Smallest next plan that lifts the conversion cap. Free goes to Starter
  // (5k/mo), Starter to Pro (50k/mo), everyone else to Business (500k/mo).
  if (current === 'free') return 'starter';
  if (current === 'starter') return 'pro';
  return 'business';
}

function nextPlanLabel(
  key: 'starter' | 'pro' | 'business',
): 'Starter' | 'Pro' | 'Business' {
  return key === 'starter' ? 'Starter' : key === 'pro' ? 'Pro' : 'Business';
}

/**
 * Shown on every tenant dashboard page when the current-period conversion
 * cap has been exceeded. Accruals are still calculated for hidden events
 * (partners are paid correctly), but the tenant sees them summarised rather
 * than itemised until upgrade.
 */
export function PlanCapBanner() {
  const [sub, setSub] = useState<SubscriptionView | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getSubscription()
      .then((s) => {
        if (!cancelled) setSub(s);
      })
      .catch(() => {
        /* best-effort — silent fail, same as PastDueBanner */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!sub) return null;
  const { conversions } = sub.usage;
  if (!conversions.exceeded) return null;

  const target = nextPlan(sub.plan);

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-sm text-amber-900 flex items-center justify-between gap-4 flex-wrap">
      <span>
        <strong>{formatNumber(conversions.hiddenCount)} conversions hidden.</strong>{' '}
        You&apos;ve recorded {formatNumber(conversions.used)} events this
        period — past the {formatNumber(conversions.limit ?? 0)}-cap on the{' '}
        {sub.planLabel} plan. They&apos;re safely stored and partner payouts
        keep accruing — reports will reveal them after upgrade.
      </span>
      <Link
        href={`/billing?upgrade=${target}`}
        className="inline-flex items-center rounded-md bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700 whitespace-nowrap"
      >
        Upgrade to {nextPlanLabel(target)}
      </Link>
    </div>
  );
}
