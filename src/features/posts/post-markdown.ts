import type { Post } from '@/features/posts/post';

// The article as a standalone Markdown file for agents: front matter with what a
// citation needs, then the body. Relative images would not resolve outside the
// site, so they become their alt text.

export type PostMarkdownSource = {
  post: Post;
  body: string;
  url: string;
  author: string;
  imageLabel: string;
};

const RELATIVE_IMAGE = /!\[([^\]]*)\]\((?!https?:\/\/)[^)]*\)/g;

const isoDate = (date: Date): string => date.toISOString().slice(0, 10);

const frontMatterOf = ({ post, url, author }: PostMarkdownSource): string =>
  [
    '---',
    `title: ${JSON.stringify(post.title)}`,
    `description: ${JSON.stringify(post.summary)}`,
    `url: ${url}`,
    `author: ${JSON.stringify(author)}`,
    `language: ${post.locale}`,
    `published: ${isoDate(post.publicationDate)}`,
    ...(post.lastUpdateDate ? [`updated: ${isoDate(post.lastUpdateDate)}`] : []),
    `tags: ${JSON.stringify(post.tags)}`,
    '---',
  ].join('\n');

export const renderPostMarkdown = (source: PostMarkdownSource): string => {
  const body = source.body
    .replace(/^(?:\r?\n)+/, '')
    .replace(RELATIVE_IMAGE, (_image, alt: string) => `*(${source.imageLabel}: ${alt})*`)
    .trimEnd();

  return `${frontMatterOf(source)}\n\n# ${source.post.title}\n\n${body}\n`;
};
