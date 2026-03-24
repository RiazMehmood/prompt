'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

interface Institute {
  id: string;
  name: string;
  domain_id: string;
  contact_email: string | null;
  subscription_plan: string;
  max_users: number;
  user_count: number;
  status: string;
  domains?: { name: string } | null;
}

interface Member {
  id: string;
  email: string;
  phone?: string;
  role: string;
  subscription_tier: string;
  document_generation_count: number;
  upload_count: number;
  created_at: string;
  last_login_at: string | null;
}

function getAuthHeader(): Record<string, string> {
  const token = typeof window !== 'undefined'
    ? (localStorage.getItem('auth_token') || localStorage.getItem('admin_token'))
    : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function InstituteDashboard() {
  const router = useRouter();
  const [institute, setInstitute] = useState<Institute | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const PAGE_SIZE = 20;

  // Add member modal
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ email: '', password: '' });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  // Remove confirm
  const [removeConfirm, setRemoveConfirm] = useState<Member | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('admin_token');
    if (!token) { router.replace('/login'); return; }
    loadData();
  }, [page]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [instRes, usersRes] = await Promise.all([
        fetch(`${API_BASE}/institutes/my`, { headers: getAuthHeader() }),
        fetch(`${API_BASE}/institutes/my/users?page=${page}&page_size=${PAGE_SIZE}`, { headers: getAuthHeader() }),
      ]);
      if (!instRes.ok) {
        const d = await instRes.json();
        throw new Error(d?.detail ?? 'Failed to load institute');
      }
      if (!usersRes.ok) {
        const d = await usersRes.json();
        throw new Error(d?.detail ?? 'Failed to load members');
      }
      const instData = await instRes.json();
      const usersData = await usersRes.json();
      setInstitute(instData);
      setMembers(usersData.users || []);
      setTotal(usersData.total || 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(''); setAddSuccess(''); setAddLoading(true);
    try {
      const res = await fetch(`${API_BASE}/institutes/my/users`, {
        method: 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.detail ?? 'Failed to add member');
      setAddSuccess(`Member added: ${d.email}`);
      setAddForm({ email: '', password: '' });
      loadData();
    } catch (e: any) {
      setAddError(e.message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!removeConfirm) return;
    setRemoveLoading(true);
    try {
      const res = await fetch(`${API_BASE}/institutes/my/users/${removeConfirm.id}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.detail ?? 'Failed to remove member');
      setRemoveConfirm(null);
      loadData();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setRemoveLoading(false);
    }
  };

  const handleLogout = () => {
    ['auth_token', 'auth_user', 'admin_token', 'admin_user', 'domain_name'].forEach(k => localStorage.removeItem(k));
    router.replace('/login');
  };

  const quotaPct = institute ? Math.round((institute.user_count / institute.max_users) * 100) : 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {institute?.name ?? 'Institute Dashboard'}
          </h1>
          <p className="text-sm text-gray-500">
            {institute?.domains?.name ?? ''}{institute?.subscription_plan ? ` · ${institute.subscription_plan}` : ''}
          </p>
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700">
          Logout
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-6">{error}</div>
        )}

        {/* Stats cards */}
        {institute && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Seats Used</p>
              <p className="text-3xl font-bold text-gray-900">{institute.user_count}</p>
              <p className="text-xs text-gray-400 mt-1">of {institute.max_users} seats</p>
              <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-2 rounded-full ${quotaPct >= 90 ? 'bg-red-500' : quotaPct >= 70 ? 'bg-yellow-400' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(quotaPct, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{quotaPct}% used</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Plan</p>
              <p className="text-2xl font-bold text-gray-900 capitalize">{institute.subscription_plan}</p>
              <p className="text-xs text-gray-400 mt-1">{institute.max_users} seat licence</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium capitalize ${
                institute.status === 'active' ? 'bg-green-100 text-green-700' :
                institute.status === 'suspended' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {institute.status}
              </span>
              {institute.contact_email && (
                <p className="text-xs text-gray-400 mt-2">{institute.contact_email}</p>
              )}
            </div>
          </div>
        )}

        {/* Members table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Members ({total})</h2>
            <button
              onClick={() => { setShowAdd(true); setAddError(''); setAddSuccess(''); }}
              disabled={institute ? institute.user_count >= institute.max_users : false}
              className="bg-gray-900 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              + Add Member
            </button>
          </div>

          {loading ? (
            <div className="text-center py-10 text-gray-400">Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Plan</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-center">Docs Generated</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-center">Uploads</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Joined</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Last Active</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-400">No members yet — add your first member</td>
                    </tr>
                  ) : members.map((m) => (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-800 font-medium">{m.email ?? m.phone ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                          {m.subscription_tier}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-700 font-semibold">{m.document_generation_count}</td>
                      <td className="px-4 py-3 text-center text-gray-700 font-semibold">{m.upload_count}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(m.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {m.last_login_at ? new Date(m.last_login_at).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        {m.role !== 'institute_admin' && (
                          <button
                            onClick={() => setRemoveConfirm(m)}
                            className="text-xs text-red-500 hover:text-red-700 font-medium"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-gray-100">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded text-sm border disabled:opacity-40 hover:bg-gray-50"
              >
                ←
              </button>
              <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded text-sm border disabled:opacity-40 hover:bg-gray-50"
              >
                →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
            <h2 className="text-lg font-bold mb-1">Add Member</h2>
            <p className="text-xs text-gray-500 mb-4">
              Creates a new account and adds them to {institute?.name}. Their subscription plan is set automatically from your institute plan. They can log in at <span className="font-medium">/login</span>.
            </p>
            {addError && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-3">{addError}</div>}
            {addSuccess && <div className="bg-green-50 text-green-700 text-sm rounded-lg p-3 mb-3">{addSuccess}</div>}
            <form onSubmit={handleAddMember} className="space-y-3">
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">Email *</label>
                <input
                  type="email" required
                  value={addForm.email}
                  onChange={e => setAddForm({ ...addForm, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">Password * (min 8 chars)</label>
                <input
                  type="password" required minLength={8}
                  value={addForm.password}
                  onChange={e => setAddForm({ ...addForm, password: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit" disabled={addLoading}
                  className="flex-1 bg-gray-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
                >
                  {addLoading ? 'Adding…' : 'Add Member'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAdd(false); setAddError(''); setAddSuccess(''); }}
                  className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Confirm Modal */}
      {removeConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 shadow-xl">
            <h2 className="text-lg font-bold mb-2 text-red-600">Remove Member?</h2>
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-medium">{removeConfirm.email}</span> will be unlinked from this institute.
            </p>
            <p className="text-xs text-gray-400 mb-5">Their account is not deleted — they just lose institute membership.</p>
            <div className="flex gap-3">
              <button
                onClick={handleRemoveMember} disabled={removeLoading}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {removeLoading ? 'Removing…' : 'Remove'}
              </button>
              <button
                onClick={() => setRemoveConfirm(null)}
                className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
