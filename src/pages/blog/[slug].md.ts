import type { APIContext } from 'astro';
import { buildPostMarkdownPaths, buildPostMarkdownResponse } from '@/features/posts/post-markdown-endpoint';

export const getStaticPaths = () => buildPostMarkdownPaths('es');

export const GET = (context: APIContext): Promise<Response> =>
  buildPostMarkdownResponse('es', context.params.slug, context.site);
