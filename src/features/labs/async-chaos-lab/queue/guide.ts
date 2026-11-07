import { queueGuideCopy } from './guide-copy';
import { guideHelpers } from '../payment-simulation/guide';
import type { GuideBeat, GuideContext } from '../payment-simulation/guide';

export function queueGuideBeat(context: GuideContext): GuideBeat {
  const { follow, beat } = guideHelpers(context);
  const text = queueGuideCopy(context.locale);
  const { state: state, stage } = context;
  if (state.phase === 'won')
    return beat(
      4,
      text.threePaymentsOneRecordPer,
      text.pendingPaymentsSurvivedCrashReturning,
      text.keepExperimentingWithThisConfiguration,
    );
  if (state.phase === 'incident')
    return beat(
      stage === 'safe' ? 4 : state.incident === 'ack-retry' ? 3 : 2,
      state.incident === 'ack-retry' ? text.recordExistsConfirmationFailed : text.workerCrashedPendingWorkIs,
      state.incident === 'ack-retry'
        ? text.alreadyHasRowButRemains(context.job)
        : text.hadNotBeenRecordedYet(context.job),
      text.pressReprocessPaymentToSee,
    );
  if (stage === 'storage')
    return beat(2, text.keepCopyOutsideWorker, text.ramHeldOnlyCopyOf, text.underWhereTheyWaitChoose, 'storage');
  if (stage === 'identity')
    return beat(
      3,
      text.recognizeReturningPayment,
      state.phase === 'duplicate' ? text.endedUpWithTwoRows(context.job) : text.sameIdCanReturnEven,
      text.underIfPaymentReturnsChoose,
      'identity',
    );
  if (state.phase === 'lost')
    return beat(1, text.acceptanceDidNotKeepThem, text.firstPaymentIsRecordedOther, text.changeDesignSoPendingWork);
  if (state.phase === 'duplicate')
    return beat(3, text.samePaymentWasRecordedAgain, text.itsFirstRowWasStill, text.changeHowWorkerHandlesReturning);
  if (stage === 'safe') return beat(4, text.twoChoicesWorkTogether, text.databaseKeepsPendingWorkId, follow);
  if (stage === 'durable') return beat(2, text.pendingWorkNowLivesOutside, text.youAddedDatabaseWorkNo, follow);
  return beat(
    1,
    text.shopAlreadySaidReceived,
    text.acceptedThreePaymentsMustCheck(context.api, context.worker),
    follow,
  );
}
