import { describe, expect, it } from 'vitest';
import { scalingNames } from './content';
import { comparisonDialog, costDialog, namesDialog } from './dialogs';
import { createScaling, scalingDefaults } from './engine';
import type { Trial } from './session';

const trial = (overrides: Partial<Trial> = {}): Trial => ({
  config: scalingDefaults(),
  seconds: 30,
  cost: 60,
  completed: 24,
  waitingSeconds: 5,
  rateLimitedStep: null,
  won: false,
  ...overrides,
});

describe('Scaling dialogs', () => {
  it('escapes names typed by the player', () => {
    const names = scalingNames('es');
    const dialog = namesDialog('es', names, () => '"><script>');

    expect(dialog).not.toContain('"><script>');
    expect(dialog).toContain('&quot;&gt;&lt;script&gt;');
  });

  it('offers one field per step and per payment', () => {
    const names = scalingNames('es');
    const dialog = namesDialog('es', names, (key) => key);

    expect(dialog).toContain('data-rename="step-3"');
    expect(dialog).toContain('data-rename="job-23"');
  });

  it('adds up what each worker reserves', () => {
    const dialog = costDialog('en', createScaling(), scalingDefaults());

    expect(dialog).toContain('1 × 0 s = 0 u');
    expect(dialog).toContain('teaching units');
  });

  it('asks to finish a trial before comparing', () => {
    expect(comparisonDialog('en', [])).toContain('Finish a trial');
  });

  it('lists every trial, marking wins and rejected runs', () => {
    const dialog = comparisonDialog('en', [trial({ won: true }), trial({ rateLimitedStep: 1 })]);

    expect(dialog).toContain('data-action="replay:0"');
    expect(dialog).toContain('data-action="replay:1"');
    expect(dialog).toContain('✓');
    expect(dialog).toContain('429 · step 2');
  });
});
