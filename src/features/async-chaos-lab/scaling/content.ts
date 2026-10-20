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
      ? ['Validar pago', 'Cobrar en Stripe', 'Activar cuenta', 'Enviar confirmación']
      : ['Validate payment', 'Charge in Stripe', 'Activate account', 'Send confirmation'],
    jobs: Array.from({ length: 24 }, (_, index) => `${es ? 'Pago' : 'Payment'} #${index + 1}`),
  };
}
export function callCopy(_scene: 'intro', names: Names, es: boolean) {
  const t = (a: string, b: string) => es ? a : b;
  return {
    title: t('Todo funciona. Demasiado despacio.', 'It works. Too slowly.'),
    report: t(
      `Han llegado 24 pagos a ${names.api}. Están guardados, pero con un solo ${names.worker} los clientes van a esperar. ¿Nos ayudas a acelerar esto?`,
      `24 payments arrived at ${names.api}. They are stored safely, but with one ${names.worker}, customers face a long wait. Can you speed this up?`,
    ),
    hint: t(
      'Añade workers y prepara la capacidad de sus servicios antes de arrancar. Si un servicio recibe más trabajo del que puede atender, se cae y la cadena se para.',
      'Add workers and prepare service capacity before starting. If a service receives more work than it can handle, it goes down and the chain stops.',
    ),
    action: t('Déjame ver el sistema', 'Show me the system'),
  };
}
