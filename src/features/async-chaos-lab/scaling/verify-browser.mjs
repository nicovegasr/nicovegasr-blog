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
  const closeInspector = async () => {
    if (await evaluate('!document.querySelector("[data-inspector]").hidden'))
      await action('inspector-close');
  };
  const phase = () =>
    evaluate('document.querySelector("queue-scaling-game").dataset.phase');
  const dialogText = () =>
    evaluate('document.querySelector("dialog").textContent');
  const stopped = () => waitFor('document.querySelector("dialog").open');
  const close = async () => {
    if (await evaluate('document.querySelector("dialog").open'))
      await action('modal-primary');
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
  assert.equal(
    await evaluate('document.querySelectorAll("[data-job]").length'),
    24,
  );
  assert.equal(
    await evaluate('document.querySelectorAll(".qs-levels a").length'),
    3,
  );
  await evaluate('window.reviewInterval=35');
  await close();
  await waitFor('document.querySelector("[data-time]").textContent!=="0 s"');
  await action('play');
  assert.equal(await phase(), 'paused');
  const pausedTime = await evaluate(
    'document.querySelector("[data-time]").textContent',
  );
  await action('speed:4');
  await new Promise((r) => setTimeout(r, 120));
  assert.equal(
    await evaluate('document.querySelector("[data-time]").textContent'),
    pausedTime,
  );
  await screenshot('02-one-worker-paused');
  await evaluate('window.reviewInterval=4');
  await playToOutcome();
  assert.equal(await phase(), 'complete');
  assert.match(await dialogText(), /144 s/);
  await close();
  for (let i = 0; i < 3; i++) await action('more');
  await playToOutcome();
  assert.equal(await phase(), 'complete');
  assert.doesNotMatch(await dialogText(), /MISIÓN SUPERADA/);
  assert.match(await dialogText(), /Más pods/);
  assert.match(await dialogText(), /39 s/);
  await screenshot('02b-first-improvement');
  await close();
  await closeInspector();
  for (let i = 0; i < 4; i++) await action('more'); // 8 workers unlock the waiting-gate story.
  await playToOutcome();
  assert.equal(await phase(), 'paused');
  assert.match(await dialogText(), /misma puerta/);
  await screenshot('03-bottleneck-call');
  await close();
  await closeInspector();
  assert.equal(
    await evaluate(
      'document.querySelectorAll("[data-controls]:not([hidden])").length',
    ),
    4,
  );
  assert.equal(
    (await evaluate(
      `document.querySelectorAll('[data-location="waiting-1"] > button').length`,
    )) >= 2,
    true,
  );
  await screenshot('04-waiting-at-stripe');
  assert.equal(
    await evaluate(
      'document.querySelector(".sc-trial-bar").getBoundingClientRect().bottom<=innerHeight',
    ),
    true,
    'the full desktop lab fits one viewport',
  );
  await playToOutcome();
  assert.match(await dialogText(), /28 s/);
  assert.match(await dialogText(), /224 u/);
  await close();
  await closeInspector();
  assert.equal(
    await evaluate(
      'document.querySelectorAll("[data-worker]:not([hidden])").length',
    ),
    8,
  );
  assert.equal(
    await evaluate('document.querySelector("[data-action=more]").disabled'),
    true,
  );
  assert.equal(
    await evaluate('document.querySelector("[data-action=double]")===null'),
    true,
  );
  await action('compare');
  assert.equal(
    await evaluate('document.querySelectorAll("dialog tbody tr").length'),
    3,
  );
  await screenshot('05-comparison');
  await action('replay:2');
  assert.equal(
    await evaluate('document.querySelector("[data-workers]").textContent'),
    '8',
  );
  assert.equal(await phase(), 'ready');
  await click('[data-protect="1"]');
  await playToOutcome();
  assert.equal(await phase(), 'paused');
  assert.match(await dialogText(), /repetir trabajo/);
  await screenshot('06-rejections');
  await close();
  await closeInspector();
  await playToOutcome();
  assert.equal(await phase(), 'complete');
  assert.match(await dialogText(), /16 rechazos/);
  assert.match(await dialogText(), /32 s/);
  assert.equal(
    await evaluate(
      'document.querySelectorAll("[data-location=done] > button").length',
    ),
    24,
  );
  await close();
  await click('[data-protect="1"]'); // Restore the original three-slot admission limit.
  await action('inspect:1');
  await screenshot('06b-step-resource');
  assert.equal(
    await evaluate(
      `(()=>{const panel=document.querySelector('[data-inspector]').getBoundingClientRect();const step=document.querySelector('[data-step="1"]').getBoundingClientRect();return panel.width<=step.width+3})()`,
    ),
    true,
    'resource details cover only their own step',
  );
  await action('upgrade');
  assert.equal(
    await evaluate('document.querySelector("[data-inspector]").hidden'),
    true,
    'the contract choice closes its panel',
  );
  assert.equal(
    await evaluate('document.activeElement.dataset.limit'),
    '1',
    'focus moves to the newly relevant admission limit',
  );
  assert.equal(
    await evaluate(
      `Array.from(document.querySelectorAll('[data-location="pending"] [data-job]')).map(node=>Number(node.dataset.job)).join(',')`,
    ),
    Array.from({ length: 24 }, (_, i) => i + 1).join(','),
    'reset keeps the visual queue in FIFO order',
  );
  await closeInspector();
  // Expanding the receiver must not silently tune the application's limit.
  assert.equal(
    await evaluate(`document.querySelector('[data-limit="1"]').value`),
    '3',
  );
  await playToOutcome();
  assert.equal(await phase(), 'paused');
  assert.match(await dialogText(), /Seguimos usando tres/);
  await close();
  assert.equal(await evaluate('document.activeElement.dataset.limit'), '1');
  await playToOutcome();
  assert.equal(await phase(), 'complete');
  assert.doesNotMatch(await dialogText(), /MISIÓN SUPERADA/);
  await close();
  await evaluate(
    `(()=>{const field=document.querySelector('[data-limit="1"]');field.value='8';field.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  );
  await playToOutcome();
  assert.equal(await phase(), 'paused');
  assert.match(await dialogText(), /Aparece otra/);
  await screenshot('07-database-call');
  await close();
  await closeInspector();
  await screenshot('08-database-wait');
  await playToOutcome();
  assert.match(await dialogText(), /MISIÓN SUPERADA/);
  assert.match(await dialogText(), /21 s/);
  await screenshot('09-mission-complete');
  await close();
  await action('less');
  await action('less');
  await playToOutcome();
  assert.match(await dialogText(), /MISIÓN SUPERADA/);
  assert.match(await dialogText(), /26 s/);
  await close();
  await action('names');
  const hostile = '<img src=x onerror="window.scalingXss=1">';
  await evaluate(
    `(()=>{for(const [key,value] of Object.entries(${JSON.stringify({ api: hostile, 'step-1': 'Cobrar mi pedido', 'job-0': 'Pedido de Ana' })})){const input=document.querySelector('[data-rename="'+key+'"]');input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));}})()`,
  );
  await close();
  assert.equal(
    await evaluate('document.querySelector("[data-name=api]").textContent'),
    hostile,
  );
  await action('job:1');
  assert.match(
    await evaluate('document.querySelector("[data-radio]").textContent'),
    /Pedido de Ana/,
  );
  assert.equal(
    await evaluate(
      'window.scalingXss===undefined&&!document.querySelector("queue-scaling-game img")',
    ),
    true,
  );
  await load();
  assert.equal(
    await evaluate('document.querySelector("[data-name=api]").textContent'),
    hostile,
  );
  assert.equal(await evaluate('document.querySelector("dialog").open'), false);
  await evaluate(
    `(()=>{const key='async-scaling-v1-es';const saved=JSON.parse(sessionStorage.getItem(key));delete saved.names;sessionStorage.setItem(key,JSON.stringify(saved));})()`,
  );
  await load();
  await evaluate('document.documentElement.dataset.theme="dark"');
  await screenshot('10-dark');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  assert.equal(
    await evaluate(
      '(()=>{const r=document.querySelector("[data-action=play]").getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight})()',
    ),
    true,
    'mobile transport is visible before scrolling',
  );
  await screenshot('11-mobile');
  assert.equal(
    await evaluate('document.documentElement.scrollWidth<=innerWidth'),
    true,
    'no mobile horizontal overflow',
  );
  await evaluate(
    'window.scrollTo(0,document.querySelector(".sc-trial-bar").getBoundingClientRect().bottom+scrollY)',
  );
  assert.equal(
    await evaluate(
      'document.querySelector("[data-action=play]").getBoundingClientRect().bottom<=innerHeight',
    ),
    true,
  );
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await load('en');
  assert.match(await dialogText(), /Too slowly/);
  await close();
  await stopped();
  assert.match(await dialogText(), /144 s/);
  assert.equal(
    await evaluate(
      'document.querySelectorAll("[data-location=done] > button").length',
    ),
    24,
  );
  await screenshot('12-english');
  assert(
    networkRequests.every(
      (request) =>
        new URL(request.url).origin === new URL(base).origin &&
        request.method === 'GET',
    ),
    'static resources only; no service requests',
  );
  for (const [path, level] of [
    ['async-chaos-lab', 1],
    ['worker-steps', 2],
  ]) {
    await send('Page.navigate', { url: `${base}/es/laboratorios/${path}/` });
    await waitFor(
      '!!document.querySelector("queue-stories-game [data-action=play]")',
    );
    assert.equal(
      await evaluate('document.querySelectorAll(".qs-levels a").length'),
      3,
    );
    assert.equal(
      await evaluate(
        'document.querySelector(".qs-levels [aria-current=page] span").textContent',
      ),
      `0${level}`,
    );
    await screenshot(`header-level-${level}`);
  }
  const blockedStorage = await send('Page.addScriptToEvaluateOnNewDocument', {
    source:
      'Object.defineProperty(window,"sessionStorage",{get(){throw Error("Storage blocked in review")}});',
  });
  await load();
  assert.match(await dialogText(), /Todo funciona/);
  await close();
  await stopped();
  assert.equal(await phase(), 'complete');
  await send('Page.removeScriptToEvaluateOnNewDocument', {
    identifier: blockedStorage.identifier,
  });
  assert.deepEqual(errors, []);
  console.log(
    'PASS scaling: one-screen desktop, baseline, Play/Pause/speed, 4/6/8 workers, bottleneck unlock, rejection/retry, shifted DB bottleneck, efficient wins, comparisons, names/XSS, session, mobile, EN, dark, reduced motion. Screenshots:',
    output,
  );
} finally {
  socket?.close();
  browser.kill();
  const killTimer = setTimeout(() => browser.kill('SIGKILL'), 2000);
  await browserStopped;
  clearTimeout(killTimer);
  await rm(profile, { recursive: true, force: true });
}
