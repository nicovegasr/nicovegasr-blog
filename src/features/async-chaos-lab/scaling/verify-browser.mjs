import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
const base = process.env.GAME_TEST_URL ?? 'http://127.0.0.1:4321';
const binary =
  process.env.GAME_BROWSER ??
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
const output = resolve('.astro/scaling-review');
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

  await send('Page.addScriptToEvaluateOnNewDocument', {
    source:
      'const nativeInterval=window.setInterval;window.setInterval=(fn,ms,...args)=>nativeInterval(fn,ms<=120?(window.reviewInterval??4):ms,...args);',
  });
  const waitFor = async (expression) => {
    for (let i = 0; i < 200; i++) {
      if (await evaluate(expression)) return;
      await new Promise((r) => setTimeout(r, 25));
    }
    throw Error('Timed out: ' + expression);
  };
  const click = async (selector) => {
    const point = await evaluate(
      `(()=>{const b=document.querySelector(${JSON.stringify(selector)});if(!b||b.disabled||!b.getClientRects().length)throw Error('Unavailable: '+${JSON.stringify(selector)});b.scrollIntoView({block:'nearest',behavior:'instant'});const r=b.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;if(!b.contains(document.elementFromPoint(x,y)))throw Error('Covered: '+${JSON.stringify(selector)});return{x,y}})()`,
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
  const action = (name) => click(`[data-action="${name}"]`);
  const phase = () =>
    evaluate('document.querySelector("queue-scaling-game").dataset.phase');
  const dialogText = () =>
    evaluate('document.querySelector("dialog").textContent');
  const stopped = () => waitFor('document.querySelector("dialog").open');
  const close = async () => {
    if (await evaluate('document.querySelector("dialog").open'))
      await action((await evaluate('document.querySelector("dialog").classList.contains("qs-outcome")')) ? 'close' : 'modal-primary');
  };
  const screenshot = async (name) => {
    await new Promise((r) => setTimeout(r, 260));
    await evaluate('document.querySelector("astro-dev-toolbar")?.remove()');
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(
      resolve(output, name + '.png'),
      Buffer.from(shot.data, 'base64'),
    );
  };
  const load = async (locale = 'es') => {
    await send('Page.navigate', {
      url: `${base}/${locale}/${locale === 'es' ? 'laboratorios' : 'labs'}/scaling/`,
    });
    await waitFor(
      '!!document.querySelector("queue-scaling-game [data-action=play]")',
    );
    await evaluate('document.fonts.ready');
    await evaluate('document.querySelector("astro-dev-toolbar")?.remove()');
  };
  const playToOutcome = async () => {
    await action('play');
    await stopped();
  };
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await load();
  await evaluate('sessionStorage.clear()');
  await load();
  assert.match(await dialogText(), /Todo funciona/);
  await screenshot('01-intro');
  await close();
  assert.equal(await phase(), 'ready');
  await click('.qs-achievements summary');
  assert.equal(await evaluate('document.querySelectorAll("[data-achievement]").length'), 3);
  assert.equal(await evaluate('document.querySelectorAll("[data-achievement].is-unlocked").length'), 0);
  await click('.qs-achievements summary');
  assert.equal(await evaluate('document.querySelectorAll("[data-limit], [data-admission], [data-protect], [data-inspector], [data-action^=crash]").length'), 0, 'no separate admission fields or manual failures');
  assert.equal(await evaluate('document.querySelectorAll(".sc-capacity-control").length'), 4);
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".sc-step"),"::after").content'), 'none', 'no arrows between steps');
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".sc-queue"),"::after").content'), 'none', 'no queue arrow');
  await evaluate('window.reviewInterval=35');
  await action('play');
  await waitFor('document.querySelector("[data-time]").textContent!=="0 s"');
  await action('play');
  assert.equal(await phase(), 'paused');
  const pausedTime = await evaluate('document.querySelector("[data-time]").textContent');
  await action('speed:4');
  await new Promise((r) => setTimeout(r, 120));
  assert.equal(await evaluate('document.querySelector("[data-time]").textContent'), pausedTime);
  await evaluate('window.reviewInterval=4');
  await playToOutcome();
  assert.match(await dialogText(), /144 s/);
  assert.equal(await evaluate('document.querySelectorAll("[data-earned]").length'), 0);
  assert.match(await dialogText(), /primer intento completado/);
  assert.doesNotMatch(await dialogText(), /TU INTENTO ANTERIOR/);
  await close();
  for (let i = 0; i < 3; i++) await action('more');

  // Four workers arrive at Stripe automatically. Three service slots cannot take four calls.
  for (let run = 0; run < 2; run++) {
    await action('reset');
    await evaluate('window.reviewInterval=80');
    await action('play');
    assert.equal(await evaluate('document.querySelectorAll(\'[data-location="active-0"] > button\').length'), 4);
    await stopped();
    assert.equal(await phase(), 'blocked');
    assert.match(await dialogText(), /GAME LOSS/);
    assert.match(await dialogText(), /paso 2/);
    assert.equal(await evaluate('document.querySelector("dialog").classList.contains("qs-outcome")'), true);
    assert.equal(await evaluate('document.querySelectorAll("[data-job]").length'), 24);
    assert.notEqual(await evaluate('getComputedStyle(document.querySelector("dialog")).clipPath'), 'none', 'shared incident ticket has a torn bottom edge');
    assert.equal(await evaluate('document.querySelectorAll("[data-earned]").length'), run === 0 ? 1 : 0, 'new awards appear once, not on every replay');
    await screenshot(run === 0 ? '02-incident-ticket-with-awards' : '02-automatic-stripe-loss');
    await close();
    assert.equal(await evaluate('document.querySelector(\'[data-step="1"]\').classList.contains("is-down")'), true);
  }
  await screenshot('03-broken-chain');
  // Capacity upgrades change the resource itself, with no second hidden limit.
  await action('grow:1');
  assert.equal(await evaluate('document.querySelector(\'[data-resource-size="1"]\').textContent'), '4');
  assert.equal(await phase(), 'ready');
  await evaluate('window.reviewInterval=4');
  await playToOutcome();
  assert.match(await dialogText(), /paso 3/);
  await screenshot('04-next-service-fails');
  await close();
  await action('grow:2');
  await action('grow:2');
  assert.equal(await evaluate('document.querySelector(\'[data-resource-size="2"]\').textContent'), '4');
  await playToOutcome();
  assert.equal(await phase(), 'complete');
  assert.match(await dialogText(), /MISIÓN SUPERADA/);
  assert.match(await dialogText(), /36 s/);
  assert.match(await dialogText(), /252 u/);
  assert.match(await dialogText(), /TU INTENTO ANTERIOR/);
  assert.match(await dialogText(), /144 s/);
  assert.deepEqual(await evaluate('Array.from(document.querySelectorAll("[data-earned]")).map(el=>el.dataset.earned)'), ['on-time', 'minimum-team']);
  await screenshot('05-four-worker-win');
  await close();
  await action('reset');
  await playToOutcome();
  assert.match(await dialogText(), /MISIÓN SUPERADA/);
  assert.match(await dialogText(), /36 s/);
  assert.equal(await evaluate('document.querySelectorAll("[data-earned]").length'), 0, 'repeated wins do not repeat award notices');
  await close();
  assert.equal(await evaluate('document.querySelector(".sc-trial-bar").getBoundingClientRect().bottom<=innerHeight'), true, 'desktop fits one screen');
  await screenshot('06-no-arrows-or-panels');
  await click('.qs-achievements summary');
  assert.equal(await evaluate('document.querySelectorAll("[data-achievement].is-unlocked").length'), 3);
  await screenshot('12-achievement-catalogue');
  await click('.qs-achievements summary');
  // Overload is tested at a different service too.
  await action('shrink:3');
  await action('shrink:3');
  await playToOutcome();
  assert.match(await dialogText(), /paso 4/);
  await close();
  await action('grow:3');
  await action('grow:3');
  // Six occupied slots only appear after six workers and real receiving capacity exist.
  for (let i = 0; i < 2; i++) await action('more');
  for (const step of [0, 1, 2]) {
    await action(`grow:${step}`);
    await action(`grow:${step}`);
  }
  await action('grow:3');
  await evaluate('window.reviewInterval=80');
  await action('play');
  await waitFor('document.querySelectorAll(\'[data-location="active-1"] > button\').length===6');
  await action('play');
  assert.equal(await evaluate('document.querySelectorAll(\'[data-location="active-1"] > button\').length'), 6);
  assert.match(await evaluate('document.querySelector(\'[data-capacity="1"]\').textContent'), /6\/6/);
  await screenshot('07-six-real-service-slots');
  await evaluate('window.reviewInterval=4');
  await playToOutcome();
  assert.match(await dialogText(), /MISIÓN SUPERADA/);
  await close();
  await action('compare');
  assert.equal((await evaluate('document.querySelectorAll("dialog tbody tr").length')) > 1, true);
  await screenshot('08-comparison');
  await action('replay:0');
  assert.equal(await phase(), 'ready');
  await action('names');
  const hostile = '<img src=x onerror="window.scalingXss=1">';
  await evaluate(`(()=>{for(const [key,value] of Object.entries(${JSON.stringify({ api: hostile, 'step-1': 'Cobrar mi pedido', 'job-0': 'Pedido de Ana' })})){const input=document.querySelector('[data-rename="'+key+'"]');input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));}})()`);
  await close();
  assert.equal(await evaluate('document.querySelector("[data-name=api]").textContent'), hostile);
  await action('job:1');
  assert.match(await evaluate('document.querySelector("[data-radio]").textContent'), /Pedido de Ana/);
  assert.equal(await evaluate('window.scalingXss===undefined&&!document.querySelector("queue-scaling-game img")'), true);
  await load();
  assert.match(await dialogText(), /Todo funciona/);
  await close();
  assert.equal(await phase(), 'ready');
  await evaluate('document.documentElement.dataset.theme="dark"');
  await screenshot('09-dark');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await load();
  await close();
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
  assert.equal(await evaluate('(()=>{const r=document.querySelector(".sc-dock").getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight})()'), true);
  await screenshot('10-mobile');
  for (let i = 0; i < 3; i++) await action('more');
  await playToOutcome();
  assert.match(await dialogText(), /GAME LOSS/);
  assert.equal(await evaluate('document.querySelector("dialog").getBoundingClientRect().width<=innerWidth'), true);
  await screenshot('13-mobile-incident-ticket');
  await close();
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await load('en');
  assert.match(await dialogText(), /Too slowly/);
  assert.match(await evaluate('document.querySelector("[data-achievement-summary]").textContent'), /3\/3/, 'unlocks persist across reloads and locales');
  await close();
  await playToOutcome();
  assert.match(await dialogText(), /144 s/);
  assert.equal(await evaluate('document.querySelectorAll("[data-earned]").length'), 0);
  await screenshot('11-english');
  for (const path of ['async-chaos-lab', 'worker-steps']) {
    await send('Page.navigate', { url: `${base}/es/laboratorios/${path}/` });
    await waitFor('!!document.querySelector("queue-stories-game [data-action=play]")');
    assert.equal(await evaluate('document.querySelector("dialog").open'), true);
    assert.match(await dialogText(), /LLAMADA ENTRANTE/);
    if (path === 'async-chaos-lab') {
      await click('[data-action=dismiss]');
      assert.equal(await evaluate('getComputedStyle(document.querySelector(".qs-node-setting select")).appearance'), 'none');
      assert.equal(await evaluate('parseFloat(getComputedStyle(document.querySelector(".qs-node-setting"),"::after").right) === parseFloat(getComputedStyle(document.documentElement).fontSize)'), true);
      await screenshot('14-queue-select-chevrons');
    }
  }
  const blockedStorage = await send('Page.addScriptToEvaluateOnNewDocument', { source: 'Object.defineProperty(window,"sessionStorage",{get(){throw Error("Storage blocked in review")}});' });
  await load();
  await close();
  await playToOutcome();
  assert.equal(await phase(), 'complete');
  await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: blockedStorage.identifier });
  assert(networkRequests.every(request => new URL(request.url).origin === new URL(base).origin && request.method === 'GET'), 'static resources only');
  assert.deepEqual(errors, []);
  console.log('PASS: automatic overloads at Stripe/database/email, real capacity upgrades, repeated starts, four-worker win, six occupied service slots, shared serrated Game Loss on desktop/mobile, all achievement criteria/catalogue/deduplication/session persistence, no arrows/manual failure/admission controls, own trial comparison, introductions, pause/speed, mobile, EN, dark, reduced motion, names/XSS, blocked storage. Screenshots:', output);
} finally {
  socket?.close();
  browser.kill();
  const killTimer = setTimeout(() => browser.kill('SIGKILL'), 2000);
  await browserStopped;
  clearTimeout(killTimer);
  await rm(profile, { recursive: true, force: true });
}
