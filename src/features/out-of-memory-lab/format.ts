const decimals = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });
// es-ES leaves four-digit numbers ungrouped (1000); the lab groups every count the same way.
const group = (value: number) => String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export const formatCount = (value: number): string => group(value);

export const formatAmount = (value: number): string => {
  if (value >= 1_000_000) return `${decimals.format(value / 1_000_000)} millones`;
  return group(value);
};

export const formatSeconds = (seconds: number): string => {
  if (seconds > 0 && seconds < 0.1) return 'menos de 0,1 s';
  if (seconds < 10) return `${decimals.format(seconds)} s`;
  if (seconds < 120) return `${group(seconds)} s`;
  if (seconds < 2 * 3_600) return `${group(seconds / 60)} min`;
  return `${decimals.format(seconds / 3_600)} h`;
};

export const formatMegabytes = (megabytes: number): string =>
  megabytes >= 1_024 ? `${decimals.format(megabytes / 1_024)} GB` : `${group(megabytes)} MB`;
