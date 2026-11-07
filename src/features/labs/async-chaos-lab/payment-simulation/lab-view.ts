import type { Locale } from '@/i18n/locale';
import type { AchievementId } from './achievements';
import type { paymentCopy } from './copy';
import type { PaymentLabDefinition } from './definition';
import type { SimulationConfig, SimulationState } from './engine';
import type { GuideStage } from './guide';
import type { Labels } from './labels';

export type RetryStage = 'failure' | 'restart';

/** What templates and narration may read. They cannot change the lab. */
export interface PaymentLabView {
  readonly definition: PaymentLabDefinition;
  readonly locale: Locale;
  readonly copy: ReturnType<typeof paymentCopy>;
  readonly config: Readonly<SimulationConfig>;
  readonly state: Readonly<SimulationState>;
  readonly labels: Readonly<Labels>;
  readonly defaults: Readonly<Labels>;
  readonly runId: number;
  readonly guide: GuideStage;
  readonly playing: boolean;
  readonly retryStage: RetryStage | undefined;
  readonly speed: number;
  readonly inspected: number;
  readonly personalizing: boolean;
  readonly notices: readonly AchievementId[];
  name(key: 'api' | 'storage' | 'worker'): string;
  job(index: number): string;
  step(index: number): string;
}

/** Painters write the lab's DOM from its view, never its state. */
export type PaintedPaymentLab = PaymentLabView &
  HTMLElement & {
    element<T extends HTMLElement = HTMLElement>(selector: string): T;
    replace(selector: string, html: string): boolean;
  };

/** What a lab's own settings may change. */
export interface PaymentLabSettings {
  readonly locale: Locale;
  readonly config: SimulationConfig;
  guide: GuideStage;
  syncStorageName(): void;
  buildSteps(): void;
  element<T extends HTMLElement = HTMLElement>(selector: string): T;
  querySelectorAll<E extends Element = Element>(selectors: string): NodeListOf<E>;
}
