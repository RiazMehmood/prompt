'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

type DataSource = 'user_input' | 'rag_retrieval' | 'auto';

interface SlotDef {
  name: string;
  type: string;
  required: boolean;
  data_source: DataSource;
  label?: string;
  rag_query_hint?: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  content: string;
  slot_definitions: SlotDef[];
  is_active: boolean;
  version: string;
  domain_id: string;
}

function getAuthHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...getAuthHeader(), ...(options?.headers ?? {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? data?.detail ?? 'Request failed');
  return data as T;
}

const SOURCE_CONFIG = {
  user_input:    { label: 'User Fills',  color: 'text-blue-700',    bg: 'bg-blue-100',    desc: 'Lawyer provides this in the chat' },
  rag_retrieval: { label: 'AI via RAG',  color: 'text-emerald-700', bg: 'bg-emerald-100', desc: 'AI fetches from legal knowledge base' },
  auto:          { label: 'Auto',        color: 'text-gray-600',    bg: 'bg-gray-100',    desc: "System fills automatically (e.g. today's date)" },
} as const;

function SlotRow({ slot, onChange, onDelete }: { slot: SlotDef; onChange: (s: SlotDef) => void; onDelete: () => void }) {
  const [showHint, setShowHint] = useState(false);
  const cfg = SOURCE_CONFIG[slot.data_source] ?? SOURCE_CONFIG.user_input;

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center gap-4 px-4 py-3">
        {/* Name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <code className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">{`{{${slot.name}}}`}</code>
            <span className="text-xs text-gray-400">{slot.type}</span>
          </div>
        </div>
        {/* Source pills */}
        <div className="flex gap-1 shrink-0">
          {(Object.keys(SOURCE_CONFIG) as DataSource[]).map(s => (
            <button key={s} onClick={() => onChange({ ...slot, data_source: s })}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                slot.data_source === s
                  ? `${SOURCE_CONFIG[s].bg} ${SOURCE_CONFIG[s].color} ring-1 ring-current`
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}>
              {SOURCE_CONFIG[s].label}
            </button>
          ))}
        </div>
        {/* Required toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-500">Required</span>
          <button onClick={() => onChange({ ...slot, required: !slot.required })}
            className={`relative w-9 h-5 rounded-full transition-colors ${slot.required ? 'bg-gray-900' : 'bg-gray-200'}`}>
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${slot.required ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
        </div>
        {slot.data_source === 'rag_retrieval' && (
          <button onClick={() => setShowHint(v => !v)} className="text-xs text-emerald-600 hover:text-emerald-800 shrink-0">
            {showHint ? '▲ hide' : '▼ RAG hint'}
          </button>
        )}
        {/* Delete slot */}
        <button onClick={onDelete} title="Remove field"
          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
      <div className={`px-4 pb-2 text-xs ${cfg.color}`}>{cfg.desc}</div>
      {slot.data_source === 'rag_retrieval' && showHint && (
        <div className="px-4 pb-4 bg-emerald-50 border-t border-emerald-100">
          <label className="block text-xs font-medium text-emerald-800 mt-3 mb-1.5">
            RAG Query Hint
            <span className="font-normal text-emerald-600 ml-1">— custom search sent to knowledge base</span>
          </label>
          <input type="text" value={slot.rag_query_hint ?? ''} onChange={e => onChange({ ...slot, rag_query_hint: e.target.value })}
            placeholder={`e.g. "bail grounds for sections {{sections}} Pakistani law"`}
            className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white" />
          <p className="text-xs text-emerald-600 mt-1">
            Use <code className="bg-emerald-100 px-1 rounded">{`{{slot_name}}`}</code> to reference other collected values.
          </p>
        </div>
      )}
    </div>
  );
}

export default function TemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [template, setTemplate] = useState<Template | null>(null);
  const [slots, setSlots]       = useState<SlotDef[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [saved, setSaved]       = useState(false);
  const [tab, setTab]           = useState<'slots' | 'content' | 'sample'>('slots');
  const [sampleFilename, setSampleFilename] = useState<string>('');
  const [uploadingFile, setUploadingFile]   = useState(false);
  const sampleFileRef = useRef<HTMLInputElement>(null);
  const [addingField, setAddingField]       = useState(false);
  const [newField, setNewField]             = useState<Partial<SlotDef>>({
    name: '', type: 'text', required: true, data_source: 'user_input', label: '',
  });

  useEffect(() => {
    if (!id) return;
    apiFetch<Template & { formatting_rules?: Record<string, string> }>(`/templates/${id}`)
      .then(t => {
        setTemplate(t);
        setSlots(t.slot_definitions ?? []);
        setSampleFilename((t as any).formatting_rules?.sample_filename ?? '');
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSampleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploadingFile(true); setError('');
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_BASE}/templates/${id}/sample`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail ?? 'Upload failed');
      setSampleFilename(data.sample_filename);
    } catch (e: any) { setError(e.message); }
    finally { setUploadingFile(false); }
  };

  const handleSave = async () => {
    if (!template) return;
    setSaving(true); setError('');
    try {
      const updated = await apiFetch<Template>(`/templates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ slot_definitions: slots }),
      });
      setTemplate(updated); setSlots(updated.slot_definitions ?? []);
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleToggleActive = async () => {
    if (!template) return;
    setSaving(true);
    try {
      const updated = await apiFetch<Template>(`/templates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !template.is_active }),
      });
      setTemplate(updated);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="text-gray-400 text-center py-12">Loading…</div>;
  if (!template) return <div className="text-red-500 p-4">{error || 'Template not found'}</div>;

  const userCount = slots.filter(s => s.data_source === 'user_input').length;
  const ragCount  = slots.filter(s => s.data_source === 'rag_retrieval').length;
  const autoCount = slots.filter(s => s.data_source === 'auto').length;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button onClick={() => router.push('/admin/templates')}
            className="text-sm text-gray-400 hover:text-gray-600 mb-2 flex items-center gap-1 transition">
            ← Templates
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{template.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleToggleActive} disabled={saving}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              template.is_active ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}>
            {template.is_active ? 'Deactivate' : 'Activate'}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition">
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm mb-4">{error}</div>}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{userCount}</p>
          <p className="text-xs text-blue-600 mt-0.5">User fills in chat</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-emerald-700">{ragCount}</p>
          <p className="text-xs text-emerald-600 mt-0.5">AI fills from RAG</p>
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-gray-600">{autoCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Auto-filled by system</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
        {([
          { key: 'slots',   label: `Slot Config (${slots.length})` },
          { key: 'content', label: 'Document Template' },
          { key: 'sample',  label: sampleFilename ? '📎 Sample Format' : 'Sample Format' },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              tab === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Slots tab */}
      {tab === 'slots' && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 mb-3">
            Configure how each placeholder is filled — by the lawyer in chat, automatically by AI, or from their profile.
            Fields named <code className="bg-gray-100 px-1 rounded">applicant_name</code>, <code className="bg-gray-100 px-1 rounded">court_name</code>, <code className="bg-gray-100 px-1 rounded">bar_number</code> are auto-filled from the lawyer's profile.
          </p>

          {slots.map((slot, idx) => (
            <SlotRow key={slot.name} slot={slot}
              onChange={updated => { setSlots(prev => prev.map((s, i) => i === idx ? updated : s)); setSaved(false); }}
              onDelete={() => { setSlots(prev => prev.filter((_, i) => i !== idx)); setSaved(false); }}
            />
          ))}

          {/* Add field form */}
          {addingField ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
              <p className="text-xs font-semibold text-gray-700">New Field</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Field name (snake_case)</label>
                  <input type="text" placeholder="e.g. accused_name"
                    value={newField.name ?? ''}
                    onChange={e => setNewField(p => ({ ...p, name: e.target.value.replace(/\s/g, '_').toLowerCase() }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Display label</label>
                  <input type="text" placeholder="e.g. Accused Name"
                    value={newField.label ?? ''}
                    onChange={e => setNewField(p => ({ ...p, label: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
                  />
                </div>
              </div>
              <div className="flex gap-3 items-center flex-wrap">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Type</label>
                  <select value={newField.type ?? 'text'} onChange={e => setNewField(p => ({ ...p, type: e.target.value }))}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none">
                    {['text','date','number','textarea'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Source</label>
                  <select value={newField.data_source ?? 'user_input'} onChange={e => setNewField(p => ({ ...p, data_source: e.target.value as DataSource }))}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none">
                    <option value="user_input">User Fills</option>
                    <option value="rag_retrieval">AI via RAG</option>
                    <option value="auto">Auto</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <input type="checkbox" id="req" checked={newField.required ?? true}
                    onChange={e => setNewField(p => ({ ...p, required: e.target.checked }))}
                    className="rounded" />
                  <label htmlFor="req" className="text-xs text-gray-600">Required</label>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  disabled={!newField.name?.trim()}
                  onClick={() => {
                    if (!newField.name?.trim()) return;
                    const field: SlotDef = {
                      name: newField.name!,
                      type: newField.type || 'text',
                      required: newField.required ?? true,
                      data_source: newField.data_source || 'user_input',
                      label: newField.label || undefined,
                    };
                    setSlots(prev => [...prev, field]);
                    setNewField({ name: '', type: 'text', required: true, data_source: 'user_input', label: '' });
                    setAddingField(false);
                    setSaved(false);
                  }}
                  className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-40 transition"
                >
                  Add Field
                </button>
                <button onClick={() => setAddingField(false)}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800 transition">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingField(true)}
              className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-gray-400 hover:text-gray-600 transition flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add New Field
            </button>
          )}

          <div className="pt-2">
            <button onClick={handleSave} disabled={saving}
              className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition">
              {saving ? 'Saving…' : saved ? '✓ Slot Configuration Saved' : 'Save Slot Configuration'}
            </button>
          </div>
        </div>
      )}

      {/* Sample format tab */}
      {tab === 'sample' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-gray-800">Sample / Reference Format</h3>
            <p className="text-xs text-gray-500 mt-1">
              Upload a sample document that shows the desired output format. This helps AI understand
              the exact structure expected and gives lawyers a visual reference.
            </p>
          </div>

          <input ref={sampleFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleSampleUpload} />

          {sampleFilename ? (
            <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-xl mb-4">
              <div className="text-2xl">📄</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-800 truncate">{sampleFilename}</p>
                <p className="text-xs text-green-600 mt-0.5">Sample format uploaded</p>
              </div>
              <button
                onClick={() => sampleFileRef.current?.click()}
                disabled={uploadingFile}
                className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition"
              >
                Replace
              </button>
            </div>
          ) : (
            <div
              onClick={() => sampleFileRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition"
            >
              <div className="text-4xl mb-3">📎</div>
              <p className="text-sm font-medium text-gray-600">Click to upload sample document</p>
              <p className="text-xs text-gray-400 mt-1">PDF, JPG, or PNG · Max {process.env.NEXT_PUBLIC_MAX_UPLOAD_MB ?? '10'}MB</p>
            </div>
          )}

          {uploadingFile && (
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-3">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Uploading…
            </div>
          )}

          <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-xl">
            <p className="text-xs text-amber-800 font-medium mb-1">How it works</p>
            <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
              <li>Lawyers see this document as a reference before generating</li>
              <li>AI uses the format structure to maintain consistent output style</li>
              <li>You can update the sample any time — changes apply immediately</li>
            </ul>
          </div>
        </div>
      )}

      {/* Content tab */}
      {tab === 'content' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Template Content</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Placeholders in <mark className="bg-yellow-100 text-yellow-800 rounded px-1">{`{{field_name}}`}</mark> will be replaced by user or AI inputs
              </p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              template.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {template.is_active ? 'Active' : 'Inactive'} · v{template.version}
            </span>
          </div>
          <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono leading-relaxed bg-gray-50 rounded-xl p-5 max-h-[500px] overflow-y-auto">
            {template.content.split(/(\{\{[^}]+\}\})/g).map((part, i) =>
              part.startsWith('{{')
                ? <mark key={i} className="bg-yellow-100 text-yellow-800 rounded px-0.5">{part}</mark>
                : <span key={i}>{part}</span>
            )}
          </pre>
        </div>
      )}
    </div>
  );
}
