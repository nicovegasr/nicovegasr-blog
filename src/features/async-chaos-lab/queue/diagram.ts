import type { PaymentLab } from '../payment-simulation/controller';
import { editor, jobRows, namingControl, workerJourney } from '../payment-simulation/markup';
import { labFigure } from '../shared/figures';
import { queueCopy } from './copy';

export function queueDiagram(lab: PaymentLab) {
  return /* HTML */ `<div class="lab-diagram">
    <div class="lab-api-stack">
      ${namingControl(lab)}
      <section class="lab-api">
        ${labFigure('api')}<span class="lab-eyebrow">API</span
        >${editor('api', lab.labels.api, queueCopy(lab.es).intakeName)}<strong>202</strong>
        <p>${queueCopy(lab.es).receivedStillToBeRecorded}</p>
      </section>
    </div>
    <span class="lab-arrow" aria-hidden="true">→</span>
    <div class="lab-process" data-process>
      <span class="lab-boundary" data-boundary></span>
      <section class="lab-store">
        <div class="lab-node-heading">
          <span data-store-figure>${labFigure(lab.config.storage === 'ram' ? 'ram' : 'db')}</span>
          <div>
            <span class="lab-eyebrow">${queueCopy(lab.es).pendingPayments}</span
            >${editor('storage', lab.labels.storage, queueCopy(lab.es).storageName)}
          </div>
        </div>
        <label class="lab-node-setting"
          ><span class="lab-setting-title">${queueCopy(lab.es).whereTheyWait}</span
          ><select data-setting="storage">
            <option value="ram">${queueCopy(lab.es).workerRam}</option>
            <option value="db">${queueCopy(lab.es).database}</option>
          </select></label
        >
        <p class="lab-choice-note" data-storage-note></p>
        <div class="lab-array">${jobRows(lab)}</div>
      </section>
      <span class="lab-arrow" aria-hidden="true">→</span>
      <section class="lab-worker">
        <div class="lab-node-heading">
          ${labFigure('worker')}
          <div>
            <span class="lab-eyebrow">WORKER</span>${editor('worker', lab.labels.worker, queueCopy(lab.es).workerName)}
          </div>
        </div>
        <label class="lab-node-setting"
          ><span class="lab-setting-title">${queueCopy(lab.es).ifThePaymentReturns}</span
          ><select data-setting="protect">
            <option value="off">${queueCopy(lab.es).doNotCheckItsId}</option>
            <option value="on">${queueCopy(lab.es).checkItsId}</option>
          </select></label
        >
        <p class="lab-choice-note" data-protection-note></p>
        <div class="lab-active-job" data-active-job></div>
        ${workerJourney(lab)}
        <div class="lab-worker-steps" data-steps></div>
      </section>
    </div>
  </div>`;
}
