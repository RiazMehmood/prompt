'use client';
import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

function getAuthHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {} as Record<string, string>;
}

interface Institute {
  id: string;
  name: string;
  domain_id: string;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  subscription_plan: string;
  discount_pct: number;
  max_users: number;
  status: string;
  notes: string | null;
  created_at: string;
  domains?: { name: string } | null;
  user_count?: number;
}

interface Domain {
  id: string;
  name: string;
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700',
};

export default function InstitutesPage() {
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [total, setTotal] = useState(0);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '', domain_id: '', contact_email: '', contact_phone: '',
    address: '', subscription_plan: 'bulk', discount_pct: 0, max_users: 50, notes: '',
    // admin credentials — created together with the institute
    admin_email: '', admin_password: '',
  });
  const [createError, setCreateError] = useState('');

  const [editItem, setEditItem] = useState<Institute | null>(null);
  const [editForm, setEditForm] = useState<Partial<Institute>>({});

  // "Edit Admin" modal — change password for an existing institute admin
  const [showAdminModal, setShowAdminModal] = useState<string | null>(null); // institute_id
  const [adminForm, setAdminForm] = useState({ email: '', password: '' });
  const [adminMsg, setAdminMsg] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => { fetchDomains(); }, []);
  useEffect(() => { fetchInstitutes(); }, [page, domainFilter]);

  async function fetchDomains() {
    const r = await fetch(`${API_BASE}/domains`, { headers: getAuthHeader() });
    const d = await r.json();
    setDomains(d || []);
  }

  async function fetchInstitutes() {
    setLoading(true); setError('');
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (domainFilter) params.set('domain_id', domainFilter);
    if (search) params.set('search', search);
    try {
      const r = await fetch(`${API_BASE}/institutes?${params}`, { headers: getAuthHeader() });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error?.message ?? 'Failed');
      setInstitutes(d.institutes || []);
      setTotal(d.total || 0);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  async function createInstitute(e: React.FormEvent) {
    e.preventDefault(); setCreateError('');
    // Step 1: create the institute
    const { admin_email, admin_password, ...instituteData } = form;
    const r = await fetch(`${API_BASE}/institutes`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(instituteData),
    });
    const d = await r.json();
    if (!r.ok) { setCreateError(d?.error?.message ?? d?.detail ?? 'Failed to create institute'); return; }

    // Step 2: create the admin account using the institute's contact_email as login
    const email = admin_email || form.contact_email;
    const password = admin_password;
    if (email && password) {
      const ar = await fetch(`${API_BASE}/institutes/${d.id}/create-admin`, {
        method: 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, institute_id: d.id }),
      });
      if (!ar.ok) {
        const ad = await ar.json();
        setCreateError(`Institute created but admin creation failed: ${ad?.detail ?? 'unknown error'}. Use "+ Admin" on the row to retry.`);
        fetchInstitutes();
        return;
      }
    }

    setShowCreate(false);
    setForm({ name: '', domain_id: '', contact_email: '', contact_phone: '', address: '', subscription_plan: 'bulk', discount_pct: 0, max_users: 50, notes: '', admin_email: '', admin_password: '' });
    fetchInstitutes();
  }

  async function saveEdit() {
    if (!editItem) return;
    const updates: any = {};
    if (editForm.name !== editItem.name) updates.name = editForm.name;
    if (editForm.status !== editItem.status) updates.status = editForm.status;
    if (editForm.max_users !== editItem.max_users) updates.max_users = editForm.max_users;
    if (editForm.discount_pct !== editItem.discount_pct) updates.discount_pct = editForm.discount_pct;
    if (editForm.contact_email !== editItem.contact_email) updates.contact_email = editForm.contact_email;
    if (editForm.notes !== editItem.notes) updates.notes = editForm.notes;

    const r = await fetch(`${API_BASE}/institutes/${editItem.id}`, {
      method: 'PATCH',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const d = await r.json();
    if (!r.ok) { alert(d?.error?.message ?? 'Update failed'); return; }
    setEditItem(null);
    fetchInstitutes();
  }

  async function deleteInstitute(id: string) {
    const r = await fetch(`${API_BASE}/institutes/${id}`, { method: 'DELETE', headers: getAuthHeader() });
    const d = await r.json();
    if (!r.ok) { alert(d?.error?.message ?? 'Delete failed'); return; }
    setDeleteConfirm(null);
    fetchInstitutes();
  }

  async function updateInstAdmin(e: React.FormEvent) {
    e.preventDefault(); setAdminMsg('');
    const payload: Record<string, string> = {};
    if (adminForm.email) payload.email = adminForm.email;
    if (adminForm.password) payload.password = adminForm.password;
    const r = await fetch(`${API_BASE}/institutes/${showAdminModal}/admin`, {
      method: 'PATCH',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    if (!r.ok) { setAdminMsg(d?.detail ?? 'Failed'); return; }
    setAdminMsg(`Admin updated: ${d.email}`);
    setAdminForm({ email: '', password: '' });
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Institutes</h1>
          <p className="text-gray-500 text-sm mt-1">{total} institutes · bulk-subscription organizations</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700">
          + New Institute
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-wrap gap-3">
        <input type="text" placeholder="Search by name..." value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchInstitutes()}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-gray-300" />
        <select value={domainFilter} onChange={e => { setDomainFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">All domains</option>
          {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <button onClick={() => { setPage(1); fetchInstitutes(); }}
          className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm">Search</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Name</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Domain</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Plan</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Discount</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Max Users</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            ) : institutes.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No institutes yet</td></tr>
            ) : institutes.map(inst => (
              <tr key={inst.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{inst.name}</td>
                <td className="px-4 py-3 text-gray-600">{(inst.domains as any)?.name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{inst.subscription_plan}</td>
                <td className="px-4 py-3 text-gray-600">{inst.discount_pct}%</td>
                <td className="px-4 py-3 text-gray-600">{inst.max_users}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[inst.status] ?? ''}`}>
                    {inst.status}
                  </span>
                </td>
                <td className="px-4 py-3 flex gap-2 flex-wrap">
                  <button onClick={() => { setEditItem(inst); setEditForm({ ...inst }); }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                  <button onClick={() => { setShowAdminModal(inst.id); setAdminMsg(''); setAdminForm({ email: '', password: '' }); }}
                    className="text-xs text-purple-600 hover:text-purple-800 font-medium">Edit Admin</button>
                  <button onClick={() => setDeleteConfirm(inst.id)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="text-xs px-3 py-1 border rounded disabled:opacity-40">Prev</button>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="text-xs px-3 py-1 border rounded disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Create Institute Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">New Institute</h2>
            {createError && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-3">{createError}</div>}
            <form onSubmit={createInstitute} className="space-y-3">
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">Institute Name *</label>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">Domain *</label>
                <select required value={form.domain_id} onChange={e => setForm({ ...form, domain_id: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                  <option value="">Select domain...</option>
                  {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600 font-medium block mb-1">Max Users</label>
                  <input type="number" min={1} value={form.max_users}
                    onChange={e => setForm({ ...form, max_users: parseInt(e.target.value) })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-600 font-medium block mb-1">Discount %</label>
                  <input type="number" min={0} max={100} value={form.discount_pct}
                    onChange={e => setForm({ ...form, discount_pct: parseInt(e.target.value) })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">Contact Email</label>
                <input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">Contact Phone</label>
                <input value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">Address</label>
                <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                  rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>

              {/* Admin account — created at the same time */}
              <div className="border-t border-gray-100 pt-3 mt-1">
                <p className="text-xs font-semibold text-gray-700 mb-2">Admin Account</p>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-600 font-medium block mb-1">Admin Email *</label>
                    <input type="email" required value={form.admin_email}
                      onChange={e => setForm({ ...form, admin_email: e.target.value })}
                      placeholder="Same as contact email or different"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 font-medium block mb-1">Admin Password *</label>
                    <input type="password" required minLength={8} value={form.admin_password}
                      onChange={e => setForm({ ...form, admin_password: e.target.value })}
                      placeholder="Min 8 characters"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-gray-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-700">
                  Create Institute
                </button>
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-4">Edit Institute</h2>
            <div className="space-y-3">
              {(['name', 'contact_email', 'notes'] as const).map(field => (
                <div key={field}>
                  <label className="text-xs text-gray-600 font-medium block mb-1 capitalize">{field.replace('_', ' ')}</label>
                  <input value={(editForm as any)[field] ?? ''} onChange={e => setEditForm({ ...editForm, [field]: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600 font-medium block mb-1">Max Users</label>
                  <input type="number" value={editForm.max_users ?? 50}
                    onChange={e => setEditForm({ ...editForm, max_users: parseInt(e.target.value) })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-600 font-medium block mb-1">Discount %</label>
                  <input type="number" min={0} max={100} value={editForm.discount_pct ?? 0}
                    onChange={e => setEditForm({ ...editForm, discount_pct: parseInt(e.target.value) })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">Status</label>
                <select value={editForm.status ?? 'active'} onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                  <option value="active">active</option>
                  <option value="suspended">suspended</option>
                  <option value="pending">pending</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={saveEdit} className="flex-1 bg-gray-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-700">Save</button>
              <button onClick={() => setEditItem(null)} className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Institute Admin Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
            <h2 className="text-lg font-bold mb-2">Edit / Reset Admin Credentials</h2>
            <p className="text-sm text-gray-500 mb-4">Enter new credentials to replace the existing institute admin, or create one if none exists.</p>
            {adminMsg && <div className={`text-sm rounded-lg p-3 mb-3 ${adminMsg.startsWith('Admin created') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{adminMsg}</div>}
            <form onSubmit={updateInstAdmin} className="space-y-3">
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">New Email (leave blank to keep current)</label>
                <input type="email" value={adminForm.email} onChange={e => setAdminForm({ ...adminForm, email: e.target.value })}
                  placeholder="new@email.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">New Password (leave blank to keep current)</label>
                <input type="password" value={adminForm.password} onChange={e => setAdminForm({ ...adminForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-gray-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-700">Update</button>
                <button type="button" onClick={() => { setShowAdminModal(null); setAdminMsg(''); }}
                  className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">Close</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 shadow-xl">
            <h2 className="text-lg font-bold mb-2 text-red-600">Delete Institute?</h2>
            <p className="text-sm text-gray-500 mb-5">Users in this institute will have their institute unlinked (not deleted).</p>
            <div className="flex gap-3">
              <button onClick={() => deleteInstitute(deleteConfirm)} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700">Delete</button>
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
