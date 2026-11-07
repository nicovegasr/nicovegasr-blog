import type { AchievementId } from './achievements';
import type { PaintedPaymentLab, PaymentLabSettings, PaymentLabView } from './lab-view';
import type { SimulationConfig, SimulationRules, SimulationState, StepConfig, StepProgress } from './engine';
import type { GuideBeat, GuideContext, GuideStage } from './guide';
import type { Labels } from './labels';

export type StepPaint = {
  progress: StepProgress;
  shown: number;
  active: boolean;
  restarting: boolean;
  uncertain: boolean;
  failed: boolean;
};

/** Everything that makes one payment lab different from the other. */
export type PaymentLabDefinition = {
  defaultConfig(): SimulationConfig;
  rules: SimulationRules;
  defaultLabels(es: boolean): Labels;
  /** Stored under this key so each lab keeps its own step names. */
  stepNamesKey: string;
  firstGuideStage: GuideStage;
  diagram(lab: PaymentLabView): string;
  stepDescription(lab: PaymentLabView, step: StepConfig, index: number): string;
  stepOptions(lab: PaymentLabView, step: StepConfig, index: number): string;
  stepState(lab: PaymentLabView, index: number, paint: StepPaint): string;
  lessonStage(lab: PaymentLabView): GuideStage;
  applySetting(lab: PaymentLabSettings, key: string, input: HTMLInputElement | HTMLSelectElement): void;
  paintSystem(lab: PaintedPaymentLab): void;
  metrics(lab: PaymentLabView): string;
  feedback(lab: PaymentLabView): [string, string];
  tutorial(lab: PaymentLabView): { title: string; lines: string[] };
  incidentCall(lab: PaymentLabView): { title: string; report: string };
  guideBeat(context: GuideContext): GuideBeat;
  guideOptionalAction(lab: PaymentLabView): string;
  wonOptionalAction(lab: PaymentLabView): string;
  duplicateTitle(lab: PaymentLabView): string;
  wonCaption(lab: PaymentLabView): string;
  duplicateFooters(lab: PaymentLabView): [string, string];
  interruptedEvidence(lab: PaymentLabView): string;
  earnedAchievements(state: SimulationState): AchievementId[];
};
