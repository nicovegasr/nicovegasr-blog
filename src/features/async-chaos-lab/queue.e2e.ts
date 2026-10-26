import {
  blockSessionStorage, captureForReview, expect, expectFullyInViewport, expectNoHorizontalOverflow,
  setSimulationInterval, test, useDarkTheme,
} from './lab-test';
import { StoriesLab } from './stories-lab';

test.describe('Level 1 · the queue', () => {
  test('starts in RAM with three plain steps and a compact diagram', async ({ page }) => {
    const lab = new StoriesLab(page);
    await lab.open('es', 1);
    await page.evaluate(() => sessionStorage.setItem('queue-story-names-es', JSON.stringify({ storage: 'Base de datos' })));
    await lab.open('es', 1);

    await expect(page.locator('[data-display-label=storage]'), 'a saved default name follows the current RAM configuration').toHaveText('Memoria RAM');
    await expect(page.locator('[data-action=step]')).toHaveCount(0);
    await expect(page.locator('[data-setting=count]')).toHaveCount(0);
    const steps = page.locator('[data-step-card]');
    await expect(steps).toHaveCount(3);
    await expect(steps.nth(0)).toContainText('Repetirlo es seguro');
    await expect(steps.nth(0)).not.toContainText(/puede duplicarse|efecto externo/);
    await expect(steps.nth(1)).toContainText('1 registro por ID');
    await expect(page.locator('[data-label=worker]')).toHaveCSS('display', 'none');
    await expect(lab.game.locator('table')).toHaveCount(0);
    await expect(page.locator('[data-job-row]')).toHaveCount(3);
    for (const removed of ['.qs-reference', '.qs-footer-actions', '[data-setting=gap]'])
      await expect(page.locator(removed)).toHaveCount(0);

    await expectFullyInViewport(lab.dock, 'the transport is visible from the start');
    await expect(lab.dock.locator('[data-action=personalize]')).toHaveCount(0);
    const namesAboveApi = await page.evaluate(() =>
      document.querySelector('[data-action=personalize]')!.getBoundingClientRect().bottom <=
      document.querySelector('.qs-api')!.getBoundingClientRect().top);
    expect(namesAboveApi, 'names sit above the API').toBe(true);
    const diagramFits = await page.evaluate(() => document.querySelector('.qs-diagram')!.getBoundingClientRect().bottom <= innerHeight);
    expect(diagramFits, 'the core diagram fits a desktop screen').toBe(true);
    await captureForReview(page, 'queue-initial');
  });

  test('pausing freezes the trial, also while the call is reopened', async ({ page }) => {
    const lab = new StoriesLab(page);
    await lab.open('es', 1);
    await setSimulationInterval(page, 650);
    await lab.action('play');
    await lab.action('play');

    await expect(lab.game.locator('[data-action=play]')).toContainText('Continuar');
    await expect(page.locator('[data-step-state]').first()).toContainText('ID 01');
    await expect(page.locator('.qs-job.is-working'), 'the current payment is highlighted').not.toHaveCount(0);
    await expect(page.locator('.qs-step.is-active')).not.toHaveCount(0);
    await expect(page.locator('.qs-active-job.is-executing')).not.toHaveCount(0);
    await captureForReview(page, 'queue-executing');

    const paused = await lab.progress();
    await page.waitForTimeout(700);
    expect(await lab.progress(), 'pause freezes transitions').toBe(paused);
    await lab.action('guide');
    await expect(lab.dialog).toContainText('LLAMADA ENTRANTE');
    await lab.action('dismiss');
    expect(await lab.progress(), 'the introductory call preserves the paused trial').toBe(paused);
  });

  test('a free run in RAM loses payments and unlocks the brave achievement', async ({ page }) => {
    const lab = new StoriesLab(page);
    await lab.open('es', 1);
    expect(await lab.runToStop()).toBe('lost');
    await expect(lab.dialog).toContainText('Quien tiene miedo');
    expect(await page.evaluate(() => sessionStorage.getItem('queue-story-achievements'))).toContain('brave');
  });

  test('the walkthrough goes from RAM loss to a protected database and keeps the result', async ({ page }) => {
    const lab = new StoriesLab(page);
    await lab.open('es', 1);
    const fullSystemWidth = await lab.systemWidth();

    await test.step('the call introduces the two risks', async () => {
      await lab.action('guide');
      await expect(lab.dialog).toHaveAttribute('data-tone', 'story');
      await expect(lab.dialog).toContainText('Dónde esperan');
      await expect(lab.dialog).toContainText('pagarnos dos veces');
      await captureForReview(page, 'tutorial-call');
      await lab.action('walkthrough');
      await lab.choose('protect', 'on');
      await expect(lab.guide, 'ID protection alone does not make RAM durable').not.toContainText('La base de datos conserva');
      await lab.choose('protect', 'off');
      await expect(page.locator('dialog[open]'), 'no second introduction').toHaveCount(0);
      await expect(page.locator('[data-guide-focus]'), 'the first step asks to run, not to change a setting').toHaveCount(0);
      await lab.expectGuideReadable(fullSystemWidth);
      await captureForReview(page, 'queue-guided-map');
    });

    await test.step('RAM loses both unfinished payments', async () => {
      await lab.action('play');
      expect(await lab.untilStop()).toBe('lost');
      await expect(lab.feedback).toContainText('PERDISTE LOS DATOS');
      await expect(lab.dialog).toContainText('GAME LOSS');
      await expect(lab.dialog).toContainText('TU COMPAÑERO DE GUARDIA');
      await expect(page.locator('.qs-array .qs-job.is-lost')).toHaveCount(2);
      await expect(page.locator('#qs-outcome-text'), 'the caller reports a customer problem, not the diagnosis').not.toContainText(/RAM|worker|persist/);
      await captureForReview(page, 'queue-ram-loss');
    });

    await test.step('a database keeps pending work through the crash', async () => {
      await lab.action('lesson');
      await lab.expectGuideReadable(fullSystemWidth);
      await expect(page.locator('[data-guide-focus]')).toHaveAttribute('data-setting', 'storage');
      await lab.action('guide-focus');
      await expect(page.locator('[data-setting=storage]')).toBeFocused();
      await lab.choose('storage', 'db');
      await lab.expectGuideReadable(fullSystemWidth);
      expect(await lab.runToStop()).toBe('incident');
      await expect(lab.feedback).toContainText('conserva el trabajo pendiente');
      await expect(lab.dialog).toContainText(/cliente sigue esperando/i);
      const alertWidth = await lab.dialog.evaluate((dialog) => dialog.getBoundingClientRect().width < innerWidth * 0.8);
      expect(alertWidth, 'the recovery alert stays over the diagram').toBe(true);
      await captureForReview(page, 'queue-worker-call');
    });

    await test.step('a lost confirmation redelivers payment #3 and duplicates its record', async () => {
      await lab.runToStop();
      await expect(lab.feedback).toContainText('confirmación');
      expect(await lab.runToStop()).toBe('duplicate');
      await expect(page.locator('[data-job-status]').nth(2)).toContainText('DUPLICADO');
      await expect(page.locator('.qs-step.is-active'), 'a failed run is not still processing').toHaveCount(0);
    });

    await test.step('checking the ID wins and finishing keeps the working system', async () => {
      await lab.action('lesson');
      await lab.expectGuideReadable(fullSystemWidth);
      await lab.choose('protect', 'on');
      await lab.expectGuideReadable(fullSystemWidth);
      await captureForReview(page, 'queue-guided-id');
      expect(await lab.finish()).toBe('won');
      await expect(page.locator('[data-results]')).toContainText(/0.*registros de más/);
      await captureForReview(page, 'queue-won');
      const result = await lab.progress();
      await lab.action('guide-finish');
      await lab.expectPhase('won');
      await expect(lab.dialog).toHaveJSProperty('open', false);
      await expect(lab.guide).toHaveText('');
      await expect(page.locator('[data-setting=storage]')).toHaveValue('db');
      await expect(page.locator('[data-setting=protect]')).toHaveValue('on');
      expect(await lab.progress(), 'finishing retains completed jobs and records').toBe(result);
      await captureForReview(page, 'queue-guide-finished');
    });

    await test.step('restarting from the call keeps the chosen protections', async () => {
      await lab.action('guide');
      await lab.action('tutorial-start');
      expect(await lab.untilStop()).toBe('incident');
      await expect(page.locator('[data-setting=storage]')).toHaveValue('db');
      await expect(page.locator('[data-setting=protect]')).toHaveValue('on');
      expect(await lab.finish()).toBe('won');
    });
  });

  test('custom names follow the player into level 2', async ({ page }) => {
    const lab = new StoriesLab(page);
    await lab.open('es', 1);
    await lab.choose('storage', 'db');
    await lab.choose('protect', 'on');
    await lab.action('personalize');
    await lab.rename('job-0', 'Informe diario');
    await lab.rename('worker', 'Mi procesador');
    await lab.action('personalize');
    expect(await lab.finish()).toBe('won');
    await expect(page.locator('[data-step-card]')).toHaveCount(3);

    await lab.open('es', 2);
    await expect(page.locator('[data-label=job-0]')).toHaveValue('Informe diario');
  });

  test('keeps working without browser storage', async ({ page }) => {
    await blockSessionStorage(page);
    const lab = new StoriesLab(page);
    await lab.open('es', 1);
    expect(await lab.runToStop()).toBe('lost');
  });

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('skips the loss animation and lets the keyboard close the outcome', async ({ page }) => {
      const lab = new StoriesLab(page);
      await lab.open('es', 1);
      await lab.runToStop();
      await expect(page.locator('.qs-ticket.is-lost').first()).toHaveCSS('animation-name', 'none');
      expect(await page.evaluate(() => !!document.activeElement?.closest('dialog[open]')), 'the outcome owns keyboard focus').toBe(true);
      await page.keyboard.press('Escape');
      await expect(lab.dialog).toHaveJSProperty('open', false);
    });
  });
});

test.describe('Levels 1 and 2 · presentation', () => {
  for (const level of [1, 2] as const) {
    test(`level ${level} reads in English with the dark theme`, async ({ page }) => {
      const lab = new StoriesLab(page);
      await lab.open('en', level);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await useDarkTheme(page);
      await captureForReview(page, `level-${level}-english-dark`);
    });
  }

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

    for (const level of [1, 2] as const) {
      test(`level ${level} keeps the transport and explanations reachable`, async ({ page }) => {
        const lab = new StoriesLab(page);
        await lab.open('es', level);
        await expectNoHorizontalOverflow(page);
        await captureForReview(page, `level-${level}-mobile`);
        await expectFullyInViewport(lab.dock, 'the transport is visible on a phone');
        await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
        await expectFullyInViewport(lab.dock, 'the transport follows scrolling');

        await lab.runToStop();
        const dialogFits = await lab.dialog.evaluate((dialog) => dialog.getBoundingClientRect().width <= innerWidth);
        expect(dialogFits, 'the incident fits the screen').toBe(true);
        await captureForReview(page, `level-${level}-mobile-incident`);
        await lab.dismiss();

        await lab.action('guide');
        await lab.action('walkthrough');
        await captureForReview(page, `level-${level}-mobile-guided`, true);
        await lab.action('guide');
        const guideReadable = await page.evaluate(() => {
          const guide = document.querySelector('[data-guide]')!.getBoundingClientRect();
          const dock = document.querySelector('.qs-dock')!.getBoundingClientRect();
          return guide.top >= 0 && guide.bottom <= dock.top;
        });
        expect(guideReadable, 'the current step is readable without the transport covering it').toBe(true);

        if (level === 1) {
          await lab.runToStop();
          await lab.action('lesson');
          await lab.action('guide-focus');
          await expect(page.locator('[data-setting=storage]')).toBeFocused();
        }
      });
    }
  });
});
