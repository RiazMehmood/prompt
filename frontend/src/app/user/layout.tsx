'use client';
import DashboardShell from '@/components/DashboardShell';

const nav = [
  { href: '/user',           label: 'My Dashboard', icon: 'home'      },
  { href: '/user/documents', label: 'My Documents', icon: 'documents' },
  { href: '/user/chat',      label: 'AI Assistant', icon: 'chat'      },
  { href: '/user/billing',   label: 'Billing',      icon: 'credit'    },
];

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell nav={nav} title="My Portal" requireRole={['user','domain_admin','root_admin','staff','institute_admin']}>
      {children}
    </DashboardShell>
  );
}
