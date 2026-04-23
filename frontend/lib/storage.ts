const UPLOADS_PREFIX = '/api/v1/uploads/';

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

export function resolveAssetUrl(value?: string | null) {
  if (!value) return '';

  const trimmed = value.trim();
  if (!trimmed) return '';

  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    isAbsoluteUrl(trimmed)
  ) {
    return trimmed;
  }

  if (trimmed.startsWith(UPLOADS_PREFIX)) {
    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  const normalizedPath = trimmed
    .replace(/^api\/v1\/uploads\//, '')
    .replace(/^uploads\//, '')
    .replace(/^\/+/, '');

  return `${UPLOADS_PREFIX}${normalizedPath}`;
}

export function extractUploadPath(value?: string | null) {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalize = (pathname: string) =>
    pathname
      .replace(/^\/+/, '')
      .replace(/^api\/v1\/uploads\//, '')
      .replace(/^uploads\//, '');

  try {
    const base =
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const url = new URL(trimmed, base);

    if (url.pathname.startsWith(UPLOADS_PREFIX)) {
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
