import { captureForReview, expect, expectFullyInViewport, test } from './lab-test';
import { StoriesLab } from './stories-lab';

test.describe('Level 2 · the worker', () => {
  test('shows the step chain, its character stage and the receiver protection', async ({ page }) => {
    const lab = new StoriesLab(page);
    await lab.open('es', 2);

    await expect(lab.game.locator('table')).toHaveCount(0);
    await expect(page.locator('[data-job-row]')).toHaveCount(3);
    await expectFullyInViewport(lab.dock, 'the worker transport is visible');
    const stageReserved = await page.evaluate(() => {
      const stage = document.querySelector('[data-worker-journey]')!.getBoundingClientRect();
      const steps = document.querySelector('[data-steps]')!.getBoundingClientRect();
      const worker = document.querySelector('.qs-worker-interior')!.getBoundingClientRect();
      return stage.bottom <= steps.top && stage.left >= worker.left && stage.right <= worker.right;
    });
    expect(stageReserved, 'the character has a reserved stage above the step controls').toBe(true);
    const providerOutsidePopover = await page.locator('[data-setting=provider-3]').evaluate((input) => input.closest('[popover]') === null);
    expect(providerOutsidePopover, 'receiver protection is visible without opening the step configuration').toBe(true);
    await expect(page.locator('label').filter({ has: page.locator('[data-setting=remember-3]') })).toContainText('Guardar avance al recibir confirmación');
    await captureForReview(page, 'worker-initial');

    const chainHeight = () => page.locator('.qs-worker-interior').evaluate((chain) => chain.getBoundingClientRect().height);
    const heightBefore = await chainHeight();
    await page.locator('button[popovertarget="qs-step-options-3"]:not([popovertargetaction])').click();
    expect(await chainHeight(), 'opening a step configuration does not resize the chain').toBe(heightBefore);
    await captureForReview(page, 'worker-step-editor');
    await lab.stepEditor(3).locator('[popovertargetaction=hide]').click();
  });

  test('the walkthrough protects every effect and finishing keeps the result', async ({ page }) => {
    const lab = new StoriesLab(page);
    await lab.open('es', 2);
    const fullSystemWidth = await lab.systemWidth();

    await test.step('a failed activation leaves a paid customer locked out', async () => {
      await lab.action('guide');
      await expect(lab.dialog).toContainText('Guardar avance al recibir confirmación');
      await lab.action('walkthrough');
      await lab.expectGuideReadable(fullSystemWidth);
      await captureForReview(page, 'worker-guided-map');
      await lab.action('play');
      await lab.untilStop();
      await expect(lab.feedback).toContainText('Cobraste');
      await expect(lab.dialog).toContainText('Ha pagado y no puede entrar');
      await expect(page.locator('[data-step-card="2"]'), 'the interrupted activation is marked as failed').toHaveClass(/is-failed/);
      await expect(page.locator('[data-step-state="2"]')).toContainText('Paso 3 falló');
      await captureForReview(page, 'worker-partial-effect');
      expect(await lab.runToStop()).toBe('duplicate');
    });

    await test.step('local checkpoints cannot cover a lost response', async () => {
      await lab.action('lesson');
      await lab.toggle('remember-1');
      await lab.toggle('remember-3');
      expect(await lab.finish()).toBe('duplicate');
      await expect(lab.feedback).toContainText(/respuesta se perdió antes de guardar el avance local.*deduplicación por clave/);
    });

    await test.step('deduplication at the receiver closes that gap', async () => {
      await lab.action('lesson');
      await expect(page.locator('[data-guide-focus]')).toHaveAttribute('data-setting', 'provider-3');
      await lab.toggle('provider-3');
      expect(await lab.finish()).toBe('won');
      await captureForReview(page, 'worker-safe-but-wasteful');
    });

    await test.step('saving every step skips repeated work', async () => {
      await lab.action('lesson');
      for (const step of [0, 2]) await lab.toggle(`remember-${step}`);
      expect(await lab.finish()).toBe('won');
      await expect(lab.feedback).toContainText('Saltaste 5 pasos');
      await captureForReview(page, 'worker-efficient');
    });

    await test.step('finishing keeps checkpoints and results; leaving a new walkthrough restores them', async () => {
      const result = await lab.progress();
      await lab.action('guide-finish');
      await lab.expectPhase('won');
      for (const remember of await page.locator('[data-setting^=remember]').all()) await expect(remember).toBeChecked();
      await expect(lab.guide).toHaveText('');
      expect(await lab.progress(), 'finishing retains checkpoints and results').toBe(result);

      await lab.action('guide');
      await lab.action('walkthrough');
      await lab.action('guide-close');
      await lab.expectPhase('won');
      expect(await lab.progress(), 'leaving the walkthrough restores the previous trial').toBe(result);
    });
  });

  test('the kind of each step decides what a replay can duplicate', async ({ page }) => {
    const lab = new StoriesLab(page);
    await lab.open('es', 2);

    await test.step('pure checks need no receiver protection', async () => {
      for (const step of [0, 1, 2, 3]) {
        await lab.choose(`kind-${step}`, 'check');
        const stillOpen = await lab.stepEditor(step).evaluate((editor) => editor.matches(':popover-open'));
        expect(stillOpen, 'changing an action keeps its configuration open').toBe(true);
        if (await page.locator(`[data-setting="remember-${step}"]`).isChecked()) await lab.toggle(`remember-${step}`);
      }
      await expect(page.locator('[data-setting^=provider]')).toHaveCount(0);
      await expect(lab.feedback, 'pure actions never narrate a charge').not.toContainText(/cobrar|Stripe/);
      expect(await lab.finish()).toBe('won');
      await expect(page.locator('[data-results]')).toContainText(/0.*efectos externos/);
      await lab.dismiss();
    });

    await test.step('a local append duplicates without any external effect', async () => {
      await lab.choose('kind-1', 'append');
      expect(await lab.finish()).toBe('duplicate');
      await expect(lab.feedback).not.toContainText('Cobraste');
      await captureForReview(page, 'worker-local-duplicate');
      await lab.dismiss();
      await lab.toggle('remember-1');
      expect(await lab.finish()).toBe('won');
      await lab.dismiss();
    });
  });

  test('escapes hostile names everywhere they are shown', async ({ page }) => {
    const lab = new StoriesLab(page);
    await lab.open('es', 2);
    const hostile = '<img src=x onerror="window.storyXss=1">';
    const injected = () => page.evaluate(() =>
      (window as Window & { storyXss?: number }).storyXss !== undefined || !!document.querySelector('queue-stories-game img'));

    await lab.action('personalize');
    for (const label of ['step-1', 'job-0', 'worker']) await lab.rename(label, hostile);
    await lab.action('personalize');
    expect(await injected()).toBe(false);
    await lab.finish();
    expect(await injected(), 'names stay inert in incidents and outcomes').toBe(false);
  });
});
