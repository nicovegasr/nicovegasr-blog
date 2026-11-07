export const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  );
export const cleanLabel = (value: unknown, fallback: string) =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, 64) : fallback;
