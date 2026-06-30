// Only http(s) URLs are safe to put in <a href>, <iframe src>, or window.open.
// Blocks javascript:/data: and other script-bearing schemes (app fields are
// admin-editable, so treat them as untrusted at the render sinks).
export function safeHttpUrl(raw?: string | null): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw, window.location.origin);
    return u.protocol === 'http:' || u.protocol === 'https:' ? raw : null;
  } catch {
    return null;
  }
}

export function openExternal(raw?: string | null) {
  const safe = safeHttpUrl(raw);
  if (safe) window.open(safe, '_blank', 'noopener,noreferrer');
}
