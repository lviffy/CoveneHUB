'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { normalizeAuthUser } from '@/lib/convene/client';

const ACCESS_TOKEN_KEY = 'convenehub_access_token';
const REFRESH_TOKEN_KEY = 'convenehub_refresh_token';
const USER_KEY = 'convenehub_user';
const AUTH_EVENT = 'convenehub_auth_state_change';

function clearLegacyOAuthCookies() {
  if (typeof document === 'undefined') return;
  document.cookie = 'pending_google_signup=; Max-Age=0; Path=/; SameSite=Lax';
  document.cookie = 'movie_team_login=; Max-Age=0; Path=/; SameSite=Lax';
}

function getRedirectForRole(role?: string) {
  if (role === 'admin_team' || role === 'admin') return '/admin';
  if (role === 'organizer' || role === 'movie_team') return '/organizer';
  return '/events';
}

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);

    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const userJson = params.get('user');

    if (!accessToken || !userJson) {
      router.replace('/auth/error?error=invalid_callback&details=Missing OAuth callback payload');
      return;
    }

    try {
      const user = normalizeAuthUser(JSON.parse(userJson));

      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
      localStorage.setItem(USER_KEY, JSON.stringify(user));

      window.dispatchEvent(
        new CustomEvent(AUTH_EVENT, {
          detail: {
            event: 'SIGNED_IN',
            session: {
              access_token: accessToken,
              refresh_token: refreshToken,
              user,
            },
          },
        })
      );

      clearLegacyOAuthCookies();

      const role = params.get('role') || user.role;
      router.replace(getRedirectForRole(role || undefined));
    } catch {
      router.replace('/auth/error?error=auth_failed&details=Invalid OAuth callback payload');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-3" />
        <p className="text-slate-600">Finishing sign in...</p>
      </div>
    </div>
  );
}
