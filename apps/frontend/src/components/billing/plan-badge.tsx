'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { PlanKey, SubscriptionView } from '@/lib/types';

const LABEL: Record<PlanKey, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
};

const TONE: Record<PlanKey, string> = {
  free: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  starter: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
  pro: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  business: 'bg-green-100 text-green-800 hover:bg-green-200',
};

/**
 * Compact plan indicator rendered at the bottom of the owner sidebar. Shows
 * the current plan with a link to /billing. Does its own fetch — small JSON
 * payload, every dashboard page already triggers a /users/self roundtrip so
 * one more is negligible. Fails silently: returns null if the call errors out
 * (e.g. during a deploy when the endpoint is briefly unavailable).
 */
export function PlanBadge() {
  const [sub, setSub] = useState<SubscriptionView | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getSubscription()
      .then((s) => {
        if (!cancelled) setSub(s);
      })
      .catch(() => {
        // swallow — the badge is a nice-to-have, not critical
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!sub) return null;

  return (
    <Link
      href="/billing"
      className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${TONE[sub.plan]}`}
    >
      <span>Plan: {LABEL[sub.plan]}</span>
      <span className="text-[10px] opacity-70">Manage →</span>
    </Link>
  );
}
