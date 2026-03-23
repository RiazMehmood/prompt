'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/utils/auth';

interface Sub {
  tier: string;
  limits: Record<string, number>;
  started_at?: string;
  expiry_date?: string;
  docs_generated_today: number;
  uploads_today: number;
  conversations_today: number;
  docs_remaining: number;
  uploads_remaining: number;
  conversations_remaining: number;
}

interface Tier {
  name: string;
  price: string;
  description?: string;
  features: string[];
}

const TIER_COLORS: Record<string, string> = {
  basic:    'bg-gray-100 text-gray-700 border-gray-200',
  standard: 'bg-blue-50 text-blue-700 border-blue-200',
  premium:  'bg-purple-50 text-purple-700 border-purple-200',
};

const HIGHLIGHT: Record<string, string> = {
  basic:    'border-gray-200',
  standard: 'border-blue-400 shadow-md shadow-blue-100',
  premium:  'border-purple-400 shadow-md shadow-purple-100',
};

export default function UserBillingPage() {
  const [sub, setSub]     = useState<Sub | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<Sub>('/subscriptions/current'),
      apiFetch<Tier[]>('/subscriptions/tiers'),
    ]).then(([s, t]) => {
      setSub(s);
      setTiers(Array.isArray(t) ? t : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400 pt-8">Loading…</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Billing & Subscription</h1>
      <p className="text-gray-500 text-sm mb-8">Manage your plan and view your current usage.</p>

      {/* Current plan card */}
      {sub && (
        <div className={`rounded-2xl border p-6 mb-8 ${TIER_COLORS[sub.tier] ?? 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-60">Current Plan</p>
              <p className="text-2xl font-bold capitalize mt-0.5">{sub.tier}</p>
            </div>
            <span className="text-4xl">
              {sub.tier === 'premium' ? '⭐' : sub.tier === 'standard' ? '🚀' : '🌱'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="opacity-60 text-xs mb-1">Conversations today</p>
              <p className="font-semibold">{sub.conversations_today} / {sub.limits?.conversation_messages_per_day ?? '—'}</p>
            </div>
            <div>
              <p className="opacity-60 text-xs mb-1">Uploads today</p>
              <p className="font-semibold">{sub.uploads_today} / {sub.limits?.uploads_per_day ?? '—'}</p>
            </div>
            <div>
              <p className="opacity-60 text-xs mb-1">Doc generations today</p>
              <p className="font-semibold">{sub.docs_generated_today} / {sub.limits?.doc_generations_per_day ?? '—'}</p>
            </div>
          </div>
          {sub.expiry_date && (
            <p className="text-xs opacity-60 mt-4">
              Renews / expires: {new Date(sub.expiry_date).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Upgrade plans */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Plans</h2>
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {tiers.length === 0 ? (
          // Fallback static tiers if API returns nothing
          [
            { name: 'Basic', price: 'Free', features: ['20 conversations/day', '2 uploads/day', '5 doc generations/day', 'English & Urdu'] },
            { name: 'Standard', price: 'PKR 999/mo', features: ['100 conversations/day', '10 uploads/day', '20 doc generations/day', 'All languages', 'Priority support'] },
            { name: 'Premium', price: 'PKR 2,499/mo', features: ['Unlimited conversations', '50 uploads/day', '100 doc generations/day', 'All languages', 'Dedicated support', 'Custom templates'] },
          ].map(t => (
            <TierCard key={t.name} name={t.name} price={t.price} features={t.features} current={sub?.tier?.toLowerCase() === t.name.toLowerCase()} />
          ))
        ) : (
          tiers.map(t => (
            <TierCard key={t.name} name={t.name} price={t.price} features={t.features} current={sub?.tier?.toLowerCase() === t.name.toLowerCase()} />
          ))
        )}
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-700">
        Payment gateway integration is coming in Phase 3. To upgrade your plan, please contact{' '}
        <a href="mailto:billing@promptplatform.pk" className="underline">billing@promptplatform.pk</a>.
      </div>
    </div>
  );
}

function TierCard({ name, price, features, current }: { name: string; price: string; features: string[]; current: boolean }) {
  const lower = name.toLowerCase();
  return (
    <div className={`rounded-2xl border p-5 bg-white transition ${HIGHLIGHT[lower] ?? 'border-gray-100'} ${current ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}>
      {current && (
        <span className="inline-block mb-2 text-xs bg-gray-900 text-white px-2 py-0.5 rounded-full font-medium">Current</span>
      )}
      <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">{name}</p>
      <p className="text-2xl font-bold text-gray-900 mb-3">{price}</p>
      <ul className="space-y-1.5 mb-5">
        {features.map(f => (
          <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
            <span className="text-green-500 mt-0.5">✓</span>{f}
          </li>
        ))}
      </ul>
      <button
        disabled={current}
        className={`w-full py-2.5 rounded-xl text-sm font-medium transition ${
          current
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-gray-900 text-white hover:bg-gray-700'
        }`}
      >
        {current ? 'Current plan' : `Upgrade to ${name}`}
      </button>
    </div>
  );
}
