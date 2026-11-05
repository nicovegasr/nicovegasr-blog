import { expect, test, type Page } from '@playwright/test';

test('the blog index shows nine articles per page and searches across every page', async ({ page }) => {
  await page.goto('/contenido/blog/');
  const visiblePosts = page.locator('.post-list > li:not([hidden])');
  await expect(visiblePosts).toHaveCount(9);

  await page.locator('[data-post-pagination] [data-page="2"]').click();
  await expect(page).toHaveURL(/\?page=2$/);
  await expect(page.locator('[data-page="2"]')).toHaveAttribute('aria-current', 'page');
  const secondPageFirstSlug = await visiblePosts.first().locator('[data-slug]').getAttribute('data-slug');

  await page.reload();
  await expect(visiblePosts.first().locator('[data-slug]')).toHaveAttribute('data-slug', secondPageFirstSlug!);

  await page.locator('.post-search .input').fill('spring batch');
  await expect(page.locator('[data-post-pagination]')).toBeHidden();
  await expect(visiblePosts).toHaveCount(3);
});

const gallery = '#friend-blogs';
const AITOR = 'https://www.aitorevi.dev/blog';
const MARIO = 'https://www.mario-pinto-miranda.dev/blog/';
const ROMER = 'https://romeralvarez.me/es/blog/';
const LEAN_MIND = 'https://leanmind.es/es/blog';

async function openGallery(page: Page) {
  await page.clock.install();
  await page.goto('/contenido/blog/');
  const section = page.locator(gallery);
  await section.locator('.coverflow-stage').scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  return { section, centred: section.locator('[data-slide][data-position="0"]') };
}

test('drifts continuously and hovering eases the drift to a halt', async ({ page }) => {
  const { section, centred } = await openGallery(page);
  await expect(centred).toHaveAttribute('href', AITOR);
  await expect(section.locator('[data-counter]')).toHaveText('02');
  const first = await centred.getAttribute('style');
  await page.clock.runFor(1000);
  expect(await centred.getAttribute('style')).not.toBe(first);
  await page.clock.runFor(6000);
  await expect(centred).toHaveAttribute('href', MARIO);
  await expect(section.locator('[data-counter]')).toHaveText('03');

  await section.locator('.coverflow-stage').hover();
  await page.clock.runFor(1000);
  const held = await centred.getAttribute('style');
  await page.clock.runFor(12000);
  expect(await centred.getAttribute('style')).toBe(held);
  await page.mouse.move(0, 0);
  await page.clock.runFor(9000);
  await expect(centred).toHaveAttribute('href', ROMER);
});

test('resting the mouse on a side card brings it to the centre without chaining to the next', async ({ page }) => {
  const { section, centred } = await openGallery(page);
  const next = section.locator('[data-slide][data-position="1"]');
  const box = (await next.boundingBox())!;
  const visibleRight = Math.min(box.x + box.width, page.viewportSize()!.width) - 60;
  await page.mouse.move(visibleRight, box.y + box.height / 2, { steps: 4 });
  await page.clock.runFor(1500);
  await expect(centred).toHaveAttribute('href', MARIO);
  await page.mouse.move(visibleRight + 2, box.y + box.height / 2 + 2);
  await page.clock.runFor(3000);
  await expect(centred).toHaveAttribute('href', MARIO);
  await expect(section.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
});

test('the drift keeps going when the page scrolls under a resting mouse, and only a card holds it', async ({ page }) => {
  const { section, centred } = await openGallery(page);
  await expect(section.locator('[data-caption][data-active]')).toContainText('Aitor Reviriego');
  const stage = (await section.locator('.coverflow-stage').boundingBox())!;
  // Blank space beside the cards, above them inside the stage.
  await page.mouse.move(stage.x + 20, stage.y + 4, { steps: 3 });
  const first = await centred.getAttribute('style');
  await page.clock.runFor(1000);
  expect(await centred.getAttribute('style')).not.toBe(first);

  await page.mouse.move(stage.x + stage.width / 2, stage.y + stage.height / 3, { steps: 3 });
  await page.clock.runFor(1500);
  const held = await centred.getAttribute('style');
  await page.clock.runFor(2000);
  expect(await centred.getAttribute('style')).toBe(held);
  const scrolled = await page.evaluate(() => scrollY);

  await page.mouse.wheel(0, -120);
  // Wheel scrolling runs on the compositor in real time, outside the fake clock.
  await expect.poll(() => page.evaluate(() => scrollY)).not.toBe(scrolled);
  await page.clock.runFor(1500);
  expect(await centred.getAttribute('style')).not.toBe(held);
});

test('choosing a blog glides to it and stops the tour there', async ({ page }) => {
  const { section, centred } = await openGallery(page);
  await page.clock.runFor(1000);
  await page.keyboard.press('Tab'); await section.locator('[data-play]').focus(); await page.keyboard.press('ArrowRight');
  await expect(centred).toHaveAttribute('href', MARIO);
  await expect(section.getByRole('button', { name: 'Reanudar', exact: true })).toBeVisible();
  await page.clock.runFor(20000);
  await expect(centred).toHaveAttribute('href', MARIO);

  await section.getByRole('button', { name: 'Lean Mind', exact: true }).click();
  await page.clock.runFor(2000);
  await expect(centred).toHaveAttribute('href', LEAN_MIND);
  const slide = await centred.getAttribute('style');
  await page.clock.runFor(20000);
  expect(await centred.getAttribute('style')).toBe(slide);

  await section.getByRole('button', { name: 'Reanudar', exact: true }).click();
  await expect(section.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  // Offscreen galleries suspend their motion, so bring the cards back into view.
  await section.locator('.coverflow-stage').scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await page.clock.runFor(6500);
  await expect(centred).not.toHaveAttribute('href', LEAN_MIND);
});

test('clicking a side card brings it forward instead of leaving the page', async ({ page }) => {
  const { section, centred } = await openGallery(page);
  const next = section.locator('[data-slide][data-position="1"]');
  const box = (await next.boundingBox())!;
  // Its visible sliver sits between the centred card and the viewport edge.
  const visibleRight = Math.min(box.x + box.width, page.viewportSize()!.width) - 40;
  await page.mouse.click(visibleRight, box.y + box.height / 2);
  await expect(page).toHaveURL(/\/contenido\/blog\/$/);
  await expect(centred).toHaveAttribute('href', MARIO);
  await expect(section.getByRole('button', { name: 'Reanudar', exact: true })).toBeVisible();
});

test('dragging pulls the cards along and lands on the nearest blog without following the link', async ({ page }) => {
  const { section, centred } = await openGallery(page);
  await expect(section.getByText('Arrastra para explorar')).toBeVisible();
  const box = (await section.locator('.coverflow-stage').boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  for (let step = 1; step <= 10; step++) await page.mouse.move(box.x + box.width / 2 - step * 50, y);
  await page.clock.runFor(200);
  await page.mouse.up();
  await page.clock.runFor(1500);
  await expect(page).toHaveURL(/\/contenido\/blog\/$/);
  await expect(centred).not.toHaveAttribute('href', AITOR);
  await expect(section.getByRole('button', { name: 'Reanudar', exact: true })).toBeVisible();
  await expect(section).toHaveClass(/has-dragged/);
  await page.reload();
  await expect(page.locator(gallery)).toHaveClass(/has-dragged/);
});

test('reduced motion starts paused and manual selection keeps the selected playback state', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/contenido/blog/');
  const section = page.locator(gallery);
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByRole('button', { name: 'Reanudar', exact: true })).toBeVisible();
  await section.getByRole('button', { name: 'Romer Alvarez', exact: true }).click();
  await expect(section.locator('[data-slide][data-position="0"]')).toHaveAttribute('href', ROMER);
  await expect(section.getByRole('button', { name: 'Reanudar', exact: true })).toBeVisible();
});

test('all five blog links remain available without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/contenido/blog/');
  await expect(page.locator(`${gallery} a`)).toHaveCount(5);
  await expect(page.locator(`${gallery} [data-play]`)).toBeHidden();
  await context.close();
});

test('keyboard focus pauses a visible link and Enter keeps its destination', async ({ page }) => {
  const { section, centred } = await openGallery(page);
  await section.locator('[data-play]').focus();
  await page.keyboard.press('Tab');
  const link = centred;
  await expect(link).toBeFocused();
  await expect(section.getByRole('button', { name: 'Reanudar', exact: true })).toBeVisible();
  const destination = await link.getAttribute('href');
  await page.keyboard.press('ArrowRight');
  await page.clock.runFor(1000);
  await expect(section.locator('[data-slide][data-position="0"]')).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await page.clock.runFor(1000);
  await expect(section.locator('[data-slide][data-position="0"]')).toHaveAttribute('href', destination!);
  await page.context().route(destination!, (route) => route.fulfill({ body: '<h1>Blog destination</h1>', contentType: 'text/html' }));
  const opened = page.waitForEvent('popup');
  await page.keyboard.press('Enter');
  // Blogs open in a new tab so the reader keeps this page.
  await expect(await opened).toHaveURL(destination!);
  await expect(page).toHaveURL(/\/contenido\/blog\/$/);
});
