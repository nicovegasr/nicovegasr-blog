import type { PaymentLab } from '../payment-simulation/controller';
import { totals } from '../payment-simulation/engine';
import { escapeHtml as esc } from '../shared/text';

export function queueFeedback(lab: PaymentLab): [string, string] {
  const s = lab.state,
    j = esc(lab.job(Math.max(s.active, 0)));
  if (s.phase === 'lost')
    return [
      lab.t('PERDISTE LOS DATOS', 'YOU LOST THE DATA'),
      lab.t(
        `El primer pago está registrado. Los otros ${totals(s).lost} solo estaban pendientes en la RAM de ${esc(lab.name('worker'))}. Al caer ese proceso, desapareció su única copia. La API había dicho «recibido», no «guardado».`,
        `The first payment is recorded. The other ${totals(s).lost} were only pending in ${esc(lab.name('worker'))}’s RAM. When that process crashed, their only copy disappeared. The API said “received”, not “saved”.`,
      ),
    ];
  if (s.phase === 'duplicate')
    return [
      lab.t(
        'Este pago tiene dos registros.',
        'This payment has two records.',
      ),
      lab.t(
        `${j} ya estaba registrado. Falló actualizar su estado y volvió como pendiente. El worker no comprobó su ID y creó otra fila. La meta era una por pago.`,
        `${j} was already recorded. Its status update failed and it returned as pending. The worker did not check its ID and created another row. The goal was one per payment.`,
      ),
    ];
  if (s.phase === 'won')
    return [
      lab.t('Tres pagos. Tres registros.', 'Three payments. Three records.'),
      lab.t(
        'Los pendientes sobrevivieron a la caída. El pago que volvió conservó su registro anterior. Hubo varios intentos, pero solo una fila por ID.',
        'Pending payments survived the crash. The returning payment kept its existing record. There were multiple attempts, but only one row per ID.',
      ),
    ];
  if (s.phase === 'incident')
    return s.incident === 'ack-retry'
      ? [
          lab.t(
            'Registrado, pero todavía pendiente.',
            'Recorded, but still pending.',
          ),
          lab.t(
            `${j} ya tiene una fila. Falló la confirmación que lo marca como terminado. El sistema vuelve a ofrecer el mismo ID: al reintentar, comprueba si ya existe su registro.`,
            `${j} already has a row. The confirmation marking it complete failed. The system offers the same ID again: on retry, check whether its record already exists.`,
          ),
        ]
      : [
          lab.t(
            'El worker cayó. Los pagos siguen aquí.',
            'The worker crashed. The payments are still here.',
          ),
          lab.t(
            `${j} aún no estaba registrado. La base de datos conserva el trabajo pendiente porque está fuera del worker. Reinícialo para continuar.`,
            `${j} was not yet recorded. The database retains the pending job because it is outside the worker. Restart it to continue.`,
          ),
        ];
  if (s.phase === 'ready')
    return [
      lab.t('Tres pagos por registrar.', 'Three payments to record.'),
      lab.t(
        'La tienda ya dijo «recibido». Ahora el worker tiene que registrar cada pago. Elige dónde esperan y qué hará si vuelve el mismo ID.',
        'The shop already said “received”. Now the worker must record each payment. Choose where they wait and what happens if the same ID returns.',
      ),
    ];
  const action =
    s.cursor === 'ack'
      ? lab.t(
          'La fila ya existe. Falta marcar el pago como terminado.',
          'The row exists. The payment still needs to be marked complete.',
        )
      : s.step === 1
        ? lab.config.protectLocalRecord
          ? lab.t(
              'Comprueba el ID: si ya tiene una fila, conserva esa misma.',
              'Check the ID: if it already has a row, keep it.',
            )
          : lab.t(
              'Crea una fila sin comprobar si este ID ya estaba registrado.',
              'Create a row without checking whether this ID was already recorded.',
            )
        : s.step === 0
          ? lab.t(
              'Revisa los datos. Este paso no crea ningún registro.',
              'Check the data. This step creates no record.',
            )
          : lab.t(
              'Prepara el resultado. Repetir este paso no crea otra fila.',
              'Prepare the result. Repeating this step creates no additional row.',
            );
  return [
    lab.playing
      ? lab.t(
          `Procesando ${lab.job(Math.max(s.active, 0))}`,
          `Processing ${lab.job(Math.max(s.active, 0))}`,
        )
      : lab.t('En pausa', 'Paused'),
    action,
  ];
}

export const queueTutorial = (lab: PaymentLab) => ({
  title: lab.t(
    'Tenemos tres pagos. ¿Los ponemos en marcha?',
    'Three payments. Shall we get them moving?',
  ),
  lines: [
    lab.t(
      'El worker los irá sacando, revisando y registrando. Tú dale a «Iniciar» y vigila que todos lleguen al final.',
      'The worker will pick them up, check them and record them. Press “Start” and watch them reach the finish.',
    ),
    lab.t(
      'Dónde esperan lo decides tú: RAM del worker o base de datos. Lo puedes cambiar en el esquema, en «Dónde esperan».',
      'You decide where they wait: worker RAM or a database. Change it on the diagram under “Where they wait”.',
    ),
    lab.t(
      'Y si vuelve el mismo ID… no será que quieren pagarnos dos veces, ¿no? Échale un ojo a «Si el pago vuelve». Esa decisión también es tuya.',
      'And if the same ID comes back… surely they are not trying to pay us twice? Take a look at “If the payment returns”. That choice is yours too.',
    ),
  ],
});

export function queueIncidentCall(lab: PaymentLab): { title: string; report: string } {
  const s = lab.state,
    job = lab.job(Math.max(0, s.active));
  if (s.phase === 'lost')
    return {
      title: lab.t(
        'Los clientes están esperando.',
        'The customers are waiting.',
      ),
      report: lab.t(
        `Hay ${totals(s).lost} clientes preguntando por su pago. La web les dijo «recibido», pero aquí no aparecen. Los he buscado y no los encuentro. ¿Puedes mirar qué ha pasado?`,
        `${totals(s).lost} customers are asking about their payments. The website said “received”, but they are missing here. I have looked and cannot find them. Can you check what happened?`,
      ),
    };
  if (s.phase === 'duplicate')
    return {
      title: lab.t(
        'Este pago aparece dos veces.',
        'This payment appears twice.',
      ),
      report: lab.t(
        `Oye, ${job} aparece dos veces en el registro. El cliente solo ha hecho un pago. ¿Hemos guardado el mismo dos veces?`,
        `Hey, ${job} appears twice in the register. The customer only made one payment. Have we recorded it twice?`,
      ),
    };
  if (s.incident === 'worker-retry')
    return {
      title: lab.t(
        'El cliente sigue esperando.',
        'The customer is still waiting.',
      ),
      report: lab.t(
        `Oye, el cliente de ${job} pregunta si hemos recibido su pago. En la web pone que sí, pero aún no aparece registrado. ¿Puedes desbloquearlo?`,
        `Hey, the customer for ${job} wants to know if we received their payment. The website says yes, but it has not been recorded yet. Can you get it moving?`,
      ),
    };
  return {
    title: lab.t(
      'Este pago vuelve a salir pendiente.',
      'This payment is showing as pending again.',
    ),
    report: lab.t(
      `Me sale ${job} pendiente, pero yo juraría que ya lo habíamos registrado. ¿Puedes mirar ese ID antes de volver a pasarlo?`,
      `${job} is showing as pending, but I could swear we already recorded it. Can you check that ID before running it again?`,
    ),
  };
}
