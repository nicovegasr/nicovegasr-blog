const WALK_CYCLE_COLUMNS = [0, 1, 2, 1];
const STEP_LENGTH_IN_PIXELS = 36;
const REST_DELAY_IN_MILLISECONDS = 140;
const WALKING_ROW = 0;

type SpriteCell = { readonly column: number; readonly row: number };
export type MascotPose =
  | { readonly atlas: 'walking'; readonly cell: SpriteCell }
  | { readonly atlas: 'reactions'; readonly cell: SpriteCell };

export const MASCOT_POSES = {
  standing: { atlas: 'walking', cell: { column: 0, row: 1 } },
  thinking: { atlas: 'walking', cell: { column: 1, row: 1 } },
  fallen: { atlas: 'walking', cell: { column: 2, row: 1 } },
  presenting: { atlas: 'reactions', cell: { column: 0, row: 0 } },
  welcoming: { atlas: 'reactions', cell: { column: 2, row: 1 } },
} as const satisfies Record<string, MascotPose>;

export type MascotPoseName = keyof typeof MASCOT_POSES;

export const isMascotPoseName = (name: string | undefined): name is MascotPoseName =>
  name !== undefined && name in MASCOT_POSES;

export type MascotWalker = {
  walk: (distanceInPixels: number, isForward: boolean) => void;
  rest: (poseName: MascotPoseName) => void;
};

export const createMascotWalker = (mascot: HTMLElement): MascotWalker => {
  let travelled = 0;
  let restTimer = 0;
  let restPose: MascotPoseName = 'standing';

  const show = ({ atlas, cell }: MascotPose) => {
    const isReaction = atlas === 'reactions';
    mascot.style.setProperty('--reaction-visibility', isReaction ? '1' : '0');
    mascot.style.setProperty(isReaction ? '--reaction-column' : '--sprite-column', String(cell.column));
    mascot.style.setProperty(isReaction ? '--reaction-row' : '--sprite-row', String(cell.row));
  };

  return {
    walk: (distanceInPixels, isForward) => {
      if (distanceInPixels === 0) {
        return;
      }
      travelled += distanceInPixels;
      const step = Math.floor(travelled / STEP_LENGTH_IN_PIXELS) % WALK_CYCLE_COLUMNS.length;
      show({ atlas: 'walking', cell: { column: WALK_CYCLE_COLUMNS[step] ?? 0, row: WALKING_ROW } });
      mascot.style.setProperty('--facing', isForward ? '1' : '-1');
      window.clearTimeout(restTimer);
      restTimer = window.setTimeout(() => show(MASCOT_POSES[restPose]), REST_DELAY_IN_MILLISECONDS);
    },
    rest: (poseName) => {
      if (poseName === restPose) {
        return;
      }
      restPose = poseName;
      show(MASCOT_POSES[poseName]);
    },
  };
};
