import type { Locale } from '@/i18n/locale';
import type { Card, IncidentKind } from './engine';
import type { HintKey } from './guide';
import { englishCopy } from './copy-en';
import { spanishCopy } from './copy-es';

export interface CardCopy {
  readonly label: string;
  /** The name of the choice in the table that compares attempts. */
  readonly shortLabel: string;
  readonly description: string;
  /** The Java on the back of the card: the same lines it drops into the method. */
  readonly code: string;
}

export interface ChallengeCopy {
  readonly title: string;
  /** One sentence. The lesson comes from what the player sees, not from this text. */
  readonly mission: string;
  /** How much history the logs cover, shown under app_logs so the volume reads at a glance. */
  readonly period?: string;
  /** Shown once the three stars are won. */
  readonly takeaway: string;
}

type Text = { readonly title: string; readonly text: string };

export interface LabCopy {
  readonly numberLocale: string;
  readonly thousandsSeparator: string;
  readonly millions: string;
  readonly underATenthOfASecond: string;
  readonly page: {
    readonly description: string;
    readonly challenges: string;
    readonly challengeButton: (id: number, title: string) => string;
    readonly objectivesLabel: string;
    readonly tutorial: string;
    readonly codeLabel: string;
    readonly stageLabel: string;
    readonly backpack: string;
    readonly readGroup: string;
    readonly writeGroup: string;
    readonly newCard: string;
    readonly placedCard: string;
    readonly cardCode: string;
    readonly flipCard: (label: string) => string;
    readonly stop: string;
    readonly briefingHeading: string;
    readonly briefingNote: string;
    readonly start: string;
    readonly resultLabel: string;
    readonly attemptsCaption: string;
    readonly attemptColumns: readonly [string, string, string, string, string, string];
    readonly retry: string;
    readonly nextChallenge: string;
    readonly skipTutorial: string;
    readonly next: string;
    readonly withoutJavaScript: string;
  };
  readonly controls: {
    readonly run: string;
    readonly completeTheCode: string;
    readonly pause: string;
    readonly resume: string;
    readonly attention: string;
    readonly continue: string;
    readonly gotIt: string;
    readonly okay: string;
    readonly step: (current: number, total: number) => string;
  };
  readonly code: {
    readonly readHole: string;
    readonly writeHole: string;
    readonly dropHere: string;
    readonly smallerBatch: string;
    readonly biggerBatch: string;
    readonly remove: (label: string) => string;
  };
  readonly cards: Readonly<Record<Card, CardCopy>>;
  readonly challenges: Readonly<Record<number, ChallengeCopy>>;
  readonly challengeOf: (id: number, total: number) => string;
  readonly challengeHeading: (id: number, title: string) => string;
  readonly facts: {
    readonly backpack: (size: string) => string;
    readonly query: (duration: string) => string;
    readonly incidents: Readonly<Record<IncidentKind, string>>;
  };
  readonly incidents: Readonly<Record<IncidentKind, { readonly warning: string; readonly title: string; readonly text: string; readonly tip: string }>>;
  readonly hints: Readonly<Record<HintKey, string>>;
  readonly objectives: {
    readonly survive: string;
    readonly seconds: (limit: string) => string;
    readonly megabytes: (limit: string) => string;
    readonly 'write-trips': (limit: string) => string;
    readonly connection: (limit: string) => string;
  };
  readonly live: { readonly dead: string; readonly full: (percent: number) => string };
  readonly result: {
    readonly killed: string;
    readonly perfect: string;
    readonly partial: string;
    readonly peak: (megabytes: string) => string;
    readonly logsReviewed: (count: string) => string;
    readonly trips: (count: string) => string;
    readonly inARow: (duration: string) => string;
    readonly batchesOf: (size: string) => string;
  };
  readonly waiting: Readonly<Record<'read' | 'write' | 'run', string>>;
  readonly tutorial: Readonly<Record<string, Text>>;
  readonly tips: {
    readonly newCard: (label: string) => Text;
    readonly dial: Text;
    readonly incident: (text: string) => Text;
  };
}

const COPY_BY_LOCALE: Readonly<Record<Locale, LabCopy>> = { es: spanishCopy, en: englishCopy };

export const copyFor = (locale: Locale): LabCopy => COPY_BY_LOCALE[locale];
