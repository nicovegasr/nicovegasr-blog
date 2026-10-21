# Interactive worker sprites

`worker-walk-atlas.webp` is a 1536 × 1024 transparent, 3-column × 2-row atlas.
It was created with the built-in ImageGen tool using
`videos/async-chaos-lab/assets/mascot-atlas.png` as the character identity reference.
The generated PNG was converted to WebP with alpha preserved; no poses were
cropped, reconstructed, or drawn over outside ImageGen.

| Cell (zero-based) | Pose |
| --- | --- |
| 0 | Walking contact A, facing right |
| 1 | Walking passing pose, facing right |
| 2 | Walking contact B, facing right |
| 3 | Neutral standing worker, arms relaxed |
| 4 | Thinking/waiting for a missing response |
| 5 | Fallen worker with X eyes |

The walking loop is 0 → 1 → 2 → 1, mirrored only for leftward travel.
It runs while the actor travels and stops when it reaches a station or playback
pauses. The worker state is derived from the simulation; animation completion
never advances it.

`worker-reactions.webp` is a WebP conversion of the original approved film atlas.
Only its surprised pose (cell 2) and completed pose (cell 5) are used. The old
pointing/winking pose is deliberately excluded from interactive locomotion.

## Final generation prompt

Use case: identity-preserve. Asset type: production character sprite atlas for an
educational web game. INPUT IMAGE ROLE: exact character identity reference, not a
pose template. Create ONE new 3-column by 2-row transparent sprite atlas of this
SAME white squishy marshmallow character: slightly square rounded head blending
into plump bean body, soft offwhite matte volume, fine dark navy outline, short
puffy arms and short legs. Each cell square, exact uniform 3x2 grid, e.g.
1536x1024 total, identical character scale and feet baseline 86% of each cell
height, complete bodies with 12% safe padding and genuine transparent alpha, no
shadow/background/checkerboard/text. This sheet is animation data, alignment and
normal body language matter more than dramatic posing.

SIX CELLS in exact reading order: TOP LEFT = WALK CONTACT A, facing right in a
modest three-quarter side view, left foot forward touching ground, right foot
back, relaxed arms naturally counter-swinging. TOP MIDDLE = WALK PASSING, same
right-facing orientation and same scale/head position, feet pass beneath body,
arms relaxed low. TOP RIGHT = WALK CONTACT B, same right-facing orientation,
right foot forward and left foot back, arms naturally alternate from pose A.
These three form a simple normal walking loop, not running, no pointing, no
winking, no grin, no lifted heroic knee, both eyes open with calm focused
expression and small closed neutral friendly mouth. BOTTOM LEFT = NEUTRAL
STANDING worker, both eyes open, arms resting beside body, calm closed mouth,
both feet planted, looking slightly right. BOTTOM MIDDLE = UNCERTAIN WAITING
worker, standing upright, both eyes open, small thoughtful eyebrow expression,
one hand lightly at chin, other arm relaxed. BOTTOM RIGHT = COMICALLY DEAD
worker, lying naturally on its side on the same ground baseline, eyes visibly
X X, slack arms and legs, no gore.

Preserve the original character identity and restrained 2.5D drawn style across
every cell. Avoid all of the reference's cocky pointing, 'kachow' wink or
expressive grins: the user's explicit correction is NORMAL WALKING POSTURES.
No props, labels, badges, speech bubbles, tile borders or logos.
