import { workerStepsGuideCopy } from './guide-copy';
import { isExternal } from '../payment-simulation/engine';
import { guideHelpers } from '../payment-simulation/guide';
import type { GuideBeat, GuideContext } from '../payment-simulation/guide';

export function workerStepsGuideBeat(context: GuideContext): GuideBeat {
  const { follow, beat } = guideHelpers(context);
  const text = workerStepsGuideCopy(context.locale);
  const { state: state, stage } = context;
  if (state.phase === 'won' && stage !== 'optimize')
    return beat(
      4,
      text.allThreePaymentsFinished,
      state.events.some((event) => event.kind === 'provider-dedup' && event.job === 3 && event.step === 3)
        ? text.providerRecognizedSameIdAnd
        : state.wasted
          ? text.chargeWasNotDuplicatedSome
          : text.workerResumedPendingWorkAnd,
      text.finishWalkthroughAndKeepThis,
    );
  if (state.phase === 'incident')
    return beat(
      stage === 'partial' ? 1 : 3,
      state.incident === 'email-uncertain' ? text.timeoutEmailMayHaveArrived : text.chargedStillInactive,
      state.incident === 'email-uncertain' ? text.emailTimedOutJob(context.job) : text.jobStoppedHalfway(context.job),
      text.pressReprocessPaymentAndWatch,
    );
  if (stage === 'email')
    return beat(
      3,
      text.timeoutLeavesDeliveryUncertain,
      text.requestTimedOutServiceMay(context.lastStep),
      state.config.steps[3]?.providerDeduplication
        ? text.providerRecognizesSameIdStart
        : text.enableKeyBasedDeduplicationAt,
      state.config.steps[3]?.providerDeduplication ? null : 'provider',
    );
  if (stage === 'charge')
    return beat(
      2,
      text.rememberCompletedAction,
      text.inThisTrialChargeFinished,
      text.enableSaveProgressAfterConfirmation(context.chargeStep),
      'charge',
    );
  if (state.phase === 'duplicate')
    return beat(
      3,
      text.retryDuplicatedEffect,
      text.producedEffectForButConfirmation(context.steps[state.step] ?? context.lastStep, context.job),
      isExternal(state.config.steps[state.step]?.kind ?? 'check')
        ? text.enableKeyBasedDeduplicationAt2
        : text.changeHowThisEffectIs,
      isExternal(state.config.steps[state.step]?.kind ?? 'check') ? 'provider' : null,
    );
  if (stage === 'optimize')
    return beat(4, text.repeatingItIsSafeIs, text.checkingSameDataOrSetting, text.markOtherStepsIfYou, 'steps');
  if (stage === 'efficient') return beat(4, text.resumeInsteadOfRepeating, text.workerWillSaveCompletedActions, follow);
  if (stage === 'safe') return beat(3, text.thisTimeItWillRecognize, text.itWillSaveMarkerOnce, follow);
  return beat(1, text.onePaymentFourDifferentActions, text.workerValidatesChargesActivatesAccount, follow);
}
