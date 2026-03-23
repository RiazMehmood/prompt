'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getToken, getUser, roleHomePath } from '@/utils/auth';

interface Domain {
  id: string;
  name: string;
  description: string;
}

const DOMAIN_META: Record<string, { icon: string; color: string; border: string; examples: string[] }> = {
  Legal: {
    icon: '⚖️',
    color: 'bg-blue-50 hover:bg-blue-100',
    border: 'border-blue-200 hover:border-blue-400',
    examples: ['Bail applications', 'Contract drafting', 'Pakistani law research'],
  },
  Education: {
    icon: '🎓',
    color: 'bg-green-50 hover:bg-green-100',
    border: 'border-green-200 hover:border-green-400',
    examples: ['Lesson plans', 'Student assessments', 'Multilingual content'],
  },
  Medical: {
    icon: '🏥',
    color: 'bg-red-50 hover:bg-red-100',
    border: 'border-red-200 hover:border-red-400',
    examples: ['Clinical notes', 'Patient education', 'Medical documentation'],
  },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [domains, setDomains]     = useState<Domain[]>([]);
  const [selected, setSelected]   = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    // Guard: if user already has a domain, skip onboarding
    const user = getUser();
    if (user?.domain_id) { router.replace(roleHomePath(user.role)); return; }
    if (!getToken()) { router.replace('/login'); return; }

    apiFetch<Domain[]>('/domains')
      .then(d => setDomains(Array.isArray(d) ? d : []))
      .catch(() => setError('Failed to load domains'))
      .finally(() => setLoading(false));
  }, [router]);

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      await apiFetch('/domains/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain_id: selected }),
      });

      // Refresh the stored user profile with the new domain_id
      const profile = await apiFetch<any>('/auth/me');
      localStorage.setItem('auth_user',  JSON.stringify(profile));
      localStorage.setItem('admin_user', JSON.stringify(profile));

      router.replace(roleHomePath(profile.role));
    } catch (err: any) {
      setError(err.message ?? 'Failed to assign domain');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-5">
            <span className="text-3xl">📚</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to Prompt Platform</h1>
          <p className="text-gray-400 text-base">
            Choose your domain to get AI tools tailored to your profession.
            <br />
            <span className="text-amber-400 text-sm">This cannot be changed later.</span>
          </p>
        </div>

        {/* Domain cards */}
        {loading ? (
          <div className="text-center text-gray-400">Loading domains…</div>
        ) : (
          <div className="grid gap-4 mb-6">
            {domains.map(d => {
              const meta = DOMAIN_META[d.name] ?? { icon: '🌐', color: 'bg-gray-50 hover:bg-gray-100', border: 'border-gray-200 hover:border-gray-400', examples: [] };
              const isSelected = selected === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelected(d.id)}
                  className={`w-full text-left rounded-2xl border-2 p-5 transition-all ${meta.color} ${meta.border} ${
                    isSelected ? 'ring-4 ring-white/30 scale-[1.01]' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-4xl">{meta.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 text-lg">{d.name}</h3>
                        {isSelected && (
                          <span className="bg-gray-900 text-white text-xs px-2 py-0.5 rounded-full font-medium">Selected</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{d.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {meta.examples.map(ex => (
                          <span key={ex} className="text-xs bg-white/70 text-gray-600 px-2 py-1 rounded-lg border border-gray-200">
                            {ex}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition ${
                      isSelected ? 'bg-gray-900 border-gray-900' : 'border-gray-400'
                    }`}>
                      {isSelected && <span className="text-white text-xs">✓</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-500/40 text-red-300 rounded-xl p-3 text-sm mb-4">{error}</div>
        )}

        <button
          onClick={handleConfirm}
          disabled={!selected || saving}
          className="w-full bg-white text-gray-900 py-4 rounded-2xl font-semibold text-base hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {saving ? 'Setting up your account…' : 'Continue to Dashboard →'}
        </button>

        <p className="text-center text-gray-500 text-xs mt-4">
          You can use the AI assistant and upload documents once your domain is set.
        </p>
      </div>
    </div>
  );
}
