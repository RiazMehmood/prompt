'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, getToken, roleHomePath } from '@/utils/auth';

export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    const token = getToken();
    const user  = getUser();
    if (!token || !user) { router.replace('/landing'); return; }
    router.replace(roleHomePath(user.role));
  }, [router]);
  return null;
}
