// dev-driver.mjs — drives headless Chrome over the DevTools protocol so we can
// smoke-test the interactive screens (quiz, practice) and grab screenshots.
// Dev-only helper; not part of the app.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9333;
const URL = process.env.URL || 'http://localhost:5173/';

const userDir = mkdtempSync(join(tmpdir(), 'cfop-chrome-'));
const chrome = spawn(
  CHROME,
  [
    '--headless=new', '--disable-gpu', '--enable-unsafe-swiftshader', '--no-sandbox',
    '--no-first-run', '--disable-extensions', '--hide-scrollbars',
    '--window-size=1280,1000', `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${userDir}`, 'about:blank',
  ],
  { stdio: 'ignore' }
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWs() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await r.json();
      const page = list.find((t) => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch (e) {}
    await sleep(200);
  }
  throw new Error('chrome did not start');
}

const wsUrl = await getWs();
const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let msgId = 0;
const pending = new Map();
const events = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  else if (m.method) events.push(m);
};
function send(method, params = {}) {
  const id = ++msgId;
  return new Promise((resolve) => { pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
}

await send('Page.enable');
await send('Runtime.enable');
await send('Page.navigate', { url: URL });
await sleep(2500);

let shotN = 0;
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  const file = `shot-${String(++shotN).padStart(2, '0')}-${name}.png`;
  writeFileSync(file, Buffer.from(r.result.data, 'base64'));
  console.log('wrote', file);
}
async function evaluate(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result && r.result.exceptionDetails) console.log('EXC', JSON.stringify(r.result.exceptionDetails).slice(0, 500));
  return r.result && r.result.result ? r.result.result.value : undefined;
}
async function click(selector, n = 0) {
  const ok = await evaluate(`(() => { const e=document.querySelectorAll(${JSON.stringify(selector)})[${n}]; if(!e) return 'MISSING'; e.click(); return 'ok'; })()`);
  if (ok !== 'ok') console.log('click failed:', selector, ok);
  await sleep(600);
}

// install an error trap so page errors surface here
await evaluate(`window.__errs=[]; window.addEventListener('error',e=>window.__errs.push(String(e.message))); window.addEventListener('unhandledrejection',e=>window.__errs.push('rej:'+String(e.reason)));`);

const steps = process.argv.slice(2);
if (steps.length) {
  for (const s of steps) {
    const [kind, arg, n] = s.split('|');
    if (kind === 'click') await click(arg, +(n || 0));
    else if (kind === 'eval') console.log('eval ->', await evaluate(arg));
    else if (kind === 'evalfile') console.log('eval ->', await evaluate(readFileSync(arg, 'utf8')));
    else if (kind === 'wait') await sleep(+arg);
    else if (kind === 'shot') await shot(arg);
  }
} else {
  await shot('home');
  await evaluate(`location.hash='#/learn/0/0'`);
  await sleep(1200);
  await shot('learn');
  await click('[data-gotoquiz]');
  await shot('quiz');
  await click('[data-opt]', 0);
  await shot('quiz-answered');
  await click('#nextQ');
  await shot('quiz2');
}

const errs = await evaluate('window.__errs');
console.log('page errors:', JSON.stringify(errs));
ws.close();
chrome.kill();
process.exit(0);
