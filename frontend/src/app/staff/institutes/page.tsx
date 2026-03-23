'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/utils/auth';

interface Institute {
  id: string;
  name: string;
  domain_id: string;
  max_seats: number;
  used_seats?: number;
  subscription_tier: string;
  contact_email?: string;
  created_at: string;
}

export default function StaffInstitutesPage() {
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<Institute[]>('/institutes')
      .then(d => setInstitutes(Array.isArray(d) ? d : []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Institutes</h1>

      {error && (
        <div className="bg-red-50 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-gray-400 text-center py-10">Loading…</div>
      ) : institutes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
          No institutes found.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Name', 'Tier', 'Seats', 'Contact', 'Created'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {institutes.map(inst => {
                const pct = inst.max_seats > 0 ? Math.round(((inst.used_seats ?? 0) / inst.max_seats) * 100) : 0;
                const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-green-500';
                return (
                  <tr key={inst.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{inst.name}</td>
                    <td className="px-4 py-3 capitalize text-gray-600">{inst.subscription_tier}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{inst.used_seats ?? 0}/{inst.max_seats}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{inst.contact_email ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {inst.created_at ? new Date(inst.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
