import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { readEmbeddedManifest } = require('../dev-tools/build_browser_delivery_manifest.cjs');

const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const policy = fs.readFileSync('browser_delivery_policy.js', 'utf8');
const integrity = 'sha384-' + createHash('sha384').update('reviewed script').digest('base64');
const commit = 'c'.repeat(40);

function harness(file, { desktop = false, fallback = true } = {}) {
  const source = fs.readFileSync(file, 'utf8');
  const appended = [], listeners = new Set(), timers = new Map();
  let upgrades = 0;
  let nextTimer = 0;
  const window = { AlloModules: {}, addEventListener: (_, f) => listeners.add(f), removeEventListener: (_, f) => listeners.delete(f) };
  const registry = Object.create(null);
  const context = vm.createContext({
    URL, Promise, window, console: { log() {}, warn() {}, error() {} }, Date,
    document: { hidden: false, getElementById: () => null, querySelector: () => null, createElement: () => ({ dataset: {}, setAttribute() {}, remove() {} }), head: { appendChild: s => appended.push(s) } },
    setTimeout: f => { timers.set(++nextTimer, f); return nextTimer; }, clearTimeout: id => timers.delete(id),
    __alloModuleRegistry: registry,
    __alloSetModuleStatus: (name, status) => { (registry[name] ||= {}).status = status; },
    __alloModuleRegistered: name => Boolean(window.AlloModules[name]),
    _alloModuleWatchdogShouldWait: () => false,
    pluginCdnVersion: 'release', pluginCdnBase: desktop ? './' : 'https://alloflow-cdn.pages.dev/',
    localizeModuleUrl: url => desktop ? url.replace('https://alloflow-cdn.pages.dev/', './') : url,
    manifest: { schemaVersion: 1, releaseId: 'a'.repeat(64), fallbackCommit: fallback ? commit : null, allowDesktopRemoteFallback: false,
      assets: Object.fromEntries(['test_module.js', 'stem_lab/stem_tool_test.js', 'ai_backend_module.js', 'piper_tts_loader.js', 'kokoro_tts_loader.js', 'sd_turbo_loader.js', 'sre_loader.js'].map(name => [name, { integrity, bytes: 15 }])) },
    options: { baseUrl: desktop ? 'http://127.0.0.1:3333/app/index.html' : 'https://classroom.example/', usesLocalModuleAssets: desktop, isDesktopBundledApp: desktop },
    states: {}, publicState: s => ({ status: s.status, error: s.error, attempt: s.attempt }),
    syncLoadingFlag() {}, fireProgress() {}, removePriorScript() {}, pluginContentPins: {}, label: 'Test', loadTimeoutMs: 20000,
    _upgradeAIBackend: () => { upgrades++; },
  });
  vm.runInContext(policy + '\nconst __alloBrowserDelivery = _alloCreateBrowserDeliveryPolicy(manifest, options);\nvar moduleFallbackUrl = url => __alloBrowserDelivery.fallbackUrl(url);', context);
  const start = source.indexOf('    const __alloLoadModuleNow = (name, url) => {');
  const end = source.indexOf('    const loadModule = (name, url) => {', start);
  if (start < 0 || end < start) throw new Error('Missing actual core loader');
  vm.runInContext(source.slice(start, end) + '\nthis.load = __alloLoadModuleNow;', context);
  const pluginStart = source.indexOf('        function loadOne(mod, force) {');
  const pluginEnd = source.indexOf("        if (label === 'Stem') {", pluginStart);
  vm.runInContext(source.slice(pluginStart, pluginEnd) + '\nthis.loadPlugin = loadOne;', context);
  const aiStart = source.lastIndexOf('    (function() {', source.indexOf('// The hosted/desktop shell loads this bridge'));
  const aiEnd = source.indexOf("    loadModule('AlloData',", aiStart);
  if (aiStart < 0 || aiEnd < aiStart) throw new Error('Missing actual AI loader');
  const runAi = () => vm.runInContext(source.slice(aiStart, aiEnd), context);
  const optionalStart = source.indexOf('      window.__loadPiperTTS = async () => {');
  const optionalEnd = source.indexOf('      // Kokoro is intentionally opt-in', optionalStart);
  vm.runInContext(source.slice(optionalStart, optionalEnd), context);
  const ttsStart = source.indexOf('        const loadTTSScript = (url) =>');
  const ttsEnd = source.indexOf('        await loadTTSScript(', ttsStart);
  vm.runInContext(source.slice(ttsStart, ttsEnd) + '\nthis.loadTTSScript = loadTTSScript;', context);
  const optional = kind => kind === 'piper' ? window.__loadPiperTTS() : kind === 'kokoro'
    ? context.loadTTSScript(context.pluginCdnBase + 'kokoro_tts_loader.js?v=fixture')
    : kind === 'sd' ? window.__loadSdTurbo() : window.__alloLoadPlugin('sre_loader.js');
  return { context, appended, registry, window, timers, listeners, source, runAi, optional, upgrades: () => upgrades };
}

for (const file of hosts) describe(`trusted delivery in ${file}`, () => {
  it('approves every actual literal module URL in the trusted host', () => {
    const source = fs.readFileSync(file, 'utf8');
    const manifest = readEmbeddedManifest(source);
    const context = vm.createContext({ URL });
    vm.runInContext(policy, context);
    const delivery = context._alloCreateBrowserDeliveryPolicy(manifest, { baseUrl: 'https://alloflow-cdn.pages.dev/app/' });
    const calls = [...source.matchAll(/loadModule\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/g)];
    expect(calls.length).toBeGreaterThan(200);
    for (const [, name, url] of calls) {
      expect(() => delivery.configureScript({}, url), `${name}: ${url}`).not.toThrow();
    }
  });

  it('sets native SRI before the core script is appended', () => {
    const h = harness(file);
    h.context.load('Test', 'https://alloflow-cdn.pages.dev/test_module.js');
    expect(h.appended).toHaveLength(1);
    expect(h.appended[0]).toMatchObject({ integrity, crossOrigin: 'anonymous', referrerPolicy: 'no-referrer' });
    h.window.AlloModules.Test = {};
    h.appended[0].onload();
    expect(h.registry.Test.status).toBe('loaded');
    expect(h.timers.size).toBe(0);
    expect(h.listeners.size).toBe(0);
  });

  it('uses the same approved hash for an immutable fallback', () => {
    const h = harness(file);
    h.context.load('Test', 'https://alloflow-cdn.pages.dev/test_module.js');
    h.appended[0].onerror({});
    expect(h.appended).toHaveLength(2);
    expect(h.appended[1].src).toBe(`https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@${commit}/test_module.js`);
    expect(h.appended[1].integrity).toBe(integrity);
    h.appended[1].onerror();
    expect(h.registry.Test.status).toBe('failed');
    expect(h.timers.size).toBe(0);
    expect(h.listeners.size).toBe(0);
  });

  it('settles a failed request without an unapproved fallback', () => {
    const h = harness(file, { fallback: false });
    h.context.load('Test', 'https://alloflow-cdn.pages.dev/test_module.js');
    h.appended[0].onerror({});
    expect(h.appended).toHaveLength(1);
    expect(h.registry.Test.status).toBe('failed');
    expect(h.timers.size).toBe(0);
  });

  it('refuses unreviewed modules and mutable remote refs before any request', () => {
    const h = harness(file);
    h.context.load('Unknown', 'https://alloflow-cdn.pages.dev/unknown_module.js');
    h.context.load('Mutable', 'https://raw.githubusercontent.com/Apomera/AlloFlow/main/test_module.js');
    expect(h.appended).toHaveLength(0);
    expect(h.registry.Unknown.status).toBe('failed');
    expect(h.registry.Mutable.status).toBe('failed');
    expect(h.timers.size).toBe(0);
  });

  it('keeps Desktop requests local even after a download fails', () => {
    const h = harness(file, { desktop: true });
    h.context.load('Test', 'https://alloflow-cdn.pages.dev/test_module.js');
    expect(h.appended[0].src).toContain('http://127.0.0.1:3333/app/test_module.js');
    h.appended[0].onerror({});
    expect(h.appended).toHaveLength(1);
    expect(h.registry.Test.status).toBe('failed');
  });

  it('protects plugin retries and retains their completion state', async () => {
    const h = harness(file);
    const first = h.context.loadPlugin('stem_lab/stem_tool_test.js', false);
    expect(h.appended[0].integrity).toBe(integrity);
    h.appended[0].onerror();
    expect((await first).status).toBe('error');
    const retry = h.context.loadPlugin('stem_lab/stem_tool_test.js', true);
    expect(h.appended[1].integrity).toBe(integrity);
    expect(h.appended[1].src).toContain('&retry=');
    h.appended[1].onload();
    expect((await retry).status).toBe('loaded');
  });

  it('settles an unapproved plugin without appending a script', async () => {
    const h = harness(file);
    expect((await h.context.loadPlugin('unknown_module.js', false)).status).toBe('error');
    expect(h.appended).toHaveLength(0);
    expect(h.timers.size).toBe(0);
  });

  it('applies the same integrity policy to both AI bridge requests', () => {
    const h = harness(file);
    h.runAi();
    expect(h.appended[0].integrity).toBe(integrity);
    h.appended[0].onerror();
    expect(h.appended[1].src).toBe(`https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@${commit}/ai_backend_module.js`);
    expect(h.appended[1].integrity).toBe(integrity);
    h.appended[1].onload();
    expect(h.upgrades()).toBe(1);
  });

  it('does not let the AI bridge escape Desktop after a local failure', () => {
    const h = harness(file, { desktop: true });
    h.runAi();
    expect(h.appended[0].src).toContain('http://127.0.0.1:3333/app/ai_backend_module.js');
    h.appended[0].onerror();
    expect(h.appended).toHaveLength(1);
  });

  it.each(['piper', 'kokoro', 'sd', 'plugin'])('protects the opt-in %s loader before append', async kind => {
    const h = harness(file);
    const result = h.optional(kind);
    expect(h.appended).toHaveLength(1);
    expect(h.appended[0]).toMatchObject({ integrity, crossOrigin: 'anonymous', referrerPolicy: 'no-referrer' });
    h.appended[0].onerror({});
    expect(await result).toBe(false);
  });

  it('refuses an unknown or traversing generic plugin without a request', async () => {
    const h = harness(file);
    expect(await h.window.__alloLoadPlugin('unknown_loader.js')).toBe(false);
    expect(await h.window.__alloLoadPlugin('../sre_loader.js')).toBe(false);
    expect(h.appended).toHaveLength(0);
  });

  it('keeps opt-in loaders on Desktop local after failures', async () => {
    for (const kind of ['piper', 'kokoro', 'sd', 'plugin']) {
      const h = harness(file, { desktop: true });
      const result = h.optional(kind);
      expect(h.appended[0].src).toContain('http://127.0.0.1:3333/app/');
      h.appended[0].onerror({});
      expect(await result).toBe(false);
      expect(h.appended).toHaveLength(1);
    }
  });
});
