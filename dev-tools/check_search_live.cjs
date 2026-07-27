#!/usr/bin/env node
/*
 * check_search_live.cjs — answer "is web search actually working?" without guessing.
 *
 * Run this any time search looks broken:
 *   node dev-tools/check_search_live.cjs
 *
 * Web search in Gemini Canvas has THREE independent layers, and a failure in
 * any one of them looks identical from the UI (a Find button that returns
 * nothing). This checks each separately and names which one is at fault:
 *
 *   1. WORKER   — is /search deployed and does it have the Serper key?
 *   2. CDN      — does the published ai_backend_module.js have the current
 *                 search code, or is it a stale build?
 *   3. APP WIRE — does AlloFlowANTI.txt point Canvas at the worker? (This is
 *                 the file pasted into Canvas, so it must be re-pasted after
 *                 any change to it — deploying alone does not update Canvas.)
 *
 * Exits 1 if any layer is broken.
 */

const fs = require('fs');
const path = require('path');

const WORKER = 'https://alloflow-catalog-submit.aaron-pomeranz.workers.dev/search';
const CDN = 'https://alloflow-cdn.pages.dev/ai_backend_module.js';
const REPO = path.resolve(__dirname, '..');

const ok = (s) => `\x1b[32m✓\x1b[0m ${s}`;
const bad = (s) => `\x1b[31m✗\x1b[0m ${s}`;
const warn = (s) => `\x1b[33m!\x1b[0m ${s}`;

let failed = false;

async function checkWorker() {
  console.log('\n1. WORKER — /search endpoint');
  // A unique query so a cache hit can never masquerade as a working key.
  const q = `ccss reading standard probe ${Date.now()}`;
  let res, body;
  try {
    res = await fetch(`${WORKER}?q=${encodeURIComponent(q)}&num=2`, {
      signal: AbortSignal.timeout(30000),
    });
    body = await res.json();
  } catch (err) {
    console.log(bad(`unreachable: ${err.message}`));
    failed = true;
    return;
  }

  if (body.ok && Array.isArray(body.results) && body.results.length) {
    console.log(ok(`live — ${body.results.length} result(s) for a fresh, uncached query`));
    console.log(`  e.g. ${body.results[0].title}`);
    console.log(`       ${body.results[0].url}`);
    return;
  }
  if (body.error === 'search-not-configured') {
    console.log(bad('SERPER_API_KEY is not set on the worker.'));
    console.log('  Fix: powershell -ExecutionPolicy Bypass -File catalog\\cloudflare-worker\\set-search-key.ps1');
  } else if (body.error === 'search-disabled') {
    console.log(warn('the kill switch DISABLE_SEARCH_PROXY is on.'));
    console.log('  Fix: wrangler secret delete DISABLE_SEARCH_PROXY');
  } else if (body.error === 'daily-budget-exhausted') {
    console.log(warn("today's shared search budget is spent (this is the guard working)."));
    console.log('  Teachers with their own Serper key still work. Raise SEARCH_DAILY_BUDGET to change.');
    return; // not a misconfiguration
  } else if (body.error === 'rate-limited') {
    console.log(warn('rate-limited right now; try again in a minute.'));
    return;
  } else {
    console.log(bad(`unexpected: ${JSON.stringify(body).slice(0, 200)}`));
  }
  failed = true;
}

async function checkCdn() {
  console.log('\n2. CDN — published ai_backend_module.js');
  let published;
  try {
    const res = await fetch(CDN, { signal: AbortSignal.timeout(30000) });
    published = await res.text();
  } catch (err) {
    console.log(bad(`unreachable: ${err.message}`));
    failed = true;
    return;
  }
  const local = fs.readFileSync(path.join(REPO, 'ai_backend_module.js'), 'utf8');

  // Markers for the current search code. Absent => the CDN is serving a build
  // from before this work landed.
  const markers = ['describeTransports', '_fetchSerperDirect', '__alloSearchTrace'];
  const missing = markers.filter((m) => !published.includes(m));

  if (!missing.length) {
    console.log(ok('published module has the current search code'));
  } else {
    console.log(warn(`published module is STALE — missing: ${missing.join(', ')}`));
    console.log(`  CDN ${published.length} bytes vs local ${local.length} bytes`);
    console.log('  Effect: no Web-search diagnostics tab, no per-teacher Serper key.');
    console.log('  The worker proxy still works (canvas-compat-get predates this change).');
    console.log('  Fix: ./deploy.sh "…"  then re-check.');
  }

  // Not fatal on its own: the proxy path works with the older module.
  if (!published.includes('canvas-compat-get')) {
    console.log(bad('published module cannot use a Canvas search proxy at all.'));
    failed = true;
  }
}

function checkAppWiring() {
  console.log('\n3. APP WIRE — AlloFlowANTI.txt (the file pasted into Canvas)');
  const anti = fs.readFileSync(path.join(REPO, 'AlloFlowANTI.txt'), 'utf8');
  const m = anti.match(/window\.ALLOFLOW_CANVAS_SEARCH_PROXY = '([^']+)'/);
  if (!m) {
    console.log(bad('no default search proxy is assigned — Canvas will have NO transport.'));
    failed = true;
    return;
  }
  console.log(ok(`points at ${m[1]}`));
  if (!m[1].startsWith(WORKER.replace('/search', ''))) {
    console.log(warn('…which is not the worker this script checks.'));
  }
  console.log('  NOTE: Canvas runs a PASTED copy of this file. Re-paste it into');
  console.log('  Canvas after any deploy, or Canvas keeps using the old wiring.');
}

(async () => {
  console.log('AlloFlow web-search health check');
  console.log('================================');
  await checkWorker();
  await checkCdn();
  checkAppWiring();
  console.log('');
  if (failed) {
    console.log('\x1b[31mOne or more layers are broken — see above.\x1b[0m');
    process.exit(1);
  }
  console.log('\x1b[32mSearch path is healthy.\x1b[0m');
})();
