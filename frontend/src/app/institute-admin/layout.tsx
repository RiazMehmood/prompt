'use client';
import DashboardShell from '@/components/DashboardShell';

const nav = [
  { href: '/institute-admin',        label: 'Overview',     icon: 'home'     },
  { href: '/institute-admin/users',  label: 'Members',      icon: 'users'    },
  { href: '/institute-admin/import', label: 'Bulk Import',  icon: 'upload'   },
];

export default function InstituteAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell nav={nav} title="Institute Admin" requireRole={['institute_admin', 'root_admin']}>
      {children}
    </DashboardShell>
  );
}
