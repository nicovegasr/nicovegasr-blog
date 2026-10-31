import { isExternal } from './engine';
import type { SimulationState } from './engine';

export type GuideStage =
  | 'off'
  | 'ram'
  | 'storage'
  | 'durable'
  | 'identity'
  | 'safe'
  | 'partial'
  | 'charge'
  | 'email'
  | 'optimize'
  | 'efficient';
export type GuideTarget =
  | 'storage'
  | 'identity'
  | 'charge'
  | 'provider'
  | 'steps'
  | null;
type Context = {
  level: 1 | 2;
  es: boolean;
  stage: GuideStage;
  state: SimulationState;
  playing: boolean;
  api: string;
  worker: string;
  job: string;
  chargeStep: string;
  lastStep: string;
  steps: string[];
};
export type GuideBeat = {
  chapter: number;
  title: string;
  story: string;
  task: string;
  target: GuideTarget;
};

export function guideBeat(c: Context): GuideBeat {
  const t = (es: string, en: string) => (c.es ? es : en);
  const { state: s, stage } = c;
  const start =
    s.phase === 'running'
      ? t('Pulsa «Continuar».', 'Press “Resume”.')
      : t('Pulsa «Iniciar».', 'Press “Start”.');
  const follow = c.playing
    ? t(
        'Sigue el pago verde y la acción que se está ejecutando.',
        'Follow the green payment and the action currently running.',
      )
    : start;
  const beat = (
    chapter: number,
    title: string,
    story: string,
    task: string,
    target: GuideTarget = null,
  ): GuideBeat => ({ chapter, title, story, task, target });

  if (c.level === 1) {
    if (s.phase === 'won')
      return beat(
        4,
        t(
          'Tres pagos. Un registro por ID.',
          'Three payments. One record per ID.',
        ),
        t(
          'Los pendientes sobrevivieron a la caída. El pago que volvió conservó su registro anterior, aunque el worker tuvo que intentarlo otra vez.',
          'Pending payments survived the crash. The returning payment kept its existing record, even though the worker had to try again.',
        ),
        t(
          'Puedes seguir experimentando con esta configuración.',
          'Keep experimenting with this configuration.',
        ),
      );
    if (s.phase === 'incident')
      return beat(
        stage === 'safe' ? 4 : s.incident === 'ack-retry' ? 3 : 2,
        s.incident === 'ack-retry'
          ? t(
              'El registro existe. La confirmación falló.',
              'The record exists. Confirmation failed.',
            )
          : t(
              'El worker cayó. El pendiente sigue aquí.',
              'The worker crashed. Pending work is still here.',
            ),
        s.incident === 'ack-retry'
          ? t(
              `${c.job} ya tiene una fila, pero sigue pendiente porque falló marcarlo como terminado. Vuelve el mismo ID.`,
              `${c.job} already has a row, but remains pending because marking it complete failed. The same ID returns.`,
            )
          : t(
              `${c.job} aún no se había registrado. Esta vez su copia vive fuera del worker y se puede recuperar.`,
              `${c.job} had not been recorded yet. This time its copy lives outside the worker and can be recovered.`,
            ),
        t(
          'Pulsa «Reprocesar pago» para ver el siguiente intento.',
          'Press “Reprocess payment” to see the next attempt.',
        ),
      );
    if (stage === 'storage')
      return beat(
        2,
        t(
          'Dales una copia fuera del worker.',
          'Keep a copy outside the worker.',
        ),
        t(
          'La RAM era la única copia de los pendientes. Repite la prueba guardándolos en una base de datos separada.',
          'RAM held the only copy of pending work. Repeat the trial with payments saved in a separate database.',
        ),
        t(
          'En «Dónde esperan», elige «Base de datos». Prepara un ensayo nuevo.',
          'Under “Where they wait”, choose “Database”. This prepares a new trial.',
        ),
        'storage',
      );
    if (stage === 'identity')
      return beat(
        3,
        t('Reconoce el pago que vuelve.', 'Recognize the returning payment.'),
        s.phase === 'duplicate'
          ? t(
              `${c.job} acabó con dos filas. Conservar los pendientes permitió reintentar; ahora falta reconocer lo ya registrado.`,
              `${c.job} ended up with two rows. Keeping pending work made retry possible; now recognize what was already recorded.`,
            )
          : t(
              'El mismo ID puede volver aunque su registro ya exista. Conservar los pendientes y reconocer lo ya registrado resuelven problemas distintos.',
              'The same ID can return even when its record already exists. Keeping pending work and recognizing a previous result solve different problems.',
            ),
        t(
          'En «Si el pago vuelve», elige «Comprobar su ID».',
          'Under “If the payment returns”, choose “Check its ID”.',
        ),
        'identity',
      );
    if (s.phase === 'lost')
      return beat(
        1,
        t(
          'Aceptar no bastaba para conservarlos.',
          'Acceptance did not keep them safe.',
        ),
        t(
          'El primer pago está registrado. Los otros dos solo esperaban en la RAM del proceso que cayó.',
          'The first payment is recorded. The other two were only waiting in the crashed process’s RAM.',
        ),
        t(
          'Cambia el diseño para que los pendientes sobrevivan al worker.',
          'Change the design so pending work survives the worker.',
        ),
      );
    if (s.phase === 'duplicate')
      return beat(
        3,
        t(
          'El mismo pago se registró otra vez.',
          'The same payment was recorded again.',
        ),
        t(
          'Su primera fila seguía ahí. Reintentar sin reconocer el ID creó una segunda.',
          'Its first row was still there. Retrying without recognizing its ID created a second one.',
        ),
        t(
          'Cambia cómo trata el worker un pago que vuelve.',
          'Change how the worker handles a returning payment.',
        ),
      );
    if (stage === 'safe')
      return beat(
        4,
        t(
          'Las dos decisiones trabajan juntas.',
          'The two choices work together.',
        ),
        t(
          'La base de datos conserva lo pendiente. El ID reconoce una fila ya creada. Son protecciones para problemas distintos.',
          'The database keeps pending work. The ID recognizes an existing row. They protect against different problems.',
        ),
        follow,
      );
    if (stage === 'durable')
      return beat(
        2,
        t('Los pendientes ya viven fuera.', 'Pending work now lives outside.'),
        t(
          'Añadiste una base de datos. El trabajo ya no depende de que el worker siga vivo; vamos a probarlo.',
          'You added a database. Work no longer depends on the worker staying alive; let us test it.',
        ),
        follow,
      );
    return beat(
      1,
      t(
        'La tienda ya ha dicho «recibido».',
        'The shop already said “received”.',
      ),
      t(
        `${c.api} aceptó tres pagos. ${c.worker} debe revisarlos y registrarlos. Solo «Registrar pago» crea una fila.`,
        `${c.api} accepted three payments. ${c.worker} must check and record them. Only “Record payment” creates a row.`,
      ),
      follow,
    );
  }

  if (s.phase === 'won' && stage !== 'optimize')
    return beat(
      4,
      t('Los tres pagos terminaron.', 'All three payments finished.'),
      s.events.some(
        (event) =>
          event.kind === 'provider-dedup' && event.job === 3 && event.step === 3,
      )
        ? t(
            'El proveedor reconoció el mismo ID y evitó volver a enviar el email. Guardar avances locales no bastaba para esa caída.',
            'The provider recognized the same ID and avoided sending the email again. Saving local progress was not enough for that crash.',
          )
        : s.wasted
        ? t(
            'El cobro no se duplicó. Algunas acciones seguras se repitieron: puedes comparar si compensa guardar también su avance.',
            'The charge was not duplicated. Some safe actions ran again: compare whether saving their progress is worthwhile.',
          )
        : t(
            'El worker retomó lo pendiente y saltó las acciones que ya tenía guardadas.',
            'The worker resumed pending work and skipped actions whose progress was saved.',
          ),
      t(
        'Puedes terminar el recorrido y conservar esta configuración.',
        'Finish the walkthrough and keep this configuration.',
      ),
    );
  if (s.phase === 'incident')
    return beat(
      stage === 'partial' ? 1 : 3,
      s.incident === 'email-uncertain'
        ? t(
            'Timeout: el email pudo llegar; no recibimos confirmación.',
            'Timeout: the email may have arrived; we got no confirmation.',
          )
        : t('Cobrado. Todavía sin activar.', 'Charged. Still inactive.'),
      t(
        s.incident === 'email-uncertain'
          ? `${c.job}: el servicio pudo aceptar el email, pero se perdió su respuesta por timeout. Reintentar puede duplicarlo; no reintentar puede dejar al cliente sin confirmación.`
          : `${c.job} quedó a medias. Los pasos con ✓ ya terminaron; reiniciar el worker no deshace esos resultados.`,
        s.incident === 'email-uncertain'
          ? `${c.job}: the service may have accepted the email, but its response timed out. Retrying may duplicate it; not retrying may leave the customer without confirmation.`
          : `${c.job} stopped halfway. Steps marked ✓ finished; restarting the worker does not undo those results.`,
      ),
      t(
        'Pulsa «Reprocesar pago» y observa qué se ejecuta otra vez.',
        'Press “Reprocess payment” and watch what runs again.',
      ),
    );
  if (stage === 'email')
    return beat(
      3,
      t('El timeout deja el envío en duda.', 'The timeout leaves delivery uncertain.'),
      t(
        `La solicitud de «${c.lastStep}» agotó el tiempo de espera. El servicio pudo enviar el email, pero su respuesta no llegó al worker y no se guardó la marca. Reintentar sin deduplicación puede duplicarlo.`,
        `The “${c.lastStep}” request timed out. The service may have sent the email, but its response never reached the worker, so no marker was saved. Retrying without deduplication can send it twice.`,
      ),
      s.config.steps[3]?.providerDeduplication
        ? t(
            'El proveedor reconoce el mismo ID. Inicia otro ensayo para comprobar que solo registra un envío.',
            'The provider recognizes the same ID. Start another trial to check that it records only one send.',
          )
        : t(
            `Activa la deduplicación por clave en el servicio de correo.`,
            `Enable key-based deduplication at the email service.`,
          ),
      s.config.steps[3]?.providerDeduplication ? null : 'provider',
    );
  if (stage === 'charge')
    return beat(
      2,
      t('Recuerda la acción que ya terminó.', 'Remember the completed action.'),
      t(
        'En esta prueba el cobro terminó antes de la caída. Guardar su avance permitirá saltarlo en el siguiente intento.',
        'In this trial the charge finished before the crash. Saving its progress will let the next attempt skip it.',
      ),
      t(
        `Activa «Guardar avance al recibir confirmación» en «${c.chargeStep}».`,
        `Enable “Save progress after confirmation” on “${c.chargeStep}”.`,
      ),
      'charge',
    );
  if (s.phase === 'duplicate')
    return beat(
      3,
      t('El reintento duplicó un efecto.', 'The retry duplicated an effect.'),
      t(
        `«${c.steps[s.step] ?? c.lastStep}» produjo un efecto para ${c.job}, pero se perdió la confirmación antes de guardar el avance local. Al reintentar, el efecto se aplicó otra vez.`,
        `“${c.steps[s.step] ?? c.lastStep}” produced an effect for ${c.job}, but confirmation was lost before local progress was saved. The retry applied it again.`,
      ),
      isExternal(s.config.steps[s.step]?.kind ?? 'check')
        ? t(
            `Activa la deduplicación por clave en el proveedor y repite el ensayo.`,
            `Enable key-based deduplication at the provider and run the trial again.`,
          )
        : t(
            'Cambia cómo se protege este efecto antes de repetir el ensayo.',
            'Change how this effect is protected before running the trial again.',
          ),
      isExternal(s.config.steps[s.step]?.kind ?? 'check') ? 'provider' : null,
    );
  if (stage === 'optimize')
    return beat(
      4,
      t(
        'Repetirlo es seguro. ¿Compensa hacerlo?',
        'Repeating it is safe. Is it worth it?',
      ),
      t(
        'Validar los mismos datos o fijar el mismo estado puede repetirse aquí. Recordar su avance ahorra trabajo a cambio de guardar más información.',
        'Checking the same data or setting the same state can repeat here. Saving progress saves work at the cost of more stored information.',
      ),
      t(
        'Marca los otros pasos si quieres comparar. Es una mejora opcional.',
        'Mark the other steps if you want to compare. This improvement is optional.',
      ),
      'steps',
    );
  if (stage === 'efficient')
    return beat(
      4,
      t('Retomar en lugar de repetir.', 'Resume instead of repeating.'),
      t(
        'El worker guardará qué acciones terminaron por cada ID. Fíjate en ↷ cuando recupere un pago.',
        'The worker will save completed actions for each ID. Watch for ↷ when it recovers a payment.',
      ),
      follow,
    );
  if (stage === 'safe')
    return beat(
      3,
      t(
        'Esta vez reconocerá el cobro.',
        'This time it will recognize the charge.',
      ),
      t(
        'Guardará la marca cuando termine el cobro. Tras la caída de este escenario, podrá saltarlo y seguir con lo que falte.',
        'It will save a marker once the charge finishes. After this scenario’s crash, it can skip it and continue with the remaining work.',
      ),
      follow,
    );
  return beat(
    1,
    t(
      'Un pago. Cuatro acciones distintas.',
      'One payment. Four different actions.',
    ),
    t(
      'El worker valida, cobra, activa la cuenta y envía un email. Algunas acciones cambian algo que sigue existiendo aunque el worker se pare.',
      'The worker validates, charges, activates the account and sends an email. Some actions change something that remains even if the worker stops.',
    ),
    follow,
  );
}
