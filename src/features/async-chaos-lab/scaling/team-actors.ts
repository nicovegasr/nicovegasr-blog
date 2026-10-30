import type { Payment, ScalingState } from './engine';

export type TeamPose = 'idle' | 'working' | 'waiting-cpu' | 'waiting-slot' | 'waiting-service' | 'rejected' | 'paused' | 'done';

/** The pose follows the payment that best explains what the worker is doing now. */
function representativePayment(payments: Payment[]) {
  return payments.find((job) => job.status === 'rejected')
    ?? payments.find((job) => job.status === 'running' && job.step === 0)
    ?? payments.find((job) => job.status === 'running')
    ?? payments[0];
}

/** Waiting for admission and waiting for a reply both retain worker ownership. */
export function teamWorkerFrame(state: ScalingState, worker: number) {
  const payments = state.jobs.filter((candidate) => candidate.worker === worker);
  const job = representativePayment(payments);
  let pose: TeamPose;
  if (job?.status === 'rejected') pose = 'rejected';
  else if (state.phase === 'complete') pose = 'done';
  else if (!job) pose = 'idle';
  else if (state.phase === 'paused' || state.phase === 'rate-limited') pose = 'paused';
  else if (job.status === 'waiting') pose = job.step === 0 ? 'waiting-cpu' : 'waiting-slot';
  else pose = job.step === 0 ? 'working' : 'waiting-service';
  return { pose, job: job?.id ?? null, step: job?.step ?? null, load: payments.length };
}
