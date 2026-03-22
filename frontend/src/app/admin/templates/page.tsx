'use client';
import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

interface Template {
  id: string;
  name: string;
  domain_id: string;
  domain_name: string;
  category: string;
  version: number;
  is_active: boolean;
  slot_count: number;
  created_at: string;
}

interface Domain {
  id: string;
  name: string;
}

function getAuthHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...getAuthHeader(), ...options?.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail ?? 'Request failed');
  return data;
}

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [filterDomain, setFilterDomain] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [tmpl, doms] = await Promise.all([
        apiFetch<Template[]>('/templates?include_inactive=true'),
        apiFetch<Domain[]>('/domains'),
      ]);
      setTemplates(tmpl);
      setDomains(doms);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    setActionLoading(id);
    try {
      await apiFetch(`/templates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !current }),
      });
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, is_active: !current } : t))
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = filterDomain
    ? templates.filter((t) => t.domain_id === filterDomain)
    : templates;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage document templates across all domains
          </p>
        </div>
        <a
          href="/admin/templates/new"
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition"
        >
          + New Template
        </a>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">
          {error}
        </div>
      )}

      {/* Domain filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilterDomain('')}
          className={`px-3 py-1 rounded-full text-sm font-medium transition ${
            filterDomain === ''
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All Domains
        </button>
        {domains.map((d) => (
          <button
            key={d.id}
            onClick={() => setFilterDomain(d.id)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition ${
              filterDomain === d.id
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {d.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading templates…</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Domain</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Category</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Slots</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Version</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">
                    No templates found
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                    <td className="px-4 py-3 text-gray-600">{t.domain_name}</td>
                    <td className="px-4 py-3">
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">
                        {t.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{t.slot_count}</td>
                    <td className="px-4 py-3 text-gray-500">v{t.version}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          t.is_active
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            t.is_active ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                        />
                        {t.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <a
                          href={`/admin/templates/${t.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium text-xs"
                        >
                          Edit
                        </a>
                        <button
                          onClick={() => handleToggleActive(t.id, t.is_active)}
                          disabled={actionLoading === t.id}
                          className="text-gray-500 hover:text-gray-700 font-medium text-xs disabled:opacity-50"
                        >
                          {actionLoading === t.id
                            ? '…'
                            : t.is_active
                              ? 'Deactivate'
                              : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
