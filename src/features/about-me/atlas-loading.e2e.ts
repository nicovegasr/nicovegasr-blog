import { expect, test } from '@playwright/test';

test('age atlases are fetched near the timeline rather than on arrival', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (/age-\d{4}.*\.webp/.test(request.url())) requests.push(request.url());
  });
  await page.goto('/');
  await expect.poll(() => page.locator('[data-walkway-thread]').evaluate((element) =>
    (element as HTMLElement).style.height,
  )).not.toBe('');
  expect(requests).toEqual([]);

  const studentRequest = page.waitForRequest(/age-2019.*\.webp/);
  await page.locator('[data-start-year="2019"]').evaluate((element) => {
    window.scrollTo({
      top: window.scrollY + element.getBoundingClientRect().top - window.innerHeight * 1.5,
      behavior: 'instant',
    });
  });
  await studentRequest;
  await expect(page.locator('[data-page-walker]')).toHaveAttribute('data-mascot-age', 'original');
});

for (const returnToTop of [false, true]) {
  test(`a delayed atlas ${returnToTop ? 'cannot overwrite a newer age request' : 'keeps the current character visible until decoded'}`, async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    await page.route(/age-2019.*\.webp/, async (route) => {
      await held;
      await route.continue();
    });
    await page.goto('/');
    const requested = page.waitForRequest(/age-2019.*\.webp/);
    await page.locator('[data-start-year="2019"]').evaluate((element) => {
      window.scrollTo({
        top: window.scrollY + element.getBoundingClientRect().top - window.innerHeight * 0.88 + 8,
        behavior: 'instant',
      });
    });
    await requested;
    await expect(page.locator('[data-start-year="2019"]')).toHaveClass(/is-active/);
    const walker = page.locator('[data-page-walker]');
    await expect(walker).toHaveAttribute('data-mascot-age', 'original');
    await expect(walker).toHaveCSS('--walking-atlas', /worker-walk-atlas/);
    if (returnToTop) {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await expect(page.locator('[data-journey-stop].is-active')).toHaveCount(0);
    }
    const response = page.waitForResponse(/age-2019.*\.webp/);
    release();
    await response;
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect(walker).toHaveAttribute('data-mascot-age', returnToTop ? 'original' : '2019');
  });
}
