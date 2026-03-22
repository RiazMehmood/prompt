'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

interface DomainCreateForm {
  name: string;
  description: string;
  namespace: string;
  configuration: {
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
    };
  };
}

function getAuthHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {} as Record<string, string>;
}

const LANGUAGE_OPTIONS = ['english', 'urdu', 'sindhi'];
const PAPER_SIZES = ['A4', 'Legal', 'Letter'];
const TONE_OPTIONS = ['formal', 'professional', 'friendly'];

export default function CreateDomainPage() {
  const router = useRouter();
  const [form, setForm] = useState<DomainCreateForm>({
    name: '',
    description: '',
    namespace: '',
    configuration: {
      supported_output_languages: ['english'],
      document_types: [],
      agent_persona: {
        system_prompt: 'You are a professional domain assistant. Provide accurate, structured responses based only on the provided knowledge base.',
        response_tone: 'professional',
        max_response_length: 2000,
        language_preference: 'english',
      },
      rag_confidence_threshold: 0.75,
      formatting: { paper_size: 'A4', rtl_supported: false },
    },
  });
  const [newDocType, setNewDocType] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const autoNamespace = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 50);

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      namespace: prev.namespace || autoNamespace(name),
    }));
  };

  const toggleLanguage = (lang: string) => {
    setForm((prev) => {
      const langs = prev.configuration.supported_output_languages;
      return {
        ...prev,
        configuration: {
          ...prev.configuration,
          supported_output_languages: langs.includes(lang)
            ? langs.filter((l) => l !== lang)
            : [...langs, lang],
        },
      };
    });
  };

  const addDocType = () => {
    if (!newDocType.trim()) return;
    setForm((prev) => ({
      ...prev,
      configuration: {
        ...prev.configuration,
        document_types: [...prev.configuration.document_types, newDocType.trim()],
      },
    }));
    setNewDocType('');
  };

  const removeDocType = (i: number) => {
    setForm((prev) => ({
      ...prev,
      configuration: {
        ...prev.configuration,
        document_types: prev.configuration.document_types.filter((_, idx) => idx !== i),
      },
    }));
  };

  const handleCreate = async () => {
    if (!form.name || !form.namespace) {
      setError('Name and namespace are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? data?.detail ?? 'Failed to create domain');
      router.push('/admin/domains');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push('/admin/domains')}
          className="text-gray-400 hover:text-gray-600 text-sm"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Create New Domain</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Identity */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Domain Identity</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Legal Pakistan"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Namespace *
                <span className="ml-1 text-xs text-gray-400">(immutable after creation)</span>
              </label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={form.namespace}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    namespace: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                  }))
                }
                placeholder="legal_pk"
              />
              <p className="text-xs text-gray-400 mt-1">
                Used as vector store prefix. Only lowercase letters, numbers, underscores.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                rows={2}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Languages & Document Types */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Output Languages & Document Types</h2>

          <label className="block text-sm font-medium text-gray-700 mb-2">
            Supported Output Languages
          </label>
          <div className="flex gap-2 mb-4">
            {LANGUAGE_OPTIONS.map((lang) => (
              <button
                key={lang}
                onClick={() => toggleLanguage(lang)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                  form.configuration.supported_output_languages.includes(lang)
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

          <label className="block text-sm font-medium text-gray-700 mb-2">Document Types</label>
          <div className="flex gap-2 mb-2">
            <input
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={newDocType}
              onChange={(e) => setNewDocType(e.target.value)}
              placeholder="e.g. Bail Application"
              onKeyDown={(e) => e.key === 'Enter' && addDocType()}
            />
            <button
              onClick={addDocType}
              className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.configuration.document_types.map((dt, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium"
              >
                {dt}
                <button onClick={() => removeDocType(i)} className="hover:text-red-600">
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Agent Persona */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">AI Agent Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none font-mono"
                rows={4}
                value={form.configuration.agent_persona.system_prompt}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    configuration: {
                      ...p.configuration,
                      agent_persona: { ...p.configuration.agent_persona, system_prompt: e.target.value },
                    },
                  }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Response Tone</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  value={form.configuration.agent_persona.response_tone}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      configuration: {
                        ...p.configuration,
                        agent_persona: { ...p.configuration.agent_persona, response_tone: e.target.value },
                      },
                    }))
                  }
                >
                  {TONE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RAG Confidence Threshold</label>
                <input
                  type="number"
                  min={0.5}
                  max={1.0}
                  step={0.05}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  value={form.configuration.rag_confidence_threshold}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      configuration: {
                        ...p.configuration,
                        rag_confidence_threshold: parseFloat(e.target.value),
                      },
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* Formatting */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Formatting Defaults</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paper Size</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                value={form.configuration.formatting.paper_size}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    configuration: {
                      ...p.configuration,
                      formatting: { ...p.configuration.formatting, paper_size: e.target.value },
                    },
                  }))
                }
              >
                {PAPER_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="rtl"
                checked={form.configuration.formatting.rtl_supported}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    configuration: {
                      ...p.configuration,
                      formatting: { ...p.configuration.formatting, rtl_supported: e.target.checked },
                    },
                  }))
                }
              />
              <label htmlFor="rtl" className="text-sm text-gray-700">RTL Support (Urdu/Sindhi)</label>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleCreate}
            disabled={saving}
            className="bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create Domain'}
          </button>
          <button
            onClick={() => router.push('/admin/domains')}
            className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
