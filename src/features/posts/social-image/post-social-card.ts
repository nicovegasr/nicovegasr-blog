// The share card's layout (option C in the design study): tags, title, then the
// author and reading time. Satori reads this element tree like React elements.

export type SocialCardElement = {
  type: string;
  props: { style?: Record<string, string | number>; src?: string; children?: SocialCardNode | SocialCardNode[] };
};
type SocialCardNode = SocialCardElement | string;

export type SocialCardContent = {
  title: string;
  tags: readonly string[];
  readingTime: string;
  authorName: string;
  siteHost: string;
  portraitDataUrl: string;
};

export const SOCIAL_CARD_WIDTH = 1200;
export const SOCIAL_CARD_HEIGHT = 630;
const MAXIMUM_TAGS = 3;

const INK = '#0a0a0a';
const PAPER = '#ffffff';
const ACCENT = '#d8ff3e';
const SOFT = '#555555';
const TITLE_FONT = 'Space Grotesk';
const MONO_FONT = 'IBM Plex Mono';

const element = (
  type: string,
  style: Record<string, string | number>,
  children: SocialCardNode | SocialCardNode[],
): SocialCardElement => ({ type, props: { style, children } });

// Long titles shrink so they never run past three or four lines.
export const titleFontSizeFor = (title: string): number => {
  if (title.length > 100) return 48;
  if (title.length > 75) return 54;
  return 62;
};

const tagPill = (tag: string, highlighted: boolean): SocialCardElement =>
  element(
    'div',
    {
      display: 'flex',
      padding: '6px 18px',
      borderRadius: 999,
      border: `2px solid ${highlighted ? ACCENT : INK}`,
      background: highlighted ? ACCENT : PAPER,
    },
    tag,
  );

export const buildSocialCard = (content: SocialCardContent): SocialCardElement =>
  element(
    'div',
    {
      width: SOCIAL_CARD_WIDTH,
      height: SOCIAL_CARD_HEIGHT,
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      padding: '64px 72px',
      background: PAPER,
      color: INK,
      fontFamily: TITLE_FONT,
    },
    [
      element(
        'div',
        { display: 'flex', gap: 12, fontFamily: MONO_FONT, fontSize: 22 },
        content.tags.slice(0, MAXIMUM_TAGS).map((tag, index) => tagPill(tag, index === 0)),
      ),
      element(
        'div',
        {
          display: 'flex',
          marginTop: 36,
          fontSize: titleFontSizeFor(content.title),
          fontWeight: 700,
          lineHeight: 1.08,
          maxWidth: 1050,
        },
        content.title,
      ),
      element('div', { display: 'flex', alignItems: 'center', gap: 22, marginTop: 'auto' }, [
        {
          type: 'img',
          props: {
            src: content.portraitDataUrl,
            style: { width: 84, height: 84, borderRadius: 999, border: `3px solid ${INK}` },
          },
        },
        element('div', { display: 'flex', flexDirection: 'column' }, [
          element('div', { fontSize: 30, fontWeight: 700 }, content.authorName),
          element('div', { fontFamily: MONO_FONT, fontSize: 22, color: SOFT }, content.siteHost),
        ]),
        element('div', { marginLeft: 'auto', fontFamily: MONO_FONT, fontSize: 24, color: SOFT }, content.readingTime),
      ]),
    ],
  );
