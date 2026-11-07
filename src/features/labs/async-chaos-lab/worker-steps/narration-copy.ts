import { defineCopy } from '@/i18n/copy';

const es = {
  incidentHappenedAtStep: (step: string | number) => `EL INCIDENTE OCURRIÓ EN EL PASO ${step}`,
  noConfirmationArrivedSendMay: (step: string | number) =>
    `«${step}»: no llegó confirmación. El envío pudo ocurrir; el worker no tiene una marca guardada.`,
  didNotCompleteEarlierSteps: (step: string | number) =>
    `«${step}» no terminó. Los pasos anteriores ya produjeron sus resultados.`,
  restartingWorkerSamePayment: 'REINICIANDO EL WORKER · MISMO PAGO',
  returningToStartOfEarlier: (job: string | number) =>
    `Volvemos al inicio de «${job}». Los efectos anteriores siguen existiendo; solo se saltarán los pasos cuyo avance se guardó.`,
  youDuplicatedEffects: 'DUPLICASTE EFECTOS SIN QUERER',
  youChargedTwiceFirstCharge: (job: string | number) =>
    `Cobraste dos veces a «${job}». El primer cobro no se deshizo al caer el worker. Reintentar el pago completo volvió a pasar por Stripe.`,
  producedTwoEffectsForResponse: (step: string | number, job: string | number) =>
    `«${step}» produjo dos efectos para «${job}»: la respuesta se perdió antes de guardar el avance local. Esa marca no evita la repetición tras un timeout. Activa la deduplicación por clave en el proveedor y prueba de nuevo.`,
  producedTwoEffectsForRestarting: (step: string | number, job: string | number) =>
    `«${step}» produjo dos efectos para «${job}». Reiniciar el worker no deshizo el primero.`,
  systemInconsistency: 'INCONSISTENCIAS EN EL SISTEMA',
  youChargedButItsSubscription: (job: string | number) =>
    `Cobraste a «${job}», pero su suscripción sigue sin activar. El worker cayó antes de la activación. Los pasos muestran un cobro y ninguna activación. Reprocesar no debería cobrarle otra vez.`,
  finishedButWorkerCrashedBefore: (previous: string | number, step: string | number, job: string | number) =>
    `«${previous}» terminó, pero el worker cayó antes de «${step}» para «${job}». Tienes un resultado parcial. Lo que ya ocurrió sigue existiendo.`,
  actionMayHaveCompleted: 'La acción pudo completarse.',
  emailRequestTimedOutIt: 'Timeout al enviar. El email pudo llegar, pero no recibimos confirmación.',
  requestForTimedOutFor: (step: string | number, job: string | number) =>
    `La solicitud de «${step}» agotó el tiempo para «${job}». La acción pudo completarse, pero no llegó confirmación y no se guardó el resultado. Reintentar puede duplicarla.`,
  emailServiceMayHaveAccepted:
    'El servicio de correo pudo aceptar el mensaje, pero su respuesta se perdió por timeout. El worker no guardó el avance: reintentar puede duplicar el email; no reintentar puede dejar al cliente sin confirmación.',
  effectHappenedItsMarkerWas: 'Ocurrió el efecto. No se guardó su marca.',
  alreadyProducedItsEffectFor: (step: string | number, job: string | number) =>
    `«${step}» ya produjo su efecto para «${job}». El worker cayó antes de guardarlo. Una marca local no basta si nunca se guardó. Recordar pasos no puede recuperar una marca que nunca se escribió: necesitas consultar o reconocer la operación en el proveedor.`,
  allThreePaymentsComplete: 'LOS TRES PAGOS COMPLETADOS',
  youCompletedPaymentsWithoutDuplicating: (job: string | number, wasted: string | number) =>
    `Completaste los pagos sin duplicar resultados. En «${job}» repetiste ${wasted} pasos ya resueltos, cuando solo faltaba el último. Recordar esos avances es opcional: valora si el coste de repetirlos compensa guardar más estado.`,
  youSkippedPreviouslyResolvedSteps: (skipped: string | number) =>
    `Saltaste ${skipped} pasos ya resueltos. Recuperaste cada pago sin volver a aplicar sus efectos externos en este escenario.`,
  paymentCanStopHalfway: 'Un pago puede quedarse a medias.',
  threePaymentsAreSavedWorker:
    'Los tres pagos están guardados. El worker ejecutará las acciones que has elegido. Mira cuáles pueden repetirse y decide qué avances recordar al reintentar.',
  threePaymentsAreSavedIn:
    'Los tres pagos están guardados en una base de datos. Tu worker debe validar, cobrar, activar la suscripción y avisar al cliente. Decide qué recordar si tiene que volver a empezar.',
  processing: (job: string | number) => `Procesando ${job}`,
  processingPaused: 'Procesamiento pausado',
  followPaymentThroughWorkerSteps:
    'Sigue el pago por los pasos del worker. Validar datos, modificar estado local y llamar a un proveedor tienen consecuencias distintas.',
  paymentIsSavedNowFinish: 'El pago está guardado. Falta terminarlo.',
  paymentsAreAlreadySavedNow:
    'Los pagos ya están guardados. Ahora mira dentro del worker: revisa los datos, cobra, activa la suscripción y manda el email.',
  externalStepsShowTwoProtections:
    'En los pasos externos verás dos protecciones. «Guardar avance al recibir confirmación» permite saltar el paso al reintentar. La deduplicación del proveedor cubre el timeout: puede que el servicio hiciera el envío aunque no recibimos su respuesta.',
  restartingWorkerDoesNotRefund:
    'Que el worker vuelva a empezar no devuelve el dinero al cliente. Así que eso de cobrar otra vez… mejor lo vigilamos, ¿eh?',
  weHaveDuplicateResult: 'Tenemos un resultado duplicado.',
  customerForJustWroteTo: (job: string | number) =>
    `Nos acaba de escribir el cliente de ${job}. Le hemos cobrado dos veces el mismo pago. Necesita saber qué ha ocurrido.`,
  appearsTwiceForNoNew: (step: string | number, job: string | number) =>
    `${step} aparece dos veces para ${job}. No ha entrado otro pago. ¿Puedes revisar qué hemos repetido?`,
  theyPaidAndCannotGet: 'Ha pagado y no puede entrar.',
  customerForJustWroteYou: (job: string | number) =>
    `El cliente de ${job} acaba de escribir: «Me habéis cobrado, pero no puedo entrar». ¿Puedes terminar de activarle la cuenta? Y ojo con volver a cobrarle.`,
  timeoutEmailMayHaveArrived: 'Timeout: el email pudo llegar; no hay confirmación.',
  emailServiceMayHaveAcceptedCall:
    'El servicio de correo pudo aceptar el mensaje, pero su respuesta se perdió por timeout. El worker no guardó el avance: reintentar puede duplicarlo; no reintentar puede dejar al cliente sin confirmación.',
  paymentStoppedHalfway: 'El pago quedó a medias.',
  wasPassedToMeBecause: (job: string | number, step: string | number) =>
    `Me han pasado ${job} porque se ha quedado a medias. Veo resultados de algunas acciones, pero falta confirmar «${step}». ¿Puedes revisar cómo seguir?`,
};

const en = {
  incidentHappenedAtStep: (step: string | number) => `THE INCIDENT HAPPENED AT STEP ${step}`,
  noConfirmationArrivedSendMay: (step: string | number) =>
    `“${step}”: no confirmation arrived. The send may have happened; the worker has no saved marker.`,
  didNotCompleteEarlierSteps: (step: string | number) =>
    `“${step}” did not complete. Earlier steps already produced their results.`,
  restartingWorkerSamePayment: 'RESTARTING THE WORKER · SAME PAYMENT',
  returningToStartOfEarlier: (job: string | number) =>
    `Returning to the start of “${job}”. Earlier effects still exist; only steps with saved progress will be skipped.`,
  youDuplicatedEffects: 'YOU DUPLICATED EFFECTS',
  youChargedTwiceFirstCharge: (job: string | number) =>
    `You charged “${job}” twice. The first charge was not undone when the worker crashed. Retrying the whole payment went through Stripe again.`,
  producedTwoEffectsForResponse: (step: string | number, job: string | number) =>
    `“${step}” produced two effects for “${job}”: the response was lost before local progress was saved. That marker cannot prevent a retry after a timeout. Enable provider deduplication by key and try again.`,
  producedTwoEffectsForRestarting: (step: string | number, job: string | number) =>
    `“${step}” produced two effects for “${job}”. Restarting the worker did not undo the first.`,
  systemInconsistency: 'SYSTEM INCONSISTENCY',
  youChargedButItsSubscription: (job: string | number) =>
    `You charged “${job}”, but its subscription is still inactive. The worker crashed before activation. The steps show one charge and no activation. Reprocessing should not charge again.`,
  finishedButWorkerCrashedBefore: (previous: string | number, step: string | number, job: string | number) =>
    `“${previous}” finished, but the worker crashed before “${step}” for “${job}”. You have a partial result. What already happened still exists.`,
  actionMayHaveCompleted: 'The action may have completed.',
  emailRequestTimedOutIt: 'Email request timed out. It may have arrived, but we got no confirmation.',
  requestForTimedOutFor: (step: string | number, job: string | number) =>
    `The request for “${step}” timed out for “${job}”. The action may have completed, but no confirmation arrived and no result was saved. Retrying can duplicate it.`,
  emailServiceMayHaveAccepted:
    'The email service may have accepted the message, but its response was lost to a timeout. The worker did not save progress: retrying may duplicate the email; not retrying may leave the customer without confirmation.',
  effectHappenedItsMarkerWas: 'The effect happened. Its marker was not saved.',
  alreadyProducedItsEffectFor: (step: string | number, job: string | number) =>
    `“${step}” already produced its effect for “${job}”. The worker crashed before saving it. Remembering steps cannot recover a marker that was never written: you need to query or recognize the operation at the receiver.`,
  allThreePaymentsComplete: 'ALL THREE PAYMENTS COMPLETE',
  youCompletedPaymentsWithoutDuplicating: (job: string | number, wasted: string | number) =>
    `You completed the payments without duplicating results. For “${job}”, you repeated ${wasted} successful steps when only the last one remained. Remembering that progress is optional: weigh the repeated work against storing more state.`,
  youSkippedPreviouslyResolvedSteps: (skipped: string | number) =>
    `You skipped ${skipped} previously resolved steps. You recovered each payment without reapplying its external effects in this scenario.`,
  paymentCanStopHalfway: 'A payment can stop halfway.',
  threePaymentsAreSavedWorker:
    'The three payments are saved. The worker will run the actions you chose. Check which can safely repeat and decide what progress to remember on retry.',
  threePaymentsAreSavedIn:
    'Three payments are saved in a database. Your worker must validate, charge, activate the subscription and notify the customer. Choose what to remember if it has to start again.',
  processing: (job: string | number) => `Processing ${job}`,
  processingPaused: 'Processing paused',
  followPaymentThroughWorkerSteps:
    'Follow the payment through the worker steps. Checking data, changing local state and calling a receiver have different consequences.',
  paymentIsSavedNowFinish: 'The payment is saved. Now finish it.',
  paymentsAreAlreadySavedNow:
    'The payments are already saved. Now look inside the worker: it checks the data, charges, activates the subscription and sends the email.',
  externalStepsShowTwoProtections:
    'External steps show two protections. “Save progress after confirmation” lets the worker skip a step on retry. Provider deduplication covers a timeout: the service may have sent the message even though its reply never arrived.',
  restartingWorkerDoesNotRefund:
    'Restarting the worker does not refund the customer. So charging again… let us keep an eye on that, shall we?',
  weHaveDuplicateResult: 'We have a duplicate result.',
  customerForJustWroteTo: (job: string | number) =>
    `The customer for ${job} just wrote to us. We charged them twice for the same payment. They need to know what happened.`,
  appearsTwiceForNoNew: (step: string | number, job: string | number) =>
    `${step} appears twice for ${job}. No new payment came in. Can you check what we repeated?`,
  theyPaidAndCannotGet: 'They paid and cannot get in.',
  customerForJustWroteYou: (job: string | number) =>
    `The customer for ${job} just wrote: “You charged me, but I cannot get in.” Can you finish activating their account? And watch out for charging them again.`,
  timeoutEmailMayHaveArrived: 'Timeout: the email may have arrived; there is no confirmation.',
  emailServiceMayHaveAcceptedCall:
    'The email service may have accepted the message, but its response was lost to a timeout. The worker saved no progress: retrying may duplicate it; not retrying may leave the customer without confirmation.',
  paymentStoppedHalfway: 'The payment stopped halfway.',
  wasPassedToMeBecause: (job: string | number, step: string | number) =>
    `${job} was passed to me because it stopped halfway. I can see some action results, but “${step}” is still unconfirmed. Can you check how to continue?`,
};

export const workerStepsNarrationCopy = defineCopy({ es, en });
