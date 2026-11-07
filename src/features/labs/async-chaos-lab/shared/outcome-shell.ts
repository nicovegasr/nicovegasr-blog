import type { Locale } from '@/i18n/locale';
import { labFigure } from './figures';
import { outcomeCopy } from './outcome-copy';
import { escapeHtml } from './text';

type OutcomeScene = {
  locale: Locale;
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
  const text = outcomeCopy(scene.locale);
  return `<div class="lab-outcome-shell">
    <header class="lab-outcome-top"><span>ASYNC CHAOS LAB <span aria-hidden="true">/</span> ${text.trial} ${String(scene.trial).padStart(2, '0')}</span><button type="button" data-action="${scene.dismissAction ?? 'dismiss'}" aria-label="${text.close}">×</button></header>
    <div class="lab-outcome-content">
      <p class="lab-outcome-kicker"><span aria-hidden="true">${scene.fatal ? '×' : '✓'}</span>${escapeHtml(scene.kicker)}</p>
      <h2 id="lab-outcome-title">${escapeHtml(scene.title)}</h2>
      <div class="lab-outcome-visual">${scene.evidence}</div>
      ${scene.fatal ? `<p class="lab-fatal-caller">${labFigure('phone')}<span>${text.onCallTeammate}</span></p>` : ''}
      <p id="lab-outcome-text">${scene.text}</p>
      <div class="lab-outcome-actions">${scene.actions}</div>
      ${scene.awards ?? ''}
    </div>
  </div>`;
}
