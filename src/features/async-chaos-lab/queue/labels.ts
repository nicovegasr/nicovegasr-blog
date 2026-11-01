import { sharedLabels } from '../payment-simulation/labels';
import type { Labels } from '../payment-simulation/labels';

export const queueLabels = (es: boolean): Labels => ({
  ...sharedLabels(es),
  storage: es ? 'Memoria RAM' : 'RAM memory',
  steps: es
    ? ['Validar pago', 'Registrar pago', 'Preparar resultado']
    : ['Validate payment', 'Record payment', 'Prepare result'],
});
