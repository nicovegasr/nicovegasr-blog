import type { PaymentLab } from '../payment-simulation/controller';
import type { ActionKind, StepConfig } from '../payment-simulation/engine';
import { isExternal, isSafeToRepeat } from '../payment-simulation/engine';
import { labFigure } from '../shared/figures';
import { escapeHtml as esc } from '../shared/text';

export function workerStepsDiagram(lab: PaymentLab) {
  return /* HTML */ `<div class="qs-ready-queue">
      <span
        >✓
        ${lab.t('Pagos en BDD independiente · recuperación preparada', 'Payments in independent DB · recovery ready')}</span
      >
      <div class="qs-extra-names">
        ${lab.editor('api', lab.labels.api, lab.t('Nombre de la entrada', 'Intake name'))}${lab.editor('storage', lab.labels.storage, lab.t('Nombre del almacenamiento', 'Storage name'))}
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
            >${lab.t('DENTRO DEL WORKER', 'INSIDE THE WORKER')}</span
          >${lab.editor('worker', lab.labels.worker, lab.t('Nombre del worker', 'Worker name'))}
        </div>
        <div class="qs-active-job" data-active-job></div>
      </header>
      ${lab.workerJourney()}
      <div class="qs-worker-steps" data-steps></div>
    </section>`;
}

function actionNature(lab: PaymentLab, kind: ActionKind) {
  return lab.t(
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
  return lab.t(
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

export const stepOptions = (lab: PaymentLab, step: StepConfig, i: number) =>
  /* HTML */ `<div class="qs-step-options">
    <label
      ><input
        type="checkbox"
        data-setting="remember-${i}"
        ${step.remember ? 'checked' : ''}
      />
      ${lab.t('Guardar avance al recibir confirmación', 'Save progress after confirmation')}</label
    >
    <button type="button" class="qs-step-configure" popovertarget="qs-step-options-${i}">${lab.t('Configurar paso', 'Configure step')} ↗</button>
    <div class="qs-step-editor" id="qs-step-options-${i}" popover="auto" data-step-editor="${i}">
      <header><strong>${esc(lab.step(i))}</strong><button type="button" popovertarget="qs-step-options-${i}" popovertargetaction="hide" aria-label="${lab.t('Cerrar opciones', 'Close options')}">×</button></header>
      <small class="qs-step-tradeoff"
        >${isSafeToRepeat(step.kind) ? lab.t('Opcional aquí: ahorra repetir trabajo.', 'Optional here: saves repeated work.') : lab.t('Evita repetirlo si su marca llegó a guardarse.', 'Avoids repeating it if its marker was saved.')}</small
      ><label class="qs-kind-label"
        >${lab.t('Este paso hace…', 'This step does…')}<select
          data-setting="kind-${i}"
        >
          ${(['check', 'set-state', 'append', 'external', 'notify'] as ActionKind[]).map((kind) => /* HTML */ `<option value="${kind}" ${step.kind === kind ? 'selected' : ''}>${kindLabel(lab, kind)}</option>`).join('')}
        </select></label
      >${
        isExternal(step.kind)
          ? /* HTML */ `<p>${lab.t('Permite saltar este paso cuando llegó su confirmación y guardamos la marca.', 'Lets the worker skip this step after confirmation was received and saved.')}</p>`
          : step.kind === 'append'
            ? /* HTML */ `<p>
                ${lab.t('Es local, pero añadir otra fila cambia el resultado. La idempotencia también importa dentro de tu sistema.', 'It is local, but adding another row changes the result. Idempotency also matters inside your system.')}
              </p>`
            : /* HTML */ `<p>
                ${lab.t('Esta acción concreta puede repetirse con seguridad. No necesita deduplicación del proveedor.', 'This particular action is safe to repeat. It does not need receiver deduplication.')}
              </p>`
      }
    </div>
    ${isExternal(step.kind) ? /* HTML */ `<label class="qs-provider-option"><input type="checkbox" data-setting="provider-${i}" aria-describedby="qs-provider-hint-${i}" ${step.providerDeduplication ? 'checked' : ''} /><span>${lab.t('Deduplicar en el servicio por clave (simulado)', 'Deduplicate at the service by key (simulated)')}<small class="qs-provider-hint" id="qs-provider-hint-${i}">${lab.t('Cubre el timeout: el servicio reconoce la misma clave aunque se pierda su respuesta.', 'Covers a timeout: the service recognizes the same key even if its response is lost.')}</small></span></label>` : ''}
  </div>`;
