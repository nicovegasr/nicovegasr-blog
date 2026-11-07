import { defineCopy } from '@/i18n/copy';
import type { Locale } from '@/i18n/locale';

export type Names = {
  api: string;
  queue: string;
  worker: string;
  steps: string[];
  jobs: string[];
};

const numberedPayments = (word: string) => Array.from({ length: 24 }, (_, index) => `${word} #${index + 1}`);

const defaultNames = defineCopy<Names>({
  es: {
    api: 'API de pagos',
    queue: 'Pagos pendientes',
    worker: 'PaymentProcessor',
    steps: ['Validar pago', 'Cobrar en Stripe', 'Activar cuenta', 'Enviar confirmación'],
    jobs: numberedPayments('Pago'),
  },
  en: {
    api: 'Payment API',
    queue: 'Pending payments',
    worker: 'PaymentProcessor',
    steps: ['Validate payment', 'Charge in Stripe', 'Activate account', 'Send confirmation'],
    jobs: numberedPayments('Payment'),
  },
});

/** A fresh copy each time: players rename these. */
export const scalingNames = (locale: Locale): Names => structuredClone(defaultNames(locale));

const introCall = defineCopy({
  es: {
    title: 'Todo funciona. Demasiado despacio.',
    report: (names: Names) =>
      `Han llegado 24 pagos a ${names.api}. Están guardados, pero con un solo ${names.worker} los clientes van a esperar. ¿Nos ayudas a acelerar esto?`,
    hint: 'Hay dos límites. Si las plazas simultáneas están llenas, el worker conserva su pago y espera antes de enviar. Los servicios HTTP tienen además una cuota por segundo: superarla devuelve un 429 y detiene el ensayo, aunque haya plazas libres. El servicio no se cae. Un worker puede llevar varios pagos a la vez: mientras espera una respuesta atiende otro, pero solo valida uno cada vez.',
    action: 'Déjame ver el sistema',
  },
  en: {
    title: 'It works. Too slowly.',
    report: (names: Names) =>
      `24 payments arrived at ${names.api}. They are stored safely, but with one ${names.worker}, customers face a long wait. Can you speed this up?`,
    hint: 'There are two limits. If concurrent slots are full, the worker holds its payment and waits before sending. HTTP services also have a per-second quota: exceeding it returns a 429 and stops the trial, even with free slots. The service does not go down. A worker can hold several payments at once: while awaiting a reply it serves another, but it validates only one at a time.',
    action: 'Show me the system',
  },
});

export function callCopy(_scene: 'intro', names: Names, locale: Locale) {
  const copy = introCall(locale);
  return { title: copy.title, report: copy.report(names), hint: copy.hint, action: copy.action };
}

export const stepControlsCopy = defineCopy({
  es: {
    waiting: 'Esperando turno',
    concurrentSlots: 'Plazas simultáneas',
    reduceCapacity: 'Reducir capacidad del paso',
    expandCapacity: 'Ampliar capacidad del paso',
    httpQuota: 'Cuota HTTP / s',
    reduceQuota: 'Reducir cuota HTTP del paso',
    expandQuota: 'Ampliar cuota HTTP del paso',
  },
  en: {
    waiting: 'Waiting for a slot',
    concurrentSlots: 'Concurrent slots',
    reduceCapacity: 'Reduce capacity of step',
    expandCapacity: 'Expand capacity of step',
    httpQuota: 'HTTP quota / s',
    reduceQuota: 'Reduce HTTP quota of step',
    expandQuota: 'Expand HTTP quota of step',
  },
});
