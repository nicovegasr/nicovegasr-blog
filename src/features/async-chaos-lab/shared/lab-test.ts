import { test as base, expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import type { Locale } from '@/i18n/locale';

export { expect };

export type LabSlug = 'async-chaos-lab' | 'worker-steps' | 'scaling';

export const labUrl = (locale: Locale, slug: LabSlug) =>
  `/${locale}/${locale === 'es' ? 'laboratorios' : 'labs'}/${slug}/`;

// Every lab advances its deterministic engine on a setInterval of at most 650 ms.
// Shortening only those intervals speeds up playback without changing results.
const fastSimulationClock = `{
  const nativeSetInterval = window.setInterval;
  window.setInterval = (callback, milliseconds, ...rest) =>
    nativeSetInterval(callback, milliseconds <= 650 ? (window.simulationIntervalMilliseconds ?? 8) : milliseconds, ...rest);
}`;

const blockedSessionStorage = `Object.defineProperty(window, 'sessionStorage', {
  get() { throw new DOMException('Storage blocked', 'SecurityError'); },
});`;

/**
 * Every lab test fails on uncaught browser errors or on any request that is not
 * a GET for a local static resource: the simulations never call a backend.
 */
export const test = base.extend<{ browserGuards: void }>({
  page: async ({ page }, use) => {
    await page.addInitScript(fastSimulationClock);
    await use(page);
  },
  browserGuards: [
    async ({ page, baseURL }, use) => {
      const uncaughtErrors: string[] = [];
      const backendRequests: string[] = [];
      page.on('pageerror', (error) => uncaughtErrors.push(error.message));
      page.on('request', (request) => {
        const url = new URL(request.url());
        if (!url.protocol.startsWith('http')) return;
        if (url.origin !== new URL(baseURL!).origin || request.method() !== 'GET')
          backendRequests.push(`${request.method()} ${request.url()}`);
      });
      await use();
      expect(uncaughtErrors, 'no uncaught browser errors').toEqual([]);
      expect(backendRequests, 'only local static resources are requested').toEqual([]);
    },
    { auto: true },
  ],
});

export async function setSimulationInterval(page: Page, milliseconds: number) {
  await page.evaluate((value) => {
    (window as Window & { simulationIntervalMilliseconds?: number }).simulationIntervalMilliseconds = value;
  }, milliseconds);
}

export async function blockSessionStorage(page: Page) {
  await page.addInitScript(blockedSessionStorage);
}

export async function captureForReview(page: Page, name: string, fullPage = false) {
  await test.info().attach(name, {
    body: await page.screenshot({ fullPage, animations: 'disabled' }),
    contentType: 'image/png',
  });
}

export async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    'no horizontal page scroll',
  ).toBe(true);
}

export async function expectFullyInViewport(locator: Locator, message: string) {
  expect(
    await locator.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return bounds.top >= 0 && bounds.bottom <= innerHeight;
    }),
    message,
  ).toBe(true);
}

export async function useDarkTheme(page: Page) {
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'dark';
  });
}
