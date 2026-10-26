import type { Locator, Page } from '@playwright/test';
import type { Locale } from '@/i18n/locale';
import { expect, expectFullyInViewport, labUrl } from './lab-test';

type StopPhase = 'incident' | 'won' | 'lost' | 'duplicate';

/** Drives levels 1 and 2 through their real controls, as a player would. */
export class StoriesLab {
  readonly game: Locator;
  readonly dialog: Locator;
  readonly feedback: Locator;
  readonly guide: Locator;
  readonly dock: Locator;

  constructor(readonly page: Page) {
    this.game = page.locator('queue-stories-game');
    this.dialog = this.game.locator('dialog');
    this.feedback = page.locator('[data-feedback]');
    this.guide = page.locator('[data-guide]');
    this.dock = page.locator('.qs-dock');
  }

  /** Every level opens with an on-call introduction that leaves the system editable. */
  async open(locale: Locale, level: 1 | 2) {
    await this.page.goto(labUrl(locale, level === 1 ? 'async-chaos-lab' : 'worker-steps'));
    await this.page.evaluate(() => document.fonts.ready);
    await expect(this.dialog).toHaveJSProperty('open', true);
    await expect(this.dialog).toContainText(/LLAMADA ENTRANTE|INCOMING CALL/);
    await this.action('dismiss');
    await this.expectPhase('ready');
  }

  /** Clicks an action in the open dialog when it offers one, otherwise on the diagram. */
  async action(name: string) {
    const inDialog = this.page.locator(`dialog[open] [data-action="${name}"]`);
    const target = (await inDialog.count()) ? inDialog : this.game.locator(`[data-action="${name}"]`);
    await target.first().click();
  }

  async dismiss() {
    if (await this.dialog.evaluate((dialog: HTMLDialogElement) => dialog.open)) await this.action('dismiss');
  }

  async expectPhase(phase: string) {
    await expect(this.game).toHaveAttribute('data-phase', phase);
  }

  /** Waits for an incident or an outcome once every retry and reveal animation has settled. */
  async untilStop(): Promise<StopPhase> {
    const handle = await this.page.waitForFunction(
      () => {
        const game = document.querySelector<HTMLElement>('queue-stories-game')!;
        const { phase, retryStage, outcomePending } = game.dataset;
        return !retryStage && !outcomePending && ['incident', 'won', 'lost', 'duplicate'].includes(phase!) && phase;
      },
      undefined,
      { timeout: 8_000 },
    );
    return (await handle.jsonValue()) as StopPhase;
  }

  async runToStop() {
    await this.action('play');
    return this.untilStop();
  }

  /** Plays and explicitly retries every incident until the batch ends. */
  async finish() {
    if ((await this.game.getAttribute('data-phase')) !== 'running') await this.action('play');
    for (let retries = 0; retries < 10; retries++) {
      const phase = await this.untilStop();
      if (phase !== 'incident') return phase;
      await this.action('play');
    }
    throw new Error('The batch kept failing after ten retries');
  }

  async choose(setting: string, value: string) {
    const select = this.game.locator(`[data-setting="${setting}"]`);
    const step = setting.startsWith('kind-') ? setting.split('-')[1] : undefined;
    if (step !== undefined && !(await this.stepEditor(step).evaluate((editor) => editor.matches(':popover-open'))))
      await this.page.locator(`button[popovertarget="qs-step-options-${step}"]:not([popovertargetaction])`).click();
    await select.selectOption(value);
    if (step !== undefined)
      await expect(select, 'changing an action keeps keyboard focus on that choice').toBeFocused();
  }

  /** Toggles a checkpoint or provider option, closing any step editor that would cover it. */
  async toggle(setting: string) {
    const openEditor = this.page.locator('.qs-step-editor:popover-open');
    if (await openEditor.count()) await openEditor.locator('[popovertargetaction=hide]').click();
    await this.game.locator(`[data-setting="${setting}"]`).click();
  }

  async rename(label: string, value: string) {
    await this.game.locator(`[data-label="${label}"]`).fill(value);
  }

  stepEditor(step: number | string) {
    return this.page.locator(`[data-step-editor="${step}"]`);
  }

  /** The visible progress: step states plus results. Equal snapshots mean nothing moved. */
  async progress() {
    return (await this.page.locator('[data-steps]').textContent())! + (await this.page.locator('[data-results]').textContent())!;
  }

  /**
   * The walkthrough keeps the full-width diagram, then its explanation. On short
   * screens the lab scrolls to the explanation; neither the site header nor the
   * transport may cover it.
   */
  async expectGuideReadable(fullSystemWidth: number) {
    const layout = await this.page.evaluate(() => {
      const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
      return {
        system: box('.qs-system'),
        guide: box('[data-guide]'),
        dock: box('.qs-dock'),
        siteHeader: box('body > header, header').bottom,
        font: parseFloat(getComputedStyle(document.querySelector('.qs-guide-story p')!).fontSize),
      };
    });
    expect(layout.system.width, 'the walkthrough keeps the diagram full width').toBe(fullSystemWidth);
    expect(layout.guide.top, 'the explanation follows the diagram').toBeGreaterThanOrEqual(layout.system.bottom);
    expect(layout.guide.top, 'the site header does not cover the explanation').toBeGreaterThanOrEqual(layout.siteHeader);
    expect(layout.guide.bottom, 'the transport does not cover the explanation').toBeLessThanOrEqual(layout.dock.top);
    expect(layout.font, 'the explanation stays readable').toBeGreaterThanOrEqual(13);
    await expectFullyInViewport(this.dock, 'the guided transport stays visible');
  }

  async systemWidth() {
    return this.page.locator('.qs-system').evaluate((system) => system.getBoundingClientRect().width);
  }
}
