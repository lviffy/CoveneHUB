import { useCallback, useMemo } from 'react';
import {
  useLocation,
  useNavigate,
  useSearchParams as useReactRouterSearchParams,
} from 'react-router-dom';

type NavigateOptions = {
  scroll?: boolean;
};

type ReplaceOptions = {
  scroll?: boolean;
};

function navigateWithBrowserFallback(path: string, replace = false) {
  if (typeof window === 'undefined') {
    return;
  }

  if (replace) {
    window.location.replace(path);
    return;
  }

  window.location.assign(path);
}

export function useRouter() {
  const navigate = useNavigate();

  return useMemo(
    () => ({
      push: (href: string, _options?: NavigateOptions) => navigate(href),
      replace: (href: string, _options?: ReplaceOptions) => navigate(href, { replace: true }),
      back: () => navigate(-1),
      refresh: () => {
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      },
      prefetch: async (_href: string) => {},
    }),
    [navigate]
  );
}

export function useSearchParams() {
  const [searchParams] = useReactRouterSearchParams();
  return searchParams;
}

export function usePathname() {
  const location = useLocation();
  return location.pathname;
}

export function redirect(path: string) {
  navigateWithBrowserFallback(path, true);
}

export function notFound() {
  navigateWithBrowserFallback('/404', true);
}

export function useParams<T extends Record<string, string | string[] | undefined>>() {
  throw new Error('Use react-router-dom useParams directly in the Vite app.');
}

export function useSelectedLayoutSegment() {
  return null;
}

export function useSelectedLayoutSegments() {
  return [];
}

export function useServerInsertedHTML(callback: () => void) {
  useCallback(callback, [callback]);
}
