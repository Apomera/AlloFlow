#!/usr/bin/env node
/*
 * check_sel_lazy_load.cjs — the SEL hub must load tools on demand, not in a batch.
 *
 * WHY: until 2026-09-20 opening the SEL Hub fetched every tool module in one
 * go. After the manifest repair that was 16.5 MB before a student could touch
 * anything — about 11s on school wifi and 41s on a weak connection — to open
 * one tool. STEM had solved this long before (catalog metadata eager, each lab
 * on selection); SEL kept the batch because its grid appeared to need every
 * module present. It does not: the card catalog lives in sel_hub_module.js,
 * independent of the tool files.
 *
 * This drives the REAL makeEnsureLoader closure out of the generated App.jsx
 * against a fake script loader, so it tests the shipped code rather than a
 * paraphrase of it. It asserts:
 *
 *   1. First hub open fetches only the shared support files.
 *   2. __alloEnsureSelPluginLoaded('<id>') fetches exactly that one module.
 *   3. The one id whose filename differs (howlTracker -> sel_tool_howl.js)
 *      still resolves.
 *   4. A failed load is a reported error with a retry that re-requests — not a
 *      tool that silently never appears.
 *
 * A regression here is invisible in the UI: batch loading looks identical to
 * lazy loading once everything has arrived. Only the wait changes, and only on
 * the connections least able to afford it.
 *
 * Usage:  node dev-tools/check_sel_lazy_load.cjs [--quiet] [--json]
 * Exit:   0 lazy, 1 regressed to batch / a check failed, 2 could not run
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const QUIET = process.argv.includes('--quiet');
const AS_JSON = process.argv.includes('--json');
const APP = path.join(ROOT, 'desktop/web-app/src/App.jsx');
const MODULES = path.join(ROOT, 'desktop/web-app/node_modules');

function die(msg) {
  console.error('[check_sel_lazy_load] ' + msg);
  process.exit(2);
}

let JSDOM;
try {
  JSDOM = require(path.join(MODULES, 'jsdom')).JSDOM;
} catch (e) {
  console.warn('[check_sel_lazy_load] SKIPPED — jsdom not found at ' + MODULES);
  process.exit(0);
}

if (!fs.existsSync(APP)) die('missing ' + APP);
const APP_SRC = fs.readFileSync(APP, 'utf8');

// ---- the loader block
const START = '      function makeEnsureLoader(';
const END = '      window.__alloEnsureArcadeModesLoaded = makeEnsureLoader(';
const s = APP_SRC.indexOf(START);
const e = APP_SRC.indexOf(END);
if (s < 0 || e < 0) die('could not locate makeEnsureLoader in App.jsx');
const loaderSrc = APP_SRC.slice(s, e);

// ---- the manifest, bracket-matched (indexOf(']') stops inside the array)
const mi = APP_SRC.indexOf('var selToolModules');
if (mi < 0) die('could not locate var selToolModules');
const ms = APP_SRC.indexOf('[', mi);
let depth = 0, k = ms;
for (; k < APP_SRC.length; k++) {
  if (APP_SRC[k] === '[') depth++;
  else if (APP_SRC[k] === ']') { depth--; if (depth === 0) break; }
}
const manifest = [...new Set(
  (APP_SRC.slice(ms, k + 1).match(/'sel_hub\/[^']+'/g) || []).map((x) => x.slice(1, -1))
)];
if (manifest.length < 60) die('manifest parsed as ' + manifest.length + ' entries — the parser is wrong');

const support = manifest.filter((m) => m.indexOf('sel_tool_') === -1);
const tools = manifest.filter((m) => m.indexOf('sel_tool_') !== -1);

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost/' });
const win = dom.window;

const fetched = [];
const failSet = new Set();
const origAppend = win.document.head.appendChild.bind(win.document.head);
win.document.head.appendChild = function (node) {
  if (node && node.tagName === 'SCRIPT' && node.getAttribute('data-allo-plugin-module')) {
    const mod = node.getAttribute('data-allo-plugin-module');
    fetched.push(mod);
    setTimeout(function () {
      if (failSet.has(mod)) { if (node.onerror) node.onerror(); return; }
      const id = mod.replace(/^.*sel_tool_/, '').replace(/\.js$/, '');
      win.SelHub._registry[id] = { render: function () { return null; } };
      if (node.onload) node.onload();
    }, 0);
    return node;
  }
  return origAppend(node);
};

win.SelHub = {
  _registry: {},
  registerTool: function (id, c) { this._registry[id] = c; },
  isRegistered: function (id) { return !!this._registry[id]; }
};
win.__alloModuleRegistry = null;

let api;
try {
  const runner = new Function(
    'window', 'document', 'console', 'setTimeout', 'clearTimeout', 'setInterval',
    'clearInterval', 'CustomEvent', 'Promise', 'Date', 'Object', 'Array', 'String', 'Number',
    'selToolModules', 'stemToolModules', 'arcadeModes', 'pluginCdnBase', 'pluginCdnVersion',
    loaderSrc + '\n; return {' +
    ' ensureAll: window.__alloEnsureSelPluginsLoaded,' +
    ' ensureOne: window.__alloEnsureSelPluginLoaded,' +
    ' retry: window.__alloRetrySelPlugin,' +
    ' state: window.__alloGetSelPluginState };'
  );
  api = runner(win, win.document, { log() {}, warn() {}, info() {}, error() {} },
    win.setTimeout.bind(win), win.clearTimeout.bind(win), win.setInterval.bind(win),
    win.clearInterval.bind(win), win.CustomEvent, Promise, Date, Object, Array, String, Number,
    manifest, [], [], 'https://cdn.example/', 'testver');
} catch (err) {
  die('could not build the loader closure: ' + err.message);
}

if (typeof api.ensureAll !== 'function') die('__alloEnsureSelPluginsLoaded was not defined');
if (typeof api.ensureOne !== 'function') {
  console.error('[check_sel_lazy_load] __alloEnsureSelPluginLoaded is MISSING.');
  console.error('SEL has no per-tool load path, so the hub can only batch-load.');
  process.exit(1);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function check(name, cond, detail) {
  results.push({ name, ok: !!cond, detail: cond ? '' : String(detail) });
}

(async function () {
  api.ensureAll();
  await wait(60);

  // Calibration: if nothing was fetched the harness is broken, and "0 tools
  // fetched" would look like a perfect pass.
  if (fetched.length === 0) die('the loader fetched nothing at all — harness broken, results meaningless');

  check('first open fetches only the support files', fetched.length === support.length,
    'fetched ' + fetched.length + ', expected ' + support.length + ': ' + fetched.join(', '));
  check('first open fetches no tool modules', !fetched.some((m) => m.indexOf('sel_tool_') !== -1),
    'batch-loaded ' + fetched.filter((m) => m.indexOf('sel_tool_') !== -1).length + ' tool(s)');

  const probe = tools.indexOf('sel_hub/sel_tool_tipp.js') !== -1 ? 'tipp'
    : tools[0].replace(/^.*sel_tool_/, '').replace(/\.js$/, '');
  fetched.length = 0;
  const ok = api.ensureOne(probe);
  await wait(60);
  check('a tool can be requested on demand', ok === true, 'ensureOne returned ' + ok);
  check('requesting one tool fetches exactly one module', fetched.length === 1,
    'fetched ' + JSON.stringify(fetched));
  check('and the tool registers', win.SelHub.isRegistered(probe), probe + ' did not register');

  if (manifest.indexOf('sel_hub/sel_tool_howl.js') !== -1) {
    fetched.length = 0;
    api.ensureOne('howlTracker');
    await wait(60);
    check('howlTracker resolves to its differently-named file',
      fetched[0] === 'sel_hub/sel_tool_howl.js', 'fetched ' + fetched[0]);
  }

  const victim = tools.find((m) => m !== 'sel_hub/sel_tool_tipp.js') || tools[0];
  const victimId = victim.replace(/^.*sel_tool_/, '').replace(/\.js$/, '');
  failSet.add(victim);
  fetched.length = 0;
  api.ensureOne(victimId);
  await wait(80);
  const errState = api.state(victimId);
  check('a failed load is reported as an error', errState && errState.status === 'error',
    JSON.stringify(errState));
  check('the failure carries a readable message',
    !!(errState && errState.error && errState.error.length > 20),
    JSON.stringify(errState && errState.error));

  failSet.delete(victim);
  fetched.length = 0;
  api.retry(victimId);
  await wait(80);
  check('retry re-requests the module', fetched.indexOf(victim) !== -1, 'fetched ' + JSON.stringify(fetched));
  check('and the tool recovers', (api.state(victimId) || {}).status === 'loaded',
    JSON.stringify(api.state(victimId)));

  // ---- the gates that decide whether a control is usable BEFORE its module
  // exists. Lazy loading changed what isRegistered() means: it used to read as
  // "still streaming in" (true within seconds) and now means "someone already
  // opened this". Any control still gated on it is permanently dead, and the
  // worst of them is the crisis-search route into Crisis Companion, which is
  // not rendered at all when the check fails.
  const HUB_PATH = path.join(ROOT, 'sel_hub/sel_hub_module.js');
  if (fs.existsSync(HUB_PATH)) {
    const hub = fs.readFileSync(HUB_PATH, 'utf8');
    check('the openable helper exists', /function _selToolIsOpenable\(/.test(hub),
      '_selToolIsOpenable is missing; every pre-load gate falls back to isRegistered');
    const GATES = [
      ['crisis-search Crisis Companion button', /_selToolIsOpenable\('crisiscompanion'\)/],
      ['tool grid card', /var isRegistered = _selToolIsOpenable\(tool\.id\)/],
      ['pathway option button', /disabled: !_selToolIsOpenable\(item\.tool\)/],
      ['pathway next-tool pick', /!pathwayProgress\[id\] && _selToolIsOpenable\(id\)/],
      ['station activity chip', /var available = _selToolIsOpenable\(id\)/],
      ['history panel open button', /_selToolIsOpenable\(item\.toolId\)/],
      ['teacher plan pending list', /return !_selToolIsOpenable\(toolId\)/]
    ];
    GATES.forEach(function (g) {
      check(g[0] + ' does not gate on "already loaded"', g[1].test(hub),
        'reverted to isRegistered — this control is dead until the tool is opened some other way');
    });
  }

  const failures = results.filter((r) => !r.ok);

  if (AS_JSON) {
    console.log(JSON.stringify({
      manifestCount: manifest.length,
      supportCount: support.length,
      toolCount: tools.length,
      results
    }, null, 2));
  } else {
    if (!QUIET || failures.length) {
      console.log('[check_sel_lazy_load] ' + manifest.length + ' module(s): ' +
        support.length + ' support, ' + tools.length + ' deferred tool(s).');
    }
    results.forEach((r) => {
      if (!r.ok) console.error('  ✗ ' + r.name + '  <- ' + r.detail);
      else if (!QUIET) console.log('  ✓ ' + r.name);
    });
  }

  if (failures.length) {
    if (!AS_JSON) {
      console.error('\nSEL is not loading tools on demand. If the batch was restored,');
      console.error('every student pays the full hub download to open one tool.');
      console.error('The per-tool path is __alloEnsureSelPluginLoaded, requested from');
      console.error('openSelToolById() in sel_hub/sel_hub_module.js.');
    }
    process.exit(1);
  }
  if (!QUIET && !AS_JSON) console.log('✓ check_sel_lazy_load: SEL loads tools on demand.');
})();
