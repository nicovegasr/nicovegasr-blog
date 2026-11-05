import { describe, expect, it } from 'vitest';
import { paginatePosts, parsePageParameter } from '@/features/posts/post-pagination';

describe('post pagination', () => {
  it('slices the requested page', () => {
    expect(paginatePosts(12, 2)).toEqual({ page: 2, pageCount: 2, start: 6, end: 12 });
  });

  it('keeps a short last page', () => {
    expect(paginatePosts(13, 3)).toEqual({ page: 3, pageCount: 3, start: 12, end: 13 });
  });

  it('clamps pages outside the range', () => {
    expect(paginatePosts(12, 9).page).toBe(2);
    expect(paginatePosts(12, 0).page).toBe(1);
  });

  it('has one empty page when there are no posts', () => {
    expect(paginatePosts(0, 1)).toEqual({ page: 1, pageCount: 1, start: 0, end: 0 });
  });

  it('reads only positive whole page numbers from the address', () => {
    expect(parsePageParameter('2')).toBe(2);
    expect(parsePageParameter(null)).toBe(1);
    expect(parsePageParameter('-1')).toBe(1);
    expect(parsePageParameter('1.5')).toBe(1);
    expect(parsePageParameter('abc')).toBe(1);
  });
});
