import { guideHelpers } from '../payment-simulation/guide';
import type { GuideBeat, GuideContext } from '../payment-simulation/guide';

export function queueGuideBeat(context: GuideContext): GuideBeat {
  const { t: translate, follow, beat } = guideHelpers(context);
  const { state: state, stage } = context;
  if (state.phase === 'won')
    return beat(
      4,
      translate('Tres pagos. Un registro por ID.', 'Three payments. One record per ID.'),
      translate(
        'Los pendientes sobrevivieron a la caída. El pago que volvió conservó su registro anterior, aunque el worker tuvo que intentarlo otra vez.',
        'Pending payments survived the crash. The returning payment kept its existing record, even though the worker had to try again.',
      ),
      translate('Puedes seguir experimentando con esta configuración.', 'Keep experimenting with this configuration.'),
    );
  if (state.phase === 'incident')
    return beat(
      stage === 'safe' ? 4 : state.incident === 'ack-retry' ? 3 : 2,
      state.incident === 'ack-retry'
        ? translate('El registro existe. La confirmación falló.', 'The record exists. Confirmation failed.')
        : translate('El worker cayó. El pendiente sigue aquí.', 'The worker crashed. Pending work is still here.'),
      state.incident === 'ack-retry'
        ? translate(
            `${context.job} ya tiene una fila, pero sigue pendiente porque falló marcarlo como terminado. Vuelve el mismo ID.`,
            `${context.job} already has a row, but remains pending because marking it complete failed. The same ID returns.`,
          )
        : translate(
            `${context.job} aún no se había registrado. Esta vez su copia vive fuera del worker y se puede recuperar.`,
            `${context.job} had not been recorded yet. This time its copy lives outside the worker and can be recovered.`,
          ),
      translate(
        'Pulsa «Reprocesar pago» para ver el siguiente intento.',
        'Press “Reprocess payment” to see the next attempt.',
      ),
    );
  if (stage === 'storage')
    return beat(
      2,
      translate('Dales una copia fuera del worker.', 'Keep a copy outside the worker.'),
      translate(
        'La RAM era la única copia de los pendientes. Repite la prueba guardándolos en una base de datos separada.',
        'RAM held the only copy of pending work. Repeat the trial with payments saved in a separate database.',
      ),
      translate(
        'En «Dónde esperan», elige «Base de datos». Prepara un ensayo nuevo.',
        'Under “Where they wait”, choose “Database”. This prepares a new trial.',
      ),
      'storage',
    );
  if (stage === 'identity')
    return beat(
      3,
      translate('Reconoce el pago que vuelve.', 'Recognize the returning payment.'),
      state.phase === 'duplicate'
        ? translate(
            `${context.job} acabó con dos filas. Conservar los pendientes permitió reintentar; ahora falta reconocer lo ya registrado.`,
            `${context.job} ended up with two rows. Keeping pending work made retry possible; now recognize what was already recorded.`,
          )
        : translate(
            'El mismo ID puede volver aunque su registro ya exista. Conservar los pendientes y reconocer lo ya registrado resuelven problemas distintos.',
            'The same ID can return even when its record already exists. Keeping pending work and recognizing a previous result solve different problems.',
          ),
      translate(
        'En «Si el pago vuelve», elige «Comprobar su ID».',
        'Under “If the payment returns”, choose “Check its ID”.',
      ),
      'identity',
    );
  if (state.phase === 'lost')
    return beat(
      1,
      translate('Aceptar no bastaba para conservarlos.', 'Acceptance did not keep them safe.'),
      translate(
        'El primer pago está registrado. Los otros dos solo esperaban en la RAM del proceso que cayó.',
        'The first payment is recorded. The other two were only waiting in the crashed process’s RAM.',
      ),
      translate(
        'Cambia el diseño para que los pendientes sobrevivan al worker.',
        'Change the design so pending work survives the worker.',
      ),
    );
  if (state.phase === 'duplicate')
    return beat(
      3,
      translate('El mismo pago se registró otra vez.', 'The same payment was recorded again.'),
      translate(
        'Su primera fila seguía ahí. Reintentar sin reconocer el ID creó una segunda.',
        'Its first row was still there. Retrying without recognizing its ID created a second one.',
      ),
      translate(
        'Cambia cómo trata el worker un pago que vuelve.',
        'Change how the worker handles a returning payment.',
      ),
    );
  if (stage === 'safe')
    return beat(
      4,
      translate('Las dos decisiones trabajan juntas.', 'The two choices work together.'),
      translate(
        'La base de datos conserva lo pendiente. El ID reconoce una fila ya creada. Son protecciones para problemas distintos.',
        'The database keeps pending work. The ID recognizes an existing row. They protect against different problems.',
      ),
      follow,
    );
  if (stage === 'durable')
    return beat(
      2,
      translate('Los pendientes ya viven fuera.', 'Pending work now lives outside.'),
      translate(
        'Añadiste una base de datos. El trabajo ya no depende de que el worker siga vivo; vamos a probarlo.',
        'You added a database. Work no longer depends on the worker staying alive; let us test it.',
      ),
      follow,
    );
  return beat(
    1,
    translate('La tienda ya ha dicho «recibido».', 'The shop already said “received”.'),
    translate(
      `${context.api} aceptó tres pagos. ${context.worker} debe revisarlos y registrarlos. Solo «Registrar pago» crea una fila.`,
      `${context.api} accepted three payments. ${context.worker} must check and record them. Only “Record payment” creates a row.`,
    ),
    follow,
  );
}
