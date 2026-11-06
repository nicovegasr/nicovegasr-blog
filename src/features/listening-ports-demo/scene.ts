const escapeXml = (text: string): string => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/** Keep the drawing shared; translate only explicitly marked text nodes. */
export const localiseSvg = (source: string, labels: Record<string, string>): string => source.replace(
  /(<(?:text|title|desc)\b[^>]*data-label="([^"]+)"[^>]*>)(.*?)(<\/(?:text|title|desc)>)/gs,
  (match: string, open: string, key: string, _text: string, close: string) =>
    labels[key] === undefined ? match : `${open}${escapeXml(labels[key])}${close}`,
);

export const scopeSvg = (source: string, identifier: string): string => source.replaceAll('lp-', `${identifier}-`);
