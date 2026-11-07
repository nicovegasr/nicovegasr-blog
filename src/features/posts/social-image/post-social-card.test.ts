import { describe, expect, it } from 'vitest';
import {
  buildSocialCard,
  titleFontSizeFor,
  type SocialCardElement,
} from '@/features/posts/social-image/post-social-card';

const content = {
  title: 'A short title',
  tags: ['security', 'networking', 'node', 'extra'],
  readingTime: '6 min read',
  authorName: 'Author',
  siteHost: 'example.com',
  portraitDataUrl: 'data:image/png;base64,AA==',
};

const childrenOf = (node: SocialCardElement): SocialCardElement[] => node.props.children as SocialCardElement[];

describe('buildSocialCard', () => {
  it('shows at most three tags and highlights the first one', () => {
    const [tagRow] = childrenOf(buildSocialCard(content));
    const tags = childrenOf(tagRow!);

    expect(tags.map((tag) => tag.props.children)).toEqual(['security', 'networking', 'node']);
    expect(tags[0]?.props.style?.background).toBe('#d8ff3e');
    expect(tags[1]?.props.style?.background).toBe('#ffffff');
  });

  it('places the title between the tags and the author', () => {
    const [, title] = childrenOf(buildSocialCard(content));

    expect(title?.props.children).toBe('A short title');
  });
});

describe('titleFontSizeFor', () => {
  it('shrinks the title as it grows longer', () => {
    expect(titleFontSizeFor('x'.repeat(60))).toBe(62);
    expect(titleFontSizeFor('x'.repeat(90))).toBe(54);
    expect(titleFontSizeFor('x'.repeat(110))).toBe(48);
  });
});
