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

function RightSidebar({
  templates,
  kbDocs,
  domainName,
  onUseTemplate,
  onReferenceDoc,
  loadingData,
}: {
  templates: Template[];
  kbDocs: KbDocument[];
  domainName: string | null;
  onUseTemplate: (name: string) => void;
  onReferenceDoc: (filename: string) => void;
  loadingData: boolean;
}) {
  const [activeTab, setActiveTab] = useState<'templates' | 'knowledge'>('templates');
  const [search, setSearch] = useState('');

  const q = search.toLowerCase().trim();
  const filteredTemplates = q ? templates.filter(t => t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)) : templates;
  const filteredDocs      = q ? kbDocs.filter(d => d.filename.toLowerCase().includes(q) || d.document_type?.toLowerCase().includes(q)) : kbDocs;

  const statusColor = (status: string) => {
    if (status === 'approved') return 'bg-green-100 text-green-700';
    if (status === 'pending')  return 'bg-yellow-100 text-yellow-700';
    if (status === 'rejected') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-500';
  };

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
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition ${
              activeTab === 'templates' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Templates {q && filteredTemplates.length > 0 && <span className="ml-1 text-blue-500">{filteredTemplates.length}</span>}
          </button>
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition ${
              activeTab === 'knowledge' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            KB {q && filteredDocs.length > 0 && <span className="ml-1 text-blue-500">{filteredDocs.length}</span>}
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
        ) : (
          <div className="py-1">
            {filteredDocs.length === 0 ? (
              <div className="px-4 mt-6 text-center">
                {q
                  ? <p className="text-xs text-gray-400">No documents matching "{search}"</p>
                  : <><p className="text-xs text-gray-400">No documents in knowledge base yet</p><p className="text-xs text-gray-300 mt-1">Admin uploads power AI auto-fill</p></>
                }
              </div>
            ) : filteredDocs.map(doc => (
              <button
                key={doc.id}
                onClick={() => onReferenceDoc(doc.filename)}
                className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition border-b border-gray-50 group"
              >
                <div className="flex items-start gap-2">
                  <span className="text-sm mt-0.5 shrink-0">📎</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-700 leading-tight break-all line-clamp-2 group-hover:text-blue-600 transition">{doc.filename}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusColor(doc.status)}`}>{doc.status}</span>
                      <span className="text-xs text-gray-300">{new Date(doc.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2.5 border-t border-gray-100">
        <p className="text-xs text-gray-300 text-center leading-tight">
          {activeTab === 'templates'
            ? `${templates.length} templates · click to draft`
            : `${kbDocs.length} docs in knowledge base`}
        </p>
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

  const bottomRef    = useRef<HTMLDivElement>(null);
  const fileRef      = useRef<HTMLInputElement>(null);
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

    // Fetch domain name, templates, and KB docs in parallel
    Promise.all([
      fetch(`${API_BASE}/auth/me`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/templates`, { headers }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/documents?doc_status=approved`, { headers }).then(r => r.ok ? r.json() : []),
    ]).then(([me, tmpl, docs]) => {
      if (me?.domain_name) {
        localStorage.setItem('domain_name', me.domain_name);
        setDomainName(me.domain_name);
      }
      setTemplates(Array.isArray(tmpl) ? tmpl : []);
      setKbDocs(Array.isArray(docs) ? docs : []);
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

  // ── Send message ──────────────────────────────────────────────────────────

  async function send(overrideText?: string) {
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
      const res = await apiFetch<{
        reply: string;
        document_ready: boolean;
        document_content?: string;
        document_id?: string;
      }>('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, session_id: updatedSession.backendSessionId }),
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

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {active.messages.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-4">{domainUI.icon}</div>
              <p className="text-sm font-medium text-gray-600">How can I help you today?</p>
              {domainName && (
                <p className="text-xs text-gray-400 mt-1">{domainName} domain</p>
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

        {/* Input bar */}
        <div className="px-6 pb-5 pt-3 bg-white border-t border-gray-200 shrink-0">
          <div className="flex gap-2 items-end max-w-3xl mx-auto">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={handleFileUpload}
            />
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
              placeholder={domainUI.placeholder}
              className="flex-1 resize-none px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:border-gray-400 transition bg-white"
              style={{ maxHeight: '120px', overflowY: 'auto' }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading || uploading}
              className="px-5 py-3 bg-gray-900 text-white rounded-2xl text-sm font-medium hover:bg-gray-700 disabled:opacity-40 transition shrink-0"
            >
              Send
            </button>
          </div>
          <p className="text-center text-xs text-gray-300 mt-2">{domainUI.uploadHint}</p>
        </div>
      </div>

      {/* RIGHT: Templates + Knowledge Base sidebar */}
      <RightSidebar
        templates={templates}
        kbDocs={kbDocs}
        domainName={domainName}
        onUseTemplate={handleUseTemplate}
        onReferenceDoc={handleReferenceDoc}
        loadingData={loadingData}
      />
    </div>
  );
}
