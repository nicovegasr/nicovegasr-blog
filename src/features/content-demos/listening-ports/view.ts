import type { Locale } from '@/i18n/locale';
import source from './assets/listening-ports.svg?raw';
import { labelsFor } from './labels';
import { localiseSvg, scopeSvg } from './scene';

export const renderScene = (locale: Locale, identifier: string): string =>
  scopeSvg(localiseSvg(source, labelsFor(locale).svgText), identifier);

export const renderDemo = (locale: Locale, identifier: string): string => {
  const labels = labelsFor(locale);
  return `<figure class="ports-demo">
    <button class="ports-artwork" type="button" data-enlarge aria-label="${labels.enlarge}">
      ${renderScene(locale, identifier)}
    </button>
    <figcaption>${labels.caption}</figcaption>
  </figure>`;
};
