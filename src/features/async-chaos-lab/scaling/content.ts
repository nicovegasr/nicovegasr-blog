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
  const translate = (achievement: string, clickedButton: string) => es ? achievement : clickedButton;
  return {
    title: translate('Todo funciona. Demasiado despacio.', 'It works. Too slowly.'),
    report: translate(
      `Han llegado 24 pagos a ${names.api}. Están guardados, pero con un solo ${names.worker} los clientes van a esperar. ¿Nos ayudas a acelerar esto?`,
      `24 payments arrived at ${names.api}. They are stored safely, but with one ${names.worker}, customers face a long wait. Can you speed this up?`,
    ),
    hint: translate(
      'Hay dos límites. Si las plazas simultáneas están llenas, el worker conserva su pago y espera antes de enviar. Los servicios HTTP tienen además una cuota por segundo: superarla devuelve un 429 y detiene el ensayo, aunque haya plazas libres. El servicio no se cae. Un worker puede llevar varios pagos a la vez: mientras espera una respuesta atiende otro, pero solo valida uno cada vez.',
      'There are two limits. If concurrent slots are full, the worker holds its payment and waits before sending. HTTP services also have a per-second quota: exceeding it returns a 429 and stops the trial, even with free slots. The service does not go down. A worker can hold several payments at once: while awaiting a reply it serves another, but it validates only one at a time.',
    ),
    action: translate('Déjame ver el sistema', 'Show me the system'),
  };
}
export function stepControlsCopy(es: boolean) {
  const translate = (achievement: string, clickedButton: string) => es ? achievement : clickedButton;
  return {
    waiting: translate('Esperando turno', 'Waiting for a slot'),
    concurrentSlots: translate('Plazas simultáneas', 'Concurrent slots'),
    reduceCapacity: translate('Reducir capacidad del paso', 'Reduce capacity of step'),
    expandCapacity: translate('Ampliar capacidad del paso', 'Expand capacity of step'),
    httpQuota: translate('Cuota HTTP / s', 'HTTP quota / s'),
    reduceQuota: translate('Reducir cuota HTTP del paso', 'Reduce HTTP quota of step'),
    expandQuota: translate('Ampliar cuota HTTP del paso', 'Expand HTTP quota of step'),
  };
}
