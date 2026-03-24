'use client';
import { useEffect, useRef, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  documentReady?: boolean;
  documentContent?: string;
  documentId?: string;
}
interface Domain { id: string; name: string; knowledge_base_namespace: string; }
interface Template { id: string; name: string; description: string; slot_definitions: any[]; }
interface KbDoc { id: string; filename: string; status: string; document_type: string; created_at: string; }

function getAuthHeader() {
  const token = typeof window !== 'undefined'
    ? (localStorage.getItem('auth_token') ?? localStorage.getItem('admin_token'))
    : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function renderMarkdown(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}

function DocumentCard({ content, docId }: { content: string; docId?: string }) {
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null);
  const [expanded, setExpanded] = useState(true);

  const doExport = async (fmt: 'pdf' | 'docx') => {
    if (!docId) {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `document.${fmt}`; a.click();
      URL.revokeObjectURL(url); return;
    }
    setExporting(fmt);
    try {
      const res = await fetch(`${API_BASE}/api/generate/${docId}/export?format=${fmt}`, { headers: getAuthHeader() });
      if (!res.ok) throw new Error(`Export failed: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `document.${fmt}`; a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) { alert(`Export failed: ${err?.message}`); }
    finally { setExporting(null); }
  };

  return (
    <div className="mt-3 rounded-2xl border border-emerald-200 overflow-hidden shadow-sm bg-white w-full">
      <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 border-b border-emerald-100">
        <div className="flex items-center gap-2">
          <span className="text-lg">📄</span>
          <span className="text-sm font-semibold text-emerald-800">Generated Document</span>
          {docId && <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">ID: {docId.slice(0, 8)}…</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => doExport('pdf')} disabled={exporting === 'pdf'}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition">
            {exporting === 'pdf' ? 'Exporting…' : '⬇ PDF'}
          </button>
          <button onClick={() => doExport('docx')} disabled={exporting === 'docx'}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition">
            {exporting === 'docx' ? 'Exporting…' : '⬇ DOCX'}
          </button>
          <button onClick={() => setExpanded(v => !v)} className="p-1.5 text-gray-400 hover:text-gray-700 transition">
            <svg className={`w-4 h-4 transition-transform ${expanded ? '' : '-rotate-180'}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>
      {expanded && (
        <div className="p-5 max-h-[500px] overflow-y-auto bg-gray-50">
          <pre className="whitespace-pre-wrap text-xs text-gray-800 font-mono leading-relaxed">{content}</pre>
        </div>
      )}
    </div>
  );
}

// ── Right Sidebar ─────────────────────────────────────────────────────────────

const DOC_TYPE_LABEL: Record<string, string> = {
  act: 'Acts & Statutes',
  case_law: 'Case Law',
  sample: 'Sample Documents',
  textbook: 'Textbooks',
  protocol: 'Protocols',
  standard: 'Standard Forms',
};

function RightSidebar({
  templates, kbDocs, domainName, loadingData, onUseTemplate, onReferenceDoc,
}: {
  templates: Template[];
  kbDocs: KbDoc[];
  domainName: string;
  loadingData: boolean;
  onUseTemplate: (name: string) => void;
  onReferenceDoc: (filename: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<'templates' | 'knowledge'>('templates');
  const [search, setSearch] = useState('');
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  // Reset expanded state when domain changes (kbDocs array reference changes)
  const prevDocsLen = kbDocs.length;

  const q = search.toLowerCase().trim();

  const filteredTemplates = q
    ? templates.filter(t => t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q))
    : templates;

  // Group KB docs by document_type, optionally filtered by search
  const filteredDocs = q
    ? kbDocs.filter(d => d.filename.toLowerCase().includes(q) || d.document_type?.toLowerCase().includes(q) || DOC_TYPE_LABEL[d.document_type]?.toLowerCase().includes(q))
    : kbDocs;

  const docsByCategory = filteredDocs.reduce<Record<string, KbDoc[]>>((acc, doc) => {
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
      <div className="px-4 pt-4 pb-2 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          {domainName ? `${domainName} Resources` : 'Resources'}
        </p>

        {/* Search */}
        <div className="relative mb-2">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full pl-7 pr-6 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:border-gray-400 focus:bg-white transition"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-xs leading-none">×</button>
          )}
        </div>

        <div className="flex rounded-lg bg-gray-100 p-0.5">
          <button onClick={() => setActiveTab('templates')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition ${activeTab === 'templates' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            Templates {q && filteredTemplates.length > 0 ? `(${filteredTemplates.length})` : ''}
          </button>
          <button onClick={() => setActiveTab('knowledge')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition ${activeTab === 'knowledge' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            KB {q && filteredDocs.length > 0 ? `(${filteredDocs.length})` : kbDocs.length > 0 ? `(${kbDocs.length})` : ''}
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
          <div className="py-2">
            {filteredTemplates.length === 0
              ? <p className="text-xs text-gray-400 text-center mt-6 px-4">{q ? 'No templates match your search' : 'No templates for this domain'}</p>
              : filteredTemplates.map(t => (
                <button key={t.id} onClick={() => onUseTemplate(t.name)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition border-b border-gray-50 group">
                  <div className="flex items-start gap-2">
                    <span className="text-base mt-0.5 shrink-0">📄</span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 group-hover:text-blue-600 transition leading-tight">{t.name}</p>
                      {t.description && <p className="text-xs text-gray-400 mt-0.5 leading-tight line-clamp-2">{t.description}</p>}
                      <p className="text-xs text-gray-300 mt-1">{t.slot_definitions?.length ?? 0} fields</p>
                    </div>
                  </div>
                  <p className="text-xs text-blue-400 mt-1.5 opacity-0 group-hover:opacity-100 transition pl-6">Click to use →</p>
                </button>
              ))
            }
          </div>
        ) : (
          /* ── Knowledge Base — grouped by category ── */
          <div className="py-1">
            {categories.length === 0 ? (
              <div className="px-4 mt-6 text-center">
                <p className="text-xs text-gray-400">{q ? 'No documents match your search' : 'No documents in knowledge base'}</p>
                {!q && <p className="text-xs text-gray-300 mt-1">Upload and approve documents via the Documents section</p>}
              </div>
            ) : categories.map(cat => {
              const docs = docsByCategory[cat];
              const isOpen = expandedCats.has(cat) || !!q; // auto-expand when searching
              const label = DOC_TYPE_LABEL[cat] ?? cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              return (
                <div key={cat} className="border-b border-gray-100">
                  {/* Category header */}
                  <button
                    onClick={() => toggleCat(cat)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition text-left"
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

                  {/* Documents list */}
                  {isOpen && (
                    <div className="bg-gray-50 border-t border-gray-100">
                      {docs.map(doc => (
                        <button key={doc.id} onClick={() => onReferenceDoc(doc.filename)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 transition group border-b border-gray-100 last:border-0">
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
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100">
        <p className="text-xs text-gray-300 text-center leading-tight">
          {activeTab === 'templates'
            ? `${templates.length} template${templates.length !== 1 ? 's' : ''} · click to test`
            : `${kbDocs.length} doc${kbDocs.length !== 1 ? 's' : ''} in ${categories.length} categor${categories.length !== 1 ? 'ies' : 'y'}`}
        </p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminChatPage() {
  const [domains, setDomains]       = useState<Domain[]>([]);
  const [domainId, setDomainId]     = useState('');
  const [messages, setMessages]     = useState<Message[]>([]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [sessionId]                 = useState(() => crypto.randomUUID());
  const [templates, setTemplates]   = useState<Template[]>([]);
  const [kbDocs, setKbDocs]         = useState<KbDoc[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load domains on mount
  useEffect(() => {
    fetch(`${API_BASE}/domains`, { headers: { ...getAuthHeader(), 'Content-Type': 'application/json' } })
      .then(r => r.json())
      .then((data: any) => {
        const list: Domain[] = Array.isArray(data) ? data : (data?.data ?? []);
        setDomains(list);
        if (list.length > 0) setDomainId(list[0].id);
      })
      .catch(() => {});
  }, []);

  // Reload templates + KB docs when domain changes
  useEffect(() => {
    if (!domainId) return;
    setLoadingData(true);
    const headers = { ...getAuthHeader(), 'Content-Type': 'application/json' };
    const domain = domains.find(d => d.id === domainId);
    const ns = domain?.knowledge_base_namespace ?? '';

    Promise.all([
      fetch(`${API_BASE}/templates?domain_id=${domainId}`, { headers }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/documents?doc_status=approved&domain_id=${domainId}`, { headers }).then(r => r.ok ? r.json() : []),
    ]).then(([tmpl, docs]) => {
      setTemplates(Array.isArray(tmpl) ? tmpl : []);
      setKbDocs(Array.isArray(docs) ? docs : []);
    }).catch(() => {}).finally(() => setLoadingData(false));
  }, [domainId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const selectedDomain = domains.find(d => d.id === domainId);

  function handleUseTemplate(name: string) {
    setInput(`Write a ${name}`);
    textareaRef.current?.focus();
  }

  function handleReferenceDoc(filename: string) {
    const base = filename.replace(/\.[^.]+$/, '');
    setInput(prev => prev ? `${prev} (referencing "${base}")` : `Using "${base}" as reference, `);
    textareaRef.current?.focus();
  }

  async function send() {
    const text = input.trim();
    if (!text || loading || !domainId) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/conversation`, {
        method: 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, session_id: sessionId, domain_id: domainId }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data?.detail;
        throw new Error(typeof detail === 'string' ? detail : typeof detail === 'object' && detail ? (detail.message ?? JSON.stringify(detail)) : 'Request failed');
      }
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply ?? '',
        documentReady: data.document_ready ?? false,
        documentContent: data.document_content,
        documentId: data.document_id,
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Error: ${err?.message ?? 'Unknown error'}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex -mx-8 -my-8 overflow-hidden" style={{ height: 'calc(100vh - 0px)' }}>

      {/* CENTRE: Chat area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50">

        {/* Top bar */}
        <div className="flex items-center gap-4 px-6 py-4 bg-white border-b border-gray-200 shrink-0 flex-wrap">
          <div>
            <h1 className="text-base font-bold text-gray-900">Test AI Chat</h1>
            <p className="text-xs text-gray-500">Query any domain's AI — test RAG quality and document generation end-to-end.</p>
          </div>
          <div className="ml-auto flex items-center gap-3 flex-wrap">
            {selectedDomain && (
              <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-full font-medium">
                ns: {selectedDomain.knowledge_base_namespace}
              </span>
            )}
            <select
              value={domainId}
              onChange={e => { setDomainId(e.target.value); setMessages([]); }}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-gray-400"
            >
              {domains.length === 0 && <option value="">Loading domains…</option>}
              {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <button onClick={() => setMessages([])}
              className="px-3 py-2 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
              Clear
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">🧪</div>
              <p className="text-sm font-medium text-gray-600">Test the AI for any domain</p>
              <div className="mt-4 space-y-1.5 text-xs text-gray-400">
                <p>💬 Ask a question to verify RAG retrieval quality</p>
                <p>📄 Say "write a bail application" to test document generation</p>
                <p>🌐 Switch domains from the dropdown to compare AI behaviour</p>
              </div>
              {templates.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs font-medium text-gray-500 mb-2">Quick test — click a template:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {templates.slice(0, 4).map(t => (
                      <button key={t.id} onClick={() => handleUseTemplate(t.name)}
                        className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition shadow-sm">
                        📄 {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user' ? 'bg-gray-900 text-white rounded-br-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'
              }`}>
                {m.role === 'assistant' ? renderMarkdown(m.content) : m.content}
              </div>
              {m.documentReady && m.documentContent && (
                <DocumentCard content={m.documentContent} docId={m.documentId} />
              )}
            </div>
          ))}

          {loading && (
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

        {/* Input */}
        <div className="px-6 pb-5 pt-3 bg-white border-t border-gray-200 shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={domainId ? `Ask the ${selectedDomain?.name ?? ''} AI anything… (Enter to send)` : 'Select a domain first'}
              disabled={!domainId}
              className="flex-1 resize-none px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:border-gray-400 transition bg-white disabled:opacity-50"
              style={{ maxHeight: '120px', overflowY: 'auto' }}
            />
            <button onClick={send} disabled={!input.trim() || loading || !domainId}
              className="px-5 py-3 bg-gray-900 text-white rounded-2xl text-sm font-medium hover:bg-gray-700 disabled:opacity-40 transition shrink-0">
              Send
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT: Templates + Knowledge Base sidebar */}
      <RightSidebar
        templates={templates}
        kbDocs={kbDocs}
        domainName={selectedDomain?.name ?? ''}
        loadingData={loadingData}
        onUseTemplate={handleUseTemplate}
        onReferenceDoc={handleReferenceDoc}
      />
    </div>
  );
}
