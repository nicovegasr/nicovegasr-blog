// Renders /llms.txt (llmstxt.org): a Markdown index that tells agents what the
// site holds and where to read each piece without the page chrome.

export type LlmsLink = { title: string; url: string; note?: string };
export type LlmsSection = { title: string; links: readonly LlmsLink[] };
export type LlmsIndex = { name: string; summary: string; details: string; sections: readonly LlmsSection[] };

const renderLink = ({ title, url, note }: LlmsLink): string => `- [${title}](${url})${note ? `: ${note}` : ''}`;

const renderSection = ({ title, links }: LlmsSection): string =>
  [`## ${title}`, '', ...links.map(renderLink)].join('\n');

export const renderLlmsText = (index: LlmsIndex): string =>
  [
    `# ${index.name}`,
    `> ${index.summary}`,
    index.details,
    ...index.sections.filter((section) => section.links.length > 0).map(renderSection),
  ].join('\n\n') + '\n';
