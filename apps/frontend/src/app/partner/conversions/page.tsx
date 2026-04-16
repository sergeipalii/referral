'use client';

import { useCallback, useEffect, useState } from 'react';
import { PartnerShell } from '@/components/partner/partner-shell';
import { Card, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, Thead, Th, Td } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { partnerApi } from '@/lib/partner-api';
import type { ConversionEvent, PaginatedResponse } from '@/lib/types';

export default function PartnerConversionsPage() {
  return (
    <PartnerShell>
      <Conversions />
    </PartnerShell>
  );
}

function Conversions() {
  const [data, setData] = useState<PaginatedResponse<ConversionEvent> | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [eventName, setEventName] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await partnerApi.getConversions({
        page,
        limit: 20,
        eventName: eventName || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [page, eventName, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Conversions</h1>
        <p className="mt-1 text-sm text-gray-500">
          Every tracked event attributed to your referral code.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <Input
                label="Event name"
                placeholder="e.g. signup, purchase"
                value={eventName}
                onChange={(e) => {
                  setEventName(e.target.value);
                  setPage(1);
                }}
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
                  <Th>Date</Th>
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
        ) : (
          <EmptyState
            title="No conversions yet"
            description={
              eventName || dateFrom || dateTo
                ? 'No conversions match the current filters.'
                : 'Conversions attributed to you will appear here once they start coming in.'
            }
          />
        )}
      </Card>
    </div>
  );
}
