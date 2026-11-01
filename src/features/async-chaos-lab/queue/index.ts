import { definePaymentLab } from '../payment-simulation/controller';
import { queueLab } from './lab';

definePaymentLab(queueLab);
