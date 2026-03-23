'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/utils/auth';

interface Limits {
  doc_generations_per_day: number;
  uploads_per_day: number;
  conversation_messages_per_day: number;
  max_active_documents: number;
  limit_period: string;
  languages: string[];
  max_pages_per_generation?: number;
}

interface Sub {
  tier: string;
  limits: Limits;
  started_at: string;
  expires_at?: string;
  is_trial: boolean;
  docs_generated_today: number;
  uploads_today: number;
  conversations_today: number;
  docs_remaining: number;
  uploads_remaining: number;
  conversations_remaining: number;
}

interface TierFeature { name: string; included: boolean; note?: string; }
interface Tier {
  tier: string;
  display_name: string;
  price_pkr_monthly?: number;
  limits: Limits;
  features: TierFeature[];
  is_available: boolean;
  highlight: boolean;
}

const TIER_ICONS: Record<string, string> = {
  free_trial: '🌱', basic: '🌱', pro: '🚀', premium: '⭐', institutional: '🏢',
};

const TIER_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  free_trial:    { bg: 'bg-emerald-50',  text: 'text-emerald-800', border: 'border-emerald-200' },
  basic:         { bg: 'bg-gray-50',     text: 'text-gray-800',    border: 'border-gray-200'    },
  pro:           { bg: 'bg-blue-50',     text: 'text-blue-800',    border: 'border-blue-200'    },
  premium:       { bg: 'bg-purple-50',   text: 'text-purple-800',  border: 'border-purple-200'  },
  institutional: { bg: 'bg-amber-50',    text: 'text-amber-800',   border: 'border-amber-200'   },
};

function UsageMeter({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = max > 0 ? Math.min(Math.round((used / max) * 100), 100) : 0;
  const bar  = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-gray-800">{used} / {max}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${bar} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function UserBillingPage() {
  const [sub, setSub]     = useState<Sub | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch<Sub>('/subscriptions/current'),
      apiFetch<Tier[]>('/subscriptions/tiers'),
    ]).then(([s, t]) => {
      setSub(s);
      setTiers(Array.isArray(t) ? t : []);
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400 pt-8 text-center">Loading…</div>;
  if (error)   return <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm">{error}</div>;

  const col = TIER_COLOR[sub?.tier ?? 'free_trial'] ?? TIER_COLOR.free_trial;
  const periodLabel = sub?.limits.limit_period === 'weekly' ? 'this week' : 'today';

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Billing & Subscription</h1>
      <p className="text-gray-500 text-sm mb-8">Your current plan and usage.</p>

      {/* Current plan */}
      {sub && (
        <div className={`rounded-2xl border p-6 mb-8 ${col.bg} ${col.border}`}>
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{TIER_ICONS[sub.tier] ?? '🌱'}</span>
                <h2 className={`text-xl font-bold ${col.text} capitalize`}>
                  {sub.tier.replace('_', ' ')}
                </h2>
                {sub.is_trial && (
                  <span className="text-xs bg-white/70 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200 font-medium">
                    Trial
                  </span>
                )}
              </div>
              {sub.expires_at && (
                <p className={`text-xs ${col.text} opacity-70`}>
                  {new Date(sub.expires_at) > new Date() ? 'Expires' : 'Expired'}:{' '}
                  {new Date(sub.expires_at).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="text-right text-xs text-gray-500">
              <p>Period: <span className="font-semibold capitalize">{sub.limits.limit_period}</span></p>
              <p>Languages: <span className="font-semibold capitalize">{sub.limits.languages.join(', ')}</span></p>
              {sub.limits.max_pages_per_generation && (
                <p>Max pages/doc: <span className="font-semibold">{sub.limits.max_pages_per_generation}</span></p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Usage {periodLabel}</p>
            <UsageMeter label="AI Conversations" used={sub.conversations_today} max={sub.limits.conversation_messages_per_day} />
            <UsageMeter label="Document Uploads"  used={sub.uploads_today}        max={sub.limits.uploads_per_day} />
            <UsageMeter label="Doc Generations"   used={sub.docs_generated_today} max={sub.limits.doc_generations_per_day} />
          </div>
        </div>
      )}

      {/* Plan comparison */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">All Plans</h2>
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {tiers.map(t => {
          const isCurrent = sub?.tier === t.tier;
          return (
            <div
              key={t.tier}
              className={`rounded-2xl border p-5 bg-white transition ${
                t.highlight ? 'border-blue-400 shadow-md shadow-blue-100' : 'border-gray-100'
              } ${isCurrent ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
            >
              {isCurrent && (
                <span className="inline-block mb-2 text-xs bg-gray-900 text-white px-2 py-0.5 rounded-full font-medium">Current</span>
              )}
              {t.highlight && !isCurrent && (
                <span className="inline-block mb-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">Recommended</span>
              )}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{TIER_ICONS[t.tier] ?? '📦'}</span>
                <p className="font-bold text-gray-900">{t.display_name}</p>
              </div>
              <p className="text-xl font-bold text-gray-900 mb-3">
                {t.price_pkr_monthly
                  ? `PKR ${t.price_pkr_monthly.toLocaleString()}/mo`
                  : t.tier === 'institutional' ? 'Custom' : 'Free'}
              </p>
              <ul className="space-y-1.5 mb-5">
                {t.features.map(f => (
                  <li key={f.name} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className={f.included ? 'text-green-500' : 'text-gray-300'}>
                      {f.included ? '✓' : '✗'}
                    </span>
                    <span className={f.included ? '' : 'text-gray-400'}>{f.name}</span>
                  </li>
                ))}
              </ul>
              <button
                disabled={isCurrent || !t.is_available}
                className={`w-full py-2.5 rounded-xl text-sm font-medium transition ${
                  isCurrent
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : !t.is_available
                    ? 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200'
                    : 'bg-gray-900 text-white hover:bg-gray-700'
                }`}
              >
                {isCurrent ? 'Current plan' : !t.is_available ? 'Coming Soon' : `Upgrade to ${t.display_name}`}
              </button>
            </div>
          );
        })}
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-700">
        Payment gateway integration coming in Phase 3. To upgrade, contact{' '}
        <a href="mailto:billing@promptplatform.pk" className="underline font-medium">billing@promptplatform.pk</a>.
      </div>
    </div>
  );
}
