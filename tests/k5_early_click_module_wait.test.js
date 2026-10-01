// Early clicks wait for their module instead of throwing (fleet wave 2, lane K5).
//
// WHY: at the King PD dry runs Load Project failed on the first try in every run.
// Its handler lives in a deferred module, the loader parks deferred modules while
// the Launch Pad is up, and the host stub threw "MiscHandlers module not loaded -
// reload the page" without asking for the module. The file input kept the file,
// so choosing the same file again fired no change event and nothing happened.
// Generate, Quick Start Done, ~45 async handlers and the HostHandlers accessor
// had the same shape.
//
// These tests run the SHIPPED loader (registry, loadModule, __alloPromoteModule,
// __alloEnsureLazyModule) and the SHIPPED host code (_alloAwaitModules, the
// HostHandlers accessor, handleLoadProject, the handleGenerate wrapper), sliced
// out of AlloFlowANTI.txt, in real Chromium with a real <input type=file>.
// Module scripts are served by page.route and held until the test releases them.
// No background pump is started, which is the parked state the Launch Pad causes.
// ALLO_ANTI_CANDIDATE points the slices at a scratch copy for mutation runs.
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';

const ANTI = readFileSync(process.env.ALLO_ANTI_CANDIDATE || resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
function between(start, end) {
  const a = ANTI.indexOf(start);
  expect(a, 'missing marker: ' + start).toBeGreaterThan(-1);
  expect(ANTI.indexOf(start, a + start.length), 'ambiguous marker: ' + start).toBe(-1);
  const b = ANTI.indexOf(end, a + start.length);
  expect(b, 'missing end marker: ' + end).toBeGreaterThan(a);
  return ANTI.slice(a, b);
}
const SRC = {
  registry: between('    var __alloModuleRegistry = (window.__alloModuleRegistry', '    // ── Error Reporter'),
  ensure: between('    var __alloLazyEnsurePromises = window.__alloLazyEnsurePromises', '    // Teaching-script research'),
  hostAwait: between('  const _alloAwaitModules = (mods, label) => {', '    const lastHandleSpeakRef = useRef(null);'),
  loadProject: between('  const handleLoadProject = (e) => {', '  // Bridge for the Community Catalog'),
  generate: between('  // Generation reaches these helpers synchronously', '  const GUIDED_RETRY_TYPES'),
  wizard: between('  const handleWizardComplete = (data) => {', '  const [showDice, setShowDice]'),
  findStandards: between('  const handleFindStandards = async (gradeContext = null) => {', '  // Alignment and rigor regeneration'),
  markdown: between('// BEGIN SHARED DIRECTIONS MARKDOWN', '// END SHARED DIRECTIONS MARKDOWN'),
};

const ORIGIN = 'https://k5.test';
const MODULES = {
  MiscHandlersModule: `window.AlloModules.MiscHandlers = { handleLoadProject(e) {
    const f = e.target.files[0];
    if (!f) { window.__k5log.push('no-file'); return; }
    const r = new FileReader();
    r.onload = () => window.__k5log.push('loaded:' + f.name + ':' + r.result);
    r.readAsText(f);
  } }; window.AlloModules.MiscHandlersModule = true;`,
  AlloCrypto: `window.AlloModules.AlloCrypto = { isEncryptedEnvelope: () => false };`,
  GenDispatcherModule: `window.AlloModules.GenDispatcher = { handleGenerate(type) { window.__k5log.push('generated:' + type); } }; window.AlloModules.GenDispatcherModule = true;`,
  HostHandlers: `window.AlloModules.HostHandlers = deps => ({ handleThing(a, b) { window.__k5log.push('host:' + a + ':' + b); return 'host-result'; },
    handleClick(e) { window.__k5log.push('host-event:' + (e.currentTarget && e.currentTarget.id)); } });`,
  PhaseOHandlersModule: `window.AlloModules.PhaseOHandlers = { handleWizardComplete(data) { window.__k5log.push('wizard:' + data.grade); },
    handleFindStandards(grade) { window.__k5log.push('standards:' + grade); return 'found'; } }; window.AlloModules.PhaseOHandlersModule = true;`,
  OtherModule: `window.AlloModules.OtherModule = true;`,
  // The real module owns a capture-phase click listener for #sel-hub links once it lands.
  SelHub: `window.SelHub = { toolLinks: {
      parse: h => { const m = String(h).match(/^#sel-hub(?:\\/([A-Za-z0-9_-]{1,64}))?\\/?$/); return m ? (m[1] || '') : null; },
      station: () => '',
      open: (id, label) => window.__k5log.push('sel-open:' + id + ':' + label) } };
    document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[href^="#sel-hub"]'); if (!a) return;
      e.preventDefault(); e.stopPropagation(); window.__k5log.push('selhub-handled'); window.SelHub.toolLinks.open(window.SelHub.toolLinks.parse(a.getAttribute('href')), a.textContent.trim()); }, true);
    window.AlloModules.SelHub = function SelHubModal() {};`,
};
for (const k of ['TextPipelineHelpers', 'TextUtilityHelpers', 'PhaseKHelpers', 'PromptsLibrary', 'GenerationHelpers', 'CmapHandlers', 'PureHelpers']) {
  MODULES[k + 'Module'] = `window.AlloModules.${k} = {}; window.AlloModules.${k}Module = true;`;
}
const urlOf = name => `${ORIGIN}/m/${name}.js?v=1`;

let browser;
let dir;
beforeAll(async () => {
  browser = await chromium.launch({ headless: true });
  dir = mkdtempSync(join(tmpdir(), 'k5-early-click-'));
  writeFileSync(join(dir, 'crew-pack.json'), '{"history":[]}');
}, 60000);
afterAll(async () => {
  if (browser) await browser.close();
  if (dir) rmSync(dir, { recursive: true, force: true });
}, 30000);

// hold: names whose script waits for release(name); fail: names whose script (and fallback) error.
async function openPage({ hold = [], fail = [] } = {}) {
  const page = await browser.newPage();
  const held = new Map();
  const failing = new Set(fail);
  const requested = [];
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route(`${ORIGIN}/**`, async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/') return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><body><input type="file" id="load"><button id="gen">Generate</button><button id="wiz">Done</button><button id="host">Tool</button><div id="dir"></div></body></html>' });
    const name = url.pathname.replace(/^\/m\//, '').replace(/\.js$/, '');
    requested.push(name + (url.searchParams.has('fallback') ? ':fallback' : ''));
    if (failing.has(name)) return route.abort('failed');
    if (hold.includes(name)) await new Promise(r => held.set(name, r));
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: MODULES[name] || '' });
  });
  await page.goto(ORIGIN + '/');
  await page.evaluate(({ registry, ensure, names, urls }) => {
    window.AlloModules = {};
    window.__k5log = [];
    window.__toasts = [];
    window.addEventListener('unhandledrejection', e => window.__k5log.push('unhandled:' + (e.reason && e.reason.message)));
    // eslint-disable-next-line no-new-func
    new Function('names', 'urls', `
      var pluginCdnVersion = 'k5';
      var localizeModuleUrl = function (u) { return u; };
      var moduleFallbackUrl = function (o) { return o + (o.indexOf('?') === -1 ? '?' : '&') + 'fallback=1'; };
      var _alloModuleWatchdogShouldWait = function () { return false; };
      ${registry}
      ${ensure}
      names.forEach(function (n, i) { loadModule(n, urls[i]); });
      __alloBootstrappingModules = false;
    `)(names, urls);
  }, { registry: SRC.registry, ensure: SRC.ensure, names: Object.keys(MODULES).filter(n => n !== 'HostHandlers'), urls: Object.keys(MODULES).filter(n => n !== 'HostHandlers').map(urlOf) });
  // HostHandlers is boot-critical: it is requested at once, so hold it to model a slow arrival.
  await page.evaluate(url => {
    const s = document.createElement('script'); s.src = url;
    s.onload = () => { window.__alloModuleRegistry.HostHandlers = { status: 'loaded' }; window.dispatchEvent(new CustomEvent('alloflow:module-registry-changed')); };
    window.__alloModuleRegistry.HostHandlers = { status: 'pending' };
    document.head.appendChild(s);
  }, urlOf('HostHandlers'));
  await page.evaluate(({ hostAwait, loadProject, generate, wizard, findStandards, markdown }) => {
    // eslint-disable-next-line no-new-func
    new Function(`
      const addToast = (message, kind) => window.__toasts.push([kind, message]);
      const __alloHostDeps = {};
      ${hostAwait}
      const _alloRunGenerate = async (...args) => window.AlloModules.GenDispatcher.handleGenerate(...args);
      ${generate}
      const _alloPhaseOHandlersDeps = () => ({});
      ${wizard}
      ${findStandards}
      // handleLoadProject forwards ~100 host setters it never calls itself; the
      // module double ignores them, so any unknown name resolves to a no-op.
      const known = { _alloAwaitModules };
      const scope = new Proxy(known, {
        has: (t, k) => typeof k === 'string' && (k in t || !(k in globalThis)),
        get: (t, k) => typeof k === 'symbol' ? undefined : (k in t ? t[k] : function () {}),
      });
      const handleLoadProject = (function () { with (scope) { return (function () { ${loadProject}; return handleLoadProject; })(); } })();
      document.getElementById('load').addEventListener('change', e => { window.__k5loadReturn = handleLoadProject(e); });
      document.getElementById('gen').addEventListener('click', () => { handleGenerate('simplified'); });
      document.getElementById('wiz').addEventListener('click', () => { handleWizardComplete({ grade: '5th' }); });
      // React hands handlers a synthetic event and nulls its currentTarget once dispatch ends.
      document.getElementById('host').addEventListener('click', e => { const synthetic = { nativeEvent: e, currentTarget: e.currentTarget, target: e.target }; _alloHostHandlers().handleClick(synthetic); synthetic.currentTarget = null; });
      ${markdown}
      document.getElementById('dir').innerHTML = _alloParsePreviewMarkdown('Open [Crew Protocols](#sel-hub/crew-protocols) with your crew.');
      window.__k5host = { handleThing: (...a) => _alloHostHandlers().handleThing(...a), optional: () => _alloHostHandlersOptional(), findStandards: g => handleFindStandards(g) };
    `)();
  }, SRC);
  const release = async name => {
    for (let i = 0; i < 100 && !held.has(name); i++) await page.waitForTimeout(20);
    expect(held.has(name), name + ' was never requested').toBe(true);
    held.get(name)();
    held.delete(name);
  };
  const log = () => page.evaluate(() => window.__k5log.slice());
  const toasts = () => page.evaluate(() => window.__toasts.slice());
  const waitLog = async (pred, ms = 5000) => { const end = Date.now() + ms; while (Date.now() < end) { if (pred(await log())) return true; await page.waitForTimeout(25); } return false; };
  return { page, release, log, toasts, waitLog, requested, errors };
}

describe('early clicks wait for their module instead of throwing', () => {
  it('Load Project clicked before its module lands loads the file once the module arrives, and the same file works again', async () => {
    const t = await openPage({ hold: ['MiscHandlersModule'] });
    const file = join(dir, 'crew-pack.json');
    await t.page.setInputFiles('#load', file);
    // Waiting, not throwing: nothing loaded yet, the input is cleared, the module was asked for.
    await t.page.waitForTimeout(150);
    expect(await t.log()).toEqual([]);
    expect(await t.page.$eval('#load', el => el.value)).toBe('');
    expect(t.requested).toContain('MiscHandlersModule');
    expect((await t.toasts()).map(x => x[1])).toContain('Getting Load Project ready…');
    // The parked queue itself did not run: an unrelated module was never fetched.
    expect(t.requested).not.toContain('OtherModule');
    await t.release('MiscHandlersModule');
    expect(await t.waitLog(l => l.includes('loaded:crew-pack.json:{"history":[]}'))).toBe(true);
    // Same file again: the change event fires because the input was cleared.
    await t.page.setInputFiles('#load', file);
    expect(await t.waitLog(l => l.filter(x => x.startsWith('loaded:crew-pack.json')).length === 2)).toBe(true);
    expect(await t.page.$eval('#load', el => el.value)).toBe('');
    expect((await t.log()).filter(x => x.startsWith('unhandled'))).toEqual([]);
    expect(t.errors).toEqual([]);
    await t.page.close();
  }, 60000);

  it('an optional helper that fails to load does not block Load Project', async () => {
    const t = await openPage({ fail: ['AlloCrypto'] });
    await t.page.setInputFiles('#load', join(dir, 'crew-pack.json'));
    expect(await t.waitLog(l => l.some(x => x.startsWith('loaded:crew-pack.json')))).toBe(true);
    expect(t.requested).toContain('AlloCrypto:fallback');
    await t.page.close();
  }, 60000);

  it('when Load Project cannot load it says so plainly, changes nothing, and a later pick of the same file recovers', async () => {
    const t = await openPage({ fail: ['MiscHandlersModule'] });
    const file = join(dir, 'crew-pack.json');
    await t.page.setInputFiles('#load', file);
    const failed = async () => (await t.toasts()).some(x => x[0] === 'error' && x[1] === 'Could not finish loading Load Project. Nothing was changed. Check the connection, then try again.');
    for (let i = 0; i < 100 && !(await failed()); i++) await t.page.waitForTimeout(25);
    expect(await failed()).toBe(true);
    expect(t.requested).toEqual(expect.arrayContaining(['MiscHandlersModule', 'MiscHandlersModule:fallback']));
    expect(await t.log()).toEqual([]);
    expect(t.errors).toEqual([]);
    // The connection comes back; the same file is chosen again and the failed module is retried.
    await t.page.unroute(`${ORIGIN}/**`);
    await t.page.route(`${ORIGIN}/**`, route => {
      const name = new URL(route.request().url()).pathname.replace(/^\/m\//, '').replace(/\.js$/, '');
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: MODULES[name] || '' });
    });
    await t.page.setInputFiles('#load', file);
    expect(await t.waitLog(l => l.some(x => x.startsWith('loaded:crew-pack.json')))).toBe(true);
    await t.page.close();
  }, 60000);

  it('Generate clicked early runs once the dispatcher lands, even if an optional helper failed', async () => {
    const t = await openPage({ hold: ['GenDispatcherModule'], fail: ['CmapHandlersModule'] });
    await t.page.click('#gen');
    await t.page.waitForTimeout(150);
    expect(await t.log()).toEqual([]);
    expect((await t.toasts()).map(x => x[1])).toContain('Getting the generator ready…');
    expect(t.requested).toEqual(expect.arrayContaining(['GenDispatcherModule', 'TextPipelineHelpersModule', 'PromptsLibraryModule', 'PureHelpersModule']));
    await t.release('GenDispatcherModule');
    expect(await t.waitLog(l => l.includes('generated:simplified'))).toBe(true);
    // A second click with everything settled runs at once, without another wait notice.
    const before = (await t.toasts()).length;
    await t.page.click('#gen');
    expect(await t.waitLog(l => l.filter(x => x === 'generated:simplified').length === 2)).toBe(true);
    expect((await t.toasts()).length).toBe(before);
    expect((await t.log()).filter(x => x.startsWith('unhandled'))).toEqual([]);
    await t.page.close();
  }, 60000);

  it('Quick Start Done, async handlers and HostHandlers calls wait, keep their arguments and the event target, and housekeeping skips', async () => {
    const t = await openPage({ hold: ['PhaseOHandlersModule', 'HostHandlers'] });
    const standards = t.page.evaluate(() => window.__k5host.findStandards('3rd'));
    await t.page.click('#wiz');
    await t.page.click('#host');
    const pending = t.page.evaluate(() => window.__k5host.handleThing('a', 2));
    expect(await t.page.evaluate(() => window.__k5host.optional())).toBe(null);
    await t.page.waitForTimeout(100);
    expect(await t.log()).toEqual([]);
    await t.release('PhaseOHandlersModule');
    await t.release('HostHandlers');
    expect(await pending).toBe('host-result');
    expect(await standards).toBe('found');
    expect(await t.waitLog(l => l.includes('wizard:5th') && l.includes('host:a:2') && l.includes('host-event:host'))).toBe(true);
    expect(await t.page.evaluate(() => typeof window.__k5host.optional().handleThing)).toBe('function');
    // A converted async stub (one of ~45) runs at once now that its module is present.
    expect(await t.page.evaluate(() => window.__k5host.findStandards('4th'))).toBe('found');
    expect(t.errors).toEqual([]);
    await t.page.close();
  }, 60000);
});

// Every async host stub of the standard shape waits while its module is absent and
// then calls itself with the same parameters. Sync stubs return values and cannot wait;
// they stay listed here so a new one is a deliberate choice (Wave 3 list in the K5 report).
describe('async module stubs wait instead of throwing (source gate)', () => {
  const lines = ANTI.split('\n');
  const stubs = [];
  lines.forEach((line, i) => {
    const m = line.match(/^\s*throw new Error\((["'])\[(\w+)\] (\w+) module not loaded (?:-|—) reload the page\1\);$/);
    if (!m) return;
    let decl = -1;
    for (let k = i - 1; k >= Math.max(0, i - 40); k--) if (new RegExp('^\\s*const ' + m[2] + ' = (async )?\\(').test(lines[k])) { decl = k; break; }
    stubs.push({ name: m[2], mod: m[3], line: i, decl, isAsync: decl >= 0 && / = async \(/.test(lines[decl]) });
  });
  const EXEMPT_ASYNC = ['syncProgressToFirestore', 'handleCardAudioSequence'];
  it('finds the stubs it is meant to police', () => {
    expect(stubs.length).toBeGreaterThan(70);
    expect(stubs.filter(s => s.isAsync).length).toBeGreaterThan(40);
  });
  it('each standard async stub is guarded by a wait on its own module with its own parameters', () => {
    const missing = [];
    for (const s of stubs.filter(x => x.isAsync && !EXEMPT_ASYNC.includes(x.name))) {
      const body = lines.slice(s.decl, s.line).join('\n');
      if (!body.includes('const _m = window.AlloModules && window.AlloModules.' + s.mod + ';')) continue;
      const params = lines[s.decl].match(/async \((.*)\) => \{\s*$/)[1].split(',').map(p => p.trim().replace(/\s*=[\s\S]*$/, '')).filter(Boolean);
      const want = `if (!_m) return _alloAwaitModules([['${s.mod}Module', '${s.mod}']], 'this tool').then(() => ${s.name}(${params.join(', ')}));`;
      if (lines[s.line - 1].trim() !== want) missing.push(s.name + ' @' + (s.line + 1));
    }
    expect(missing).toEqual([]);
  });
});

describe('a directions link to an SEL tool clicked before the SEL Hub lands', () => {
  it('opens no blank tab, asks for the SEL Hub, and opens the tool once it arrives', async () => {
    const t = await openPage({ hold: ['SelHub'] });
    const popups = [];
    const context = t.page.context();
    context.on('page', p => popups.push(p));
    await t.page.evaluate(() => {
      // Observe after the host's capture listener without changing browser behavior.
      document.addEventListener('click', event => {
        window.__k5selLinkPrevented = event.defaultPrevented;
      }, { capture: true, once: true });
    });
    // The shipped renderer marks every link target=_blank, which is what opened the blank tab.
    expect(await t.page.getAttribute('#dir a', 'target')).toBe('_blank');
    const before = t.page.url();
    await t.page.click('#dir a');
    await t.page.waitForTimeout(200);
    expect(await t.page.evaluate(() => window.__k5selLinkPrevented), 'the early link must cancel native navigation').toBe(true);
    expect(popups.length).toBe(0);
    expect(context.pages()).toEqual([t.page]);
    expect(t.page.url()).toBe(before);
    expect(t.requested).toContain('SelHub');
    expect(await t.log()).toEqual([]);
    await t.release('SelHub');
    expect(await t.waitLog(l => l.includes('sel-open:crew-protocols:Crew Protocols'))).toBe(true);
    // Once the module is here, its own handler takes the click and the host stays out of the way.
    await t.page.click('#dir a');
    expect(await t.waitLog(l => l.includes('selhub-handled'))).toBe(true);
    expect((await t.log()).filter(x => x.startsWith('sel-open:')).length).toBe(2);
    expect(popups.length).toBe(0);
    expect(context.pages()).toEqual([t.page]);
    expect(t.errors).toEqual([]);
    await t.page.close();
  }, 60000);
});
