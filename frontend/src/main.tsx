import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@/app/globals.css';
import App from './App';

const ACCESS_TOKEN_KEY = 'convenehub_access_token';
const REFRESH_TOKEN_KEY = 'convenehub_refresh_token';

if (typeof window !== 'undefined') {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const isApiCall = url.startsWith('/api/');

    if (!isApiCall) {
      return originalFetch(input, init);
    }

    const headers = new Headers(init?.headers || (typeof input === 'object' && !(input instanceof URL) ? input.headers : undefined));
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);

    if (accessToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    let response = await originalFetch(input, {
      ...init,
      headers,
    });

    if (response.status === 401 && !url.includes('/auth/refresh')) {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

      if (refreshToken) {
        const refreshResponse = await originalFetch('/api/auth/refresh', {
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
            response = await originalFetch(input, {
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
