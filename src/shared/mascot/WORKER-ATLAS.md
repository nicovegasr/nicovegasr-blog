# Interactive worker sprites

`worker-walk-atlas.webp` is a 1536 × 1024 transparent, 3-column × 2-row atlas.
It was created with the built-in ImageGen tool using
the mascot atlas from the private studio repository as the character identity reference.
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

## Home timeline age variants

The original walking and reaction atlases remain unchanged for shared lab use.

| Timeline start year | Walking atlas | Appearance |
| --- | --- | --- |
| 2019 | `age-2019.webp` | Small blue student backpack |
| 2023 | `age-2023.webp` | Slim closed laptop under one arm |
| 2024 | `age-2024.webp` | Blue tie |
| 2026 | `age-2026.webp` | Round glasses and a few grey hairs, no cane |

`age-2026-reactions.webp` retains the original reaction cell order.
All variants use native 1536 × 1024 WebP with alpha, quality 88.

### Integration boundary

The student first appears upon entering the 2019 timeline stop in Trayectoria.
Lo que aporto keeps the original character. Do not select the student atlas
before the timeline begins. Lo que conozco uses the 2026 walking and reaction
atlases. Reverse scrolling must restore the corresponding earlier age and,
when leaving the timeline upwards, the original character.

The home page preloads every atlas and changes the selected pair only when the
age changes. The active timeline stop supplies its start year; the contributions
and skills routes retain their original and mature appearances respectively.
Preserve the existing walking, keyboard and swipe controls during integration.

### Final age prompts

The first input is the exact original walking atlas as identity, pose and layout
reference. The second input is the original reaction atlas as supporting identity
reference.


#### 2019

```text
Use case: identity-preserve. Production transparent character sprite atlas. Input image 1 is the exact walking atlas identity AND pose/layout reference; input image 2 is supporting identity reference. Create ONE 1536x1024 image, exact uniform 3 columns by 2 rows of 512px square cells. Preserve the SAME white squishy marshmallow character, rounded slightly square head merging into plump bean body, soft offwhite matte volume, fine dark navy outline, short puffy arms and legs. Keep original body proportions and individual poses extremely close. Identical scale and alignment across cells; feet baseline 86% of each cell, 12% safe padding. Real transparent alpha, NO background, ground shadow, checkerboard, text, grid lines, badges or logos.
Six cells in reading order: walk contact A facing right, walk passing facing right, walk contact B facing right, neutral standing arms relaxed, thinking hand at chin, fallen on side with X eyes. First three normal walking with relaxed counter-swing arms, both eyes open, no pointing or winking. Restrained small neutral smile. Accessories must be integrated into the drawing with matching fine outline and soft fill, move and rotate with each pose; carried items behind body and hands visibly gripping, never stickers.
AGE 2019: student wearing a SMALL muted blue backpack, with soft straps over shoulders. Backpack stays on back in all six poses including fallen. No laptop, tie, glasses or hair. Change only this costume, keep identity, poses and scale.
```

#### 2023

```text
Use case: identity-preserve. Production transparent character sprite atlas. Input image 1 is the exact walking atlas identity AND pose/layout reference; input image 2 is supporting identity reference. Create ONE 1536x1024 image, exact uniform 3 columns by 2 rows of 512px square cells. Preserve the SAME white squishy marshmallow character, rounded slightly square head merging into plump bean body, soft offwhite matte volume, fine dark navy outline, short puffy arms and legs. Keep original body proportions and individual poses extremely close. Identical scale and alignment across cells; feet baseline 86% of each cell, 12% safe padding. Real transparent alpha, NO background, ground shadow, checkerboard, text, grid lines, badges or logos.
Six cells in reading order: walk contact A facing right, walk passing facing right, walk contact B facing right, neutral standing arms relaxed, thinking hand at chin, fallen on side with X eyes. First three normal walking with relaxed counter-swing arms, both eyes open, no pointing or winking. Restrained small neutral smile. Accessories must be integrated into the drawing with matching fine outline and soft fill, move and rotate with each pose; carried items behind body and hands visibly gripping, never stickers.
AGE 2023: same character carrying a slim closed muted blue-grey laptop tucked under one arm. Body and soft hand overlap the laptop naturally, visibly supporting and gripping its edge. Laptop stays with character in all six poses including thinking and fallen. Keep free arm relaxed during walking. No backpack, tie, glasses or hair. Change only this costume, keep identity, poses and scale.
```

#### 2024

```text
Use case: identity-preserve. Production transparent character sprite atlas. Input image 1 is the exact walking atlas identity AND pose/layout reference; input image 2 is supporting identity reference. Create ONE 1536x1024 image, exact uniform 3 columns by 2 rows of 512px square cells. Preserve the SAME white squishy marshmallow character, rounded slightly square head merging into plump bean body, soft offwhite matte volume, fine dark navy outline, short puffy arms and legs. Keep original body proportions and individual poses extremely close. Identical scale and alignment across cells; feet baseline 86% of each cell, 12% safe padding. Real transparent alpha, NO background, ground shadow, checkerboard, text, grid lines, badges or logos.
Six cells in reading order: walk contact A facing right, walk passing facing right, walk contact B facing right, neutral standing arms relaxed, thinking hand at chin, fallen on side with X eyes. First three normal walking with relaxed counter-swing arms, both eyes open, no pointing or winking. Restrained small neutral smile. Accessories must be integrated into the drawing with matching fine outline and soft fill, move and rotate with each pose; carried items behind body and hands visibly gripping, never stickers.
AGE 2024: same character wearing a small elegant muted blue necktie, soft fabric and fine navy outline, the knot naturally at neck and tie following curve of plump body in every pose. Tie moves with body and rests naturally on side in fallen pose. No shirt, jacket, laptop, backpack, glasses or hair. Change only the tie; keep exact identity, proportions, original pose-by-pose alignment.
```

#### 2026

```text
Use case: identity-preserve. Production transparent character sprite atlas. Input image 1 is the exact walking atlas identity AND pose/layout reference; input image 2 is supporting identity reference. Create ONE 1536x1024 image, exact uniform 3 columns by 2 rows of 512px square cells. Preserve the SAME white squishy marshmallow character, rounded slightly square head merging into plump bean body, soft offwhite matte volume, fine dark navy outline, short puffy arms and legs. Keep original body proportions and individual poses extremely close. Identical scale and alignment across cells; feet baseline 86% of each cell, 12% safe padding. Real transparent alpha, NO background, ground shadow, checkerboard, text, grid lines, badges or logos.
Six cells in reading order: walk contact A facing right, walk passing facing right, walk contact B facing right, neutral standing arms relaxed, thinking hand at chin, fallen on side with X eyes. First three normal walking with relaxed counter-swing arms, both eyes open, no pointing or winking. Restrained small neutral smile. Accessories must be integrated into the drawing with matching fine outline and soft fill, move and rotate with each pose; carried items behind body and hands visibly gripping, never stickers.
AGE 2026: same character now slightly older, wearing simple thin dark navy round eyeglasses with transparent lenses, both original oval eyes clearly visible, plus THREE small soft grey hairs growing naturally from top of head. Gentle mature look while retaining EXACT original marshmallow identity. Glasses and hair track head rotation consistently in all six cells including fallen with X eyes behind lenses. No cane, beard, moustache, backpack, laptop or tie. Do not make frail or hunched; same normal walking posture, proportions and original pose-by-pose alignment.
```

#### 2026 reactions

Inputs: original reaction atlas for poses and layout; 2026 walking atlas for
matching glasses and grey hairs.

```text
Use case: identity-preserve. Create ONE transparent production reaction sprite atlas, native 1536x1024, exact uniform 3 columns by 2 rows. Input image 1 is the exact original REACTION ATLAS as pose, layout and body identity reference. Input image 2 is the approved AGE 2026 WALKING ATLAS as exact glasses and grey hair reference. Preserve the original white squishy marshmallow character, soft offwhite matte body volume, fine dark navy outline. Add the SAME thin round dark navy eyeglasses with clear lenses and three small grey hairs as image 2 to all six reactions. No other costume, tie, laptop, backpack, cane or beard. Match original reaction poses and positions exactly, same scale, cell alignment, body proportions and head orientation. Complete bodies, no cropping, real transparent alpha, no background, shadows, text, grid or badges.
Six poses in exact reading order: TOP LEFT cheerful presenting with one hand raised palm outward; TOP MIDDLE friendly explanation with one palm open and other hand at hip; TOP RIGHT surprised hands at mouth with raised foot; BOTTOM LEFT thoughtful hand at chin; BOTTOM MIDDLE original playful pointing/winking pose; BOTTOM RIGHT welcoming with both arms spread open. Reaction sheet only: reproduce original expressions including the original wink in cell 4, while keeping eyeglasses natural. The main runtime uses cells 0 and 5, make these especially clear and consistent with the age 2026 walking sheet. Glasses and grey hairs follow each head pose naturally, never look like stickers. Same feet baselines and drawing registration as image 1.
```

### Asset review

All 30 cells were reviewed at 60px and 120px on white and near-black (`#10141c`).
See [age variants review](review/age-variants.webp). The WebP exports retain real
alpha and their native 1536 × 1024 resolution.

The generated variants follow the source registration rather than meeting an
exact 86% foot baseline or 12% padding in every cell. The original walking cells
already end near 97% of cell height, and the fallen pose nearly spans its cell.
Expect small drawing variations between age sheets; do not assume pixel-perfect
registration. Check the actual age swaps when implementing runtime integration.

Astro check: no errors, no warnings, three existing hints. Vitest: 173 passing.
Production build and the full Playwright suite pass (52 tests). Age switching,
reverse scrolling and atlas preloads are covered in both languages at 1280 × 800
and 360 × 640. Desktop and mobile screenshots were visually reviewed.
