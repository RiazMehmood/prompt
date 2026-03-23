'use client';
import { useEffect, useState } from 'react';
import { apiFetch, getUser, AuthUser } from '@/utils/auth';

const PERM_LABELS: Record<string, { icon: string; label: string; href: string; desc: string }> = {
  manage_all_users:    { icon: '👥', label: 'Manage All Users',    href: '/staff/users',         desc: 'View and edit any user account' },
  manage_domain_users: { icon: '🌐', label: 'Manage Domain Users', href: '/staff/users',         desc: 'Users scoped to your domain' },
  approve_documents:   { icon: '📄', label: 'Approve Documents',   href: '/staff/documents',     desc: 'Review and approve user submissions' },
  manage_payments:     { icon: '💳', label: 'Payments',            href: '/staff/payments',      desc: 'View payment queries and issues' },
  manage_institutes:   { icon: '🏢', label: 'Institutes',          href: '/staff/institutes',    desc: 'Manage institute accounts' },
  view_analytics:      { icon: '📊', label: 'Analytics',           href: '/staff/analytics',     desc: 'Platform usage statistics' },
  manage_subscriptions:{ icon: '🔑', label: 'Subscriptions',       href: '/staff/subscriptions', desc: 'Change user subscription tiers' },
  manage_templates:    { icon: '📋', label: 'Templates',           href: '/staff/templates',     desc: 'Edit document templates' },
};

export default function StaffHome() {
  const [user, setUser]         = useState<AuthUser | null>(null);
  const [perms, setPerms]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    if (!u) return;
    apiFetch<any[]>(`/admin/staff/${u.id}/permissions`)
      .then(setPerms)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Staff Portal</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome, {user?.email} — your assigned tasks below</p>
      </div>

      {loading ? (
        <div className="text-gray-400">Loading permissions…</div>
      ) : perms.length === 0 ? (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 text-center">
          <p className="text-amber-700 font-medium">No permissions assigned yet</p>
          <p className="text-amber-600 text-sm mt-1">Contact your root administrator to assign task permissions.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {perms.map((p, i) => {
            const meta = PERM_LABELS[p.permission];
            if (!meta) return null;
            return (
              <a key={i} href={meta.href} className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-gray-300 hover:shadow-sm transition group">
                <div className="text-2xl mb-3">{meta.icon}</div>
                <p className="font-semibold text-gray-900 group-hover:text-indigo-700 transition">{meta.label}</p>
                <p className="text-sm text-gray-500 mt-0.5">{meta.desc}</p>
                {p.domain_name && <span className="mt-2 inline-block text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">Scoped to: {p.domain_name}</span>}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
