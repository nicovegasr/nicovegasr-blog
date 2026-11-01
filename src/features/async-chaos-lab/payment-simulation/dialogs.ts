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
        >${lab.t('LLAMADA ENTRANTE', 'INCOMING CALL')}</span
      >${button('dismiss', lab.t('Colgar ×', 'Hang up ×'))}
    </header>
    <div class="qs-call-heading">
      ${labFigure('phone')}
      <div>
        <span class="qs-eyebrow"
          >${lab.t('TU COMPAÑERO DE GUARDIA', 'YOUR ON-CALL TEAMMATE')}</span
        >
        <h2 id="qs-outcome-title">${esc(title)}</h2>
      </div>
    </div>
    <div id="qs-outcome-text" class="qs-phone-conversation">
      ${lines.map((line, i) => /* HTML */ `<p${i === lines.length - 1 ? ' class="qs-phone-aside"' : ''}>${esc(line)}</p>`).join('')}
    </div>
    <div class="qs-outcome-actions">
      ${button(introduction ? 'dismiss' : 'tutorial-start', introduction ? lab.t('Déjame ver el sistema', 'Show me the system') : lab.guide !== 'off' ? lab.t('Continuar el recorrido', 'Continue walkthrough') : lab.t('Vamos a procesarlos', 'Let us process them')).replace('<button ', '<button data-primary ')}${button('walkthrough', lab.t('Prefiero un recorrido guiado', 'I would prefer a guided walkthrough'))}
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
        >${lab.t('LLAMADA DE GUARDIA', 'ON-CALL ALERT')}</span
      >${button('dismiss', lab.t('Ver esquema ×', 'View diagram ×'))}
    </header>
    <div class="qs-call-heading">
      ${labFigure('phone')}
      <div>
        <span class="qs-eyebrow"
          >${lab.t('TU COMPAÑERO DE GUARDIA', 'YOUR ON-CALL TEAMMATE')}</span
        >
        <h2 id="qs-outcome-title">${esc(call.title)}</h2>
      </div>
    </div>
    <p id="qs-outcome-text" class="qs-caller-report">«${esc(call.report)}»</p>
    <div class="qs-call-evidence">${outcomeEvidence(lab)}</div>
    <div class="qs-outcome-actions">
      ${button('play', ack ? lab.t('Volver a procesar el mismo ID', 'Process the same ID again') : lab.t('Reiniciar y reintentar este pago', 'Restart and retry this payment')).replace('<button ', '<button data-primary ')}${button('dismiss', lab.t('Voy a mirar el sistema', 'Let me check the system'))}
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
      ${lost ? lab.t('Sin copia duradera', 'No durable copy') : lab.t('Resultado guardado', 'Result saved')}
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
        ${s.phase === 'lost' ? lab.t(`${m.done} completado · ${m.lost} perdidos al desaparecer la RAM`, `${m.done} completed · ${m.lost} lost when RAM disappeared`) : lab.definition.wonCaption(lab)}
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
          >${lab.t('El mismo pago. Dos resultados.', 'The same payment. Two results.')}</b
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
    title = lab.t(
      `Faltan ${totals(s).lost} pagos por registrar.`,
      `${totals(s).lost} payments will never be recorded.`,
    );
    kicker = 'GAME LOSS / ' + lab.t('PERDISTE LOS DATOS', 'DATA LOST');
  } else if (s.phase === 'duplicate') {
    title = lab.definition.duplicateTitle(lab);
    kicker =
      'GAME LOSS / ' + lab.t('RESULTADO DUPLICADO', 'DUPLICATE RESULT');
  } else if (won) {
    title = lab.t('Los tres, completados.', 'All three, complete.');
    kicker =
      lab.guide !== 'off'
        ? lab.t('RECORRIDO COMPLETADO', 'WALKTHROUGH COMPLETE')
        : lab.t('ENSAYO COMPLETADO', 'TRIAL COMPLETE');
  }
  if (fatal) text = '«' + esc(lab.definition.incidentCall(lab).report) + '»';
  let action = 'dismiss',
    label = lab.t('Revisar mi sistema', 'Review my system');
  if (lab.guide !== 'off' && fatal) {
    action = 'lesson';
    label =
      s.phase === 'lost'
        ? lab.t('Aprender a conservarlos', 'Learn how to retain them')
        : lab.t('Evitar este duplicado', 'Prevent this duplicate');
  }
  if (lab.guide !== 'off' && won) {
    action = 'guide-finish';
    label = lab.t('Seguir experimentando', 'Keep experimenting');
  }
  const awards = lab.notices
    .map((id) => {
      const a = achievements.find((a) => a.id === id)!,
        [name, description] = lab.es ? a.es : a.en;
      return /* HTML */ `<div class="qs-earned">
        <span aria-hidden="true">✦</span>
        <div>
          <span class="qs-award-label"
            >${lab.t('LOGRO DESBLOQUEADO', 'ACHIEVEMENT UNLOCKED')}</span
          ><strong>${esc(name)}</strong>
          <p>${esc(description)}</p>
        </div>
      </div>`;
    })
    .join('');
  return outcomeShell({
  es: lab.es, trial: lab.runId + 1, fatal, kicker, title,
  evidence: outcomeEvidence(lab), text, awards,
  actions: `${button(action, label).replace('<button ', '<button data-primary ')}${won ? lab.definition.wonOptionalAction(lab) : ''}${action !== 'dismiss' ? button('dismiss', lab.t('Revisar el esquema', 'Review diagram')) : ''}`,
});
}
