'use strict';

// Directly execute one workflow from the repository spec. This is a
// Playwright API check with the real expect matchers, not a Playwright CLI run.
// Usage from repo cwd: node <this-file> closeup|instruments|keyboard|lifecycle
// Root supplies PLAYWRIGHT_BROWSERS_PATH and an attempt-specific
// MM_DESCENT_HUD_REPORT_DIR. No browser is launched merely by requiring this file.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Module = require('node:module');

const mode = process.argv[2];
if (!['closeup','instruments','keyboard','lifecycle'].includes(mode)) throw Error('Expected closeup, instruments, keyboard or lifecycle');
const repo = path.resolve(process.env.MM_DESCENT_HUD_REPO || process.cwd());
const specPath = path.join(repo, mode === 'closeup' ? 'tests/e2e/moon-mission-docking-closeup.spec.ts' : mode === 'instruments' ? 'tests/e2e/moon-mission-docking-instruments.spec.ts' : 'tests/e2e/moon-mission-ascent.spec.ts');
const harnessPath = path.join(repo, 'tests/e2e/helpers/stem_gl_harness.ts');
const pixelsPath = path.join(repo, 'tests/e2e/helpers/png_pixels.ts');
const runtimePath = path.join(repo, 'stem_lab/stem_tool_moonmission.js');
const mirrorPath = path.join(repo, 'desktop/web-app/public/stem_lab/stem_tool_moonmission.js');
const output = path.resolve(process.env.MM_DESCENT_HUD_REPORT_DIR ||
  path.join(repo, 'reports/moon-mission-enhancement-pass36-2026-10-09/browser/direct-' + mode));
process.env.MM_DESCENT_HUD_REPORT_DIR = output;
process.env.MM_DOCKING_INSTRUMENT_REPORT_DIR = output;
process.env.MM_DOCKING_CLOSEUP_REPORT_DIR = output;
process.env.MM_ENTRY_GUIDANCE_REPORT_DIR = output;
process.env.MM_REPORT_DIR = output;
const resultPath = path.join(output, 'direct-' + mode + '-result.json');
const progressPath = path.join(output, 'direct-' + mode + '-progress.json');
if (fs.existsSync(resultPath) || fs.existsSync(progressPath)) throw Error('Refusing to overwrite a prior direct run: ' + output);
fs.mkdirSync(output, { recursive: true });
process.chdir(repo);
const requireRepo = Module.createRequire(path.join(repo, 'package.json'));
const started = Date.now();
const result = {
  schema: 'moon-pass36-direct-browser-v1', runner: 'direct-playwright-api', playwrightCliResult: false,
  mode, status: 'running', startedAt: new Date(started).toISOString(), repo, specPath, output,
  browserCache: process.env.PLAYWRIGHT_BROWSERS_PATH || null,
  timeouts: { action: 20000, navigation: 60000, expect: 15000, launch: 60000 },
  launchOptions: { headless: true, timeout: 60000, downloadsPath: path.join(output, 'downloads') },
  workflowCompleted: false, cleanupCompleted: false, milestones: [], errors: [], attachments: [],
};
function errorData(error) {
  return { name: error?.name || 'Error', message: error?.message || String(error), stack: error?.stack || null };
}
function milestone(name, detail) {
  const row = { name, elapsedMs: Date.now() - started, ...(detail || {}) };
  result.milestones.push(row); console.log('[pass36-direct] ' + JSON.stringify(row));
  try { fs.writeFileSync(progressPath, JSON.stringify(result, null, 2)); }
  catch (error) { result.errors.push({ phase: 'progress-write', ...errorData(error) }); }
}
function hash(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
async function bounded(task, milliseconds, label) {
  let timer;
  try {
    return await Promise.race([Promise.resolve().then(task), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(label + ' exceeded ' + milliseconds + ' ms')), milliseconds);
    })]);
  } finally { clearTimeout(timer); }
}
async function phase(name, task, timeout) {
  milestone(name + ':before');
  try {
    const value = timeout ? await bounded(task, timeout, name) : await task();
    milestone(name + ':after'); return value;
  } catch (error) { milestone(name + ':failed', { error: errorData(error) }); throw error; }
}

async function run() {
  let browser, context, page, hooks, info, beforeAllAttempted = false;
  const originalLoad = Module._load, originalTs = Module._extensions['.ts'];
  const originals = new Map();
  try {
    milestone('load:before');
    for (const file of [specPath, harnessPath, pixelsPath, runtimePath, mirrorPath]) originals.set(file, hash(file));
    if (originals.get(runtimePath) !== originals.get(mirrorPath)) throw Error('Canonical/public source mismatch before verification');
    result.inputHashes = Object.fromEntries(originals);
    const realPlaywright = requireRepo('@playwright/test');
    const babelBundlePath = path.join(repo, 'node_modules/playwright/lib/transform/babelBundle.js');
    const { babelTransform } = require(babelBundlePath);
    if (typeof babelTransform !== 'function') throw Error('Installed Playwright Babel transform is unavailable');
    result.transform = { name: 'Playwright bundled babelTransform', bundlePath: babelBundlePath, sha256: hash(babelBundlePath) };
    const expect = realPlaywright.expect.configure({ timeout: 15000 });
    // Current installed expect has a null-testInfo execution path for the
    // ordinary and locator matchers used here. Snapshot matchers are not used.
    expect({ standalone: true }).toEqual({ standalone: true });
    const registered = []; hooks = { beforeAll: [], afterEach: [], afterAll: [] };
    const mockTest = function(name, callback) {
      if (typeof name !== 'string' || typeof callback !== 'function') throw Error('Unsupported test registration');
      registered.push({ name, callback });
    };
    for (const name of Object.keys(hooks)) mockTest[name] = callback => {
      if (typeof callback !== 'function') throw Error('Unsupported ' + name + ' registration');
      hooks[name].push(callback);
    };
    const suite = {}, contextOptions = {};
    mockTest.use = options => {
      if (Object.keys(options).some(key => key !== "hasTouch")) throw Error("Unsupported context option");
      Object.assign(contextOptions, options);
    };
    mockTest.describe = { configure(options) { Object.assign(suite, options); } };
    const allowedTs = new Set([specPath, harnessPath, pixelsPath].map(file => path.normalize(file).toLowerCase()));
    Module._extensions['.ts'] = function(module, filename) {
      if (!allowedTs.has(path.normalize(filename).toLowerCase())) {
        if (originalTs) return originalTs(module, filename);
        throw Error('Unexpected TypeScript import outside this workflow: ' + filename);
      }
      // Installed Playwright's actual signature is (code, filename, isModule,
      // pluginsPrologue, pluginsEpilogue, jsxImportSource). A .ts filename enables
      // its bundled TS preset; false selects CommonJS. It disables Babel config
      // discovery, so no repository plugin or extra package is needed here.
      let workflowSource = fs.readFileSync(filename, 'utf8');
      if (filename === specPath && mode !== 'instruments' && mode !== 'closeup') {
        const originalReport = "const REPORT = resolve('reports/moon-mission-enhancement-pass5-2026-09-29/ascent');";
        if (workflowSource.split(originalReport).length !== 2) throw Error('Existing report destination was not uniquely found');
        workflowSource = workflowSource.replace(originalReport, "const REPORT = resolve(process.env.MM_DOCKING_INSTRUMENT_REPORT_DIR);");
        result.workflowAdaptation = 'Only the historical screenshot destination is redirected to the current owned report directory.';
      }
      const compiled = babelTransform(workflowSource, filename, false, [], []);
      if (!compiled || typeof compiled.code !== 'string') throw Error('No transformed code for ' + filename);
      module._compile(compiled.code, filename);
    };
    Module._load = function(request, parent, isMain) {
      if (request === '@playwright/test' && parent?.filename === specPath)
        return { ...realPlaywright, test: mockTest, expect };
      return originalLoad.call(this, request, parent, isMain);
    };
    try { require(specPath); }
    finally {
      Module._load = originalLoad;
      if (originalTs) Module._extensions['.ts'] = originalTs;
      else delete Module._extensions['.ts'];
    }
    if (registered.length !== (['closeup', 'instruments'].includes(mode) ? 1 : 9)) throw Error('Unexpected workflow registration count');
    const prefix = mode === 'closeup' ? 'docking port close-up ' : mode === 'instruments' ? 'docking contact instruments ' : mode === 'lifecycle' ? 'docking pause, resize, reload ' : '320px keyboard docking ';
    const selected = registered.filter(item => item.name.startsWith(prefix));
    if (selected.length !== 1) throw Error('Could not uniquely select workflow ' + mode);
    if (suite.retries !== 0 || !(suite.timeout > 0)) throw Error('Spec retry/timeout contract is missing');
    result.workflow = selected[0].name; result.suiteOptions = suite;
    result.timeouts.workflow = suite.timeout;
    info = { project: { name: 'chromium' }, attach: async (name, attachment) => {
      // The spec writes screenshots before attaching. Preserve their paths;
      // no Playwright Test reporter or synthetic TestInfo is installed.
      if (attachment.body != null) {
        const attachmentPath = path.join(output, name.replace(/[^a-z0-9_-]/gi, '-') + '.json');
        if (fs.existsSync(attachmentPath)) throw Error('Refusing to overwrite attachment');
        fs.writeFileSync(attachmentPath, attachment.body);
        result.attachments.push({name, path: attachmentPath, contentType: attachment.contentType});
      } else result.attachments.push({ name, ...attachment });
    } };
    milestone('load:after', { workflow: result.workflow, registered: registered.map(item => item.name) });
    beforeAllAttempted = true;
    await phase('harness-start', async () => {
      for (const callback of hooks.beforeAll) await callback({}, info);
    }, 60000);
    fs.mkdirSync(result.launchOptions.downloadsPath, {recursive:true});
    browser = await phase('browser-launch', () => realPlaywright.chromium.launch(result.launchOptions), 65000);
    result.browserVersion = browser.version();
    context = await phase('context-create', () => browser.newContext({ viewport: { width: 1100, height: 1000 },
      deviceScaleFactor: 1, ignoreHTTPSErrors: false, acceptDownloads: true, ...contextOptions }), 60000);
    context.setDefaultTimeout(20000); context.setDefaultNavigationTimeout(60000);
    page = await phase('page-create', () => context.newPage(), 60000);
    page.setDefaultTimeout(20000); page.setDefaultNavigationTimeout(60000);
    result.pageEvents = [];
    for (const event of ['pageerror','crash','close']) page.on(event, error => {
      result.pageEvents.push({event, elapsedMs:Date.now()-started, message:error?.message || null});
      milestone('page-'+event);
    });
    await phase('workflow', () => selected[0].callback({ page }, info), suite.timeout);
    result.workflowCompleted = true;
  } catch (error) {
    result.errors.push({ phase: 'execution', ...errorData(error) });
    milestone('execution-failed', { error: errorData(error) });
  } finally {
    Module._load = originalLoad;
    if (originalTs) Module._extensions['.ts'] = originalTs;
    else delete Module._extensions['.ts'];
    milestone('cleanup:before');
    const cleanup = async (name, callback) => {
      try { await phase(name, callback, name === 'browser-close' ? 60000 : 20000); }
      catch (error) { result.errors.push({ phase: name, ...errorData(error) }); }
    };
    if (page && hooks) await cleanup('after-each', async () => {
      for (const callback of hooks.afterEach) await callback({ page }, info);
    });
    if (context) await cleanup('context-close', () => context.close());
    if (browser) await cleanup('browser-close', () => browser.close());
    if (beforeAllAttempted && hooks) await cleanup('harness-stop', async () => {
      for (const callback of hooks.afterAll) await callback({}, info);
    });
    result.cleanupCompleted = !result.errors.some(error =>
      ['after-each', 'context-close', 'browser-close', 'harness-stop'].includes(error.phase));
    for (const [file, before] of originals) {
      try { if (hash(file) !== before) throw Error('Verified input changed during direct workflow: ' + file); }
      catch (error) { result.errors.push({ phase: 'input-preservation', ...errorData(error) }); }
    }
    result.status = result.workflowCompleted && result.cleanupCompleted && result.errors.length === 0 ? 'passed' : 'failed';
    result.finishedAt = new Date().toISOString(); result.elapsedMs = Date.now() - started;
    milestone('cleanup:after', { status: result.status });
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
    console.log('[pass36-direct] Result ' + result.status + ': ' + resultPath);
    process.exitCode = result.status === 'passed' ? 0 : 1;
  }
}
if (require.main === module) run().catch(error => {
  console.error('[pass36-direct] Fatal result-writing failure', error);
  process.exitCode = 1;
});
