import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
const base = process.env.GAME_TEST_URL ?? 'http://127.0.0.1:4328';
const binary =
  process.env.GAME_BROWSER ??
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
const output = resolve('.astro/async-chaos-lab-review');
await mkdir(output, { recursive: true });
const profile = await mkdtemp(resolve('.astro/async-chaos-lab-browser-'));
const browser = spawn(
  binary,
  [
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
  ],
  { stdio: 'ignore' },
);
let launchError;
const browserStopped = new Promise((resolve) => {
  browser.once('exit', resolve);
  browser.once('error', (error) => {
    launchError = error;
    resolve();
  });
});
let socket;
const pending = new Map();
let seq = 0;
const errors = [];
const networkRequests = [];
try {
  let target;
  for (let i = 0; i < 80; i++) {
    if (launchError) throw launchError;
    if (browser.exitCode !== null)
      throw new Error('Review browser exited before startup');
    try {
      const port = (
        await readFile(resolve(profile, 'DevToolsActivePort'), 'utf8')
      ).split('\n')[0];
      const tabs = await (
        await fetch(`http://127.0.0.1:${port}/json/list`)
      ).json();
      target = tabs.find((t) => t.type === 'page');
      if (target) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  assert(target, 'No review browser tab');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    socket.onopen = res;
    socket.onerror = rej;
  });
  socket.onmessage = ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.id) {
      const job = pending.get(msg.id);
      if (job) {
        pending.delete(msg.id);
        clearTimeout(job.timer);
        if (msg.error) job.reject(new Error(msg.error.message));
        else job.resolve(msg.result);
      }
    } else if (msg.method === 'Network.requestWillBeSent') {
      const request = msg.params.request;
      if (/^https?:/.test(request.url)) networkRequests.push(request);
    } else if (msg.method === 'Runtime.exceptionThrown')
      errors.push(
        msg.params.exceptionDetails.text +
          ' ' +
          (msg.params.exceptionDetails.exception?.description ?? ''),
      );
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error('CDP timeout: ' + method));
      }, 15000);
      pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails)
      throw new Error(
        result.exceptionDetails.exception?.description ??
          result.exceptionDetails.text,
      );
    return result.result.value;
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  // Accelerate only the review browser's simulation clock; production stays 650 ms.
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source:
      'const nativeInterval=window.setInterval;window.setInterval=(fn,ms,...args)=>nativeInterval(fn,ms===650?(window.reviewClock??16):ms,...args);',
  });
  const clickSelector = async (selector) => {
    if (await evaluate('!!document.querySelector("dialog[open]")'))
      await new Promise((r) => setTimeout(r, 430));
    const point = await evaluate(
      `(()=>{const b=document.querySelector(${JSON.stringify(selector)});if(!b||b.disabled||!b.getClientRects().length)throw Error('Unavailable control: '+${JSON.stringify(selector)});b.scrollIntoView({block:'nearest',behavior:'instant'});const r=b.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y);if(!b.contains(hit))throw Error('Control is covered: '+${JSON.stringify(selector)}+' by '+hit?.outerHTML.slice(0,180));return {x,y};})()`,
    );
    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      ...point,
      button: 'left',
      clickCount: 1,
    });
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      ...point,
      button: 'left',
      clickCount: 1,
    });
  };
  const click = async (action) => {
    const modal = `dialog[open] [data-action="${action}"]`;
    await clickSelector(
      (await evaluate(`!!document.querySelector(${JSON.stringify(modal)})`))
        ? modal
        : `queue-stories-game [data-action="${action}"]`,
    );
  };
  const dismiss = async () => {
    if (await evaluate('!!document.querySelector("dialog[open]")'))
      await click('dismiss');
  };
  const setting = (key) =>
    clickSelector(`queue-stories-game [data-setting="${key}"]`);
  const select = async (key, value) => {
    await evaluate(
      `(()=>{const el=document.querySelector('queue-stories-game [data-setting="${key}"]');el.value=${JSON.stringify(String(value))};el.dispatchEvent(new Event('change',{bubbles:true}));})()`,
    );
    if (key.startsWith('kind-')) {
      assert.equal(
        await evaluate('document.activeElement.dataset.setting'),
        key,
        'changing an action keeps keyboard focus on that choice',
      );
    }
  };
  const rename = async (key, value) => {
    await evaluate(
      `(()=>{const el=document.querySelector('queue-stories-game [data-label="${key}"]');el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('input',{bubbles:true}));})()`,
    );
  };
  const screenshot = async (name, fullPage = false) => {
    const delay = (await evaluate('!!document.querySelector("dialog[open]")'))
      ? 1300
      : 250;
    await new Promise((r) => setTimeout(r, delay));
    await evaluate('document.querySelector("astro-dev-toolbar")?.remove()');
    const shot = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: fullPage,
    });
    await writeFile(
      resolve(output, name + '.png'),
      Buffer.from(shot.data, 'base64'),
    );
  };
  const load = async (locale, level) => {
    const marker = String(Date.now()) + '-' + Math.random();
    await evaluate(`window.reviewNavigationMarker=${JSON.stringify(marker)}`);
    const url = `${base}/${locale}/${locale === 'es' ? 'laboratorios' : 'labs'}/${level === 1 ? 'async-chaos-lab' : 'worker-steps'}/`;
    await send('Page.navigate', { url });
    let ready = false;
    for (let i = 0; i < 160; i++) {
      try {
        ready = await evaluate(
          `window.reviewNavigationMarker!==${JSON.stringify(marker)} && location.href===${JSON.stringify(url)} && !!document.querySelector('queue-stories-game button')`,
        );
      } catch {}
      if (ready) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    assert(ready, 'Game did not initialize in the new document');
    await evaluate(
      'document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))',
    );
    await evaluate('document.querySelector("astro-dev-toolbar")?.remove()');
  };
  const phase = () =>
    evaluate('document.querySelector("queue-stories-game").dataset.phase');
  const feedback = () =>
    evaluate('document.querySelector("[data-feedback]").textContent');
  const untilStop = async () =>
    evaluate(
      `new Promise((resolve,reject)=>{const end=Date.now()+5000;const check=()=>{const phase=document.querySelector('queue-stories-game').dataset.phase;if(['incident','won','lost','duplicate'].includes(phase))resolve(phase);else if(Date.now()>end)reject(Error('No incident/outcome: '+phase));else requestAnimationFrame(check)};check()})`,
    );
  const runToStop = async () => {
    await click('play');
    await untilStop();
    assert.deepEqual(errors, []);
  };
  const finish = async () => {
    if ((await phase()) !== 'running') await click('play');
    for (let i = 0; i < 10; i++) {
      await untilStop();
      if ((await phase()) !== 'incident') return;
      await click('play');
    }
    throw Error('Recovery loop');
  };
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await load('es', 1);
  await evaluate('sessionStorage.clear()');
  await evaluate(
    'sessionStorage.setItem("queue-story-names-es",JSON.stringify({storage:"Base de datos"}))',
  );
  await load('es', 1);
  assert.equal(
    await evaluate(
      'document.querySelector("[data-display-label=storage]").textContent',
    ),
    'Memoria RAM',
    'a saved default storage name must match the current RAM configuration',
  );
  assert.equal(
    await evaluate('!!document.querySelector("[data-action=step]")'),
    false,
  );
  assert.equal(
    await evaluate('!!document.querySelector("[data-setting=count]")'),
    false,
  );
  assert.equal(
    await evaluate('document.querySelectorAll("[data-step-card]").length'),
    3,
  );
  assert.match(
    await evaluate(
      'document.querySelectorAll("[data-step-card]")[1].textContent',
    ),
    /1 registro por ID/,
  );
  assert.match(
    await evaluate(
      'document.querySelectorAll("[data-step-card]")[0].textContent',
    ),
    /Repetirlo es seguro/,
  );
  assert.doesNotMatch(
    await evaluate('document.querySelector("[data-step-card]").textContent'),
    /puede duplicarse|efecto externo/,
  );
  assert.equal(
    await evaluate(
      'getComputedStyle(document.querySelector("[data-label=worker]")).display',
    ),
    'none',
  );
  assert.equal(
    await evaluate(
      'document.querySelectorAll("queue-stories-game table").length',
    ),
    0,
  );
  for (const selector of [
    '.qs-reference',
    '.qs-footer-actions',
    '[data-setting=gap]',
  ])
    assert.equal(
      await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`),
      false,
    );
  assert.equal(
    await evaluate('document.querySelectorAll("[data-job-row]").length'),
    3,
  );
  const visibleDock = () =>
    evaluate(
      '(()=>{const r=document.querySelector(".qs-dock").getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight})()',
    );
  const fullSystemWidth = await evaluate(
    'document.querySelector(".qs-system").getBoundingClientRect().width',
  );
  const guidedFits = async () => {
    await evaluate('scrollTo(0,0)');
    const layout = await evaluate(
      '(()=>{const r=s=>{const b=document.querySelector(s).getBoundingClientRect();return {top:b.top,bottom:b.bottom,width:b.width}};return {system:r(".qs-system"),guide:r("[data-guide]"),dock:r(".qs-dock"),height:innerHeight,font:parseFloat(getComputedStyle(document.querySelector(".qs-guide-story p")).fontSize)}})()',
    );
    assert.equal(
      layout.system.width,
      fullSystemWidth,
      'walkthrough keeps the diagram full width',
    );
    assert(
      layout.guide.top >= layout.system.bottom,
      'explanation follows the diagram',
    );
    assert(
      layout.guide.bottom <= layout.dock.top,
      'transport does not cover the explanation: ' + JSON.stringify(layout),
    );
    assert(
      layout.guide.bottom <= layout.height,
      'guided canvas fits desktop: ' + JSON.stringify(layout),
    );
    assert(layout.font >= 13, 'readable explanation text');
    assert.equal(await visibleDock(), true, 'guided transport stays visible');
  };
  assert.equal(await visibleDock(), true, 'initial transport visible');
  assert.equal(
    await evaluate(
      '!!document.querySelector(".qs-dock [data-action=personalize]")',
    ),
    false,
  );
  assert.equal(
    await evaluate(
      'document.querySelector("[data-action=personalize]").getBoundingClientRect().bottom<=document.querySelector(".qs-api").getBoundingClientRect().top',
    ),
    true,
    'names sit above the API',
  );
  await screenshot('queue-initial');
  assert.equal(
    await evaluate(
      'document.querySelector(".qs-diagram").getBoundingClientRect().bottom<=innerHeight',
    ),
    true,
    'core diagram fits desktop',
  );
  await evaluate('window.reviewClock=650');
  await click('play');
  await click('play');
  assert.match(
    await evaluate('document.querySelector("[data-action=play]").textContent'),
    /Continuar/,
  );
  assert.match(
    await evaluate(
      'document.querySelectorAll("[data-step-state]")[0].textContent',
    ),
    /ID 01/,
  );
  assert.equal(
    await evaluate(
      '!!document.querySelector(".qs-job.is-working") && !!document.querySelector(".qs-step.is-active") && !!document.querySelector(".qs-active-job.is-executing")',
    ),
    true,
    'current payment and action highlighted',
  );
  await screenshot('queue-executing');
  const paused = await evaluate(
    'document.querySelector("[data-steps]").textContent+document.querySelector("[data-results]").textContent',
  );
  await new Promise((r) => setTimeout(r, 700));
  assert.equal(
    await evaluate(
      'document.querySelector("[data-steps]").textContent+document.querySelector("[data-results]").textContent',
    ),
    paused,
    'pause freezes transitions',
  );
  await click('guide');
  assert.match(
    await evaluate('document.querySelector("dialog").textContent'),
    /LLAMADA ENTRANTE/,
  );
  await click('dismiss');
  assert.equal(
    await evaluate(
      'document.querySelector("[data-steps]").textContent+document.querySelector("[data-results]").textContent',
    ),
    paused,
    'the introductory call preserves the paused trial',
  );
  await click('reset');
  await evaluate('window.reviewClock=16');
  await runToStop();
  assert.equal(await phase(), 'lost');
  assert.match(
    await evaluate('document.querySelector("dialog").textContent'),
    /Quien tiene miedo/,
  );
  assert.match(
    await evaluate('sessionStorage.getItem("queue-story-achievements")'),
    /brave/,
  );
  await dismiss();
  await click('reset');
  // The guide uses real trials, decisions, contextual incidents and a completion that preserves the working system.
  await click('guide');
  assert.equal(
    await evaluate('document.querySelector("dialog").dataset.tone'),
    'story',
  );
  await screenshot('tutorial-call');
  assert.match(
    await evaluate('document.querySelector("dialog").textContent'),
    /Dónde esperan/,
  );
  assert.match(
    await evaluate('document.querySelector("dialog").textContent'),
    /pagarnos dos veces/,
  );
  await click('walkthrough');
  await select('protect', 'on');
  assert.doesNotMatch(
    await evaluate('document.querySelector("[data-guide]").textContent'),
    /La base de datos conserva/,
    'ID protection alone must not claim that RAM is durable',
  );
  await select('protect', 'off');
  assert.equal(
    await evaluate('!!document.querySelector("dialog[open]")'),
    false,
    'no second introduction',
  );
  assert.equal(
    await evaluate('document.querySelectorAll("[data-guide-focus]").length'),
    0,
    'start asks to run, not change a setting',
  );
  await guidedFits();
  await screenshot('queue-guided-map');
  await click('play');
  await untilStop();
  assert.equal(await phase(), 'lost');
  assert.match(await feedback(), /PERDISTE LOS DATOS/);
  assert.equal(await evaluate('document.querySelector("dialog").open'), true);
  assert.match(
    await evaluate('document.querySelector("dialog").textContent'),
    /GAME LOSS/,
  );
  assert.match(
    await evaluate('document.querySelector("dialog").textContent'),
    /TU COMPAÑERO DE GUARDIA/,
  );
  assert.equal(
    await evaluate(
      'document.querySelectorAll(".qs-array .qs-job.is-lost").length',
    ),
    2,
  );
  assert.doesNotMatch(
    await evaluate('document.querySelector("#qs-outcome-text").textContent'),
    /RAM|worker|persist/,
    'caller reports a customer problem, not the technical diagnosis',
  );
  await new Promise((r) => setTimeout(r, 1900));
  await screenshot('queue-ram-loss');
  await click('lesson');
  await guidedFits();
  assert.equal(
    await evaluate(
      'document.querySelector("[data-guide-focus]").dataset.setting',
    ),
    'storage',
  );
  await click('guide-focus');
  assert.equal(
    await evaluate('document.activeElement.dataset.setting'),
    'storage',
  );
  await select('storage', 'db');
  await guidedFits();
  await runToStop();
  assert.equal(await phase(), 'incident');
  assert.match(await feedback(), /conserva el trabajo pendiente/);
  assert.match(
    await evaluate('document.querySelector("dialog").textContent'),
    /cliente sigue esperando/i,
  );
  assert.equal(
    await evaluate(
      'document.querySelector("dialog").getBoundingClientRect().width<innerWidth*.8',
    ),
    true,
    'recovery alert stays over the diagram',
  );
  await screenshot('queue-worker-call');
  await runToStop();
  assert.match(await feedback(), /confirmación/);
  await runToStop();
  assert.equal(await phase(), 'duplicate');
  assert.match(
    await evaluate(
      'document.querySelectorAll("[data-job-status]")[2].textContent',
    ),
    /DUPLICADO/,
  );
  assert.equal(
    await evaluate('!!document.querySelector(".qs-step.is-active")'),
    false,
    'a failed run is not still processing',
  );
  await click('lesson');
  await guidedFits();
  await select('protect', 'on');
  await guidedFits();
  await screenshot('queue-guided-id');
  await finish();
  assert.equal(await phase(), 'won');
  assert.match(
    await evaluate('document.querySelector("[data-results]").textContent'),
    /0.*registros de más/,
  );
  await screenshot('queue-won');
  const queueResult = await evaluate(
    'document.querySelector("[data-steps]").textContent+document.querySelector("[data-results]").textContent',
  );
  await click('guide-finish');
  assert.equal(await phase(), 'won');
  assert.equal(await evaluate('document.querySelector("dialog").open'), false);
  assert.equal(
    await evaluate('document.querySelector("[data-guide]").textContent'),
    '',
  );
  assert.equal(
    await evaluate('document.querySelector("[data-setting=storage]").value'),
    'db',
  );
  assert.equal(
    await evaluate('document.querySelector("[data-setting=protect]").value'),
    'on',
  );
  assert.equal(
    await evaluate(
      'document.querySelector("[data-steps]").textContent+document.querySelector("[data-results]").textContent',
    ),
    queueResult,
    'finishing retains completed jobs and records',
  );
  await screenshot('queue-guide-finished');
  await click('guide');
  await click('tutorial-start');
  await untilStop();
  assert.equal(await phase(), 'incident');
  assert.equal(
    await evaluate('document.querySelector("[data-setting=storage]").value'),
    'db',
    'call start keeps the chosen persistence',
  );
  assert.equal(
    await evaluate('document.querySelector("[data-setting=protect]").value'),
    'on',
    'call start keeps ID protection',
  );
  await finish();
  assert.equal(await phase(), 'won');
  await dismiss();
  // Rules are on the nodes; names require an explicit editing mode.
  await select('storage', 'db');
  await select('protect', 'on');
  await click('personalize');
  await rename('job-0', 'Informe diario');
  await rename('worker', 'Mi procesador');
  await click('personalize');
  await finish();
  assert.equal(await phase(), 'won');
  assert.equal(
    await evaluate('document.querySelectorAll("[data-step-card]").length'),
    3,
  );
  await dismiss();
  await load('es', 2);
  assert.equal(
    await evaluate('document.querySelector("[data-label=job-0]").value'),
    'Informe diario',
  );
  assert.equal(
    await evaluate(
      'document.querySelectorAll("queue-stories-game table").length',
    ),
    0,
  );
  assert.equal(
    await evaluate('document.querySelectorAll("[data-job-row]").length'),
    3,
  );
  assert.equal(await visibleDock(), true, 'worker transport visible');
  assert.equal(
    await evaluate(
      'document.querySelector(".qs-worker-interior").getBoundingClientRect().bottom<=innerHeight',
    ),
    true,
    'worker fits desktop',
  );
  await screenshot('worker-initial');
  await click('guide');
  assert.match(
    await evaluate('document.querySelector("dialog").textContent'),
    /Recordar por ID/,
  );
  await click('walkthrough');
  await guidedFits();
  await screenshot('worker-guided-map');
  await click('play');
  await untilStop();
  assert.match(await feedback(), /Cobraste/);
  assert.match(
    await evaluate('document.querySelector("dialog").textContent'),
    /Ha pagado y no puede entrar/,
  );
  await screenshot('worker-partial-effect');
  await runToStop();
  assert.equal(await phase(), 'duplicate');
  await click('lesson');
  await setting('remember-1');
  await finish();
  assert.equal(await phase(), 'won');
  assert.match(await feedback(), /repetiste 2 pasos/);
  await screenshot('worker-safe-but-wasteful');
  await click('lesson');
  for (const i of [0, 2, 3]) await setting('remember-' + i);
  await finish();
  assert.equal(await phase(), 'won');
  assert.match(await feedback(), /Saltaste 5 pasos/);
  await screenshot('worker-efficient');
  const workerResult = await evaluate(
    'document.querySelector("[data-steps]").textContent+document.querySelector("[data-results]").textContent',
  );
  await click('guide-finish');
  assert.equal(await phase(), 'won');
  assert.equal(
    await evaluate(
      '[...document.querySelectorAll("[data-setting^=remember]")].every(e=>e.checked)',
    ),
    true,
  );
  assert.equal(
    await evaluate('document.querySelector("[data-guide]").textContent'),
    '',
  );
  assert.equal(
    await evaluate(
      'document.querySelector("[data-steps]").textContent+document.querySelector("[data-results]").textContent',
    ),
    workerResult,
    'finishing retains checkpoints and results',
  );
  // Leaving the tutorial restores the exact prior trial and configuration.
  const before = await evaluate(
    'document.querySelector("[data-steps]").textContent+document.querySelector("[data-results]").textContent',
  );
  await click('guide');
  await click('walkthrough');
  await click('guide-close');
  assert.equal(await phase(), 'won');
  assert.equal(
    await evaluate(
      'document.querySelector("[data-steps]").textContent+document.querySelector("[data-results]").textContent',
    ),
    before,
  );
  // Pure/local work is independent of external-effect deduplication.
  await evaluate(
    'document.querySelectorAll(".qs-step-options details").forEach(e=>e.open=true)',
  );
  for (const i of [0, 1, 2, 3]) {
    await select('kind-' + i, 'check');
    assert.equal(
      await evaluate(
        `[...document.querySelectorAll('.qs-step-options details')].every(details=>details.open)`,
      ),
      true,
      'changing one action preserves expanded step options',
    );
    if (
      await evaluate(
        `document.querySelector('[data-setting="remember-${i}"]').checked`,
      )
    )
      await setting('remember-' + i);
  }
  assert.equal(
    await evaluate(
      'document.querySelectorAll("[data-setting^=provider]").length',
    ),
    0,
  );
  assert.doesNotMatch(
    await feedback(),
    /cobrar|Stripe/,
    'custom pure-action configuration must not narrate a charge that will not occur',
  );
  await finish();
  assert.equal(await phase(), 'won');
  assert.match(
    await evaluate('document.querySelector("[data-results]").textContent'),
    /0.*efectos externos/,
  );
  await dismiss();
  await select('kind-1', 'append');
  await finish();
  assert.equal(await phase(), 'duplicate');
  assert.doesNotMatch(await feedback(), /Cobraste/);
  await screenshot('worker-local-duplicate');
  await dismiss();
  await setting('remember-1');
  await finish();
  assert.equal(await phase(), 'won');
  await dismiss();
  await click('personalize');
  const hostile = '<img src=x onerror="window.storyXss=1">';
  await rename('step-1', hostile);
  await rename('job-0', hostile);
  await rename('worker', hostile);
  await click('personalize');
  assert.equal(
    await evaluate(
      'window.storyXss===undefined && !document.querySelector("queue-stories-game img")',
    ),
    true,
  );
  await click('reset');
  await finish();
  assert.equal(await phase(), 'won');
  assert.equal(
    await evaluate(
      'window.storyXss===undefined && !document.querySelector("queue-stories-game img")',
    ),
    true,
  );
  await dismiss();
  await evaluate('sessionStorage.removeItem("queue-story-names-es")');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  for (const level of [1, 2]) {
    await load('es', level);
    assert.equal(
      await evaluate('document.documentElement.scrollWidth<=innerWidth'),
      true,
      'mobile overflow level ' + level,
    );
    await screenshot('level-' + level + '-mobile');
    assert.equal(await visibleDock(), true, 'mobile transport visible');
    await evaluate('scrollTo(0,document.body.scrollHeight)');
    assert.equal(await visibleDock(), true, 'transport follows scrolling');
    await runToStop();
    assert.equal(
      await evaluate(
        'document.querySelector("dialog").getBoundingClientRect().width<=innerWidth',
      ),
      true,
    );
    await screenshot('level-' + level + '-mobile-incident');
    await dismiss();
    await click('guide');
    await click('walkthrough');
    await screenshot('level-' + level + '-mobile-guided', true);
    await click('guide');
    assert.equal(
      await evaluate(
        '(()=>{const r=document.querySelector("[data-guide]").getBoundingClientRect(),d=document.querySelector(".qs-dock").getBoundingClientRect();return r.top>=0&&r.bottom<=d.top})()',
      ),
      true,
      'mobile can read the current step without the transport covering it',
    );
    if (level === 1) {
      await runToStop();
      await click('lesson');
      await click('guide-focus');
      assert.equal(
        await evaluate('document.activeElement.dataset.setting'),
        'storage',
      );
    }
  }
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await load('es', 1);
  await runToStop();
  assert.equal(
    await evaluate(
      'getComputedStyle(document.querySelector(".qs-ticket.is-lost")).animationName',
    ),
    'none',
  );
  assert.equal(
    await evaluate('!!document.activeElement.closest("dialog[open]")'),
    true,
    'outcome owns keyboard focus',
  );
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Escape',
    code: 'Escape',
    windowsVirtualKeyCode: 27,
  });
  await send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Escape',
    code: 'Escape',
    windowsVirtualKeyCode: 27,
  });
  assert.equal(await evaluate('document.querySelector("dialog").open'), false);
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
  });
  for (const level of [1, 2]) {
    await load('en', level);
    assert.equal(await evaluate('document.documentElement.lang'), 'en');
    await evaluate('document.documentElement.dataset.theme="dark"');
    await screenshot('level-' + level + '-english-dark');
  }
  // Browser storage is optional; a privacy restriction must not break either lab.
  const blockedStorage = await send('Page.addScriptToEvaluateOnNewDocument', {
    source:
      'Storage.prototype.getItem=Storage.prototype.setItem=function(){throw new DOMException("Storage blocked","SecurityError")}',
  });
  await load('es', 1);
  await runToStop();
  assert.equal(await phase(), 'lost');
  await send('Page.removeScriptToEvaluateOnNewDocument', {
    identifier: blockedStorage.identifier,
  });
  assert(
    networkRequests.every(
      (request) =>
        new URL(request.url).origin === new URL(base).origin &&
        request.method === 'GET',
    ),
    'the labs only load local static resources and make no API/service requests',
  );
  console.log(
    'PASS introductory calls, optional walkthroughs, real Play/Pause flows, popup alerts and preserved tutorial results, achievements, visible losses, diagram-only progress, RAM loss, DB recovery, ACK redelivery, checkpoints, renaming/XSS, mobile, EN, dark, reduced motion',
  );
  assert.deepEqual(errors, []);
  console.log('No uncaught browser errors. Screenshots:', output);
} finally {
  socket?.close();
  browser.kill();
  const killTimer = setTimeout(() => browser.kill('SIGKILL'), 2000);
  await browserStopped;
  clearTimeout(killTimer);
  await rm(profile, { recursive: true, force: true });
}
