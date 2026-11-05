import { expect, test } from '@playwright/test';

const sections = '[data-content-sections] a';

test('the footer keeps its copyright and usable social links on one row', async ({ page }) => {
  for (const width of [320, 360, 440, 706, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    for (const path of ['/', '/contenido/blog/']) {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      const footer = page.locator('.site-footer');
      const copyright = (await footer.locator('.copyright').boundingBox())!;
      const links = await footer.locator('.social-links a').evaluateAll((items) =>
        items.map((item) => item.getBoundingClientRect().toJSON()),
      );
      expect(links).toHaveLength(4);
      expect(copyright.x + copyright.width).toBeLessThanOrEqual(links[0]!.x);
      for (const link of links) {
        expect(link.width).toBeGreaterThanOrEqual(36);
        expect(link.height).toBeGreaterThanOrEqual(36);
        expect(link.x + link.width).toBeLessThanOrEqual(width);
        expect(Math.abs(link.y + link.height / 2 - copyright.y - copyright.height / 2)).toBeLessThan(1);
      }
    }
  }
});

test('the home is the about page and content is one click away', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-journey]')).toBeVisible();

  await page.locator('.site-header .primary a[href="/contenido/blog/"]').click();

  await expect(page).toHaveURL(/:\d+\/contenido\/blog\/$/);
  await expect(page.locator(`${sections}[aria-current="page"]`)).toHaveAttribute('href', '/contenido/blog/');
});

test('the menu goes straight to each section with its tab selected', async ({ page }) => {
  await page.goto('/');
  const menu = page.locator('.site-header .primary a');
  await expect(menu).toHaveText(['Inicio', 'Blog', 'Píldoras', 'Laboratorios']);

  await menu.filter({ hasText: 'Píldoras' }).click();

  await expect(page).toHaveURL(/:\d+\/contenido\/pildoras\/$/);
  await expect(page.locator('h1')).toHaveText('Píldoras');
  await expect(page.locator('.intro .lead')).toContainText('Conceptos reducidos al mínimo');
  await expect(page.locator('.site-header .primary a.current')).toHaveText('Píldoras');
});

test('each section has its own title and sentence', async ({ page }) => {
  await page.goto('/contenido/blog/');
  await expect(page.locator('h1')).toHaveText('Blog');
  await expect(page.locator('.intro .lead')).toContainText('Lo que escribo');

  await page.goto('/contenido/laboratorios/');
  await expect(page.locator('h1')).toHaveText('Laboratorios');
  await expect(page.locator('.intro .lead')).toContainText('Construye, experimenta');
  await expect(page.getByText('Construye, experimenta')).toHaveCount(1);
});

test('the tabs give way to the menu on desktop and stay under the hamburger', async ({ page }) => {
  await page.goto('/contenido/pildoras/');
  await expect(page.locator(sections).first()).toBeHidden();

  await page.setViewportSize({ width: 900, height: 700 });
  await expect(page.locator(sections).first()).toBeVisible();
});

test('the menu keeps the section marked inside a published pill', async ({ page }) => {
  await page.goto('/pildoras/docker/intro/');

  await expect(page.locator('.site-header .primary a.current')).toHaveText('Píldoras');
});

test('the menu fits beside the logo just above the hamburger layout', async ({ page }) => {
  await page.setViewportSize({ width: 901, height: 700 });
  await page.goto('/');

  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

  expect(overflows).toBe(false);
});

test('the content panel moves between blog, pills and labs', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en/content/pills/');
  await expect(page.locator(sections)).toHaveText(['Blog', 'Pills', 'Labs']);

  await page.locator(sections).first().click();
  await expect(page).toHaveURL(/\/en\/content\/blog\/$/);
  await expect(page.locator(`${sections}[aria-current="page"]`)).toHaveText('Blog');

  await page.locator(sections).last().click();
  await expect(page).toHaveURL(/\/en\/content\/labs\/$/);
  await expect(page.locator(`${sections}[aria-current="page"]`)).toHaveText('Labs');
});

test('the panel fits on a phone without horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('/contenido/laboratorios/');

  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

  expect(overflows).toBe(false);
  await expect(page.locator(sections)).toHaveText(['Blog', 'Píldoras', 'Laboratorios']);
});

test.describe('old addresses', () => {
  for (const [oldPath, newPath] of [
    ['/sobre-mi/', '/'],
    ['/en/about/', '/en/'],
    ['/contenido/', '/contenido/blog/'],
    ['/en/content/', '/en/content/blog/'],
    ['/pildoras/', '/contenido/pildoras/'],
    ['/en/pills/', '/en/content/pills/'],
    ['/articulos/', '/contenido/blog/'],
    ['/en/articles/', '/en/content/blog/'],
    ['/laboratorios/', '/contenido/laboratorios/'],
    ['/en/labs/', '/en/content/labs/'],
  ] as const) {
    test(`${oldPath} redirects to ${newPath}`, async ({ page }) => {
      await page.goto(oldPath);
      await expect(page).toHaveURL(new RegExp(`${newPath}$`));
    });
  }
});
