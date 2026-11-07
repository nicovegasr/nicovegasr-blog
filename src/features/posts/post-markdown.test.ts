import { describe, expect, it } from 'vitest';
import type { Post } from '@/features/posts/post';
import { renderPostMarkdown } from '@/features/posts/post-markdown';

const post: Post = {
  slug: 'a-post',
  locale: 'en',
  title: 'A "quoted" post',
  summary: 'A summary long enough to be valid',
  publicationDate: new Date('2026-01-02'),
  lastUpdateDate: undefined,
  tags: ['docker'],
  readingTimeInMinutes: 1,
  translationSlug: undefined,
  external: undefined,
};

const render = (overrides: { post?: Post; body?: string } = {}) =>
  renderPostMarkdown({
    post: overrides.post ?? post,
    body: overrides.body ?? '\nSome text.\n',
    url: 'https://example.com/en/blog/a-post/',
    author: 'Author',
    imageLabel: 'Image',
  });

describe('renderPostMarkdown', () => {
  it('opens with front matter and the title before the body', () => {
    expect(render()).toBe(
      [
        '---',
        'title: "A \\"quoted\\" post"',
        'description: "A summary long enough to be valid"',
        'url: https://example.com/en/blog/a-post/',
        'author: "Author"',
        'language: en',
        'published: 2026-01-02',
        'tags: ["docker"]',
        '---',
        '',
        '# A "quoted" post',
        '',
        'Some text.',
        '',
      ].join('\n'),
    );
  });

  it('includes the update date only when the post was updated', () => {
    expect(render({ post: { ...post, lastUpdateDate: new Date('2026-03-04') } })).toContain('updated: 2026-03-04');
  });

  it('replaces relative images with their alt text and keeps absolute ones', () => {
    const body = '![Schema](../images/a/schema.png)\n![Logo](https://example.com/logo.png)';

    expect(render({ body })).toContain('*(Image: Schema)*\n![Logo](https://example.com/logo.png)');
  });
});
