import { defineCopy } from '@/i18n/copy';

const es = {
  threePaymentsOneRecordPer: 'Tres pagos. Un registro por ID.',
  pendingPaymentsSurvivedCrashReturning:
    'Los pendientes sobrevivieron a la caída. El pago que volvió conservó su registro anterior, aunque el worker tuvo que intentarlo otra vez.',
  keepExperimentingWithThisConfiguration: 'Puedes seguir experimentando con esta configuración.',
  recordExistsConfirmationFailed: 'El registro existe. La confirmación falló.',
  workerCrashedPendingWorkIs: 'El worker cayó. El pendiente sigue aquí.',
  alreadyHasRowButRemains: (job: string | number) =>
    `${job} ya tiene una fila, pero sigue pendiente porque falló marcarlo como terminado. Vuelve el mismo ID.`,
  hadNotBeenRecordedYet: (job: string | number) =>
    `${job} aún no se había registrado. Esta vez su copia vive fuera del worker y se puede recuperar.`,
  pressReprocessPaymentToSee: 'Pulsa «Reprocesar pago» para ver el siguiente intento.',
  keepCopyOutsideWorker: 'Dales una copia fuera del worker.',
  ramHeldOnlyCopyOf:
    'La RAM era la única copia de los pendientes. Repite la prueba guardándolos en una base de datos separada.',
  underWhereTheyWaitChoose: 'En «Dónde esperan», elige «Base de datos». Prepara un ensayo nuevo.',
  recognizeReturningPayment: 'Reconoce el pago que vuelve.',
  endedUpWithTwoRows: (job: string | number) =>
    `${job} acabó con dos filas. Conservar los pendientes permitió reintentar; ahora falta reconocer lo ya registrado.`,
  sameIdCanReturnEven:
    'El mismo ID puede volver aunque su registro ya exista. Conservar los pendientes y reconocer lo ya registrado resuelven problemas distintos.',
  underIfPaymentReturnsChoose: 'En «Si el pago vuelve», elige «Comprobar su ID».',
  acceptanceDidNotKeepThem: 'Aceptar no bastaba para conservarlos.',
  firstPaymentIsRecordedOther:
    'El primer pago está registrado. Los otros dos solo esperaban en la RAM del proceso que cayó.',
  changeDesignSoPendingWork: 'Cambia el diseño para que los pendientes sobrevivan al worker.',
  samePaymentWasRecordedAgain: 'El mismo pago se registró otra vez.',
  itsFirstRowWasStill: 'Su primera fila seguía ahí. Reintentar sin reconocer el ID creó una segunda.',
  changeHowWorkerHandlesReturning: 'Cambia cómo trata el worker un pago que vuelve.',
  twoChoicesWorkTogether: 'Las dos decisiones trabajan juntas.',
  databaseKeepsPendingWorkId:
    'La base de datos conserva lo pendiente. El ID reconoce una fila ya creada. Son protecciones para problemas distintos.',
  pendingWorkNowLivesOutside: 'Los pendientes ya viven fuera.',
  youAddedDatabaseWorkNo:
    'Añadiste una base de datos. El trabajo ya no depende de que el worker siga vivo; vamos a probarlo.',
  shopAlreadySaidReceived: 'La tienda ya ha dicho «recibido».',
  acceptedThreePaymentsMustCheck: (api: string | number, worker: string | number) =>
    `${api} aceptó tres pagos. ${worker} debe revisarlos y registrarlos. Solo «Registrar pago» crea una fila.`,
};

const en = {
  threePaymentsOneRecordPer: 'Three payments. One record per ID.',
  pendingPaymentsSurvivedCrashReturning:
    'Pending payments survived the crash. The returning payment kept its existing record, even though the worker had to try again.',
  keepExperimentingWithThisConfiguration: 'Keep experimenting with this configuration.',
  recordExistsConfirmationFailed: 'The record exists. Confirmation failed.',
  workerCrashedPendingWorkIs: 'The worker crashed. Pending work is still here.',
  alreadyHasRowButRemains: (job: string | number) =>
    `${job} already has a row, but remains pending because marking it complete failed. The same ID returns.`,
  hadNotBeenRecordedYet: (job: string | number) =>
    `${job} had not been recorded yet. This time its copy lives outside the worker and can be recovered.`,
  pressReprocessPaymentToSee: 'Press “Reprocess payment” to see the next attempt.',
  keepCopyOutsideWorker: 'Keep a copy outside the worker.',
  ramHeldOnlyCopyOf:
    'RAM held the only copy of pending work. Repeat the trial with payments saved in a separate database.',
  underWhereTheyWaitChoose: 'Under “Where they wait”, choose “Database”. This prepares a new trial.',
  recognizeReturningPayment: 'Recognize the returning payment.',
  endedUpWithTwoRows: (job: string | number) =>
    `${job} ended up with two rows. Keeping pending work made retry possible; now recognize what was already recorded.`,
  sameIdCanReturnEven:
    'The same ID can return even when its record already exists. Keeping pending work and recognizing a previous result solve different problems.',
  underIfPaymentReturnsChoose: 'Under “If the payment returns”, choose “Check its ID”.',
  acceptanceDidNotKeepThem: 'Acceptance did not keep them safe.',
  firstPaymentIsRecordedOther:
    'The first payment is recorded. The other two were only waiting in the crashed process’s RAM.',
  changeDesignSoPendingWork: 'Change the design so pending work survives the worker.',
  samePaymentWasRecordedAgain: 'The same payment was recorded again.',
  itsFirstRowWasStill: 'Its first row was still there. Retrying without recognizing its ID created a second one.',
  changeHowWorkerHandlesReturning: 'Change how the worker handles a returning payment.',
  twoChoicesWorkTogether: 'The two choices work together.',
  databaseKeepsPendingWorkId:
    'The database keeps pending work. The ID recognizes an existing row. They protect against different problems.',
  pendingWorkNowLivesOutside: 'Pending work now lives outside.',
  youAddedDatabaseWorkNo: 'You added a database. Work no longer depends on the worker staying alive; let us test it.',
  shopAlreadySaidReceived: 'The shop already said “received”.',
  acceptedThreePaymentsMustCheck: (api: string | number, worker: string | number) =>
    `${api} accepted three payments. ${worker} must check and record them. Only “Record payment” creates a row.`,
};

export const queueGuideCopy = defineCopy({ es, en });
