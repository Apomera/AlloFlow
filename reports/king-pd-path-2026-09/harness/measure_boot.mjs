// K4: measure the King PD teacher/student paths under classroom conditions.
// Timing comes from IN-PAGE marks (MutationObserver callback + performance.now()),
// never from the harness's own polling. The harness only drives: it waits for a
// control, clicks it, and reads the page's timeline at the end.
//
// node measure.mjs --target=live|local --net=fast3g|wifi|none --flow=teacher|student --run=1 [--shots=1]
import { chromium } from 'file:///C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
// Machine load at start: this is a shared box with other agents running tests.
const cpuLoad = () => { try { return Number(execSync('powershell -NoProfile -Command "(Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average"', { timeout: 20000 }).toString().trim()); } catch (_) { return null; } };
const cpuAtStart = cpuLoad();

const A = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.join('=') || '1']; }));
const TARGET = A.target || 'live';
const NET = A.net || 'wifi';
const FLOW = A.flow || 'teacher';
const RUN = A.run || '1';
const SHOTS = A.shots === '1';
const CPU = Number(A.cpu || 4);
const LINK_WAIT_MS = Number(A.linkwait || 8000);
const OUT = A.out || 'C:/tmp/alloflow_dispatch/wave1/K4_scratch/runs';
const PACK = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/allopacks/crew_norms_grade6_8.allopack.json';
const PACK_COPY = 'C:/tmp/alloflow_dispatch/wave1/K4_scratch/crew_norms_grade6_8 (1).allopack.json';
const URLS = { live: 'https://alloflow-cdn.pages.dev/app/', local: 'http://127.0.0.1:3000/app/' };
// Chrome DevTools legacy presets: Fast 3G = 1.6 Mbps x0.9 down, 750 kbps x0.9 up, 150 ms x3.75 RTT.
const NETS = {
  fast3g: { latency: 562.5, downloadThroughput: 180000, uploadThroughput: 84375 },
  wifi: { latency: 40, downloadThroughput: 1250000, uploadThroughput: 1250000 },
  slow3g: { latency: 2000, downloadThroughput: 50000, uploadThroughput: 50000 },
  wifi_shared: { latency: 80, downloadThroughput: 50000, uploadThroughput: 50000 },
  none: null,
};
const tag = `${TARGET}-${NET}-${FLOW}-r${RUN}${SHOTS ? '-shots' : ''}`;
fs.mkdirSync(OUT, { recursive: true });
const shotDir = path.join(OUT, 'shots', tag);
if (SHOTS) fs.mkdirSync(shotDir, { recursive: true });
if (!fs.existsSync(PACK_COPY)) fs.copyFileSync(PACK, PACK_COPY);

const INSTR = String.raw`(() => {
  if (window.__k4) return;
  // v2: kept cheap on purpose. v1 (document-wide style/characterData observer and a
  // full button-text scan per mutation batch) slowed a Fast 3G + 4x boot from ~13-21 s
  // to 40-77 s: it measured a different program. Rules now:
  //  - the subtree observer watches childList only; body/loader attributes separately;
  //  - a mark is only checked while the harness has asked for it (K.want);
  //  - selector checks first; a button-text scan runs at most once per callback and only
  //    when an asked-for mark needs text;
  //  - module registration is read on the loader's own registry event, not a Proxy;
  //  - the clickable watch samples every 50 ms, only while one step waits.
  const K = window.__k4 = { marks: {}, order: [], clicks: [], changes: [], errors: [], resErrors: [], mods: {}, queue: [], longtasks: [], hits: {},
    want: new Set(['root_child', 'loader_hidden', 'clear_all_data', 'launchpad']) };
  const now = () => Math.round(performance.now());
  const mark = (n, x) => { if (K.marks[n] == null) { K.marks[n] = now(); K.order.push([n, K.marks[n], x || '']); } };
  K.mark = mark;
  K.addWant = (names) => { for (const n of names) K.want.add(n); check(); };
  const label = (el) => { if (!el) return ''; const a = el.getAttribute && el.getAttribute('aria-label'); return String(a || el.textContent || el.tagName || '').trim().replace(/\s+/g, ' ').slice(0, 70); };
  addEventListener('click', (e) => { if (!e.isTrusted) return; const t = e.target; const el = t && t.closest ? (t.closest('button,a,[role=button],label,input,summary') || t) : t; K.clicks.push([now(), label(el)]); }, true);
  addEventListener('change', (e) => { const el = e.target; if (el && el.type === 'file') K.changes.push([now(), el.files && el.files[0] ? el.files[0].name : '']); }, true);
  addEventListener('error', (e) => {
    if (e instanceof ErrorEvent) K.errors.push([now(), String(e.message || '').slice(0, 240)]);
    else if (e.target && (e.target.src || e.target.href)) K.resErrors.push([now(), String(e.target.src || e.target.href).slice(0, 200)]);
  }, true);
  addEventListener('unhandledrejection', (e) => { K.errors.push([now(), 'rejection: ' + String((e.reason && e.reason.message) || e.reason).slice(0, 240)]); });
  let modCount = 0;
  const scanMods = () => { const m = window.AlloModules; if (!m) return; const ks = Object.keys(m); if (ks.length === modCount) return; modCount = ks.length; const t = now(); for (let i = 0; i < ks.length; i++) if (K.mods[ks[i]] == null) K.mods[ks[i]] = t; };
  addEventListener('alloflow:module-registry-changed', () => {
    scanMods();
    try { const s = window.__alloModuleSnapshot(); const n = s.queued.length + s.pending.length; const l = K.queue[K.queue.length - 1];
      if (!l || l[1] !== n || l[2] !== s.failed.length) K.queue.push([now(), n, s.failed.length, s.queued.length]); } catch (e) {}
  });
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) K.longtasks.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
  // Until the remote ui_strings.js lands, most shell labels are the component's fallback or
  // blank. Record when it arrives (resource timing, no polling).
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (K.stringsAt == null && e.name.indexOf('/ui_strings.js') >= 0) K.stringsAt = Math.round(e.responseEnd); }).observe({ type: 'resource', buffered: true }); } catch (e) {}
  const q = (s) => document.querySelector(s);
  let labels = null;
  const btn = (re) => { if (!labels) { labels = []; const bs = document.getElementsByTagName('button'); for (let i = 0; i < bs.length; i++) labels.push((bs[i].getAttribute('aria-label') || '') + '|' + bs[i].textContent); } for (let i = 0; i < labels.length; i++) if (re.test(labels[i])) return true; return false; };
  const body = () => document.body;
  const CHECKS = {
    root_child: () => { const r = q('#root'); return !!r && r.children.length > 0; },
    loader_hidden: () => { const l = q('#alloflow-loader'); return !!l && l.style.display === 'none'; },
    clear_all_data: () => { const s = q('#loader-status button'); return !!s && /Clear All Data/.test(s.textContent); },
    launchpad: () => !!body() && body().classList.contains('alloflow-launchpad-active') && !!q('[data-alloflow-launch-pad]'),
    role_gate: () => btn(/\|Student\s*Join your class/),
    wizard: () => !!q('[aria-labelledby="quickstart-wizard-title"]'),
    workspace: () => !!body() && !body().classList.contains('alloflow-workspace-concealed') && !body().classList.contains('alloflow-launchpad-active') && !!q('#main-content'),
    wizard_closed: () => K.marks.wizard != null && !q('[aria-labelledby="quickstart-wizard-title"]'),
    codename_modal: () => btn(/Load Saved File/),
    history_menu: () => !!q('button[aria-label="More resource pack actions"]'),
    load_item: () => btn(/\|\s*Load Project\s*$/),
    pack_loaded: () => !!q('button[aria-label*="Crew Launch Week 1: Norms We Can Name and Keep"]'),
    directions_link: () => !!q('a[href^="#sel-hub/crewProtocols"]'),
    selhub_open: () => !!q('button[aria-label="Close SEL Hub"]'),
    selhub_gotit: () => !!q('#sel-ephemeral-explainer-modal'),
    station_started: () => !!q('#sel-active-station-guide') || !!q('button[aria-label="Exit station mode"]'),
    tool_frame: () => !!q('button[aria-label="Back to SEL tools"]'),
    tool_content: () => K.marks.tool_text != null,
  };
  const PHRASES = [
    ['is not available in this SEL Hub', 'toast_tool_unavailable'],
    ['is opening...', 'toast_tool_opening'],
    ['Norms We Can Name and Keep started', 'toast_station_started'],
    ['Crew is built. It is not assumed.', 'tool_text'],
    ['Failed to load project', 'toast_load_failed'],
  ];
  function check() {
    labels = null;
    K.want.forEach((k) => { if (K.marks[k] != null || !CHECKS[k]) return; try { if (CHECKS[k]()) mark(k); } catch (e) {} });
  }
  K.check = check;
  // Per-step clickable time: present, visible, and on top at its centre. Sampled every
  // 50 ms only while that step waits; one control per watch.
  K.watchHit = (name, sel, reSrc) => {
    const re = reSrc ? new RegExp(reSrc) : null;
    const tick = () => {
      if (K.hits[name] != null) return;
      const els = document.querySelectorAll(sel);
      for (let i = 0; i < els.length; i++) {
        const el = els[i];
        if (re && !re.test((el.getAttribute('aria-label') || '') + '|' + el.textContent)) continue;
        const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
        if (getComputedStyle(el).visibility === 'hidden') continue;
        const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
        if (cy >= 0 && cy < innerHeight && cx >= 0 && cx < innerWidth) {
          const h = document.elementFromPoint(cx, cy);
          if (!h || !(el === h || el.contains(h))) continue;
          K.hits[name] = [now(), 'in-view']; return;
        }
        K.hits[name] = [now(), 'below-fold']; return;
      }
      setTimeout(tick, 50);
    };
    tick();
  };
  const phraseWanted = () => PHRASES.some((p) => K.want.has(p[1]) && K.marks[p[1]] == null);
  const mo = new MutationObserver((recs) => {
    if (phraseWanted()) {
      for (const r of recs) {
        for (const n of r.addedNodes) {
          if (n.nodeType !== 1 || n.nodeName === 'SCRIPT' || n.nodeName === 'STYLE') continue;
          const tx = n.textContent; if (!tx || tx.length > 60000) continue;
          for (const [ph, name] of PHRASES) if (K.want.has(name) && K.marks[name] == null && tx.indexOf(ph) >= 0) mark(name, tx.trim().slice(0, 120));
        }
      }
    }
    check();
  });
  mo.observe(document, { childList: true, subtree: true });
  const attrMo = new MutationObserver(check);
  const watchAttrs = () => {
    if (document.body) attrMo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    const l = document.getElementById('alloflow-loader'); if (l) attrMo.observe(l, { attributes: true, attributeFilter: ['style'] });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchAttrs); else watchAttrs();
})();`;

// The shared C: drive sits near 100% (other sessions' builds). Do not start a run
// that could be the write that fills it, and never lose a finished run to ENOSPC.
const freeMB = () => { try { const s = fs.statfsSync('C:/'); return Math.round((s.bavail * s.bsize) / 1048576); } catch (_) { return 99999; } };
for (let i = 0; freeMB() < 150 && i < 40; i++) { console.log(`[disk] ${freeMB()} MB free; waiting`); await new Promise((r) => setTimeout(r, 30000)); }
const freeAtStart = freeMB();
async function safeWrite(file, data) {
  for (let i = 0; i < 20; i++) {
    try { fs.writeFileSync(file, data); return true; } catch (e) { if (e.code !== 'ENOSPC') throw e; console.log('[disk] ENOSPC writing', file, 'retry in 30s'); await new Promise((r) => setTimeout(r, 30000)); }
  }
  return false;
}
const t0wall = Date.now();
const log = (...a) => console.log(`[${tag} +${((Date.now() - t0wall) / 1000).toFixed(1)}s]`, ...a);
const launchArgs = [];
const browser = await chromium.launch({ args: launchArgs });
const ctx = await browser.newContext({
  viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1, serviceWorkers: 'block', locale: 'en-US',
  userAgent: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
});
await ctx.addInitScript(INSTR);
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Network.enable');
if (NETS[NET]) await cdp.send('Network.emulateNetworkConditions', { offline: false, ...NETS[NET] });
if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });

const requests = [];
const pending = [];
page.on('requestfinished', (req) => pending.push((async () => {
  const res = await req.response().catch(() => null);
  const sizes = await req.sizes().catch(() => null);
  requests.push({ url: req.url(), method: req.method(), type: req.resourceType(), status: res ? res.status() : 0,
    ct: res ? (res.headers()['content-type'] || '') : '', bytes: sizes ? sizes.responseBodySize + sizes.responseHeadersSize : 0,
    body: sizes ? sizes.responseBodySize : 0, at: Date.now() - t0wall, ok: true });
})()));
page.on('requestfailed', (req) => requests.push({ url: req.url(), method: req.method(), type: req.resourceType(), status: 0, ct: '', bytes: 0, at: Date.now() - t0wall, ok: false, failure: (req.failure() || {}).errorText }));
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push([Date.now() - t0wall, String(e).slice(0, 240)]));
page.on('dialog', (d) => d.dismiss().catch(() => {}));

const notes = [];
// Local mode runs the shell's desktop-bundle branch, which opens the AI Backend
// first-run dialog when the app is ready. The live shell never shows it on these
// paths, so dismiss it and keep it out of the counts (clicks are counted from the
// harness's own step list, not from this handler).
if (TARGET === 'local') {
  await page.addLocatorHandler(page.getByText('Choose your AI').first(), async () => {
    const t = await inNow().catch(() => null);
    const dlg = page.locator('[role=dialog]').filter({ hasText: 'AI Backend Settings' }).first();
    const closeBtn = dlg.locator('button[aria-label*="lose" i]').first();
    if (await closeBtn.count().catch(() => 0)) await closeBtn.click({ timeout: 5000 }).catch(() => {});
    else await page.keyboard.press('Escape').catch(() => {});
    notes.push(`local-only: desktop AI Backend dialog dismissed at ${t} ms (not counted)`);
  });
}
const harness = []; // [step, harnessWallMs, inPageNow]
const inNow = () => page.evaluate(() => Math.round(performance.now()));
const marks = () => page.evaluate(() => window.__k4.marks);
async function waitMarks(names, timeout) {
  const h = await page.waitForFunction((ns) => { const m = window.__k4 && window.__k4.marks; if (!m) return null; for (const n of ns) if (m[n] != null) return n; return null; }, names, { timeout, polling: 100 }).catch(() => null);
  return h ? h.jsonValue() : null;
}
async function shot(name) { if (SHOTS) await page.screenshot({ path: path.join(shotDir, name + '.png') }).catch(() => {}); }
// The control each step clicks, as the in-page hit watch sees it: [selector, label regex].
const HIT = {
  'full-platform': ['[data-alloflow-launch-pad] button', 'Full (Platform|AlloFlow)'],
  'role-teacher': ['button', 'Build accessible lessons'],
  'role-student': ['button', 'Join your class and learn'],
  'close-wizard': ['[aria-labelledby="quickstart-wizard-title"] button.rounded-full.p-2', null],
  'history-tab': ['#tab-history', null],
  'open-menu': ['button', 'More resource pack actions'],
  'load-project': ['button', 'Load Project|Load Saved File'],
  'retry-open-menu': ['button', 'More resource pack actions'],
  'retry2-open-menu': ['button', 'More resource pack actions'],
  'retry-load-same-file': ['button', '^[|] *(Load Project|Load File) *$'],
  'retry-load-renamed-file': ['button', '^[|] *(Load Project|Load File) *$'],
  'open-directions': ['button', 'Crew Launch Week 1'],
  'pack-link': ['a[href^="#sel-hub/crewProtocols"]', null],
  'pack-link-retry': ['a[href^="#sel-hub/crewProtocols"]', null],
  'hub-got-it': ['#sel-ephemeral-explainer-modal button[data-primary-action]', null],
  'station-tool-button': ['button', '^[|]1[.] Crew Protocols$'],
};
// Marks each step's result can produce; only asked-for marks are checked in the page.
const HUB_MARKS = ['selhub_open', 'selhub_gotit', 'station_started', 'tool_frame', 'tool_content', 'toast_tool_unavailable', 'toast_tool_opening', 'toast_station_started', 'tool_text'];
const LOAD_MARKS = ['pack_loaded', 'directions_link', 'toast_load_failed'];
const WANT = {
  'full-platform': ['role_gate', 'workspace', 'wizard', 'codename_modal'],
  'role-teacher': ['wizard', 'workspace', 'history_menu'],
  'role-student': ['codename_modal', 'workspace', 'history_menu'],
  'close-wizard': ['wizard_closed', 'history_menu'],
  'history-tab': ['history_menu'],
  'open-menu': ['load_item'], 'retry-open-menu': ['load_item'], 'retry2-open-menu': ['load_item'],
  'load-project': LOAD_MARKS, 'retry-load-same-file': LOAD_MARKS, 'retry-load-renamed-file': LOAD_MARKS,
  'open-directions': ['directions_link'],
  'pack-link': HUB_MARKS, 'pack-link-retry': HUB_MARKS, 'hub-got-it': HUB_MARKS, 'station-tool-button': HUB_MARKS,
};
async function wantFor(step) {
  const w = WANT[step];
  if (w) await page.evaluate((names) => window.__k4.addWant(names), w).catch(() => {});
}
async function armHit(step) {
  const h = HIT[step];
  if (h) await page.evaluate(([n, s, r]) => window.__k4.watchHit(n, s, r), [step, h[0], h[1]]).catch(() => {});
}
async function click(step, locator, timeout = 180000) {
  await armHit(step);
  await locator.first().waitFor({ state: 'visible', timeout });
  await wantFor(step);
  const t = await inNow();
  await locator.first().click({ timeout: 30000 });
  harness.push([step, Date.now() - t0wall, t]);
  log('clicked', step);
}
async function pickFile(step, locator, file, timeout = 180000) {
  await armHit(step);
  await locator.first().waitFor({ state: 'visible', timeout });
  await wantFor(step);
  const fcP = page.waitForEvent('filechooser', { timeout: 30000 });
  await locator.first().click({ timeout: 30000 });
  harness.push([step, Date.now() - t0wall, await inNow()]);
  const fc = await fcP;
  harness.push([step + ':file-picked', Date.now() - t0wall, await inNow()]);
  await fc.setFiles(file);
  log('picked file', step, path.basename(file));
}
const errCount = () => page.evaluate(() => window.__k4.errors.filter((e) => /MiscHandlers module not loaded/.test(e[1])).length);
const changeCount = () => page.evaluate(() => window.__k4.changes.length);

async function loadPack(openMenu, itemLocator, retryMenu, retryItem) {
  // First attempt, as soon as the control is on screen.
  if (openMenu) await click('open-menu', openMenu);
  const e0 = await errCount();
  await pickFile('load-project', itemLocator, PACK);
  let got = await waitMarks(['pack_loaded'], 4000);
  if (got) return { attempts: 1 };
  const failed = (await errCount()) > e0;
  if (!failed) { got = await waitMarks(['pack_loaded'], 120000); if (got) return { attempts: 1, slow: true }; throw new Error('pack never loaded and no MiscHandlers error'); }
  notes.push('load attempt 1 threw "MiscHandlers module not loaded"');
  await shot('03b-load-project-failed');
  // A real person does not know when to retry; retry the moment the module registers
  // (the earliest a retry can work) and record how long that was.
  await page.waitForFunction(() => window.AlloModules && window.AlloModules.MiscHandlers, null, { timeout: 300000, polling: 100 });
  // Retry with the SAME file first (what a person does), then a renamed copy.
  const c0 = await changeCount();
  if (retryMenu) await click('retry-open-menu', retryMenu);
  await pickFile('retry-load-same-file', retryItem, PACK);
  got = await waitMarks(['pack_loaded'], 5000);
  if (got) return { attempts: 2, sameFileRetryWorked: true };
  const c1 = await changeCount();
  notes.push(`same-file retry: change events fired=${c1 - c0}; pack not loaded`);
  if (retryMenu) await click('retry2-open-menu', retryMenu);
  await pickFile('retry-load-renamed-file', retryItem, PACK_COPY);
  got = await waitMarks(['pack_loaded'], 60000);
  if (!got) throw new Error('pack did not load after renamed-file retry');
  return { attempts: 3, sameFileRetryWorked: false, sameFileChangeEvents: c1 - c0 };
}

async function openToolFromLink() {
  const link = page.locator('a[href^="#sel-hub/crewProtocols"]');
  await click('pack-link', link);
  let got = await waitMarks(['selhub_open'], 5000);
  let deadClicks = 0;
  while (!got) {
    deadClicks++;
    const reg = await page.evaluate(() => !!(window.SelHub && window.SelHub.toolLinks));
    notes.push(`pack link click ${deadClicks} did not open the hub (SelHub link handler installed: ${reg})`);
    await page.waitForFunction(() => window.SelHub && window.SelHub.toolLinks && window.__alloSelHubOpener, null, { timeout: 300000, polling: 100 });
    await click('pack-link-retry', link);
    got = await waitMarks(['selhub_open'], 8000);
    if (deadClicks > 3) throw new Error('hub never opened');
  }
  await shot('06-selhub-open');
  const linkAt = (await marks()).selhub_open;
  // First-run hub modal.
  // The explainer mounts in an effect on hub open (sessionStorage-gated, so every new tab sees it).
  const gotit = page.locator('#sel-ephemeral-explainer-modal button[data-primary-action]');
  if (await waitMarks(['selhub_gotit'], 6000)) await click('hub-got-it', gotit);
  got = await waitMarks(['tool_content'], Math.max(1000, LINK_WAIT_MS - 1000));
  const reqd = () => page.evaluate(() => performance.getEntriesByType('resource').filter((e) => /sel_tool_crewprotocols/.test(e.name)).map((e) => Math.round(e.startTime)));
  const toolReqBeforeFallback = await reqd();
  if (got) return { linkOpenedTool: true, deadClicks, toolReqBeforeFallback };
  notes.push(`pack link did not open Crew Protocols within ${LINK_WAIT_MS} ms; tool script requested: ${toolReqBeforeFallback.length ? 'yes' : 'no'}`);
  await shot('07-link-no-tool');
  await click('station-tool-button', page.getByRole('button', { name: '1. Crew Protocols', exact: true }));
  got = await waitMarks(['tool_content'], 180000);
  if (!got) throw new Error('tool never mounted after station button');
  return { linkOpenedTool: false, deadClicks, toolReqBeforeFallback };
}

let outcome = {};
let failure = null;
// Fixed workload under the same throttle, before navigation: the effective CPU
// factor for this run on a shared, loaded machine (compare with --cpu=1 idle).
const calib = await page.evaluate(() => {
  const out = [];
  for (let k = 0; k < 3; k++) {
    const t = performance.now(); let x = 0;
    for (let i = 0; i < 3e6; i++) x = (x * 31 + i) % 1000003;
    const s = JSON.stringify(Array.from({ length: 20000 }, (_, i) => ({ i, s: 'abcdefghij' + i })));
    JSON.parse(s);
    out.push(Math.round(performance.now() - t + (x & 0)));
  }
  return out;
}).catch(() => null);
try {
  await page.goto(URLS[TARGET], { waitUntil: 'commit', timeout: 120000 });
  // Boot-only: does index.html's "Clear All Data & Reload" watchdog button appear (and is
  // it visible, i.e. injected before the loader hides)? Stop at the launch pad or 180 s.
  const first = await waitMarks(['clear_all_data', 'launchpad'], 180000);
  if (first === 'clear_all_data') await page.screenshot({ path: path.join(OUT, 'clear-all-' + tag + '.png') }).catch(() => {});
  await waitMarks(['launchpad'], 180000);
  throw new Error('bootonly-stop');
  await shot('00-nav');
  await click('full-platform', page.locator('[data-alloflow-launch-pad] button').filter({ hasText: /Full (Platform|AlloFlow)/ }));
  await shot('01-launchpad-clicked');
  if (FLOW === 'teacher') {
    await click('role-teacher', page.getByRole('button', { name: /Build accessible lessons/ }));
    await click('close-wizard', page.locator('[aria-labelledby="quickstart-wizard-title"] button.rounded-full.p-2'));
    await shot('02-workspace');
    await click('history-tab', page.locator('#tab-history'));
    outcome.load = await loadPack(page.getByRole('button', { name: 'More resource pack actions' }), page.locator('button').filter({ hasText: 'Load Project' }),
      page.getByRole('button', { name: 'More resource pack actions' }), page.locator('button').filter({ hasText: 'Load Project' }));
    await shot('04-pack-loaded');
    await click('open-directions', page.getByRole('button', { name: /^Open: Crew Launch Week 1/ }));
    await waitMarks(['directions_link'], 60000);
    await shot('05-directions');
  } else {
    await click('role-student', page.getByRole('button', { name: /Join your class and learn/ }));
    await shot('02-codename');
    outcome.load = await loadPack(null, page.getByRole('button', { name: /Load Saved File/ }), null, page.getByText('Load File', { exact: true }));
    await shot('04-pack-loaded');
    if (!(await waitMarks(['directions_link'], 3000))) {
      await click('open-directions', page.getByRole('button', { name: /Crew Launch Week 1/ }));
      await waitMarks(['directions_link'], 60000);
    }
    await shot('05-directions');
  }
  outcome.tool = await openToolFromLink();
  await shot('08-tool');
  // Let the background queue finish (or 60 s) so the drain time is on record.
  await page.waitForFunction(() => { const q = window.__k4.queue; const l = q[q.length - 1]; return l && l[1] === 0; }, null, { timeout: 60000, polling: 500 }).catch(() => {});
} catch (e) {
  failure = String(e).slice(0, 400);
  log('FAILED', failure);
  await page.screenshot({ path: path.join(OUT, `FAIL-${tag}.png`) }).catch(() => {});
}
await Promise.all(pending);
const K = await page.evaluate(() => { const k = window.__k4; return { marks: k.marks, order: k.order, clicks: k.clicks, changes: k.changes, errors: k.errors, resErrors: k.resErrors, mods: k.mods, queue: k.queue, longtasks: k.longtasks, hits: k.hits, stringsAt: k.stringsAt }; }).catch(() => null);
const perf = await page.evaluate(() => {
  const nav = performance.getEntriesByType('navigation')[0] || {};
  const paints = Object.fromEntries(performance.getEntriesByType('paint').map((p) => [p.name, Math.round(p.startTime)]));
  const res = performance.getEntriesByType('resource').filter((e) => /main\.[0-9a-f]+\.(js|css)|lz-string|idb-keyval|misc_handlers_module|sel_hub_module|sel_tool_crewprotocols|fonts\/|drag-drop-touch|history_panel|launch_pad/.test(e.name))
    .map((e) => ({ name: e.name.replace(/^https?:\/\/[^/]+/, ''), start: Math.round(e.startTime), end: Math.round(e.responseEnd), transfer: e.transferSize, decoded: e.decodedBodySize }));
  return { nav: { responseStart: Math.round(nav.responseStart), domInteractive: Math.round(nav.domInteractive), dcl: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd) }, paints, res };
}).catch(() => null);
const result = { tag, target: TARGET, net: NET, flow: FLOW, run: RUN, cpu: CPU, shots: SHOTS, url: URLS[TARGET], startedAt: new Date(t0wall).toISOString(), wallMs: Date.now() - t0wall,
  failure, outcome, notes, harness, pageErrors, K, perf, requests };
result.freeMBAtStart = freeAtStart;
result.cpuLoadAtStart = cpuAtStart;
result.calibMs = calib;
result.cpuLoadAtEnd = cpuLoad();
if (!(await safeWrite(path.join(OUT, `${tag}.json`), JSON.stringify(result)))) log('LOST RESULT: disk full');
log('done', failure ? 'FAILED' : 'ok', 'marks:', K ? Object.keys(K.marks).length : 0, 'requests:', requests.length);
await browser.close();
