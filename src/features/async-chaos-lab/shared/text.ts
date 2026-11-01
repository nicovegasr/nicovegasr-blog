export const escapeHtml = (state: string) =>
  state.replace(
    /[&<>"']/g,
    (config) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        config
      ]!,
  );
export const cleanLabel = (value: unknown, fallback: string) =>
  typeof value === 'string' && value.trim()
    ? value.trim().slice(0, 64)
    : fallback;
