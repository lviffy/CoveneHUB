const API_ORIGIN = String(import.meta.env.VITE_API_BASE_URL || "").replace(
  /\/+$/,
  "",
);
const UPLOADS_PATH_PREFIX = "/api/v1/uploads/";
const UPLOADS_PREFIX = API_ORIGIN
  ? `${API_ORIGIN}${UPLOADS_PATH_PREFIX}`
  : UPLOADS_PATH_PREFIX;
function isAbsoluteUrl(value) {
  return /^https?:\/\//i.test(value);
}
export function resolveAssetUrl(value) {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    isAbsoluteUrl(trimmed)
  ) {
    return trimmed;
  }
  if (trimmed.startsWith(UPLOADS_PREFIX)) {
    return trimmed;
  }
  if (trimmed.startsWith(UPLOADS_PATH_PREFIX)) {
    return API_ORIGIN ? `${API_ORIGIN}${trimmed}` : trimmed;
  }
  if (trimmed.startsWith("/")) {
    return trimmed;
  }
  const normalizedPath = trimmed
    .replace(/^api\/v1\/uploads\//, "")
    .replace(/^uploads\//, "")
    .replace(/^\/+/, "");
  return `${UPLOADS_PREFIX}${normalizedPath}`;
}
export function extractUploadPath(value) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalize = (pathname) =>
    pathname
      .replace(/^\/+/, "")
      .replace(/^api\/v1\/uploads\//, "")
      .replace(/^uploads\//, "");
  try {
    const base =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost";
    const url = new URL(trimmed, base);
    if (url.pathname.startsWith(UPLOADS_PATH_PREFIX)) {
      return normalize(url.pathname);
    }
    if (!isAbsoluteUrl(trimmed)) {
      return normalize(trimmed);
    }
    return null;
  } catch {
    return normalize(trimmed);
  }
}
