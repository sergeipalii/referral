'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { PartnerShell } from '@/components/partner/partner-shell';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { usePartnerAuth } from '@/contexts/partner-auth-context';
import { partnerApi } from '@/lib/partner-api';
import { ApiError } from '@/lib/api';

/**
 * Structured shape we nudge partners towards on the backend. The column is
 * schema-less so older records with other shapes round-trip safely — we just
 * fill in what we know and preserve anything else (via `...existing`).
 */
interface PayoutDetailsForm {
  method: string;
  details: string;
  notes: string;
}

const METHOD_OPTIONS = [
  { value: '', label: 'Select method' },
  { value: 'bank', label: 'Bank transfer / IBAN' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'wise', label: 'Wise' },
  { value: 'crypto', label: 'Crypto wallet' },
  { value: 'other', label: 'Other' },
];

const PLACEHOLDER: Record<string, string> = {
  bank: 'IBAN DE89 3704 0044 0532 0130 00 — Commerzbank',
  paypal: 'your.paypal.email@example.com',
  wise: '@wiseusername or email',
  crypto: 'USDT (TRC20): T... / BTC: bc1... / ETH: 0x...',
  other: 'Describe how you prefer to receive payouts',
};

export default function PartnerSettingsPage() {
  return (
    <PartnerShell>
      <Settings />
    </PartnerShell>
  );
}

function Settings() {
  const { partner, refresh } = usePartnerAuth();
  const [description, setDescription] = useState('');
  const [payout, setPayout] = useState<PayoutDetailsForm>({
    method: '',
    details: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Seed the form from the current `partner` once it's available. The existing
  // payoutDetails may have extra keys — keep them in a ref so we can merge
  // back on save (see handleSubmit).
  useEffect(() => {
    if (!partner) return;
    setDescription(partner.description ?? '');
    const pd = (partner.payoutDetails ?? {}) as Record<string, unknown>;
    setPayout({
      method: typeof pd.method === 'string' ? pd.method : '',
      details: typeof pd.details === 'string' ? pd.details : '',
      notes: typeof pd.notes === 'string' ? pd.notes : '',
    });
  }, [partner]);

  if (!partner) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const existing = (partner.payoutDetails ?? {}) as Record<string, unknown>;
      // Merge so unknown keys set by older versions or by the owner are
      // preserved. Empty-out the three structured fields if they're blank.
      const merged: Record<string, unknown> = {
        ...existing,
        method: payout.method || null,
        details: payout.details || null,
        notes: payout.notes || null,
      };
      await partnerApi.updateSelf({
        description,
        payoutDetails:
          payout.method || payout.details || payout.notes ? merged : null,
      });
      await refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Update how you&apos;re described in the program and where payouts
          should be sent.
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Your profile</h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {saved && (
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
                Saved.
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell the program owner a bit about yourself or your audience (optional)"
              />
            </div>

            <div className="border-t border-gray-200 pt-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Payout details
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Shown to the program owner on the payment CSV they use to
                  issue payouts. Fields are free-form — include everything
                  needed to receive a transfer.
                </p>
              </div>

              <Select
                label="Method"
                value={payout.method}
                onChange={(e) =>
                  setPayout((p) => ({ ...p, method: e.target.value }))
                }
                options={METHOD_OPTIONS}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Details
                </label>
                <textarea
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  rows={3}
                  value={payout.details}
                  onChange={(e) =>
                    setPayout((p) => ({ ...p, details: e.target.value }))
                  }
                  placeholder={
                    PLACEHOLDER[payout.method] ||
                    'Account number, email, wallet address, etc.'
                  }
                />
              </div>

              <Input
                label="Notes (optional)"
                value={payout.notes}
                onChange={(e) =>
                  setPayout((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="Preferred currency, minimum threshold, tax ID, etc."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
              <Button type="submit" loading={saving}>
                Save
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Account</h2>
        </CardHeader>
        <CardBody>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">
                Name
              </dt>
              <dd className="mt-1 text-gray-900">{partner.name}</dd>
              <p className="text-xs text-gray-500 mt-1">
                Set by the program owner.
              </p>
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
              <dd className="mt-1 text-gray-900">{partner.email}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>
    </div>
  );
}
