'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

interface DomainConfig {
  supported_output_languages: string[];
  document_types: string[];
  agent_persona: {
    system_prompt: string;
    response_tone: string;
    max_response_length: number;
    language_preference: string;
  };
  rag_confidence_threshold: number;
  formatting: {
    paper_size: string;
    rtl_supported: boolean;
    font_family?: string;
  };
}

interface DomainDetail {
  id: string;
  name: string;
  namespace: string;
  configuration: DomainConfig;
}

function getAuthHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function DomainConfigPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [domain, setDomain] = useState<DomainDetail | null>(null);
  const [config, setConfig] = useState<DomainConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadDomain();
  }, [params.id]);

  const loadDomain = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/domains/${params.id}`, {
        headers: getAuthHeader(),
      });
      const data: DomainDetail = await res.json();
      setDomain(data);
      setConfig(data.configuration);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_BASE}/domains/${params.id}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ configuration: config }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail ?? 'Failed to save');
      setSuccess('Configuration saved successfully');
      setConfig(data.configuration);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return <div className="text-center py-12 text-gray-500">Loading configuration…</div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push('/admin/domains')} className="text-gray-400 hover:text-gray-600 text-sm">
          ← Back
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{domain?.name} — Configuration</h1>
          <code className="text-xs text-gray-400">{domain?.namespace}</code>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm mb-4">{success}</div>
      )}

      <div className="space-y-6">
        {/* Agent Persona */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-4">Agent Parameters</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={5}
                value={config.agent_persona.system_prompt}
                onChange={(e) =>
                  setConfig((c) => c ? ({
                    ...c,
                    agent_persona: { ...c.agent_persona, system_prompt: e.target.value },
                  }) : c)
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Response Tone</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  value={config.agent_persona.response_tone}
                  onChange={(e) =>
                    setConfig((c) => c ? ({
                      ...c,
                      agent_persona: { ...c.agent_persona, response_tone: e.target.value },
                    }) : c)
                  }
                >
                  {['formal', 'professional', 'friendly'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RAG Confidence Threshold</label>
                <input
                  type="number" min={0.5} max={1.0} step={0.05}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  value={config.rag_confidence_threshold}
                  onChange={(e) =>
                    setConfig((c) => c ? ({ ...c, rag_confidence_threshold: parseFloat(e.target.value) }) : c)
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* Languages & Document Types */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-4">Languages & Document Types</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Supported Output Languages</label>
            <div className="flex gap-2 flex-wrap">
              {['english', 'urdu', 'sindhi'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    const langs = config.supported_output_languages;
                    setConfig((c) => c ? ({
                      ...c,
                      supported_output_languages: langs.includes(lang)
                        ? langs.filter((l) => l !== lang)
                        : [...langs, lang],
                    }) : c);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                    config.supported_output_languages.includes(lang)
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-300'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Document Types</label>
            <div className="flex flex-wrap gap-2">
              {config.document_types.map((dt, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                  {dt}
                  <button
                    onClick={() =>
                      setConfig((c) => c ? ({
                        ...c,
                        document_types: c.document_types.filter((_, idx) => idx !== i),
                      }) : c)
                    }
                    className="hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Formatting */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-4">Formatting Rules</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paper Size</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                value={config.formatting.paper_size}
                onChange={(e) =>
                  setConfig((c) => c ? ({ ...c, formatting: { ...c.formatting, paper_size: e.target.value } }) : c)
                }
              >
                {['A4', 'Legal', 'Letter'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox" id="rtl"
                checked={config.formatting.rtl_supported}
                onChange={(e) =>
                  setConfig((c) => c ? ({ ...c, formatting: { ...c.formatting, rtl_supported: e.target.checked } }) : c)
                }
              />
              <label htmlFor="rtl" className="text-sm text-gray-700">RTL Support</label>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
