import type { APIContext } from 'astro';
import { buildPostsRssFeed } from '@/features/posts/post-feed';

export const GET = (context: APIContext): Promise<Response> =>
  buildPostsRssFeed('es', context.site);
