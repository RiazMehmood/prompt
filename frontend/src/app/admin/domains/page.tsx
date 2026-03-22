'use client';
import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

interface Domain {
  id: string;
  name: string;
  description: string;
  namespace: string;
  is_active: boolean;
  user_count: number;
  template_count: number;
  document_count: number;
  created_at: string;
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

export default function AdminDomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadDomains();
  }, []);

  const loadDomains = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Domain[]>('/domains?include_inactive=true');
      setDomains(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    setActionLoading(id);
    try {
      await apiFetch(`/domains/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !current }),
      });
      setDomains((prev) =>
        prev.map((d) => (d.id === id ? { ...d, is_active: !current } : d))
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Domains</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage professional domains and their knowledge bases
          </p>
        </div>
        <a
          href="/admin/domains/create"
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition"
        >
          + New Domain
        </a>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading domains…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {domains.map((domain) => (
            <div
              key={domain.id}
              className={`bg-white rounded-xl p-5 border shadow-sm ${
                domain.is_active ? 'border-gray-100' : 'border-gray-200 opacity-70'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{domain.name}</h3>
                  <code className="text-xs text-gray-400">{domain.namespace}</code>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    domain.is_active
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      domain.is_active ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                  {domain.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <p className="text-sm text-gray-500 mb-4 line-clamp-2">{domain.description}</p>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center bg-gray-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-gray-900">{domain.user_count}</p>
                  <p className="text-xs text-gray-500">Users</p>
                </div>
                <div className="text-center bg-gray-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-gray-900">{domain.template_count}</p>
                  <p className="text-xs text-gray-500">Templates</p>
                </div>
                <div className="text-center bg-gray-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-gray-900">{domain.document_count}</p>
                  <p className="text-xs text-gray-500">Docs</p>
                </div>
              </div>

              <div className="flex gap-2">
                <a
                  href={`/admin/domains/${domain.id}/config`}
                  className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 rounded-lg text-xs font-medium transition"
                >
                  Configure
                </a>
                <button
                  onClick={() => handleToggle(domain.id, domain.is_active)}
                  disabled={actionLoading === domain.id}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50 ${
                    domain.is_active
                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                      : 'bg-green-50 text-green-600 hover:bg-green-100'
                  }`}
                >
                  {actionLoading === domain.id
                    ? '…'
                    : domain.is_active
                      ? 'Deactivate'
                      : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
