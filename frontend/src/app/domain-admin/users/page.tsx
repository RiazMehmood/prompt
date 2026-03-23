'use client';
import { useEffect, useState } from 'react';
import { apiFetch, authHeader, getUser, API_BASE } from '@/utils/auth';

interface User { id: string; email: string; role: string; subscription_tier: string; created_at: string; last_login_at: string | null; }

export default function DomainUsersPage() {
  const [users, setUsers]   = useState<User[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const PAGE_SIZE = 20;

  useEffect(() => { load(); }, [page]);

  async function load() {
    setLoading(true); setError('');
    const u = getUser();
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (search) params.set('search', search);
    // domain_admin automatically scoped by backend
    try {
      const d = await apiFetch<any>(`/admin/users?${params}`);
      setUsers(d.users || []); setTotal(d.total || 0);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  async function updateTier(userId: string, tier: string) {
    try {
      await apiFetch(`/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ subscription_tier: tier }),
      });
      load();
    } catch (e: any) { alert(e.message); }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Users</h1>

      <div className="flex gap-3 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()}
          placeholder="Search by email…" className="border border-gray-200 rounded-xl px-4 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-gray-300" />
        <button onClick={() => { setPage(1); load(); }} className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm hover:bg-gray-700">Search</button>
      </div>

      {error && <div className="bg-red-50 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Email','Role','Tier','Last Login','Change Tier'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">Loading…</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{u.email}</td>
                <td className="px-4 py-3"><span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{u.role}</span></td>
                <td className="px-4 py-3 text-gray-600 capitalize">{u.subscription_tier}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Never'}</td>
                <td className="px-4 py-3">
                  <select value={u.subscription_tier} onChange={e => updateTier(u.id, e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none">
                    <option value="basic">basic</option>
                    <option value="standard">standard</option>
                    <option value="premium">premium</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="border-t border-gray-100 px-4 py-3 flex justify-between items-center">
            <span className="text-xs text-gray-400">Page {page} of {totalPages} · {total} users</span>
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
