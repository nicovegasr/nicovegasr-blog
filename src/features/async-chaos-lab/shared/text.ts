export const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
export const cleanLabel = (value: unknown, fallback: string) =>
  typeof value === 'string' && value.trim()
    ? value.trim().slice(0, 64)
    : fallback;
