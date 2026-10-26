import type { Locator, Page } from '@playwright/test';
import type { Locale } from '@/i18n/locale';
import {
  blockSessionStorage, captureForReview, expect, expectFullyInViewport, expectNoHorizontalOverflow,
  labUrl, setSimulationInterval, test, useDarkTheme,
} from '../lab-test';

class ScalingLab {
  readonly game: Locator;
  readonly dialog: Locator;
  readonly earnedAwards: Locator;

  constructor(readonly page: Page) {
    this.game = page.locator('queue-scaling-game');
    this.dialog = this.game.locator('dialog');
    this.earnedAwards = page.locator('[data-earned]');
  }

  async open(locale: Locale = 'es') {
    await this.page.goto(labUrl(locale, 'scaling'));
    await this.page.evaluate(() => document.fonts.ready);
    await expect(this.dialog).toHaveJSProperty('open', true);
  }

  async action(name: string, times = 1) {
    for (let click = 0; click < times; click++) await this.game.locator(`[data-action="${name}"]`).first().click();
  }

  async close() {
    if (!(await this.dialog.evaluate((dialog: HTMLDialogElement) => dialog.open))) return;
    const isOutcome = await this.dialog.evaluate((dialog) => dialog.classList.contains('qs-outcome'));
    await this.action(isOutcome ? 'close' : 'modal-primary');
    await expect(this.dialog).toHaveJSProperty('open', false);
  }

  async expectPhase(phase: string) {
    await expect(this.game).toHaveAttribute('data-phase', phase);
  }

  async playToOutcome() {
    await this.action('play');
    await expect(this.dialog).toHaveJSProperty('open', true, { timeout: 15_000 });
  }

  paymentsAt(location: string) {
    return this.page.locator(`[data-location="${location}"] > button`);
  }

  /** The four workers that win the level: every service at its contract, one extra Stripe slot and request/s. */
  async prepareFourWorkerWin() {
    await this.action('more', 3);
    await this.action('grow:1');
    await this.action('rate-more:1');
  }
}

test.describe('Level 3 · scaling', () => {
  test('starts with one worker, editable resources and no hidden controls', async ({ page }) => {
    const lab = new ScalingLab(page);
    await lab.open();
    await expect(lab.dialog).toContainText('Todo funciona');
    await captureForReview(page, 'scaling-intro');
    await lab.close();
    await lab.expectPhase('ready');

    await page.locator('.qs-achievements summary').click();
    await expect(page.locator('[data-achievement]')).toHaveCount(3);
    await expect(page.locator('[data-achievement].is-unlocked')).toHaveCount(0);
    await page.locator('.qs-achievements summary').click();
    await expect(page.locator('[data-limit], [data-admission], [data-protect], [data-inspector], [data-action^=crash]'), 'no separate admission fields or manual failures').toHaveCount(0);
    await expect(page.locator('.sc-step [data-resource-size]'), 'one concurrency control per step').toHaveCount(4);
    await expect(page.locator('.sc-step [data-rate-limit]'), 'an HTTP quota only on the two HTTP steps').toHaveCount(2);
    expect(await page.locator('.sc-step').first().evaluate((step) => getComputedStyle(step, '::after').content), 'no arrows between steps').toBe('none');
    expect(await page.locator('.sc-queue').evaluate((queue) => getComputedStyle(queue, '::after').content), 'no queue arrow').toBe('none');
  });

  test('pausing and changing speed never move the simulated clock', async ({ page }) => {
    const lab = new ScalingLab(page);
    await lab.open();
    await lab.close();
    await setSimulationInterval(page, 35);
    await lab.action('play');
    await expect(page.locator('[data-time]')).not.toHaveText('0 s');
    await lab.action('play');
    await lab.expectPhase('paused');
    const pausedTime = await page.locator('[data-time]').textContent();
    await lab.action('speed:4');
    await page.waitForTimeout(120);
    await expect(page.locator('[data-time]')).toHaveText(pausedTime!);
  });

  test('from a slow single worker to a four-worker win', async ({ page }) => {
    const lab = new ScalingLab(page);
    await lab.open();
    await lab.close();

    await test.step('one worker completes everything, slowly, and earns nothing', async () => {
      await lab.playToOutcome();
      await expect(lab.dialog).toContainText('144 s');
      await expect(lab.dialog).toContainText('primer intento completado');
      await expect(lab.dialog).not.toContainText('TU INTENTO ANTERIOR');
      await expect(lab.earnedAwards).toHaveCount(0);
      await lab.close();
    });

    await test.step('full Stripe slots make the fourth worker wait locally, before sending', async () => {
      await lab.action('more', 3);
      for (const attempt of [1, 2]) {
        await lab.action('reset');
        await setSimulationInterval(page, 80);
        await lab.action('play');
        await expect(lab.paymentsAt('waiting-1')).toHaveCount(1);
        await lab.action('play');
        await lab.expectPhase('paused');
        await expect(lab.paymentsAt('active-1')).toHaveCount(3);
        await expect(lab.paymentsAt('waiting-1')).toHaveCount(1);
        await captureForReview(page, 'scaling-local-admission-queue');
        await setSimulationInterval(page, 8);
        await lab.playToOutcome();
        await lab.expectPhase('complete');
        await expect(lab.dialog).toContainText('39 s');
        await expect(lab.dialog).toContainText('156 u');
        await expect(lab.earnedAwards, 'an achievement is only awarded once').toHaveCount(attempt === 1 ? 1 : 0);
        await lab.close();
      }
    });

    await test.step('an extra slot still hits the independent HTTP quota', async () => {
      await lab.action('grow:1');
      await lab.playToOutcome();
      await lab.expectPhase('rate-limited');
      await expect(lab.dialog).toContainText('HTTP 429');
      await expect(lab.dialog).toContainText('servicio sigue activo');
      await expect(lab.paymentsAt('active-1')).toHaveCount(3);
      await expect(page.locator('[data-capacity="1"]')).toContainText('3/4');
      await expect(page.locator('[data-job][data-status=rejected]')).toHaveCount(1);
      await expect(lab.dialog).not.toHaveCSS('clip-path', 'none');
      await captureForReview(page, 'scaling-http-429-with-free-slot');
      await lab.close();
    });

    await test.step('buying quota wins the mission', async () => {
      await lab.action('rate-more:1');
      await expect(page.locator('[data-rate-limit="1"]')).toHaveText('4');
      await lab.playToOutcome();
      await lab.expectPhase('complete');
      await expect(lab.dialog).toContainText('MISIÓN SUPERADA');
      await expect(lab.dialog).toContainText('37 s');
      await expect(lab.dialog).toContainText('222 u');
      expect(await lab.earnedAwards.evaluateAll((awards) => awards.map((award) => (award as HTMLElement).dataset.earned))).toEqual(['on-time', 'minimum-team']);
      await captureForReview(page, 'scaling-win');
      await lab.close();
    });

    await test.step('more database slots are faster, and compared with the previous trial', async () => {
      await lab.action('grow:2', 2);
      await lab.playToOutcome();
      await expect(lab.dialog).toContainText('36 s');
      await expect(lab.dialog).toContainText('288 u');
      await expect(lab.dialog).toContainText('TU INTENTO ANTERIOR');
      await expect(lab.dialog).toContainText('37 s');
      await expect(lab.earnedAwards).toHaveCount(0);
      await captureForReview(page, 'scaling-compared-win');
      await lab.close();
    });

    await test.step('every achievement is unlocked in the catalogue', async () => {
      await expectNoHorizontalOverflow(page);
      await page.locator('.qs-achievements summary').click();
      await expect(page.locator('[data-achievement].is-unlocked')).toHaveCount(3);
      await captureForReview(page, 'scaling-achievement-catalogue');
    });
  });

  test('email can wait for slots and, separately, exceed its quota', async ({ page }) => {
    const lab = new ScalingLab(page);
    await lab.open();
    await lab.close();
    await lab.prepareFourWorkerWin();
    await lab.action('grow:2', 2);

    await lab.action('shrink:3', 2);
    await lab.playToOutcome();
    await lab.expectPhase('complete');
    await expect(lab.dialog).toContainText('37 s');
    await lab.close();

    await lab.action('rate-less:3', 3);
    await lab.playToOutcome();
    await lab.expectPhase('rate-limited');
    await expect(lab.dialog).toContainText('HTTP 429');
    await captureForReview(page, 'scaling-email-quota-rejection');
  });

  test('six busy Stripe slots need six workers, capacity and quota, at a cost', async ({ page }) => {
    const lab = new ScalingLab(page);
    await lab.open();
    await lab.close();
    // Six workers, six slots in every service and six requests/s in both HTTP quotas.
    await lab.action('more', 5);
    await lab.action('grow:0', 2);
    await lab.action('grow:1', 3);
    await lab.action('grow:2', 4);
    await lab.action('grow:3', 1);
    await lab.action('rate-more:1', 3);
    await lab.action('rate-more:3', 1);

    await setSimulationInterval(page, 80);
    await lab.action('play');
    await expect(lab.paymentsAt('active-1')).toHaveCount(6);
    await lab.action('play');
    await expect(page.locator('[data-capacity="1"]')).toContainText('6/6');
    await captureForReview(page, 'scaling-six-service-slots');
    await setSimulationInterval(page, 8);
    await lab.playToOutcome();
    await lab.expectPhase('complete');
    await expect(lab.dialog).toContainText('480 u');
    await expect(lab.dialog).not.toContainText('MISIÓN SUPERADA');
  });

  test('compares trials and replays one of them', async ({ page }) => {
    const lab = new ScalingLab(page);
    await lab.open();
    await lab.close();
    await lab.playToOutcome();
    await lab.close();
    await lab.prepareFourWorkerWin();
    await lab.playToOutcome();
    await lab.close();

    await lab.action('compare');
    await expect(lab.dialog.locator('tbody tr')).toHaveCount(2);
    await captureForReview(page, 'scaling-comparison');
    await lab.dialog.locator('[data-action="replay:0"]').click();
    await lab.expectPhase('ready');
    await expect(page.locator('[data-workers]')).toHaveText('1');
  });

  test('custom names are shown as text, never as markup', async ({ page }) => {
    const lab = new ScalingLab(page);
    await lab.open();
    await lab.close();
    const hostile = '<img src=x onerror="window.scalingXss=1">';
    await lab.action('names');
    await lab.dialog.locator('[data-rename="api"]').fill(hostile);
    await lab.dialog.locator('[data-rename="step-1"]').fill('Cobrar mi pedido');
    await lab.dialog.locator('summary').click();
    await lab.dialog.locator('[data-rename="job-0"]').fill('Pedido de Ana');
    await lab.close();

    await expect(page.locator('[data-name=api]')).toHaveText(hostile);
    await lab.action('job:1');
    await expect(page.locator('[data-radio]')).toContainText('Pedido de Ana');
    const injected = await page.evaluate(() =>
      (window as Window & { scalingXss?: number }).scalingXss !== undefined || !!document.querySelector('queue-scaling-game img'));
    expect(injected).toBe(false);

    await lab.open();
    await expect(lab.dialog).toContainText('Todo funciona');
    await lab.close();
    await lab.expectPhase('ready');
    await useDarkTheme(page);
    await captureForReview(page, 'scaling-dark');
  });

  test('achievements persist across reloads and locales', async ({ page }) => {
    const lab = new ScalingLab(page);
    await lab.open();
    await lab.close();
    await lab.prepareFourWorkerWin();
    await lab.playToOutcome();
    await expect(lab.earnedAwards).toHaveCount(2);

    await lab.open('en');
    await expect(lab.dialog).toContainText('Too slowly');
    await expect(page.locator('[data-achievement-summary]')).toContainText('2/3');
    await lab.close();
    await lab.playToOutcome();
    await expect(lab.dialog).toContainText('144 s');
    await expect(lab.earnedAwards).toHaveCount(0);
    await captureForReview(page, 'scaling-english');
  });

  test('keeps working without browser storage', async ({ page }) => {
    await blockSessionStorage(page);
    const lab = new ScalingLab(page);
    await lab.open();
    await lab.close();
    await lab.playToOutcome();
    await lab.expectPhase('complete');
  });

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

    test('fits the screen and shows the 429 ticket', async ({ page }) => {
      const lab = new ScalingLab(page);
      await lab.open();
      await lab.close();
      await expectNoHorizontalOverflow(page);
      await expectFullyInViewport(page.locator('.sc-dock'), 'the transport is visible on a phone');
      await captureForReview(page, 'scaling-mobile');

      await lab.action('more', 3);
      await lab.action('grow:1');
      await lab.playToOutcome();
      await lab.expectPhase('rate-limited');
      await expect(lab.dialog).toContainText('HTTP 429');
      expect(await lab.dialog.evaluate((dialog) => dialog.getBoundingClientRect().width <= innerWidth), 'the ticket fits the screen').toBe(true);
      await captureForReview(page, 'scaling-mobile-incident-ticket');
    });
  });
});
