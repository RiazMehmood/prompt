'use client';
import { useEffect, useState } from 'react';
import { apiFetch, getUser, AuthUser } from '@/utils/auth';

interface Sub {
  tier: string; limits: Record<string,number>;
  docs_generated_today: number; uploads_today: number; conversations_today: number;
  docs_remaining: number; uploads_remaining: number; conversations_remaining: number;
}

function UsageMeter({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = max > 0 ? Math.min(Math.round((used/max)*100), 100) : 0;
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-blue-500';
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{label}</span>
        <span className="font-medium">{used} / {max}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function UserHome() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sub, setSub]   = useState<Sub | null>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    Promise.all([
      apiFetch<Sub>('/subscriptions/current'),
      apiFetch<any>('/documents'),
    ]).then(([s, d]) => {
      setSub(s);
      setDocs(Array.isArray(d) ? d.slice(0, 5) : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const tierColor: Record<string,string> = {
    basic: 'bg-gray-100 text-gray-700',
    standard: 'bg-blue-100 text-blue-700',
    premium: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">{user?.email}</p>
        </div>
        {sub && (
          <span className={`px-3 py-1 rounded-full text-sm font-semibold capitalize ${tierColor[sub.tier] ?? 'bg-gray-100 text-gray-700'}`}>
            {sub.tier} Plan
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-gray-400">Loading…</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Usage card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Today's Usage</h2>
            {sub ? (
              <div className="space-y-4">
                <UsageMeter label="AI Conversations" used={sub.conversations_today} max={sub.limits.conversation_messages_per_day} />
                <UsageMeter label="Document Uploads"  used={sub.uploads_today}        max={sub.limits.uploads_per_day} />
                <UsageMeter label="Doc Generations"   used={sub.docs_generated_today} max={sub.limits.doc_generations_per_day} />
              </div>
            ) : <p className="text-gray-400 text-sm">No usage data</p>}
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { href: '/user/chat',      emoji: '🤖', label: 'Ask AI Assistant' },
                { href: '/user/documents', emoji: '📄', label: 'View My Documents' },
                { href: '/user/billing',   emoji: '💳', label: 'Manage Subscription' },
              ].map(a => (
                <a key={a.href} href={a.href} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition">
                  <span className="text-xl">{a.emoji}</span>
                  <span className="text-sm font-medium text-gray-800">{a.label}</span>
                  <span className="ml-auto text-gray-400">→</span>
                </a>
              ))}
            </div>
          </div>

          {/* Recent docs */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Recent Documents</h2>
              <a href="/user/documents" className="text-xs text-blue-600 hover:text-blue-800">View all →</a>
            </div>
            {docs.length === 0 ? (
              <p className="text-sm text-gray-400">No documents yet. <a href="/user/chat" className="text-blue-600 hover:underline">Start a conversation →</a></p>
            ) : (
              <div className="space-y-2">
                {docs.map((d: any) => (
                  <div key={d.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <span className="text-gray-400 text-sm">📄</span>
                    <span className="text-sm text-gray-800 flex-1 truncate">{d.filename ?? d.title ?? d.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${d.status==='approved'||d.validation_status==='valid' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{d.status ?? d.validation_status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
