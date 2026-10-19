export type Scene =
  'intro' | 'stripe' | 'admission' | 'rejections' | 'database' | 'help';
export type Names = {
  api: string;
  queue: string;
  worker: string;
  steps: string[];
  jobs: string[];
};
export function scalingNames(es: boolean): Names {
  return {
    api: es ? 'API de pagos' : 'Payment API',
    queue: es ? 'Pagos pendientes' : 'Pending payments',
    worker: 'PaymentProcessor',
    steps: es
      ? [
          'Validar pago',
          'Cobrar en Stripe',
          'Activar cuenta',
          'Enviar confirmación',
        ]
      : [
          'Validate payment',
          'Charge in Stripe',
          'Activate account',
          'Send confirmation',
        ],
    jobs: Array.from(
      { length: 24 },
      (_, index) => `${es ? 'Pago' : 'Payment'} #${index + 1}`,
    ),
  };
}
export function callCopy(scene: Scene, names: Names, es: boolean) {
  const t = (a: string, b: string) => (es ? a : b);
  const copies = {
    intro: {
      title: t('Todo funciona. Demasiado despacio.', 'It works. Too slowly.'),
      report: t(
        `Han entrado 24 pagos de golpe por ${names.api}. No se pierden ni se cobran dos veces, pero con un solo ${names.worker} los últimos clientes van a esperar un buen rato.`,
        `24 payments just arrived through ${names.api}. They will not be lost or charged twice, but with one ${names.worker}, the last customers face a long wait.`,
      ),
      hint: t(
        'Primero míralo trabajar. Después añade workers sobre el diagrama y compara.',
        'Watch it work first. Then add workers on the diagram and compare.',
      ),
      action: t('Vamos a ver qué pasa', 'Let’s see what happens'),
    },
    stripe: {
      title: t('Más manos. La misma puerta.', 'More hands. The same doorway.'),
      report: t(
        `Mira ${names.steps[1]}: Stripe solo atiende 3 pagos a la vez. Los que esperan siguen ocupando un worker. Añadir más ya no abre esa puerta.`,
        `Look at ${names.steps[1]}: Stripe handles only 3 payments at once. Waiting payments still occupy a worker. Adding more will not widen that doorway.`,
      ),
      hint: t(
        'Ahora puedes controlar cada paso. Prueba un límite menor, quita la espera o amplía el servicio de Stripe. Cada decisión cambia el recorrido.',
        'You can now control each step. Try a lower limit, bypass the waiting gate, or expand the Stripe service. Each choice changes the flow.',
      ),
      action: t('Ver dónde esperan', 'Show the waiting payments'),
    },
    admission: {
      title: t(
        'Tenemos más plazas. Seguimos usando tres.',
        'More slots. Still only using three.',
      ),
      report: t(
        `Hemos ampliado Stripe, pero ${names.steps[1]} sigue dejando pasar solo 3 pagos a la vez. El servicio tiene sitio; esta vez la espera la estamos poniendo nosotros.`,
        `We expanded Stripe, but ${names.steps[1]} still admits only 3 payments at once. The service has room; this time our own limit is creating the wait.`,
      ),
      hint: t(
        'Revisa «Máximo a la vez» en ese paso y repite. Ampliar un servicio y permitir usar su capacidad son decisiones distintas.',
        'Review “Max at once” for that step and retry. Expanding a service and allowing your application to use it are different decisions.',
      ),
      action: t('Ajustar el paso', 'Tune the step'),
    },
    rejections: {
      title: t(
        'Ahora también tenemos que repetir trabajo.',
        'Now we have to retry work too.',
      ),
      report: t(
        'Hemos enviado peticiones sin esperar una plaza. El servicio rechazó las que no podía atender. Esos pagos conservan su worker y esperan antes de volver a intentarlo.',
        'We sent requests without waiting for a slot. The service rejected what it could not handle. Those payments keep their worker and wait before retrying.',
      ),
      hint: t(
        'No hemos duplicado cobros: el rechazo ocurrió antes de la operación. Pero las esperas de reintento cuestan tiempo. Prueba a recuperar el control del paso.',
        'No duplicate charges: rejection happened before the operation. But retry delays cost time. Try restoring admission control for that step.',
      ),
      action: t('Revisar ese paso', 'Inspect that step'),
    },
    database: {
      title: t(
        'Desatascamos una puerta. Aparece otra.',
        'One doorway cleared. Another appears.',
      ),
      report: t(
        `Stripe ya admite más pagos, pero ${names.steps[2]} solo dispone de 2 plazas en la BDD. Ahora llegan antes de lo que podemos activarlos. La espera se ha desplazado.`,
        `Stripe now accepts more payments, but ${names.steps[2]} has only 2 database slots. Payments now arrive faster than we can activate them. The waiting line has moved.`,
      ),
      hint: t(
        'La barra muestra escrituras concurrentes, no bloqueos de filas. Limitar cuántas entran no garantiza por sí solo que una actualización sea correcta.',
        'The bar shows concurrent writes, not row locks. Limiting how many enter does not by itself make an update correct.',
      ),
      action: t('Mirar las activaciones', 'Inspect activations'),
    },
    help: {
      title: t(
        'Una cola, distintas velocidades.',
        'One queue, different speeds.',
      ),
      report: t(
        'Cada worker lleva un pago por los cuatro pasos. Verde: está trabajando. Ámbar: espera una plaza. Coral: una petición rechazada que volverá a intentarse.',
        'Each worker carries one payment through all four steps. Green: working. Amber: waiting for a slot. Coral: a rejected request waiting to retry.',
      ),
      hint: t(
        'Pausa para cambiar el equipo o un paso; cada cambio prepara otro intento. Los ensayos terminados quedan en la comparación. El reloj es simulado: la velocidad de reproducción no cambia el resultado.',
        'Pause to change the team or a step; each change prepares a new attempt. Completed trials stay in the comparison. The clock is simulated: playback speed never changes the result.',
      ),
      action: t('Volver a la película', 'Back to the action'),
    },
  };
  return copies[scene];
}

export function resourceExplanation(
  index: number,
  names: Names,
  es: boolean,
  stripeCapacity = 3,
) {
  const esCopy = [
    `${names.steps[0]} usa CPU durante 1 s. Hay 4 unidades compartidas: añadir workers no crea más CPU. Los demás esperan turno.`,
    `Cada cobro ocupa una plaza durante 3 s. Stripe admite ${stripeCapacity} llamadas a la vez, no por segundo. «Máximo a la vez» decide cuántas dejamos entrar.`,
    `${names.steps[2]} escribe durante 1 s. El pool admite 2 escrituras a la vez. Esperar una plaza y resolver una carrera de datos son problemas distintos.`,
    `${names.steps[3]} tarda 1 s. El proveedor admite 5 envíos simultáneos. Se mantiene la protección por ID; aquí solo probamos rendimiento y admisión.`,
  ];
  const enCopy = [
    `${names.steps[0]} uses CPU for 1 s. There are 4 shared units: adding workers does not create more CPU. The others wait their turn.`,
    `Each charge occupies a slot for 3 s. Stripe accepts ${stripeCapacity} calls at once, not per second. “Max at once” decides how many we let in.`,
    `${names.steps[2]} writes for 1 s. The pool admits 2 concurrent writes. Waiting for a slot and resolving a data race are different problems.`,
    `${names.steps[3]} takes 1 s. The provider accepts 5 concurrent sends. Stable-ID protection remains enabled; this lab only tests performance and admission.`,
  ];
  return (es ? esCopy : enCopy)[index]!;
}
