'use client';
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

// ── Icons (inline SVG, 24×24 viewBox) ─────────────────────────────────────────
const Icon = ({ path, className = 'w-5 h-5' }: { path: string; className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

const ICONS: Record<string, string> = {
  overview:   'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  analytics:  'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  users:      'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  institutes: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  domains:    'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9',
  staff:      'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  tokens:     'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z',
  documents:  'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  templates:  'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
  chat:       'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  logout:     'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
  chevronL:   'M15 19l-7-7 7-7',
  chevronR:   'M9 5l7 7-7 7',
  menu:       'M4 6h16M4 12h16M4 18h16',
};

const navLinks = [
  { href: '/',                    label: 'Overview',         icon: 'overview'   },
  { href: '/admin/analytics',     label: 'Analytics',        icon: 'analytics'  },
  { href: '/admin/users',         label: 'Users',            icon: 'users'      },
  { href: '/admin/institutes',    label: 'Institutes',       icon: 'institutes' },
  { href: '/admin/domains',       label: 'Domains',          icon: 'domains'    },
  { href: '/admin/staff',         label: 'Staff',            icon: 'staff'      },
  { href: '/admin/tokens',        label: 'Promo Tokens',     icon: 'tokens'     },
  { href: '/admin/documents',             label: 'Upload Queue',      icon: 'documents'  },
  { href: '/admin/generated-documents',   label: 'Generated Docs',    icon: 'templates'  },
  { href: '/admin/templates',             label: 'Templates',         icon: 'templates'  },
  { href: '/admin/chat',                  label: 'Test AI Chat',      icon: 'chat'       },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('auth_token') ?? localStorage.getItem('admin_token');
    if (!token) router.replace('/landing');
  }, [router]);

  const handleLogout = () => {
    ['auth_token', 'auth_user', 'admin_token', 'admin_user', 'domain_name'].forEach(k => localStorage.removeItem(k));
    router.replace('/landing');
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* ── Sidebar — hover to expand ──────────────────────────────────────── */}
      <aside
        className={`flex flex-col bg-gray-950 text-white transition-all duration-200 ease-in-out shrink-0 overflow-hidden ${hovered ? 'w-60' : 'w-14'}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Header */}
        <div className={`flex items-center border-b border-gray-800 h-16 ${hovered ? 'px-5' : 'justify-center'}`}>
          {hovered
            ? <span className="text-sm font-bold text-white tracking-wide truncate">Prompt Admin</span>
            : <Icon path={ICONS.overview} className="w-5 h-5 text-gray-400" />
          }
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto">
          {navLinks.map((link) => {
            const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                title={!hovered ? link.label : undefined}
                className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                } ${!hovered ? 'justify-center' : ''}`}
              >
                <Icon path={ICONS[link.icon]} className="w-5 h-5 shrink-0" />
                {hovered && <span className="truncate">{link.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-gray-800 p-2">
          <button onClick={handleLogout} title={!hovered ? 'Sign Out' : undefined}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition ${!hovered ? 'justify-center' : ''}`}
          >
            <Icon path={ICONS.logout} className="w-5 h-5 shrink-0" />
            {hovered && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
