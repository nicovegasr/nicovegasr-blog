export type AchievementId =
  'brave' | 'survivor' | 'identity' | 'double' | 'efficient';
export const achievements: {
  id: AchievementId;
  es: [string, string];
  en: [string, string];
}[] = [
  {
    id: 'brave',
    es: [
      'Quien tiene miedo a morir, que no nazca',
      'Lo ejecutaste sin protecciones. Ahora ya sabes lo que había en juego.',
    ],
    en: [
      'No guts, no glory',
      'You ran it without protection. Now you know what was at stake.',
    ],
  },
  {
    id: 'survivor',
    es: [
      'El pod se fue. Mis pagos, no.',
      'Recuperaste el pago después de una caída del worker gracias al almacenamiento independiente.',
    ],
    en: [
      'The pod left. My payments stayed.',
      'You recovered a payment after the worker crashed, thanks to independent storage.',
    ],
  },
  {
    id: 'identity',
    es: [
      'A ti ya te he visto',
      'Completaste los tres pagos sin repetir sus efectos locales, pese a la reentrega.',
    ],
    en: [
      'Have we met?',
      'You completed all three payments without repeating their local effects, despite redelivery.',
    ],
  },
  {
    id: 'double',
    es: [
      'Otra vez el mismo',
      'El mismo ID produjo dos resultados. Reintentar no siempre es repetir sin consecuencias.',
    ],
    en: [
      'The same one again',
      'The same ID produced two results. Retrying is not always harmless repetition.',
    ],
  },
  {
    id: 'efficient',
    es: [
      'No me hagas trabajar dos veces',
      'Completaste los tres pagos saltando los pasos guardados, sin repetir trabajo ya resuelto.',
    ],
    en: [
      'Do not make me work twice',
      'You completed all three payments by skipping saved steps, without repeating successful work.',
    ],
  },
];
