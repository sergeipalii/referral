import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SavingsCalculator } from '@/components/landing/savings-calculator';

export const metadata: Metadata = {
  title: 'Switch from Rewardful — Refledger',
  description:
    'Cut your referral platform bill from 9% of referred revenue to a flat monthly fee. Keep your partners, keep your history, stop paying transaction fees.',
  openGraph: {
    title: 'Switch from Rewardful to Refledger',
    description:
      'Flat-fee alternative to Rewardful. No cut of your referred revenue. $0 to start, $19 for real programs.',
    type: 'website',
  },
};

export default function SwitchFromRewardfulPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-indigo-600">
            Referral System
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-gray-600">
            <Link href="/#pricing" className="hover:text-gray-900">
              Pricing
            </Link>
            <Link href="/register">
              <Button>Get started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
          Switching from Rewardful
        </p>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
          Stop paying 9% of your
          <br />
          <span className="text-indigo-600">referred revenue.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 leading-relaxed">
          Refledger is a flat-fee alternative to Rewardful. The more your
          affiliates drive, the more you save. No cut. Ever.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          <Link href="/register">
            <Button size="lg" className="w-full sm:w-auto">
              Start on the Free plan
            </Button>
          </Link>
          <Link href="/#pricing">
            <Button variant="secondary" size="lg" className="w-full sm:w-auto">
              See pricing
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Savings calculator ──────────────────────────────────────────── */}
      <section className="border-t border-gray-200 bg-gray-50 py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            How much are you paying Rewardful?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-gray-600">
            Drag the slider to your monthly referred revenue. We&apos;ll show
            you what Rewardful&apos;s 9% cut costs — and what Refledger would
            cost instead.
          </p>
          <div className="mt-10">
            <SavingsCalculator />
          </div>
        </div>
      </section>

      {/* ── What migrates ──────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="flex items-center justify-center gap-3">
            <h2 className="text-3xl font-bold text-gray-900">
              Bring your entire program
            </h2>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              Automated migration — coming soon
            </span>
          </div>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600">
            When we ship one-click migration, you&apos;ll move everything in
            five minutes:
          </p>
          <ul className="mx-auto mt-10 grid gap-4 sm:grid-cols-2 max-w-2xl">
            {migrationItems.map((item) => (
              <li
                key={item.title}
                className="flex gap-3 rounded-xl border border-gray-200 bg-white p-5"
              >
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold">
                  ✓
                </span>
                <div>
                  <p className="font-semibold text-gray-900">{item.title}</p>
                  <p className="mt-1 text-sm text-gray-600">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
            <p className="text-sm text-gray-700">
              <strong>Ready to migrate now?</strong> Email us at{' '}
              <a
                href="mailto:hello@refledger.io"
                className="text-indigo-600 underline hover:text-indigo-500"
              >
                hello@refledger.io
              </a>{' '}
              — we&apos;ll help you move your program by hand, for free.
              You&apos;ll also be first in line when the automated tool
              ships.
            </p>
          </div>
        </div>
      </section>

      {/* ── Why Refledger (mini) ────────────────────────────────────────── */}
      <section className="border-t border-gray-200 bg-gray-50 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Why people switch
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {whyItems.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-gray-200 bg-white p-6"
              >
                <p className="text-2xl">{item.icon}</p>
                <p className="mt-3 font-semibold text-gray-900">
                  {item.title}
                </p>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/#pricing"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              See the full comparison →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────── */}
      <section className="border-t border-gray-200 bg-indigo-600 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white">
            Start on the Free plan — see the product in 2 minutes
          </h2>
          <p className="mt-3 text-indigo-100">
            No credit card. No transaction fees. No pressure.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-base font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              Create your free account
            </Link>
            <a
              href="mailto:hello@refledger.io"
              className="inline-flex items-center justify-center rounded-lg border border-white/30 px-6 py-3 text-base font-medium text-white hover:bg-indigo-500 transition-colors"
            >
              Talk to us about migration
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
          <span>Referral System &copy; {new Date().getFullYear()}</span>
          <Link href="/" className="hover:text-gray-900">
            Back to main page
          </Link>
        </div>
      </footer>
    </div>
  );
}

const migrationItems = [
  {
    title: 'All your affiliates',
    desc: 'Preserved with their existing slugs — your live referral URLs keep working.',
  },
  {
    title: 'Referral history',
    desc: 'Conversions and revenue data imported so balances and reports stay correct.',
  },
  {
    title: 'Commission rules',
    desc: 'Fixed, percentage, and recurring rules mapped to Refledger equivalents.',
  },
  {
    title: 'Payout history',
    desc: 'Completed payments recorded so partner balances line up from day one.',
  },
];

const whyItems = [
  {
    icon: '$',
    title: 'No transaction fees',
    desc: 'You keep 100% of your referred revenue. The more you grow, the bigger the savings gap.',
  },
  {
    icon: '⚙',
    title: 'Stack-agnostic tracking',
    desc: 'HMAC-signed event API works with any backend. AppsFlyer postbacks land directly — no proxy.',
  },
  {
    icon: '⟲',
    title: 'Same core features',
    desc: 'Partner portal, recurring commissions, Stripe billing — everything you use today.',
  },
];
