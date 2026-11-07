import { expect, test, type Page } from '@playwright/test';

const URL = '/laboratorios/exit-137/';

// Every challenge opens on its sheet; closing it starts the challenge (and, the first time, the tutorial).
const begin = (page: Page) => page.getByRole('button', { name: 'Empezar' }).click();

const skipTips = (page: Page) =>
  page.addInitScript(() => {
    window.localStorage.setItem(
      'oom-lab-tips',
      JSON.stringify([
        'tutorial',
        'dial',
        'card-pages',
        'card-batches',
        'incident-restart-loop',
        'incident-memory-squeeze',
      ]),
    );
  });

const play = async (page: Page, ...cards: string[]) => {
  for (const card of cards) await page.locator(`[data-card=${card}] [data-place]`).click();
  await page.locator('[data-run]').click();
  await expect(page.locator('[data-result]')).toBeVisible({ timeout: 15_000 });
};

test('the tutorial guides the first run and fits the screen', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(URL);
  await begin(page);
  const bubble = page.locator('[data-bubble]');
  await expect(bubble).toContainText('Paso 1 de 6');
  await page.locator('[data-bubble-next]').click();
  await page.locator('[data-bubble-next]').click();
  await expect(bubble).toContainText('tres estrellas');
  await page.locator('[data-bubble-next]').click();
  await expect(bubble).toContainText('cómo coge los logs');
  await expect(bubble).toContainText('Esperando');

  await page.locator('[data-card=cursor] [data-flip]').click();
  await expect(page.locator('[data-card=cursor]')).toContainText('streamAllOrdered');
  await page.locator('[data-card=cursor] [data-place]').click();
  await expect(page.locator('[data-code]')).toContainText('repo.streamAllOrdered(id)');
  await expect(bubble).toContainText('cómo guarda');
  await page.locator('[data-card=one-by-one] [data-place]').click();
  await expect(bubble).toContainText('Ejecuta');

  const game = await page.locator('[data-game]').boundingBox();
  const navigation = await page.locator('.site-header').boundingBox();
  const viewport = page.viewportSize()!;
  expect(game!.y, 'the navigation does not cover the game').toBeGreaterThanOrEqual(navigation!.y + navigation!.height);
  expect(game!.y + game!.height, 'the whole game fits the first screen').toBeLessThanOrEqual(viewport.height);

  await page.locator('[data-run]').click();
  await expect(page.locator('[data-coach]')).toBeHidden();
  // On a week of logs a stream only adds its setup: it works, but loses the time star.
  await expect(page.locator('[data-result-title]')).toContainText('se puede mejorar', { timeout: 15_000 });
  await expect(page.locator('[data-result-text]')).toContainText('lo simple gana');
});

test('the tutorial bubble is never cut off and restarting it leaves the holes open', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(URL);
  await begin(page);
  const expectBubbleInsideGame = async () => {
    const game = (await page.locator('[data-game]').boundingBox())!;
    const bubble = (await page.locator('[data-bubble]').boundingBox())!;
    expect(bubble.y + bubble.height).toBeLessThanOrEqual(game.y + game.height);
    expect(bubble.x + bubble.width).toBeLessThanOrEqual(game.x + game.width);
  };
  for (let step = 0; step < 3; step += 1) {
    await expectBubbleInsideGame();
    await page.locator('[data-bubble-next]').click();
  }
  await expectBubbleInsideGame();
  await page.locator('[data-card=cursor] [data-place]').click();
  await expectBubbleInsideGame();
  await page.locator('[data-card=one-by-one] [data-place]').click();
  await expectBubbleInsideGame();

  await page.locator('[data-help]').click();
  await expect(page.locator('[data-hole=read]')).toBeVisible();
});

test('the tutorial does not scroll the page on a big screen', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(URL);
  await begin(page);
  const scrollBefore = await page.evaluate(() => window.scrollY);
  for (let step = 0; step < 3; step += 1) await page.locator('[data-bubble-next]').click();
  await expect(page.locator('[data-card=load-all] [data-place]')).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
});

test('the tutorial frame follows the hole when the code scrolls', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(URL);
  await begin(page);
  for (let step = 0; step < 3; step += 1) await page.locator('[data-bubble-next]').click();
  const spotlight = page.locator('[data-spotlight]');
  const hole = page.locator('[data-hole=read]');
  await page.locator('[data-code-panel]').evaluate((panel) => {
    panel.style.height = '200px';
    panel.style.alignSelf = 'start';
    panel.scrollTop = 30;
  });
  await page.waitForFunction(() => document.querySelector('[data-code-panel]')!.scrollTop === 30);
  await expect
    .poll(async () => {
      const frame = (await spotlight.boundingBox())!;
      const target = (await hole.boundingBox())!;
      return Math.abs(frame.y - target.y) <= 8;
    })
    .toBe(true);

  await page.locator('[data-code-panel]').evaluate((panel) => {
    panel.style.height = '100px';
    panel.scrollTop = panel.scrollHeight;
  });
  await expect(spotlight).toBeHidden();
});

test('retrying keeps the challenge, every challenge is open, and a reload starts over at challenge 1', async ({
  page,
}) => {
  await skipTips(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(URL);
  await begin(page);
  await play(page, 'cursor', 'one-by-one');
  await page.locator('[data-retry]').click();
  await expect(page.locator('[data-title]')).toContainText('Reto 1');
  await expect(page.getByRole('dialog', { name: 'Una semana de logs' })).toBeHidden();

  await page.locator('[data-challenge="3"]').click();
  await expect(page.getByRole('dialog', { name: 'La consulta pesada' })).toBeVisible();
  await begin(page);
  await expect(page.locator('[data-title]')).toContainText('Reto 3');
  await page.reload();
  await expect(page.locator('[data-title]')).toContainText('Reto 1');
  await expect(page.getByRole('dialog', { name: 'Una semana de logs' })).toBeVisible();
});

test('cards do not cut their text, overlap or change the layout at any width', async ({ page }) => {
  await skipTips(page);
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'oom-lab-progress',
      JSON.stringify({ stars: {}, survived: { 1: true, 2: true, 3: true } }),
    );
  });
  await page.goto(URL);
  await begin(page);
  const inspectCards = () =>
    page.locator('[data-card]:not([hidden])').evaluateAll((cards) =>
      cards.map((card) => {
        const face = card.querySelector('[data-place]')!;
        const code = card.querySelector('code')!;
        return {
          right: card.getBoundingClientRect().right,
          left: card.getBoundingClientRect().left,
          // Layout height, not the box of a card tilted by hover.
          height: (card as HTMLElement).offsetHeight,
          cut: face.scrollHeight > face.clientHeight || code.scrollWidth > code.clientWidth,
        };
      }),
    );
  for (const width of [1400, 1180, 1000]) {
    await page.setViewportSize({ width, height: 800 });
    const front = await inspectCards();
    expect(
      front.some(({ cut }) => cut),
      `no card is cut at ${width}`,
    ).toBe(false);
    front.slice(1).forEach(({ left }, index) => expect(left).toBeGreaterThanOrEqual(front[index]!.right));
    const handRight = await page.locator('[data-hand]').evaluate((hand) => hand.getBoundingClientRect().right);
    expect(front.at(-1)!.right, `every card is in view at ${width}`).toBeLessThanOrEqual(handRight);

    const flips = page.locator('[data-card]:not([hidden]) [data-flip]');
    for (const flip of await flips.all()) await flip.click();
    await page.mouse.move(0, 0);
    const back = await inspectCards();
    expect(
      back.map(({ height }) => height),
      `flipping keeps the height at ${width}`,
    ).toEqual(front.map(({ height }) => height));
    for (const flip of await flips.all()) await flip.click();
  }
});

test('on a phone the tutorial can be followed to the first run', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(URL);
  await begin(page);
  for (let step = 0; step < 3; step += 1) await page.locator('[data-bubble-next]').click();
  await page.locator('[data-card=load-all] [data-place]').click();
  await page.locator('[data-card=one-by-one] [data-place]').click();
  await page.locator('[data-run]').click({ timeout: 3_000 });
  await expect(page.locator('[data-coach]')).toBeHidden();
});

test('the run does not move the layout and the result compares every choice', async ({ page }) => {
  await skipTips(page);
  await page.goto(URL);
  await begin(page);
  await page.locator('[data-card=cursor] [data-place]').click();
  await page.locator('[data-card=one-by-one] [data-place]').click();
  const boardBefore = await page.locator('.oom-board').boundingBox();
  await page.locator('[data-run]').click();
  await expect(page.locator('[data-objective=survive] [data-value]')).toContainText('lleno');
  expect(await page.locator('.oom-board').boundingBox()).toEqual(boardBefore);
  await expect(page.locator('[data-result]')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('[data-compare] tr')).toHaveCount(1);

  await page.locator('[data-retry]').click();
  await page.locator('[data-card=load-all] [data-place]').click();
  await page.locator('[data-run]').click();
  await expect(page.locator('[data-result]')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('[data-compare] tr')).toHaveCount(2);
  await expect(page.locator('[data-compare] tr').first()).toContainText('Todos de golpe');
});

test('loading everything dies with months of history', async ({ page }) => {
  await skipTips(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(URL);
  await begin(page);
  await play(page, 'load-all', 'one-by-one');
  await page.locator('[data-next]').click();
  await begin(page);
  await play(page, 'load-all', 'one-by-one');
  await expect(page.locator('[data-stage]')).toHaveClass(/is-killed/);
  await expect(page.locator('[data-result-text]')).toContainText('antes de revisar el primer log');
});

test('the batch size dial changes the code and progress survives a reload', async ({ page }) => {
  await skipTips(page);
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'oom-lab-progress',
      JSON.stringify({ stars: { 1: 3, 2: 3, 3: 3 }, survived: { 1: true, 2: true, 3: true } }),
    );
  });
  await page.goto(URL);
  await begin(page);
  await page.locator('[data-challenge="4"]').click();
  await begin(page);
  await expect(page.locator('[data-title]')).toContainText('Reto 4');
  await page.locator('[data-card=cursor] [data-place]').click();
  await page.locator('[data-card=batches] [data-place]').click();
  await expect(page.locator('[data-dial-control]')).toContainText('1_000');
  await page.locator('[data-dial="+"]').click();
  await expect(page.locator('[data-dial-control]')).toContainText('5_000');

  await page.setViewportSize({ width: 360, height: 740 });
  await page.reload();
  await expect(page.locator('[data-challenge="1"] [data-stars]')).toHaveText('★★★');
  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflows, 'the page does not scroll sideways').toBe(false);
});

test('the Spanish catalogue links to the lab', async ({ page }) => {
  await page.goto('/contenido/laboratorios/');
  await page.getByRole('link', { name: /Exit 137/ }).click();
  await expect(page).toHaveURL(/\/laboratorios\/exit-137\/\?reto=1$/);
});

test('the English lab speaks English from the catalogue to the challenge sheet', async ({ page }) => {
  await page.goto('/en/content/labs/');
  await page.getByRole('link', { name: /The heavy query/ }).click();
  await expect(page).toHaveURL(/\/en\/labs\/exit-137\/\?reto=3$/);
  const sheet = page.getByRole('dialog', { name: 'The heavy query' });
  await expect(sheet).toContainText('5 million logs');
  await expect(sheet.getByRole('button', { name: 'Start' })).toBeVisible();
});

test('each challenge of the catalogue opens straight on its sheet', async ({ page }) => {
  await page.goto('/contenido/laboratorios/');
  await page.getByRole('link', { name: /La consulta pesada/ }).click();
  await expect(page).toHaveURL(/\/laboratorios\/exit-137\/\?reto=3$/);
  await expect(page.getByRole('dialog', { name: 'La consulta pesada' })).toBeVisible();
});

test('a first visit opens on the challenge sheet, with its volume and requirements, before the tutorial', async ({
  page,
}) => {
  await page.goto(URL);
  const sheet = page.getByRole('dialog', { name: 'Una semana de logs' });
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText('20.000 logs · una semana');
  await expect(sheet.locator('[data-briefing-objectives] li')).toHaveText([
    '☆ Sin OOM Killed',
    '☆ Menos de 1 s',
    '☆ Menos de 512 MB',
  ]);
  await sheet.getByRole('button', { name: 'Empezar' }).click();
  await expect(sheet).toBeHidden();
  await expect(page.locator('[data-bubble-step]')).toHaveText('Paso 1 de 6');
  await page.getByText('Saltar tutorial').click();
  await page.reload();
  await expect(page.getByRole('dialog', { name: 'Una semana de logs' })).toBeVisible();
  await begin(page);
  await expect(page.locator('[data-coach]')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Tutorial', exact: true })).toBeVisible();
});
