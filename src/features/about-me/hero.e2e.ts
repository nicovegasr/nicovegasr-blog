import { expect, test } from '@playwright/test';

const phones = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
];
const desktop = { width: 1280, height: 800 };

for (const [locale, label] of [['es', 'Ver proyectos'], ['en', 'View projects']] as const) {
  test(`the ${locale} hero links to the projects next to the repository stars`, async ({ page }) => {
    await page.goto(`/${locale}/`);
    const hero = page.locator('.hero');
    const projects = hero.getByRole('link', { name: label });

    await expect(projects).toHaveAttribute('href', 'https://github.com/nicovegasr');
    await expect(projects).toContainText('↗');
    await expect(hero.locator('.repo-star img')).toHaveAttribute('src', /img\.shields\.io\/github\/stars/);
    await expect(hero.locator('.repo-star span')).toHaveCount(0);
  });
}

test('the content panel keeps asking whether the blog was useful', async ({ page }) => {
  await page.goto('/es/contenido/blog/');
  await expect(page.locator('.repo-star')).toContainText('¿Te ha servido?');
});

for (const viewport of [...phones, desktop]) {
  test.describe(`hero at ${viewport.width}px`, () => {
    test.use({ viewport });

    test('fits without horizontal scrolling and keeps every link tappable', async ({ page }, testInfo) => {
      await page.goto('/es/');
      const hero = page.locator('.hero');
      await expect(hero).toHaveClass(/is-visible/);

      // Si la página se desborda, el mensaje dice qué elementos (los más profundos) rebasan la pantalla.
      const overflow = await page.evaluate(() => {
        const screenWidth = document.documentElement.clientWidth;
        const sticksOut = (element: Element) => element.getBoundingClientRect().right > screenWidth + 0.5;
        return {
          overflows: document.documentElement.scrollWidth > window.innerWidth,
          culprits: [...document.querySelectorAll('body *')]
            .filter((element) => sticksOut(element) && ![...element.children].some(sticksOut))
            .map((element) => `${element.tagName.toLowerCase()}.${[...element.classList].join('.')} → ${Math.round(element.getBoundingClientRect().right)}px`),
        };
      });
      expect(overflow.overflows, overflow.culprits.join(', ')).toBe(false);

      const links = hero.locator('.hero-links a');
      for (const box of await links.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().toJSON()))) {
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(viewport.width);
      }

      await testInfo.attach(`hero-${viewport.width}.png`, { body: await page.screenshot(), contentType: 'image/png' });
    });
  });
}
