'use client';

import { useCallback, useEffect, useState } from 'react';
import { PartnerShell } from '@/components/partner/partner-shell';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { partnerApi } from '@/lib/partner-api';
import type { PromoCode } from '@/lib/types';

export default function PartnerPromoCodesPage() {
  return (
    <PartnerShell>
      <PromoCodes />
    </PartnerShell>
  );
}

function PromoCodes() {
  const [codes, setCodes] = useState<PromoCode[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    const list = await partnerApi.getPromoCodes();
    setCodes(list);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(
        () => setCopied((prev) => (prev === code ? null : prev)),
        1500,
      );
    } catch {
      // Clipboard API unavailable (older browser / insecure context) — silent.
    }
  };

  const formatUsage = (c: PromoCode) =>
    c.usageLimit == null ? `${c.usedCount} / ∞` : `${c.usedCount} / ${c.usageLimit}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Promo Codes</h1>
        <p className="mt-1 text-sm text-gray-500">
          Codes assigned to you. Share them — every conversion sent with the
          code is credited to your account.
        </p>
      </div>

      {codes && codes.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {codes.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <code className="text-lg font-mono font-semibold text-gray-900 bg-gray-100 px-2 py-1 rounded">
                  {c.code}
                </code>
                <Badge variant={c.isActive ? 'green' : 'gray'}>
                  {c.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <dl className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Usage</dt>
                  <dd className="font-mono">{formatUsage(c)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Created</dt>
                  <dd>{new Date(c.createdAt).toLocaleDateString()}</dd>
                </div>
              </dl>
              <div className="mt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copy(c.code)}
                  className="w-full"
                  disabled={!c.isActive}
                >
                  {copied === c.code ? 'Copied!' : 'Copy code'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : codes ? (
        <Card>
          <EmptyState
            title="No promo codes yet"
            description="Your program owner hasn't created any promo codes for you. Ask them to set one up if you'd like to run a coupon campaign."
          />
        </Card>
      ) : null}
    </div>
  );
}
