import type { ScalingState } from './engine';

export type TeamPose = 'idle' | 'working' | 'waiting-cpu' | 'waiting-slot' | 'waiting-service' | 'rejected' | 'paused' | 'done';

/** Waiting for admission and waiting for a reply both retain worker ownership. */
export function teamWorkerFrame(state: ScalingState, worker: number) {
  const job = state.jobs.find((candidate) => candidate.worker === worker);
  let pose: TeamPose;
  if (job?.status === 'rejected') pose = 'rejected';
  else if (state.phase === 'complete') pose = 'done';
  else if (!job) pose = 'idle';
  else if (state.phase === 'paused' || state.phase === 'rate-limited') pose = 'paused';
  else if (job.status === 'waiting') pose = job.step === 0 ? 'waiting-cpu' : 'waiting-slot';
  else pose = job.step === 0 ? 'working' : 'waiting-service';
  return { pose, job: job?.id ?? null, step: job?.step ?? null };
}
