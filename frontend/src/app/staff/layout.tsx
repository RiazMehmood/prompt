'use client';
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getUser, getToken, logout, AuthUser, apiFetch } from '@/utils/auth';
import DashboardShell, { NavItem } from '@/components/DashboardShell';

// Map permission → nav item
const PERM_NAV: Record<string, NavItem> = {
  manage_all_users:    { href: '/staff/users',         label: 'All Users',    icon: 'users'     },
  manage_domain_users: { href: '/staff/users',         label: 'Domain Users', icon: 'users'     },
  approve_documents:   { href: '/staff/documents',     label: 'Documents',    icon: 'documents' },
  manage_payments:     { href: '/staff/payments',      label: 'Payments',     icon: 'payments'  },
  manage_institutes:   { href: '/staff/institutes',    label: 'Institutes',   icon: 'building'  },
  view_analytics:      { href: '/staff/analytics',     label: 'Analytics',    icon: 'analytics' },
  manage_subscriptions:{ href: '/staff/subscriptions', label: 'Subscriptions',icon: 'credit'    },
  manage_templates:    { href: '/staff/templates',     label: 'Templates',    icon: 'templates' },
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const [nav, setNav] = useState<NavItem[]>([{ href: '/staff', label: 'Overview', icon: 'home' }]);

  useEffect(() => {
    const u = getUser();
    if (!u) return;
    // Load this staff member's permissions and build nav
    apiFetch<any[]>(`/admin/staff/${u.id}/permissions`)
      .then(perms => {
        const seen = new Set<string>();
        const items: NavItem[] = [{ href: '/staff', label: 'Overview', icon: 'home' }];
        (perms || []).forEach(p => {
          const nav = PERM_NAV[p.permission];
          if (nav && !seen.has(nav.href)) { seen.add(nav.href); items.push(nav); }
        });
        setNav(items);
      })
      .catch(() => {}); // Fallback: just overview
  }, []);

  return (
    <DashboardShell nav={nav} title="Staff Portal" requireRole={['staff']}>
      {children}
    </DashboardShell>
  );
}
