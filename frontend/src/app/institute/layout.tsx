'use client';
import DashboardShell from '@/components/DashboardShell';

const nav = [
  { href: '/institute/dashboard',  label: 'Members',          icon: 'users'     },
  { href: '/institute/templates',  label: 'Submit Template',  icon: 'templates' },
];

export default function InstituteLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell nav={nav} title="Institute Admin" requireRole={['institute_admin']}>
      {children}
    </DashboardShell>
  );
}
