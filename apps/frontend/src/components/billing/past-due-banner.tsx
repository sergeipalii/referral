'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { SubscriptionView } from '@/lib/types';

/**
 * Site-wide banner for owners in a problem state (past-due payment, failed
 * renewal). Fails silently on fetch error — during a deploy we don't want to
 * block the whole dashboard because /billing is momentarily unavailable.
 *
 * Rendered inside the owner DashboardShell (partners don't see it — their
 * shell is separate and the concept doesn't apply to them).
 */
export function PastDueBanner() {
  const [sub, setSub] = useState<SubscriptionView | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getSubscription()
      .then((s) => {
        if (!cancelled) setSub(s);
      })
      .catch(() => {
        /* best-effort */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!sub) return null;
  if (sub.status !== 'past_due' && sub.status !== 'unpaid') return null;

  return (
    <div className="bg-red-50 border-b border-red-200 px-6 py-2 text-sm text-red-800 flex items-center justify-between gap-4 flex-wrap">
      <span>
        <strong>Payment failed.</strong> Your subscription is{' '}
        {sub.status.replace('_', ' ')}. Update your payment method to keep
        access to paid features.
      </span>
      <Link
        href="/billing"
        className="inline-flex items-center rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
      >
        Fix it
      </Link>
    </div>
  );
}
