'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { apiFetch } from '@/utils/auth';

// ── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant';
  content: string;
  documentContent?: string;
  documentId?: string;
  documentReady?: boolean;
}

interface ChatSession {
  id: string;
  backendSessionId: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  slot_definitions: { name: string; label: string; required: boolean; data_source: string }[];
}

interface KbDocument {
  id: string;
  filename: string;
  status: string;
  document_type: string;
  created_at: string;
}

interface Case {
  id: string;
  case_title: string;
  fir_number: string | null;
  fir_date: string | null;
  police_station: string | null;
  accused_name: string | null;
  sections: string | null;
  status: string;
  fir_fields: Record<string, string | null>;
  fir_file_names: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const SESSIONS_KEY = 'chat_sessions_v2';
const MAX_SESSIONS = 50;
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

// ── Utilities ────────────────────────────────────────────────────────────────

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: ChatSession[]) {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
  } catch { /* storage full */ }
}

function sessionTitle(messages: Message[]): string {
  const first = messages.find(m => m.role === 'user');
  if (!first) return 'New chat';
  return first.content.slice(0, 42) + (first.content.length > 42 ? '…' : '');
}

function newSession(): ChatSession {
  return {
    id: crypto.randomUUID(),
    backendSessionId: crypto.randomUUID(),
    title: 'New chat',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function groupByDate(sessions: ChatSession[]): { label: string; items: ChatSession[] }[] {
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86_400_000).toDateString();
  const sevenDays = new Date(now.getTime() - 7 * 86_400_000);

  const groups: Record<string, ChatSession[]> = { Today: [], Yesterday: [], 'Previous 7 days': [], Older: [] };
  for (const s of sessions) {
    const d = new Date(s.updatedAt);
    const ds = d.toDateString();
    if (ds === today) groups['Today'].push(s);
    else if (ds === yesterday) groups['Yesterday'].push(s);
    else if (d >= sevenDays) groups['Previous 7 days'].push(s);
    else groups['Older'].push(s);
  }
  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

// ── Sub-components ────────────────────────────────────────────────────────────

function renderMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}

function DocumentCard({ content, docId }: { content: string; docId?: string }) {
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null);

  const doExport = async (fmt: 'pdf' | 'docx') => {
    if (!docId) return;
    setExporting(fmt);
    try {
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
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="mt-3 rounded-2xl border border-gray-200 overflow-hidden shadow-sm bg-white w-full max-w-2xl">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-lg">📄</span>
          <span className="text-sm font-semibold text-gray-700">Generated Document</span>
        </div>
        {docId && (
          <div className="flex gap-2">
            <button
              onClick={() => doExport('pdf')}
              disabled={exporting === 'pdf'}
              className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition"
            >
              {exporting === 'pdf' ? '…' : '⬇ PDF'}
            </button>
            <button
              onClick={() => doExport('docx')}
              disabled={exporting === 'docx'}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {exporting === 'docx' ? '…' : '⬇ DOCX'}
            </button>
          </div>
        )}
      </div>
      <div className="p-5 max-h-96 overflow-y-auto">
        <pre className="whitespace-pre-wrap text-xs text-gray-800 font-mono leading-relaxed">
          {content}
        </pre>
      </div>
    </div>
  );
}

function SessionSidebar({
  sessions, activeId, onSelect, onNew, onDelete,
}: {
  sessions: ChatSession[];
  activeId: string;
  onSelect: (s: ChatSession) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  const groups = groupByDate(sessions);
  return (
    <div className="flex flex-col h-full bg-gray-950 text-white w-64 shrink-0">
      <div className="p-3 border-b border-gray-800">
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm font-medium transition text-white"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-2 space-y-4">
        {groups.length === 0 && (
          <p className="text-xs text-gray-500 text-center mt-6">No previous chats</p>
        )}
        {groups.map(group => (
          <div key={group.label}>
            <p className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {group.label}
            </p>
            {group.items.map(session => (
              <div
                key={session.id}
                className={`group relative mx-2 my-0.5 flex items-center rounded-lg cursor-pointer transition ${
                  session.id === activeId ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
                onClick={() => onSelect(session)}
              >
                <span className="flex-1 truncate px-3 py-2.5 text-sm">{session.title}</span>
                <button
                  onClick={e => { e.stopPropagation(); onDelete(session.id); }}
                  className="hidden group-hover:flex items-center justify-center w-7 h-7 mr-1 rounded hover:bg-gray-600 text-gray-400 hover:text-red-400 transition shrink-0"
                  title="Delete"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Right Sidebar — Templates + Knowledge Base ────────────────────────────────

const DOC_TYPE_LABEL: Record<string, string> = {
  act: 'Acts & Statutes',
  case_law: 'Case Law',
  sample: 'Sample Documents',
  textbook: 'Textbooks',
  protocol: 'Protocols',
  standard: 'Standard Forms',
};

function RightSidebar({
  templates,
  kbDocs,
  cases,
  domainName,
  onUseTemplate,
  onReferenceDoc,
  onResumeCase,
  loadingData,
}: {
  templates: Template[];
  kbDocs: KbDocument[];
  cases: Case[];
  domainName: string | null;
  onUseTemplate: (name: string) => void;
  onReferenceDoc: (filename: string) => void;
  onResumeCase: (c: Case) => void;
  loadingData: boolean;
}) {
  const [activeTab, setActiveTab] = useState<'templates' | 'knowledge' | 'cases'>('templates');
  const [search, setSearch] = useState('');
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const q = search.toLowerCase().trim();
  const filteredTemplates = q ? templates.filter(t => t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)) : templates;
  const filteredDocs      = q ? kbDocs.filter(d => d.filename.toLowerCase().includes(q) || d.document_type?.toLowerCase().includes(q) || DOC_TYPE_LABEL[d.document_type]?.toLowerCase().includes(q)) : kbDocs;

  const docsByCategory = filteredDocs.reduce<Record<string, KbDocument[]>>((acc, doc) => {
    const cat = doc.document_type ?? 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(doc);
    return acc;
  }, {});
  const categories = Object.keys(docsByCategory).sort();

  function toggleCat(cat: string) {
    setExpandedCats(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 w-64 shrink-0">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-gray-100 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {domainName ? `${domainName} Resources` : 'Resources'}
        </p>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search templates & docs…"
            className="w-full pl-8 pr-7 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 bg-gray-50 placeholder-gray-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg bg-gray-100 p-0.5">
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex-1 py-1 text-xs font-medium rounded-md transition ${
              activeTab === 'templates' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Tmpl {q && filteredTemplates.length > 0 && <span className="ml-0.5 text-blue-500">{filteredTemplates.length}</span>}
          </button>
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`flex-1 py-1 text-xs font-medium rounded-md transition ${
              activeTab === 'knowledge' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            KB {kbDocs.length > 0 && !q ? `(${kbDocs.length})` : q && filteredDocs.length > 0 ? `(${filteredDocs.length})` : ''}
          </button>
          <button
            onClick={() => setActiveTab('cases')}
            className={`flex-1 py-1 text-xs font-medium rounded-md transition ${
              activeTab === 'cases' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Cases {cases.length > 0 && <span className="ml-0.5 text-amber-500">{cases.length}</span>}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loadingData ? (
          <div className="flex items-center justify-center h-24">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        ) : activeTab === 'templates' ? (
          <div className="py-1">
            {filteredTemplates.length === 0 ? (
              <p className="text-xs text-gray-400 text-center mt-6 px-4">
                {q ? `No templates matching "${search}"` : 'No templates for your domain'}
              </p>
            ) : filteredTemplates.map(t => (
              <button
                key={t.id}
                onClick={() => onUseTemplate(t.name)}
                className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition border-b border-gray-50 group"
              >
                <div className="flex items-start gap-2">
                  <span className="text-sm mt-0.5 shrink-0">📄</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 group-hover:text-blue-600 transition leading-tight">{t.name}</p>
                    {t.description && <p className="text-xs text-gray-400 mt-0.5 leading-tight line-clamp-2">{t.description}</p>}
                    <p className="text-xs text-gray-300 mt-0.5">{t.slot_definitions?.length ?? 0} fields · tap to draft</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : activeTab === 'knowledge' ? (
          /* ── Knowledge Base — grouped by category ── */
          <div className="py-1">
            {categories.length === 0 ? (
              <div className="px-4 mt-6 text-center">
                {q
                  ? <p className="text-xs text-gray-400">No documents matching "{search}"</p>
                  : <><p className="text-xs text-gray-400">No documents in knowledge base yet</p><p className="text-xs text-gray-300 mt-1">Admin uploads power AI auto-fill</p></>
                }
              </div>
            ) : categories.map(cat => {
              const docs = docsByCategory[cat];
              const isOpen = expandedCats.has(cat) || !!q;
              const label = DOC_TYPE_LABEL[cat] ?? cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              return (
                <div key={cat} className="border-b border-gray-100">
                  <button
                    onClick={() => toggleCat(cat)}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm">📁</span>
                      <span className="text-xs font-semibold text-gray-700 leading-tight truncate">{label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">{docs.length}</span>
                      <svg
                        className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="bg-gray-50 border-t border-gray-100">
                      {docs.map(doc => (
                        <button key={doc.id} onClick={() => onReferenceDoc(doc.filename)}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 transition group border-b border-gray-100 last:border-0">
                          <div className="flex items-start gap-2">
                            <span className="text-xs mt-0.5 shrink-0 text-gray-400">📎</span>
                            <p className="text-xs text-gray-600 leading-tight line-clamp-2 group-hover:text-blue-600 transition break-all">
                              {doc.filename}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Cases tab ── */
          <div className="py-1">
            {cases.length === 0 ? (
              <div className="px-4 mt-6 text-center">
                <p className="text-xs text-gray-400">No cases yet</p>
                <p className="text-xs text-gray-300 mt-1">Upload a FIR to create your first case</p>
              </div>
            ) : cases.map(c => {
              const statusColor = c.status === 'active' ? 'bg-green-100 text-green-700' : c.status === 'closed' ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-700';
              return (
                <button
                  key={c.id}
                  onClick={() => onResumeCase(c)}
                  className="w-full text-left px-3 py-2.5 hover:bg-amber-50 transition border-b border-gray-100 group"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-sm mt-0.5 shrink-0">⚖️</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-800 leading-tight truncate group-hover:text-amber-700">{c.case_title}</p>
                      {c.fir_number && <p className="text-xs text-gray-400 mt-0.5">FIR {c.fir_number}</p>}
                      <div className="flex items-center justify-between mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusColor}`}>{c.status}</span>
                        <span className="text-xs text-gray-300">{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2.5 border-t border-gray-100">
        <p className="text-xs text-gray-300 text-center leading-tight">
          {activeTab === 'templates'
            ? `${templates.length} template${templates.length !== 1 ? 's' : ''} · click to draft`
            : activeTab === 'knowledge'
            ? `${kbDocs.length} doc${kbDocs.length !== 1 ? 's' : ''} in ${categories.length} categor${categories.length !== 1 ? 'ies' : 'y'}`
            : `${cases.length} case${cases.length !== 1 ? 's' : ''} · click to resume`}
        </p>
      </div>
    </div>
  );
}

// ── FIR field metadata (mirrors backend FIR_FIELDS) ──────────────────────────

const FIR_GROUPS = [
  { key: 'fir',        label: '📋 FIR Details',   fields: ['fir_number','fir_date','fir_time','police_station','district','sections'] },
  { key: 'accused',    label: '👤 Accused',        fields: ['accused_name','accused_father_name','accused_caste','accused_address'] },
  { key: 'complainant',label: '🧑 Complainant',    fields: ['complainant_name','complainant_father_name','complainant_caste','complainant_address'] },
  { key: 'incident',   label: '📍 Incident',       fields: ['incident_date','incident_time','incident_location','case_summary'] },
  { key: 'officials',  label: '🔍 Officials',      fields: ['investigating_officer','sho_name','witnesses'] },
];

const FIR_FIELD_LABELS: Record<string, string> = {
  fir_number: 'FIR Number', fir_date: 'FIR Date', fir_time: 'FIR Time',
  police_station: 'Police Station', district: 'District', sections: 'Sections / Offences',
  accused_name: 'Accused Name(s)', accused_father_name: "Accused Father's Name",
  accused_caste: 'Accused Caste', accused_address: 'Accused Address',
  complainant_name: 'Complainant Name', complainant_father_name: "Complainant Father's Name",
  complainant_caste: 'Complainant Caste', complainant_address: 'Complainant Address',
  incident_date: 'Incident Date', incident_time: 'Incident Time',
  incident_location: 'Incident Location', case_summary: 'Case Narrative / Bayan',
  investigating_officer: 'Investigating Officer', sho_name: 'SHO / Incharge', witnesses: 'Witnesses',
};

const FIR_CRITICAL = new Set(['fir_number','fir_date','police_station','sections','accused_name','incident_location']);

const TEXTAREA_FIELDS = new Set(['accused_address','complainant_address','incident_location','case_summary','witnesses']);

const SCAN_STEPS = [
  'Uploading document…',
  'Enhancing image quality…',
  'Reading FIR (Pass 1) — Urdu/Sindhi OCR…',
  'Verifying and refining fields (Pass 2)…',
  'Almost done — finalising extraction…',
];

interface FIRResult {
  fields: Record<string, string | null>;
  filled_count: number;
  total_fields: number;
  critical_missing: string[];
  confidence: number;
  error?: string;
}

// ── FIR Review Panel ──────────────────────────────────────────────────────────

function FIRReviewPanel({
  result,
  edited,
  onEdit,
  onApply,
  onSaveCase,
  onDiscard,
  saving,
}: {
  result: FIRResult;
  edited: Record<string, string>;
  onEdit: (key: string, val: string) => void;
  onApply: () => void;
  onSaveCase: () => void;
  onDiscard: () => void;
  saving: boolean;
}) {
  const pct = Math.round(result.confidence * 100);
  const barColor = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900">📋 FIR Extraction Review</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {result.filled_count}/{result.total_fields} fields extracted · Edit any field before applying
            </p>
          </div>
          <button onClick={onDiscard} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100 transition">
            ✕ Discard
          </button>
        </div>
        {/* Confidence bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <span className={`text-xs font-semibold ${pct >= 70 ? 'text-green-600' : pct >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
            {pct}% confidence
          </span>
        </div>
        {result.critical_missing.length > 0 && (
          <p className="text-xs text-amber-600 mt-2 bg-amber-50 px-2 py-1 rounded">
            ⚠ Missing critical fields: {result.critical_missing.map(k => FIR_FIELD_LABELS[k] ?? k).join(', ')} — please fill these manually
          </p>
        )}
      </div>

      {/* Fields — scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {FIR_GROUPS.map(grp => (
          <div key={grp.key}>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{grp.label}</p>
            <div className="grid grid-cols-2 gap-3">
              {grp.fields.map(fk => {
                const isCritical = FIR_CRITICAL.has(fk);
                const isTextarea = TEXTAREA_FIELDS.has(fk);
                const val = edited[fk] ?? result.fields[fk] ?? '';
                const missing = isCritical && !val;
                return (
                  <div key={fk} className={`${isTextarea ? 'col-span-2' : ''}`}>
                    <label className="block text-xs text-gray-500 mb-1">
                      {FIR_FIELD_LABELS[fk]}
                      {isCritical && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    {isTextarea ? (
                      <textarea
                        rows={fk === 'case_summary' ? 4 : 2}
                        value={val}
                        onChange={e => onEdit(fk, e.target.value)}
                        placeholder={missing ? '⚠ Not extracted — enter manually' : ''}
                        className={`w-full px-3 py-2 text-xs rounded-lg border text-gray-800 resize-none focus:outline-none focus:border-blue-400 transition
                          ${missing ? 'border-amber-300 bg-amber-50' : val ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50'}`}
                      />
                    ) : (
                      <input
                        type="text"
                        value={val}
                        onChange={e => onEdit(fk, e.target.value)}
                        placeholder={missing ? '⚠ Not found — enter manually' : ''}
                        className={`w-full px-3 py-2 text-xs rounded-lg border text-gray-800 focus:outline-none focus:border-blue-400 transition
                          ${missing ? 'border-amber-300 bg-amber-50' : val ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50'}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer actions */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 shrink-0 space-y-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onApply}
            className="flex-1 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition"
          >
            💬 Use in Chat
          </button>
          <button
            onClick={onSaveCase}
            disabled={saving}
            className="flex-1 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-50 transition"
          >
            {saving ? 'Saving…' : '📁 Save as Case'}
          </button>
        </div>
        <button
          onClick={onDiscard}
          className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 transition"
        >
          Discard
        </button>
      </div>
    </div>
  );
}

// ── Domain UI config ──────────────────────────────────────────────────────────

interface DomainUI {
  icon: string;
  suggestions: string[];
  placeholder: string;
  uploadHint: string;
}

const DOMAIN_UI: Record<string, DomainUI> = {
  Legal: {
    icon: '⚖️',
    suggestions: [
      '💬 "What are the bail conditions under section 497?"',
      '📄 "Write a bail application for my client"',
      '📎 Upload a FIR copy to auto-fill the form',
      '🔍 "Explain the grounds for pre-arrest bail"',
    ],
    placeholder: 'Ask a legal question or say "write a bail application"… (Enter to send)',
    uploadHint: '📎 Upload a FIR copy or case document to auto-extract fields',
  },
  Education: {
    icon: '🎓',
    suggestions: [
      '📄 "Write a lesson plan for grade 8 mathematics"',
      '📝 "Generate a student progress report for Ali Ahmed"',
      '✉️ "Write a recommendation letter for university admission"',
      '💬 "What are effective teaching strategies for large classrooms?"',
    ],
    placeholder: 'Ask an education question or say "write a lesson plan"… (Enter to send)',
    uploadHint: '📎 Upload a student record or report to auto-extract fields',
  },
  Medical: {
    icon: '🏥',
    suggestions: [
      '📄 "Write a discharge summary for my patient"',
      '✉️ "Generate a referral letter to a cardiologist"',
      '📋 "Write a medical certificate for sick leave"',
      '💬 "What are the standard post-operative care instructions?"',
    ],
    placeholder: 'Ask a medical question or say "write a discharge summary"… (Enter to send)',
    uploadHint: '📎 Upload patient records or lab reports to auto-extract fields',
  },
};

const DEFAULT_DOMAIN_UI: DomainUI = {
  icon: '🤖',
  suggestions: [
    '📄 "Help me draft a document"',
    '💬 "Answer a question from my knowledge base"',
    '📎 Upload a document to auto-fill form fields',
    '🔍 "Summarise the uploaded file"',
  ],
  placeholder: 'Ask a question or request a document… (Enter to send)',
  uploadHint: '📎 Upload a document to auto-extract fields',
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function UserChatPage() {
  const [sessions, setSessions]     = useState<ChatSession[]>([]);
  const [active, setActive]         = useState<ChatSession>(() => newSession());
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [templates, setTemplates]   = useState<Template[]>([]);
  const [kbDocs, setKbDocs]         = useState<KbDocument[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [domainName, setDomainName] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('domain_name');
  });

  // Cases state
  const [cases, setCases]               = useState<Case[]>([]);
  const [savingCase, setSavingCase]     = useState(false);

  // FIR context: structured fields cached for current session so any template auto-fills
  const [sessionFirFields, setSessionFirFields] = useState<Record<string, string | null> | null>(null);

  // FIR extraction state
  const [firStep, setFirStep]             = useState<'idle' | 'scanning' | 'reviewing'>('idle');
  const [firScanMsg, setFirScanMsg]       = useState('');
  const [firResult, setFirResult]         = useState<FIRResult | null>(null);
  const [firEdited, setFirEdited]         = useState<Record<string, string>>({});

  const bottomRef    = useRef<HTMLDivElement>(null);
  const fileRef      = useRef<HTMLInputElement>(null);
  const firFileRef   = useRef<HTMLInputElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const initialised  = useRef(false);

  // ── Initialise ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    setSessions(loadSessions());
    setActive(newSession());

    const token = localStorage.getItem('auth_token') || localStorage.getItem('admin_token');
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };

    // Fetch domain name, templates, KB docs, and cases in parallel
    Promise.all([
      fetch(`${API_BASE}/auth/me`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/templates`, { headers }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/documents?doc_status=approved`, { headers }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/api/cases`, { headers }).then(r => r.ok ? r.json() : []),
    ]).then(([me, tmpl, docs, casesData]) => {
      if (me?.domain_name) {
        localStorage.setItem('domain_name', me.domain_name);
        setDomainName(me.domain_name);
      }
      setTemplates(Array.isArray(tmpl) ? tmpl : []);
      setKbDocs(Array.isArray(docs) ? docs : []);
      setCases(Array.isArray(casesData) ? casesData : []);
    }).catch(() => {}).finally(() => setLoadingData(false));
  }, []);

  // ── Scroll to bottom ──────────────────────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [active.messages, loading]);

  // ── Persist sessions ──────────────────────────────────────────────────────

  const persistSession = useCallback((sess: ChatSession) => {
    if (sess.messages.length === 0) return;
    setSessions(prev => {
      const without = prev.filter(s => s.id !== sess.id);
      return [sess, ...without];
    });
  }, []);

  useEffect(() => {
    if (!initialised.current) return;
    if (active.messages.length > 0) persistSession(active);
  }, [active.messages]);

  useEffect(() => {
    if (initialised.current) saveSessions(sessions);
  }, [sessions]);

  // ── Session actions ───────────────────────────────────────────────────────

  function startNewChat() {
    if (active.messages.length > 0) {
      setSessions(prev => {
        const without = prev.filter(s => s.id !== active.id);
        return [active, ...without];
      });
    }
    setActive(newSession());
    setInput('');
    setSessionFirFields(null);
  }

  function selectSession(sess: ChatSession) {
    if (active.messages.length > 0 && active.id !== sess.id) {
      setSessions(prev => {
        const without = prev.filter(s => s.id !== active.id);
        return [active, ...without];
      });
    }
    setActive(sess);
    setInput('');
  }

  function deleteSession(id: string) {
    setSessions(prev => prev.filter(s => s.id !== id));
    if (active.id === id) setActive(newSession());
  }

  // ── Right sidebar actions ─────────────────────────────────────────────────

  function handleUseTemplate(name: string) {
    const msg = `Write a ${name}`;
    setInput(msg);
    textareaRef.current?.focus();
  }

  function handleReferenceDoc(filename: string) {
    const base = filename.replace(/\.[^.]+$/, '');
    setInput(prev => prev ? `${prev} (referencing "${base}")` : `Using "${base}" as reference, `);
    textareaRef.current?.focus();
  }

  // ── FIR extraction ────────────────────────────────────────────────────────

  async function handleFIRUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    e.target.value = '';

    setFirStep('scanning');
    setFirResult(null);
    setFirEdited({});

    // Cycle through progress messages while waiting
    let stepIdx = 0;
    setFirScanMsg(files.length > 1 ? `Loading ${files.length} pages…` : SCAN_STEPS[0]);
    const interval = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, SCAN_STEPS.length - 1);
      setFirScanMsg(SCAN_STEPS[stepIdx]);
    }, 3500);

    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('admin_token');
      const form = new FormData();
      // FastAPI List[UploadFile] expects the same field name repeated
      files.slice(0, 6).forEach(f => form.append('files', f));
      const res = await fetch(`${API_BASE}/api/fir/extract`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data: FIRResult = await res.json();
      if (!res.ok) throw new Error((data as any)?.detail ?? 'Extraction failed');
      setFirResult(data);
      setFirStep('reviewing');
    } catch (err: any) {
      setFirStep('idle');
      setActive(prev => ({
        ...prev,
        messages: [...prev.messages, {
          role: 'assistant',
          content: `⚠️ FIR scan failed: ${err?.message ?? 'Please try again or type the details manually.'}`,
        }],
        updatedAt: new Date().toISOString(),
      }));
    } finally {
      clearInterval(interval);
    }
  }

  function handleFIREdit(key: string, val: string) {
    setFirEdited(prev => ({ ...prev, [key]: val }));
  }

  function applyFIRToChat() {
    if (!firResult) return;
    const f = (key: string) => firEdited[key] ?? firResult.fields[key] ?? '';

    const lines: string[] = [
      '📋 FIR details extracted and verified:\n',
      `FIR No: ${f('fir_number')}    Date: ${f('fir_date')}    Time: ${f('fir_time')}`,
      `Police Station: ${f('police_station')}    District: ${f('district')}`,
      `Sections / Offences: ${f('sections')}`,
      '',
      `Accused: ${f('accused_name')}${f('accused_father_name') ? ` s/o ${f('accused_father_name')}` : ''}${f('accused_caste') ? `, b/c ${f('accused_caste')}` : ''}${f('accused_address') ? `, r/o ${f('accused_address')}` : ''}`,
      '',
      `Complainant: ${f('complainant_name')}${f('complainant_father_name') ? ` s/o ${f('complainant_father_name')}` : ''}${f('complainant_address') ? `, r/o ${f('complainant_address')}` : ''}`,
      '',
      `Incident: ${f('incident_date')}${f('incident_time') ? ` at ${f('incident_time')}` : ''}, Location: ${f('incident_location')}`,
      f('case_summary') ? `\nCase Narrative: ${f('case_summary')}` : '',
      f('witnesses') ? `\nWitnesses: ${f('witnesses')}` : '',
      f('investigating_officer') ? `IO: ${f('investigating_officer')}` : '',
      '',
      'What legal document would you like me to prepare based on this FIR? For example: Bail Application, Legal Notice, Vakalatnama, Succession Certificate, etc.',
    ].filter(l => l !== undefined);

    const msg = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();

    // Build merged FIR fields (edited values take priority)
    const mergedFields: Record<string, string | null> = { ...firResult.fields };
    for (const [k, v] of Object.entries(firEdited)) { if (v) mergedFields[k] = v; }

    // Cache FIR fields in session so any subsequent template also gets auto-filled
    setSessionFirFields(mergedFields);
    setFirStep('idle');
    setFirResult(null);
    setFirEdited({});
    send(msg, mergedFields);
  }

  function discardFIR() {
    setFirStep('idle');
    setFirResult(null);
    setFirEdited({});
  }

  async function saveCase() {
    if (!firResult) return;
    setSavingCase(true);
    try {
      const merged: Record<string, string | null> = { ...firResult.fields };
      for (const [k, v] of Object.entries(firEdited)) {
        if (v) merged[k] = v;
      }
      // Cache FIR fields so templates picked after saving still auto-fill
      setSessionFirFields(merged);
      const token = localStorage.getItem('auth_token') || localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/api/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fir_fields: merged, fir_file_names: [] }),
      });
      if (!res.ok) throw new Error('Failed to save case');
      const saved: Case = await res.json();
      setCases(prev => [saved, ...prev]);
      setFirStep('idle');
      setFirResult(null);
      setFirEdited({});
      // notify in chat
      setActive(prev => ({
        ...prev,
        messages: [...prev.messages, {
          role: 'assistant',
          content: `✅ Case saved: **${saved.case_title}**\nFIR ${saved.fir_number ?? '—'} · ${saved.police_station ?? ''}\n\nYou can find this case in the Cases tab (right panel). Use "💬 Use in Chat" next time to draft documents.`,
        }],
        updatedAt: new Date().toISOString(),
      }));
    } catch {
      setActive(prev => ({
        ...prev,
        messages: [...prev.messages, { role: 'assistant', content: '⚠️ Could not save case — please try again.' }],
        updatedAt: new Date().toISOString(),
      }));
    } finally {
      setSavingCase(false);
    }
  }

  function resumeCase(c: Case) {
    const f = (k: string) => c.fir_fields?.[k] ?? '';
    const lines = [
      `📁 Resuming case: **${c.case_title}**\n`,
      `FIR No: ${f('fir_number')}    Date: ${f('fir_date')}`,
      `Police Station: ${f('police_station')}    District: ${f('district')}`,
      `Sections: ${f('sections')}`,
      '',
      `Accused: ${f('accused_name')}${f('accused_father_name') ? ` s/o ${f('accused_father_name')}` : ''}`,
      `Complainant: ${f('complainant_name')}`,
      f('incident_location') ? `Incident Location: ${f('incident_location')}` : '',
      f('case_summary') ? `\nNarrative: ${f('case_summary')}` : '',
      '',
      'What would you like to do with this case? I can draft a Bail Application, Legal Notice, Vakalatnama, or any other legal document.',
    ].filter(Boolean);

    const msg = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();

    // Start a new session, then immediately send the resume message in it
    if (active.messages.length > 0) {
      setSessions(prev => {
        const without = prev.filter(s => s.id !== active.id);
        return [active, ...without];
      });
    }
    const newSess = newSession();
    setActive(newSess);
    setInput('');

    // Send resume message — use a ref trick to get the right session ID
    setTimeout(() => {
      const userMsg: Message = { role: 'user', content: msg };
      const updated: ChatSession = {
        ...newSess,
        messages: [userMsg],
        title: sessionTitle([userMsg]),
        updatedAt: new Date().toISOString(),
      };
      setActive(updated);
      setLoading(true);
      const token = localStorage.getItem('auth_token') || localStorage.getItem('admin_token');
      fetch(`${API_BASE}/api/conversation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: msg, session_id: newSess.backendSessionId, fir_fields: c.fir_fields }),
      }).then(r => r.json()).then(res => {
        const assistantMsg: Message = {
          role: 'assistant', content: res.reply,
          documentReady: res.document_ready, documentContent: res.document_content, documentId: res.document_id,
        };
        setActive(prev => ({ ...prev, messages: [...prev.messages, assistantMsg], updatedAt: new Date().toISOString() }));
      }).catch(() => {
        setActive(prev => ({ ...prev, messages: [...prev.messages, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }] }));
      }).finally(() => setLoading(false));
    }, 10);
  }

  // ── Send message ──────────────────────────────────────────────────────────

  async function send(overrideText?: string, firFields?: Record<string, string | null>) {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    setInput('');

    const userMsg: Message = { role: 'user', content: text };
    const updatedSession: ChatSession = {
      ...active,
      messages: [...active.messages, userMsg],
      title: active.messages.length === 0 ? sessionTitle([userMsg]) : active.title,
      updatedAt: new Date().toISOString(),
    };
    setActive(updatedSession);
    setLoading(true);

    try {
      const payload: Record<string, unknown> = { message: text, session_id: updatedSession.backendSessionId };
      // Include FIR fields: explicit (from applyFIRToChat) or session-cached (from any previous FIR upload)
      const fieldsToSend = firFields ?? sessionFirFields;
      if (fieldsToSend) payload.fir_fields = fieldsToSend;

      const res = await apiFetch<{
        reply: string;
        document_ready: boolean;
        document_content?: string;
        document_id?: string;
      }>('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const assistantMsg: Message = {
        role: 'assistant',
        content: res.reply,
        documentReady: res.document_ready,
        documentContent: res.document_content,
        documentId: res.document_id,
      };

      setActive(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMsg],
        updatedAt: new Date().toISOString(),
      }));
    } catch (err: any) {
      if (err?.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('domain_name');
        window.location.href = '/login';
        return;
      }
      setActive(prev => ({
        ...prev,
        messages: [...prev.messages, {
          role: 'assistant',
          content: `Sorry, something went wrong: ${err?.message ?? 'Please try again.'}`,
        }],
        updatedAt: new Date().toISOString(),
      }));
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  // ── File upload ───────────────────────────────────────────────────────────

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);

    try {
      const token = localStorage.getItem('auth_token');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/documents/extract-fields`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const data = await res.json();

      if (data.extracted_fields && Object.keys(data.extracted_fields).length > 0) {
        const fields = Object.entries(data.extracted_fields)
          .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
          .join('\n');
        await send(`I've uploaded a document. Here are the extracted details:\n${fields}\n\nPlease use these to fill in the required fields.`);
      } else {
        setActive(prev => ({
          ...prev,
          messages: [...prev.messages,
            { role: 'user', content: `[Uploaded: ${file.name}]` },
            { role: 'assistant', content: `I received **${file.name}** but couldn't extract recognisable fields. Please provide the case details manually.` },
          ],
          updatedAt: new Date().toISOString(),
        }));
      }
    } catch (err: any) {
      setActive(prev => ({
        ...prev,
        messages: [...prev.messages, {
          role: 'assistant',
          content: `Failed to process document: ${err?.message ?? 'Please try again.'}`,
        }],
        updatedAt: new Date().toISOString(),
      }));
    } finally {
      setUploading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const domainUI = (domainName && DOMAIN_UI[domainName]) ? DOMAIN_UI[domainName] : DEFAULT_DOMAIN_UI;

  return (
    <div className="flex -mx-8 -my-8 overflow-hidden" style={{ height: 'calc(100vh - 0px)' }}>

      {/* LEFT: Chat session sidebar — hover to expand */}
      <div
        className={`relative shrink-0 h-full transition-all duration-200 ease-in-out overflow-hidden ${
          sidebarExpanded ? 'w-64' : 'w-1.5'
        } bg-gray-950`}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        <div className="w-64 h-full">
          <SessionSidebar
            sessions={sessions}
            activeId={active.id}
            onSelect={selectSession}
            onNew={startNewChat}
            onDelete={deleteSession}
          />
        </div>
      </div>

      {/* Hidden FIR file input — multiple files supported */}
      <input
        ref={firFileRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.tiff,.webp"
        multiple
        className="hidden"
        onChange={handleFIRUpload}
      />

      {/* CENTRE: Main chat area */}
      <div className="flex-1 flex flex-col bg-gray-50 min-w-0 overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center gap-3 px-5 py-3.5 bg-white border-b border-gray-200 shrink-0">
          <div className="p-1.5 rounded-lg text-gray-400" title="Hover left edge to see chat history">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-gray-800 truncate">{active.title}</h1>
            <p className="text-xs text-gray-400">Hover left edge to see chat history</p>
          </div>
          {domainName && (
            <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full font-medium">
              {domainUI.icon} {domainName}
            </span>
          )}
          <button
            onClick={startNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
            title="Start new chat"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New chat
          </button>
        </div>

        {/* FIR scanning overlay — replaces empty state */}
        {firStep === 'reviewing' && firResult ? (
          <FIRReviewPanel
            result={firResult}
            edited={firEdited}
            onEdit={handleFIREdit}
            onApply={applyFIRToChat}
            onSaveCase={saveCase}
            onDiscard={discardFIR}
            saving={savingCase}
          />
        ) : firStep === 'scanning' ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-500">
            <div className="w-14 h-14 rounded-2xl bg-gray-900 flex items-center justify-center">
              <span className="text-2xl">📋</span>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800 mb-1">Scanning FIR Document</p>
              <p className="text-xs text-gray-500">{firScanMsg}</p>
            </div>
            <div className="flex gap-1.5">
              {[0,1,2].map(i => (
                <span key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
            <p className="text-xs text-gray-400 max-w-xs text-center">
              Using multi-pass AI to read Urdu/Sindhi text — this may take 15–25 seconds
            </p>
          </div>
        ) : (

        /* Messages */
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {active.messages.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-5xl mb-4">{domainUI.icon}</div>
              <p className="text-sm font-medium text-gray-600">How can I help you today?</p>
              {domainName && (
                <p className="text-xs text-gray-400 mt-1">{domainName} domain</p>
              )}

              {/* FIR Upload card — prominent for Legal domain */}
              {domainName === 'Legal' && (
                <div className="mt-6 mx-auto max-w-sm">
                  <button
                    onClick={() => firFileRef.current?.click()}
                    className="w-full flex items-center gap-3 px-5 py-4 bg-gray-900 text-white rounded-2xl hover:bg-gray-800 transition shadow-lg group"
                  >
                    <span className="text-2xl">📋</span>
                    <div className="text-left">
                      <p className="text-sm font-bold">Upload FIR Document</p>
                      <p className="text-xs text-gray-300">AI extracts all case details automatically</p>
                    </div>
                    <svg className="w-4 h-4 ml-auto text-gray-400 group-hover:text-white transition" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <p className="text-xs text-gray-400 mt-2">Select 1–6 files (pages) · PDF, JPEG, PNG · Urdu/Sindhi photocopies supported</p>
                </div>
              )}

              <div className="mt-5 space-y-2 text-xs text-gray-400">
                {domainUI.suggestions.map((s, i) => <p key={i}>{s}</p>)}
              </div>
              {templates.length > 0 && (
                <div className="mt-6 text-xs text-gray-400">
                  <p className="font-medium text-gray-500 mb-2">Quick start — click a template:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {templates.slice(0, 4).map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleUseTemplate(t.name)}
                        className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition shadow-sm"
                      >
                        📄 {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {active.messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-gray-900 text-white rounded-br-sm whitespace-pre-wrap'
                    : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm whitespace-pre-wrap'
                }`}
              >
                {m.role === 'assistant' ? renderMarkdown(m.content ?? '') : m.content}
              </div>
              {m.documentReady && m.documentContent && (
                <DocumentCard content={m.documentContent} docId={m.documentId} />
              )}
            </div>
          ))}

          {(loading || uploading) && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
                <div className="flex gap-1 items-center">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        )} {/* end firStep conditional */}

        {/* Input bar — always visible */}
        <div className="px-6 pb-5 pt-3 bg-white border-t border-gray-200 shrink-0">
          <div className="flex gap-2 items-end max-w-3xl mx-auto">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={handleFileUpload}
            />

            {/* FIR scan button — Legal domain only */}
            {domainName === 'Legal' && (
              <button
                onClick={() => firFileRef.current?.click()}
                disabled={loading || uploading || firStep === 'scanning'}
                title="Upload FIR — AI extracts all case details"
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-900 bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 disabled:opacity-40 transition shrink-0"
              >
                📋 FIR
              </button>
            )}

            <button
              onClick={() => fileRef.current?.click()}
              disabled={loading || uploading}
              title={domainUI.uploadHint}
              className="p-3 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>

            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={firStep === 'reviewing' ? 'Review extracted FIR details above, then click Apply…' : domainUI.placeholder}
              disabled={firStep === 'scanning'}
              className="flex-1 resize-none px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:border-gray-400 transition bg-white disabled:opacity-50"
              style={{ maxHeight: '120px', overflowY: 'auto' }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading || uploading || firStep === 'scanning'}
              className="px-5 py-3 bg-gray-900 text-white rounded-2xl text-sm font-medium hover:bg-gray-700 disabled:opacity-40 transition shrink-0"
            >
              Send
            </button>
          </div>
          {domainName === 'Legal' && firStep === 'idle' && (
            <p className="text-center text-xs text-gray-400 mt-2">
              📋 <button onClick={() => firFileRef.current?.click()} className="underline hover:text-gray-600 transition">Upload FIR</button> to auto-extract all case details · or type your question
            </p>
          )}
        </div>
      </div>

      {/* RIGHT: Templates + Knowledge Base + Cases sidebar */}
      <RightSidebar
        templates={templates}
        kbDocs={kbDocs}
        cases={cases}
        domainName={domainName}
        onUseTemplate={handleUseTemplate}
        onReferenceDoc={handleReferenceDoc}
        onResumeCase={resumeCase}
        loadingData={loadingData}
      />
    </div>
  );
}
