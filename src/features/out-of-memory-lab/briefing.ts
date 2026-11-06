import { CHALLENGES, type Challenge, type Objective } from './challenges';
import type { LabText } from './lab-text';

export const objectiveLabel = ({ copy, format }: LabText, objective: Objective): string => {
  switch (objective.kind) {
    case 'survive':
      return copy.objectives.survive;
    case 'seconds':
      return copy.objectives.seconds(format.seconds(objective.max));
    case 'megabytes':
      return copy.objectives.megabytes(format.megabytes(objective.max));
    case 'write-trips':
      return copy.objectives['write-trips'](format.count(objective.max));
    case 'connection':
      return copy.objectives.connection(format.seconds(objective.max));
  }
};

/** The size of the job, which decides whether memory is a problem at all. */
export const challengeFacts = ({ copy, format }: LabText, { id, scenario }: Challenge): string[] => {
  const period = copy.challenges[id]?.period;
  return [
    `${format.amount(scenario.logs)} logs${period ? ` · ${period}` : ''}`,
    copy.facts.backpack(format.megabytes(scenario.memoryLimitMegabytes)),
    ...(scenario.querySeconds >= 1 ? [copy.facts.query(format.seconds(scenario.querySeconds))] : []),
    ...scenario.incidents.map(({ kind }) => copy.facts.incidents[kind]),
  ];
};

/** Fills the challenge sheet shown before playing: context, volume and the three requirements. */
export const renderBriefing = (text: LabText, sheet: HTMLElement, challenge: Challenge) => {
  const part = (selector: string) => sheet.querySelector<HTMLElement>(selector)!;
  const words = text.copy.challenges[challenge.id];
  part('[data-briefing-kicker]').textContent = text.copy.challengeOf(challenge.id, CHALLENGES.length);
  part('[data-briefing-title]').textContent = words?.title ?? '';
  part('[data-briefing-mission]').textContent = words?.mission ?? '';
  part('[data-briefing-facts]').replaceChildren(
    ...challengeFacts(text, challenge).map((fact) => Object.assign(document.createElement('li'), { textContent: fact })),
  );
  part('[data-briefing-objectives]').replaceChildren(
    ...challenge.objectives.map((objective) => Object.assign(document.createElement('li'), { textContent: `☆ ${objectiveLabel(text, objective)}` })),
  );
};
