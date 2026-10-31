import { expect, test } from '@playwright/test';

const sections = '[data-content-sections] a';

test('the home is the about page and content is one click away', async ({ page }) => {
  await page.goto('/es/');
  await expect(page.locator('[data-journey]')).toBeVisible();

  await page.locator('.site-header .primary a[href="/es/contenido/blog/"]').click();

  await expect(page).toHaveURL(/\/es\/contenido\/blog\/$/);
  await expect(page.locator(`${sections}[aria-current="page"]`)).toHaveAttribute('href', '/es/contenido/blog/');
});

test('the content panel moves between blog, pills and labs', async ({ page }) => {
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
  await page.goto('/es/contenido/laboratorios/');

  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

  expect(overflows).toBe(false);
  await expect(page.locator(sections)).toHaveText(['Blog', 'Píldoras', 'Laboratorios']);
});

test.describe('old addresses', () => {
  for (const [oldPath, newPath] of [
    ['/es/sobre-mi/', '/es/'],
    ['/en/about/', '/en/'],
    ['/es/contenido/', '/es/contenido/blog/'],
    ['/en/content/', '/en/content/blog/'],
    ['/es/pildoras/', '/es/contenido/pildoras/'],
    ['/en/pills/', '/en/content/pills/'],
    ['/es/articulos/', '/es/contenido/blog/'],
    ['/en/articles/', '/en/content/blog/'],
    ['/es/laboratorios/', '/es/contenido/laboratorios/'],
    ['/en/labs/', '/en/content/labs/'],
  ] as const) {
    test(`${oldPath} redirects to ${newPath}`, async ({ page }) => {
      await page.goto(oldPath);
      await expect(page).toHaveURL(new RegExp(`${newPath}$`));
    });
  }
});
