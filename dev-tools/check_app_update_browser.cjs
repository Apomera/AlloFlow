#!/usr/bin/env node
'use strict';

// Exercise the actual update manager and service worker through Chromium's
// lifecycle. All requests stay on a temporary localhost server; no deployment
// or browser profile is changed. Run: node dev-tools/check_app_update_browser.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createHash } = require('node:crypto');
const { setTimeout: delay } = require('node:timers/promises');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const managerPath = path.join(root, 'desktop/web-app/public/alloflow_update.js');
const workerPath = path.join(root, 'desktop/web-app/public/sw.js');
const reportPath = path.resolve(root, process.env.ALLO_UPDATE_REPORT || 'reports/update-notice-fix-2026-10-15/browser-results.json');
const release = id => ({ id: createHash('sha256').update('fixture-' + id).digest('hex'), builtAt: 1700000000000 + (id.charCodeAt(0) - 65) * 1000 });
let deployment = release('A');
let workerRevision = 0;
let rejectRegistration = false;
let shellReleaseOverride;
let server;
let browser;
let sharedContext;
let base;
let origin;
let caseNumber = 0;
const records = [];

function shell(approved = false) {
  const shellId = approved || shellReleaseOverride === undefined ? deployment.id : shellReleaseOverride;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Update lifecycle fixture</title>
    <script>window.__alloReleaseId=${JSON.stringify(shellId)};window.__alloReleaseBuiltAt=${deployment.builtAt};</script>
    <script>window.fixtureDeferManager=new URLSearchParams(location.search).has('defer-manager');
      if(!window.fixtureDeferManager)document.write('<script src="./alloflow_update.js"><'+'/script>');
    </script></head><body>
    <p id="release"></p><section id="banner" hidden>AlloFlow update ready
    <button id="apply">Refresh now</button><button id="later">Later</button></section><pre id="error"></pre>
    <script>
      window.fixtureTrace=[];window.fixtureInitialController=!!navigator.serviceWorker.controller;
      document.getElementById('release').textContent=window.__alloReleaseId;
      window.fixtureRender=function(state){window.fixtureState=state;window.fixtureTrace.push({...state});document.getElementById('banner').hidden=!state.ready;};
      window.fixtureSubscribe=function(){if(window.fixtureUnsubscribe)window.fixtureUnsubscribe();window.fixtureUnsubscribe=window.__alloAppUpdates.subscribe(window.fixtureRender);};
      window.fixtureStartManager=function(){window.fixtureSubscribe();window.__alloAppUpdates.start();if(window.fixtureRegistration)window.__alloAppUpdates.watchRegistration(window.fixtureRegistration);};
      if(!window.fixtureDeferManager)window.fixtureStartManager();
      document.getElementById('later').onclick=function(){window.__alloAppUpdates.dismiss();};
      document.getElementById('apply').onclick=function(){window.__alloAppUpdates.apply().catch(function(error){window.fixtureApplyError=String(error);document.getElementById('error').textContent=String(error);});};
      navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(function(reg){
        window.fixtureRegistration=reg;
        window.fixtureInstallStates=[];
        reg.addEventListener('updatefound',function(){var worker=reg.installing;worker.addEventListener('statechange',function(){window.fixtureInstallStates.push(worker.state);});});
        if(window.__alloAppUpdates)window.__alloAppUpdates.watchRegistration(reg);
      }).catch(function(error){window.fixtureRegistrationError=String(error);});
      window.fixtureMounted=true;
    </script></body></html>`;
}

function worker() {
  const integrity = bytes => ({ sha384: createHash('sha384').update(bytes).digest('hex'), bytes: Buffer.byteLength(bytes) });
  const digests = { './index.html': integrity(shell(true)), './alloflow_update.js': integrity(fs.readFileSync(managerPath)) };
  let body = fs.readFileSync(workerPath, 'utf8');
  body = body.replace(/alloflow-v/g, 'alloflow-case-' + caseNumber + '-v')
    .replace(/__BUILD_TS__/g, String(deployment.builtAt))
    .replace(/__RELEASE_ID__/g, deployment.id)
    .replace(/__RELEASE_BUILT_AT__/g, String(deployment.builtAt))
    .replace(/__PRECACHE_PATHS__/g, JSON.stringify(['./index.html', './alloflow_update.js']))
    .replace(/__PRECACHE_DIGESTS__/g, JSON.stringify(digests));
  assert(!/__RELEASE_[A-Z_]+__/.test(body), 'Unsubstituted release metadata in worker fixture');
  return body + '\n// fixture-worker-revision: ' + workerRevision + '\n';
}

async function snapshot(page) {
  return page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return {
      pageRelease: window.__alloReleaseId,
      startedControlled: window.fixtureInitialController,
      controlled: !!navigator.serviceWorker.controller,
      waiting: !!registration?.waiting,
      state: window.fixtureState,
      visible: !document.getElementById('banner').hidden,
      applyError: window.fixtureApplyError || null,
      trace: window.fixtureTrace
    };
  });
}

async function check(page) {
  await page.evaluate(() => window.__alloAppUpdates.check());
}

// Playwright's waitForFunction treats an async predicate's Promise as truthy
// before it resolves. Poll evaluated booleans explicitly for SW/cache APIs.
async function poll(page, predicate, argument) {
  const deadline = Date.now() + 20000;
  do {
    if (await page.evaluate(predicate, argument)) return;
    await delay(50);
  } while (Date.now() < deadline);
  throw new Error('Timed out awaiting browser lifecycle condition: ' + String(predicate));
}

async function quiet(page, reason) {
  await check(page);
  const state = await snapshot(page);
  assert.equal(state.state.ready, false, reason);
  assert.equal(state.visible, false, reason);
  assert.equal(state.state.applying, false, reason);
  assert(!state.state.error, reason + ': should not report an update error');
  return state;
}

async function open(context, query = '') {
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  await page.goto(base + query);
  await page.waitForFunction(() => window.fixtureMounted);
  return page;
}

async function installed(page) {
  await poll(page, async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return !!window.fixtureRegistration && reg?.active?.state === 'activated'
      && !!reg.active.scriptURL && navigator.serviceWorker.controller === reg.active;
  });
  await check(page);
}

async function update(page, next, revision = 0) {
  deployment = release(next);
  workerRevision = revision;
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const describe = () => ({ scope: reg.scope, active: reg.active && { state: reg.active.state, script: reg.active.scriptURL },
      waiting: reg.waiting && { state: reg.waiting.state, script: reg.waiting.scriptURL },
      installing: reg.installing && { state: reg.installing.state, script: reg.installing.scriptURL },
      controlled: navigator.serviceWorker.controller === reg.active });
    const before = describe();
    try { await reg.update(); }
    catch (error) { throw new Error(String(error) + ' ' + JSON.stringify({ before, after: describe() })); }
  });
  await poll(page, async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state === 'installed');
  await check(page);
}

async function ready(page, id) {
  await page.waitForFunction(expected => window.fixtureState?.ready && window.fixtureState.releaseId === expected, release(id).id);
  assert.equal(await page.locator('#banner').isVisible(), true);
}

async function apply(page, id) {
  await page.locator('#apply').click();
  await page.waitForFunction(expected => window.__alloReleaseId === expected && window.fixtureMounted, release(id).id);
  await installed(page);
  const state = await quiet(page, 'applied release must not prompt again');
  assert.equal(state.waiting, false, 'applied worker no longer waiting');
  assert.equal(state.applyError, null, 'Refresh now must not report an error');
  return state;
}

async function activateFromOtherTab(page) {
  await page.evaluate(async () => {
    const waiting = (await navigator.serviceWorker.getRegistration()).waiting;
    if (!waiting) throw new Error('Expected waiting update');
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Worker activation timed out')), 20000);
      waiting.addEventListener('statechange', () => {
        if (waiting.state === 'activated') { clearTimeout(timeout); resolve(); }
      });
      waiting.postMessage({ type: 'ALLOFLOW_ACTIVATE_UPDATE' });
    });
  });
}

async function scenario(name, run) {
  if (process.env.ALLO_UPDATE_CASE && !name.toLowerCase().includes(process.env.ALLO_UPDATE_CASE.toLowerCase())) return;
  deployment = release('A');
  workerRevision = 0;
  rejectRegistration = false;
  shellReleaseOverride = undefined;
  // Each case has its own registration scope and worker cache prefix.
  caseNumber = records.length;
  base = origin + '/case-' + caseNumber + '/app/';
  const context = sharedContext;
  await context.setOffline(false);
  try {
    const evidence = await run(context);
    records.push({ scenario: name, passed: true, ...evidence });
    console.log('PASS ' + name);
  } catch (error) {
    records.push({ scenario: name, passed: false, error: String(error.stack || error) });
    throw error;
  } finally {
    await Promise.all(context.pages().map(page => page.close()));
  }
}

(async () => {
  server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const pathname = url.pathname.replace(/^\/case-\d+/, '');
    response.setHeader('Cache-Control', 'no-cache');
    if (pathname === '/app/index.html') {
      response.writeHead(308, { Location: url.pathname.replace(/index\.html$/, '') }); response.end(); return;
    }
    if (pathname === '/app/' || pathname === '/app') {
      response.writeHead(200, { 'Content-Type': 'text/html' }); response.end(shell()); return;
    }
    if (pathname === '/app/sw.js') {
      response.writeHead(rejectRegistration ? 503 : 200, { 'Content-Type': 'application/javascript' });
      response.end(rejectRegistration ? 'Unavailable' : worker()); return;
    }
    if (pathname === '/app/alloflow_update.js') {
      response.writeHead(200, { 'Content-Type': 'application/javascript' }); response.end(fs.readFileSync(managerPath)); return;
    }
    response.writeHead(404); response.end();
  });
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    origin = 'http://127.0.0.1:' + server.address().port;
    const executablePath = [process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, chromium.executablePath(),
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
      'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(candidate => candidate && fs.existsSync(candidate));
    browser = await chromium.launch(executablePath ? { executablePath } : {});
    sharedContext = await browser.newContext();

    await scenario('Fresh installation and unchanged repeat visit stay quiet', async context => {
      const page = await open(context);
      assert.equal(await page.evaluate(() => window.fixtureInitialController), false);
      await installed(page);
      const first = await quiet(page, 'first installation is not an update');
      assert(!first.trace.some(state => state.ready), 'fresh installation must never transiently announce an update');
      await page.reload();
      await installed(page);
      await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
      return { first, repeat: await quiet(page, 'unchanged repeat visit') };
    });

    await scenario('Same release with different worker bytes stays quiet', async context => {
      const page = await open(context);
      await installed(page);
      await update(page, 'A', 1);
      const waiting = await quiet(page, 'same release worker is not a new app');
      assert.equal(waiting.waiting, true);
      await activateFromOtherTab(page);
      await installed(page);
      return { waiting, activated: await quiet(page, 'same release controllerchange') };
    });

    await scenario('Genuine waiting update appears and Refresh now loads it', async context => {
      const page = await open(context);
      await installed(page);
      await update(page, 'B');
      await ready(page, 'B');
      const before = await snapshot(page);
      assert.equal(before.pageRelease, release('A').id);
      assert.equal(before.waiting, true);
      return { before, after: await apply(page, 'B') };
    });

    await scenario('Later survives checks, subscription remount and reload; next release appears', async context => {
      const page = await open(context);
      await installed(page);
      await update(page, 'B');
      await ready(page, 'B');
      await page.locator('#later').click();
      const dismissed = await quiet(page, 'Later hides the current release');
      await page.evaluate(() => window.fixtureSubscribe());
      await quiet(page, 'remount respects Later');
      await page.reload();
      await installed(page);
      const reloaded = await quiet(page, 'reload respects Later');
      assert.equal(reloaded.pageRelease, release('A').id, 'reload still shows cached A, so suppression is meaningful');
      assert.equal(reloaded.waiting, true);
      await update(page, 'C');
      await ready(page, 'C');
      return { dismissed, reloaded, nextRelease: await snapshot(page), applied: await apply(page, 'C') };
    });

    await scenario('Another tab activates update; outdated tab can refresh without a waiting worker', async context => {
      const page = await open(context);
      await installed(page);
      const other = await open(context);
      await installed(other);
      await update(page, 'B');
      await ready(page, 'B');
      await ready(other, 'B');
      await apply(other, 'B');
      await poll(page, async () => !(await navigator.serviceWorker.getRegistration()).waiting);
      await check(page);
      await ready(page, 'B');
      const before = await snapshot(page);
      assert.equal(before.pageRelease, release('A').id);
      assert.equal(before.waiting, false);
      return { before, after: await apply(page, 'B') };
    });

    await scenario('Older worker keeps its own shell until explicit activation', async context => {
      const page = await open(context);
      await installed(page);
      await update(page, 'B');
      await ready(page, 'B');
      await page.reload();
      await installed(page);
      await poll(page, async previous => {
        const keys = await caches.keys();
        for (const key of keys.filter(key => key.includes(previous))) {
          const response = await (await caches.open(key)).match(new URL('./index.html', location.href).href);
          if (response && (await response.text()).includes('window.__alloReleaseId=' + JSON.stringify(previous))) return true;
        }
        return false;
      }, release('A').id);
      await page.reload();
      await installed(page);
      assert.equal(await page.evaluate(() => window.__alloReleaseId), release('A').id);
      await ready(page, 'B');
      const before = await snapshot(page);
      assert.equal(before.waiting, true);
      const other = await open(context);
      await activateFromOtherTab(other);
      await installed(page);
      await ready(page, 'B');
      return { before, after: await apply(page, 'B') };
    });

    await scenario('Manager started after another tab activates still finds the genuine active update', async context => {
      const other = await open(context);
      await installed(other);
      const page = await open(context, '?defer-manager=1');
      assert.equal(await page.evaluate(() => window.__alloAppUpdates), undefined);
      assert.equal(await page.evaluate(() => window.__alloReleaseId), release('A').id);
      await update(other, 'B');
      await ready(other, 'B');
      await apply(other, 'B');
      await poll(page, async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        return !reg.waiting && reg.active?.state === 'activated' && navigator.serviceWorker.controller === reg.active;
      });
      await page.addScriptTag({ url: new URL('./alloflow_update.js', base).href });
      await page.evaluate(() => window.fixtureStartManager());
      await ready(page, 'B');
      const before = await snapshot(page);
      assert.equal(before.waiting, false);
      // Subsequent navigation boots the ordinary fixture and its manager.
      await page.evaluate(() => history.replaceState(null, '', location.pathname));
      return { before, after: await apply(page, 'B') };
    });

    await scenario('Offline requests without a release change stay quiet', async context => {
      const page = await open(context);
      await installed(page);
      await context.setOffline(true);
      await page.evaluate(async () => {
        try { await (await navigator.serviceWorker.getRegistration()).update(); } catch (_) {}
        try { await fetch('./missing-module.js'); } catch (_) {}
      });
      return { offline: await quiet(page, 'network failure is not an update') };
    });

    await scenario('Workers reject missing or mismatched release HTML without offering an update', async context => {
      const page = await open(context);
      await installed(page);
      deployment = release('B');
      shellReleaseOverride = null;
      await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
      await page.waitForFunction(() => window.fixtureInstallStates.includes('redundant'));
      const missing = await quiet(page, 'HTML without a release marker is not an installable update');
      assert.equal(missing.waiting, false);
      deployment = release('C');
      shellReleaseOverride = release('B').id;
      await page.evaluate(async () => {
        window.fixtureInstallStates=[];
        await (await navigator.serviceWorker.getRegistration()).update();
      });
      await page.waitForFunction(() => window.fixtureInstallStates.includes('redundant'));
      const mismatched = await quiet(page, 'mixed deployment HTML must not be offered');
      assert.equal(mismatched.waiting, false);
      return { missing, mismatched };
    });

    await scenario('Registration failure does not announce an update', async context => {
      rejectRegistration = true;
      const page = await open(context);
      await page.waitForFunction(() => !!window.fixtureRegistrationError);
      return { failedRegistration: await quiet(page, 'registration failure is not an update') };
    });
  } finally {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify({ checkedAt: new Date().toISOString(), method: 'Real Chromium service worker lifecycle; repository update manager and worker template; isolated localhost release fixtures.', passed: records.length > 0 && records.every(record => record.passed), records }, null, 2) + '\n');
    if (sharedContext) await sharedContext.close();
    if (browser) await browser.close();
    if (server) {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
  }
  console.log('Browser update regression evidence: ' + reportPath);
})().catch(error => { console.error(error); process.exitCode = 1; });
