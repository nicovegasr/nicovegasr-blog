import { labFigure } from './figures';
import { escapeHtml } from './labels';

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
  const t = (es: string, en: string) => scene.es ? es : en;
  return `<div class="qs-outcome-shell">
    <header class="qs-outcome-top"><span>ASYNC CHAOS LAB <span aria-hidden="true">/</span> ${t('Ensayo', 'Trial')} ${String(scene.trial).padStart(2, '0')}</span><button type="button" data-action="${scene.dismissAction ?? 'dismiss'}" aria-label="${t('Cerrar', 'Close')}">×</button></header>
    <div class="qs-outcome-content">
      <p class="qs-outcome-kicker"><span aria-hidden="true">${scene.fatal ? '×' : '✓'}</span>${escapeHtml(scene.kicker)}</p>
      <h2 id="qs-outcome-title">${escapeHtml(scene.title)}</h2>
      <div class="qs-outcome-visual">${scene.evidence}</div>
      ${scene.fatal ? `<p class="qs-fatal-caller">${labFigure('phone')}<span>${t('TU COMPAÑERO DE GUARDIA', 'YOUR ON-CALL TEAMMATE')}</span></p>` : ''}
      <p id="qs-outcome-text">${scene.text}</p>
      <div class="qs-outcome-actions">${scene.actions}</div>
      ${scene.awards ?? ''}
    </div>
  </div>`;
}
