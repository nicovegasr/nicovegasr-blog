import { JOB_COUNT } from './engine';
export type Labels = {
  api: string;
  storage: string;
  worker: string;
  jobs: string[];
  steps: string[];
};
export function defaultLabels(level: 1 | 2, es: boolean): Labels {
  return {
    api: es ? 'API de pagos' : 'Payment API',
    storage:
      level === 1
        ? es
          ? 'Memoria RAM'
          : 'RAM memory'
        : es
          ? 'Base de datos'
          : 'Database',
    worker: 'PaymentAsyncProcess',
    jobs: Array.from(
      { length: JOB_COUNT },
      (_, i) => `${es ? 'Pago' : 'Payment'} #${i + 1}`,
    ),
    steps:
      level === 1
        ? es
          ? ['Validar pago', 'Registrar pago', 'Preparar resultado']
          : ['Validate payment', 'Record payment', 'Prepare result']
        : es
          ? [
              'Validar formato',
              'Cobrar en Stripe',
              'Activar suscripción',
              'Enviar confirmación',
            ]
          : [
              'Validate format',
              'Charge in Stripe',
              'Activate subscription',
              'Send confirmation',
            ],
  };
}
export const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
export const cleanLabel = (value: unknown, fallback: string) =>
  typeof value === 'string' && value.trim()
    ? value.trim().slice(0, 64)
    : fallback;
