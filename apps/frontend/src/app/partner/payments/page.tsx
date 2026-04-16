'use client';

import { useCallback, useEffect, useState } from 'react';
import { PartnerShell } from '@/components/partner/partner-shell';
import { Card, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, Thead, Th, Td } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { partnerApi } from '@/lib/partner-api';
import type { PaginatedResponse, Payment } from '@/lib/types';

type StatusFilter = '' | 'pending' | 'completed' | 'cancelled';

const statusVariant: Record<
  Payment['status'],
  'green' | 'yellow' | 'red'
> = {
  completed: 'green',
  pending: 'yellow',
  cancelled: 'red',
};

export default function PartnerPaymentsPage() {
  return (
    <PartnerShell>
      <Payments />
    </PartnerShell>
  );
}

function Payments() {
  const [data, setData] = useState<PaginatedResponse<Payment> | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await partnerApi.getPayments({
        page,
        limit: 20,
        status: status || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [page, status, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="mt-1 text-sm text-gray-500">
          Payouts recorded by the program owner. Statuses are updated manually
          as payments are processed.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <Select
                label="Status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as StatusFilter);
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
            <div className="w-40">
              <Input
                label="From"
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="w-40">
              <Input
                label="To"
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        {loading && !data ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        ) : data && data.data.length > 0 ? (
          <>
            <Table>
              <Thead>
                <tr>
                  <Th>Created</Th>
                  <Th>Period</Th>
                  <Th>Amount</Th>
                  <Th>Status</Th>
                  <Th>Paid at</Th>
                  <Th>Reference</Th>
                </tr>
              </Thead>
              <tbody className="divide-y divide-gray-200">
                {data.data.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <Td>{new Date(p.createdAt).toLocaleDateString()}</Td>
                    <Td>
                      {p.periodStart && p.periodEnd
                        ? `${p.periodStart} → ${p.periodEnd}`
                        : '—'}
                    </Td>
                    <Td className="font-medium">
                      {Number(p.amount).toFixed(2)}
                    </Td>
                    <Td>
                      <Badge variant={statusVariant[p.status]}>
                        {p.status}
                      </Badge>
                    </Td>
                    <Td>
                      {p.paidAt
                        ? new Date(p.paidAt).toLocaleDateString()
                        : '—'}
                    </Td>
                    <Td>
                      {p.reference ? (
                        <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                          {p.reference}
                        </code>
                      ) : (
                        '—'
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {data.meta && (
              <Pagination meta={data.meta} onPageChange={setPage} />
            )}
          </>
        ) : (
          <EmptyState
            title="No payments yet"
            description={
              status || dateFrom || dateTo
                ? 'No payments match the current filters.'
                : 'When the program owner pays you out, records will show up here.'
            }
          />
        )}
      </Card>
    </div>
  );
}
