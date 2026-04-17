'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api, ApiError, type InvoiceView } from '@/lib/api';
import type {
  PlanKey,
  SubscriptionStatus,
  SubscriptionView,
  UsageBucket,
} from '@/lib/types';

const PLAN_VARIANT: Record<PlanKey, 'gray' | 'blue' | 'green'> = {
  free: 'gray',
  pro: 'blue',
  business: 'green',
};

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  trialing: 'Trial',
  active: 'Active',
  past_due: 'Past due',
  canceled: 'Canceled',
  unpaid: 'Unpaid',
  paused: 'Paused',
};

const STATUS_VARIANT: Record<
  SubscriptionStatus,
  'green' | 'yellow' | 'red' | 'gray'
> = {
  trialing: 'yellow',
  active: 'green',
  past_due: 'red',
  canceled: 'gray',
  unpaid: 'red',
  paused: 'gray',
};

function formatPrice(cents: number, currency: string): string {
  if (cents === 0) return 'Free';
  const amount = (cents / 100).toFixed(2);
  return `${currency.toUpperCase()} ${amount}/mo`;
}

function formatLimit(limit: number | null): string {
  return limit === null ? 'unlimited' : limit.toLocaleString();
}

export default function BillingPage() {
  // useSearchParams needs a Suspense boundary under the App Router.
  return (
    <Suspense fallback={null}>
      <BillingPageBody />
    </Suspense>
  );
}

function BillingPageBody() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<SubscriptionView | null>(null);
  const [invoices, setInvoices] = useState<InvoiceView[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{
    tone: 'success' | 'warn';
    message: string;
  } | null>(null);

  useEffect(() => {
    // Stripe redirects us back with ?checkout=success|cancelled on the
    // Checkout return URL we configured on the backend. Translate those into
    // in-app banners so the owner gets feedback before the next webhook
    // reflects the new subscription state.
    const flag = searchParams.get('checkout');
    if (flag === 'success') {
      setBanner({
        tone: 'success',
        message:
          'Checkout complete. Your new plan is activating — refresh in a moment if you don\u2019t see it yet.',
      });
    } else if (flag === 'cancelled') {
      setBanner({
        tone: 'warn',
        message: 'Checkout cancelled. Your plan was not changed.',
      });
    }

    // Auto-upgrade flow: the register page redirects here with ?upgrade=pro
    // (or business) for guests who clicked a paid-plan CTA on the landing
    // page. We start Stripe Checkout immediately so the user goes from
    // registration → Stripe in one smooth redirect chain.
    const upgradeTarget = searchParams.get('upgrade');
    if (upgradeTarget === 'pro' || upgradeTarget === 'business') {
      api
        .createCheckout(upgradeTarget)
        .then((res) => {
          window.location.href = res.url;
        })
        .catch(() => {
          // Stripe not configured (dev) or transient error — fall through
          // to the normal billing page so the user can retry manually.
          setBanner({
            tone: 'warn',
            message: `Could not start ${upgradeTarget === 'pro' ? 'Pro' : 'Business'} checkout automatically. Use the Upgrade button below.`,
          });
        });
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.getSubscription(),
      // Invoices endpoint is best-effort — failure here shouldn't block the
      // whole page, so we swallow it to an empty list.
      api.getInvoices().catch(() => [] as InvoiceView[]),
    ])
      .then(([s, inv]) => {
        if (cancelled) return;
        setData(s);
        setInvoices(inv);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your current plan, usage against limits, and which features are
          available on this tier.
        </p>
      </div>

      {banner && (
        <div
          className={`mb-6 rounded-lg p-3 text-sm ${
            banner.tone === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
          }`}
        >
          {banner.message}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          <PlanCard data={data} />
          <UsageCard data={data} />
          <FeaturesCard data={data} />
          <PlanActionsCard data={data} />
          {invoices && invoices.length > 0 && <InvoicesCard rows={invoices} />}
        </div>
      ) : (
        <Card>
          <CardBody>
            <p className="text-sm text-gray-500">
              Failed to load subscription. Try refreshing.
            </p>
          </CardBody>
        </Card>
      )}
    </DashboardShell>
  );
}

function PlanCard({ data }: { data: SubscriptionView }) {
  const trialing =
    data.status === 'trialing' &&
    data.trialEndsAt &&
    new Date(data.trialEndsAt).getTime() > Date.now();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Badge variant={PLAN_VARIANT[data.plan]}>{data.planLabel}</Badge>
            <Badge variant={STATUS_VARIANT[data.status]}>
              {STATUS_LABEL[data.status]}
            </Badge>
            {data.cancelAtPeriodEnd && (
              <Badge variant="yellow">Cancels at period end</Badge>
            )}
          </div>
          <div className="text-sm text-gray-500">
            {formatPrice(data.priceCents, data.currency)}
          </div>
        </div>
      </CardHeader>
      <CardBody>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {trialing && data.trialEndsAt && (
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">
                Trial ends
              </dt>
              <dd className="mt-1 text-gray-900">
                {new Date(data.trialEndsAt).toLocaleDateString()}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">
              Current period ends
            </dt>
            <dd className="mt-1 text-gray-900">
              {data.currentPeriodEnd
                ? new Date(data.currentPeriodEnd).toLocaleDateString()
                : '—'}
            </dd>
          </div>
        </dl>
      </CardBody>
    </Card>
  );
}

function UsageCard({ data }: { data: SubscriptionView }) {
  const rows: { label: string; bucket: UsageBucket }[] = [
    { label: 'Partners', bucket: data.usage.partners },
    { label: 'API keys', bucket: data.usage.apiKeys },
    { label: 'Conversions this period', bucket: data.usage.conversions },
  ];

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Usage</h2>
        <p className="text-xs text-gray-500 mt-1">
          Period: {new Date(data.usage.periodStart).toLocaleDateString()} →{' '}
          {new Date(data.usage.periodEnd).toLocaleDateString()}
        </p>
      </CardHeader>
      <CardBody>
        <div className="space-y-4">
          {rows.map((r) => (
            <UsageRow key={r.label} label={r.label} bucket={r.bucket} />
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function UsageRow({ label, bucket }: { label: string; bucket: UsageBucket }) {
  const percent =
    bucket.limit === null
      ? 0
      : Math.min(100, (bucket.used / Math.max(1, bucket.limit)) * 100);
  const barColor = bucket.exceeded
    ? 'bg-red-500'
    : percent > 80
      ? 'bg-yellow-500'
      : 'bg-indigo-500';
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-xs text-gray-500">
          {bucket.used.toLocaleString()} / {formatLimit(bucket.limit)}
          {bucket.exceeded && (
            <span className="ml-2 text-red-600 font-medium">limit reached</span>
          )}
        </span>
      </div>
      {bucket.limit !== null && (
        <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full transition-all ${barColor}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
}

function FeaturesCard({ data }: { data: SubscriptionView }) {
  const rows: { label: string; enabled: boolean }[] = [
    {
      label: 'Direct MMP webhook (AppsFlyer)',
      enabled: data.features.mmpWebhook,
    },
    { label: 'CSV export of payments', enabled: data.features.csvExport },
    {
      label: 'Recurring accrual rules (SaaS subscriptions)',
      enabled: data.features.recurringRules,
    },
    {
      label: 'Batch pending-payout generation',
      enabled: data.features.batchPayouts,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Features on this plan</h2>
      </CardHeader>
      <CardBody>
        <ul className="space-y-2 text-sm">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center gap-2">
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                  r.enabled
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-400'
                }`}
                aria-hidden
              >
                {r.enabled ? '✓' : '—'}
              </span>
              <span className={r.enabled ? 'text-gray-900' : 'text-gray-500'}>
                {r.label}
              </span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

/**
 * Upgrade / Downgrade / Manage subscription controls. Hits our backend
 * which brokers a Stripe Checkout or Customer Portal session and returns a
 * URL — we replace `location.href` rather than open in a new tab so the
 * Stripe return URL lands back here cleanly.
 */
function PlanActionsCard({ data }: { data: SubscriptionView }) {
  const [busy, setBusy] = useState<'pro' | 'business' | 'portal' | null>(null);
  const [error, setError] = useState('');

  const goCheckout = async (planKey: 'pro' | 'business') => {
    setBusy(planKey);
    setError('');
    try {
      const res = await api.createCheckout(planKey);
      window.location.href = res.url;
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not start checkout',
      );
      setBusy(null);
    }
  };

  const goPortal = async () => {
    setBusy('portal');
    setError('');
    try {
      const res = await api.createPortal();
      window.location.href = res.url;
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not open portal',
      );
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Manage subscription</h2>
      </CardHeader>
      <CardBody>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          {data.plan !== 'pro' && (
            <Button
              variant={data.plan === 'free' ? 'primary' : 'secondary'}
              loading={busy === 'pro'}
              onClick={() => goCheckout('pro')}
            >
              {data.plan === 'business' ? 'Switch to Pro' : 'Upgrade to Pro'}
            </Button>
          )}
          {data.plan !== 'business' && (
            <Button
              variant={data.plan === 'free' ? 'secondary' : 'primary'}
              loading={busy === 'business'}
              onClick={() => goCheckout('business')}
            >
              Upgrade to Business
            </Button>
          )}
          {data.plan !== 'free' && (
            <Button
              variant="secondary"
              loading={busy === 'portal'}
              onClick={goPortal}
            >
              Manage payment method &amp; invoices
            </Button>
          )}
        </div>
        {data.plan === 'free' && (
          <p className="mt-3 text-xs text-gray-500">
            Paid plans unlock more partners, higher conversion volume, CSV
            export, direct MMP webhooks, recurring commission rules, and
            batch payouts.
          </p>
        )}
      </CardBody>
    </Card>
  );
}

function InvoicesCard({ rows }: { rows: InvoiceView[] }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Billing history</h2>
      </CardHeader>
      <CardBody>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
                <th className="py-2">Date</th>
                <th className="py-2">Period</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Status</th>
                <th className="py-2 text-right">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="py-2">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-2">
                    {r.periodStart && r.periodEnd
                      ? `${new Date(r.periodStart).toLocaleDateString()} → ${new Date(r.periodEnd).toLocaleDateString()}`
                      : '—'}
                  </td>
                  <td className="py-2">
                    {r.currency.toUpperCase()}{' '}
                    {Number(r.amountPaid || r.amountDue).toFixed(2)}
                  </td>
                  <td className="py-2">{r.status}</td>
                  <td className="py-2 text-right space-x-2">
                    {r.hostedInvoiceUrl && (
                      <a
                        href={r.hostedInvoiceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:underline"
                      >
                        View
                      </a>
                    )}
                    {r.invoicePdfUrl && (
                      <a
                        href={r.invoicePdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:underline"
                      >
                        PDF
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
