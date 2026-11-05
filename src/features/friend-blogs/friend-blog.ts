export type FriendBlog = {
  readonly id: string;
  readonly author: string;
  readonly url: string;
  readonly host: string;
  readonly image: string;
  readonly order: number;
  readonly description: string;
};

export const hostOf = (url: string): string => new URL(url).hostname.replace(/^www\./, '');
