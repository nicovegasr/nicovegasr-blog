import type { PaymentLab } from '../payment-simulation/controller';
import { labFigure } from '../shared/figures';
import { queueCopy } from './copy';

export function queueDiagram(lab: PaymentLab) {
  return /* HTML */ `<div class="qs-diagram">
    <div class="qs-api-stack">
      ${lab.namingControl()}
      <section class="qs-api">
        ${labFigure('api')}<span class="qs-eyebrow">API</span
        >${lab.editor('api', lab.labels.api, queueCopy(lab.es).intakeName)}<strong
          >202</strong
        >
        <p>
          ${queueCopy(lab.es).receivedStillToBeRecorded}
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
              >${queueCopy(lab.es).pendingPayments}</span
            >${lab.editor('storage', lab.labels.storage, queueCopy(lab.es).storageName)}
          </div>
        </div>
        <label class="qs-node-setting"
          ><span class="qs-setting-title"
            >${queueCopy(lab.es).whereTheyWait}</span
          ><select data-setting="storage">
            <option value="ram">
              ${queueCopy(lab.es).workerRam}
            </option>
            <option value="db">${queueCopy(lab.es).database}</option>
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
            >${lab.editor('worker', lab.labels.worker, queueCopy(lab.es).workerName)}
          </div>
        </div>
        <label class="qs-node-setting"
          ><span class="qs-setting-title"
            >${queueCopy(lab.es).ifThePaymentReturns}</span
          ><select data-setting="protect">
            <option value="off">
              ${queueCopy(lab.es).doNotCheckItsId}
            </option>
            <option value="on">
              ${queueCopy(lab.es).checkItsId}
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
