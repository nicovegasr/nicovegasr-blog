import type { Side } from './bubble-placement';

export interface TutorialStep {
  readonly id: string;
  readonly target: string;
  /** Where the bubble goes if there is room: it should not cover what the step talks about. */
  readonly side: Side;
  /** What the player has to touch, when it is not the target itself. */
  readonly alsoHighlight?: string;
  /** Without `until`, the bubble shows a button to continue. */
  readonly until?: 'read' | 'write' | 'run';
}

export const tutorial: readonly TutorialStep[] = [
  { id: 'stage', target: '[data-stage]', side: 'left' },
  { id: 'memory', target: '[data-memory]', side: 'below' },
  { id: 'stars', target: '[data-objectives]', side: 'below' },
  { id: 'read', target: '[data-hole="read"]', side: 'right', alsoHighlight: '[data-group="read"]', until: 'read' },
  { id: 'write', target: '[data-hole="write"]', side: 'right', alsoHighlight: '[data-group="write"]', until: 'write' },
  { id: 'run', target: '[data-run]', side: 'left', until: 'run' },
];
