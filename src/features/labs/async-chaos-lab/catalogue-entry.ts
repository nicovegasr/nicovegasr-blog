import type { Locale } from '@/i18n/locale';
import type { LabEntry } from '@/features/labs/catalogue/lab-entry';
import { labPath } from './shared/links';

export function asyncChaosLabEntry(locale: Locale): LabEntry {
  const es = locale === 'es';
  return {
    id: 'async-chaos-lab',
    title: 'Async Chaos Lab',
    label: es ? 'Aprende rompiendo' : 'Learn by breaking',
    summary: es
      ? 'Evita perder pagos, protege los efectos de cada paso y aprende a escalar cuando llegan 24 de golpe.'
      : 'Keep payments safe, protect each step’s effects, and learn to scale when 24 arrive at once.',
    caption: es ? '24 pagos de golpe' : '24 payments at once',
    levelCount: es ? '3 experimentos' : '3 experiments',
    levels: [
      { title: es ? 'Protege tus pagos.' : 'Protect your payments.', href: labPath(locale, 1) },
      { title: es ? 'Un pago. Cuatro pasos.' : 'One payment. Four steps.', href: labPath(locale, 2) },
      { title: es ? 'Tu sistema se queda pequeño.' : 'Your system is growing.', href: labPath(locale, 3) },
    ],
  };
}
