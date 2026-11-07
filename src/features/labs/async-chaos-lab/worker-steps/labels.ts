import { sharedLabels } from '../payment-simulation/labels';
import type { Labels } from '../payment-simulation/labels';

export const workerStepsLabels = (es: boolean): Labels => ({
  ...sharedLabels(es),
  storage: es ? 'Base de datos' : 'Database',
  steps: es
    ? ['Validar formato', 'Cobrar en Stripe', 'Activar suscripción', 'Enviar confirmación']
    : ['Validate format', 'Charge in Stripe', 'Activate subscription', 'Send confirmation'],
});
