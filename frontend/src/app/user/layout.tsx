'use client';
import { useEffect, useState } from 'react';
import DashboardShell from '@/components/DashboardShell';
import { getUser, AuthUser } from '@/utils/auth';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const [nav, setNav] = useState([
    { href: '/user',           label: 'My Dashboard', icon: 'home'    },
    { href: '/user/chat',      label: 'AI Assistant', icon: 'chat'    },
    { href: '/user/documents', label: 'My Documents', icon: 'folder'  },
    { href: '/user/billing',   label: 'Billing',      icon: 'credit'  },
  ]);

  useEffect(() => {
    const user: AuthUser | null = getUser();
    // Institute members cannot manage their own billing — institute controls it
    if (user?.institute_id) {
      setNav([
        { href: '/user',           label: 'My Dashboard', icon: 'home'   },
        { href: '/user/chat',      label: 'AI Assistant', icon: 'chat'   },
        { href: '/user/documents', label: 'My Documents', icon: 'folder' },
      ]);
    }
  }, []);

  return (
    <DashboardShell nav={nav} title="My Portal" requireRole={['user','domain_admin','root_admin','staff','institute_admin']}>
      {children}
    </DashboardShell>
  );
}
