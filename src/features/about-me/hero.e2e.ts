import { expect, test } from '@playwright/test';
import { buildPagePath } from '@/i18n/routes';
import { LOCALES } from '@/i18n/locale';

const phones = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 413, height: 720 },
  { width: 706, height: 851 },
];
const desktop = { width: 1280, height: 800 };
const badge = '<svg xmlns="http://www.w3.org/2000/svg" width="88" height="20"><rect width="88" height="20"/></svg>';

test.beforeEach(async ({ page }) => {
  await page.route('https://img.shields.io/**', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: badge }),
  );
});

for (const [locale, label] of [['es', 'Ver proyectos'], ['en', 'View projects']] as const) {
  test(`the ${locale} hero links to the projects next to the repository stars`, async ({ page }) => {
    await page.goto(buildPagePath('home', locale));
    const hero = page.locator('.hero');
    const projects = hero.getByRole('link', { name: label });

    await expect(projects).toHaveAttribute('href', 'https://github.com/nicovegasr');
    await expect(projects).toContainText('↗');
    await expect(hero.locator('.repo-star img')).toHaveAttribute('src', /img\.shields\.io\/github\/stars/);
    await expect(hero.locator('.repo-star span')).toHaveCount(0);
  });
}

test('the star badge reacts to the pointer and the keyboard without its prompt', async ({ page }) => {
  await page.goto('/');
  const badge = page.locator('.hero .repo-star img');
  await expect(badge).toHaveCSS('opacity', '1');

  await page.locator('.hero .repo-star').hover();
  await expect(badge).toHaveCSS('opacity', '0.7');

  await page.mouse.move(0, 0);
  await expect(badge).toHaveCSS('opacity', '1');

  await page.locator('.hero .repo-star').focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(badge).toHaveCSS('opacity', '0.7');
});

test('the projects link and the star prompt share the accent underline', async ({ page }) => {
  const accentUnderlines = async (selector: string) => {
    const link = page.locator(selector).first();
    const accent = await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.color = 'var(--color-accent)';
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    });
    await expect(link).toHaveCSS('text-decoration-line', 'underline');
    await expect(link).toHaveCSS('text-decoration-color', accent);
    await expect(link).toHaveCSS('text-decoration-thickness', '2px');
    await expect(link).toHaveCSS('text-underline-offset', '4px');
  };

  await page.goto('/');
  await accentUnderlines('.projects-link');

  await page.goto('/contenido/blog/');
  await accentUnderlines('.repo-star span');
});

test('the content panel keeps asking whether the blog was useful', async ({ page }) => {
  await page.goto('/contenido/blog/');
  await expect(page.locator('.repo-star')).toContainText('¿Te ha servido?');
});

for (const viewport of [...phones, desktop]) {
  test.describe(`hero at ${viewport.width}px`, () => {
    test.use({ viewport });

    for (const locale of LOCALES) {
      test(`the ${locale} hero fits within the screen and keeps every link tappable`, async ({ page }, testInfo) => {
        await page.goto(buildPagePath('home', locale));
        const hero = page.locator('.hero');
        await expect(hero).toHaveClass(/is-visible/);
        await page.evaluate(() => document.fonts.ready);
        await expect(hero).toHaveCSS('transform', 'none');

        if (viewport.width < 768) {
          const portrait = (await hero.locator('.hero-portrait').boundingBox())!;
          const heading = (await hero.locator('.hero-heading').boundingBox())!;
          const role = (await hero.locator('.hero-role').boundingBox())!;
          const intro = (await hero.locator('.hero-intro').boundingBox())!;
          expect(portrait.width).toBeLessThanOrEqual(96);
          expect(portrait.x + portrait.width).toBeLessThanOrEqual(heading.x);
          expect(Math.abs(portrait.y + portrait.height / 2 - heading.y - heading.height / 2)).toBeLessThan(1);
          expect(role.y).toBeGreaterThanOrEqual(Math.max(portrait.y + portrait.height, heading.y + heading.height));
          expect(Math.abs(role.x - portrait.x)).toBeLessThan(1);
          expect(intro.y).toBeGreaterThanOrEqual(role.y + role.height);
          expect(Math.abs(intro.x - portrait.x)).toBeLessThan(1);
        }

        if (viewport.width === 413) {
          const firstTitle = (await page.locator('[data-route]').first()
            .locator('.station.is-current .station-title').boundingBox())!;
          expect(firstTitle.y + firstTitle.height).toBeLessThanOrEqual(viewport.height);
        }

        if (viewport.width < 768) {
          const linksBox = (await hero.locator('.hero-links').boundingBox())!;
          const routeTitle = (await page.locator('[data-route]').first().locator('.route-title').boundingBox())!;
          expect(routeTitle.y - linksBox.y - linksBox.height).toBeGreaterThanOrEqual(16);
        }

        // Solo el hero: a 320px el botón de menú de la cabecera ya se salía antes de este cambio.
        const overflowing = await hero.evaluate((element) => {
          const screenWidth = document.documentElement.clientWidth;
          return [element, ...element.querySelectorAll('*')]
            .filter((node) => node.getBoundingClientRect().right > screenWidth + 0.5)
            .map((node) => `${node.tagName.toLowerCase()}.${[...node.classList].join('.')}`);
        });
        expect(overflowing).toEqual([]);

        const links = hero.locator('.hero-links a, .hero-projects a');
        for (const box of await links.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().toJSON()))) {
          expect(box.height).toBeGreaterThanOrEqual(43.99);
          expect(box.left).toBeGreaterThanOrEqual(0);
          expect(box.right).toBeLessThanOrEqual(viewport.width);
        }

        await testInfo.attach(`hero-${locale}-${viewport.width}.png`, { body: await page.screenshot(), contentType: 'image/png' });
      });
    }
  });
}
