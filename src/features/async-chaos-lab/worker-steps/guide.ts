import { isExternal } from '../payment-simulation/engine';
import { guideHelpers } from '../payment-simulation/guide';
import type { GuideBeat, GuideContext } from '../payment-simulation/guide';

export function workerStepsGuideBeat(context: GuideContext): GuideBeat {
  const { t: translate, follow, beat } = guideHelpers(context);
  const { state: state, stage } = context;
  if (state.phase === 'won' && stage !== 'optimize')
    return beat(
      4,
      translate('Los tres pagos terminaron.', 'All three payments finished.'),
      state.events.some(
        (event) =>
          event.kind === 'provider-dedup' && event.job === 3 && event.step === 3,
      )
        ? translate(
            'El proveedor reconoció el mismo ID y evitó volver a enviar el email. Guardar avances locales no bastaba para esa caída.',
            'The provider recognized the same ID and avoided sending the email again. Saving local progress was not enough for that crash.',
          )
        : state.wasted
        ? translate(
            'El cobro no se duplicó. Algunas acciones seguras se repitieron: puedes comparar si compensa guardar también su avance.',
            'The charge was not duplicated. Some safe actions ran again: compare whether saving their progress is worthwhile.',
          )
        : translate(
            'El worker retomó lo pendiente y saltó las acciones que ya tenía guardadas.',
            'The worker resumed pending work and skipped actions whose progress was saved.',
          ),
      translate(
        'Puedes terminar el recorrido y conservar esta configuración.',
        'Finish the walkthrough and keep this configuration.',
      ),
    );
  if (state.phase === 'incident')
    return beat(
      stage === 'partial' ? 1 : 3,
      state.incident === 'email-uncertain'
        ? translate(
            'Timeout: el email pudo llegar; no recibimos confirmación.',
            'Timeout: the email may have arrived; we got no confirmation.',
          )
        : translate('Cobrado. Todavía sin activar.', 'Charged. Still inactive.'),
      translate(
        state.incident === 'email-uncertain'
          ? `${context.job}: el servicio pudo aceptar el email, pero se perdió su respuesta por timeout. Reintentar puede duplicarlo; no reintentar puede dejar al cliente sin confirmación.`
          : `${context.job} quedó a medias. Los pasos con ✓ ya terminaron; reiniciar el worker no deshace esos resultados.`,
        state.incident === 'email-uncertain'
          ? `${context.job}: the service may have accepted the email, but its response timed out. Retrying may duplicate it; not retrying may leave the customer without confirmation.`
          : `${context.job} stopped halfway. Steps marked ✓ finished; restarting the worker does not undo those results.`,
      ),
      translate(
        'Pulsa «Reprocesar pago» y observa qué se ejecuta otra vez.',
        'Press “Reprocess payment” and watch what runs again.',
      ),
    );
  if (stage === 'email')
    return beat(
      3,
      translate('El timeout deja el envío en duda.', 'The timeout leaves delivery uncertain.'),
      translate(
        `La solicitud de «${context.lastStep}» agotó el tiempo de espera. El servicio pudo enviar el email, pero su respuesta no llegó al worker y no se guardó la marca. Reintentar sin deduplicación puede duplicarlo.`,
        `The “${context.lastStep}” request timed out. The service may have sent the email, but its response never reached the worker, so no marker was saved. Retrying without deduplication can send it twice.`,
      ),
      state.config.steps[3]?.providerDeduplication
        ? translate(
            'El proveedor reconoce el mismo ID. Inicia otro ensayo para comprobar que solo registra un envío.',
            'The provider recognizes the same ID. Start another trial to check that it records only one send.',
          )
        : translate(
            `Activa la deduplicación por clave en el servicio de correo.`,
            `Enable key-based deduplication at the email service.`,
          ),
      state.config.steps[3]?.providerDeduplication ? null : 'provider',
    );
  if (stage === 'charge')
    return beat(
      2,
      translate('Recuerda la acción que ya terminó.', 'Remember the completed action.'),
      translate(
        'En esta prueba el cobro terminó antes de la caída. Guardar su avance permitirá saltarlo en el siguiente intento.',
        'In this trial the charge finished before the crash. Saving its progress will let the next attempt skip it.',
      ),
      translate(
        `Activa «Guardar avance al recibir confirmación» en «${context.chargeStep}».`,
        `Enable “Save progress after confirmation” on “${context.chargeStep}”.`,
      ),
      'charge',
    );
  if (state.phase === 'duplicate')
    return beat(
      3,
      translate('El reintento duplicó un efecto.', 'The retry duplicated an effect.'),
      translate(
        `«${context.steps[state.step] ?? context.lastStep}» produjo un efecto para ${context.job}, pero se perdió la confirmación antes de guardar el avance local. Al reintentar, el efecto se aplicó otra vez.`,
        `“${context.steps[state.step] ?? context.lastStep}” produced an effect for ${context.job}, but confirmation was lost before local progress was saved. The retry applied it again.`,
      ),
      isExternal(state.config.steps[state.step]?.kind ?? 'check')
        ? translate(
            `Activa la deduplicación por clave en el proveedor y repite el ensayo.`,
            `Enable key-based deduplication at the provider and run the trial again.`,
          )
        : translate(
            'Cambia cómo se protege este efecto antes de repetir el ensayo.',
            'Change how this effect is protected before running the trial again.',
          ),
      isExternal(state.config.steps[state.step]?.kind ?? 'check') ? 'provider' : null,
    );
  if (stage === 'optimize')
    return beat(
      4,
      translate(
        'Repetirlo es seguro. ¿Compensa hacerlo?',
        'Repeating it is safe. Is it worth it?',
      ),
      translate(
        'Validar los mismos datos o fijar el mismo estado puede repetirse aquí. Recordar su avance ahorra trabajo a cambio de guardar más información.',
        'Checking the same data or setting the same state can repeat here. Saving progress saves work at the cost of more stored information.',
      ),
      translate(
        'Marca los otros pasos si quieres comparar. Es una mejora opcional.',
        'Mark the other steps if you want to compare. This improvement is optional.',
      ),
      'steps',
    );
  if (stage === 'efficient')
    return beat(
      4,
      translate('Retomar en lugar de repetir.', 'Resume instead of repeating.'),
      translate(
        'El worker guardará qué acciones terminaron por cada ID. Fíjate en ↷ cuando recupere un pago.',
        'The worker will save completed actions for each ID. Watch for ↷ when it recovers a payment.',
      ),
      follow,
    );
  if (stage === 'safe')
    return beat(
      3,
      translate(
        'Esta vez reconocerá el cobro.',
        'This time it will recognize the charge.',
      ),
      translate(
        'Guardará la marca cuando termine el cobro. Tras la caída de este escenario, podrá saltarlo y seguir con lo que falte.',
        'It will save a marker once the charge finishes. After this scenario’s crash, it can skip it and continue with the remaining work.',
      ),
      follow,
    );
  return beat(
    1,
    translate(
      'Un pago. Cuatro acciones distintas.',
      'One payment. Four different actions.',
    ),
    translate(
      'El worker valida, cobra, activa la cuenta y envía un email. Algunas acciones cambian algo que sigue existiendo aunque el worker se pare.',
      'The worker validates, charges, activates the account and sends an email. Some actions change something that remains even if the worker stops.',
    ),
    follow,
  );
}
