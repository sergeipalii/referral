'use client';

import { usePartnerAuth } from '@/contexts/partner-auth-context';
import { PartnerShell } from '@/components/partner/partner-shell';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function PartnerDashboardPage() {
  return (
    <PartnerShell>
      <Dashboard />
    </PartnerShell>
  );
}

function Dashboard() {
  // Safe inside PartnerShell — shell guarantees `partner` is populated.
  const { partner } = usePartnerAuth();
  if (!partner) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {partner.name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          This is your partner portal. Stats, payouts, and settings will appear
          here as the program owner tracks your conversions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Your profile</h2>
        </CardHeader>
        <CardBody>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">
                Name
              </dt>
              <dd className="mt-1 text-gray-900">{partner.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">
                Referral code
              </dt>
              <dd className="mt-1">
                <code className="bg-gray-100 px-2 py-0.5 rounded text-gray-900">
                  {partner.code}
                </code>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">
                Email
              </dt>
              <dd className="mt-1 text-gray-900">{partner.email || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">
                Status
              </dt>
              <dd className="mt-1">
                <Badge variant={partner.isActive ? 'green' : 'gray'}>
                  {partner.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </dd>
            </div>
            {partner.description && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase text-gray-500">
                  Description
                </dt>
                <dd className="mt-1 text-gray-900">{partner.description}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">
                Joined
              </dt>
              <dd className="mt-1 text-gray-900">
                {new Date(partner.createdAt).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">
                Last sign-in
              </dt>
              <dd className="mt-1 text-gray-900">
                {partner.lastLoginAt
                  ? new Date(partner.lastLoginAt).toLocaleString()
                  : '—'}
              </dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Coming soon</h2>
        </CardHeader>
        <CardBody>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            <li>Conversion history with date filters</li>
            <li>Accruals and pay-out balance</li>
            <li>Payment records from the program</li>
            <li>Payout details (IBAN / PayPal / Wise)</li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
