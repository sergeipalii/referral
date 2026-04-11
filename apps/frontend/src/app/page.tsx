'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-indigo-600">
            Referral System
          </span>
          <div className="flex items-center gap-4">
            {user ? (
              <Link href="/partners">
                <Button>Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">Sign in</Button>
                </Link>
                <Link href="/register">
                  <Button>Get started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 py-24 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl">
          Referral tracking
          <span className="block text-indigo-600">made simple</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
          Manage partners, track conversions from Amplitude and other analytics
          platforms, configure payout rules, and keep track of payments — all in
          one place.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link href="/register">
            <Button size="lg">Start for free</Button>
          </Link>
          <Link href="#features">
            <Button variant="secondary" size="lg">
              Learn more
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="border-t border-gray-200 bg-white py-24"
      >
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Everything you need
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600">
            A complete toolkit for managing your referral program end to end.
          </p>
          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-gray-200 p-6"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 text-xl">
                  {f.icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            How it works
          </h2>
          <div className="mt-16 grid gap-8 md:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s.title} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-lg">
                  {i + 1}
                </div>
                <h3 className="mt-4 font-semibold text-gray-900">{s.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-200 bg-indigo-600 py-16">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white">
            Ready to get started?
          </h2>
          <p className="mt-4 text-lg text-indigo-100">
            Create your account and set up your first referral partner in
            minutes.
          </p>
          <div className="mt-8">
            <Link href="/register">
              <Button
                size="lg"
                className="bg-white text-indigo-600 hover:bg-indigo-50"
              >
                Create free account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-gray-500">
          Referral System &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: 'P',
    title: 'Partner Management',
    desc: 'Create and manage referral partners with unique tracking codes. Activate or deactivate partners anytime.',
  },
  {
    icon: 'A',
    title: 'Analytics Integration',
    desc: 'Connect Amplitude or other analytics platforms. Automatically sync conversion events daily.',
  },
  {
    icon: 'R',
    title: 'Flexible Payout Rules',
    desc: 'Set up fixed or percentage-based accrual rules. Create global rules or partner-specific overrides.',
  },
  {
    icon: 'C',
    title: 'Conversion Tracking',
    desc: 'View aggregated conversion data per partner and event. Monitor revenue and accruals in real time.',
  },
  {
    icon: '$',
    title: 'Payment Management',
    desc: 'Record and track payments to partners. See balance summaries with accrued vs paid amounts.',
  },
  {
    icon: 'K',
    title: 'API Access',
    desc: 'Generate API keys for programmatic access. Integrate referral data into your own tools.',
  },
];

const steps = [
  {
    title: 'Create Partners',
    desc: 'Add referral partners with unique UTM codes for tracking.',
  },
  {
    title: 'Connect Analytics',
    desc: 'Link your Amplitude account to sync conversion events.',
  },
  {
    title: 'Set Payout Rules',
    desc: 'Configure how much each conversion type is worth.',
  },
  {
    title: 'Track & Pay',
    desc: 'Monitor accruals and record payments from one dashboard.',
  },
];
