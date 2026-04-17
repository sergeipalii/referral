'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { PartnerShell } from '@/components/partner/partner-shell';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { partnerApi } from '@/lib/partner-api';

const COLORS = [
  '#6366f1',
  '#06b6d4',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
];

function defaultRange(): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    .toISOString()
    .slice(0, 10);
  return { from, to };
}

export default function PartnerAnalyticsPage() {
  return (
    <PartnerShell>
      <AnalyticsContent />
    </PartnerShell>
  );
}

function AnalyticsContent() {
  const [range, setRange] = useState(defaultRange);
  const [timeseries, setTimeseries] = useState<
    { date: string; conversions: number; revenue: string; accrual: string }[]
  >([]);
  const [eventBreakdown, setEventBreakdown] = useState<
    { eventName: string; conversions: number; revenue: string; accrual: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ts, eb] = await Promise.all([
        partnerApi.getAnalyticsTimeseries({
          dateFrom: range.from,
          dateTo: range.to,
        }),
        partnerApi.getAnalyticsEventBreakdown({
          dateFrom: range.from,
          dateTo: range.to,
        }),
      ]);
      setTimeseries(ts);
      setEventBreakdown(eb);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Your performance over time.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="w-40">
            <Input
              label="From"
              type="date"
              value={range.from}
              onChange={(e) =>
                setRange((r) => ({ ...r, from: e.target.value }))
              }
            />
          </div>
          <div className="w-40">
            <Input
              label="To"
              type="date"
              value={range.to}
              onChange={(e) =>
                setRange((r) => ({ ...r, to: e.target.value }))
              }
            />
          </div>
        </div>
      </div>

      {loading && timeseries.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Timeseries */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Conversions over time</h2>
            </CardHeader>
            <CardBody>
              {timeseries.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={timeseries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: string) => v.slice(5)}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="conversions"
                      stroke="#6366f1"
                      fill="#6366f1"
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500 py-10 text-center">
                  No data for this period.
                </p>
              )}
            </CardBody>
          </Card>

          {/* Event breakdown */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Event breakdown</h2>
            </CardHeader>
            <CardBody>
              {eventBreakdown.length > 0 ? (
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <ResponsiveContainer width="50%" height={250}>
                    <PieChart>
                      <Pie
                        data={eventBreakdown}
                        dataKey="conversions"
                        nameKey="eventName"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        innerRadius={50}
                      >
                        {eventBreakdown.map((_, i) => (
                          <Cell
                            key={i}
                            fill={COLORS[i % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <ul className="flex-1 space-y-2 text-sm">
                    {eventBreakdown.map((e, i) => (
                      <li
                        key={e.eventName}
                        className="flex items-center gap-2"
                      >
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{
                            backgroundColor: COLORS[i % COLORS.length],
                          }}
                        />
                        <span className="text-gray-900 font-medium">
                          {e.eventName}
                        </span>
                        <span className="text-gray-500">
                          {e.conversions}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-gray-500 py-10 text-center">
                  No data for this period.
                </p>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
