import type { SimulationState } from './engine';

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
export type GuideTarget =
  | 'storage'
  | 'identity'
  | 'charge'
  | 'provider'
  | 'steps'
  | null;
export type GuideContext = {
  es: boolean;
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

export function guideHelpers(c: GuideContext) {
  const t = (es: string, en: string) => (c.es ? es : en);
  const start =
    c.state.phase === 'running'
      ? t('Pulsa «Continuar».', 'Press “Resume”.')
      : t('Pulsa «Iniciar».', 'Press “Start”.');
  const follow = c.playing
    ? t(
        'Sigue el pago verde y la acción que se está ejecutando.',
        'Follow the green payment and the action currently running.',
      )
    : start;
  const beat = (
    chapter: number,
    title: string,
    story: string,
    task: string,
    target: GuideTarget = null,
  ): GuideBeat => ({ chapter, title, story, task, target });
  return { t, follow, beat };
}
