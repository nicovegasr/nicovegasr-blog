import { cardCopy } from './copy';
import type { BatchSize, Build, Card } from './engine';
import { codeLines, javaNumber } from './script-code';

/** The script with its holes, the placed cards (removable while editing) and the batch-size dial. */
export const renderCode = (container: HTMLElement, build: Build, batchSize: BatchSize, canEdit: boolean) => {
  const removable = new Set<Card>();
  container.replaceChildren(
    ...codeLines(build).map((line) => {
      const element = document.createElement('div');
      element.className = 'oom-line';
      element.style.setProperty('--indent', String(line.indent));
      if (line.kind === 'hole') {
        element.classList.add('is-hole');
        element.dataset.hole = line.hole;
        element.textContent = `${line.text} Suelta aquí una carta`;
      } else if (line.kind === 'batch-size') {
        element.classList.add('is-card');
        const disabled = canEdit ? '' : ' disabled';
        element.innerHTML = `int batchSize = <span class="oom-dial${canEdit ? '' : ' is-locked'}" data-dial-control><button type="button" data-dial="-" aria-label="Lote más pequeño"${disabled}>−</button><b>${javaNumber(batchSize)}</b><button type="button" data-dial="+" aria-label="Lote más grande"${disabled}>+</button></span>;`;
      } else {
        element.textContent = line.text;
        if (line.card !== undefined) {
          element.classList.add('is-card');
          if (!removable.has(line.card) && canEdit) {
            removable.add(line.card);
            const remove = Object.assign(document.createElement('button'), { type: 'button', className: 'oom-remove', textContent: '✕' });
            remove.dataset.remove = line.card;
            remove.setAttribute('aria-label', `Quitar «${cardCopy[line.card].label}»`);
            element.append(remove);
          }
        }
      }
      return element;
    }),
  );
};
