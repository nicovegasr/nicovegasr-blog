import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import sharp from 'sharp';
import { LOCALES, type Locale } from '@/i18n/locale';
import { AUTHOR } from '@/shared/discovery/author';
import { readingTimeCopy } from '@/shared/reading-time/copy';
import { findHostedPosts } from '@/features/posts/post-repository';
import { SOCIAL_CARD_HEIGHT, SOCIAL_CARD_WIDTH, buildSocialCard } from './post-social-card';

// Builds /og/<locale>/<slug>.png at build time: the card each article shows when shared.
// Satori reads WOFF but not WOFF2, hence the static Space Grotesk package.

const fromProject = (path: string): Promise<Buffer> => readFile(join(process.cwd(), path));

const loadAssets = async () => {
  const [title, mono, portrait] = await Promise.all([
    fromProject('node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff'),
    fromProject('node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff'),
    fromProject(`public${AUTHOR.portraitPath}`).then((image) => sharp(image).resize(168, 168).png().toBuffer()),
  ]);
  return {
    fonts: [
      { name: 'Space Grotesk', data: title, weight: 700 as const, style: 'normal' as const },
      { name: 'IBM Plex Mono', data: mono, weight: 500 as const, style: 'normal' as const },
    ],
    portraitDataUrl: `data:image/png;base64,${portrait.toString('base64')}`,
  };
};

let assets: ReturnType<typeof loadAssets> | undefined;

export const buildPostSocialImagePaths = async () =>
  (
    await Promise.all(
      LOCALES.map(async (locale) =>
        (await findHostedPosts(locale)).map((post) => ({ params: { locale, slug: post.slug }, props: { post } })),
      ),
    )
  ).flat();

export const buildPostSocialImageResponse = async (
  post: Awaited<ReturnType<typeof findHostedPosts>>[number],
  locale: Locale,
  site: URL | undefined,
): Promise<Response> => {
  assets ??= loadAssets();
  const { fonts, portraitDataUrl } = await assets;

  const card = buildSocialCard({
    title: post.title,
    tags: post.tags,
    readingTime: `${post.readingTimeInMinutes} ${readingTimeCopy(locale).minutesOfReading}`,
    authorName: AUTHOR.name.split(' ').slice(0, 2).join(' '),
    siteHost: site?.host ?? '',
    portraitDataUrl,
  });
  const svg = await satori(card as Parameters<typeof satori>[0], {
    width: SOCIAL_CARD_WIDTH,
    height: SOCIAL_CARD_HEIGHT,
    fonts,
  });
  const png = new Resvg(svg).render().asPng();

  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
