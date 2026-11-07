import { expect, test, type Page } from '@playwright/test';
import { buildPagePath } from '@/i18n/routes';
import { LOCALES, type Locale } from '@/i18n/locale';

const openBackend = async (page: Page, locale: Locale = 'es') => {
  await page.goto(buildPagePath('home', locale));
  await page.evaluate(() => document.fonts.ready);
  await page
    .locator('[data-route]')
    .last()
    .evaluate((route) => {
      window.scrollTo({ top: window.scrollY + route.getBoundingClientRect().top + 2, behavior: 'instant' });
    });
};

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
  { width: 360, height: 640 },
  { width: 320, height: 568 },
]) {
  test.describe(`Backend metric at ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });
    for (const locale of LOCALES) {
      test(`${locale} keeps the result and batch pointer clear of the walking route`, async ({ page }, testInfo) => {
        await openBackend(page, locale);
        const metric = page.locator('[data-batch-metric]');
        await expect(metric.locator('strong')).toHaveText(locale === 'es' ? '1.000.000' : '1,000,000');
        await expect(metric.locator('[data-batch-pointer]')).toHaveText(
          locale === 'es' ? 'Lotes de 1.000' : 'Batches of 1,000',
        );
        await expect(page.locator('[data-page-walker]')).toHaveAttribute('data-mascot-role', 'backend');
        const bounds = await metric.evaluate((element) => {
          const box = element.getBoundingClientRect();
          const stage = element.closest('[data-route-stage]')!;
          return {
            top: box.top,
            bottom: box.bottom,
            left: box.left,
            right: box.right,
            line: stage.querySelector('[data-route-ground]')!.getBoundingClientRect().top,
            tags: element.previousElementSibling!.getBoundingClientRect().bottom,
          };
        });
        expect(bounds.top).toBeGreaterThanOrEqual(bounds.tags + 8);
        expect(bounds.bottom).toBeLessThan(bounds.line - 8);
        expect(bounds.left).toBeGreaterThanOrEqual(0);
        expect(bounds.right).toBeLessThanOrEqual(viewport.width);
        await page.screenshot({ path: testInfo.outputPath('backend.png') });
      });
    }
  });
}

test('the pointer follows the active batch, stops offscreen and the wrench belongs only to Backend', async ({
  page,
}) => {
  await openBackend(page);
  const metric = page.locator('[data-batch-metric]');
  const activeBatch = () =>
    metric
      .locator('[data-batch]')
      .evaluateAll((groups) => groups.findIndex((group) => group.classList.contains('is-active')));
  const initial = await activeBatch();
  const pointer = await metric.evaluate((element) => element.style.getPropertyValue('--batch-position'));
  await expect.poll(activeBatch).not.toBe(initial);
  await expect
    .poll(() => metric.evaluate((element) => element.style.getPropertyValue('--batch-position')))
    .not.toBe(pointer);
  await page
    .locator('[data-route]')
    .last()
    .evaluate((route) => {
      const stage = route.querySelector<HTMLElement>('[data-route-stage]')!;
      const length = (route.getBoundingClientRect().height - stage.offsetHeight) / 4;
      window.scrollTo({ top: window.scrollY + route.getBoundingClientRect().top + length, behavior: 'instant' });
    });
  await expect(metric).toBeHidden();
  const stopped = await activeBatch();
  await page.waitForTimeout(850);
  expect(await activeBatch()).toBe(stopped);
  await expect(page.locator('[data-page-walker]')).toHaveAttribute('data-mascot-role', 'frontend');
  await expect(page.locator('[data-page-walker]')).toHaveCSS('--walking-atlas', /skills-frontend/);
});

test.describe('static alternatives', () => {
  test.use({ reducedMotion: 'reduce' });
  test('reduced motion retains the result with a stationary batch marker', async ({ page }) => {
    await page.goto('/');
    const metric = page.locator('[data-batch-metric]');
    await metric.scrollIntoViewIfNeeded();
    await expect(metric).toBeVisible();
    const state = await metric.evaluate((element) => element.style.getPropertyValue('--batch-position'));
    await page.waitForTimeout(900);
    expect(await metric.evaluate((element) => element.style.getPropertyValue('--batch-position'))).toBe(state);
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('the result and batch explanation remain readable', async ({ page }) => {
    await page.goto('/en/');
    const metric = page.locator('[data-batch-metric]');
    await metric.scrollIntoViewIfNeeded();
    await expect(metric.locator('strong')).toHaveText('1,000,000');
    await expect(metric.locator('[data-batch-pointer]')).toBeVisible();
  });
});
