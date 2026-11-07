import { JOB_COUNT } from './engine';

export type Labels = {
  api: string;
  storage: string;
  worker: string;
  jobs: string[];
  steps: string[];
};

/** Payment names shared by both payment labs: «Pago #1», «Payment #1»… */
export const numberedPayments = (word: string) =>
  Array.from({ length: JOB_COUNT }, (_, index) => `${word} #${index + 1}`);
