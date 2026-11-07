import { describe, expect, it } from 'vitest';
import { renderLlmsText } from '@/shared/discovery/llms-text';

describe('renderLlmsText', () => {
  it('follows the llms.txt layout: title, summary, details and link sections', () => {
    const text = renderLlmsText({
      name: 'Site',
      summary: 'One line about the site.',
      details: 'More context.',
      sections: [{ title: 'Articles', links: [{ title: 'A post', url: 'https://example.com/a.md', note: 'Why' }] }],
    });

    expect(text).toBe(
      '# Site\n\n> One line about the site.\n\nMore context.\n\n## Articles\n\n- [A post](https://example.com/a.md): Why\n',
    );
  });

  it('leaves out sections without links', () => {
    const text = renderLlmsText({
      name: 'Site',
      summary: 'S',
      details: 'D',
      sections: [{ title: 'Empty', links: [] }],
    });

    expect(text).not.toContain('## Empty');
  });
});
