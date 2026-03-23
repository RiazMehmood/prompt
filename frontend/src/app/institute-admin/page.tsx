'use client';
import { useEffect, useState } from 'react';
import { apiFetch, getUser, AuthUser } from '@/utils/auth';

export default function InstituteAdminHome() {
  const [user, setUser]         = useState<AuthUser | null>(null);
  const [institute, setInstitute] = useState<any>(null);
  const [members, setMembers]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    if (u?.institute_id) loadData(u.institute_id);
  }, []);

  async function loadData(instituteId: string) {
    try {
      const [inst, mem] = await Promise.all([
        apiFetch<any>(`/institutes/${instituteId}`),
        apiFetch<any>(`/institutes/${instituteId}/users?page_size=5`),
      ]);
      setInstitute(inst);
      setMembers(mem.users || []);
    } catch {}
    setLoading(false);
  }

  const usedSeats = institute?.user_count ?? members.length;
  const maxSeats  = institute?.max_users ?? 0;
  const pct       = maxSeats > 0 ? Math.round((usedSeats / maxSeats) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{institute?.name ?? 'Your Institute'}</h1>
        <p className="text-gray-500 text-sm mt-1">Institute Administration Portal</p>
      </div>

      {loading ? (
        <div className="text-gray-400">Loading…</div>
      ) : (
        <>
          {/* Seat quota card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-gray-700">Seat Quota</p>
                <p className="text-3xl font-bold text-gray-900 mt-0.5">{usedSeats} <span className="text-lg text-gray-400 font-normal">/ {maxSeats}</span></p>
              </div>
              <div className={`text-2xl font-bold ${pct >= 90 ? 'text-red-600' : pct >= 70 ? 'text-amber-500' : 'text-green-600'}`}>
                {pct}%
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-green-500'}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">{maxSeats - usedSeats} seats remaining · {institute?.discount_pct ?? 0}% discount applied</p>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Plan',       value: institute?.subscription_plan ?? '—' },
              { label: 'Status',     value: institute?.status ?? '—' },
              { label: 'Domain',     value: (institute?.domains as any)?.name ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
                <p className="font-semibold text-gray-800 mt-1 capitalize">{value}</p>
              </div>
            ))}
          </div>

          {/* Recent members */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Recent Members</h2>
              <a href="/institute-admin/users" className="text-xs text-blue-600 hover:text-blue-800 font-medium">View all →</a>
            </div>
            {members.length === 0 ? (
              <p className="text-sm text-gray-400">No members yet. <a href="/institute-admin/import" className="text-blue-600 hover:underline">Import members →</a></p>
            ) : (
              <div className="space-y-2">
                {members.map(m => (
                  <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-800">{m.email}</span>
                    <span className="text-xs text-gray-400">{m.subscription_tier}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
