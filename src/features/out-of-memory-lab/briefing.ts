import { CHALLENGES, type Challenge, type Objective } from './challenges';
import { objectiveCopy } from './copy';
import { formatAmount, formatCount, formatMegabytes, formatSeconds } from './format';

export const objectiveLabel = (objective: Objective): string => {
  switch (objective.kind) {
    case 'survive':
      return objectiveCopy.survive;
    case 'seconds':
      return objectiveCopy.seconds(formatSeconds(objective.max));
    case 'megabytes':
      return objectiveCopy.megabytes(formatMegabytes(objective.max));
    case 'write-trips':
      return objectiveCopy['write-trips'](formatCount(objective.max));
    case 'connection':
      return objectiveCopy.connection(formatSeconds(objective.max));
  }
};

const INCIDENT_FACTS = { 'restart-loop': 'reinicios en bucle', 'memory-squeeze': 'otro job pesado' } as const;

/** The size of the job, which decides whether memory is a problem at all. */
export const challengeFacts = ({ scenario, period }: Challenge): string[] => [
  `${formatAmount(scenario.logs)} logs${period ? ` · ${period}` : ''}`,
  `mochila de ${formatMegabytes(scenario.memoryLimitMegabytes)}`,
  ...(scenario.querySeconds >= 1 ? [`consulta de ${formatSeconds(scenario.querySeconds)}`] : []),
  ...scenario.incidents.map(({ kind }) => INCIDENT_FACTS[kind]),
];

/** Fills the challenge sheet shown before playing: context, volume and the three requirements. */
export const renderBriefing = (sheet: HTMLElement, challenge: Challenge) => {
  const part = (selector: string) => sheet.querySelector<HTMLElement>(selector)!;
  part('[data-briefing-kicker]').textContent = `Reto ${challenge.id} de ${CHALLENGES.length}`;
  part('[data-briefing-title]').textContent = challenge.title;
  part('[data-briefing-mission]').textContent = challenge.mission;
  part('[data-briefing-facts]').replaceChildren(
    ...challengeFacts(challenge).map((fact) => Object.assign(document.createElement('li'), { textContent: fact })),
  );
  part('[data-briefing-objectives]').replaceChildren(
    ...challenge.objectives.map((objective) => Object.assign(document.createElement('li'), { textContent: `☆ ${objectiveLabel(objective)}` })),
  );
};
