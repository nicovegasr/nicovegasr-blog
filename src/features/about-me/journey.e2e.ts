import { expect, test } from '@playwright/test';

const stops = '[data-journey-stop]';
const reachedStops = `${stops}.is-reached`;

test('the journey lights up its stops as the reader scrolls', async ({ page }) => {
  await page.goto('/es/');
  const total = await page.locator(stops).count();
  expect(total).toBeGreaterThan(1);
  const reachedOnArrival = await page.locator(reachedStops).count();
  expect(reachedOnArrival).toBeLessThan(total);

  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));

  await expect(page.locator(reachedStops)).toHaveCount(total);
});

test('one mascot crosses the whole page and opens its arms when it arrives', async ({ page }) => {
  const walker = page.locator('[data-page-walker]');
  await page.goto('/es/');
  await expect(walker).toHaveCount(1);
  await expect(walker).not.toHaveClass(/is-arrived/);

  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));

  await expect(walker).toHaveClass(/is-arrived/);
});

test('the mascot leaves the contributions at the top of the thread', async ({ page }) => {
  await page.goto('/es/');

  const positions = await page.evaluate(async () => {
    const route = document.querySelector<HTMLElement>('[data-route]')!;
    const stage = route.querySelector<HTMLElement>('[data-route-stage]')!;
    const walker = document.querySelector<HTMLElement>('[data-page-walker]')!;
    const walkway = document.querySelector<HTMLElement>('[data-walkway]')!;
    const scrollable = route.offsetHeight - stage.offsetHeight;
    window.scrollTo({ top: route.getBoundingClientRect().top + window.scrollY + scrollable, behavior: 'instant' });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const walkerBox = walker.getBoundingClientRect();
    return {
      walkerCenter: walkerBox.left + walkerBox.width / 2,
      threadLeft: walkway.getBoundingClientRect().left,
    };
  });

  expect(Math.abs(positions.walkerCenter - positions.threadLeft)).toBeLessThan(2);
});

test('only the chapter being read is marked as active', async ({ page }) => {
  await page.goto('/es/');

  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));

  await expect(page.locator(`${stops}.is-active`)).toHaveCount(1);
  await expect(page.locator(stops).last()).toHaveClass(/is-active/);
});

test('the journey is told in chronological order and the stack comes after it', async ({ page }) => {
  await page.goto('/en/');

  const dates = await page.locator(`${stops} time:first-of-type`).evaluateAll((times) =>
    times.map((time) => time.getAttribute('datetime') ?? ''),
  );
  expect(dates).toEqual([...dates].sort());

  const journeyTop = await page.locator('[data-journey]').evaluate((element) => element.getBoundingClientRect().top);
  const stackTop = await page.locator('[data-route]').last().evaluate((element) => element.getBoundingClientRect().top);
  expect(stackTop).toBeGreaterThan(journeyTop);
});

test('the skills route walks from area to area as the reader scrolls', async ({ page }) => {
  const skills = page.locator('[data-route]').last();
  const stations = skills.locator('[data-route-station]');
  const walker = page.locator('[data-page-walker]');
  await page.goto('/es/');
  await expect(stations.first()).toHaveClass(/is-current/);

  const scrollThroughRoute = (ratio: number) =>
    page.evaluate((routeRatio) => {
      const routes = document.querySelectorAll<HTMLElement>('[data-route]');
      const route = routes[routes.length - 1]!;
      const scrollable = route.offsetHeight - window.innerHeight;
      window.scrollTo({ top: route.getBoundingClientRect().top + window.scrollY + scrollable * routeRatio, behavior: 'instant' });
    }, ratio);

  await scrollThroughRoute(0.5);
  await expect(stations.nth(2)).toHaveClass(/is-current/);
  await expect(skills.locator('[data-route-station].is-current')).toHaveCount(1);
  await expect(walker).not.toHaveClass(/is-arrived/);

  await scrollThroughRoute(1);
  await expect(stations.last()).toHaveClass(/is-current/);
  await expect(walker).toHaveClass(/is-arrived/);
});

test('the arrow keys walk the mascot only while they are held', async ({ page }) => {
  await page.goto('/es/');
  const routes = page.locator('[data-route]');
  const walker = page.locator('[data-page-walker]');
  const walkerLeft = () => walker.evaluate((element) => element.getBoundingClientRect().left);
  const scrollToRouteStart = (index: number) =>
    page.evaluate((routeIndex) => {
      const route = document.querySelectorAll<HTMLElement>('[data-route]')[routeIndex]!;
      window.scrollTo({ top: route.getBoundingClientRect().top + window.scrollY, behavior: 'instant' });
    }, index);
  const stationsOf = (index: number) => routes.nth(index).locator('[data-route-station]');

  await test.step('a short press moves it a little and it stays there', async () => {
    await scrollToRouteStart(1);
    await expect.poll(walkerLeft).toBeLessThan(200);
    const start = await walkerLeft();
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(150);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(100);
    const afterPress = await walkerLeft();
    expect(afterPress).toBeGreaterThan(start);
    expect(afterPress - start).toBeLessThan(150);
    await expect(stationsOf(1).first()).toHaveClass(/is-current/);
    await page.waitForTimeout(300);
    expect(await walkerLeft()).toBe(afterPress);
  });

  await test.step('the last line runs rightwards, so holding right reaches the next area', async () => {
    await page.keyboard.down('ArrowRight');
    await expect(stationsOf(1).nth(1)).toHaveClass(/is-current/);
    await page.keyboard.up('ArrowRight');
  });

  await test.step('the first line runs leftwards, so left moves forward and right moves back', async () => {
    await scrollToRouteStart(0);
    await page.keyboard.down('ArrowLeft');
    await expect(stationsOf(0).nth(1)).toHaveClass(/is-current/);
    await page.keyboard.up('ArrowLeft');
    await page.keyboard.down('ArrowRight');
    await expect(stationsOf(0).first()).toHaveClass(/is-current/);
    await page.keyboard.up('ArrowRight');
  });

  await test.step('outside the lines the keys do not scroll the page', async () => {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('every skill area can be read one after another', async ({ page }) => {
    await page.goto('/es/');
    const stations = page.locator('[data-route]').last().locator('[data-route-station]');
    await expect(stations.last().locator('h3')).toHaveCSS('opacity', '1');
    await expect(page.locator('[data-page-walker]')).toBeHidden();
    const positions = await stations.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().top));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(new Set(positions).size).toBe(positions.length);
  });

  test('every stop is readable without scrolling', async ({ page }) => {
    await page.goto('/es/');
    await expect(page.locator(reachedStops)).toHaveCount(await page.locator(stops).count());
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every stop is still readable', async ({ page }) => {
    await page.goto('/es/');
    await expect(page.locator(stops).first()).toBeVisible();
    await expect(page.locator(`${stops} .summary`).last()).toHaveCSS('opacity', '1');
  });
});
