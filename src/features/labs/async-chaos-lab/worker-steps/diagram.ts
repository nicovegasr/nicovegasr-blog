import type { PaymentLabView } from '../payment-simulation/lab-view';
import { editor, jobRows, namingControl, workerJourney } from '../payment-simulation/markup';
import type { ActionKind, StepConfig } from '../payment-simulation/engine';
import { isExternal, isSafeToRepeat } from '../payment-simulation/engine';
import { labFigure } from '../shared/figures';
import { escapeHtml } from '../shared/text';
import { workerStepsCopy } from './copy';

export function workerStepsDiagram(lab: PaymentLabView) {
  return /* HTML */ `<div class="lab-ready-queue">
      <span>✓ ${workerStepsCopy(lab.locale).paymentsInIndependentDatabaseRecovery}</span>
      <div class="lab-extra-names">
        ${editor('api', lab.labels.api, workerStepsCopy(lab.locale).intakeName)}${editor('storage', lab.labels.storage, workerStepsCopy(lab.locale).storageName)}
      </div>
    </div>
    <div class="lab-payments-header">
      <div class="lab-job-strip">${jobRows(lab)}</div>
      ${namingControl(lab)}
    </div>
    <section class="lab-worker-interior">
      <header>
        ${labFigure('worker')}
        <div>
          <span class="lab-eyebrow">${workerStepsCopy(lab.locale).insideTheWorker}</span
          >${editor('worker', lab.labels.worker, workerStepsCopy(lab.locale).workerName)}
        </div>
        <div class="lab-active-job" data-active-job></div>
      </header>
      ${workerJourney(lab)}
      <div class="lab-worker-steps" data-steps></div>
    </section>`;
}

function actionNature(lab: PaymentLabView, kind: ActionKind) {
  return workerStepsCopy(lab.locale).actionNature[kind];
}

function kindLabel(lab: PaymentLabView, kind: ActionKind) {
  return workerStepsCopy(lab.locale).kindLabel[kind];
}

export const stepNature = (lab: PaymentLabView, step: StepConfig) =>
  /* HTML */ `<p class="lab-step-nature ${isExternal(step.kind) ? 'has-external' : ''}">
    ${actionNature(lab, step.kind)}
  </p>`;

export const stepOptions = (lab: PaymentLabView, step: StepConfig, index: number) =>
  /* HTML */ `<div class="lab-step-options">
    <label
      ><input type="checkbox" data-setting="remember-${index}" ${step.remember ? 'checked' : ''} />
      ${workerStepsCopy(lab.locale).saveProgressAfterConfirmation}</label
    >
    <button type="button" class="lab-step-configure" popovertarget="lab-step-options-${index}">
      ${workerStepsCopy(lab.locale).configureStep} ↗
    </button>
    <div class="lab-step-editor" id="lab-step-options-${index}" popover="auto" data-step-editor="${index}">
      <header>
        <strong>${escapeHtml(lab.step(index))}</strong
        ><button
          type="button"
          popovertarget="lab-step-options-${index}"
          popovertargetaction="hide"
          aria-label="${workerStepsCopy(lab.locale).closeOptions}"
        >
          ×
        </button>
      </header>
      <small class="lab-step-tradeoff"
        >${isSafeToRepeat(step.kind) ? workerStepsCopy(lab.locale).optionalHereSavesRepeatedWork : workerStepsCopy(lab.locale).avoidsRepeatingItIfMarkerSaved}</small
      ><label class="lab-kind-label"
        >${workerStepsCopy(lab.locale).thisStepDoesPlaceholder}<select data-setting="kind-${index}">
          ${(['check', 'set-state', 'append', 'external', 'notify'] as ActionKind[]).map((kind) => /* HTML */ `<option value="${kind}" ${step.kind === kind ? 'selected' : ''}>${kindLabel(lab, kind)}</option>`).join('')}
        </select></label
      >${
        isExternal(step.kind)
          ? /* HTML */ `<p>${workerStepsCopy(lab.locale).letsTheWorkerSkipThisStep}</p>`
          : step.kind === 'append'
            ? /* HTML */ `<p>${workerStepsCopy(lab.locale).localButAddingRowChangesResult}</p>`
            : /* HTML */ `<p>${workerStepsCopy(lab.locale).thisActionIsSafeToRepeat}</p>`
      }
    </div>
    ${
      isExternal(step.kind)
        ? /* HTML */ `<label class="lab-provider-option"
            ><input
              type="checkbox"
              data-setting="provider-${index}"
              aria-describedby="lab-provider-hint-${index}"
              ${step.providerDeduplication ? 'checked' : ''}
            /><span
              >${workerStepsCopy(lab.locale).deduplicateAtTheServiceByKey}<small
                class="lab-provider-hint"
                id="lab-provider-hint-${index}"
                >${workerStepsCopy(lab.locale).coversTimeoutAtService}</small
              ></span
            ></label
          >`
        : ''
    }
  </div>`;
