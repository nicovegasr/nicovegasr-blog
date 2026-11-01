import { achievements } from './achievements';
import type { PaymentLab } from './controller';
import { totals } from './engine';
import { labFigure } from '../shared/figures';
import { button } from '../shared/lab-ui';
import { outcomeShell } from '../shared/outcome-shell';
import { escapeHtml as esc } from '../shared/text';

export function tutorialCall(lab: PaymentLab, introduction: boolean) {
  const { title, lines } = lab.definition.tutorial(lab);
  return /* HTML */ `<div class="qs-call-shell">
    <header class="qs-call-top">
      <span class="qs-call-channel"
        ><i aria-hidden="true"></i
        >${lab.copy.incomingCall}</span
      >${button('dismiss', lab.copy.hangUp)}
    </header>
    <div class="qs-call-heading">
      ${labFigure('phone')}
      <div>
        <span class="qs-eyebrow"
          >${lab.copy.yourOncallteammate}</span
        >
        <h2 id="qs-outcome-title">${esc(title)}</h2>
      </div>
    </div>
    <div id="qs-outcome-text" class="qs-phone-conversation">
      ${lines.map((line, i) => /* HTML */ `<p${i === lines.length - 1 ? ' class="qs-phone-aside"' : ''}>${esc(line)}</p>`).join('')}
    </div>
    <div class="qs-outcome-actions">
      ${button(introduction ? 'dismiss' : 'tutorial-start', introduction ? lab.copy.showMeTheSystem : lab.guide !== 'off' ? lab.copy.continueWalkthrough : lab.copy.letUsProcessThem).replace('<button ', '<button data-primary ')}${button('walkthrough', lab.copy.iWouldPreferAguided)}
    </div>
  </div>`;
}

export function incidentCall(lab: PaymentLab) {
  const ack = lab.state.incident === 'ack-retry',
    call = lab.definition.incidentCall(lab);
  return /* HTML */ `<div class="qs-call-shell">
    <header class="qs-call-top">
      <span class="qs-call-channel"
        ><i aria-hidden="true"></i
        >${lab.copy.onCallalert}</span
      >${button('dismiss', lab.copy.viewDiagram)}
    </header>
    <div class="qs-call-heading">
      ${labFigure('phone')}
      <div>
        <span class="qs-eyebrow"
          >${lab.copy.yourOncallteammate}</span
        >
        <h2 id="qs-outcome-title">${esc(call.title)}</h2>
      </div>
    </div>
    <p id="qs-outcome-text" class="qs-caller-report">«${esc(call.report)}»</p>
    <div class="qs-call-evidence">${outcomeEvidence(lab)}</div>
    <div class="qs-outcome-actions">
      ${button('play', ack ? lab.copy.processTheSameIdagain : lab.copy.restartAndRetryThisPayment).replace('<button ', '<button data-primary ')}${button('dismiss', lab.copy.letMeCheckTheSystem)}
    </div>
  </div>`;
}

function outcomeTicket(lab: PaymentLab, i: number, lost = false) {
  return /* HTML */ `<article
    class="qs-ticket ${lost ? 'is-lost' : 'is-kept'}"
  >
    <header>
      <span>ID ${String(i + 1).padStart(2, '0')}</span
      ><span>${lost ? '×' : '✓'}</span>
    </header>
    <strong>${esc(lab.job(i))}</strong
    ><span class="qs-ticket-lines" aria-hidden="true"></span>
    <footer>
      ${lost ? lab.copy.noDurableCopy : lab.copy.resultSaved}
    </footer>
  </article>`;
}

function outcomeEvidence(lab: PaymentLab) {
  const s = lab.state,
    m = totals(s),
    j = s.jobs[Math.max(0, s.active)]!;
  if (s.phase === 'lost' || s.phase === 'won')
    return /* HTML */ `<div class="qs-ticket-row">
        ${s.jobs.map((job, i) => outcomeTicket(lab, i, job.status === 'lost')).join('')}
      </div>
      <p class="qs-evidence-caption">
        ${s.phase === 'lost' ? lab.copy.completedLostWhenRamdisappeared(m.done, m.lost) : lab.definition.wonCaption(lab)}
      </p>`;
  if (s.phase === 'duplicate') {
    const [firstFooter, secondFooter] = lab.definition.duplicateFooters(lab);
    return /* HTML */ `<div class="qs-repeat-evidence">
      <article class="qs-ticket is-kept">
        <header>
          <span>ID ${String(j.id).padStart(2, '0')}</span><span>✓</span>
        </header>
        <strong>${esc(lab.job(j.id - 1))}</strong
        ><span class="qs-ticket-lines" aria-hidden="true"></span>
        <footer>
          ${firstFooter}
        </footer>
      </article>
      <span class="qs-repeat-symbol" aria-hidden="true">+</span>
      <article class="qs-ticket is-repeated">
        <header>
          <span>ID ${String(j.id).padStart(2, '0')}</span><span>×</span>
        </header>
        <strong>${esc(lab.job(j.id - 1))}</strong
        ><span class="qs-ticket-lines" aria-hidden="true"></span>
        <footer>
          ${secondFooter}
        </footer>
      </article>
      <p>
        ${esc(lab.step(s.step))}<br /><b
          >${lab.copy.theSamePaymentTwoResults}</b
        >
      </p>
    </div>`;
  }
  return lab.definition.interruptedEvidence(lab);
}

export const isFatalOutcome = (lab: PaymentLab) =>
  lab.state.phase === 'lost' || lab.state.phase === 'duplicate';

export function outcomeScene(lab: PaymentLab) {
  const s = lab.state,
    fatal = isFatalOutcome(lab),
    won = s.phase === 'won';
  let [, text] = lab.definition.feedback(lab),
    title = '',
    kicker = '';
  if (s.phase === 'lost') {
    title = lab.copy.paymentsWillNeverBeRecorded(totals(s).lost);
    kicker = 'GAME LOSS / ' + lab.copy.dataLost;
  } else if (s.phase === 'duplicate') {
    title = lab.definition.duplicateTitle(lab);
    kicker =
      'GAME LOSS / ' + lab.copy.duplicateResult;
  } else if (won) {
    title = lab.copy.allThreeComplete;
    kicker =
      lab.guide !== 'off'
        ? lab.copy.walkthroughComplete
        : lab.copy.trialComplete;
  }
  if (fatal) text = '«' + esc(lab.definition.incidentCall(lab).report) + '»';
  let action = 'dismiss',
    label = lab.copy.reviewMySystem;
  if (lab.guide !== 'off' && fatal) {
    action = 'lesson';
    label =
      s.phase === 'lost'
        ? lab.copy.learnHowToRetainThem
        : lab.copy.preventThisDuplicate;
  }
  if (lab.guide !== 'off' && won) {
    action = 'guide-finish';
    label = lab.copy.keepExperimenting;
  }
  const awards = lab.notices
    .map((id) => {
      const a = achievements.find((a) => a.id === id)!,
        [name, description] = lab.es ? a.es : a.en;
      return /* HTML */ `<div class="qs-earned">
        <span aria-hidden="true">✦</span>
        <div>
          <span class="qs-award-label"
            >${lab.copy.achievementUnlocked2}</span
          ><strong>${esc(name)}</strong>
          <p>${esc(description)}</p>
        </div>
      </div>`;
    })
    .join('');
  return outcomeShell({
  es: lab.es, trial: lab.runId + 1, fatal, kicker, title,
  evidence: outcomeEvidence(lab), text, awards,
  actions: `${button(action, label).replace('<button ', '<button data-primary ')}${won ? lab.definition.wonOptionalAction(lab) : ''}${action !== 'dismiss' ? button('dismiss', lab.copy.reviewDiagram) : ''}`,
});
}
