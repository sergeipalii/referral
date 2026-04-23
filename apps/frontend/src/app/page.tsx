'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { PricingSection } from '@/components/landing/pricing-section';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold text-indigo-600">
              Referral System
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
              <a href="#features" className="hover:text-gray-900">
                Features
              </a>
              <a href="#pricing" className="hover:text-gray-900">
                Pricing
              </a>
              <Link href="/system-overview" className="hover:text-gray-900">
                Docs
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
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

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 py-24 lg:py-32 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
          Track referrals.
          <br />
          <span className="text-indigo-600">Automate commissions.</span>
          <br />
          Reward partners.
        </h1>
        <p className="mx-auto mt-8 max-w-2xl text-lg text-gray-600 leading-relaxed">
          A developer-first platform for referral and affiliate programs —
          with flexible payout rules and a self-service partner portal.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
          {user ? (
            <Link href="/partners">
              <Button size="lg" className="w-full sm:w-auto">
                Go to dashboard
              </Button>
            </Link>
          ) : (
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto">
                Start for free
              </Button>
            </Link>
          )}
          <a href="#pricing">
            <Button variant="secondary" size="lg" className="w-full sm:w-auto">
              See pricing
            </Button>
          </a>
        </div>
        {!user && (
          <p className="mt-4 text-xs text-gray-500">
            Free forever for small programs. No credit card required.
          </p>
        )}
      </section>

      {/* ── Social proof strip ──────────────────────────────────────────── */}
      <section className="border-t border-gray-100 bg-gray-50 py-8">
        <div className="mx-auto max-w-7xl px-6 flex flex-wrap justify-center gap-10 text-center text-sm text-gray-500">
          <div>
            <span className="block text-2xl font-bold text-gray-900">API-first</span>
            Track from any stack
          </div>
          <div>
            <span className="block text-2xl font-bold text-gray-900">AppsFlyer</span>
            Direct webhook support
          </div>
          <div>
            <span className="block text-2xl font-bold text-gray-900">HMAC-signed API</span>
            Tamper-proof tracking
          </div>
          <div>
            <span className="block text-2xl font-bold text-gray-900">No fees</span>
            No cut of referred revenue
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Everything you need to run a referral program
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600">
            From partner onboarding to payout — a complete toolkit built for
            developers and finance teams.
          </p>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-gray-200 bg-white p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 text-lg font-bold">
                  {f.icon}
                </div>
                <h3 className="mt-4 text-base font-semibold text-gray-900">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section className="border-t border-gray-200 bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            How it works
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-gray-600">
            Get from zero to tracking in four steps.
          </p>
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

      {/* ── Pricing (subscription-aware) ────────────────────────────────── */}
      <PricingSection />

      {/* ── Comparison: Refledger vs Rewardful ──────────────────────────── */}
      <section className="border-t border-gray-200 bg-white py-24">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Refledger vs Rewardful
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600">
            If you&apos;re shopping referral platforms — here&apos;s where we
            differ. Honest comparison, not a takedown.
          </p>
          <div className="mt-12 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="py-4 text-left font-medium text-gray-500"></th>
                  <th className="py-4 px-4 text-center font-semibold text-indigo-600 whitespace-nowrap">
                    Refledger
                  </th>
                  <th className="py-4 px-4 text-center font-medium text-gray-500 whitespace-nowrap">
                    Rewardful
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {comparisonRows.map((r) => (
                  <tr key={r.label}>
                    <td className="py-4 text-gray-700">{r.label}</td>
                    <td className="py-4 px-4 text-center font-medium text-gray-900 whitespace-nowrap">
                      {r.refledger}
                    </td>
                    <td className="py-4 px-4 text-center text-gray-600 whitespace-nowrap">
                      {r.rewardful}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-8 text-center text-xs text-gray-500">
            Both platforms offer partner portals, recurring commissions, and
            Stripe-backed subscription billing for running your program.
            Pricing accurate as of publication — check vendor sites for the
            latest.
          </p>
          <div className="mt-6 text-center">
            <Link
              href="/switch-from-rewardful"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              Switching from Rewardful? See the savings calculator →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Integration preview ─────────────────────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Developer-friendly integration
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600">
            Send conversion events with a single API call. HMAC-signed for
            security, idempotent for reliability.
          </p>
          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <div className="rounded-xl bg-gray-900 p-6 overflow-x-auto">
              <p className="text-xs text-gray-500 mb-3 font-mono">
                curl — track a conversion
              </p>
              <pre className="text-xs text-green-400 font-mono whitespace-pre leading-relaxed">
{`BODY='{"partnerCode":"a1b2c3d4","eventName":"signup"}'
SIG=$(echo -n "$BODY" | openssl dgst -sha256 \\
  -hmac "$SIGNING_SECRET" | awk '{print $2}')

curl -X POST https://api.example.com/api/conversions/track \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $API_KEY" \\
  -H "X-Signature: sha256=$SIG" \\
  -d "$BODY"`}
              </pre>
            </div>
            <div className="rounded-xl bg-gray-900 p-6 overflow-x-auto">
              <p className="text-xs text-gray-500 mb-3 font-mono">
                AppsFlyer — direct webhook (no code)
              </p>
              <pre className="text-xs text-green-400 font-mono whitespace-pre leading-relaxed">
{`# Paste this URL into AppsFlyer → Push API:

POST https://api.example.com/api/webhooks/mmp/
     appsflyer/<webhookToken>

# Field mapping (automatic):
#   media_source  → partnerCode
#   event_name    → eventName
#   event_revenue → revenue
#   event_id      → idempotencyKey

# No HMAC signing needed.
# Always responds 200 — no retries on your errors.`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────── */}
      <section className="border-t border-gray-200 bg-indigo-600 py-20">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to get started?
          </h2>
          <p className="mt-4 text-lg text-indigo-100">
            Create your account and set up your first referral partner in
            minutes. Free forever for small programs — upgrade anytime.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            {user ? (
              <Link
                href="/partners"
                className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-base font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                Go to dashboard
              </Link>
            ) : (
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-base font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                Create free account
              </Link>
            )}
            <a
              href="#pricing"
              className="inline-flex items-center justify-center rounded-lg border border-white/30 px-6 py-3 text-base font-medium text-white hover:bg-indigo-500 transition-colors"
            >
              Compare plans
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-white py-10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-sm text-gray-500">
              Referral System &copy; {new Date().getFullYear()}
            </span>
            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
              <Link href="/system-overview" className="hover:text-gray-900">
                Documentation
              </Link>
              <Link href="/login" className="hover:text-gray-900">
                Sign in
              </Link>
              <Link href="/register" className="hover:text-gray-900">
                Register
              </Link>
              <Link href="/terms" className="hover:text-gray-900">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-gray-900">
                Privacy
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Data ──────────────────────────────────────────────────────────────────

const features = [
  {
    icon: 'P',
    title: 'Partner Management',
    desc: 'Create partners with auto-generated tracking codes. Invite them to a self-service portal where they see stats and set payout details.',
  },
  {
    icon: 'A',
    title: 'Conversion Tracking API',
    desc: 'HMAC-signed REST endpoint with rate limiting and 24-hour idempotency. Send events from any backend or mobile stack.',
  },
  {
    icon: 'M',
    title: 'MMP Integration',
    desc: 'Point AppsFlyer Push API directly at your webhook URL — no proxy server, no code. Adjust and Branch postbacks coming next.',
  },
  {
    icon: 'R',
    title: 'Flexible Accrual Rules',
    desc: 'Fixed, percentage, or recurring commissions with configurable attribution windows. Per-partner overrides.',
  },
  {
    icon: '$',
    title: 'Batch Payouts + CSV',
    desc: 'Generate pending payouts for all partners with one click. Export CSV for your bank portal or finance team.',
  },
  {
    icon: 'K',
    title: 'Partner Portal',
    desc: 'Partners log in separately to see conversions, payments, and balance. They set their own payout details.',
  },
  {
    icon: 'T',
    title: 'Transparent Pricing',
    desc: 'Free for small programs. Paid plans from $49/mo — no sales calls, no custom quotes, no yearly contracts. Upgrade or cancel anytime.',
  },
  {
    icon: 'D',
    title: 'Integration Guide',
    desc: 'In-app documentation with code samples in Node.js, Python, and curl. AI-assisted integration prompts included.',
  },
];

// Honest side-by-side. Shared strengths (partner portal, recurring rules,
// Stripe billing) are called out under the table instead of cluttering the
// rows — a comparison table works best when every row carries a difference.
const comparisonRows = [
  {
    label: 'Free plan',
    refledger: 'Yes — 5 partners, 1k events/mo',
    rewardful: 'No (14-day trial only)',
  },
  {
    label: 'Entry paid price',
    refledger: '$19 / month',
    rewardful: '$49 / month',
  },
  {
    label: 'Transaction fee on referred revenue',
    refledger: 'None',
    rewardful: '9%',
  },
  {
    label: 'HMAC-signed event API',
    refledger: 'Yes',
    rewardful: 'Pixel / JS snippet only',
  },
  {
    label: 'AppsFlyer direct webhook',
    refledger: 'Yes',
    rewardful: 'No (Stripe-native)',
  },
  {
    label: 'Stack-agnostic tracking',
    refledger: 'Any backend',
    rewardful: 'Stripe-first',
  },
];

const steps = [
  {
    title: 'Create Partners',
    desc: 'Add referral partners — each gets a unique tracking code automatically.',
  },
  {
    title: 'Integrate Tracking',
    desc: 'Send conversion events from your backend via HMAC-signed API or AppsFlyer webhook.',
  },
  {
    title: 'Configure Rules',
    desc: 'Set fixed, percentage, or recurring commission rules — globally or per partner.',
  },
  {
    title: 'Generate Payouts',
    desc: 'Batch-create pending payments, export CSV, and mark completed as you pay.',
  },
];
