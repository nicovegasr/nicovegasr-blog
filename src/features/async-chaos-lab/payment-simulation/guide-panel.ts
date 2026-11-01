import type { PaymentLab } from './controller';
import type { GuideBeat } from './guide';
import { button } from '../shared/lab-ui';
import { escapeHtml as esc } from '../shared/text';

export function guidePanel(lab: PaymentLab, beat: GuideBeat) {
  let action = '';
  if (beat.target)
    action = button(
      'guide-focus',
      lab.t('Ver esta decisión ↑', 'Show this choice ↑'),
    );
  else if (lab.state.phase === 'won')
    action = button(
      'guide-finish',
      lab.t('Seguir experimentando', 'Keep experimenting'),
    );
  else if (['lost', 'duplicate'].includes(lab.state.phase))
    action = button(
      'lesson',
      lab.t('Cambiar el diseño', 'Change the design'),
    );
  const optional = lab.definition.guideOptionalAction(lab);
  return /* HTML */ `<header class="qs-guide-header">
      <span
        >${lab.t('RECORRIDO GUIADO', 'GUIDED WALKTHROUGH')}
        <span class="qs-guide-chapter">${beat.chapter}/4</span></span
      ><button
        type="button"
        data-action="guide-close"
        title="${lab.state.phase === 'won' ? lab.t('Salir y conservar el resultado', 'Leave and keep the result') : lab.t('Salir y recuperar mi ensayo anterior', 'Leave and restore my previous trial')}"
      >
        ${lab.t('Salir del recorrido', 'Leave walkthrough')} ×
      </button>
    </header>
    <div class="qs-guide-body">
      <div class="qs-guide-story">
        <h2>${esc(beat.title)}</h2>
        <p>${esc(beat.story)}</p>
      </div>
      <div class="qs-guide-next">
        <span class="qs-eyebrow">${lab.t('AHORA', 'NOW')}</span>
        <p id="qs-guide-task" role="status" aria-live="polite">
          ${esc(beat.task)}
        </p>
        ${action || optional ? /* HTML */ `<div class="qs-guide-actions">${action}${optional}</div>` : ''}
      </div>
    </div>`;
}
