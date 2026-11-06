import type { Locale } from '@/i18n/locale';

export type ContentDemoModule = {
  mount: (host: HTMLElement, locale: Locale) => () => void;
};

// A Markdown entry chooses a name; implementation and imports stay in source code.
const demos: Record<string, () => Promise<ContentDemoModule>> = {};

export const findContentDemo = (name: string) => Object.hasOwn(demos, name) ? demos[name] : undefined;
