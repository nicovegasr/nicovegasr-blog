import { expect, test } from '@playwright/test';

// Reuse the actual server-rendered component, not a hand-maintained HTML imitation.
async function addInstances(page: import('@playwright/test').Page) {
  await page.route('**/contenido/blog/', async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    const component = html.match(/<coverflow-carousel\b[\s\S]*?<\/coverflow-carousel>/)?.[0];
    if (!component) throw new Error('Missing rendered Coverflow component');
    const copies = [1, 2, 3, 5]
      .map((count) => {
        let slides = 0;
        let dots = 0;
        return component
          .replace(/id="friend-blogs"/, `id="sample-${count}" style="width:480px;max-width:100%"`)
          .replaceAll('friend-blogs-title', `sample-${count}-title`)
          .replace(/<a\b[\s\S]*?<\/a>/g, (anchor) => (slides++ < count ? anchor : ''))
          .replace(/<button\b[^>]*data-dot[\s\S]*?<\/button>/g, (button) => (dots++ < count ? button : ''))
          .replace('data-autoplay="true"', 'data-autoplay="false"');
      })
      .join('');
    await route.fulfill({ response, body: html.replace('</main>', `${copies}</main>`) });
  });
  await page.goto('/contenido/blog/');
}

test('multiple instances have independent controls, unique headings and container-sized cards', async ({ page }) => {
  await page.clock.install();
  await addInstances(page);
  for (const count of [1, 2]) {
    const root = page.locator(`#sample-${count}`);
    await expect(root.locator('[data-slide]')).toHaveCount(count);
    await expect(root.locator('[data-play]')).toBeHidden();
    expect(
      await root
        .locator('[data-slide]')
        .first()
        .evaluate((element) => (element as HTMLElement).inert),
    ).toBe(false);
  }
  const first = page.locator('#sample-3');
  const second = page.locator('#sample-5');
  await first.scrollIntoViewIfNeeded();
  await expect(first.getByRole('button', { name: 'Reanudar', exact: true })).toBeVisible();
  await first.getByRole('button', { name: 'Reanudar', exact: true }).click();
  await expect(first.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  await expect(second.getByRole('button', { name: 'Reanudar', exact: true })).toBeVisible();
  const sizes = await first.evaluate((root) => ({
    container: root.clientWidth,
    slide: root.querySelector('[data-slide]')!.getBoundingClientRect().width,
  }));
  expect(sizes.slide).toBeLessThan(sizes.container);
  const ids = await page
    .locator('coverflow-carousel h2')
    .evaluateAll((headings) => headings.map((heading) => heading.id));
  expect(new Set(ids).size).toBe(ids.length);
});

test('removal disposes animation and reinsertion restores functional controls', async ({ page }) => {
  await page.clock.install();
  await addInstances(page);
  const root = page.locator('#sample-3');
  await root.scrollIntoViewIfNeeded();
  await root.getByRole('button', { name: 'Reanudar', exact: true }).click();
  await page.clock.runFor(400);
  await root.getByRole('button', { name: 'Pausar', exact: true }).click();
  const frozen = await root.locator('[data-slide]').first().getAttribute('style');
  const detached = await root.evaluateHandle((element) => {
    element.remove();
    return element;
  });
  await page.clock.runFor(1000);
  expect(
    await detached.evaluate((element) =>
      [...element.querySelectorAll('[data-slide]')].every(
        (slide) => !slide.hasAttribute('style') && !(slide as HTMLElement).inert,
      ),
    ),
  ).toBe(true);
  await detached.evaluate((element) => document.querySelector('main')!.append(element));
  await root.scrollIntoViewIfNeeded();
  expect(await root.locator('[data-slide]').first().getAttribute('style')).toBe(frozen);
  await expect(root.getByRole('button', { name: 'Reanudar', exact: true })).toBeVisible();
  await root.getByRole('button', { name: 'Reanudar', exact: true }).click();
  await expect(root.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  await root.getByRole('button', { name: 'Pausar', exact: true }).click();
  await expect(root.getByRole('button', { name: 'Reanudar', exact: true })).toBeVisible();
});
