'use client';
import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

interface PromoToken {
  id: string;
  code: string;
  discount_type: 'percentage' | 'flat_pkr' | 'free_tier_upgrade';
  discount_value: number;
  max_uses: number;
  used_count: number;
  remaining_uses: number;
  domain_name?: string;
  valid_from: string;
  valid_until: string;
  description: string;
  is_active: boolean;
}

interface Domain {
  id: string;
  name: string;
}

interface CreateForm {
  code: string;
  discount_type: string;
  discount_value: number;
  max_uses: number;
  max_uses_per_user: number;
  domain_id: string;
  valid_from: string;
  valid_until: string;
  description: string;
}

function getAuthHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {} as Record<string, string>;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...getAuthHeader(), ...options?.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? data?.detail ?? 'Request failed');
  return data;
}

const defaultForm = (): CreateForm => {
  const today = new Date().toISOString().slice(0, 10);
  const future = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);
  return {
    code: '',
    discount_type: 'percentage',
    discount_value: 20,
    max_uses: 100,
    max_uses_per_user: 1,
    domain_id: '',
    valid_from: today,
    valid_until: future,
    description: '',
  };
};

export default function AdminTokensPage() {
  const [tokens, setTokens] = useState<PromoToken[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>(defaultForm());
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tokData, domData] = await Promise.all([
        apiFetch<PromoToken[]>('/admin/tokens'),
        apiFetch<Domain[]>('/domains'),
      ]);
      setTokens(tokData);
      setDomains(domData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.code.trim() || !form.discount_value) {
      setError('Code and discount value are required');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const payload = {
        ...form,
        code: form.code.toUpperCase().trim(),
        valid_from: `${form.valid_from}T00:00:00Z`,
        valid_until: `${form.valid_until}T23:59:59Z`,
        domain_id: form.domain_id || null,
      };
      await apiFetch('/admin/tokens', { method: 'POST', body: JSON.stringify(payload) });
      setSuccess(`Token "${form.code.toUpperCase()}" created`);
      setForm(defaultForm());
      setShowCreate(false);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const formatDiscount = (t: PromoToken) => {
    if (t.discount_type === 'percentage') return `${t.discount_value}% off`;
    if (t.discount_type === 'flat_pkr') return `PKR ${t.discount_value} credit`;
    return `${t.discount_value}-day upgrade`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promotional Tokens</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage discount codes</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setError(''); }}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition"
        >
          + Create Token
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm mb-4">{success}</div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">New Token</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Code *</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                placeholder="LEGAL30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Discount Type</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                value={form.discount_type}
                onChange={(e) => setForm((p) => ({ ...p, discount_type: e.target.value }))}
              >
                <option value="percentage">Percentage</option>
                <option value="flat_pkr">Flat PKR</option>
                <option value="free_tier_upgrade">Free Tier Upgrade (days)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {form.discount_type === 'percentage' ? 'Percentage (0-100)' : form.discount_type === 'flat_pkr' ? 'Amount (PKR)' : 'Days'}
              </label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                value={form.discount_value}
                onChange={(e) => setForm((p) => ({ ...p, discount_value: parseFloat(e.target.value) }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Max Total Uses</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                value={form.max_uses}
                onChange={(e) => setForm((p) => ({ ...p, max_uses: parseInt(e.target.value) }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Domain Restriction</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                value={form.domain_id}
                onChange={(e) => setForm((p) => ({ ...p, domain_id: e.target.value }))}
              >
                <option value="">All Domains</option>
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Max Uses Per User</label>
              <input
                type="number"
                min={1}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                value={form.max_uses_per_user}
                onChange={(e) => setForm((p) => ({ ...p, max_uses_per_user: parseInt(e.target.value) }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valid From</label>
              <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" value={form.valid_from} onChange={(e) => setForm((p) => ({ ...p, valid_from: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valid Until</label>
              <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" value={form.valid_until} onChange={(e) => setForm((p) => ({ ...p, valid_until: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="e.g. 30% off for Legal domain beta users" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleCreate} disabled={creating} className="bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50">
              {creating ? 'Creating…' : 'Create Token'}
            </button>
            <button onClick={() => setShowCreate(false)} className="bg-gray-100 text-gray-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading tokens…</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Code</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Discount</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Domain</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Uses</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Validity</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {tokens.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">No tokens yet</td></tr>
              ) : tokens.map((t) => (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-mono font-bold text-gray-900">{t.code}</td>
                  <td className="px-4 py-3 text-gray-700">{formatDiscount(t)}</td>
                  <td className="px-4 py-3 text-gray-500">{t.domain_name ?? 'All'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-100 rounded-full h-1.5">
                        <div className="bg-gray-800 h-1.5 rounded-full" style={{ width: `${Math.round(t.used_count / t.max_uses * 100)}%` }} />
                      </div>
                      <span className="text-xs text-gray-600">{t.used_count}/{t.max_uses}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(t.valid_from).toLocaleDateString()} → {new Date(t.valid_until).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {t.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
