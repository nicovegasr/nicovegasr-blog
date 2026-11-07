import type { LabCopy } from './copy';

export interface LabFormat {
  readonly count: (value: number) => string;
  readonly amount: (value: number) => string;
  readonly seconds: (seconds: number) => string;
  readonly megabytes: (megabytes: number) => string;
}

export const formatFor = (copy: LabCopy): LabFormat => {
  const decimals = new Intl.NumberFormat(copy.numberLocale, { maximumFractionDigits: 1 });
  // es-ES leaves four-digit numbers ungrouped (1000); the lab groups every count the same way.
  const group = (value: number) => String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, copy.thousandsSeparator);
  return {
    count: group,
    amount: (value) => (value >= 1_000_000 ? `${decimals.format(value / 1_000_000)} ${copy.millions}` : group(value)),
    seconds: (seconds) => {
      if (seconds > 0 && seconds < 0.1) return copy.underATenthOfASecond;
      if (seconds < 10) return `${decimals.format(seconds)} s`;
      if (seconds < 120) return `${group(seconds)} s`;
      if (seconds < 2 * 3_600) return `${group(seconds / 60)} min`;
      return `${decimals.format(seconds / 3_600)} h`;
    },
    megabytes: (megabytes) =>
      megabytes >= 1_024 ? `${decimals.format(megabytes / 1_024)} GB` : `${group(megabytes)} MB`,
  };
};
