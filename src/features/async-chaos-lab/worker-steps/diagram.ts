import type { PaymentLab } from '../payment-simulation/controller';
import type { ActionKind, StepConfig } from '../payment-simulation/engine';
import { isExternal, isSafeToRepeat } from '../payment-simulation/engine';
import { labFigure } from '../shared/figures';
import { escapeHtml } from '../shared/text';
import { workerStepsCopy } from './copy';

export function workerStepsDiagram(lab: PaymentLab) {
  return /* HTML */ `<div class="qs-ready-queue">
      <span
        >✓
        ${workerStepsCopy(lab.es).paymentsInIndependentDbrecovery}</span
      >
      <div class="qs-extra-names">
        ${lab.editor('api', lab.labels.api, workerStepsCopy(lab.es).intakeName)}${lab.editor('storage', lab.labels.storage, workerStepsCopy(lab.es).storageName)}
      </div>
    </div>
    <div class="qs-payments-header">
      <div class="qs-job-strip">${lab.jobRows()}</div>
      ${lab.namingControl()}
    </div>
    <section class="qs-worker-interior">
      <header>
        ${labFigure('worker')}
        <div>
          <span class="qs-eyebrow"
            >${workerStepsCopy(lab.es).insideTheworker}</span
          >${lab.editor('worker', lab.labels.worker, workerStepsCopy(lab.es).workerName)}
        </div>
        <div class="qs-active-job" data-active-job></div>
      </header>
      ${lab.workerJourney()}
      <div class="qs-worker-steps" data-steps></div>
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
  /* HTML */ `<p class="qs-step-nature ${isExternal(step.kind) ? 'has-external' : ''}">${actionNature(lab, step.kind)}</p>`;

export const stepOptions = (lab: PaymentLab, step: StepConfig, index: number) =>
  /* HTML */ `<div class="qs-step-options">
    <label
      ><input
        type="checkbox"
        data-setting="remember-${index}"
        ${step.remember ? 'checked' : ''}
      />
      ${workerStepsCopy(lab.es).saveProgressAfterConfirmation}</label
    >
    <button type="button" class="qs-step-configure" popovertarget="qs-step-options-${index}">${workerStepsCopy(lab.es).configureStep} ↗</button>
    <div class="qs-step-editor" id="qs-step-options-${index}" popover="auto" data-step-editor="${index}">
      <header><strong>${escapeHtml(lab.step(index))}</strong><button type="button" popovertarget="qs-step-options-${index}" popovertargetaction="hide" aria-label="${workerStepsCopy(lab.es).closeOptions}">×</button></header>
      <small class="qs-step-tradeoff"
        >${isSafeToRepeat(step.kind) ? workerStepsCopy(lab.es).optionalHereSavesRepeatedWork : workerStepsCopy(lab.es).avoidsRepeatingItIfIts}</small
      ><label class="qs-kind-label"
        >${workerStepsCopy(lab.es).thisStepDoes}<select
          data-setting="kind-${index}"
        >
          ${(['check', 'set-state', 'append', 'external', 'notify'] as ActionKind[]).map((kind) => /* HTML */ `<option value="${kind}" ${step.kind === kind ? 'selected' : ''}>${kindLabel(lab, kind)}</option>`).join('')}
        </select></label
      >${
        isExternal(step.kind)
          ? /* HTML */ `<p>${workerStepsCopy(lab.es).letsTheWorkerSkipThis}</p>`
          : step.kind === 'append'
            ? /* HTML */ `<p>
                ${workerStepsCopy(lab.es).itIsLocalButAdding}
              </p>`
            : /* HTML */ `<p>
                ${workerStepsCopy(lab.es).thisParticularActionIsSafe}
              </p>`
      }
    </div>
    ${isExternal(step.kind) ? /* HTML */ `<label class="qs-provider-option"><input type="checkbox" data-setting="provider-${index}" aria-describedby="qs-provider-hint-${index}" ${step.providerDeduplication ? 'checked' : ''} /><span>${workerStepsCopy(lab.es).deduplicateAtTheServiceBy}<small class="qs-provider-hint" id="qs-provider-hint-${index}">${workerStepsCopy(lab.es).coversTimeoutAtService}</small></span></label>` : ''}
  </div>`;
