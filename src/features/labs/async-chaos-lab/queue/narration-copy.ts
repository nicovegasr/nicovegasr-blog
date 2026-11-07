import { defineCopy } from '@/i18n/copy';

const es = {
  youLostData: 'PERDISTE LOS DATOS',
  firstPaymentIsRecordedOther: (lost: string | number, worker: string | number) =>
    `El primer pago está registrado. Los otros ${lost} solo estaban pendientes en la RAM de ${worker}. Al caer ese proceso, desapareció su única copia. La API había dicho «recibido», no «guardado».`,
  thisPaymentHasTwoRecords: 'Este pago tiene dos registros.',
  wasAlreadyRecordedItsStatus: (job: string | number) =>
    `${job} ya estaba registrado. Falló actualizar su estado y volvió como pendiente. El worker no comprobó su ID y creó otra fila. La meta era una por pago.`,
  threePaymentsThreeRecords: 'Tres pagos. Tres registros.',
  pendingPaymentsSurvivedCrashReturning:
    'Los pendientes sobrevivieron a la caída. El pago que volvió conservó su registro anterior. Hubo varios intentos, pero solo una fila por ID.',
  recordedButStillPending: 'Registrado, pero todavía pendiente.',
  alreadyHasRowConfirmationMarking: (job: string | number) =>
    `${job} ya tiene una fila. Falló la confirmación que lo marca como terminado. El sistema vuelve a ofrecer el mismo ID: al reintentar, comprueba si ya existe su registro.`,
  workerCrashedPaymentsAreStill: 'El worker cayó. Los pagos siguen aquí.',
  wasNotYetRecordedDatabase: (job: string | number) =>
    `${job} aún no estaba registrado. La base de datos conserva el trabajo pendiente porque está fuera del worker. Reinícialo para continuar.`,
  threePaymentsToRecord: 'Tres pagos por registrar.',
  shopAlreadySaidReceivedNow:
    'La tienda ya dijo «recibido». Ahora el worker tiene que registrar cada pago. Elige dónde esperan y qué hará si vuelve el mismo ID.',
  rowExistsPaymentStillNeeds: 'La fila ya existe. Falta marcar el pago como terminado.',
  checkIdIfItAlready: 'Comprueba el ID: si ya tiene una fila, conserva esa misma.',
  createRowWithoutCheckingWhether: 'Crea una fila sin comprobar si este ID ya estaba registrado.',
  checkDataThisStepCreates: 'Revisa los datos. Este paso no crea ningún registro.',
  prepareResultRepeatingThisStep: 'Prepara el resultado. Repetir este paso no crea otra fila.',
  processing: (job: string | number) => `Procesando ${job}`,
  paused: 'En pausa',
  threePaymentsShallWeGet: 'Tenemos tres pagos. ¿Los ponemos en marcha?',
  workerWillPickThemUp:
    'El worker los irá sacando, revisando y registrando. Tú dale a «Iniciar» y vigila que todos lleguen al final.',
  youDecideWhereTheyWait:
    'Dónde esperan lo decides tú: RAM del worker o base de datos. Lo puedes cambiar en el esquema, en «Dónde esperan».',
  andIfSameIdComes:
    'Y si vuelve el mismo ID… no será que quieren pagarnos dos veces, ¿no? Échale un ojo a «Si el pago vuelve». Esa decisión también es tuya.',
  customersAreWaiting: 'Los clientes están esperando.',
  customersAreAskingAboutTheir: (lost: string | number) =>
    `Hay ${lost} clientes preguntando por su pago. La web les dijo «recibido», pero aquí no aparecen. Los he buscado y no los encuentro. ¿Puedes mirar qué ha pasado?`,
  thisPaymentAppearsTwice: 'Este pago aparece dos veces.',
  heyAppearsTwiceInRegister: (job: string | number) =>
    `Oye, ${job} aparece dos veces en el registro. El cliente solo ha hecho un pago. ¿Hemos guardado el mismo dos veces?`,
  customerIsStillWaiting: 'El cliente sigue esperando.',
  heyCustomerForWantsTo: (job: string | number) =>
    `Oye, el cliente de ${job} pregunta si hemos recibido su pago. En la web pone que sí, pero aún no aparece registrado. ¿Puedes desbloquearlo?`,
  thisPaymentIsShowingAs: 'Este pago vuelve a salir pendiente.',
  isShowingAsPendingBut: (job: string | number) =>
    `Me sale ${job} pendiente, pero yo juraría que ya lo habíamos registrado. ¿Puedes mirar ese ID antes de volver a pasarlo?`,
};

const en = {
  youLostData: 'YOU LOST THE DATA',
  firstPaymentIsRecordedOther: (lost: string | number, worker: string | number) =>
    `The first payment is recorded. The other ${lost} were only pending in ${worker}’s RAM. When that process crashed, their only copy disappeared. The API said “received”, not “saved”.`,
  thisPaymentHasTwoRecords: 'This payment has two records.',
  wasAlreadyRecordedItsStatus: (job: string | number) =>
    `${job} was already recorded. Its status update failed and it returned as pending. The worker did not check its ID and created another row. The goal was one per payment.`,
  threePaymentsThreeRecords: 'Three payments. Three records.',
  pendingPaymentsSurvivedCrashReturning:
    'Pending payments survived the crash. The returning payment kept its existing record. There were multiple attempts, but only one row per ID.',
  recordedButStillPending: 'Recorded, but still pending.',
  alreadyHasRowConfirmationMarking: (job: string | number) =>
    `${job} already has a row. The confirmation marking it complete failed. The system offers the same ID again: on retry, check whether its record already exists.`,
  workerCrashedPaymentsAreStill: 'The worker crashed. The payments are still here.',
  wasNotYetRecordedDatabase: (job: string | number) =>
    `${job} was not yet recorded. The database retains the pending job because it is outside the worker. Restart it to continue.`,
  threePaymentsToRecord: 'Three payments to record.',
  shopAlreadySaidReceivedNow:
    'The shop already said “received”. Now the worker must record each payment. Choose where they wait and what happens if the same ID returns.',
  rowExistsPaymentStillNeeds: 'The row exists. The payment still needs to be marked complete.',
  checkIdIfItAlready: 'Check the ID: if it already has a row, keep it.',
  createRowWithoutCheckingWhether: 'Create a row without checking whether this ID was already recorded.',
  checkDataThisStepCreates: 'Check the data. This step creates no record.',
  prepareResultRepeatingThisStep: 'Prepare the result. Repeating this step creates no additional row.',
  processing: (job: string | number) => `Processing ${job}`,
  paused: 'Paused',
  threePaymentsShallWeGet: 'Three payments. Shall we get them moving?',
  workerWillPickThemUp:
    'The worker will pick them up, check them and record them. Press “Start” and watch them reach the finish.',
  youDecideWhereTheyWait:
    'You decide where they wait: worker RAM or a database. Change it on the diagram under “Where they wait”.',
  andIfSameIdComes:
    'And if the same ID comes back… surely they are not trying to pay us twice? Take a look at “If the payment returns”. That choice is yours too.',
  customersAreWaiting: 'The customers are waiting.',
  customersAreAskingAboutTheir: (lost: string | number) =>
    `${lost} customers are asking about their payments. The website said “received”, but they are missing here. I have looked and cannot find them. Can you check what happened?`,
  thisPaymentAppearsTwice: 'This payment appears twice.',
  heyAppearsTwiceInRegister: (job: string | number) =>
    `Hey, ${job} appears twice in the register. The customer only made one payment. Have we recorded it twice?`,
  customerIsStillWaiting: 'The customer is still waiting.',
  heyCustomerForWantsTo: (job: string | number) =>
    `Hey, the customer for ${job} wants to know if we received their payment. The website says yes, but it has not been recorded yet. Can you get it moving?`,
  thisPaymentIsShowingAs: 'This payment is showing as pending again.',
  isShowingAsPendingBut: (job: string | number) =>
    `${job} is showing as pending, but I could swear we already recorded it. Can you check that ID before running it again?`,
};

export const queueNarrationCopy = defineCopy({ es, en });
