import { momentsCopy } from './moments-copy';
import type { Locale } from '@/i18n/locale';
import type { MomentStage } from './moment-stage';

type Action = { readonly label: string; readonly next: number };
export type MomentFrame = {
  readonly badge: string;
  readonly detail: string;
  readonly note: string;
  readonly tone?: 'success' | 'blocked';
  readonly previous?: string;
  readonly actions: readonly Action[];
};
export type Moment = {
  readonly title: string;
  readonly frames: readonly MomentFrame[];
};

// Small, local scenarios. Nothing is uploaded or saved outside this card.
export function momentFor(stage: MomentStage, locale: Locale): Moment | undefined {
  const text = momentsCopy(locale);
  switch (stage) {
    case 'kiss':
      return {
        title: text.oneInputDifferentFormats,
        frames: [
          {
            badge: 'stock.json',
            detail: text.chooseSupplier,
            note: text.eachSendsItsOwnJson,
            actions: [
              { label: text.northSupplier, next: 1 },
              { label: text.southSupplier, next: 2 },
            ],
          },
          {
            badge: text.northSupplier,
            detail: text.a12345673Units,
            note: text.itsReaderTranslatesItInto,
            tone: 'success',
            actions: [{ label: text.trySouth, next: 2 }],
          },
          {
            badge: text.southSupplier,
            detail: text.a12345673Units,
            note: text.differentFormatSameInventoryRecord,
            tone: 'success',
            actions: [{ label: text.tryNorth, next: 1 }],
          },
        ],
      };
    case 'srp':
      return {
        title: text.oneRuleForEveryone,
        frames: [
          {
            badge: 'ABC123',
            detail: text.northValidSouthValid,
            note: text.forNowCodeOnlyNeeds,
            actions: [{ label: text.require8Characters, next: 1 }],
          },
          {
            badge: 'ABC123 · 6 / 8',
            detail: text.northRejectedSouthRejected,
            note: text.recordRuleChangesReadersStay,
            tone: 'blocked',
            actions: [],
          },
        ],
      };
    case 'immutability':
      return {
        title: text.cleanRetry,
        frames: [
          {
            badge: 'stock.json',
            detail: text.failedTimeout,
            note: text.fileCouldNotBeRead,
            actions: [{ label: text.retry, next: 1 }],
          },
          {
            badge: 'stock.json',
            detail: text.completedNoError,
            previous: text.previousFailedTimeout,
            note: text.newObjectPreviousOneKeeps,
            tone: 'success',
            actions: [],
          },
        ],
      };
    case 'cohesion':
      return {
        title: text.momentInCatalog,
        frames: [
          {
            badge: text.ceramicMug,
            detail: text.listed3Units,
            note: text.fromAdministrationDashboard,
            actions: [{ label: text.discontinue, next: 1 }],
          },
          {
            badge: text.ceramicMug,
            detail: text.listed3Units,
            note: text.unitsRemainProductStaysListed,
            tone: 'blocked',
            actions: [{ label: text.sell3Units, next: 2 }],
          },
          {
            badge: text.ceramicMug,
            detail: text.listedOutOfStock,
            note: text.itCanNowBeDiscontinued,
            actions: [{ label: text.discontinue, next: 3 }],
          },
          {
            badge: text.ceramicMug,
            detail: text.discontinuedOutOfStock,
            note: text.itNoLongerAppearsAmong,
            tone: 'success',
            actions: [],
          },
        ],
      };
    case 'coupling':
      return {
        title: text.sameReportAnotherDestination,
        frames: [
          {
            badge: 'inventario.csv',
            detail: text.readyToArchive,
            note: text.reportContentIsAlreadyCalculated,
            actions: [
              { label: text.saveToObjectStorage, next: 1 },
              { label: text.saveToLocalArchive, next: 2 },
            ],
          },
          {
            badge: 'inventario.csv',
            detail: text.savedToObjectStorage,
            note: text.destinationChangesReportStaysSame,
            tone: 'success',
            actions: [{ label: text.useLocalArchive, next: 2 }],
          },
          {
            badge: 'inventario.csv',
            detail: text.savedToLocalArchive,
            note: text.anotherDestinationSameContent,
            tone: 'success',
            actions: [{ label: text.useObjectStorage, next: 1 }],
          },
        ],
      };
    case 'async-retries':
      return {
        title: text.responseGetsLost,
        frames: [
          {
            badge: 'informe-042.csv',
            detail: text.waitingToBeArchived,
            note: text.oneStableKeyForEvery,
            actions: [{ label: text.archiveReport, next: 1 }],
          },
          {
            badge: 'informe-042.csv',
            detail: text.timeout1FileAtDestination,
            note: text.itWasSavedButConfirmation,
            tone: 'blocked',
            actions: [{ label: text.retry, next: 2 }],
          },
          {
            badge: 'informe-042.csv',
            detail: text.confirmed1FileAtDestination,
            note: text.sameKeyOverwritesFileNo,
            tone: 'success',
            actions: [],
          },
        ],
      };
    default:
      return undefined;
  }
}
