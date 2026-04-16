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
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { api, ApiError } from '@/lib/api';
import type {
  AccrualRule,
  AccrualRuleType,
  Partner,
  PaginatedResponse,
} from '@/lib/types';

const RULE_TYPE_LABELS: Record<AccrualRuleType, string> = {
  fixed: 'Fixed per event',
  percentage: 'Percent of revenue',
  recurring_fixed: 'Recurring (fixed)',
  recurring_percentage: 'Recurring (%)',
};

const RULE_TYPE_VARIANT: Record<
  AccrualRuleType,
  'blue' | 'yellow' | 'green' | 'red'
> = {
  fixed: 'blue',
  percentage: 'yellow',
  recurring_fixed: 'green',
  recurring_percentage: 'green',
};

function isRecurring(type: AccrualRuleType): boolean {
  return type === 'recurring_fixed' || type === 'recurring_percentage';
}

function isPercentage(type: AccrualRuleType): boolean {
  return type === 'percentage' || type === 'recurring_percentage';
}

function formatDuration(months: number | null): string {
  if (months === null) return 'forever';
  return `${months} mo`;
}

export default function RulesPage() {
  const [data, setData] = useState<PaginatedResponse<AccrualRule> | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AccrualRule | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [rules, p] = await Promise.all([
      api.getRules({ page, limit: 20 }),
      api.getPartners({ limit: 100 }),
    ]);
    setData(rules);
    setPartners(p.data);
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const partnerName = (id: string | null) => {
    if (!id) return 'Global';
    return partners.find((p) => p.id === id)?.name || id.slice(0, 8);
  };

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (r: AccrualRule) => {
    setEditing(r);
    setModalOpen(true);
  };

  const handleDelete = async (r: AccrualRule) => {
    if (!confirm('Delete this rule?')) return;
    await api.deleteRule(r.id);
    load();
  };

  return (
    <DashboardShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Accrual Rules</h1>
        <Button onClick={openCreate}>Add Rule</Button>
      </div>

      <Card>
        {data && data.data.length > 0 ? (
          <>
            <Table>
              <Thead>
                <tr>
                  <Th>Event Name</Th>
                  <Th>Partner</Th>
                  <Th>Type</Th>
                  <Th>Amount</Th>
                  <Th>Window</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </Thead>
              <tbody className="divide-y divide-gray-200">
                {data.data.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <Td>
                      <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                        {r.eventName}
                      </code>
                    </Td>
                    <Td>{partnerName(r.partnerId)}</Td>
                    <Td>
                      <Badge variant={RULE_TYPE_VARIANT[r.ruleType]}>
                        {RULE_TYPE_LABELS[r.ruleType]}
                      </Badge>
                    </Td>
                    <Td>
                      {isPercentage(r.ruleType) ? `${r.amount}%` : r.amount}
                    </Td>
                    <Td>
                      {isRecurring(r.ruleType)
                        ? formatDuration(r.recurrenceDurationMonths)
                        : '—'}
                    </Td>
                    <Td>
                      <Badge variant={r.isActive ? 'green' : 'gray'}>
                        {r.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(r)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(r)}
                        >
                          Delete
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {data.meta && (
              <Pagination meta={data.meta} onPageChange={setPage} />
            )}
          </>
        ) : data ? (
          <EmptyState
            title="No rules yet"
            description="Create accrual rules to define how conversions are valued."
            action={<Button onClick={openCreate}>Add Rule</Button>}
          />
        ) : null}
      </Card>

      <RuleModal
        open={modalOpen}
        rule={editing}
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

function RuleModal({
  open,
  rule,
  partners,
  onClose,
  onSaved,
  error,
  setError,
}: {
  open: boolean;
  rule: AccrualRule | null;
  partners: Partner[];
  onClose: () => void;
  onSaved: () => void;
  error: string;
  setError: (e: string) => void;
}) {
  const [partnerId, setPartnerId] = useState('');
  const [eventName, setEventName] = useState('');
  const [ruleType, setRuleType] = useState<AccrualRuleType>('fixed');
  const [amount, setAmount] = useState('');
  const [revenueProperty, setRevenueProperty] = useState('');
  const [durationEnabled, setDurationEnabled] = useState(false);
  const [durationMonths, setDurationMonths] = useState('12');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setPartnerId(rule?.partnerId || '');
      setEventName(rule?.eventName || '');
      setRuleType(rule?.ruleType || 'fixed');
      setAmount(rule?.amount || '');
      setRevenueProperty(rule?.revenueProperty || '');
      setDurationEnabled(rule?.recurrenceDurationMonths != null);
      setDurationMonths(
        rule?.recurrenceDurationMonths
          ? String(rule.recurrenceDurationMonths)
          : '12',
      );
      setError('');
    }
  }, [open, rule, setError]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Only send recurrenceDurationMonths when it actually applies — the
      // backend ignores it for non-recurring types anyway, but sending null
      // vs a number is semantically different (null = forever).
      const recurrenceDurationMonths = isRecurring(ruleType)
        ? durationEnabled
          ? Number(durationMonths) || 1
          : null
        : undefined;

      if (rule) {
        await api.updateRule(rule.id, {
          eventName,
          ruleType,
          amount,
          revenueProperty: revenueProperty || undefined,
          recurrenceDurationMonths,
        });
      } else {
        await api.createRule({
          partnerId: partnerId || undefined,
          eventName,
          ruleType,
          amount,
          revenueProperty: revenueProperty || undefined,
          recurrenceDurationMonths,
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
      title={rule ? 'Edit Rule' : 'Create Rule'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {!rule && (
          <Select
            label="Partner (optional)"
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
            options={[
              { value: '', label: 'Global (all partners)' },
              ...partners.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
        )}
        <Input
          label="Event Name"
          required
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
          placeholder="e.g. purchase, af_subscribe"
        />
        <Select
          label="Rule Type"
          value={ruleType}
          onChange={(e) => setRuleType(e.target.value as AccrualRuleType)}
          options={[
            { value: 'fixed', label: 'Fixed — one-off payout per event' },
            { value: 'percentage', label: 'Percent of revenue — one-off' },
            {
              value: 'recurring_fixed',
              label: 'Recurring fixed — pays every matching event',
            },
            {
              value: 'recurring_percentage',
              label: 'Recurring percent — pays every matching event',
            },
          ]}
        />
        {isRecurring(ruleType) && (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-900 space-y-2">
            <p>
              <strong>Recurring rules</strong> require an{' '}
              <code className="bg-white/50 px-1 rounded">externalUserId</code>{' '}
              on each tracked event. The partner is credited on every matching
              event while the attribution window is open.
            </p>
          </div>
        )}
        <Input
          label={isPercentage(ruleType) ? 'Percentage' : 'Amount'}
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={isPercentage(ruleType) ? 'e.g. 10' : 'e.g. 5.00'}
        />
        {isPercentage(ruleType) && (
          <Input
            label="Revenue Property"
            value={revenueProperty}
            onChange={(e) => setRevenueProperty(e.target.value)}
            placeholder="Event property name for revenue (informational)"
          />
        )}
        {isRecurring(ruleType) && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={durationEnabled}
                onChange={(e) => setDurationEnabled(e.target.checked)}
                className="rounded border-gray-300"
              />
              Limit attribution window
            </label>
            {durationEnabled ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  required
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-gray-500">
                  months from first conversion
                </span>
              </div>
            ) : (
              <p className="text-xs text-gray-500 ml-6">
                Unlimited — partner earns as long as the user keeps
                converting.
              </p>
            )}
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {rule ? 'Save' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
