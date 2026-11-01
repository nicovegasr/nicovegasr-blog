import type { AchievementId } from './achievements';
import type { PaymentLab } from './controller';
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
  diagram(lab: PaymentLab): string;
  stepDescription(lab: PaymentLab, step: StepConfig, index: number): string;
  stepOptions(lab: PaymentLab, step: StepConfig, index: number): string;
  stepState(lab: PaymentLab, index: number, paint: StepPaint): string;
  lessonStage(lab: PaymentLab): GuideStage;
  applySetting(lab: PaymentLab, key: string, input: HTMLInputElement | HTMLSelectElement): void;
  paintSystem(lab: PaymentLab): void;
  metrics(lab: PaymentLab): string;
  feedback(lab: PaymentLab): [string, string];
  tutorial(lab: PaymentLab): { title: string; lines: string[] };
  incidentCall(lab: PaymentLab): { title: string; report: string };
  guideBeat(context: GuideContext): GuideBeat;
  guideOptionalAction(lab: PaymentLab): string;
  wonOptionalAction(lab: PaymentLab): string;
  duplicateTitle(lab: PaymentLab): string;
  wonCaption(lab: PaymentLab): string;
  duplicateFooters(lab: PaymentLab): [string, string];
  interruptedEvidence(lab: PaymentLab): string;
  earnedAchievements(state: SimulationState): AchievementId[];
};
