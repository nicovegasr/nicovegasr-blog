import { isExternal } from '../payment-simulation/engine';
import { guideHelpers } from '../payment-simulation/guide';
import type { GuideBeat, GuideContext } from '../payment-simulation/guide';

export function workerStepsGuideBeat(c: GuideContext): GuideBeat {
  const { t, follow, beat } = guideHelpers(c);
  const { state: s, stage } = c;
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
