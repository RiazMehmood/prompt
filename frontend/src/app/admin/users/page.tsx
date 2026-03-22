'use client';
import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

function getAuthHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {} as Record<string, string>;
}

interface User {
  id: string;
  email: string;
  phone?: string;
  role: string;
  domain_id: string | null;
  subscription_tier: string;
  created_at: string;
  last_login_at: string | null;
  domains?: { name: string } | null;
}

interface Domain {
  id: string;
  name: string;
}

const ROLE_BADGE: Record<string, string> = {
  root_admin: 'bg-red-100 text-red-700',
  domain_admin: 'bg-blue-100 text-blue-700',
  staff: 'bg-purple-100 text-purple-700',
  institute_admin: 'bg-orange-100 text-orange-700',
  user: 'bg-gray-100 text-gray-600',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [domains, setDomains] = useState<Domain[]>([]);
  const [domainFilter, setDomainFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editFields, setEditFields] = useState({ role: '', domain_id: '', subscription_tier: '' });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ email: '', password: '', role: 'domain_admin', domain_id: '' });
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  // Create user
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', domain_id: '', subscription_tier: 'basic' });
  const [userCreateError, setUserCreateError] = useState('');
  const [userCreateSuccess, setUserCreateSuccess] = useState('');

  const PAGE_SIZE = 20;

  useEffect(() => {
    fetchDomains();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter, domainFilter]);

  async function fetchDomains() {
    try {
      const res = await fetch(`${API_BASE}/domains`, { headers: getAuthHeader() });
      const data = await res.json();
      setDomains(data || []);
    } catch {}
  }

  async function fetchUsers() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(PAGE_SIZE),
      });
      if (roleFilter) params.set('role', roleFilter);
      if (domainFilter) params.set('domain_id', domainFilter);
      if (search) params.set('search', search);

      const res = await fetch(`${API_BASE}/admin/users?${params}`, { headers: getAuthHeader() });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to load users');
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function openEdit(u: User) {
    setEditUser(u);
    setEditFields({ role: u.role, domain_id: u.domain_id ?? '', subscription_tier: u.subscription_tier });
  }

  async function saveEdit() {
    if (!editUser) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: editFields.role || undefined,
          domain_id: editFields.domain_id || undefined,
          subscription_tier: editFields.subscription_tier || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? 'Update failed');
      setEditUser(null);
      fetchUsers();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deactivateUser(userId: string, active: boolean) {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? 'Failed');
      fetchUsers();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function deleteUser(userId: string) {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? 'Delete failed');
      setDeleteConfirm(null);
      fetchUsers();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function createAdmin(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    try {
      const res = await fetch(`${API_BASE}/admin/create-admin`, {
        method: 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdmin),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? data?.detail ?? 'Failed');
      setCreateSuccess(`Admin account created: ${data.email}`);
      setNewAdmin({ email: '', password: '', role: 'domain_admin', domain_id: '' });
      fetchUsers();
    } catch (e: any) {
      setCreateError(e.message);
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setUserCreateError('');
    setUserCreateSuccess('');
    try {
      const res = await fetch(`${API_BASE}/admin/create-user`, {
        method: 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUser.email,
          password: newUser.password,
          domain_id: newUser.domain_id || undefined,
          subscription_tier: newUser.subscription_tier,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? data?.detail ?? 'Failed');
      setUserCreateSuccess(`User created: ${data.email}`);
      setNewUser({ email: '', password: '', domain_id: '', subscription_tier: 'basic' });
      fetchUsers();
    } catch (e: any) {
      setUserCreateError(e.message);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm mt-1">{total} total users</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowCreateUser(true); setUserCreateError(''); setUserCreateSuccess(''); }}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition"
          >
            + Create User
          </button>
          <button
            onClick={() => setShowCreateAdmin(true)}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition"
          >
            + Create Admin
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-gray-300"
        />
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">All roles</option>
          <option value="user">user</option>
          <option value="domain_admin">domain_admin</option>
          <option value="root_admin">root_admin</option>
        </select>
        <select
          value={domainFilter}
          onChange={(e) => { setDomainFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">All domains</option>
          {domains.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <button
          onClick={() => { setPage(1); fetchUsers(); }}
          className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition"
        >
          Search
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>}

      {/* Users table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Email</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Role</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Domain</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Tier</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Last Login</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No users found</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-900 font-medium">{u.email ?? u.phone ?? u.id}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{(u.domains as any)?.name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{u.subscription_tier}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <button
                    onClick={() => openEdit(u)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deactivateUser(u.id, false)}
                    className="text-xs text-orange-500 hover:text-orange-700 font-medium"
                  >
                    Deactivate
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(u.id)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="text-xs px-3 py-1 border rounded disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="text-xs px-3 py-1 border rounded disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
            <h2 className="text-lg font-bold mb-4">Edit User</h2>
            <p className="text-sm text-gray-500 mb-4">{editUser.email}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">Role</label>
                <select
                  value={editFields.role}
                  onChange={(e) => setEditFields({ ...editFields, role: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="user">user</option>
                  <option value="domain_admin">domain_admin</option>
                  <option value="root_admin">root_admin</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">Domain</label>
                <select
                  value={editFields.domain_id}
                  onChange={(e) => setEditFields({ ...editFields, domain_id: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="">None</option>
                  {domains.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">Subscription Tier</label>
                <select
                  value={editFields.subscription_tier}
                  onChange={(e) => setEditFields({ ...editFields, subscription_tier: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="basic">basic</option>
                  <option value="standard">standard</option>
                  <option value="premium">premium</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={saveEdit}
                disabled={saving}
                className="flex-1 bg-gray-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditUser(null)}
                className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 shadow-xl">
            <h2 className="text-lg font-bold mb-2 text-red-600">Delete User?</h2>
            <p className="text-sm text-gray-500 mb-5">This action is permanent and cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => deleteUser(deleteConfirm)}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create admin modal */}
      {showCreateAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
            <h2 className="text-lg font-bold mb-4">Create Admin Account</h2>
            {createError && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-3">{createError}</div>}
            {createSuccess && <div className="bg-green-50 text-green-700 text-sm rounded-lg p-3 mb-3">{createSuccess}</div>}
            <form onSubmit={createAdmin} className="space-y-3">
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">Role</label>
                <select
                  value={newAdmin.role}
                  onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="domain_admin">domain_admin</option>
                  <option value="root_admin">root_admin</option>
                </select>
              </div>
              {newAdmin.role === 'domain_admin' && (
                <div>
                  <label className="text-xs text-gray-600 font-medium block mb-1">Domain</label>
                  <select
                    required
                    value={newAdmin.domain_id}
                    onChange={(e) => setNewAdmin({ ...newAdmin, domain_id: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="">Select domain...</option>
                    {domains.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-gray-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-700"
                >
                  Create Admin
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreateAdmin(false); setCreateError(''); setCreateSuccess(''); }}
                  className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
            <h2 className="text-lg font-bold mb-4">Create User Account</h2>
            {userCreateError && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-3">{userCreateError}</div>}
            {userCreateSuccess && <div className="bg-green-50 text-green-700 text-sm rounded-lg p-3 mb-3">{userCreateSuccess}</div>}
            <form onSubmit={createUser} className="space-y-3">
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">Domain (optional)</label>
                <select
                  value={newUser.domain_id}
                  onChange={(e) => setNewUser({ ...newUser, domain_id: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="">None</option>
                  {domains.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">Subscription Tier</label>
                <select
                  value={newUser.subscription_tier}
                  onChange={(e) => setNewUser({ ...newUser, subscription_tier: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="basic">basic</option>
                  <option value="standard">standard</option>
                  <option value="premium">premium</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-gray-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-700">
                  Create User
                </button>
                <button type="button" onClick={() => { setShowCreateUser(false); setUserCreateError(''); setUserCreateSuccess(''); }}
                  className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
