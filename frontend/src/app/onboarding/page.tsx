'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getToken, getUser, roleHomePath } from '@/utils/auth';

interface Domain {
  id: string;
  name: string;
  description: string;
}

const DOMAIN_META: Record<string, { icon: string; color: string; border: string; examples: string[]; profLabel: string }> = {
  Legal: {
    icon: '⚖️',
    color: 'bg-blue-50 hover:bg-blue-100',
    border: 'border-blue-200 hover:border-blue-400',
    examples: ['Bail applications', 'Contract drafting', 'Pakistani law research'],
    profLabel: 'Legal Professional',
  },
  Education: {
    icon: '🎓',
    color: 'bg-green-50 hover:bg-green-100',
    border: 'border-green-200 hover:border-green-400',
    examples: ['Lesson plans', 'Student assessments', 'Multilingual content'],
    profLabel: 'Educator',
  },
  Medical: {
    icon: '🩺',
    color: 'bg-red-50 hover:bg-red-100',
    border: 'border-red-200 hover:border-red-400',
    examples: ['FCPS MCQ practice', 'AI tutor explanations', 'Weak topic analysis'],
    profLabel: 'Medical Postgraduate',
  },
};

// Domain-specific professional detail fields
const PROF_FIELDS: Record<string, { key: string; label: string; placeholder: string; required: boolean }[]> = {
  Legal: [
    { key: 'full_name',   label: 'Full Name',            placeholder: 'Advocate Muhammad Raza',        required: true  },
    { key: 'court_name',  label: 'Primary Court',        placeholder: 'Lahore High Court',             required: true  },
    { key: 'bar_number',  label: 'Bar Registration No.', placeholder: 'e.g. LHC/2020/12345',          required: false },
    { key: 'bar_council', label: 'Bar Council / Association', placeholder: 'e.g. Sindh Bar Council',  required: false },
    { key: 'city',        label: 'City',                 placeholder: 'Karachi',                       required: false },
  ],
  Education: [
    { key: 'full_name',    label: 'Full Name',         placeholder: 'Prof. Amina Khan',                 required: true  },
    { key: 'organization', label: 'Institution',       placeholder: 'Government College University',    required: true  },
    { key: 'designation',  label: 'Designation',       placeholder: 'Senior Lecturer',                  required: false },
    { key: 'city',         label: 'City',              placeholder: 'Karachi',                          required: false },
  ],
  Medical: [
    { key: 'full_name',    label: 'Full Name',         placeholder: 'Dr. Zainab Hassan',                required: true  },
    { key: 'organization', label: 'Medical College / Institution', placeholder: 'Dow University of Health Sciences', required: false },
    { key: 'designation',  label: 'Current Stage',     placeholder: 'e.g. FCPS Part 1 Candidate, PGR Year 2', required: false },
    { key: 'city',         label: 'City',              placeholder: 'Karachi',                          required: false },
  ],
};

const DEFAULT_FIELDS = [
  { key: 'full_name',    label: 'Full Name',     placeholder: 'Your full name', required: true  },
  { key: 'organization', label: 'Organization',  placeholder: 'Your organization', required: false },
  { key: 'city',         label: 'City',          placeholder: 'Your city', required: false },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [domains, setDomains]   = useState<Domain[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [step, setStep]         = useState<1 | 2>(1);
  const [profDetails, setProfDetails] = useState<Record<string, string>>({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    const user = getUser();
    if (user?.domain_id) { router.replace(roleHomePath(user.role)); return; }
    if (!getToken()) { router.replace('/login'); return; }
    apiFetch<Domain[]>('/domains')
      .then(d => setDomains(Array.isArray(d) ? d : []))
      .catch(() => setError('Failed to load domains'))
      .finally(() => setLoading(false));
  }, [router]);

  const selectedDomain = domains.find(d => d.id === selected);
  const profFields = selectedDomain
    ? (PROF_FIELDS[selectedDomain.name] ?? DEFAULT_FIELDS)
    : DEFAULT_FIELDS;

  const handleNext = () => {
    if (!selected) return;
    setStep(2);
  };

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      // Step 1: assign domain
      await apiFetch('/domains/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain_id: selected }),
      });

      // Step 2: save professional details (non-empty values only)
      const details = Object.fromEntries(
        Object.entries(profDetails).filter(([, v]) => v.trim() !== '')
      );
      if (Object.keys(details).length > 0) {
        await apiFetch('/auth/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(details),
        });
      }

      // Refresh stored profile
      const profile = await apiFetch<any>('/auth/me');
      localStorage.setItem('auth_user',  JSON.stringify(profile));
      localStorage.setItem('admin_user', JSON.stringify(profile));
      router.replace(roleHomePath(profile.role));
    } catch (err: any) {
      setError(err.message ?? 'Setup failed');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2].map(n => (
            <div key={n} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${
                step >= n ? 'bg-white text-gray-900' : 'bg-white/10 text-gray-400'
              }`}>{n}</div>
              <span className={`text-sm ${step >= n ? 'text-white' : 'text-gray-500'}`}>
                {n === 1 ? 'Choose Domain' : 'Your Details'}
              </span>
              {n < 2 && <div className="w-8 h-px bg-white/20 mx-1" />}
            </div>
          ))}
        </div>

        {/* ── Step 1: Domain selection ── */}
        {step === 1 && (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-4">
                <span className="text-3xl">📚</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Welcome to Prompt Platform</h1>
              <p className="text-gray-400">
                Choose your domain to get AI tools tailored to your profession.
                <br />
                <span className="text-amber-400 text-sm">This cannot be changed later.</span>
              </p>
            </div>

            {loading ? (
              <div className="text-center text-gray-400">Loading domains…</div>
            ) : (
              <div className="grid gap-4 mb-6">
                {domains.map(d => {
                  const meta = DOMAIN_META[d.name] ?? { icon: '🌐', color: 'bg-gray-50 hover:bg-gray-100', border: 'border-gray-200 hover:border-gray-400', examples: [], profLabel: 'Professional' };
                  const isSelected = selected === d.id;
                  return (
                    <button key={d.id} onClick={() => setSelected(d.id)}
                      className={`w-full text-left rounded-2xl border-2 p-5 transition-all ${meta.color} ${meta.border} ${isSelected ? 'ring-4 ring-white/30 scale-[1.01]' : ''}`}
                    >
                      <div className="flex items-start gap-4">
                        <span className="text-4xl">{meta.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-gray-900 text-lg">{d.name}</h3>
                            {isSelected && <span className="bg-gray-900 text-white text-xs px-2 py-0.5 rounded-full font-medium">Selected</span>}
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{d.description}</p>
                          <div className="flex flex-wrap gap-2">
                            {meta.examples.map(ex => (
                              <span key={ex} className="text-xs bg-white/70 text-gray-600 px-2 py-1 rounded-lg border border-gray-200">{ex}</span>
                            ))}
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition ${isSelected ? 'bg-gray-900 border-gray-900' : 'border-gray-400'}`}>
                          {isSelected && <span className="text-white text-xs">✓</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {error && <div className="bg-red-900/30 border border-red-500/40 text-red-300 rounded-xl p-3 text-sm mb-4">{error}</div>}

            <button onClick={handleNext} disabled={!selected}
              className="w-full bg-white text-gray-900 py-4 rounded-2xl font-semibold text-base hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition">
              Next: Your Details →
            </button>
          </>
        )}

        {/* ── Step 2: Professional details ── */}
        {step === 2 && selectedDomain && (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-4">
                <span className="text-3xl">{DOMAIN_META[selectedDomain.name]?.icon ?? '👤'}</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Your Professional Details</h1>
              <p className="text-gray-400 text-sm">
                These details will be auto-filled in every document you generate —
                <br />no need to type your name or court every time.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 mb-6">
              {profFields.map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    {f.label}
                    {f.required && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  <input
                    type="text"
                    value={profDetails[f.key] ?? ''}
                    onChange={e => setProfDetails(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-white/40 transition"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3 mb-3">
              <button onClick={() => setStep(1)}
                className="flex-1 py-4 rounded-2xl border border-white/20 text-gray-300 font-medium hover:bg-white/5 transition">
                ← Back
              </button>
              <button onClick={handleConfirm} disabled={saving || profFields.filter(f => f.required).some(f => !profDetails[f.key]?.trim())}
                className="flex-2 flex-1 bg-white text-gray-900 py-4 rounded-2xl font-semibold hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition">
                {saving ? 'Setting up…' : 'Go to Dashboard →'}
              </button>
            </div>

            {error && <div className="bg-red-900/30 border border-red-500/40 text-red-300 rounded-xl p-3 text-sm">{error}</div>}

            <p className="text-center text-gray-500 text-xs mt-3">
              You can update these details later from your profile settings.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
