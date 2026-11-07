import { defineCopy } from '@/i18n/copy';
import { numberedPayments } from '../payment-simulation/labels';
import type { Labels } from '../payment-simulation/labels';

const es: Labels = {
  api: 'API de pagos',
  worker: 'PaymentAsyncProcess',
  jobs: numberedPayments('Pago'),
  storage: 'Base de datos',
  steps: ['Validar formato', 'Cobrar en Stripe', 'Activar suscripción', 'Enviar confirmación'],
};

const en: Labels = {
  api: 'Payment API',
  worker: 'PaymentAsyncProcess',
  jobs: numberedPayments('Payment'),
  storage: 'Database',
  steps: ['Validate format', 'Charge in Stripe', 'Activate subscription', 'Send confirmation'],
};

export const workerStepsLabels = defineCopy({ es, en });
