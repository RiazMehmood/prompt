'use client';
import { useEffect, useState, useCallback } from 'react';
import { apiFetch, getUser } from '@/utils/auth';

interface SlotDef {
  name: string;
  type: 'text' | 'date' | 'number' | 'select';
  required: boolean;
  options?: string[];
  label?: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  slot_definitions: SlotDef[];
}

interface GenerateResponse {
  id: string;
  status: string;
  message: string;
}

interface DocumentDetail {
  id: string;
  status: string;
  output_content: string;
  output_language: string;
  output_format: string;
  validation_status: string;
}

function toLabel(name: string) {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function GenerateDocumentPage() {
  const [templates, setTemplates]     = useState<Template[]>([]);
  const [selected, setSelected]       = useState<Template | null>(null);
  const [params, setParams]           = useState<Record<string, string>>({});
  const [language, setLanguage]       = useState('english');
  const [format, setFormat]           = useState('in_app');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [docId, setDocId]             = useState<string | null>(null);
  const [docStatus, setDocStatus]     = useState<string>('');
  const [docContent, setDocContent]   = useState<string>('');
  const [polling, setPolling]         = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  const user = getUser();
  const domainId = user?.domain_id;

  useEffect(() => {
    apiFetch<Template[]>('/templates')
      .then(t => setTemplates(Array.isArray(t) ? t : []))
      .catch(() => setError('Failed to load templates'))
      .finally(() => setLoadingTemplates(false));
  }, []);

  const selectTemplate = (t: Template) => {
    setSelected(t);
    setParams({});
    setDocId(null);
    setDocContent('');
    setDocStatus('');
    setError('');
  };

  const setParam = (name: string, value: string) =>
    setParams(p => ({ ...p, [name]: value }));

  // Poll for document status
  const pollStatus = useCallback(async (id: string) => {
    setPolling(true);
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const doc = await apiFetch<DocumentDetail>(`/api/generate/${id}`);
        setDocStatus(doc.status);
        if (doc.status === 'completed') {
          setDocContent(doc.output_content || '');
          clearInterval(interval);
          setPolling(false);
        } else if (doc.status === 'failed') {
          setError('Document generation failed. Please try again.');
          clearInterval(interval);
          setPolling(false);
        }
      } catch {
        // keep polling
      }
      if (attempts > 30) { // 60 sec timeout
        setError('Generation timed out. Please check My Documents.');
        clearInterval(interval);
        setPolling(false);
      }
    }, 2000);
  }, []);

  const handleGenerate = async () => {
    if (!selected) return;
    // Validate required fields
    const missing = selected.slot_definitions
      .filter(s => s.required && !params[s.name]?.trim())
      .map(s => toLabel(s.name));
    if (missing.length) {
      setError(`Required fields missing: ${missing.join(', ')}`);
      return;
    }
    setLoading(true);
    setError('');
    setDocId(null);
    setDocContent('');
    setDocStatus('');
    try {
      const res = await apiFetch<GenerateResponse>('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: selected.id,
          input_parameters: params,
          output_language: language,
          output_format: format,
        }),
      });
      setDocId(res.id);
      setDocStatus(res.status);
      pollStatus(res.id);
    } catch (err: any) {
      setError(err.message ?? 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (fmt: 'pdf' | 'docx') => {
    if (!docId) return;
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/api/generate/${docId}/export?format=${fmt}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `document.${fmt}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Export failed. Please try again.');
    }
  };

  // ── Result view ────────────────────────────────────────────────────────────
  if (docContent) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Generated Document</h1>
            <p className="text-sm text-gray-500 mt-0.5">{selected?.name}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('pdf')}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-xl font-medium hover:bg-red-700 transition"
            >
              Export PDF
            </button>
            <button
              onClick={() => handleExport('docx')}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl font-medium hover:bg-blue-700 transition"
            >
              Export DOCX
            </button>
            <button
              onClick={() => { setDocContent(''); setDocId(null); setDocStatus(''); }}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-xl font-medium hover:bg-gray-200 transition"
            >
              New Document
            </button>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
            {docContent}
          </pre>
        </div>
      </div>
    );
  }

  // ── Generating / polling ───────────────────────────────────────────────────
  if (docId && (polling || docStatus === 'processing' || docStatus === 'pending')) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Generate Document</h1>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-14 h-14 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-5" />
          <p className="text-gray-700 font-medium">Generating your document…</p>
          <p className="text-gray-400 text-sm mt-1">This usually takes 10–30 seconds</p>
          <span className="inline-block mt-4 text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full capitalize">{docStatus}</span>
        </div>
      </div>
    );
  }

  // ── Template selection ─────────────────────────────────────────────────────
  if (!selected) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Generate Document</h1>
        <p className="text-gray-500 text-sm mb-8">Choose a template to get started.</p>

        {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 text-sm mb-6">{error}</div>}

        {loadingTemplates ? (
          <div className="text-gray-400 text-center py-12">Loading templates…</div>
        ) : templates.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center text-amber-700 text-sm">
            No templates available for your domain yet.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => selectTemplate(t)}
                className="text-left bg-white border border-gray-100 rounded-2xl p-5 hover:border-gray-300 hover:shadow-sm transition group"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="font-semibold text-gray-900 group-hover:text-gray-700">{t.name}</p>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    {t.slot_definitions.length} fields
                  </span>
                </div>
                <p className="text-sm text-gray-500">{t.description}</p>
                <p className="text-xs text-gray-400 mt-3 group-hover:text-gray-500">Click to fill form →</p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Form view ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => { setSelected(null); setError(''); }}
          className="text-gray-400 hover:text-gray-600 transition"
        >
          ← Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{selected.name}</h1>
          <p className="text-sm text-gray-500">{selected.description}</p>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 text-sm mb-6">{error}</div>}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        {selected.slot_definitions.map(slot => (
          <div key={slot.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {toLabel(slot.name)}
              {slot.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {slot.type === 'select' && slot.options ? (
              <select
                value={params[slot.name] ?? ''}
                onChange={e => setParam(slot.name, e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 transition"
              >
                <option value="">Select…</option>
                {slot.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : slot.type === 'date' ? (
              <input
                type="date"
                value={params[slot.name] ?? ''}
                onChange={e => setParam(slot.name, e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 transition"
              />
            ) : (
              <input
                type={slot.type === 'number' ? 'number' : 'text'}
                value={params[slot.name] ?? ''}
                onChange={e => setParam(slot.name, e.target.value)}
                placeholder={`Enter ${toLabel(slot.name).toLowerCase()}`}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 transition"
              />
            )}
          </div>
        ))}

        {/* Output options */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Language</label>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 transition"
            >
              <option value="english">English</option>
              <option value="urdu">Urdu</option>
              <option value="sindhi">Sindhi</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Format</label>
            <select
              value={format}
              onChange={e => setFormat(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 transition"
            >
              <option value="in_app">View in App</option>
              <option value="pdf">PDF</option>
              <option value="docx">DOCX</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium text-sm hover:bg-gray-700 disabled:opacity-50 transition"
        >
          {loading ? 'Submitting…' : 'Generate Document'}
        </button>
      </div>
    </div>
  );
}
