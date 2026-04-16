'use client';

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Thead, Th, Td } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { api, ApiError } from '@/lib/api';
import type {
  Payment,
  Partner,
  PartnerBalance,
  PaginatedResponse,
  BatchPaymentsResult,
} from '@/lib/types';

/**
 * Trigger a file download for the given text blob in the browser. Used for
 * CSV export — keeps the click-initiated download behaviour but flows through
 * an authenticated fetch first.
 */
function saveTextAs(text: string, filename: string, type = 'text/csv') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const statusVariant = {
  pending: 'yellow' as const,
  completed: 'green' as const,
  cancelled: 'red' as const,
};

export default function PaymentsPage() {
  const [data, setData] = useState<PaginatedResponse<Payment> | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [balances, setBalances] = useState<PartnerBalance[]>([]);
  const [page, setPage] = useState(1);
  const [filterPartner, setFilterPartner] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [pays, p] = await Promise.all([
      api.getPayments({
        page,
        limit: 20,
        partnerId: filterPartner || undefined,
        status: filterStatus || undefined,
      }),
      api.getPartners({ limit: 100 }),
    ]);
    setData(pays);
    setPartners(p.data);

    // Load balances for active partners
    const bals = await Promise.all(
      p.data
        .filter((x) => x.isActive)
        .slice(0, 10)
        .map((x) => api.getPartnerBalance(x.id).catch(() => null)),
    );
    setBalances(bals.filter((b): b is PartnerBalance => b !== null));
  }, [page, filterPartner, filterStatus]);

  useEffect(() => {
    load();
  }, [load]);

  const partnerName = (id: string) =>
    partners.find((p) => p.id === id)?.name || id.slice(0, 8);

  const handleDelete = async (p: Payment) => {
    if (!confirm('Delete this payment?')) return;
    await api.deletePayment(p.id);
    load();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const csv = await api.exportPaymentsCsv({
        partnerId: filterPartner || undefined,
        status: filterStatus || undefined,
      });
      const today = new Date().toISOString().slice(0, 10);
      saveTextAs(csv, `payments-${today}.csv`);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <DashboardShell>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Payments</h1>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="secondary"
            onClick={handleExport}
            loading={exporting}
          >
            Export CSV
          </Button>
          <Button variant="secondary" onClick={() => setBatchOpen(true)}>
            Generate pending payouts
          </Button>
          <Button onClick={() => setModalOpen(true)}>Record Payment</Button>
        </div>
      </div>

      {/* Balance cards */}
      {balances.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
          {balances.map((b) => (
            <Card key={b.partnerId}>
              <CardBody>
                <p className="text-sm text-gray-500">{b.partnerName}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Accrued:</span>{' '}
                    <span className="font-medium">
                      {Number(b.totalAccrued).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Paid:</span>{' '}
                    <span className="font-medium">
                      {Number(b.totalPaid).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Balance:</span>{' '}
                    <span className="font-bold text-indigo-600">
                      {Number(b.balance).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Pending:</span>{' '}
                    <span className="font-medium">
                      {Number(b.pendingPayments).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <div className="w-48">
          <Select
            value={filterPartner}
            onChange={(e) => {
              setFilterPartner(e.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All partners' },
              ...partners.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
        </div>
        <div className="w-40">
          <Select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'pending', label: 'Pending' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
        </div>
      </div>

      <Card>
        {data && data.data.length > 0 ? (
          <>
            <Table>
              <Thead>
                <tr>
                  <Th>Partner</Th>
                  <Th>Amount</Th>
                  <Th>Status</Th>
                  <Th>Period</Th>
                  <Th>Reference</Th>
                  <Th>Date</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </Thead>
              <tbody className="divide-y divide-gray-200">
                {data.data.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <Td>{partnerName(p.partnerId)}</Td>
                    <Td className="font-medium">
                      {Number(p.amount).toFixed(2)}
                    </Td>
                    <Td>
                      <Badge variant={statusVariant[p.status]}>
                        {p.status}
                      </Badge>
                    </Td>
                    <Td>
                      {p.periodStart && p.periodEnd
                        ? `${p.periodStart} - ${p.periodEnd}`
                        : '-'}
                    </Td>
                    <Td>{p.reference || '-'}</Td>
                    <Td>{new Date(p.createdAt).toLocaleDateString()}</Td>
                    <Td className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(p)}
                      >
                        Delete
                      </Button>
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
            title="No payments"
            description="Record your first payment to a partner."
            action={
              <Button onClick={() => setModalOpen(true)}>Record Payment</Button>
            }
          />
        ) : null}
      </Card>

      <PaymentModal
        open={modalOpen}
        partners={partners}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          load();
        }}
        error={error}
        setError={setError}
      />

      <BatchPayoutsModal
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        onSaved={() => {
          setBatchOpen(false);
          load();
        }}
      />
    </DashboardShell>
  );
}

/**
 * "Generate pending payouts" — creates one pending payment per partner with
 * positive balance for the given period. Owner then reviews / exports / marks
 * completed as each is actually paid out.
 */
function BatchPayoutsModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [minAmount, setMinAmount] = useState('0');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BatchPaymentsResult | null>(null);

  useEffect(() => {
    if (open) {
      // Default to previous month
      const now = new Date();
      const firstOfThisMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      );
      const firstOfLastMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
      );
      const lastOfLastMonth = new Date(
        firstOfThisMonth.getTime() - 24 * 60 * 60 * 1000,
      );
      setPeriodStart(firstOfLastMonth.toISOString().slice(0, 10));
      setPeriodEnd(lastOfLastMonth.toISOString().slice(0, 10));
      setMinAmount('0');
      setReference('');
      setError('');
      setResult(null);
    }
  }, [open]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.createBatchPayments({
        periodStart,
        periodEnd,
        minAmount: Number(minAmount) || 0,
        reference: reference || undefined,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Batch failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={result ? onSaved : onClose}
      title={result ? 'Pending payouts created' : 'Generate pending payouts'}
    >
      {result ? (
        <div className="space-y-4">
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-1 text-sm text-green-800">
            <p>
              <strong>{result.created}</strong> pending payment
              {result.created === 1 ? '' : 's'} created, totalling{' '}
              <strong>{Number(result.totalAmount).toFixed(2)}</strong>.
            </p>
            {result.skippedPartners > 0 && (
              <p className="text-green-700">
                Skipped {result.skippedPartners} partner
                {result.skippedPartners === 1 ? '' : 's'} with insufficient
                balance.
              </p>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Review them in the list below, export a CSV for your bank/finance
            team, and mark them <code>completed</code> once paid.
          </p>
          <div className="flex justify-end">
            <Button onClick={onSaved}>Done</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <p className="text-xs text-gray-500">
            One pending payment per active partner with positive balance. The
            period fields only tag the payment records — the amount is each
            partner&apos;s full unpaid balance right now.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Period start"
              type="date"
              required
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
            <Input
              label="Period end"
              type="date"
              required
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
          </div>
          <Input
            label="Skip partners below"
            type="number"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            placeholder="e.g. 10 — ignore balances below this amount"
          />
          <Input
            label="Reference (optional)"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. Q1-2026-batch"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Generate
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function PaymentModal({
  open,
  partners,
  onClose,
  onSaved,
  error,
  setError,
}: {
  open: boolean;
  partners: Partner[];
  onClose: () => void;
  onSaved: () => void;
  error: string;
  setError: (e: string) => void;
}) {
  const [partnerId, setPartnerId] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('completed');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setPartnerId(partners[0]?.id || '');
      setAmount('');
      setStatus('completed');
      setReference('');
      setNotes('');
      setPeriodStart('');
      setPeriodEnd('');
      setError('');
    }
  }, [open, partners, setError]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.createPayment({
        partnerId,
        amount,
        status,
        reference: reference || undefined,
        notes: notes || undefined,
        periodStart: periodStart || undefined,
        periodEnd: periodEnd || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Record Payment">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <Select
          label="Partner"
          required
          value={partnerId}
          onChange={(e) => setPartnerId(e.target.value)}
          options={partners.map((p) => ({ value: p.id, label: p.name }))}
        />
        <Input
          label="Amount"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 100.00"
        />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: 'completed', label: 'Completed' },
            { value: 'pending', label: 'Pending' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Period Start"
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
          />
          <Input
            label="Period End"
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
          />
        </div>
        <Input
          label="Reference"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Invoice #, transaction ID, etc."
        />
        <Input
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Record
          </Button>
        </div>
      </form>
    </Modal>
  );
}
