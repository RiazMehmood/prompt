'use client';
import { useEffect, useState } from 'react';
import { apiFetch, getUser, AuthUser } from '@/utils/auth';

interface Stats { total_users: number; active_subs: number; docs_pending: number; docs_total: number; }

function StatCard({ label, value, sub, color = 'blue' }: { label: string; value: number | string; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    green: 'bg-green-50 border-green-100 text-green-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
    purple: 'bg-purple-50 border-purple-100 text-purple-700',
  };
  return (
    <div className={`rounded-2xl border p-5 ${colors[color]}`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  );
}

export default function DomainAdminHome() {
  const [user, setUser]     = useState<AuthUser | null>(null);
  const [stats, setStats]   = useState<Stats | null>(null);
  const [domain, setDomain] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    if (u?.domain_id) loadData(u.domain_id);
  }, []);

  async function loadData(domainId: string) {
    try {
      const [analyticsData, domainData] = await Promise.all([
        apiFetch<any>('/analytics/overview'),
        apiFetch<any>(`/domains/${domainId}`),
      ]);
      setStats(analyticsData);
      setDomain(domainData);
    } catch {}
    setLoading(false);
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {domain?.name ?? 'Domain'} Dashboard
        </h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {user?.email}</p>
      </div>

      {loading ? (
        <div className="text-gray-400">Loading…</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Users"     value={stats?.total_users ?? 0}   color="blue"   />
          <StatCard label="Active Subs"     value={stats?.active_subs ?? 0}   color="green"  />
          <StatCard label="Pending Docs"    value={stats?.docs_pending ?? 0}  color="amber"  sub="Awaiting approval" />
          <StatCard label="Total Documents" value={stats?.docs_total ?? 0}    color="purple" />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <QuickLink href="/domain-admin/users"     icon="👥" title="Manage Users"     desc="View, edit, and manage users in your domain." />
        <QuickLink href="/domain-admin/documents" icon="📄" title="Document Queue"   desc="Approve or reject pending user documents." />
        <QuickLink href="/domain-admin/templates" icon="📋" title="Templates"        desc="Manage document generation templates." />
        <QuickLink href="/domain-admin/analytics" icon="📊" title="Analytics"        desc="Detailed usage and subscription stats." />
      </div>
    </div>
  );
}

function QuickLink({ href, icon, title, desc }: { href: string; icon: string; title: string; desc: string }) {
  return (
    <a href={href} className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-300 hover:shadow-sm transition group">
      <div className="text-2xl mb-3">{icon}</div>
      <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition">{title}</p>
      <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
    </a>
  );
}
