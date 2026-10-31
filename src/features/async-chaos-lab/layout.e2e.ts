import { expect, test } from '@playwright/test';
import { labPath } from './links';

type Geometry = { height: number; footerTop: number };

for (const viewport of [{ width: 360, height: 640 }, { width: 1280, height: 800 }]) {
  test.describe(`initial lab layout at ${viewport.width}px`, () => {
    test.use({ viewport });

    test('reserves the initial viewport before the game mounts in both languages', async ({ page }) => {
      await page.addInitScript(() => {
        const original = customElements.define.bind(customElements);
        customElements.define = (name, constructor, options) => {
          if (name !== 'queue-stories-game' && name !== 'queue-scaling-game') {
            return original(name, constructor, options);
          }
          const measure = () => ({
            height: document.querySelector(name)!.getBoundingClientRect().height,
            footerTop: document.querySelector('.site-footer')!.getBoundingClientRect().top,
          });
          const before = measure();
          original(name, constructor, options);
          (window as Window & { labMount?: unknown }).labMount = { before, after: measure() };
        };
      });
      for (const locale of ['es', 'en'] as const) {
        for (const level of [1, 2, 3] as const) {
          await page.goto(labPath(locale, level));
          const mount = await page.evaluate(() =>
            (window as Window & { labMount?: { before: Geometry; after: Geometry } }).labMount!,
          );
          expect(mount.before.height).toBeGreaterThanOrEqual(viewport.height);
          expect(mount.before.footerTop).toBeGreaterThanOrEqual(viewport.height);
          expect(mount.after.footerTop).toBeGreaterThanOrEqual(viewport.height);
          expect(mount.after.height).toBeGreaterThanOrEqual(mount.before.height);
        }
      }
    });
  });
}
