#!/usr/bin/env node
// verify_module_registry_runtime.cjs — Runtime (V2) registry check using Playwright.
//
// Why this exists:
//   The static check (verify_module_registry.cjs / V1) catches missing
//   producers by reading source code. It misses two real bug classes:
//
//     a) MULTI-REGISTRATION LAST-WRITE-WINS — when one module assigns
//        `window.AlloModules.X = RealComponent;` and ANOTHER module (or
//        another line in the same module) later assigns the same key to
//        null. V1 sees both producers and reports OK because at least one
//        is non-null. Runtime sees only the final value. This was the
//        2026-05-10 Immersive Reader bug shape.
//
//     b) MODULE LOADS BUT IIFE THROWS BEFORE REGISTRATION — a module's
//        source defines window.AlloModules.X = X at IIFE close, but an
//        earlier line in the IIFE throws (missing global, type error,
//        etc.). V1 sees the source assignment and reports OK. Runtime
//        sees the throw and the registration never happens.
//
// What it does:
//   1. Extracts every loadModule(name, url) call from AlloFlowANTI.txt.
//      Rewrites the CDN URL to a local path (jsdelivr → /).
//   2. Generates a minimal HTML harness that pulls in real React +
//      lucide-react from unpkg + provides permissive mocks for
//      AlloIcons / AlloLanguageContext / firebase / etc.
//   3. Spins up a tiny localhost HTTP server rooted at the repo.
//   4. Uses Playwright (already in devDependencies) to load the harness
//      headless, wait for all modules to attempt registration, then
//      introspect window.AlloModules.
//   5. Cross-references the runtime registry against the monolith's
//      consumer set and reports:
//        - missing-at-runtime  : consumer's expected key not in window.AlloModules
//        - null-at-runtime     : key present but value is null/undefined/false
//        - load-error          : module file failed to fetch or threw at IIFE
//        - ok                  : key present and truthy
//
// Usage:
//   npm run verify:registry:runtime                                   (chromium only, default)
//   node dev-tools/verify_module_registry_runtime.cjs --browser=firefox
//   node dev-tools/verify_module_registry_runtime.cjs --browser=webkit
//   node dev-tools/verify_module_registry_runtime.cjs --all-browsers  (chromium + firefox + webkit)
//   node dev-tools/verify_module_registry_runtime.cjs --verbose
//   node dev-tools/verify_module_registry_runtime.cjs --keep-harness  (don't delete _test_harness.html)
//
// Cross-browser note: firefox + webkit require `npx playwright install firefox webkit` once.
// Each browser launch adds ~3-5 sec, so --all-browsers takes ~15 sec total.
//
// Exit codes:
//   0 — all expected producers present and truthy at runtime (in every browser tested)
//   1 — at least one consumer has missing-at-runtime or null-at-runtime producer
//   2 — usage error / setup failure (server, browser, file not found)

'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const HOST_FILE = path.join(ROOT, 'AlloFlowANTI.txt');
const HARNESS_PATH = path.join(__dirname, '_test_harness.html');
const PORT = 9087;
const LOAD_TIMEOUT_MS = 30000;
const QUIESCE_MS = 1500;  // wait this long after __allLoaded for late registrations

const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const QUIET = args.includes('--quiet');
const KEEP_HARNESS = args.includes('--keep-harness');

// Browser selection
function parseBrowsers() {
  if (args.includes('--all-browsers')) return ['chromium', 'firefox', 'webkit'];
  const explicit = args.find(a => a.startsWith('--browser='));
  if (explicit) {
    const b = explicit.split('=')[1];
    if (!['chromium', 'firefox', 'webkit'].includes(b)) {
      console.error('Invalid --browser value: ' + b + ' (expected chromium/firefox/webkit)');
      process.exit(2);
    }
    return [b];
  }
  return ['chromium'];
}
const BROWSERS = parseBrowsers();

if (!fs.existsSync(HOST_FILE)) {
  console.error('Required file not found: ' + HOST_FILE);
  process.exit(2);
}

let playwright;
try {
  playwright = require('playwright');
} catch (e) {
  console.error('Playwright not installed. Run: npm install playwright');
  process.exit(2);
}

// ──────────────────────────────────────────────────────────────────────────
// Step 1: extract loadModule(name, url) calls from monolith
// ──────────────────────────────────────────────────────────────────────────
const monolith = fs.readFileSync(HOST_FILE, 'utf-8');
const loadModuleRe = /loadModule\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/g;
const expectedModules = [];
const seen = new Set();
let m;
while ((m = loadModuleRe.exec(monolith)) !== null) {
  const name = m[1];
  let url = m[2];
  // Rewrite CDN URLs to local paths served by our http server.
  // jsdelivr pattern: https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@<ref>/<path>
  // <ref> is either a git hash (hex) or a branch name (e.g. @main). Both forms
  // appear in source — build.js rewrites @main → hash for prod, but the dev
  // form is what we see when reading raw AlloFlowANTI.txt.
  url = url
    .replace(/^https?:\/\/cdn\.jsdelivr\.net\/gh\/Apomera\/AlloFlow@[A-Za-z0-9._-]+\//, '/')
    .replace(/^https?:\/\/raw\.githubusercontent\.com\/Apomera\/AlloFlow\/[^/]+\//, '/');
  if (seen.has(name)) continue;
  seen.add(name);
  expectedModules.push({ name, url });
}

// ──────────────────────────────────────────────────────────────────────────
// Step 2: Re-derive consumer list from V1's algorithm so the two reports
// align on what's expected. (Alternatively, we could shell out to V1 and
// parse its output — this in-process approach avoids the extra spawn.)
// ──────────────────────────────────────────────────────────────────────────
function stripLineAndBlockComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, '');
}
const stripped = stripLineAndBlockComments(monolith);
const consumerNames = new Set();
const consumerRe = /window\.AlloModules\.([A-Z][A-Za-z0-9_$]*)(?![A-Za-z0-9_$])/g;
let cm;
while ((cm = consumerRe.exec(stripped)) !== null) {
  const name = cm[1];
  const after = stripped.substring(cm.index + cm[0].length, cm.index + cm[0].length + 6);
  if (/^\s*=(?!=)/.test(after)) continue;  // skip assignments
  consumerNames.add(name);
}

// ──────────────────────────────────────────────────────────────────────────
// Step 3: generate the test harness HTML
// ──────────────────────────────────────────────────────────────────────────
const harness = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>AlloFlow Module Registry Runtime Test</title>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script>
    // Permissive global environment that CDN modules expect.
    window.AlloModules = {};
    window.AlloIcons = new Proxy({}, { get: () => function NoOpIcon() { return null; } });
    window.AlloLanguageContext = React.createContext({ t: function(k) { return k; }, lang: 'en' });
    window.AlloFonts = { default: 'sans-serif', current: 'sans-serif' };
    window.AlloFlowVoice = window.AlloFlowVoice || null;
    window.firebase = window.firebase || { initializeApp: function() {} };
    window.GEMINI_MODELS = window.GEMINI_MODELS || { default: 'gemini-2.0-flash', tts: 'gemini-2.5-flash-preview-tts' };

    // Track per-module load outcome
    window.__loadResults = [];
    // Track uncaught errors thrown during IIFE execution (after script onload fires)
    window.__uncaughtErrors = [];
    window.addEventListener('error', function(e) {
      window.__uncaughtErrors.push({
        message: e.message,
        source: (e.filename || '').split('/').pop(),
        line: e.lineno,
      });
    });

    window.loadModule = function(name, url) {
      return new Promise(function(resolve) {
        var s = document.createElement('script');
        s.src = url;
        s.onload = function() { window.__loadResults.push({ name: name, url: url, status: 'ok' }); resolve(); };
        s.onerror = function() { window.__loadResults.push({ name: name, url: url, status: 'fetch-error' }); resolve(); };
        document.head.appendChild(s);
      });
    };
  </script>
</head>
<body>
  <div id="root"></div>
  <script>
    var EXPECTED = ${JSON.stringify(expectedModules, null, 2)};
    Promise.all(EXPECTED.map(function(m) { return window.loadModule(m.name, m.url); }))
      .then(function() { window.__allLoaded = true; });
  </script>
</body>
</html>
`;

fs.writeFileSync(HARNESS_PATH, harness, 'utf-8');

// ──────────────────────────────────────────────────────────────────────────
// Step 4: spin up tiny localhost HTTP server rooted at repo root
// ──────────────────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt':  'text/plain; charset=utf-8',
};

const server = http.createServer(function(req, res) {
  var urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/dev-tools/_test_harness.html';
  var filePath = path.join(ROOT, urlPath);
  // Path-traversal guard
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(filePath, function(err, data) {
    if (err) { res.writeHead(404); return res.end('Not Found: ' + urlPath); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Step 5: launch each requested browser, load harness, query window.AlloModules
// ──────────────────────────────────────────────────────────────────────────
async function runInBrowser(browserName) {
  const launcher = playwright[browserName];
  if (!launcher) throw new Error('Unknown browser: ' + browserName);

  let browser;
  try {
    browser = await launcher.launch({ headless: true });
  } catch (e) {
    throw new Error(browserName + ' launch failed (try `npx playwright install ' + browserName + '`): ' + e.message);
  }

  const page = await browser.newPage();
  page.on('console', function(msg) {
    if (VERBOSE) console.log('  [' + browserName + '][' + msg.type() + '] ' + msg.text());
  });

  let snapshot;
  try {
    await page.goto('http://localhost:' + PORT + '/');
    await page.waitForFunction(function() { return window.__allLoaded === true; }, { timeout: LOAD_TIMEOUT_MS });
    await page.waitForTimeout(QUIESCE_MS);
    snapshot = await page.evaluate(function() {
      var modules = {};
      Object.keys(window.AlloModules).forEach(function(k) {
        var v = window.AlloModules[k];
        modules[k] = {
          present: true,
          isTruthy: !!v,
          kind: (v === null) ? 'null' : (v === false) ? 'false' : (v === undefined) ? 'undefined' : typeof v,
        };
      });
      return {
        modules: modules,
        loadResults: window.__loadResults,
        uncaughtErrors: window.__uncaughtErrors,
      };
    });
  } catch (e) {
    console.error('  [' + browserName + '] Browser run failed: ' + e.message);
    snapshot = { modules: {}, loadResults: [], uncaughtErrors: [] };
  }

  await browser.close();
  return snapshot;
}

(async function main() {
  await new Promise(function(resolve) { server.listen(PORT, resolve); });

  const perBrowser = {};
  for (const b of BROWSERS) {
    if (!QUIET) console.log('  Running in ' + b + '...');
    try {
      perBrowser[b] = await runInBrowser(b);
    } catch (e) {
      console.error(e.message);
      await new Promise(function(resolve) { server.close(resolve); });
      if (!KEEP_HARNESS) try { fs.unlinkSync(HARNESS_PATH); } catch (_) {}
      process.exit(2);
    }
  }

  await new Promise(function(resolve) { server.close(resolve); });
  if (!KEEP_HARNESS) try { fs.unlinkSync(HARNESS_PATH); } catch (_) {}

  // ──────────────────────────────────────────────────────────────────────
  // Step 6: cross-reference consumers vs runtime registry, per browser
  // ──────────────────────────────────────────────────────────────────────
  // Take the union: a consumer is "OK" only if every browser tested registered it.
  const perBrowserResults = {};
  for (const b of BROWSERS) {
    const snapshot = perBrowser[b];
    const missing = [];
    const nullAtRuntime = [];
    const ok = [];
    for (const name of consumerNames) {
      const reg = snapshot.modules[name];
      if (!reg) missing.push(name);
      else if (!reg.isTruthy) nullAtRuntime.push({ name, kind: reg.kind });
      else ok.push({ name, kind: reg.kind });
    }
    perBrowserResults[b] = { snapshot, missing, nullAtRuntime, ok };
  }

  // For the legacy single-browser report, just use the FIRST browser.
  // Cross-browser delta is printed at the end when multiple browsers ran.
  const primary = BROWSERS[0];
  const snapshot = perBrowser[primary];
  const missing = perBrowserResults[primary].missing;
  const nullAtRuntime = perBrowserResults[primary].nullAtRuntime;
  const ok = perBrowserResults[primary].ok;

  const fetchErrors = snapshot.loadResults.filter(function(r) { return r.status === 'fetch-error'; });
  const totalErrors = missing.length + nullAtRuntime.length;

  // ──────────────────────────────────────────────────────────────────────
  // Step 7: report
  // ──────────────────────────────────────────────────────────────────────
  if (!QUIET || totalErrors > 0) {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║   AlloFlow Module Registry Runtime Verification (V2)                 ║');
    console.log('╚══════════════════════════════════════════════════════════════════════╝');
    console.log('  Modules attempted: ' + expectedModules.length);
    console.log('  Modules loaded ok: ' + snapshot.loadResults.filter(function(r) { return r.status === 'ok'; }).length);
    console.log('  Modules fetch-fail: ' + fetchErrors.length);
    console.log('  Uncaught IIFE errors: ' + snapshot.uncaughtErrors.length);
    console.log('  Consumers checked: ' + consumerNames.size);
    console.log('  Registry size:     ' + Object.keys(snapshot.modules).length);
    console.log('');
  }

  if (missing.length > 0) {
    console.log('═══ ✗ MISSING AT RUNTIME (' + missing.length + ') — consumer\'s key not in window.AlloModules ═══');
    for (const name of missing) console.log('  ✗ ' + name);
    console.log('');
  }

  if (nullAtRuntime.length > 0) {
    console.log('═══ ⚠ NULL AT RUNTIME (' + nullAtRuntime.length + ') — key present but value is ' + 'null/undefined/false ═══');
    for (const e of nullAtRuntime) console.log('  ⚠ ' + e.name + '  (kind: ' + e.kind + ')');
    console.log('');
  }

  if (fetchErrors.length > 0 && VERBOSE) {
    console.log('═══ ⊙ FETCH ERRORS (' + fetchErrors.length + ') — script tag failed to load (informational) ═══');
    for (const r of fetchErrors.slice(0, 20)) console.log('  ⊙ ' + r.name + '  →  ' + r.url);
    if (fetchErrors.length > 20) console.log('  (... ' + (fetchErrors.length - 20) + ' more)');
    console.log('');
  }

  if (snapshot.uncaughtErrors.length > 0 && VERBOSE) {
    console.log('═══ ⊙ UNCAUGHT ERRORS (' + snapshot.uncaughtErrors.length + ') — IIFE threw during execution (informational) ═══');
    for (const e of snapshot.uncaughtErrors.slice(0, 20)) {
      console.log('  ⊙ ' + (e.source || '?') + ':' + (e.line || '?') + '  ' + (e.message || ''));
    }
    if (snapshot.uncaughtErrors.length > 20) console.log('  (... ' + (snapshot.uncaughtErrors.length - 20) + ' more)');
    console.log('');
  }

  console.log('  ✓ OK:                  ' + ok.length);
  console.log('  ✗ Missing at runtime:  ' + missing.length);
  console.log('  ⚠ Null at runtime:     ' + nullAtRuntime.length);
  console.log('  ⊙ Fetch errors:        ' + fetchErrors.length + ' (informational, see --verbose)');
  console.log('  ⊙ IIFE errors:         ' + snapshot.uncaughtErrors.length + ' (informational, see --verbose)');
  console.log('');

  // Cross-browser delta report (only if multiple browsers tested)
  let crossBrowserErrors = 0;
  if (BROWSERS.length > 1) {
    console.log('═══ Cross-browser comparison ═══');
    for (const b of BROWSERS) {
      const r = perBrowserResults[b];
      console.log('  ' + b.padEnd(10) + '  ✓ OK: ' + r.ok.length + '  ✗ missing: ' + r.missing.length + '  ⚠ null: ' + r.nullAtRuntime.length);
    }
    // Names that pass in one browser but fail in another
    const allNames = new Set(consumerNames);
    const browserOk = {};
    for (const b of BROWSERS) browserOk[b] = new Set(perBrowserResults[b].ok.map(o => o.name));
    const browserSpecific = [];
    for (const name of allNames) {
      const passing = BROWSERS.filter(b => browserOk[b].has(name));
      if (passing.length > 0 && passing.length < BROWSERS.length) {
        browserSpecific.push({ name, passing, failing: BROWSERS.filter(b => !browserOk[b].has(name)) });
      }
    }
    if (browserSpecific.length > 0) {
      console.log('');
      console.log('  ✗ Browser-specific failures (' + browserSpecific.length + '):');
      for (const e of browserSpecific.slice(0, 10)) {
        console.log('    ' + e.name + ' — passes: ' + e.passing.join(',') + ' / fails: ' + e.failing.join(','));
      }
      crossBrowserErrors = browserSpecific.length;
    }
    console.log('');
  }

  const overallErrors = totalErrors + crossBrowserErrors;
  if (overallErrors === 0) {
    if (BROWSERS.length > 1) {
      console.log('  ✅ All ' + consumerNames.size + ' consumers have truthy producers in every browser tested (' + BROWSERS.join(', ') + ').');
    } else {
      console.log('  ✅ All ' + consumerNames.size + ' consumers have truthy producers at runtime.');
    }
  } else {
    console.log('  ❌ ' + overallErrors + ' contract violation' + (overallErrors === 1 ? '' : 's') + ' — fix before deploy.');
  }
  console.log('');

  process.exit(overallErrors > 0 ? 1 : 0);
})().catch(function(e) {
  console.error('Fatal: ' + e.message);
  console.error(e.stack);
  try { fs.unlinkSync(HARNESS_PATH); } catch (_) {}
  process.exit(2);
});
