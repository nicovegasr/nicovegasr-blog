import { achievementCopy } from './achievements';
import type { PaymentLabView } from './lab-view';
import { totals } from './engine';
import { labFigure } from '../shared/figures';
import { button } from '../shared/lab-ui';
import { outcomeShell } from '../shared/outcome-shell';
import { escapeHtml } from '../shared/text';

export function tutorialCall(lab: PaymentLabView, introduction: boolean) {
  const { title, lines } = lab.definition.tutorial(lab);
  return /* HTML */ `<div class="lab-call-shell">
    <header class="lab-call-top">
      <span class="lab-call-channel"><i aria-hidden="true"></i>${lab.copy.incomingCall}</span
      >${button('dismiss', lab.copy.hangUp)}
    </header>
    <div class="lab-call-heading">
      ${labFigure('phone')}
      <div>
        <span class="lab-eyebrow">${lab.copy.yourOnCallTeammate}</span>
        <h2 id="lab-outcome-title">${escapeHtml(title)}</h2>
      </div>
    </div>
    <div id="lab-outcome-text" class="lab-phone-conversation">
      ${lines.map((line, index) => /* HTML */ `<p${index === lines.length - 1 ? ' class="lab-phone-aside"' : ''}>${escapeHtml(line)}</p>`).join('')}
    </div>
    <div class="lab-outcome-actions">
      ${button(introduction ? 'dismiss' : 'tutorial-start', introduction ? lab.copy.showMeTheSystem : lab.guide !== 'off' ? lab.copy.continueWalkthrough : lab.copy.letUsProcessThem).replace('<button ', '<button data-primary ')}${button('walkthrough', lab.copy.preferGuidedWalkthrough)}
    </div>
  </div>`;
}

export function incidentCall(lab: PaymentLabView) {
  const ack = lab.state.incident === 'ack-retry',
    call = lab.definition.incidentCall(lab);
  return /* HTML */ `<div class="lab-call-shell">
    <header class="lab-call-top">
      <span class="lab-call-channel"><i aria-hidden="true"></i>${lab.copy.onCallAlert}</span
      >${button('dismiss', lab.copy.viewDiagram)}
    </header>
    <div class="lab-call-heading">
      ${labFigure('phone')}
      <div>
        <span class="lab-eyebrow">${lab.copy.yourOnCallTeammate}</span>
        <h2 id="lab-outcome-title">${escapeHtml(call.title)}</h2>
      </div>
    </div>
    <p id="lab-outcome-text" class="lab-caller-report">«${escapeHtml(call.report)}»</p>
    <div class="lab-call-evidence">${outcomeEvidence(lab)}</div>
    <div class="lab-outcome-actions">
      ${button('play', ack ? lab.copy.processTheSameIdAgain : lab.copy.restartAndRetryThisPayment).replace('<button ', '<button data-primary ')}${button('dismiss', lab.copy.letMeCheckTheSystem)}
    </div>
  </div>`;
}

function outcomeTicket(lab: PaymentLabView, index: number, lost = false) {
  return /* HTML */ `<article class="lab-ticket ${lost ? 'is-lost' : 'is-kept'}">
    <header><span>ID ${String(index + 1).padStart(2, '0')}</span><span>${lost ? '×' : '✓'}</span></header>
    <strong>${escapeHtml(lab.job(index))}</strong><span class="lab-ticket-lines" aria-hidden="true"></span>
    <footer>${lost ? lab.copy.noDurableCopy : lab.copy.resultSaved}</footer>
  </article>`;
}

function outcomeEvidence(lab: PaymentLabView) {
  const state = lab.state,
    counts = totals(state),
    job = state.jobs[Math.max(0, state.active)]!;
  if (state.phase === 'lost' || state.phase === 'won')
    return /* HTML */ `<div class="lab-ticket-row">
        ${state.jobs.map((job, index) => outcomeTicket(lab, index, job.status === 'lost')).join('')}
      </div>
      <p class="lab-evidence-caption">
        ${state.phase === 'lost' ? lab.copy.completedAndLostWhenRamDisappeared(counts.done, counts.lost) : lab.definition.wonCaption(lab)}
      </p>`;
  if (state.phase === 'duplicate') {
    const [firstFooter, secondFooter] = lab.definition.duplicateFooters(lab);
    return /* HTML */ `<div class="lab-repeat-evidence">
      <article class="lab-ticket is-kept">
        <header><span>ID ${String(job.id).padStart(2, '0')}</span><span>✓</span></header>
        <strong>${escapeHtml(lab.job(job.id - 1))}</strong><span class="lab-ticket-lines" aria-hidden="true"></span>
        <footer>${firstFooter}</footer>
      </article>
      <span class="lab-repeat-symbol" aria-hidden="true">+</span>
      <article class="lab-ticket is-repeated">
        <header><span>ID ${String(job.id).padStart(2, '0')}</span><span>×</span></header>
        <strong>${escapeHtml(lab.job(job.id - 1))}</strong><span class="lab-ticket-lines" aria-hidden="true"></span>
        <footer>${secondFooter}</footer>
      </article>
      <p>${escapeHtml(lab.step(state.step))}<br /><b>${lab.copy.theSamePaymentTwoResults}</b></p>
    </div>`;
  }
  return lab.definition.interruptedEvidence(lab);
}

export const isFatalOutcome = (lab: PaymentLabView) => lab.state.phase === 'lost' || lab.state.phase === 'duplicate';

export function outcomeScene(lab: PaymentLabView) {
  const state = lab.state,
    fatal = isFatalOutcome(lab),
    won = state.phase === 'won';
  let [, text] = lab.definition.feedback(lab),
    title = '',
    kicker = '';
  if (state.phase === 'lost') {
    title = lab.copy.paymentsWillNeverBeRecorded(totals(state).lost);
    kicker = 'GAME LOSS / ' + lab.copy.dataLost;
  } else if (state.phase === 'duplicate') {
    title = lab.definition.duplicateTitle(lab);
    kicker = 'GAME LOSS / ' + lab.copy.duplicateResult;
  } else if (won) {
    title = lab.copy.allThreeComplete;
    kicker = lab.guide !== 'off' ? lab.copy.walkthroughComplete : lab.copy.trialComplete;
  }
  if (fatal) text = '«' + escapeHtml(lab.definition.incidentCall(lab).report) + '»';
  let action = 'dismiss',
    label = lab.copy.reviewMySystem;
  if (lab.guide !== 'off' && fatal) {
    action = 'lesson';
    label = state.phase === 'lost' ? lab.copy.learnHowToRetainThem : lab.copy.preventThisDuplicate;
  }
  if (lab.guide !== 'off' && won) {
    action = 'guide-finish';
    label = lab.copy.keepExperimenting;
  }
  const awards = lab.notices
    .map((id) => {
      const [name, description] = achievementCopy(lab.locale)[id];
      return /* HTML */ `<div class="lab-earned">
        <span aria-hidden="true">✦</span>
        <div>
          <span class="lab-award-label">${lab.copy.achievementUnlockedAward}</span><strong>${escapeHtml(name)}</strong>
          <p>${escapeHtml(description)}</p>
        </div>
      </div>`;
    })
    .join('');
  return outcomeShell({
    locale: lab.locale,
    trial: lab.runId + 1,
    fatal,
    kicker,
    title,
    evidence: outcomeEvidence(lab),
    text,
    awards,
    actions: `${button(action, label).replace('<button ', '<button data-primary ')}${won ? lab.definition.wonOptionalAction(lab) : ''}${action !== 'dismiss' ? button('dismiss', lab.copy.reviewDiagram) : ''}`,
  });
}
