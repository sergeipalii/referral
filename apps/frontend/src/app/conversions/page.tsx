'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, Thead, Th, Td } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { api } from '@/lib/api';
import type {
  ConversionEvent,
  Partner,
  PartnerSummary,
  PaginatedResponse,
} from '@/lib/types';

export default function ConversionsPage() {
  const [data, setData] = useState<PaginatedResponse<ConversionEvent> | null>(
    null,
  );
  const [summary, setSummary] = useState<PartnerSummary[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [page, setPage] = useState(1);
  const [partnerId, setPartnerId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(async () => {
    const [convs, summ, p] = await Promise.all([
      api.getConversions({
        page,
        limit: 20,
        partnerId: partnerId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
      api.getConversionSummary({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
      api.getPartners({ limit: 100 }),
    ]);
    setData(convs);
    setSummary(summ);
    setPartners(p.data);
  }, [page, partnerId, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  const partnerName = (id: string) =>
    partners.find((p) => p.id === id)?.name || id.slice(0, 8);

  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold mb-6">Conversions</h1>

      {/* Summary Cards */}
      {summary.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
          {summary.map((s) => (
            <Card key={s.partnerId}>
              <CardBody>
                <p className="text-sm text-gray-500">{s.partnerName}</p>
                <p className="text-2xl font-bold mt-1">
                  {Number(s.totalAccrualAmount).toFixed(2)}
                </p>
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span>{s.totalConversions} conversions</span>
                  <span>Paid: {Number(s.totalPaid).toFixed(2)}</span>
                  <span>Balance: {Number(s.balance).toFixed(2)}</span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <Select
                label="Partner"
                value={partnerId}
                onChange={(e) => {
                  setPartnerId(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: '', label: 'All partners' },
                  ...partners.map((p) => ({ value: p.id, label: p.name })),
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

      {/* Table */}
      <Card>
        {data && data.data.length > 0 ? (
          <>
            <Table>
              <Thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Partner</Th>
                  <Th>Event</Th>
                  <Th>Count</Th>
                  <Th>Revenue</Th>
                  <Th>Accrual</Th>
                </tr>
              </Thead>
              <tbody className="divide-y divide-gray-200">
                {data.data.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <Td>{c.eventDate}</Td>
                    <Td>{partnerName(c.partnerId)}</Td>
                    <Td>
                      <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                        {c.eventName}
                      </code>
                    </Td>
                    <Td>{c.count}</Td>
                    <Td>{Number(c.revenueSum).toFixed(2)}</Td>
                    <Td className="font-medium">
                      {Number(c.accrualAmount).toFixed(2)}
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
            title="No conversions"
            description="No conversions yet. Send events via the tracking API to see them here."
          />
        ) : null}
      </Card>
    </DashboardShell>
  );
}
