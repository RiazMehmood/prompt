'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { roleHomePath } from '@/utils/auth';

/**
 * Handles the Supabase email-verification redirect.
 * Supabase sends the user here with a URL hash like:
 *   /auth/callback#access_token=...&refresh_token=...&type=signup
 *
 * We extract the tokens, store them, fetch the user profile, then:
 *   - No domain yet → /onboarding
 *   - Has domain    → role home
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Verifying your account…');

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken  = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken) {
      setStatus('Verification link is invalid or expired.');
      setTimeout(() => router.replace('/login'), 3000);
      return;
    }

    // Persist tokens (same keys used everywhere in the app)
    localStorage.setItem('auth_token',  accessToken);
    localStorage.setItem('admin_token', accessToken); // backward compat
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }

    // Fetch user profile from backend
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';
    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.json())
      .then(profile => {
        localStorage.setItem('auth_user',  JSON.stringify(profile));
        localStorage.setItem('admin_user', JSON.stringify(profile));

        if (!profile.domain_id) {
          // New user — needs to pick a domain
          router.replace('/onboarding');
        } else {
          router.replace(roleHomePath(profile.role));
        }
      })
      .catch(() => {
        // Profile fetch failed — still send to onboarding
        router.replace('/onboarding');
      });
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white text-sm">{status}</p>
      </div>
    </div>
  );
}
