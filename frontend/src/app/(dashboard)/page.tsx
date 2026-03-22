'use client';
import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

function StatCard({ title, value, note }: { title: string; value: string | number; note?: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {note && <p className="text-xs text-gray-400 mt-1">{note}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [health, setHealth] = useState<{ status: string; version: string } | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
      <p className="text-gray-500 mb-8">Prompt Platform Administration Overview</p>

      {health && (
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6 ${
          health.status === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          <span className={`w-2 h-2 rounded-full ${health.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`} />
          API {health.status === 'ok' ? 'Online' : 'Offline'} · v{health.version}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Pending Documents" value="—" note="Awaiting review" />
        <StatCard title="Active Domains" value="3" note="Legal, Education, Medical" />
        <StatCard title="Total Users" value="—" note="Across all domains" />
        <StatCard title="Documents Generated" value="—" note="All time" />
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'Review Document Queue', href: '/admin/documents' },
            { label: 'Manage Templates', href: '/admin/templates' },
            { label: 'Manage Domains', href: '/admin/domains' },
          ].map((action) => (
            <a
              key={action.href}
              href={action.href}
              className="block p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-medium text-gray-700 transition"
            >
              {action.label} →
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
