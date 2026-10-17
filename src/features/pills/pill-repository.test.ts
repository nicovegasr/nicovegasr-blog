import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getCollection, render } = vi.hoisted(() => ({
  getCollection: vi.fn(),
  render: vi.fn(),
}));
vi.mock('astro:content', () => ({ getCollection, render }));

import {
  findAllPillSeries,
  findPillSeriesCatalog,
  findAllPublishedPills,
  findRenderablePill,
  findRenderablePillSeries,
} from './pill-repository';

const seriesEntry = (locale: string, draft: boolean) => ({
  id: `${locale}/inventory/overview`,
  body: '',
  data: {
    kind: 'series', draft, title: 'Inventory', summary: 'Inventory concepts',
    icon: 'foundation', order: 1, publicationDate: new Date('2020-01-01'),
  },
});
const pillEntry = (locale: string) => ({
  id: `${locale}/inventory/intro`,
  body: 'Inventory introduction',
  data: {
    kind: 'pill', title: 'Introduction', subtitle: 'Inventory basics',
    icon: 'foundation', order: 1, bonus: false,
    publicationDate: new Date('2020-01-01'),
  },
});

beforeEach(() => {
  getCollection.mockReset();
  render.mockReset();
  render.mockResolvedValue({ Content: () => null });
});

describe('series publication', () => {
  it('announces a draft using metadata without rendering its content or generating routes', async () => {
    getCollection.mockResolvedValue([seriesEntry('es', true), pillEntry('es')]);
    expect(await findPillSeriesCatalog('es')).toEqual([
      expect.objectContaining({ slug: 'inventory', title: 'Inventory', draft: true }),
    ]);
    expect(await findAllPillSeries('es')).toEqual([]);
    expect(await findAllPublishedPills('es')).toEqual([]);
    expect(render).not.toHaveBeenCalled();
  });

  it('keeps future announcements and other locales out of the catalogue', async () => {
    const future = seriesEntry('es', true);
    future.data.publicationDate = new Date('2999-01-01');
    getCollection.mockResolvedValue([future, seriesEntry('en', true)]);
    expect(await findPillSeriesCatalog('es')).toEqual([]);
    expect(render).not.toHaveBeenCalled();
  });

  it('withholds a draft series and its dated pills from every public entry point', async () => {
    getCollection.mockResolvedValue([seriesEntry('es', true), pillEntry('es')]);

    expect(await findAllPillSeries('es')).toEqual([]);
    expect(await findAllPublishedPills('es')).toEqual([]);
    expect(await findRenderablePillSeries('es', 'inventory')).toBeNull();
    expect(await findRenderablePill('es', 'inventory', 'intro')).toBeNull();
    expect(render).not.toHaveBeenCalled();
  });

  it('publishes the series and its pills when the draft flag is removed', async () => {
    const entry = seriesEntry('es', false);
    getCollection.mockResolvedValue([entry, pillEntry('es')]);

    expect(await findAllPillSeries('es')).toHaveLength(1);
    expect(await findAllPublishedPills('es')).toEqual([
      { series: 'inventory', pill: 'intro' },
    ]);
    expect(await findRenderablePill('es', 'inventory', 'intro')).not.toBeNull();
  });

  it('applies the parent series visibility in the requested locale', async () => {
    getCollection.mockResolvedValue([
      seriesEntry('es', true), pillEntry('es'),
      seriesEntry('en', false), pillEntry('en'),
    ]);

    expect(await findAllPublishedPills('es')).toEqual([]);
    expect(await findAllPublishedPills('en')).toEqual([
      { series: 'inventory', pill: 'intro' },
    ]);
  });
});
