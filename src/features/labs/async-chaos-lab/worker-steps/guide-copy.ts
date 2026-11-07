import { defineCopy } from '@/i18n/copy';

const es = {
  allThreePaymentsFinished: 'Los tres pagos terminaron.',
  providerRecognizedSameIdAnd:
    'El proveedor reconoció el mismo ID y evitó volver a enviar el email. Guardar avances locales no bastaba para esa caída.',
  chargeWasNotDuplicatedSome:
    'El cobro no se duplicó. Algunas acciones seguras se repitieron: puedes comparar si compensa guardar también su avance.',
  workerResumedPendingWorkAnd: 'El worker retomó lo pendiente y saltó las acciones que ya tenía guardadas.',
  finishWalkthroughAndKeepThis: 'Puedes terminar el recorrido y conservar esta configuración.',
  timeoutEmailMayHaveArrived: 'Timeout: el email pudo llegar; no recibimos confirmación.',
  chargedStillInactive: 'Cobrado. Todavía sin activar.',
  pressReprocessPaymentAndWatch: 'Pulsa «Reprocesar pago» y observa qué se ejecuta otra vez.',
  timeoutLeavesDeliveryUncertain: 'El timeout deja el envío en duda.',
  requestTimedOutServiceMay: (lastStep: string | number) =>
    `La solicitud de «${lastStep}» agotó el tiempo de espera. El servicio pudo enviar el email, pero su respuesta no llegó al worker y no se guardó la marca. Reintentar sin deduplicación puede duplicarlo.`,
  providerRecognizesSameIdStart:
    'El proveedor reconoce el mismo ID. Inicia otro ensayo para comprobar que solo registra un envío.',
  enableKeyBasedDeduplicationAt: 'Activa la deduplicación por clave en el servicio de correo.',
  rememberCompletedAction: 'Recuerda la acción que ya terminó.',
  inThisTrialChargeFinished:
    'En esta prueba el cobro terminó antes de la caída. Guardar su avance permitirá saltarlo en el siguiente intento.',
  enableSaveProgressAfterConfirmation: (chargeStep: string | number) =>
    `Activa «Guardar avance al recibir confirmación» en «${chargeStep}».`,
  retryDuplicatedEffect: 'El reintento duplicó un efecto.',
  producedEffectForButConfirmation: (lastStep: string | number, job: string | number) =>
    `«${lastStep}» produjo un efecto para ${job}, pero se perdió la confirmación antes de guardar el avance local. Al reintentar, el efecto se aplicó otra vez.`,
  enableKeyBasedDeduplicationAt2: 'Activa la deduplicación por clave en el proveedor y repite el ensayo.',
  changeHowThisEffectIs: 'Cambia cómo se protege este efecto antes de repetir el ensayo.',
  repeatingItIsSafeIs: 'Repetirlo es seguro. ¿Compensa hacerlo?',
  checkingSameDataOrSetting:
    'Validar los mismos datos o fijar el mismo estado puede repetirse aquí. Recordar su avance ahorra trabajo a cambio de guardar más información.',
  markOtherStepsIfYou: 'Marca los otros pasos si quieres comparar. Es una mejora opcional.',
  resumeInsteadOfRepeating: 'Retomar en lugar de repetir.',
  workerWillSaveCompletedActions:
    'El worker guardará qué acciones terminaron por cada ID. Fíjate en ↷ cuando recupere un pago.',
  thisTimeItWillRecognize: 'Esta vez reconocerá el cobro.',
  itWillSaveMarkerOnce:
    'Guardará la marca cuando termine el cobro. Tras la caída de este escenario, podrá saltarlo y seguir con lo que falte.',
  onePaymentFourDifferentActions: 'Un pago. Cuatro acciones distintas.',
  workerValidatesChargesActivatesAccount:
    'El worker valida, cobra, activa la cuenta y envía un email. Algunas acciones cambian algo que sigue existiendo aunque el worker se pare.',
  emailTimedOutJob: (job: string | number) =>
    `${job}: el servicio pudo aceptar el email, pero se perdió su respuesta por timeout. Reintentar puede duplicarlo; no reintentar puede dejar al cliente sin confirmación.`,
  jobStoppedHalfway: (job: string | number) =>
    `${job} quedó a medias. Los pasos con ✓ ya terminaron; reiniciar el worker no deshace esos resultados.`,
};

const en = {
  allThreePaymentsFinished: 'All three payments finished.',
  providerRecognizedSameIdAnd:
    'The provider recognized the same ID and avoided sending the email again. Saving local progress was not enough for that crash.',
  chargeWasNotDuplicatedSome:
    'The charge was not duplicated. Some safe actions ran again: compare whether saving their progress is worthwhile.',
  workerResumedPendingWorkAnd: 'The worker resumed pending work and skipped actions whose progress was saved.',
  finishWalkthroughAndKeepThis: 'Finish the walkthrough and keep this configuration.',
  timeoutEmailMayHaveArrived: 'Timeout: the email may have arrived; we got no confirmation.',
  chargedStillInactive: 'Charged. Still inactive.',
  pressReprocessPaymentAndWatch: 'Press “Reprocess payment” and watch what runs again.',
  timeoutLeavesDeliveryUncertain: 'The timeout leaves delivery uncertain.',
  requestTimedOutServiceMay: (lastStep: string | number) =>
    `The “${lastStep}” request timed out. The service may have sent the email, but its response never reached the worker, so no marker was saved. Retrying without deduplication can send it twice.`,
  providerRecognizesSameIdStart:
    'The provider recognizes the same ID. Start another trial to check that it records only one send.',
  enableKeyBasedDeduplicationAt: 'Enable key-based deduplication at the email service.',
  rememberCompletedAction: 'Remember the completed action.',
  inThisTrialChargeFinished:
    'In this trial the charge finished before the crash. Saving its progress will let the next attempt skip it.',
  enableSaveProgressAfterConfirmation: (chargeStep: string | number) =>
    `Enable “Save progress after confirmation” on “${chargeStep}”.`,
  retryDuplicatedEffect: 'The retry duplicated an effect.',
  producedEffectForButConfirmation: (lastStep: string | number, job: string | number) =>
    `“${lastStep}” produced an effect for ${job}, but confirmation was lost before local progress was saved. The retry applied it again.`,
  enableKeyBasedDeduplicationAt2: 'Enable key-based deduplication at the provider and run the trial again.',
  changeHowThisEffectIs: 'Change how this effect is protected before running the trial again.',
  repeatingItIsSafeIs: 'Repeating it is safe. Is it worth it?',
  checkingSameDataOrSetting:
    'Checking the same data or setting the same state can repeat here. Saving progress saves work at the cost of more stored information.',
  markOtherStepsIfYou: 'Mark the other steps if you want to compare. This improvement is optional.',
  resumeInsteadOfRepeating: 'Resume instead of repeating.',
  workerWillSaveCompletedActions:
    'The worker will save completed actions for each ID. Watch for ↷ when it recovers a payment.',
  thisTimeItWillRecognize: 'This time it will recognize the charge.',
  itWillSaveMarkerOnce:
    'It will save a marker once the charge finishes. After this scenario’s crash, it can skip it and continue with the remaining work.',
  onePaymentFourDifferentActions: 'One payment. Four different actions.',
  workerValidatesChargesActivatesAccount:
    'The worker validates, charges, activates the account and sends an email. Some actions change something that remains even if the worker stops.',
  emailTimedOutJob: (job: string | number) =>
    `${job}: the service may have accepted the email, but its response timed out. Retrying may duplicate it; not retrying may leave the customer without confirmation.`,
  jobStoppedHalfway: (job: string | number) =>
    `${job} stopped halfway. Steps marked ✓ finished; restarting the worker does not undo those results.`,
};

export const workerStepsGuideCopy = defineCopy({ es, en });
