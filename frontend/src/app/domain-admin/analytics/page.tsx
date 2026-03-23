'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/utils/auth';

export default function DomainAnalyticsPage() {
  const [data, setData]   = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<any>('/analytics/overview').then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400 py-10 text-center">Loading analytics…</div>;
  if (error)   return <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>;

  const cards = [
    { label: 'Total Users',        value: data?.total_users ?? 0,      color: 'text-blue-700',   bg: 'bg-blue-50'   },
    { label: 'Active Subscriptions',value: data?.active_subscriptions ?? 0, color: 'text-green-700', bg: 'bg-green-50' },
    { label: 'Documents Pending',   value: data?.pending_documents ?? 0, color: 'text-amber-700',  bg: 'bg-amber-50'  },
    { label: 'Total Conversations', value: data?.total_conversations ?? 0,color: 'text-purple-700', bg: 'bg-purple-50' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className={`rounded-2xl p-5 ${c.bg}`}>
            <p className={`text-xs font-medium uppercase tracking-wide ${c.color} opacity-70`}>{c.label}</p>
            <p className={`text-3xl font-bold mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {data?.subscriptions_by_tier && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Subscriptions by Tier</h2>
          <div className="space-y-3">
            {Object.entries(data.subscriptions_by_tier as Record<string,number>).map(([tier, count]) => {
              const max = Math.max(...Object.values(data.subscriptions_by_tier as Record<string,number>));
              return (
                <div key={tier} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-20 capitalize">{tier}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-gray-700 h-2 rounded-full" style={{ width: `${(count/max)*100}%` }} />
                  </div>
                  <span className="text-xs text-gray-600 w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
