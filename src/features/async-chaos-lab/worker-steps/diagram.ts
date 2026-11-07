import type { PaymentLab } from '../payment-simulation/controller';
import { editor, jobRows, namingControl, workerJourney } from '../payment-simulation/markup';
import type { ActionKind, StepConfig } from '../payment-simulation/engine';
import { isExternal, isSafeToRepeat } from '../payment-simulation/engine';
import { labFigure } from '../shared/figures';
import { escapeHtml } from '../shared/text';
import { workerStepsCopy } from './copy';

export function workerStepsDiagram(lab: PaymentLab) {
  return /* HTML */ `<div class="lab-ready-queue">
      <span>✓ ${workerStepsCopy(lab.es).paymentsInIndependentDatabaseRecovery}</span>
      <div class="lab-extra-names">
        ${editor('api', lab.labels.api, workerStepsCopy(lab.es).intakeName)}${editor('storage', lab.labels.storage, workerStepsCopy(lab.es).storageName)}
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
          <span class="lab-eyebrow">${workerStepsCopy(lab.es).insideTheWorker}</span
          >${editor('worker', lab.labels.worker, workerStepsCopy(lab.es).workerName)}
        </div>
        <div class="lab-active-job" data-active-job></div>
      </header>
      ${workerJourney(lab)}
      <div class="lab-worker-steps" data-steps></div>
    </section>`;
}

function actionNature(lab: PaymentLab, kind: ActionKind) {
  return lab.inLocale(
    {
      check: 'Validación pura · sin efectos externos',
      'set-state': 'Estado local · repetible',
      append: 'Registro local · no debe duplicarse',
      external: 'Efecto externo · no debe duplicarse',
      notify: 'Notificación externa · no debe duplicarse',
    }[kind],
    {
      check: 'Pure check · no external effects',
      'set-state': 'Local state · repeatable',
      append: 'Local record · must not duplicate',
      external: 'External effect · must not duplicate',
      notify: 'External notification · must not duplicate',
    }[kind],
  );
}

function kindLabel(lab: PaymentLab, kind: ActionKind) {
  return lab.inLocale(
    {
      check: 'Comprobar datos (repetible)',
      external: 'Crear un efecto externo',
      'set-state': 'Fijar el mismo estado local (repetible)',
      append: 'Añadir un registro local (no repetible)',
      notify: 'Enviar una notificación externa',
    }[kind],
    {
      check: 'Check data (repeatable)',
      external: 'Create an external effect',
      'set-state': 'Set the same local state (repeatable)',
      append: 'Append a local record (not repeatable)',
      notify: 'Send an external notification',
    }[kind],
  );
}

export const stepNature = (lab: PaymentLab, step: StepConfig) =>
  /* HTML */ `<p class="lab-step-nature ${isExternal(step.kind) ? 'has-external' : ''}">
    ${actionNature(lab, step.kind)}
  </p>`;

export const stepOptions = (lab: PaymentLab, step: StepConfig, index: number) =>
  /* HTML */ `<div class="lab-step-options">
    <label
      ><input type="checkbox" data-setting="remember-${index}" ${step.remember ? 'checked' : ''} />
      ${workerStepsCopy(lab.es).saveProgressAfterConfirmation}</label
    >
    <button type="button" class="lab-step-configure" popovertarget="lab-step-options-${index}">
      ${workerStepsCopy(lab.es).configureStep} ↗
    </button>
    <div class="lab-step-editor" id="lab-step-options-${index}" popover="auto" data-step-editor="${index}">
      <header>
        <strong>${escapeHtml(lab.step(index))}</strong
        ><button
          type="button"
          popovertarget="lab-step-options-${index}"
          popovertargetaction="hide"
          aria-label="${workerStepsCopy(lab.es).closeOptions}"
        >
          ×
        </button>
      </header>
      <small class="lab-step-tradeoff"
        >${isSafeToRepeat(step.kind) ? workerStepsCopy(lab.es).optionalHereSavesRepeatedWork : workerStepsCopy(lab.es).avoidsRepeatingItIfMarkerSaved}</small
      ><label class="lab-kind-label"
        >${workerStepsCopy(lab.es).thisStepDoesPlaceholder}<select data-setting="kind-${index}">
          ${(['check', 'set-state', 'append', 'external', 'notify'] as ActionKind[]).map((kind) => /* HTML */ `<option value="${kind}" ${step.kind === kind ? 'selected' : ''}>${kindLabel(lab, kind)}</option>`).join('')}
        </select></label
      >${
        isExternal(step.kind)
          ? /* HTML */ `<p>${workerStepsCopy(lab.es).letsTheWorkerSkipThisStep}</p>`
          : step.kind === 'append'
            ? /* HTML */ `<p>${workerStepsCopy(lab.es).localButAddingRowChangesResult}</p>`
            : /* HTML */ `<p>${workerStepsCopy(lab.es).thisActionIsSafeToRepeat}</p>`
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
              >${workerStepsCopy(lab.es).deduplicateAtTheServiceByKey}<small
                class="lab-provider-hint"
                id="lab-provider-hint-${index}"
                >${workerStepsCopy(lab.es).coversTimeoutAtService}</small
              ></span
            ></label
          >`
        : ''
    }
  </div>`;
