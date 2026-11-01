import { guideHelpers } from '../payment-simulation/guide';
import type { GuideBeat, GuideContext } from '../payment-simulation/guide';

export function queueGuideBeat(c: GuideContext): GuideBeat {
  const { t, follow, beat } = guideHelpers(c);
  const { state: s, stage } = c;
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
