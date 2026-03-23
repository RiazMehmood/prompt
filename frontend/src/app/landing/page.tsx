'use client';
import Link from 'next/link';

const features = [
  { icon: '⚖️', title: 'Legal AI',         desc: 'Draft legal documents, research case law, and get instant guidance on Pakistani law.' },
  { icon: '🏥', title: 'Medical AI',        desc: 'Clinical decision support, patient education materials, and medical documentation.' },
  { icon: '🎓', title: 'Education AI',      desc: 'Lesson plans, student assessments, and multilingual learning content.' },
  { icon: '🌐', title: 'Multilingual',      desc: 'Full support for English, Urdu (Nastaliq), and Sindhi with RTL rendering.' },
  { icon: '🏢', title: 'Institute Plans',   desc: 'Bulk subscriptions for schools, law firms, and hospitals with custom discounts.' },
  { icon: '🔒', title: 'Secure & Private',  desc: 'Your documents never leave your domain — isolated vector databases per institution.' },
];

const plans = [
  {
    name: 'Free Trial',
    price: 'Free — 7 days',
    desc: 'Try before you buy',
    features: ['20 conversations / week','2 doc generations / week','Max 5 pages per doc','2 uploads / week','English only'],
    cta: 'Start free trial',
    href: '/signup',
    highlight: false,
    badge: '',
  },
  {
    name: 'Basic',
    price: 'PKR 1,000/mo',
    desc: 'For everyday use',
    features: ['20 conversations/day','5 doc generations/day','2 uploads/day','English & Urdu','Standard support'],
    cta: 'Coming soon',
    href: '/signup',
    highlight: false,
    badge: '',
  },
  {
    name: 'Pro',
    price: 'PKR 1,500/mo',
    desc: 'For professionals',
    features: ['200 conversations/day','50 doc generations/day','20 uploads/day','English, Urdu & Sindhi','Priority processing'],
    cta: 'Coming soon',
    href: '/signup',
    highlight: true,
    badge: 'Most Popular',
  },
  {
    name: 'Premium',
    price: 'PKR 3,500/mo',
    desc: 'For power users',
    features: ['1,000 conversations/day','200 doc generations/day','100 uploads/day','All languages','Voice input & TTS','Custom templates'],
    cta: 'Coming soon',
    href: '/signup',
    highlight: false,
    badge: '',
  },
  {
    name: 'Institute',
    price: 'Custom',
    desc: 'For schools & firms',
    features: ['Unlimited seats','Dedicated namespace','Bulk user import','Admin portal','Custom discount','SLA support'],
    cta: 'Contact us',
    href: 'mailto:hello@promptplatform.pk',
    highlight: false,
    badge: '',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <nav className="border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📚</span>
            <span className="font-bold text-gray-900">Prompt Platform</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login"  className="text-sm text-gray-600 hover:text-gray-900 font-medium">Sign in</Link>
            <Link href="/signup" className="text-sm bg-gray-900 text-white px-4 py-2 rounded-xl font-medium hover:bg-gray-700 transition">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-white py-28 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm text-gray-300 mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Now available in English, اردو, and سنڌي
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
            AI-Powered Documents<br />
            <span className="text-indigo-400">for Pakistan</span>
          </h1>
          <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto mb-10">
            Generate legal documents, medical records, and educational content — in your language, powered by domain-specific AI trained on Pakistani law and curriculum.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="bg-white text-gray-900 px-8 py-4 rounded-2xl font-semibold hover:bg-gray-100 transition text-base">
              Start for free
            </Link>
            <Link href="#features" className="border border-white/20 text-white px-8 py-4 rounded-2xl font-semibold hover:bg-white/10 transition text-base">
              See features
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">Everything you need</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">Purpose-built for Pakistani professionals, students, and institutions.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-gray-300 hover:shadow-sm transition">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">Simple, transparent pricing</h2>
            <p className="text-gray-500 mt-3">Start free. Scale as you grow.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {plans.map(p => (
              <div key={p.name} className={`rounded-2xl p-5 border flex flex-col ${p.highlight ? 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-100' : 'border-gray-100 bg-white'}`}>
                {p.badge && (
                  <span className="inline-block self-start text-xs font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full mb-2">{p.badge}</span>
                )}
                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${p.highlight ? 'text-indigo-500' : 'text-gray-400'}`}>{p.name}</p>
                <p className="text-2xl font-bold text-gray-900">{p.price}</p>
                <p className="text-xs text-gray-500 mt-1 mb-4">{p.desc}</p>
                <ul className="space-y-1.5 mb-6 flex-1">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-gray-700">
                      <span className={`mt-0.5 ${p.highlight ? 'text-indigo-500' : 'text-gray-400'}`}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <a href={p.href} className={`block text-center py-2.5 rounded-xl font-medium text-sm transition ${
                  p.cta === 'Coming soon'
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : p.highlight
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-900 text-white hover:bg-gray-700'
                }`}>
                  {p.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-950 text-white py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-gray-400 mb-8">Start your 7-day free trial — no credit card required.</p>
          <Link href="/signup" className="inline-block bg-white text-gray-900 px-8 py-4 rounded-2xl font-semibold hover:bg-gray-100 transition text-base">
            Create free account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6 text-center text-sm text-gray-400">
        © 2025 Prompt Platform · Built for Pakistan 🇵🇰
      </footer>
    </div>
  );
}
