import { expect, test } from '@playwright/test';

const stops = '[data-journey-stop]';
const reachedStops = `${stops}.is-reached`;

test('the journey lights up its stops as the reader scrolls', async ({ page }) => {
  await page.goto('/es/sobre-mi');
  const total = await page.locator(stops).count();
  expect(total).toBeGreaterThan(1);
  const reachedOnArrival = await page.locator(reachedStops).count();
  expect(reachedOnArrival).toBeLessThan(total);

  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));

  await expect(page.locator(reachedStops)).toHaveCount(total);
});

test('the journey is told in chronological order and the stack comes after it', async ({ page }) => {
  await page.goto('/en/about');

  const dates = await page.locator(`${stops} time:first-of-type`).evaluateAll((times) =>
    times.map((time) => time.getAttribute('datetime') ?? ''),
  );
  expect(dates).toEqual([...dates].sort());

  const journeyTop = await page.locator('[data-journey]').evaluate((element) => element.getBoundingClientRect().top);
  const stackTop = await page.locator('.stack').evaluate((element) => element.getBoundingClientRect().top);
  expect(stackTop).toBeGreaterThan(journeyTop);
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('every stop is readable without scrolling', async ({ page }) => {
    await page.goto('/es/sobre-mi');
    await expect(page.locator(reachedStops)).toHaveCount(await page.locator(stops).count());
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every stop is still readable', async ({ page }) => {
    await page.goto('/es/sobre-mi');
    await expect(page.locator(stops).first()).toBeVisible();
    await expect(page.locator(`${stops} .summary`).last()).toHaveCSS('opacity', '1');
  });
});
