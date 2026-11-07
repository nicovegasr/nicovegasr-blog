import { workerStepsNarrationCopy } from './narration-copy';
import type { PaymentLabView } from '../payment-simulation/lab-view';
import { isExternal } from '../payment-simulation/engine';
import { escapeHtml } from '../shared/text';
import { workerStepsConfig } from './rules';

export const usesCustomSteps = (lab: PaymentLabView) =>
  lab.config.steps.some(
    (step, index) =>
      lab.step(index) !== lab.defaults.steps[index] || step.kind !== workerStepsConfig().steps[index]?.kind,
  );

export function workerStepsFeedback(lab: PaymentLabView): [string, string] {
  const text = workerStepsNarrationCopy(lab.locale);
  const state = lab.state,
    job = escapeHtml(lab.job(Math.max(state.active, 0))),
    step = escapeHtml(lab.step(state.step)),
    previous = escapeHtml(lab.step(Math.max(0, state.step - 1)));
  if (lab.retryStage)
    return lab.retryStage === 'failure'
      ? [
          text.incidentHappenedAtStep(state.step + 1),
          state.incident === 'email-uncertain'
            ? text.noConfirmationArrivedSendMay(step)
            : text.didNotCompleteEarlierSteps(step),
        ]
      : [text.restartingWorkerSamePayment, text.returningToStartOfEarlier(job)];
  if (state.phase === 'duplicate')
    return [
      text.youDuplicatedEffects,
      !usesCustomSteps(lab) && state.step === 1
        ? text.youChargedTwiceFirstCharge(job)
        : isExternal(lab.config.steps[state.step]?.kind ?? 'check') && lab.config.steps[state.step]?.remember
          ? text.producedTwoEffectsForResponse(step, job)
          : text.producedTwoEffectsForRestarting(step, job),
    ];
  if (state.phase === 'incident') {
    if (state.incident === 'activation-failed')
      return [
        text.systemInconsistency,
        !usesCustomSteps(lab)
          ? text.youChargedButItsSubscription(job)
          : text.finishedButWorkerCrashedBefore(previous, step, job),
      ];
    if (state.incident === 'email-uncertain')
      return [
        usesCustomSteps(lab) ? text.actionMayHaveCompleted : text.emailRequestTimedOutIt,
        usesCustomSteps(lab) ? text.requestForTimedOutFor(step, job) : text.emailServiceMayHaveAccepted,
      ];
    return [text.effectHappenedItsMarkerWas, text.alreadyProducedItsEffectFor(step, job)];
  }
  if (state.phase === 'won') {
    const wasted = state.events.filter(
      // The final retry is necessary when its completion marker was lost.
      (event) => event.job === 3 && event.kind === 'wasted' && event.step < lab.config.steps.length - 1,
    ).length;
    return [
      text.allThreePaymentsComplete,
      wasted
        ? text.youCompletedPaymentsWithoutDuplicating(escapeHtml(lab.job(2)), wasted)
        : text.youSkippedPreviouslyResolvedSteps(state.skipped),
    ];
  }
  if (state.phase === 'ready')
    return [
      text.paymentCanStopHalfway,
      usesCustomSteps(lab) ? text.threePaymentsAreSavedWorker : text.threePaymentsAreSavedIn,
    ];
  return [
    lab.playing ? text.processing(lab.job(Math.max(state.active, 0))) : text.processingPaused,
    text.followPaymentThroughWorkerSteps,
  ];
}

export function workerStepsTutorial(lab: PaymentLabView) {
  const text = workerStepsNarrationCopy(lab.locale);
  return {
    title: text.paymentIsSavedNowFinish,
    lines: [text.paymentsAreAlreadySavedNow, text.externalStepsShowTwoProtections, text.restartingWorkerDoesNotRefund],
  };
}

export function workerStepsIncidentCall(lab: PaymentLabView): { title: string; report: string } {
  const text = workerStepsNarrationCopy(lab.locale);
  const state = lab.state,
    job = lab.job(Math.max(0, state.active)),
    step = lab.step(state.step);
  if (state.phase === 'duplicate')
    return {
      title: text.weHaveDuplicateResult,
      report:
        !usesCustomSteps(lab) && state.step === 1
          ? text.customerForJustWroteTo(job)
          : text.appearsTwiceForNoNew(step, job),
    };
  if (!usesCustomSteps(lab) && state.incident === 'activation-failed')
    return {
      title: text.theyPaidAndCannotGet,
      report: text.customerForJustWroteYou(job),
    };
  if (!usesCustomSteps(lab) && state.incident === 'email-uncertain')
    return {
      title: text.timeoutEmailMayHaveArrived,
      report: text.emailServiceMayHaveAcceptedCall,
    };
  return {
    title: text.paymentStoppedHalfway,
    report: text.wasPassedToMeBecause(job, step),
  };
}
