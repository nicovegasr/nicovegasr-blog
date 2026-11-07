import type { Locale } from '@/i18n/locale';
import type { SimulationState } from './engine';
import { paymentGuideCopy } from './guide-copy';

export type GuideStage =
  | 'off'
  | 'ram'
  | 'storage'
  | 'durable'
  | 'identity'
  | 'safe'
  | 'partial'
  | 'charge'
  | 'email'
  | 'optimize'
  | 'efficient';
export type GuideTarget = 'storage' | 'identity' | 'charge' | 'provider' | 'steps' | null;
export type GuideContext = {
  locale: Locale;
  stage: GuideStage;
  state: SimulationState;
  playing: boolean;
  api: string;
  worker: string;
  job: string;
  chargeStep: string;
  lastStep: string;
  steps: string[];
};
export type GuideBeat = {
  chapter: number;
  title: string;
  story: string;
  task: string;
  target: GuideTarget;
};

export function guideHelpers(context: GuideContext) {
  const text = paymentGuideCopy(context.locale);
  const start = context.state.phase === 'running' ? text.pressResume : text.pressStart;
  const follow = context.playing ? text.followGreenPaymentAndAction : start;
  const beat = (
    chapter: number,
    title: string,
    story: string,
    task: string,
    target: GuideTarget = null,
  ): GuideBeat => ({ chapter, title, story, task, target });
  return { follow, beat };
}
