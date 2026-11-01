import type { PaymentLab } from '../payment-simulation/controller';
import { isExternal } from '../payment-simulation/engine';
import { escapeHtml as esc } from '../shared/text';
import { workerStepsConfig } from './rules';

export const usesCustomSteps = (lab: PaymentLab) =>
  lab.config.steps.some(
    (step, index) =>
      lab.step(index) !== lab.defaults.steps[index] ||
      step.kind !== workerStepsConfig().steps[index]?.kind,
  );

export function workerStepsFeedback(lab: PaymentLab): [string, string] {
  const state = lab.state,
    job = esc(lab.job(Math.max(state.active, 0))),
    step = esc(lab.step(state.step)),
    previous = esc(lab.step(Math.max(0, state.step - 1)));
  if (lab.retryStage)
    return lab.retryStage === 'failure'
      ? [
          lab.inLocale(`EL INCIDENTE OCURRIÓ EN EL PASO ${state.step + 1}`, `THE INCIDENT HAPPENED AT STEP ${state.step + 1}`),
          state.incident === 'email-uncertain'
            ? lab.inLocale(`«${step}»: no llegó confirmación. El envío pudo ocurrir; el worker no tiene una marca guardada.`, `“${step}”: no confirmation arrived. The send may have happened; the worker has no saved marker.`)
            : lab.inLocale(`«${step}» no terminó. Los pasos anteriores ya produjeron sus resultados.`, `“${step}” did not complete. Earlier steps already produced their results.`),
        ]
      : [
          lab.inLocale('REINICIANDO EL WORKER · MISMO PAGO', 'RESTARTING THE WORKER · SAME PAYMENT'),
          lab.inLocale(`Volvemos al inicio de «${job}». Los efectos anteriores siguen existiendo; solo se saltarán los pasos cuyo avance se guardó.`, `Returning to the start of “${job}”. Earlier effects still exist; only steps with saved progress will be skipped.`),
        ];
  if (state.phase === 'duplicate')
    return [
      lab.inLocale('DUPLICASTE EFECTOS SIN QUERER', 'YOU DUPLICATED EFFECTS'),
      !usesCustomSteps(lab) && state.step === 1
        ? lab.inLocale(
            `Cobraste dos veces a «${job}». El primer cobro no se deshizo al caer el worker. Reintentar el pago completo volvió a pasar por Stripe.`,
            `You charged “${job}” twice. The first charge was not undone when the worker crashed. Retrying the whole payment went through Stripe again.`,
          )
        : isExternal(lab.config.steps[state.step]?.kind ?? 'check') && lab.config.steps[state.step]?.remember
          ? lab.inLocale(
              `«${step}» produjo dos efectos para «${job}»: la respuesta se perdió antes de guardar el avance local. Esa marca no evita la repetición tras un timeout. Activa la deduplicación por clave en el proveedor y prueba de nuevo.`,
              `“${step}” produced two effects for “${job}”: the response was lost before local progress was saved. That marker cannot prevent a retry after a timeout. Enable provider deduplication by key and try again.`,
            )
        : lab.inLocale(
            `«${step}» produjo dos efectos para «${job}». Reiniciar el worker no deshizo el primero.`,
            `“${step}” produced two effects for “${job}”. Restarting the worker did not undo the first.`,
          ),
    ];
  if (state.phase === 'incident') {
    if (state.incident === 'activation-failed')
      return [
        lab.inLocale('INCONSISTENCIAS EN EL SISTEMA', 'SYSTEM INCONSISTENCY'),
        !usesCustomSteps(lab)
          ? lab.inLocale(
              `Cobraste a «${job}», pero su suscripción sigue sin activar. El worker cayó antes de la activación. Los pasos muestran un cobro y ninguna activación. Reprocesar no debería cobrarle otra vez.`,
              `You charged “${job}”, but its subscription is still inactive. The worker crashed before activation. The steps show one charge and no activation. Reprocessing should not charge again.`,
            )
          : lab.inLocale(
              `«${previous}» terminó, pero el worker cayó antes de «${step}» para «${job}». Tienes un resultado parcial. Lo que ya ocurrió sigue existiendo.`,
              `“${previous}” finished, but the worker crashed before “${step}” for “${job}”. You have a partial result. What already happened still exists.`,
            ),
      ];
    if (state.incident === 'email-uncertain')
      return [
        usesCustomSteps(lab)
          ? lab.inLocale('La acción pudo completarse.', 'The action may have completed.')
          : lab.inLocale(
              'Timeout al enviar. El email pudo llegar, pero no recibimos confirmación.',
              'Email request timed out. It may have arrived, but we got no confirmation.',
            ),
        usesCustomSteps(lab)
          ? lab.inLocale(
              `La solicitud de «${step}» agotó el tiempo para «${job}». La acción pudo completarse, pero no llegó confirmación y no se guardó el resultado. Reintentar puede duplicarla.`,
              `The request for “${step}” timed out for “${job}”. The action may have completed, but no confirmation arrived and no result was saved. Retrying can duplicate it.`,
            )
          : lab.inLocale(
              `El servicio de correo pudo aceptar el mensaje, pero su respuesta se perdió por timeout. El worker no guardó el avance: reintentar puede duplicar el email; no reintentar puede dejar al cliente sin confirmación.`,
              `The email service may have accepted the message, but its response was lost to a timeout. The worker did not save progress: retrying may duplicate the email; not retrying may leave the customer without confirmation.`,
            ),
      ];
    return [
      lab.inLocale(
        'Ocurrió el efecto. No se guardó su marca.',
        'The effect happened. Its marker was not saved.',
      ),
      lab.inLocale(
        `«${step}» ya produjo su efecto para «${job}». El worker cayó antes de guardarlo. Una marca local no basta si nunca se guardó. Recordar pasos no puede recuperar una marca que nunca se escribió: necesitas consultar o reconocer la operación en el proveedor.`,
        `“${step}” already produced its effect for “${job}”. The worker crashed before saving it. Remembering steps cannot recover a marker that was never written: you need to query or recognize the operation at the receiver.`,
      ),
    ];
  }
  if (state.phase === 'won') {
    const wasted = state.events.filter(
      // The final retry is necessary when its completion marker was lost.
      (e) => e.job === 3 && e.kind === 'wasted' && e.step < lab.config.steps.length - 1,
    ).length;
    return [
      lab.inLocale('LOS TRES PAGOS COMPLETADOS', 'ALL THREE PAYMENTS COMPLETE'),
      wasted
        ? lab.inLocale(
            `Completaste los pagos sin duplicar resultados. En «${esc(lab.job(2))}» repetiste ${wasted} pasos ya resueltos, cuando solo faltaba el último. Recordar esos avances es opcional: valora si el coste de repetirlos compensa guardar más estado.`,
            `You completed the payments without duplicating results. For “${esc(lab.job(2))}”, you repeated ${wasted} successful steps when only the last one remained. Remembering that progress is optional: weigh the repeated work against storing more state.`,
          )
        : lab.inLocale(
            `Saltaste ${state.skipped} pasos ya resueltos. Recuperaste cada pago sin volver a aplicar sus efectos externos en este escenario.`,
            `You skipped ${state.skipped} previously resolved steps. You recovered each payment without reapplying its external effects in this scenario.`,
          ),
    ];
  }
  if (state.phase === 'ready')
    return [
      lab.inLocale(
        'Un pago puede quedarse a medias.',
        'A payment can stop halfway.',
      ),
      usesCustomSteps(lab)
        ? lab.inLocale(
            'Los tres pagos están guardados. El worker ejecutará las acciones que has elegido. Mira cuáles pueden repetirse y decide qué avances recordar al reintentar.',
            'The three payments are saved. The worker will run the actions you chose. Check which can safely repeat and decide what progress to remember on retry.',
          )
        : lab.inLocale(
            'Los tres pagos están guardados en una base de datos. Tu worker debe validar, cobrar, activar la suscripción y avisar al cliente. Decide qué recordar si tiene que volver a empezar.',
            'Three payments are saved in a database. Your worker must validate, charge, activate the subscription and notify the customer. Choose what to remember if it has to start again.',
          ),
    ];
  return [
    lab.playing
      ? lab.inLocale(
          `Procesando ${lab.job(Math.max(state.active, 0))}`,
          `Processing ${lab.job(Math.max(state.active, 0))}`,
        )
      : lab.inLocale('Procesamiento pausado', 'Processing paused'),
    lab.inLocale(
      'Sigue el pago por los pasos del worker. Validar datos, modificar estado local y llamar a un proveedor tienen consecuencias distintas.',
      'Follow the payment through the worker steps. Checking data, changing local state and calling a receiver have different consequences.',
    ),
  ];
}

export const workerStepsTutorial = (lab: PaymentLab) => ({
  title: lab.inLocale(
    'El pago está guardado. Falta terminarlo.',
    'The payment is saved. Now finish it.',
  ),
  lines: [
    lab.inLocale(
      'Los pagos ya están guardados. Ahora mira dentro del worker: revisa los datos, cobra, activa la suscripción y manda el email.',
      'The payments are already saved. Now look inside the worker: it checks the data, charges, activates the subscription and sends the email.',
    ),
    lab.inLocale(
      'En los pasos externos verás dos protecciones. «Guardar avance al recibir confirmación» permite saltar el paso al reintentar. La deduplicación del proveedor cubre el timeout: puede que el servicio hiciera el envío aunque no recibimos su respuesta.',
      'External steps show two protections. “Save progress after confirmation” lets the worker skip a step on retry. Provider deduplication covers a timeout: the service may have sent the message even though its reply never arrived.',
    ),
    lab.inLocale(
      'Que el worker vuelva a empezar no devuelve el dinero al cliente. Así que eso de cobrar otra vez… mejor lo vigilamos, ¿eh?',
      'Restarting the worker does not refund the customer. So charging again… let us keep an eye on that, shall we?',
    ),
  ],
});

export function workerStepsIncidentCall(lab: PaymentLab): { title: string; report: string } {
  const state = lab.state,
    job = lab.job(Math.max(0, state.active)),
    step = lab.step(state.step);
  if (state.phase === 'duplicate')
    return {
      title: lab.inLocale(
        'Tenemos un resultado duplicado.',
        'We have a duplicate result.',
      ),
      report: !usesCustomSteps(lab) && state.step === 1
        ? lab.inLocale(
            `Nos acaba de escribir el cliente de ${job}. Le hemos cobrado dos veces el mismo pago. Necesita saber qué ha ocurrido.`,
            `The customer for ${job} just wrote to us. We charged them twice for the same payment. They need to know what happened.`,
          )
        : lab.inLocale(
            `${step} aparece dos veces para ${job}. No ha entrado otro pago. ¿Puedes revisar qué hemos repetido?`,
            `${step} appears twice for ${job}. No new payment came in. Can you check what we repeated?`,
          ),
    };
  if (!usesCustomSteps(lab) && state.incident === 'activation-failed')
    return {
      title: lab.inLocale(
        'Ha pagado y no puede entrar.',
        'They paid and cannot get in.',
      ),
      report: lab.inLocale(
        `El cliente de ${job} acaba de escribir: «Me habéis cobrado, pero no puedo entrar». ¿Puedes terminar de activarle la cuenta? Y ojo con volver a cobrarle.`,
        `The customer for ${job} just wrote: “You charged me, but I cannot get in.” Can you finish activating their account? And watch out for charging them again.`,
      ),
    };
  if (!usesCustomSteps(lab) && state.incident === 'email-uncertain')
    return {
      title: lab.inLocale(
        'Timeout: el email pudo llegar; no hay confirmación.',
        'Timeout: the email may have arrived; there is no confirmation.',
      ),
      report: lab.inLocale(
        `El servicio de correo pudo aceptar el mensaje, pero su respuesta se perdió por timeout. El worker no guardó el avance: reintentar puede duplicarlo; no reintentar puede dejar al cliente sin confirmación.`,
        `The email service may have accepted the message, but its response was lost to a timeout. The worker saved no progress: retrying may duplicate it; not retrying may leave the customer without confirmation.`,
      ),
    };
  return {
    title: lab.inLocale('El pago quedó a medias.', 'The payment stopped halfway.'),
    report: lab.inLocale(
      `Me han pasado ${job} porque se ha quedado a medias. Veo resultados de algunas acciones, pero falta confirmar «${step}». ¿Puedes revisar cómo seguir?`,
      `${job} was passed to me because it stopped halfway. I can see some action results, but “${step}” is still unconfirmed. Can you check how to continue?`,
    ),
  };
}
