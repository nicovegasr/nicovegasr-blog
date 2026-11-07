import { JOB_COUNT } from './engine';
export type Labels = {
  api: string;
  storage: string;
  worker: string;
  jobs: string[];
  steps: string[];
};
export const sharedLabels = (es: boolean) => ({
  api: es ? 'API de pagos' : 'Payment API',
  worker: 'PaymentAsyncProcess',
  jobs: Array.from({ length: JOB_COUNT }, (_, index) => `${es ? 'Pago' : 'Payment'} #${index + 1}`),
});
