import { queueNarrationCopy } from './narration-copy';
import type { PaymentLabView } from '../payment-simulation/lab-view';
import { totals } from '../payment-simulation/engine';
import { escapeHtml } from '../shared/text';

export function queueFeedback(lab: PaymentLabView): [string, string] {
  const text = queueNarrationCopy(lab.locale);
  const state = lab.state,
    job = escapeHtml(lab.job(Math.max(state.active, 0)));
  if (state.phase === 'lost')
    return [text.youLostData, text.firstPaymentIsRecordedOther(totals(state).lost, escapeHtml(lab.name('worker')))];
  if (state.phase === 'duplicate') return [text.thisPaymentHasTwoRecords, text.wasAlreadyRecordedItsStatus(job)];
  if (state.phase === 'won') return [text.threePaymentsThreeRecords, text.pendingPaymentsSurvivedCrashReturning];
  if (state.phase === 'incident')
    return state.incident === 'ack-retry'
      ? [text.recordedButStillPending, text.alreadyHasRowConfirmationMarking(job)]
      : [text.workerCrashedPaymentsAreStill, text.wasNotYetRecordedDatabase(job)];
  if (state.phase === 'ready') return [text.threePaymentsToRecord, text.shopAlreadySaidReceivedNow];
  const action =
    state.cursor === 'ack'
      ? text.rowExistsPaymentStillNeeds
      : state.step === 1
        ? lab.config.protectLocalRecord
          ? text.checkIdIfItAlready
          : text.createRowWithoutCheckingWhether
        : state.step === 0
          ? text.checkDataThisStepCreates
          : text.prepareResultRepeatingThisStep;
  return [lab.playing ? text.processing(lab.job(Math.max(state.active, 0))) : text.paused, action];
}

export function queueTutorial(lab: PaymentLabView) {
  const text = queueNarrationCopy(lab.locale);
  return {
    title: text.threePaymentsShallWeGet,
    lines: [text.workerWillPickThemUp, text.youDecideWhereTheyWait, text.andIfSameIdComes],
  };
}

export function queueIncidentCall(lab: PaymentLabView): { title: string; report: string } {
  const text = queueNarrationCopy(lab.locale);
  const state = lab.state,
    job = lab.job(Math.max(0, state.active));
  if (state.phase === 'lost')
    return {
      title: text.customersAreWaiting,
      report: text.customersAreAskingAboutTheir(totals(state).lost),
    };
  if (state.phase === 'duplicate')
    return {
      title: text.thisPaymentAppearsTwice,
      report: text.heyAppearsTwiceInRegister(job),
    };
  if (state.incident === 'worker-retry')
    return {
      title: text.customerIsStillWaiting,
      report: text.heyCustomerForWantsTo(job),
    };
  return {
    title: text.thisPaymentIsShowingAs,
    report: text.isShowingAsPendingBut(job),
  };
}
