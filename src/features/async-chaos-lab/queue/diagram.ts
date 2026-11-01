import type { PaymentLab } from '../payment-simulation/controller';
import { labFigure } from '../shared/figures';

export function queueDiagram(lab: PaymentLab) {
  return /* HTML */ `<div class="qs-diagram">
    <div class="qs-api-stack">
      ${lab.namingControl()}
      <section class="qs-api">
        ${labFigure('api')}<span class="qs-eyebrow">API</span
        >${lab.editor('api', lab.labels.api, lab.t('Nombre de la entrada', 'Intake name'))}<strong
          >202</strong
        >
        <p>
          ${lab.t('Recibido. Falta registrarlo.', 'Received. Still to be recorded.')}
        </p>
      </section>
    </div>
    <span class="qs-arrow" aria-hidden="true">→</span>
    <div class="qs-process" data-process>
      <span class="qs-boundary" data-boundary></span>
      <section class="qs-store">
        <div class="qs-node-heading">
          <span data-store-figure
            >${labFigure(lab.config.storage === 'ram' ? 'ram' : 'db')}</span
          >
          <div>
            <span class="qs-eyebrow"
              >${lab.t('PAGOS PENDIENTES', 'PENDING PAYMENTS')}</span
            >${lab.editor('storage', lab.labels.storage, lab.t('Nombre del almacenamiento', 'Storage name'))}
          </div>
        </div>
        <label class="qs-node-setting"
          ><span class="qs-setting-title"
            >${lab.t('Dónde esperan', 'Where they wait')}</span
          ><select data-setting="storage">
            <option value="ram">
              ${lab.t('RAM del worker', 'Worker RAM')}
            </option>
            <option value="db">${lab.t('Base de datos', 'Database')}</option>
          </select></label
        >
        <p class="qs-choice-note" data-storage-note></p>
        <div class="qs-array">${lab.jobRows()}</div>
      </section>
      <span class="qs-arrow" aria-hidden="true">→</span>
      <section class="qs-worker">
        <div class="qs-node-heading">
          ${labFigure('worker')}
          <div>
            <span class="qs-eyebrow">WORKER</span
            >${lab.editor('worker', lab.labels.worker, lab.t('Nombre del worker', 'Worker name'))}
          </div>
        </div>
        <label class="qs-node-setting"
          ><span class="qs-setting-title"
            >${lab.t('Si el pago vuelve', 'If the payment returns')}</span
          ><select data-setting="protect">
            <option value="off">
              ${lab.t('No comprobar su ID', 'Do not check its ID')}
            </option>
            <option value="on">
              ${lab.t('Comprobar su ID', 'Check its ID')}
            </option>
          </select></label
        >
        <p class="qs-choice-note" data-protection-note></p>
        <div class="qs-active-job" data-active-job></div>
        ${lab.workerJourney()}
        <div class="qs-worker-steps" data-steps></div>
      </section>
    </div>
  </div>`;
}
