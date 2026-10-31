import type { Locale } from '@/i18n/locale';

export type ContributionPose = 'thinking' | 'fallen' | 'presenting' | 'welcoming';

export type Contribution = {
  readonly pose: ContributionPose;
  readonly claim: string;
  readonly detail: string;
};

const contributionsByLocale: Record<Locale, readonly Contribution[]> = {
  es: [
    {
      pose: 'thinking',
      claim: 'Análisis de problemas.',
      detail: 'Estudio el impacto y las alternativas para plantear una solución de manera pragmática.',
    },
    {
      pose: 'fallen',
      claim: 'Sistemas preparados para fallar.',
      detail: 'Los fallos van a ocurrir. Los preveo y diseño para que el sistema los aguante.',
    },
    {
      pose: 'presenting',
      claim: 'Mantenibilidad.',
      detail: 'Me preocupa que el sistema se pueda seguir cambiando dentro de dos años, sin añadir complejidad que aún no hace falta.',
    },
    {
      pose: 'welcoming',
      claim: 'Trabajo en equipo.',
      detail: 'El buen software se hace en equipo. Comparto lo que aprendo, también en píldoras y laboratorios.',
    },
  ],
  en: [
    {
      pose: 'thinking',
      claim: 'Problem analysis.',
      detail: 'I study the impact and the alternatives to propose a pragmatic solution.',
    },
    {
      pose: 'fallen',
      claim: 'Systems ready to fail.',
      detail: 'Failures will happen. I anticipate them and design so the system withstands them.',
    },
    {
      pose: 'presenting',
      claim: 'Maintainability.',
      detail: 'I care that the system can still be changed two years from now, without adding complexity it does not need yet.',
    },
    {
      pose: 'welcoming',
      claim: 'Teamwork.',
      detail: 'Good software is built by teams. I share what I learn, including through pills and labs.',
    },
  ],
};

export const findContributions = (locale: Locale): readonly Contribution[] =>
  contributionsByLocale[locale];
