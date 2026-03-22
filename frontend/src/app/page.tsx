'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    router.replace(token ? '/admin/analytics' : '/login');
  }, [router]);
  return null;
}
