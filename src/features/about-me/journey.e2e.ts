import { expect, test } from '@playwright/test';

const stops = '[data-journey-stop]';
const reachedStops = `${stops}.is-reached`;

for (const viewport of [{ width: 1280, height: 800 }, { width: 360, height: 640 }]) {
  test.describe(`mascot ages at ${viewport.width}px`, () => {
    test.use({ viewport });

    for (const locale of ['es', 'en']) {
      test(`the ${locale} timeline restores every age in both scroll directions`, async ({ page }, testInfo) => {
        await page.goto(`/${locale}/`);
        const walker = page.locator('[data-page-walker]');
        await expect(walker).toHaveAttribute('data-mascot-age', 'original');
        const atlasUrls = await walker.evaluate((element) =>
          [...new Set(Object.values(JSON.parse(element.getAttribute('data-mascot-atlases')!) as Record<string, { walking: string; reactions: string }>)
            .flatMap(({ walking, reactions }) => [walking, reactions]))],
        );
        const preloadedUrls = await page.locator('link[rel="preload"][as="image"]')
          .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
        expect(preloadedUrls).toEqual(expect.arrayContaining(atlasUrls));

        const scrollToStop = async (year: string) => {
          await page.locator(`${stops}[data-start-year="${year}"]`).evaluate((element) => {
            const stage = document.querySelector<HTMLElement>('[data-route-stage]')!;
            window.scrollTo({
              top: window.scrollY + element.getBoundingClientRect().top - stage.offsetHeight * 0.88 + 8,
              behavior: 'instant',
            });
          });
          await expect(page.locator(`${stops}.is-active`)).toHaveAttribute('data-start-year', year);
          await expect(walker).toHaveAttribute('data-mascot-age', year);
          await expect(walker).toHaveCSS('--walking-atlas', new RegExp(`age-${year}`));
        };

        for (const year of ['2019', '2023', '2024', '2026']) {
          await scrollToStop(year);
          if (locale === 'es') {
            await page.screenshot({ path: testInfo.outputPath(`age-${year}.png`) });
          }
        }
        await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
        await expect(walker).toHaveClass(/is-arrived/);
        await expect(walker).toHaveAttribute('data-mascot-age', '2026');
        await expect(walker).toHaveCSS('--reactions-atlas', /age-2026-reactions/);
        if (locale === 'es') {
          await page.screenshot({ path: testInfo.outputPath('skills.png') });
        }
        for (const year of ['2026', '2024', '2023', '2019']) {
          await scrollToStop(year);
        }
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await expect(walker).toHaveAttribute('data-mascot-age', 'original');
        await expect(walker).toHaveCSS('--walking-atlas', /worker-walk-atlas/);
      });
    }
  });
}

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
    const thread = document.querySelector<HTMLElement>('[data-walkway-thread]')!;
    const scrollable = route.offsetHeight - stage.offsetHeight;
    window.scrollTo({ top: route.getBoundingClientRect().top + window.scrollY + scrollable, behavior: 'instant' });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const walkerBox = walker.getBoundingClientRect();
    const threadBox = thread.getBoundingClientRect();
    return {
      walkerCenter: walkerBox.left + walkerBox.width / 2,
      threadCenter: threadBox.left + threadBox.width / 2,
    };
  });

  expect(Math.abs(positions.walkerCenter - positions.threadCenter)).toBeLessThan(2);
});

for (const viewport of [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
]) {
  test.describe(`the mascot at ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });

    test('stays whole on screen and on its line, scrolling down and back up', async ({ page }) => {
      await page.goto('/es/');

      const samples = await page.evaluate(async () => {
        const walker = document.querySelector<HTMLElement>('[data-page-walker]')!;
        const thread = document.querySelector<HTMLElement>('[data-walkway-thread]')!;
        const routes = document.querySelectorAll<HTMLElement>('[data-route]');
        const firstRoute = routes[0]!;
        const lastRoute = routes[routes.length - 1]!;
        const stageHeight = firstRoute.querySelector<HTMLElement>('[data-route-stage]')!.offsetHeight;
        const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const end = document.documentElement.scrollHeight - window.innerHeight;
        const downwards: number[] = [];
        for (let top = 0; top < end; top += window.innerHeight / 5) {
          downwards.push(Math.round(top));
        }
        downwards.push(end);

        const measured = [];
        for (const top of [...downwards, ...[...downwards].reverse()]) {
          window.scrollTo({ top, behavior: 'instant' });
          await nextFrame();
          // El sprite con los brazos abiertos llega al borde de su caja: si la caja cabe, la mascota también.
          const walkerBox = walker.getBoundingClientRect();
          const threadBox = thread.getBoundingClientRect();
          measured.push({
            top,
            left: walkerBox.left,
            right: walkerBox.right,
            screenWidth: document.documentElement.clientWidth,
            center: walkerBox.left + walkerBox.width / 2,
            threadCenter: threadBox.left + threadBox.width / 2,
            isOnThread:
              firstRoute.getBoundingClientRect().bottom <= stageHeight && lastRoute.getBoundingClientRect().top >= 0,
          });
        }
        return measured;
      });

      expect(samples.some((sample) => sample.isOnThread)).toBe(true);
      for (const sample of samples) {
        expect(sample.left, `left edge at scrollY ${sample.top}`).toBeGreaterThanOrEqual(0);
        expect(sample.right, `right edge at scrollY ${sample.top}`).toBeLessThanOrEqual(sample.screenWidth);
        if (sample.isOnThread) {
          expect(Math.abs(sample.center - sample.threadCenter), `thread at scrollY ${sample.top}`).toBeLessThan(2);
        }
      }
    });

    test('the timeline stops sit on the thread and the text keeps clear of it', async ({ page }) => {
      await page.goto('/es/');
      await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));

      const layout = await page.evaluate(() => {
        const threadBox = document.querySelector<HTMLElement>('[data-walkway-thread]')!.getBoundingClientRect();
        const stops = [...document.querySelectorAll<HTMLElement>('[data-journey-stop]')].map((stop) => {
          const dot = getComputedStyle(stop, '::before');
          const dotLeft = stop.getBoundingClientRect().left + parseFloat(dot.left);
          return {
            dotCenter: dotLeft + parseFloat(dot.width) / 2,
            dotRight: dotLeft + parseFloat(dot.width),
            textLeft: stop.querySelector<HTMLElement>('.when')!.getBoundingClientRect().left,
          };
        });
        const stationNames = [...document.querySelectorAll<HTMLElement>('[data-route-station] .station-name')].flatMap(
          (name) => [...name.getClientRects()].map((line) => line.right),
        );
        return {
          threadCenter: threadBox.left + threadBox.width / 2,
          screenWidth: document.documentElement.clientWidth,
          stops,
          stationNames,
        };
      });

      for (const stop of layout.stops) {
        expect(Math.abs(stop.dotCenter - layout.threadCenter)).toBeLessThan(2);
        expect(stop.textLeft - stop.dotRight).toBeGreaterThanOrEqual(15.5);
      }
      for (const right of layout.stationNames) {
        expect(right).toBeLessThanOrEqual(layout.screenWidth);
      }
    });
  });
}

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
