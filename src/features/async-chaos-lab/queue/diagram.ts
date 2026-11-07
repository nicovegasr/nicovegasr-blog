import type { PaymentLabView } from '../payment-simulation/lab-view';
import { editor, jobRows, namingControl, workerJourney } from '../payment-simulation/markup';
import { labFigure } from '../shared/figures';
import { queueCopy } from './copy';

export function queueDiagram(lab: PaymentLabView) {
  return /* HTML */ `<div class="lab-diagram">
    <div class="lab-api-stack">
      ${namingControl(lab)}
      <section class="lab-api">
        ${labFigure('api')}<span class="lab-eyebrow">API</span
        >${editor('api', lab.labels.api, queueCopy(lab.locale).intakeName)}<strong>202</strong>
        <p>${queueCopy(lab.locale).receivedStillToBeRecorded}</p>
      </section>
    </div>
    <span class="lab-arrow" aria-hidden="true">→</span>
    <div class="lab-process" data-process>
      <span class="lab-boundary" data-boundary></span>
      <section class="lab-store">
        <div class="lab-node-heading">
          <span data-store-figure>${labFigure(lab.config.storage === 'ram' ? 'ram' : 'db')}</span>
          <div>
            <span class="lab-eyebrow">${queueCopy(lab.locale).pendingPayments}</span
            >${editor('storage', lab.labels.storage, queueCopy(lab.locale).storageName)}
          </div>
        </div>
        <label class="lab-node-setting"
          ><span class="lab-setting-title">${queueCopy(lab.locale).whereTheyWait}</span
          ><select data-setting="storage">
            <option value="ram">${queueCopy(lab.locale).workerRam}</option>
            <option value="db">${queueCopy(lab.locale).database}</option>
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
            <span class="lab-eyebrow">WORKER</span
            >${editor('worker', lab.labels.worker, queueCopy(lab.locale).workerName)}
          </div>
        </div>
        <label class="lab-node-setting"
          ><span class="lab-setting-title">${queueCopy(lab.locale).ifThePaymentReturns}</span
          ><select data-setting="protect">
            <option value="off">${queueCopy(lab.locale).doNotCheckItsId}</option>
            <option value="on">${queueCopy(lab.locale).checkItsId}</option>
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
