import { button, inLanguage } from '../shared/lab-ui';
import { outcomeShell } from '../shared/outcome-shell';
import { escapeHtml as esc } from '../shared/text';
import type { Names } from './content';
import { PAYMENT_COUNT, scalingMetrics, scalingVerdict, TARGET_COST, TARGET_SECONDS } from './engine';
import type { ScalingConfig, ScalingState } from './engine';
import { number, stepWithMostWaiting, teamLabel } from './format';
import type { Trial } from './session';

export type ResultContext = {
  es: boolean;
  state: ScalingState;
  config: ScalingConfig;
  names: Names;
  history: Trial[];
  awards: string;
};

export function rateLimitScene(
  { es, state, config, names, history }: ResultContext,
  rejection: NonNullable<ScalingState['rateLimit']>,
) {
  const t = (spanish: string, english: string) => inLanguage(es, spanish, english);
  const metrics = scalingMetrics(state),
    step = rejection.step;
  return outcomeShell({
  es: es, trial: history.length, fatal: true,
  kicker: t('ENSAYO DETENIDO / HTTP 429', 'TRIAL STOPPED / HTTP 429'),
  title: t('Había plazas. Se agotó la cuota.', 'Slots were free. The quota ran out.'),
  evidence: `<div class="sc-rate-evidence"><strong>HTTP 429</strong><p>${esc(names.steps[step]!)} · ${esc(names.jobs[rejection.job - 1]!)}</p><p>${t(`${state.requestsInWindow[step]}/${rejection.limit} peticiones aceptadas en esta ventana de 1 s · ${metrics.steps[step]!.active.length}/${config.capacities[step]} plazas en uso`, `${state.requestsInWindow[step]}/${rejection.limit} requests accepted in this 1 s window · ${metrics.steps[step]!.active.length}/${config.capacities[step]} concurrent slots in use`)}</p></div>`,
  text: t(`El proveedor rechazó esta petición por superar su cuota de ${rejection.limit} peticiones por segundo, aunque quedaba una plaza libre. El servicio sigue activo y la petición rechazada no produjo su efecto. Los pagos y los efectos anteriores se conservan. La siguiente ventana empieza en ${number(rejection.retryAfterSeconds, 1)} s simulados, pero este ensayo no reintenta automáticamente. Revisa los workers, las plazas o la cuota antes de otra prueba.`, `The provider rejected this request for exceeding its quota of ${rejection.limit} requests per second, even though a concurrent slot was free. The service is still up and the rejected request produced no effect. Payments and earlier effects are retained. The next window starts in ${number(rejection.retryAfterSeconds, 1)} simulated seconds, but this trial does not retry automatically. Review workers, slots or quota before another trial.`),
  actions: button('close', t('Revisar mi sistema', 'Review my system'), 'data-primary'),
  dismissAction: 'close', awards: '',
});
}

export function trialResult({ es, state, config, names, history, awards }: ResultContext) {
  const t = (spanish: string, english: string) => inLanguage(es, spanish, english);
  const metrics = scalingMetrics(state),
    verdict = scalingVerdict(state);
  const title = verdict.won
    ? t('Ahora sí llegamos a tiempo.', 'Now we are on time.')
    : !verdict.fast
      ? t('Llegaron. Los últimos esperaron demasiado.', 'They arrived. The last ones waited too long.')
      : t('Llegaron. A un coste demasiado alto.', 'They arrived. At too high a cost.');
  const previous = history.slice(0, -1).findLast((trial) => trial.completed === PAYMENT_COUNT);
  const currentResult = `<div><small>${t('ESTE INTENTO', 'THIS TRIAL')} · ${teamLabel(config)}</small><strong>${number(metrics.seconds, 1)} s</strong><span>${number(metrics.throughput, 2)} ${t('pagos/s', 'payments/s')} · ${number(metrics.cost)} u</span></div>`;
  const comparison = previous
    ? `<div class="sc-before-after"><div><small>${t('TU INTENTO ANTERIOR', 'YOUR PREVIOUS TRIAL')} · ${teamLabel(previous.config)}</small><strong>${number(previous.seconds, 1)} s</strong><span>${number(previous.completed / previous.seconds, 2)} ${t('pagos/s', 'payments/s')} · ${number(previous.cost)} u</span></div><span aria-hidden="true">→</span>${currentResult}</div>`
    : `<div class="sc-before-after sc-first-result">${currentResult}</div><p class="sc-first-trial">${t('Es tu primer intento completado. El siguiente se comparará con este resultado.', 'This is your first completed trial. The next one will be compared with this result.')}</p>`;
  const busiestWait = stepWithMostWaiting(state.waitTicks);
  const waitingWhere = busiestWait === null ? '' : t(
    ` Donde más se esperó: ${names.steps[busiestWait]}.`,
    ` Most waiting happened at: ${names.steps[busiestWait]}.`,
  );
  const flags = [
    [verdict.fast, `≤ ${TARGET_SECONDS} s`],
    [verdict.economical, `≤ ${TARGET_COST} u`],
    [verdict.safe, t('Un efecto por paso', 'One effect per step')],
  ] as const;
  return {
    title,
    body: `<p class="sc-result-label">${verdict.won ? t('MISIÓN SUPERADA', 'MISSION COMPLETE') : t('ENSAYO TERMINADO · AJUSTA TU SISTEMA', 'TRIAL COMPLETE · ADJUST YOUR SYSTEM')}</p>${comparison}<div class="sc-checks">${flags.map(([ok, label]) => `<span data-ok="${ok}">${ok ? '✓' : '×'} ${label}</span>`).join('')}</div><p>${t(`${metrics.completed}/24 pagos · ningún efecto duplicado · ${number(metrics.waitingSeconds, 1)} s de espera acumulada.${waitingWhere}`, `${metrics.completed}/24 payments · no duplicate effects · ${number(metrics.waitingSeconds, 1)} s of cumulative waiting.${waitingWhere}`)}</p><p class="sc-call-hint">${verdict.won ? t('Los workers y las plazas de los servicios están equilibrados. Compara tus intentos: ampliar todo también tiene un coste.', 'Workers and service slots are balanced. Compare your trials: expanding everything has a cost too.') : t('Busca dónde se acumula la espera. Sin esperas, cada worker puede llevar más pagos a la vez. Si esperan CPU, hace falta otro worker. Si esperan a un servicio, más workers no lo aceleran: le faltan plazas.', 'Find where waiting builds up. With no waiting, each worker can hold more payments. If they wait for CPU, you need another worker. If they wait for a service, more workers will not speed it up: it needs more slots.')}</p>${awards}`,
    tone: verdict.won ? 'win' : 'review',
  } as const;
}
