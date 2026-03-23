'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, getToken, roleHomePath } from '@/utils/auth';

export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    const hash = window.location.hash;

    // Supabase email verification redirects to Site URL (this page) with a hash
    // containing access_token or error. Forward to /auth/callback which handles it.
    if (hash && (hash.includes('access_token=') || hash.includes('error='))) {
      // Use window.location so the hash is preserved (router.replace strips it)
      window.location.replace('/auth/callback' + hash);
      return;
    }

    const token = getToken();
    const user  = getUser();
    if (!token || !user) { router.replace('/landing'); return; }
    router.replace(roleHomePath(user.role));
  }, [router]);
  return null;
}
