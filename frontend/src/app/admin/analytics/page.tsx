'use client';
import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

function getAuthHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: getAuthHeader() });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail ?? 'Request failed');
  return data;
}

function KPICard({ title, value, sub }: { title: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-24 truncate">{item.label}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-2">
            <div
              className="bg-gray-800 h-2 rounded-full transition-all"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
          <span className="text-xs font-medium text-gray-700 w-8 text-right">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

const formatDateRange = (from: string, to: string) => `${from} → ${to}`;

export default function AnalyticsDashboard() {
  const [overview, setOverview] = useState<any>(null);
  const [subStats, setSubStats] = useState<any>(null);
  const [docStats, setDocStats] = useState<any>(null);
  const [domainStats, setDomainStats] = useState<any>(null);
  const [tokenStats, setTokenStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Default: last 30 days
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    loadAll();
  }, [fromDate, toDate]);

  const loadAll = async () => {
    setLoading(true);
    setError('');
    const qs = `?from_date=${fromDate}&to_date=${toDate}`;
    try {
      const [ov, sub, doc, dom, tok] = await Promise.all([
        apiFetch<any>(`/analytics/overview${qs}`),
        apiFetch<any>(`/analytics/subscriptions${qs}`),
        apiFetch<any>(`/analytics/documents${qs}`),
        apiFetch<any>(`/analytics/domains${qs}`),
        apiFetch<any>(`/analytics/tokens${qs}`),
      ]);
      setOverview(ov);
      setSubStats(sub);
      setDocStats(doc);
      setDomainStats(dom);
      setTokenStats(tok);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Platform performance metrics</p>
        </div>
        {/* Date range picker */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fromDate}
            max={toDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-gray-400 text-sm">→</span>
          <input
            type="date"
            value={toDate}
            min={fromDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading analytics…</div>
      ) : (
        <div className="space-y-6">
          {/* KPI Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard title="Total Users" value={overview?.total_users ?? '—'} />
            <KPICard
              title="Docs Generated"
              value={overview?.docs_generated ?? '—'}
              sub={formatDateRange(fromDate, toDate)}
            />
            <KPICard title="Active Subscriptions" value={overview?.active_subscriptions ?? '—'} />
            <KPICard
              title="Token Redemptions"
              value={overview?.token_redemptions ?? '—'}
              sub={formatDateRange(fromDate, toDate)}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Subscription Distribution */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-800 mb-1">Subscription Tiers</h2>
              <p className="text-xs text-gray-400 mb-4">
                Churn rate: {subStats?.churn_rate_pct ?? 0}%
              </p>
              <BarChart
                data={(subStats?.tier_distribution ?? []).map((t: any) => ({
                  label: t.tier,
                  value: t.count,
                }))}
              />
            </div>

            {/* Domain Usage */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-800 mb-4">Domain Usage</h2>
              <BarChart
                data={(domainStats?.domains ?? []).map((d: any) => ({
                  label: d.domain_name,
                  value: d.docs_generated,
                }))}
              />
              <div className="mt-4 space-y-1">
                {(domainStats?.domains ?? []).map((d: any) => (
                  <div key={d.domain_id} className="flex justify-between text-xs text-gray-500">
                    <span>{d.domain_name}</span>
                    <span>{d.active_users} users · {d.docs_generated} docs</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Document generation trend */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-800 mb-4">
              Document Generation ({docStats?.total ?? 0} total)
            </h2>
            <div className="flex gap-1 items-end h-24">
              {(docStats?.by_date ?? []).map((d: any, i: number) => {
                const max = Math.max(...(docStats?.by_date ?? []).map((x: any) => x.count), 1);
                const pct = (d.count / max) * 100;
                return (
                  <div
                    key={i}
                    title={`${d.date}: ${d.count}`}
                    className="flex-1 bg-gray-800 rounded-t hover:bg-gray-600 transition"
                    style={{ height: `${pct}%`, minHeight: 2 }}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{fromDate}</span>
              <span>{toDate}</span>
            </div>
          </div>

          {/* Token Performance */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-800 mb-4">
              Token Performance ({tokenStats?.total_redemptions_in_period ?? 0} redemptions in period)
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-semibold">Code</th>
                  <th className="pb-2 font-semibold">Discount</th>
                  <th className="pb-2 font-semibold">Domain</th>
                  <th className="pb-2 font-semibold">Period Uses</th>
                  <th className="pb-2 font-semibold">Redemption Rate</th>
                  <th className="pb-2 font-semibold">Remaining</th>
                  <th className="pb-2 font-semibold">Expires</th>
                </tr>
              </thead>
              <tbody>
                {(tokenStats?.tokens ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-gray-400 text-xs">
                      No tokens found
                    </td>
                  </tr>
                ) : (
                  (tokenStats?.tokens ?? []).map((t: any, i: number) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 font-mono font-semibold text-gray-900">{t.code}</td>
                      <td className="py-2 text-gray-600">
                        {t.discount_type === 'percentage'
                          ? `${t.discount_value}%`
                          : `PKR ${t.discount_value}`}
                      </td>
                      <td className="py-2 text-gray-500">{t.domain_name ?? 'All'}</td>
                      <td className="py-2 text-gray-700">{t.period_uses}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-100 rounded-full h-1.5">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full"
                              style={{ width: `${t.redemption_rate_pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">{t.redemption_rate_pct}%</span>
                        </div>
                      </td>
                      <td className="py-2 text-gray-500">{t.remaining_uses}</td>
                      <td className="py-2 text-xs text-gray-400">
                        {new Date(t.valid_until).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
