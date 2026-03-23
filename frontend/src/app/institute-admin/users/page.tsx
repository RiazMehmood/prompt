'use client';
import { useEffect, useState } from 'react';
import { apiFetch, getUser } from '@/utils/auth';

interface Member { id: string; email: string; phone?: string; subscription_tier: string; created_at: string; last_login_at: string | null; }

export default function InstituteMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [instituteId, setInstituteId] = useState('');
  const PAGE_SIZE = 20;

  useEffect(() => {
    const u = getUser();
    if (u?.institute_id) { setInstituteId(u.institute_id); }
  }, []);

  useEffect(() => { if (instituteId) load(); }, [page, instituteId]);

  async function load() {
    setLoading(true); setError('');
    try {
      const d = await apiFetch<any>(`/institutes/${instituteId}/users?page=${page}&page_size=${PAGE_SIZE}`);
      setMembers(d.users || []); setTotal(d.total || 0);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Members <span className="text-gray-400 text-lg font-normal">({total})</span></h1>
        <a href="/institute-admin/import"
          className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-700 transition">
          + Bulk Import
        </a>
      </div>

      {error && <div className="bg-red-50 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Email / Phone','Tier','Joined','Last Login'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-10 text-gray-400">Loading…</td></tr>
            ) : members.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-10 text-gray-400">No members yet</td></tr>
            ) : members.map(m => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{m.email ?? m.phone}</td>
                <td className="px-4 py-3"><span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full capitalize">{m.subscription_tier}</span></td>
                <td className="px-4 py-3 text-gray-400 text-xs">{new Date(m.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{m.last_login_at ? new Date(m.last_login_at).toLocaleDateString() : 'Never'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="border-t border-gray-100 px-4 py-3 flex justify-between items-center">
            <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="text-xs px-3 py-1 border rounded-lg disabled:opacity-40">Prev</button>
              <button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)} className="text-xs px-3 py-1 border rounded-lg disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
