import { useCallback, useMemo } from "react";
import {
  useLocation,
  useNavigate,
  useSearchParams as useReactRouterSearchParams,
} from "react-router-dom";
function navigateWithBrowserFallback(path, replace = false) {
  if (typeof window === "undefined") {
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
      push: (href, _options) => navigate(href),
      replace: (href, _options) =>
        navigate(href, {
          replace: true,
        }),
      back: () => navigate(-1),
      refresh: () => {
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      },
      prefetch: async (_href) => {},
    }),
    [navigate],
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
export function redirect(path) {
  navigateWithBrowserFallback(path, true);
}
export function notFound() {
  navigateWithBrowserFallback("/404", true);
}
export function useParams() {
  throw new Error("Use react-router-dom useParams directly in the Vite app.");
}
export function useSelectedLayoutSegment() {
  return null;
}
export function useSelectedLayoutSegments() {
  return [];
}
export function useServerInsertedHTML(callback) {
  useCallback(callback, [callback]);
}
