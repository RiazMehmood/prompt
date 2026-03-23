'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/utils/auth';

interface Template { id: string; name: string; description?: string; domain_id: string; created_at: string; }

export default function DomainTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    apiFetch<Template[]>('/templates').then(setTemplates).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Templates</h1>
      {error && <div className="bg-red-50 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}
      {loading ? (
        <div className="text-gray-400 py-10 text-center">Loading…</div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">No templates found</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {templates.map(t => (
            <div key={t.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-300 hover:shadow-sm transition">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{t.name}</p>
                  {t.description && <p className="text-sm text-gray-500 mt-1">{t.description}</p>}
                </div>
                <a href={`/admin/templates/${t.id}`} className="text-xs text-blue-600 hover:text-blue-800 font-medium ml-3 shrink-0">Edit</a>
              </div>
              <p className="text-xs text-gray-400 mt-3">{new Date(t.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
