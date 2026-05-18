'use client';

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Thead, Th, Td } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { api, ApiError } from '@/lib/api';
import type { Partner, PromoCode } from '@/lib/types';

export default function PromoCodesPage() {
  const [codes, setCodes] = useState<PromoCode[] | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filterPartnerId, setFilterPartnerId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [list, p] = await Promise.all([
      api.getPromoCodes(filterPartnerId || undefined),
      api.getPartners({ limit: 100 }),
    ]);
    setCodes(list);
    setPartners(p.data);
  }, [filterPartnerId]);

  useEffect(() => {
    load();
  }, [load]);

  const partnerName = (id: string) =>
    partners.find((p) => p.id === id)?.name || id.slice(0, 8);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (c: PromoCode) => {
    setEditing(c);
    setModalOpen(true);
  };

  const handleDelete = async (c: PromoCode) => {
    if (!confirm(`Delete promo code "${c.code}"?`)) return;
    try {
      await api.deletePromoCode(c.id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete');
    }
  };

  const handleToggleActive = async (c: PromoCode) => {
    try {
      await api.updatePromoCode(c.id, { isActive: !c.isActive });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update');
    }
  };

  const formatUsage = (c: PromoCode) =>
    c.usageLimit == null ? `${c.usedCount} / ∞` : `${c.usedCount} / ${c.usageLimit}`;

  return (
    <DashboardShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Promo Codes</h1>
        <Button onClick={openCreate}>Add Promo Code</Button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4 max-w-sm">
        <Select
          label="Filter by partner"
          value={filterPartnerId}
          onChange={(e) => setFilterPartnerId(e.target.value)}
          options={[
            { value: '', label: 'All partners' },
            ...partners.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />
      </div>

      <Card>
        {codes && codes.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Code</Th>
                <Th>Partner</Th>
                <Th>Usage</Th>
                <Th>Status</Th>
                <Th>Created</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </Thead>
            <tbody className="divide-y divide-gray-200">
              {codes.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <Td>
                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                      {c.code}
                    </code>
                  </Td>
                  <Td>{partnerName(c.partnerId)}</Td>
                  <Td className="font-mono text-sm">{formatUsage(c)}</Td>
                  <Td>
                    <Badge variant={c.isActive ? 'green' : 'gray'}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </Td>
                  <Td className="text-sm text-gray-500">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(c)}
                      >
                        {c.isActive ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(c)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(c)}
                      >
                        Delete
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : codes ? (
          <EmptyState
            title="No promo codes yet"
            description="Create codes that route conversions to a specific partner — useful for influencer campaigns, coupon drops, or test attribution."
            action={<Button onClick={openCreate}>Add Promo Code</Button>}
          />
        ) : null}
      </Card>

      <PromoCodeModal
        open={modalOpen}
        code={editing}
        partners={partners}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          load();
        }}
        error={error}
        setError={setError}
      />
    </DashboardShell>
  );
}

function PromoCodeModal({
  open,
  code,
  partners,
  onClose,
  onSaved,
  error,
  setError,
}: {
  open: boolean;
  code: PromoCode | null;
  partners: Partner[];
  onClose: () => void;
  onSaved: () => void;
  error: string;
  setError: (e: string) => void;
}) {
  const [partnerId, setPartnerId] = useState('');
  const [codeValue, setCodeValue] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setPartnerId(code?.partnerId || partners[0]?.id || '');
      setCodeValue(code?.code || '');
      setUsageLimit(code?.usageLimit != null ? String(code.usageLimit) : '');
      setIsActive(code?.isActive ?? true);
      setError('');
    }
  }, [open, code, partners, setError]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const limit = usageLimit.trim() === '' ? null : Number(usageLimit);
      if (code) {
        await api.updatePromoCode(code.id, {
          usageLimit: limit,
          isActive,
        });
      } else {
        await api.createPromoCode({
          partnerId,
          code: codeValue.trim(),
          usageLimit: limit,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={code ? 'Edit Promo Code' : 'Create Promo Code'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {code ? (
          <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700 space-y-1">
            <div>
              <span className="text-gray-500">Code:</span>{' '}
              <code className="bg-white px-1.5 py-0.5 rounded">{code.code}</code>
            </div>
            <div>
              <span className="text-gray-500">Partner:</span>{' '}
              {partners.find((p) => p.id === code.partnerId)?.name ?? '—'}
            </div>
            <p className="text-xs text-gray-500 pt-1">
              Code and partner can&apos;t be changed after creation. Delete
              and recreate if you need a different one.
            </p>
          </div>
        ) : (
          <>
            <Select
              label="Partner"
              required
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              options={partners.map((p) => ({ value: p.id, label: p.name }))}
            />
            <div>
              <Input
                label="Code"
                required
                value={codeValue}
                onChange={(e) => setCodeValue(e.target.value)}
                placeholder="e.g. ALICE10"
                maxLength={64}
              />
              <p className="mt-1 text-xs text-gray-500">
                Case-insensitive — stored as{' '}
                <code className="bg-gray-100 px-1 rounded">
                  {codeValue.trim().toLowerCase() || 'lowercase'}
                </code>
                .
              </p>
            </div>
          </>
        )}

        <div>
          <Input
            label="Usage limit"
            type="number"
            min={1}
            value={usageLimit}
            onChange={(e) => setUsageLimit(e.target.value)}
            placeholder="Leave empty for unlimited"
          />
          <p className="mt-1 text-xs text-gray-500">
            Auto-deactivates once the limit is hit.
          </p>
        </div>

        {code && (
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-gray-300"
            />
            Active (resolves on incoming conversions)
          </label>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {code ? 'Save' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
