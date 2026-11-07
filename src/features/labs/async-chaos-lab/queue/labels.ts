import { defineCopy } from '@/i18n/copy';
import { numberedPayments } from '../payment-simulation/labels';
import type { Labels } from '../payment-simulation/labels';

const es: Labels = {
  api: 'API de pagos',
  worker: 'PaymentAsyncProcess',
  jobs: numberedPayments('Pago'),
  storage: 'Memoria RAM',
  steps: ['Validar pago', 'Registrar pago', 'Preparar resultado'],
};

const en: Labels = {
  api: 'Payment API',
  worker: 'PaymentAsyncProcess',
  jobs: numberedPayments('Payment'),
  storage: 'RAM memory',
  steps: ['Validate payment', 'Record payment', 'Prepare result'],
};

export const queueLabels = defineCopy({ es, en });
