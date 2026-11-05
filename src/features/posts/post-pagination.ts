export const POSTS_PER_PAGE = 6;

export type PostPage = {
  readonly page: number;
  readonly pageCount: number;
  readonly start: number;
  readonly end: number;
};

export const paginatePosts = (postCount: number, requestedPage: number, postsPerPage = POSTS_PER_PAGE): PostPage => {
  const pageCount = Math.max(1, Math.ceil(postCount / postsPerPage));
  const page = Number.isInteger(requestedPage) ? Math.min(Math.max(requestedPage, 1), pageCount) : 1;
  const start = (page - 1) * postsPerPage;
  return { page, pageCount, start, end: Math.min(start + postsPerPage, postCount) };
};

export const parsePageParameter = (value: string | null): number => {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
};
