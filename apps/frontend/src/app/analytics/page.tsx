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
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

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

function pctChange(current: number, prev: number): string {
  if (prev === 0) return current > 0 ? '+100%' : '—';
  const pct = ((current - prev) / prev) * 100;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(0)}%`;
}

export default function AnalyticsPage() {
  const [range, setRange] = useState(defaultRange);
  const [kpis, setKpis] = useState<Awaited<
    ReturnType<typeof api.getAnalyticsKpis>
  > | null>(null);
  const [timeseries, setTimeseries] = useState<
    Awaited<ReturnType<typeof api.getAnalyticsTimeseries>>
  >([]);
  const [topPartners, setTopPartners] = useState<
    Awaited<ReturnType<typeof api.getAnalyticsTopPartners>>
  >([]);
  const [eventBreakdown, setEventBreakdown] = useState<
    Awaited<ReturnType<typeof api.getAnalyticsEventBreakdown>>
  >([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [k, ts, tp, eb] = await Promise.all([
        api.getAnalyticsKpis({
          dateFrom: range.from,
          dateTo: range.to,
        }),
        api.getAnalyticsTimeseries({
          dateFrom: range.from,
          dateTo: range.to,
        }),
        api.getAnalyticsTopPartners({
          dateFrom: range.from,
          dateTo: range.to,
          limit: 10,
        }),
        api.getAnalyticsEventBreakdown({
          dateFrom: range.from,
          dateTo: range.to,
        }),
      ]);
      setKpis(k);
      setTimeseries(ts);
      setTopPartners(tp);
      setEventBreakdown(eb);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <DashboardShell>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
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

      {loading && !kpis ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI cards */}
          {kpis && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Conversions"
                value={kpis.totalConversions.toLocaleString()}
                change={pctChange(
                  kpis.totalConversions,
                  kpis.prev.totalConversions,
                )}
              />
              <KpiCard
                label="Revenue"
                value={Number(kpis.totalRevenue).toFixed(2)}
                change={pctChange(
                  Number(kpis.totalRevenue),
                  Number(kpis.prev.totalRevenue),
                )}
              />
              <KpiCard
                label="Accrued"
                value={Number(kpis.totalAccrual).toFixed(2)}
                change={pctChange(
                  Number(kpis.totalAccrual),
                  Number(kpis.prev.totalAccrual),
                )}
              />
              <KpiCard
                label="Paid"
                value={Number(kpis.totalPaid).toFixed(2)}
                change={pctChange(
                  Number(kpis.totalPaid),
                  Number(kpis.prev.totalPaid),
                )}
              />
            </div>
          )}

          {/* Timeseries chart */}
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

          {/* Bottom row: top partners + event breakdown */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top partners */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Top partners</h2>
              </CardHeader>
              <CardBody>
                {topPartners.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={topPartners}
                      layout="vertical"
                      margin={{ left: 80 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis
                        dataKey="partnerName"
                        type="category"
                        tick={{ fontSize: 11 }}
                        width={75}
                      />
                      <Tooltip />
                      <Bar dataKey="conversions" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
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
                  <div className="flex items-center gap-6">
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
                        <li key={e.eventName} className="flex items-center gap-2">
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
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function KpiCard({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: string;
}) {
  const isPositive = change.startsWith('+');
  const isNeutral = change === '—';
  return (
    <Card>
      <CardBody>
        <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
        <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
        <p
          className={`mt-1 text-xs font-medium ${
            isNeutral
              ? 'text-gray-400'
              : isPositive
                ? 'text-green-600'
                : 'text-red-600'
          }`}
        >
          {change} vs prev period
        </p>
      </CardBody>
    </Card>
  );
}
