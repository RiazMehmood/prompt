'use client';
import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const navLinks = [
  { href: '/', label: 'Overview', group: null },
  { href: '/admin/analytics', label: 'Analytics', group: null },
  // Users & Orgs
  { href: '/admin/users', label: 'Users', group: 'Users & Orgs' },
  { href: '/admin/institutes', label: 'Institutes', group: 'Users & Orgs' },
  { href: '/admin/domains', label: 'Domains', group: 'Users & Orgs' },
  // Staff
  { href: '/admin/staff', label: 'Staff & Permissions', group: 'Admin' },
  { href: '/admin/tokens', label: 'Promo Tokens', group: 'Admin' },
  // Content
  { href: '/admin/documents', label: 'Document Queue', group: 'Content' },
  { href: '/admin/templates', label: 'Templates', group: 'Content' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) router.replace('/login');
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    router.replace('/login');
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-xl font-bold">Prompt Admin</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {(() => {
            const rendered: React.ReactNode[] = [];
            let lastGroup: string | null = undefined as any;
            navLinks.forEach((link) => {
              if (link.group !== lastGroup) {
                if (link.group) {
                  rendered.push(
                    <p key={`g-${link.group}`} className="text-xs text-gray-500 uppercase tracking-wider px-4 pt-3 pb-1 font-semibold">
                      {link.group}
                    </p>
                  );
                }
                lastGroup = link.group;
              }
              rendered.push(
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block px-4 py-2 rounded-lg text-sm transition ${
                    pathname === link.href
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {link.label}
                </Link>
              );
            });
            return rendered;
          })()}
        </nav>
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full text-sm text-gray-400 hover:text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition text-left"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
