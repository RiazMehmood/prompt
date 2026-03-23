'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/utils/auth';

interface Sub {
  user_id: string;
  user_email?: string;
  tier: string;
  started_at?: string;
  expiry_date?: string;
  status: string;
}

export default function StaffSubscriptionsPage() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<any>('/analytics/subscriptions')
      .then(d => setSubs(d.recent_subscriptions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Subscriptions</h1>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['User', 'Tier', 'Started', 'Expiry', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">Loading…</td></tr>
            ) : subs.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">No subscription data</td></tr>
            ) : subs.map((s, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-900">{s.user_email ?? s.user_id?.slice(0, 8)}</td>
                <td className="px-4 py-3 capitalize text-gray-600">{s.tier}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{s.started_at ? new Date(s.started_at).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{s.expiry_date ? new Date(s.expiry_date).toLocaleDateString() : 'Lifetime'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {s.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
