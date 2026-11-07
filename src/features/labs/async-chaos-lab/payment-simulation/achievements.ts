import { defineCopy } from '@/i18n/copy';

export type AchievementId = 'brave' | 'survivor' | 'identity' | 'double' | 'efficient';
export const achievementIds: readonly AchievementId[] = ['brave', 'survivor', 'identity', 'double', 'efficient'];

type AchievementText = Record<AchievementId, [title: string, description: string]>;

const es: AchievementText = {
  brave: [
    'Quien tiene miedo a morir, que no nazca',
    'Lo ejecutaste sin protecciones. Ahora ya sabes lo que había en juego.',
  ],
  survivor: [
    'El pod se fue. Mis pagos, no.',
    'Recuperaste el pago después de una caída del worker gracias al almacenamiento independiente.',
  ],
  identity: ['A ti ya te he visto', 'Completaste los tres pagos sin repetir sus efectos locales, pese a la reentrega.'],
  double: [
    'Otra vez el mismo',
    'El mismo ID produjo dos resultados. Reintentar no siempre es repetir sin consecuencias.',
  ],
  efficient: [
    'No me hagas trabajar dos veces',
    'Completaste los tres pagos saltando los pasos guardados, sin repetir trabajo ya resuelto.',
  ],
};

const en: AchievementText = {
  brave: ['No guts, no glory', 'You ran it without protection. Now you know what was at stake.'],
  survivor: [
    'The pod left. My payments stayed.',
    'You recovered a payment after the worker crashed, thanks to independent storage.',
  ],
  identity: [
    'Have we met?',
    'You completed all three payments without repeating their local effects, despite redelivery.',
  ],
  double: ['The same one again', 'The same ID produced two results. Retrying is not always harmless repetition.'],
  efficient: [
    'Do not make me work twice',
    'You completed all three payments by skipping saved steps, without repeating successful work.',
  ],
};

export const achievementCopy = defineCopy({ es, en });
