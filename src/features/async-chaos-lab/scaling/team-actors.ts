import type { ScalingState } from './engine';

export type TeamPose = 'idle' | 'working' | 'waiting-cpu' | 'waiting-service' | 'interrupted' | 'paused' | 'done';

/** A service outage interrupts its callers; it does not kill worker processes. */
export function teamWorkerFrame(state: ScalingState, worker: number) {
  const job = state.jobs.find((candidate) => candidate.worker === worker);
  let pose: TeamPose;
  if (job?.status === 'failed') pose = 'interrupted';
  else if (state.phase === 'complete') pose = 'done';
  else if (!job) pose = 'idle';
  else if (state.phase === 'paused' || state.phase === 'blocked') pose = 'paused';
  else if (job.status === 'waiting') pose = 'waiting-cpu';
  else pose = job.step === 0 ? 'working' : 'waiting-service';
  return { pose, job: job?.id ?? null, step: job?.step ?? null };
}
