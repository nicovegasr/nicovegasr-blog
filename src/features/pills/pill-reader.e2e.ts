import { expect, test } from '@playwright/test';

const firstPill = '/es/pildoras/docker/intro/';
const catalogue = '/es/contenido/pildoras/';
const phone = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };

test.describe('reading on a phone', () => {
  test.use(phone);

  test('shows the pill on the first screen with the index closed', async ({ page }) => {
    await page.goto(firstPill);

    const title = page.getByRole('heading', { level: 1, name: '¿Qué es Docker?' });
    await expect(title).toBeInViewport();
    await expect(page.locator('#pill-index-navigation')).toBeHidden();
  });

  test('shows the swipe hint beside the title and then the reading time again', async ({ page }) => {
    await page.goto(firstPill);

    const hint = page.locator('[data-swipe-hint]');
    await expect(hint).toHaveText('← desliza para cambiar →');
    await expect(page.locator('.reading-time-slot')).toBeHidden();
    await expect(page.locator('[data-reader-keyboard-tip]')).toBeHidden();

    await expect(hint).toBeHidden({ timeout: 5000 });
    await expect(page.locator('.reading-time-slot')).toBeVisible();
  });

  test('opens an image full screen, enlarges it and closes it', async ({ page }) => {
    await page.goto(firstPill);
    const zoom = page.locator('[data-pill-image-zoom]');
    const enlarged = zoom.locator('img');

    await page.locator('.chapter-body img').first().click();
    await expect(zoom).toBeVisible();
    await expect(enlarged).toBeInViewport();

    await enlarged.click();
    await expect(enlarged).toHaveAttribute('data-enlarged', '');
    expect(await zoom.evaluate((dialog) => dialog.scrollWidth > dialog.clientWidth)).toBe(true);

    await page.locator('[data-pill-image-zoom-close]').click();
    await expect(zoom).toBeHidden();
  });

  test('opens the index from its whole line and closes it after choosing a pill', async ({ page }) => {
    await page.goto(firstPill);
    const index = page.locator('#pill-index-navigation');
    const disclosure = page.locator('[data-pill-index-disclosure]');

    await page.locator('.contents-heading').click({ position: { x: 20, y: 20 } });
    await expect(index).toBeVisible();
    await expect(disclosure).toHaveAttribute('aria-expanded', 'true');

    await index.getByRole('link', { name: /Dockerfile/ }).click();

    await expect(page).toHaveURL(/\/es\/pildoras\/docker\/docker-file\/#pill-reading$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Dockerfile' })).toBeVisible();
    await expect(index).toBeHidden();
    await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
  });

  test('keeps the draft series mascot visible on the catalogue', async ({ page }) => {
    await page.goto(catalogue);

    await expect(page.locator('.is-upcoming + .series-mascot')).toHaveCSS('opacity', '1');
    await expect(page.locator('a.series-card + .series-mascot').first()).toHaveCSS('opacity', '0');
  });
});

test.describe('without JavaScript', () => {
  test.use({ ...phone, javaScriptEnabled: false });

  test('leaves the index open', async ({ page }) => {
    await page.goto(firstPill);

    await expect(page.locator('#pill-index-navigation')).toBeVisible();
    await expect(page.locator('[data-pill-index-disclosure]')).toBeHidden();
  });

  test('moves to another pill through its real link', async ({ page }) => {
    await page.goto(firstPill);

    await page.locator('#pill-index-navigation').getByRole('link', { name: /Dockerfile/ }).click();

    await expect(page).toHaveURL(/\/es\/pildoras\/docker\/docker-file\//);
    await expect(page.getByRole('heading', { level: 1, name: 'Dockerfile' })).toBeVisible();
  });
});

test.describe('moving through the reader', () => {
  test('goes back and forward through the pills it visited', async ({ page }) => {
    await page.goto(firstPill);
    const title = page.getByRole('heading', { level: 1 });

    await page.keyboard.press('ArrowRight');
    await expect(page).not.toHaveURL(/\/docker\/intro\//);
    const secondPillUrl = page.url();
    const secondPillTitle = await title.textContent();

    await page.goBack();
    await expect(page).toHaveURL(/\/docker\/intro\//);
    await expect(title).toHaveText('¿Qué es Docker?');
    await expect(page.locator('.journey a[aria-current]')).toHaveAttribute('href', /\/docker\/intro\//);

    await page.goForward();
    await expect(page).toHaveURL(secondPillUrl);
    await expect(title).toHaveText(secondPillTitle!);
  });

  test('keeps the same pill when switching language', async ({ page }) => {
    await page.goto(firstPill);

    await page.locator('.language-switcher a').first().click();

    await expect(page).toHaveURL(/\/en\/.*\/docker\/intro\//);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('What is Docker?');

    await page.locator('.language-switcher a').first().click();

    await expect(page).toHaveURL(/\/es\/pildoras\/docker\/intro\//);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  });

  test('restores the collapsed index', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('pills.index.collapsed', 'true'));

    await page.goto(firstPill);

    await expect(page.locator('[data-pill-reader]')).toHaveAttribute('data-index-collapsed', '');
  });
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('changes pill with the keyboard', async ({ page }) => {
    await page.goto(firstPill);

    await page.keyboard.press('ArrowRight');

    await expect(page).not.toHaveURL(/\/docker\/intro\//);
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('¿Qué es Docker?');
  });
});

test.describe('on the desktop catalogue', () => {
  test('shows how many pills each series has', async ({ page }) => {
    await page.goto(catalogue);

    await expect(page.locator('a.series-card[href$="/docker/"] .series-count')).toHaveText('6 píldoras');
    await expect(page.locator('.is-upcoming .series-count')).toHaveCount(0);
  });

  test('brings the mascot up onto the hovered card only', async ({ page }) => {
    await page.goto(catalogue);
    const docker = page.locator('a.series-card[href$="/docker/"]');
    const mascot = docker.locator('+ .series-mascot');
    await expect(mascot).toHaveCSS('opacity', '0');

    await docker.hover();

    await expect(mascot).toHaveCSS('opacity', '1');
    await expect(page.locator('a.series-card:not(:hover) + .series-mascot').first()).toHaveCSS('opacity', '0');
  });

  test('explains the arrow keys instead of the swipe', async ({ page }) => {
    await page.goto(firstPill);

    const tip = page.locator('[data-reader-keyboard-tip]');
    await expect(tip).toContainText('Usa las flechas');
    await expect(page.locator('[data-swipe-hint]')).toBeHidden();
    await expect(page.locator('.reading-time-slot')).toBeVisible();
  });

  test('keeps the pill while an image is open and closes it with Escape', async ({ page }) => {
    await page.goto(firstPill);
    const image = page.locator('.chapter-body img').first();

    await image.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-pill-image-zoom]')).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(/\/docker\/intro\/$/);

    await page.keyboard.press('Escape');
    await expect(page.locator('[data-pill-image-zoom]')).toBeHidden();
  });

  test('labels each stop as a pill', async ({ page }) => {
    await page.goto(firstPill);

    await expect(page.locator('.page-meta')).toContainText('Píldora 01');
  });

  test('keeps the side index always open', async ({ page }) => {
    await page.goto(firstPill);

    await expect(page.locator('#pill-index-navigation')).toBeVisible();
    await expect(page.locator('[data-pill-index-disclosure]')).toBeHidden();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('¿Qué es Docker?');
  });
});
