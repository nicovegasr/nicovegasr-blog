import type { PaymentLab } from './controller';
import type { GuideBeat } from './guide';
import { button } from '../shared/lab-ui';
import { escapeHtml as esc } from '../shared/text';

export function guidePanel(lab: PaymentLab, beat: GuideBeat) {
  let action = '';
  if (beat.target)
    action = button(
      'guide-focus',
      lab.copy.showThisChoice,
    );
  else if (lab.state.phase === 'won')
    action = button(
      'guide-finish',
      lab.copy.keepExperimenting,
    );
  else if (['lost', 'duplicate'].includes(lab.state.phase))
    action = button(
      'lesson',
      lab.copy.changeTheDesign,
    );
  const optional = lab.definition.guideOptionalAction(lab);
  return /* HTML */ `<header class="qs-guide-header">
      <span
        >${lab.copy.guidedWalkthroughLabel}
        <span class="qs-guide-chapter">${beat.chapter}/4</span></span
      ><button
        type="button"
        data-action="guide-close"
        title="${lab.state.phase === 'won' ? lab.copy.leaveAndKeepTheResult : lab.copy.leaveAndRestoreMyPrevious}"
      >
        ${lab.copy.leaveWalkthrough} ×
      </button>
    </header>
    <div class="qs-guide-body">
      <div class="qs-guide-story">
        <h2>${esc(beat.title)}</h2>
        <p>${esc(beat.story)}</p>
      </div>
      <div class="qs-guide-next">
        <span class="qs-eyebrow">${lab.copy.now}</span>
        <p id="qs-guide-task" role="status" aria-live="polite">
          ${esc(beat.task)}
        </p>
        ${action || optional ? /* HTML */ `<div class="qs-guide-actions">${action}${optional}</div>` : ''}
      </div>
    </div>`;
}
