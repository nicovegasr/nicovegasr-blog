import { labFigure } from './figures';
import { escapeHtml } from './text';

type OutcomeScene = {
  es: boolean;
  trial: number;
  fatal: boolean;
  kicker: string;
  title: string;
  evidence: string;
  text: string;
  actions: string;
  awards?: string;
  dismissAction?: string;
};

/** One outcome scene for every level. HTML slots are built by the controllers. */
export function outcomeShell(scene: OutcomeScene): string {
  const translate = (es: string, en: string) => (scene.es ? es : en);
  return `<div class="lab-outcome-shell">
    <header class="lab-outcome-top"><span>ASYNC CHAOS LAB <span aria-hidden="true">/</span> ${translate('Ensayo', 'Trial')} ${String(scene.trial).padStart(2, '0')}</span><button type="button" data-action="${scene.dismissAction ?? 'dismiss'}" aria-label="${translate('Cerrar', 'Close')}">×</button></header>
    <div class="lab-outcome-content">
      <p class="lab-outcome-kicker"><span aria-hidden="true">${scene.fatal ? '×' : '✓'}</span>${escapeHtml(scene.kicker)}</p>
      <h2 id="lab-outcome-title">${escapeHtml(scene.title)}</h2>
      <div class="lab-outcome-visual">${scene.evidence}</div>
      ${scene.fatal ? `<p class="lab-fatal-caller">${labFigure('phone')}<span>${translate('TU COMPAÑERO DE GUARDIA', 'YOUR ON-CALL TEAMMATE')}</span></p>` : ''}
      <p id="lab-outcome-text">${scene.text}</p>
      <div class="lab-outcome-actions">${scene.actions}</div>
      ${scene.awards ?? ''}
    </div>
  </div>`;
}
