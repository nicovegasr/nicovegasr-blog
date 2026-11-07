import type { APIContext } from 'astro';
import type { Post } from '@/features/posts/post';
import { localeFrom } from '@/i18n/locale';
import {
  buildPostSocialImagePaths,
  buildPostSocialImageResponse,
} from '@/features/posts/social-image/post-social-image-endpoint';

export const getStaticPaths = buildPostSocialImagePaths;

export const GET = (context: APIContext<{ post: Post }>): Promise<Response> =>
  buildPostSocialImageResponse(context.props.post, localeFrom(context.params.locale), context.site);
