import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@/app/globals.css';
import App from './App';

const ACCESS_TOKEN_KEY = 'convenehub_access_token';
const REFRESH_TOKEN_KEY = 'convenehub_refresh_token';
const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

function toUrlString(input: RequestInfo | URL) {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function resolveApiTarget(url: string) {
  const parsed = new URL(url, window.location.origin);
  const isSameOrigin = parsed.origin === window.location.origin;
  const isRelativeApiUrl = url.startsWith('/api/');
  const isApiCall = parsed.pathname.startsWith('/api/') && (isSameOrigin || isRelativeApiUrl);

  if (!isApiCall || !API_BASE_URL) {
    return { isApiCall, targetUrl: `${parsed.pathname}${parsed.search}${parsed.hash}` };
  }

  return {
    isApiCall,
    targetUrl: `${API_BASE_URL}${parsed.pathname}${parsed.search}${parsed.hash}`,
  };
}

if (typeof window !== 'undefined') {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = toUrlString(input);
    const { isApiCall, targetUrl } = resolveApiTarget(url);

    if (!isApiCall) {
      return originalFetch(input, init);
    }

    const requestInput =
      typeof input === 'string' || input instanceof URL ? targetUrl : new Request(targetUrl, input);

    const headers = new Headers(init?.headers || (typeof input === 'object' && !(input instanceof URL) ? input.headers : undefined));
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);

    if (accessToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    let response = await originalFetch(requestInput, {
      ...init,
      headers,
    });

    if (response.status === 401 && !targetUrl.includes('/auth/refresh')) {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

      if (refreshToken) {
        const refreshResponse = await originalFetch(resolveApiTarget('/api/auth/refresh').targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshResponse.ok) {
          const refreshPayload = await refreshResponse.json();
          const newAccessToken = refreshPayload?.accessToken;
          if (newAccessToken) {
            localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
            const retryHeaders = new Headers(headers);
            retryHeaders.set('Authorization', `Bearer ${newAccessToken}`);
            response = await originalFetch(requestInput, {
              ...init,
              headers: retryHeaders,
            });
          }
        }
      }
    }

    return response;
  };
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
