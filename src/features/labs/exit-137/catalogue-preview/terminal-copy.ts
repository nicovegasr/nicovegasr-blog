import { defineCopy } from '@/i18n/copy';

export const terminalCopy = defineCopy({
  es: {
    numbers: 'es',
    loading: (logs: string) => `cargando ${logs} logs en memoria…`,
    processed: (done: string, total: string) => `procesados ${done} / ${total}`,
    finished: (logs: string) => `✓ ${logs} logs · 64 MB pico · exit code 0`,
  },
  en: {
    numbers: 'en',
    loading: (logs: string) => `loading ${logs} logs into memory…`,
    processed: (done: string, total: string) => `processed ${done} / ${total}`,
    finished: (logs: string) => `✓ ${logs} logs · 64 MB peak · exit code 0`,
  },
});
