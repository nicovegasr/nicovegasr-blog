import { getCollection } from 'astro:content';
import type { Locale } from '@/i18n/locale';
import { hostOf, type FriendBlog } from './friend-blog';

export const findAllFriendBlogs = async (locale: Locale): Promise<readonly FriendBlog[]> => {
  const entries = await getCollection('friendBlogs');
  return entries
    .map((entry) => ({
      id: entry.id,
      author: entry.data.author,
      url: entry.data.url,
      host: hostOf(entry.data.url),
      image: entry.data.image,
      order: entry.data.order,
      description: entry.data.description[locale],
    }))
    .sort((first, second) => first.order - second.order);
};
