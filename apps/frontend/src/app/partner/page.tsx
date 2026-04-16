'use client';

import { useEffect, useState } from 'react';
import { PartnerShell } from '@/components/partner/partner-shell';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { partnerApi } from '@/lib/partner-api';
import type { PartnerDashboard } from '@/lib/types';

export default function PartnerDashboardPage() {
  return (
    <PartnerShell>
      <Dashboard />
    </PartnerShell>
  );
}

function Dashboard() {
  const [data, setData] = useState<PartnerDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    partnerApi
      .getDashboard()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your performance in the program at a glance.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Total conversions"
              value={data.totalConversions.toLocaleString()}
            />
            <MetricCard
              label="Total accrued"
              value={Number(data.totalAccrued).toFixed(2)}
            />
            <MetricCard
              label="Total paid"
              value={Number(data.totalPaid).toFixed(2)}
            />
            <MetricCard
              label="Balance"
              value={Number(data.balance).toFixed(2)}
              tone={Number(data.balance) > 0 ? 'positive' : 'neutral'}
            />
          </div>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Details</h2>
            </CardHeader>
            <CardBody>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <DetailItem
                  label="Pending payments"
                  value={Number(data.pendingPayments).toFixed(2)}
                />
                <DetailItem
                  label="Last conversion"
                  value={
                    data.lastConversionDate
                      ? new Date(data.lastConversionDate).toLocaleDateString()
                      : 'Never'
                  }
                />
                <DetailItem
                  label="Referral code"
                  value={
                    <code className="bg-gray-100 px-2 py-0.5 rounded text-gray-900">
                      {data.partnerCode}
                    </code>
                  }
                />
                <DetailItem
                  label="Partner"
                  value={
                    <>
                      {data.partnerName}{' '}
                      <Badge variant="gray">active</Badge>
                    </>
                  }
                />
              </dl>
            </CardBody>
          </Card>
        </>
      ) : (
        <Card>
          <CardBody>
            <p className="text-sm text-gray-500">
              Failed to load your dashboard. Refresh the page or sign in again.
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'positive' | 'neutral';
}) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
        <p
          className={`mt-2 text-2xl font-bold ${
            tone === 'positive' ? 'text-green-700' : 'text-gray-900'
          }`}
        >
          {value}
        </p>
      </CardBody>
    </Card>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-gray-500">{label}</dt>
      <dd className="mt-1 text-gray-900 flex items-center gap-2">{value}</dd>
    </div>
  );
}
