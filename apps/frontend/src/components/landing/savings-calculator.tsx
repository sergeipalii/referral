'use client';

import { useState } from 'react';

function formatUsd(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

// Rewardful Starter tier pricing at the time of writing. Higher Rewardful
// tiers charge less (7% on Growth, 5% on Enterprise) — we use Starter as
// the comparison point because it matches our own entry paid plan
// ("apples-to-apples at the bottom of the ladder"). Disclaimer in the UI.
const REWARDFUL_MONTHLY_FEE = 49;
const REWARDFUL_CUT_PERCENT = 0.09;

const REFLEDGER_STARTER_MONTHLY = 19;
const REFLEDGER_PRO_MONTHLY = 49;

type Tier = 'starter' | 'pro';

export function SavingsCalculator() {
  const [revenue, setRevenue] = useState(25_000);

  const rewardfulMonthly = REWARDFUL_MONTHLY_FEE + revenue * REWARDFUL_CUT_PERCENT;
  // Naive picker: nudge users past ~40k monthly revenue toward Pro, since
  // Starter caps at 5k events/mo (they'd likely blow through on volume).
  const recommendedTier: Tier = revenue > 40_000 ? 'pro' : 'starter';
  const refledgerMonthly =
    recommendedTier === 'pro' ? REFLEDGER_PRO_MONTHLY : REFLEDGER_STARTER_MONTHLY;
  const monthlySavings = Math.max(0, rewardfulMonthly - refledgerMonthly);
  const yearlySavings = monthlySavings * 12;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
      <label
        htmlFor="monthly-revenue"
        className="block text-sm font-medium text-gray-700"
      >
        Monthly revenue driven by your affiliates
      </label>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-4xl font-bold text-gray-900">
          {formatUsd(revenue)}
        </span>
        <span className="text-sm text-gray-500">/ month</span>
      </div>
      <input
        id="monthly-revenue"
        type="range"
        min={1_000}
        max={250_000}
        step={1_000}
        value={revenue}
        onChange={(e) => setRevenue(Number(e.target.value))}
        className="mt-6 w-full accent-indigo-600"
      />
      <div className="mt-1 flex justify-between text-xs text-gray-400">
        <span>$1k</span>
        <span>$250k</span>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            On Rewardful Starter
          </p>
          <p className="mt-3 text-sm text-gray-600">
            $49/mo + 9% cut of referred revenue
          </p>
          <p className="mt-4 text-2xl font-bold text-gray-900">
            {formatUsd(rewardfulMonthly)}
            <span className="ml-1 text-sm font-normal text-gray-500">
              / month
            </span>
          </p>
        </div>
        <div className="rounded-xl border-2 border-indigo-600 bg-indigo-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
            On Refledger {recommendedTier === 'pro' ? 'Pro' : 'Starter'}
          </p>
          <p className="mt-3 text-sm text-indigo-700">
            Flat monthly fee. Zero transaction fees.
          </p>
          <p className="mt-4 text-2xl font-bold text-indigo-900">
            {formatUsd(refledgerMonthly)}
            <span className="ml-1 text-sm font-normal text-indigo-700">
              / month
            </span>
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
          Your savings
        </p>
        <p className="mt-2 text-3xl font-extrabold">
          {formatUsd(monthlySavings)} / month
        </p>
        <p className="mt-1 text-sm opacity-90">
          {formatUsd(yearlySavings)} over a year
        </p>
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Rewardful Starter pricing as of April 2026 — their higher tiers
        reduce the percentage cut. Check{' '}
        <a
          href="https://rewardful.com/pricing"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-600"
        >
          rewardful.com/pricing
        </a>{' '}
        for current figures.
      </p>
    </div>
  );
}
