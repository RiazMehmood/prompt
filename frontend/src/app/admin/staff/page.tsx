'use client';
import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

function getAuthHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {} as Record<string, string>;
}

const ALL_PERMISSIONS = [
  { value: 'manage_all_users',      label: 'Manage All Users',      desc: 'View/edit every user regardless of domain' },
  { value: 'manage_domain_users',   label: 'Manage Domain Users',   desc: 'View/edit users in a specific domain (requires domain)' },
  { value: 'approve_documents',     label: 'Approve Documents',     desc: 'Approve or reject user document uploads' },
  { value: 'manage_payments',       label: 'Manage Payments',       desc: 'View payment queries and subscription issues' },
  { value: 'manage_institutes',     label: 'Manage Institutes',     desc: 'Create/edit/delete institute accounts' },
  { value: 'view_analytics',        label: 'View Analytics',        desc: 'Read-only access to analytics dashboards' },
  { value: 'manage_subscriptions',  label: 'Manage Subscriptions',  desc: 'Change user subscription tiers' },
  { value: 'manage_templates',      label: 'Manage Templates',      desc: 'Create/edit document generation templates' },
];

interface Permission {
  permission: string;
  domain_id: string | null;
  domain_name?: string;
}

interface Staff {
  id: string;
  email: string;
  role: string;
  created_at: string;
  last_login_at: string | null;
  permissions: Permission[];
}

interface Domain {
  id: string;
  name: string;
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create staff modal
  const [showCreate, setShowCreate] = useState(false);
  const [newStaff, setNewStaff] = useState({ email: '', password: '' });
  const [selectedPerms, setSelectedPerms] = useState<{ permission: string; domain_id: string }[]>([]);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  // Manage permissions modal
  const [managingStaff, setManagingStaff] = useState<Staff | null>(null);
  const [addPerm, setAddPerm] = useState({ permission: '', domain_id: '' });
  const [permMsg, setPermMsg] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => { fetchDomains(); fetchStaff(); }, []);

  async function fetchDomains() {
    const r = await fetch(`${API_BASE}/domains`, { headers: getAuthHeader() });
    setDomains(await r.json() || []);
  }

  async function fetchStaff() {
    setLoading(true); setError('');
    const r = await fetch(`${API_BASE}/admin/staff`, { headers: getAuthHeader() });
    const d = await r.json();
    if (!r.ok) { setError(d?.error?.message ?? 'Failed to load staff'); } else { setStaff(d || []); }
    setLoading(false);
  }

  function togglePerm(permission: string) {
    setSelectedPerms(prev => {
      const exists = prev.find(p => p.permission === permission);
      if (exists) return prev.filter(p => p.permission !== permission);
      return [...prev, { permission, domain_id: '' }];
    });
  }

  function setPermDomain(permission: string, domain_id: string) {
    setSelectedPerms(prev => prev.map(p => p.permission === permission ? { ...p, domain_id } : p));
  }

  async function createStaff(e: React.FormEvent) {
    e.preventDefault(); setCreateError(''); setCreateSuccess('');
    const permissions = selectedPerms.map(p => ({
      permission: p.permission,
      domain_id: p.domain_id || null,
    }));
    const r = await fetch(`${API_BASE}/admin/staff`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newStaff.email, password: newStaff.password, permissions }),
    });
    const d = await r.json();
    if (!r.ok) { setCreateError(d?.error?.message ?? d?.detail ?? 'Failed'); return; }
    setCreateSuccess(`Staff account created: ${d.email}`);
    setNewStaff({ email: '', password: '' });
    setSelectedPerms([]);
    fetchStaff();
  }

  async function addPermission(staffId: string) {
    setPermMsg('');
    const r = await fetch(`${API_BASE}/admin/staff/${staffId}/permissions`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ permission: addPerm.permission, domain_id: addPerm.domain_id || null }),
    });
    const d = await r.json();
    if (!r.ok) { setPermMsg(d?.error?.message ?? 'Failed'); return; }
    setPermMsg('Permission added');
    setAddPerm({ permission: '', domain_id: '' });
    // Refresh managing staff
    const updated = staff.map(s => s.id === staffId ? {
      ...s, permissions: [...s.permissions, { permission: addPerm.permission, domain_id: addPerm.domain_id || null }]
    } : s);
    setStaff(updated);
    setManagingStaff(updated.find(s => s.id === staffId) ?? null);
  }

  async function removePerm(staffId: string, permission: string, domain_id: string | null) {
    const params = new URLSearchParams();
    if (domain_id) params.set('domain_id', domain_id);
    const r = await fetch(`${API_BASE}/admin/staff/${staffId}/permissions/${permission}?${params}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    if (!r.ok) return;
    const updated = staff.map(s => s.id === staffId ? {
      ...s, permissions: s.permissions.filter(p => !(p.permission === permission && p.domain_id === domain_id))
    } : s);
    setStaff(updated);
    setManagingStaff(updated.find(s => s.id === staffId) ?? null);
  }

  async function deleteStaff(staffId: string) {
    const r = await fetch(`${API_BASE}/admin/staff/${staffId}`, { method: 'DELETE', headers: getAuthHeader() });
    const d = await r.json();
    if (!r.ok) { alert(d?.error?.message ?? 'Delete failed'); return; }
    setDeleteConfirm(null);
    fetchStaff();
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-500 text-sm mt-1">Platform staff with limited, assigned permission scopes</p>
        </div>
        <button onClick={() => { setShowCreate(true); setCreateError(''); setCreateSuccess(''); }}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700">
          + Create Staff
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>}

      {/* Permissions reference */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
        <p className="text-xs font-semibold text-blue-800 mb-2">Available Permission Scopes</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {ALL_PERMISSIONS.map(p => (
            <div key={p.value} className="bg-white rounded-lg p-2 border border-blue-100">
              <p className="text-xs font-medium text-blue-900">{p.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Staff list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Email</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Permissions</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Last Login</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            ) : staff.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No staff accounts yet</td></tr>
            ) : staff.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{s.email}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {s.permissions.length === 0 ? (
                      <span className="text-gray-400 text-xs">no permissions</span>
                    ) : s.permissions.map((p, i) => (
                      <span key={i} className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
                        {p.permission}{p.domain_name ? ` (${p.domain_name})` : ''}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {s.last_login_at ? new Date(s.last_login_at).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <button onClick={() => { setManagingStaff(s); setPermMsg(''); setAddPerm({ permission: '', domain_id: '' }); }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium">Permissions</button>
                  <button onClick={() => setDeleteConfirm(s.id)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Staff Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">Create Staff Account</h2>
            {createError && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-3">{createError}</div>}
            {createSuccess && <div className="bg-green-50 text-green-700 text-sm rounded-lg p-3 mb-3">{createSuccess}</div>}
            <form onSubmit={createStaff} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600 font-medium block mb-1">Email</label>
                  <input type="email" required value={newStaff.email} onChange={e => setNewStaff({ ...newStaff, email: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-600 font-medium block mb-1">Password</label>
                  <input type="password" required value={newStaff.password} onChange={e => setNewStaff({ ...newStaff, password: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-600 font-medium block mb-2">Assign Permissions</label>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {ALL_PERMISSIONS.map(p => {
                    const selected = selectedPerms.find(sp => sp.permission === p.value);
                    return (
                      <div key={p.value} className={`border rounded-lg p-3 cursor-pointer transition ${selected ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="flex items-center gap-2" onClick={() => togglePerm(p.value)}>
                          <input type="checkbox" checked={!!selected} onChange={() => togglePerm(p.value)} className="rounded" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{p.label}</p>
                            <p className="text-xs text-gray-500">{p.desc}</p>
                          </div>
                        </div>
                        {selected && p.value === 'manage_domain_users' && (
                          <div className="mt-2 ml-6">
                            <select value={selected.domain_id} onChange={e => setPermDomain(p.value, e.target.value)}
                              className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none">
                              <option value="">All domains</option>
                              {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-gray-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-700">Create Staff</button>
                <button type="button" onClick={() => { setShowCreate(false); setSelectedPerms([]); }}
                  className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Permissions Modal */}
      {managingStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-1">Permissions</h2>
            <p className="text-sm text-gray-500 mb-4">{managingStaff.email}</p>

            {/* Current permissions */}
            <div className="space-y-2 mb-4">
              {managingStaff.permissions.length === 0 ? (
                <p className="text-sm text-gray-400">No permissions assigned</p>
              ) : managingStaff.permissions.map((p, i) => (
                <div key={i} className="flex items-center justify-between bg-indigo-50 rounded-lg px-3 py-2">
                  <div>
                    <span className="text-sm font-medium text-indigo-800">{p.permission}</span>
                    {p.domain_name && <span className="text-xs text-indigo-500 ml-2">({p.domain_name})</span>}
                  </div>
                  <button onClick={() => removePerm(managingStaff.id, p.permission, p.domain_id)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium">Remove</button>
                </div>
              ))}
            </div>

            {/* Add permission */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-600 mb-2">Add Permission</p>
              {permMsg && <div className={`text-xs rounded-lg p-2 mb-2 ${permMsg === 'Permission added' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{permMsg}</div>}
              <div className="flex gap-2">
                <select value={addPerm.permission} onChange={e => setAddPerm({ ...addPerm, permission: e.target.value })}
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none">
                  <option value="">Select permission...</option>
                  {ALL_PERMISSIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                {addPerm.permission === 'manage_domain_users' && (
                  <select value={addPerm.domain_id} onChange={e => setAddPerm({ ...addPerm, domain_id: e.target.value })}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none">
                    <option value="">All domains</option>
                    {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                )}
                <button onClick={() => addPerm.permission && addPermission(managingStaff.id)}
                  className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-700">Add</button>
              </div>
            </div>

            <button onClick={() => setManagingStaff(null)}
              className="mt-4 w-full border border-gray-200 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">Close</button>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 shadow-xl">
            <h2 className="text-lg font-bold mb-2 text-red-600">Delete Staff Account?</h2>
            <p className="text-sm text-gray-500 mb-5">All their permission assignments will also be removed.</p>
            <div className="flex gap-3">
              <button onClick={() => deleteStaff(deleteConfirm)} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700">Delete</button>
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
