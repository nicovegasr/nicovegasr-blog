import type { BatchSize, Build, Card } from './engine';
import type { LabCopy } from './copy';
import { codeLines, javaNumber } from './script-code';

/** The script with its holes, the placed cards (removable while editing) and the batch-size dial. */
export const renderCode = (copy: LabCopy, container: HTMLElement, build: Build, batchSize: BatchSize, canEdit: boolean) => {
  const removable = new Set<Card>();
  const holeComment = { read: `// ① ${copy.code.readHole}`, write: `// ② ${copy.code.writeHole}` } as const;
  container.replaceChildren(
    ...codeLines(build).map((line) => {
      const element = document.createElement('div');
      element.className = 'oom-line';
      element.style.setProperty('--indent', String(line.indent));
      if (line.kind === 'hole') {
        element.classList.add('is-hole');
        element.dataset.hole = line.hole;
        element.textContent = `${holeComment[line.hole]} ${copy.code.dropHere}`;
      } else if (line.kind === 'batch-size') {
        element.classList.add('is-card');
        const disabled = canEdit ? '' : ' disabled';
        element.innerHTML = `int batchSize = <span class="oom-dial${canEdit ? '' : ' is-locked'}" data-dial-control><button type="button" data-dial="-" aria-label="${copy.code.smallerBatch}"${disabled}>−</button><b>${javaNumber(batchSize)}</b><button type="button" data-dial="+" aria-label="${copy.code.biggerBatch}"${disabled}>+</button></span>;`;
      } else {
        element.textContent = line.text;
        if (line.card !== undefined) {
          element.classList.add('is-card');
          if (!removable.has(line.card) && canEdit) {
            removable.add(line.card);
            const remove = Object.assign(document.createElement('button'), { type: 'button', className: 'oom-remove', textContent: '✕' });
            remove.dataset.remove = line.card;
            remove.setAttribute('aria-label', copy.code.remove(copy.cards[line.card].label));
            element.append(remove);
          }
        }
      }
      return element;
    }),
  );
};
