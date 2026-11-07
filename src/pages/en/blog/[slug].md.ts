import type { APIContext } from 'astro';
import { buildPostMarkdownPaths, buildPostMarkdownResponse } from '@/features/posts/post-markdown-endpoint';

export const getStaticPaths = () => buildPostMarkdownPaths('en');

export const GET = (context: APIContext): Promise<Response> =>
  buildPostMarkdownResponse('en', context.params.slug, context.site);
