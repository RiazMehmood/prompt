'use client';
import DashboardShell from '@/components/DashboardShell';

const nav = [
  { href: '/domain-admin',           label: 'Overview',    icon: 'home'      },
  { href: '/domain-admin/analytics', label: 'Analytics',   icon: 'analytics' },
  { href: '/domain-admin/users',     label: 'Users',       icon: 'users'     },
  { href: '/domain-admin/documents', label: 'Documents',   icon: 'documents' },
  { href: '/domain-admin/templates', label: 'Templates',   icon: 'templates' },
];

export default function DomainAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell nav={nav} title="Domain Admin" requireRole={['domain_admin', 'root_admin']}>
      {children}
    </DashboardShell>
  );
}
