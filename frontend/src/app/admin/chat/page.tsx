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
      // No saved doc — export from content directly as plain text download
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `document.${fmt}`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    setExporting(fmt);
    try {
      const res = await fetch(`${API_BASE}/api/generate/${docId}/export?format=${fmt}`, {
        headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error(`Export failed: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `document.${fmt}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export failed: ${err?.message}`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="mt-3 rounded-2xl border border-emerald-200 overflow-hidden shadow-sm bg-white w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 border-b border-emerald-100">
        <div className="flex items-center gap-2">
          <span className="text-lg">📄</span>
          <span className="text-sm font-semibold text-emerald-800">Generated Document</span>
          {docId && (
            <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
              ID: {docId.slice(0, 8)}…
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => doExport('pdf')}
            disabled={exporting === 'pdf'}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {exporting === 'pdf' ? 'Exporting…' : 'Download PDF'}
          </button>
          <button
            onClick={() => doExport('docx')}
            disabled={exporting === 'docx'}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {exporting === 'docx' ? 'Exporting…' : 'Download DOCX'}
          </button>
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1.5 text-gray-400 hover:text-gray-700 transition"
            title={expanded ? 'Collapse' : 'Expand'}
          >
            <svg className={`w-4 h-4 transition-transform ${expanded ? '' : '-rotate-180'}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Document content */}
      {expanded && (
        <div className="p-5 max-h-[500px] overflow-y-auto bg-gray-50">
          <pre className="whitespace-pre-wrap text-xs text-gray-800 font-mono leading-relaxed">
            {content}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function AdminChatPage() {
  const [domains, setDomains]   = useState<Domain[]>([]);
  const [domainId, setDomainId] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [sessionId]             = useState(() => crypto.randomUUID());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_BASE}/domains`, { headers: { ...getAuthHeader(), 'Content-Type': 'application/json' } })
      .then(r => r.json())
      .then((data: any) => {
        const list = Array.isArray(data) ? data : (data?.data ?? []);
        setDomains(list);
        if (list.length > 0) setDomainId(list[0].id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

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
        const msg = typeof detail === 'string' ? detail
          : typeof detail === 'object' && detail !== null ? (detail.message ?? JSON.stringify(detail))
          : 'Request failed';
        throw new Error(msg);
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

  const selectedDomain = domains.find(d => d.id === domainId);

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Test AI Chat</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Query any domain's AI — test RAG quality and document generation end-to-end.
          </p>
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
          <button
            onClick={() => setMessages([])}
            className="px-3 py-2 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">🧪</div>
            <p className="text-sm font-medium text-gray-600">Test the AI for any domain</p>
            <div className="mt-4 space-y-1.5 text-xs text-gray-400">
              <p>💬 Ask a question to verify RAG retrieval quality</p>
              <p>📄 Say "write a bail application" to test document generation</p>
              <p>🌐 Switch domains from the dropdown to compare AI behaviour</p>
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-gray-900 text-white rounded-br-sm'
                : 'bg-gray-50 border border-gray-100 text-gray-800 rounded-bl-sm'
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
            <div className="bg-gray-50 border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm">
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
      <div className="mt-3 flex gap-2">
        <textarea
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={domainId ? 'Type a message… (Enter to send)' : 'Select a domain first'}
          disabled={!domainId}
          className="flex-1 resize-none px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:border-gray-400 transition bg-white disabled:opacity-50"
          style={{ maxHeight: '120px', overflowY: 'auto' }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading || !domainId}
          className="px-5 py-3 bg-gray-900 text-white rounded-2xl text-sm font-medium hover:bg-gray-700 disabled:opacity-40 transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}
