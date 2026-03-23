'use client';
import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/utils/auth';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function UserChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);
    try {
      const res = await apiFetch<{ answer: string }>('/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text, session_id: sessionId }),
      });
      setMessages(prev => [...prev, { role: 'assistant', content: res.answer }]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Error: ${err?.message ?? 'Failed to get response'}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">AI Assistant</h1>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-3">🤖</div>
            <p className="text-sm">Ask me anything about legal, medical, or educational topics.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                m.role === 'user'
                  ? 'bg-gray-900 text-white rounded-br-sm'
                  : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'
              }`}
            >
              {m.content}
            </div>
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
      <div className="mt-4 flex gap-3 items-end">
        <textarea
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask a question… (Enter to send)"
          className="flex-1 resize-none px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:border-gray-400 transition bg-white"
          style={{ maxHeight: '120px', overflowY: 'auto' }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          className="px-5 py-3 bg-gray-900 text-white rounded-2xl text-sm font-medium hover:bg-gray-700 disabled:opacity-40 transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}
