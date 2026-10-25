import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const read = file => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const primarySource = read('browser_delivery_policy.js');
const optionalSource = read('optional_browser_delivery_policy.js');
const body = 'window.__privateFixture = true;\n';
const integrity = 'sha384-' + createHash('sha384').update(body).digest('base64');
const assetNames = [
  'allo_device_storage_module.js', 'concept_quest_teacher_module.js', 'allo_sheet/host_bridge.js',
  'stem_lab/avian_feather_art.js', 'stem_lab/avian_woodland_birds.js', 'stem_lab/birdlab_3d_bird.js',
  'stem_lab/birdlab_3d_habitat.js', 'stem_lab/birdlab_3d_wildlife.js', 'stem_lab/birdlab_3d_mammals.js',
  'stem_lab/birdlab_3d_engine.js', 'stem_lab/reef_3d_habitat.js', 'stem_lab/reef_3d_engine.js',
  'stem_lab/reef_3d_species.js', 'stem_lab/reef_3d_explore.js', 'stem_lab/universe_flight_scene.js',
  'stem_lab/blockly_runtime.bundle.js', 'concept_graph_engine_module.js', 'concept_graph_3d_module.js', 'prim3d_module.js',
];
const fxPaths = ['shaders/CopyShader.js', 'shaders/LuminosityHighPassShader.js', 'postprocessing/EffectComposer.js',
  'postprocessing/RenderPass.js', 'postprocessing/ShaderPass.js', 'postprocessing/UnrealBloomPass.js'];

function range(source, begin, end) {
  const start = source.indexOf(begin), finish = source.indexOf(end, start);
  if (start < 0 || finish < start) throw new Error('Actual private loader source anchors moved: ' + begin);
  return source.slice(start, finish);
}

function block(source, marker, from = 0) {
  const start = source.indexOf(marker, from), open = source.indexOf('{', start);
  if (start < 0 || open < start) throw new Error('Actual private loader block moved: ' + marker);
  let depth = 0, quote = null, comment = null;
  for (let index = open; index < source.length; index++) {
    const char = source[index], next = source[index + 1];
    if (comment === 'line') { if (char === '\n') comment = null; continue; }
    if (comment === 'block') { if (char === '*' && next === '/') { comment = null; index++; } continue; }
    if (quote) { if (char === '\\') index++; else if (char === quote) quote = null; continue; }
    if (char === '/' && next === '/') { comment = 'line'; index++; continue; }
    if (char === '/' && next === '*') { comment = 'block'; index++; continue; }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === '{') depth++;
    else if (char === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error('Unclosed actual private loader block: ' + marker);
}

const specs = [
  { name: 'Commands device storage', file: 'allo_commands_source.jsx', kind: 'promise', code: source =>
    source.match(/var DEVICE_STORAGE_URL = [^\n]+/)[0] + '\n' + block(source, 'function _deviceStorage()') + '\nthis.load=_deviceStorage;' },
  { name: 'Utils storage bridge', file: 'utils_pure_source.jsx', kind: 'promise', code: source =>
    block(source, 'const _dsBridge = () =>') + ';this.load=_dsBridge;' },
  { name: 'Persona storage bridge', file: 'view_persona_chat_source.jsx', kind: 'promise', code: source =>
    block(source, 'var _ensureDeviceStorage = function') + ';this.load=_ensureDeviceStorage;' },
  { name: 'Device storage probe', file: 'text_utility_helpers_source.jsx', kind: 'probe', code: source =>
    block(source, 'const openDeviceStorageProbe = () =>') + ';this.load=openDeviceStorageProbe;' },
  { name: 'Teacher Concept Quest bootstrap', file: 'teacher_source.jsx', kind: 'teacher', code: source => {
    const component = source.indexOf('const ConceptQuestTeacherControlsLoader');
    const effect = source.indexOf('useEffect(() => {', component);
    return 'this.load=' + block(source, '() => {', effect) + ';';
  } },
  { name: 'Educator AlloSheet bridge', file: 'view_educator_hub_modal_source.jsx', kind: 'promise', code: source =>
    range(source, 'let _educatorAlloSheetBridgePromise', 'function _educatorAlloSheetTheme') + '\nthis.load=_loadEducatorAlloSheetBridge;' },
  { name: 'BirdLab private companion chain', file: 'stem_lab/stem_tool_birdlab.js', kind: 'promise', code: source =>
    "var BIRDLAB_MODULE_BASE='https://alloflow-cdn.pages.dev/stem_lab/';\n" + range(source, 'var birdlab3DLoadPromise', '\n  (function() {') + '\nthis.load=loadBirdlab3D;' },
  { name: 'Coral Reef private companions', file: 'stem_lab/stem_tool_coralreef.js', kind: 'promise', code: source =>
    "var MODULE_SRC='https://alloflow-cdn.pages.dev/stem_lab/stem_tool_coralreef.js?v=reviewed';\n" + block(source, 'function companionUrl(') + '\n'
    + block(source, 'function loadCompanion(') + "\nthis.load=()=>loadCompanion('reef_3d_habitat.js');this.raw=loadCompanion;" },
  ...['FeatherArt', 'WoodlandBirds'].map(part => ({ name: 'Raptor private ' + part, file: 'stem_lab/stem_tool_raptorhunt.js', kind: 'promise', code: source =>
    "var RAPTOR_MODULE_BASE='https://alloflow-cdn.pages.dev/stem_lab/';\n" + range(source, 'var raptorFeatherArtPromise', '// ─── Three.js loader') + '\nthis.load=ensureRaptor' + part + ';' })),
  { name: 'Raptor private FX chain', file: 'stem_lab/stem_tool_raptorhunt.js', kind: 'callback', code: source =>
    block(source, 'var ensure = function (cb)', source.indexOf('(function setupBloom()')) + ';this.raw=ensure;' },
  { name: 'Universe private scene', file: 'stem_lab/stem_tool_universe.js', kind: 'promise', code: source =>
    range(source, 'var universeFlightScript', 'function UniverseFlightLightClock') + '\nthis.load=loadUniverseFlight;' },
  { name: 'Coding private Blockly runtime', file: 'stem_lab/stem_tool_coding.js', kind: 'promise', code: source =>
    "var _codingBlocklyPromise=null;var _codingToolScriptUrl='https://alloflow-cdn.pages.dev/stem_lab/stem_tool_coding.js';\n" + block(source, 'function loadCodingBlocklyRuntime()') + '\nthis.load=loadCodingBlocklyRuntime;' },
  { name: 'FreeForms private module chain', file: 'stem_lab/stem_tool_freeforms.js', kind: 'callback', code: source =>
    block(source, 'function _cdnBase()') + '\n' + block(source, 'function _loadScript(') + ';this.raw=_loadScript;' },
];

function harness(spec, { dispatcher = true, approvedAssets = true, href = 'https://alloflow-cdn.pages.dev/' } = {}) {
  const scripts = [], timers = new Map(), warnings = [], states = [], configured = [];
  let nextTimer = 0, probeOpens = 0, callbacks = 0;
  const window = { location: new URL(href), AlloModules: {}, THREE: {},
    setTimeout(callback) { const id = ++nextTimer; timers.set(id, callback); return id; }, clearTimeout(id) { timers.delete(id); } };
  window.StemLab = { ensureThree: () => Promise.resolve(window.THREE), ensureSimulationAssets: () => Promise.resolve({}) };
  const anchor = { src: new URL(spec.file.replace('_source.jsx', '_module.js'), 'https://alloflow-cdn.pages.dev/').href,
    getAttribute(name) { return name === 'src' ? this.src : null; } };
  const document = { baseURI: href, currentScript: anchor,
    querySelectorAll: () => [anchor, ...scripts],
    querySelector: selector => selector.includes('data-allo-concept-quest-teacher')
      ? scripts.find(script => script.dataset.alloConceptQuestTeacher) || null : anchor,
    getElementById: id => scripts.find(script => script.id === id && script.parentNode) || null,
    createElement() {
      const attributes = {}, listeners = new Map();
      const script = { dataset: {},
        setAttribute(name, value) { attributes[name] = String(value); }, getAttribute(name) { return name === 'src' ? this.src : attributes[name]; },
        addEventListener(name, callback) { listeners.set(name, callback); },
        emit(name) { this['on' + name]?.(); listeners.get(name)?.(); },
        remove() { if (this.parentNode) this.parentNode.removeChild(this); } };
      Object.defineProperty(script, 'src', { get() { return this.url; }, set(value) { this.url = value; this.atSrc = { integrity: this.integrity, crossOrigin: this.crossOrigin }; } });
      return script;
    },
    head: { appendChild(script) { script.parentNode = this; scripts.push(script); }, removeChild(script) { script.parentNode = null; } },
  };
  const manifest = { schemaVersion: 1, releaseId: 'a'.repeat(64), fallbackCommit: null, allowDesktopRemoteFallback: false,
    assets: Object.fromEntries((approvedAssets ? assetNames : ['unrelated_module.js']).map(name => [name, { integrity, bytes: Buffer.byteLength(body) }])) };
  const optional = { schemaVersion: 1, libraries: Object.fromEntries(fxPaths.map((path, index) => ['three-fx-' + index,
    { asset: null, integrity: null, bytes: null, mirrors: [{ url: 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/' + path, integrity, bytes: Buffer.byteLength(body) }] }])) };
  const context = vm.createContext({ window, document, URL, console: { warn: (...args) => warnings.push(args), log() {}, error() {} },
    setTimeout: window.setTimeout, clearTimeout: window.clearTimeout, setReady: value => states.push(value) });
  vm.runInContext(primarySource + '\n' + optionalSource + '\nconst _alloBrowserDeliveryManifest=' + JSON.stringify(manifest)
    + ';\nconst _alloOptionalBrowserDeliveryManifest=' + JSON.stringify(optional) + ';\nthis.configure=_alloConfigureTrustedBrowserScript;\n' + spec.code(read(spec.file)), context);
  const installDispatcher = () => { window.__alloConfigureTrustedScript = (script, url, key) => { configured.push(url); return context.configure(script, url, key); }; };
  if (dispatcher) installDispatcher();
  const load = () => spec.kind === 'callback'
    ? new Promise(resolve => spec.name.startsWith('FreeForms')
      ? context.raw('concept_graph_engine_module.js', () => !!window.AlloModules.ConceptGraphEngine, value => { callbacks++; resolve(value); })
      : context.raw(() => { callbacks++; resolve(true); })) : context.load();
  const register = script => {
    const name = new URL(script.src, href).pathname.split('/').pop();
    const noop = () => {};
    if (name === 'allo_device_storage_module.js') window.alloDeviceStorage = { ready: async () => true, __openProbePanel() { probeOpens++; } };
    if (name === 'host_bridge.js') window.AlloSheetHostBridge = { open: noop };
    if (name === 'concept_quest_teacher_module.js') window.AlloModules.ConceptQuestTeacherControls = noop;
    if (name === 'avian_feather_art.js') window.AvianFeatherArt = { createFlightFeatherCanvas: noop, createVaneDetailCanvases: noop, applyVaneGrain: noop, vaneGrainCacheKey: noop };
    if (name === 'avian_woodland_birds.js') window.AvianWoodlandBirds = { version: '1.0.0', create: noop, supports: () => true };
    if (name === 'birdlab_3d_mammals.js') window.BirdLab3DMammals = { create: noop };
    if (name === 'birdlab_3d_wildlife.js') window.BirdLab3DWildlife = {};
    if (name === 'birdlab_3d_engine.js') window.BirdLab3D = { mount: noop };
    if (name === 'universe_flight_scene.js') window.UniverseFlight = {};
    if (name === 'blockly_runtime.bundle.js') window.AlloBlocklyRuntime = {};
    if (name === 'concept_graph_engine_module.js') window.AlloModules.ConceptGraphEngine = {};
  };
  return { ...context, window, scripts, timers, warnings, states, configured, load, register, installDispatcher, scope: context,
    get probeOpens() { return probeOpens; }, get callbacks() { return callbacks; } };
}

async function flush() { for (let index = 0; index < 16; index++) await Promise.resolve(); }

async function complete(f, result) {
  let processed = 0;
  for (let attempt = 0; attempt < 16; attempt++) {
    while (processed < f.scripts.length) {
      const script = f.scripts[processed++];
      expect(script.atSrc).toEqual({ integrity, crossOrigin: 'anonymous' });
      f.register(script); script.emit('load');
    }
    await flush();
  }
  if (result?.then) await result;
}

describe.each(specs)('private trusted delivery: $name', spec => {
  it('configures every requested script before src/append and preserves normal completion', async () => {
    const f = harness(spec);
    const result = f.load();
    result?.catch?.(() => {});
    await flush();
    expect(f.scripts.length).toBeGreaterThan(0);
    await complete(f, result);
    if (spec.kind === 'teacher') expect(f.states).toContain(true);
    if (spec.kind === 'probe') expect(f.probeOpens).toBe(1);
    if (spec.kind === 'callback') expect(f.callbacks).toBe(1);
    expect(f.configured).toHaveLength(f.scripts.length);
  });

  it('fails through its controlled state without a script or timer when the dispatcher is absent', async () => {
    const f = harness(spec, { dispatcher: false });
    let result;
    expect(() => { result = f.load(); result?.catch?.(() => {}); }).not.toThrow();
    await flush();
    expect(f.scripts).toHaveLength(0);
    expect(f.timers.size).toBe(0);
    if (spec.kind === 'promise') await expect(result).rejects.toThrow(/trusted|delivery/i);
    if (spec.kind === 'teacher') expect(f.states).not.toContain(true);
    if (spec.kind === 'probe') expect(f.probeOpens).toBe(0);
    if (spec.kind === 'callback') expect(f.callbacks).toBe(1);
  });

  it('keeps Desktop companions local on IPv4/IPv6 and degrades remote-only FX', async () => {
    for (const href of ['http://127.0.0.1:8123/app/', 'http://[::1]:8123/app/']) {
      const f = harness(spec, { href });
      const result = f.load(); result?.catch?.(() => {});
      await flush();
      await complete(f, result);
      if (spec.name === 'Raptor private FX chain') expect(f.scripts).toHaveLength(0);
      else expect(f.scripts.length).toBeGreaterThan(0);
      expect(f.scripts.every(script => new URL(script.src).origin === new URL(href).origin)).toBe(true);
    }
  });
});

it('rejects an unreviewed private companion name before append', async () => {
  const f = harness(specs.find(spec => spec.name.startsWith('Coral')));
  await expect(f.raw('unreviewed_companion.js')).rejects.toThrow(/reviewed manifest/);
  expect(f.scripts).toHaveLength(0);
  expect(f.timers.size).toBe(0);
});

it('keeps both teacher primary and legacy local fallback signed, and never assigns a denied fallback', () => {
  const spec = specs.find(item => item.kind === 'teacher');
  const good = harness(spec); good.load();
  good.scripts[0].emit('error');
  expect(good.scripts).toHaveLength(1);
  expect(good.configured).toEqual(['https://alloflow-cdn.pages.dev/concept_quest_teacher_module.js', './concept_quest_teacher_module.js']);
  expect(good.scripts[0].atSrc.integrity).toBe(integrity);
  good.scripts[0].emit('load'); expect(good.states).toContain(true);
  const denied = harness(spec), original = denied.window.__alloConfigureTrustedScript;
  denied.window.__alloConfigureTrustedScript = (script, url) => {
    if (url.startsWith('./')) throw new Error('Fallback not reviewed');
    return original(script, url);
  };
  denied.load(); const primary = denied.scripts[0].src;
  denied.scripts[0].emit('error');
  expect(denied.scripts[0].src).toBe(primary);
  expect(denied.states).not.toContain(true);
});

it('does not turn a Coding URL-resolution fallback into an unsigned request', async () => {
  const f = harness(specs.find(spec => spec.name.startsWith('Coding')), { approvedAssets: false });
  f.scope._codingToolScriptUrl = 'not a base URL';
  await expect(f.load()).rejects.toThrow(/reviewed manifest/);
  expect(f.scripts).toHaveLength(0);
});

it.each(['Universe private scene', 'Coding private Blockly runtime'])('%s retries after a controlled synchronous policy rejection', async name => {
  const f = harness(specs.find(spec => spec.name === name), { dispatcher: false });
  await expect(f.load()).rejects.toThrow(/Trusted script delivery/);
  f.installDispatcher();
  const retry = f.load(); await flush();
  expect(f.scripts).toHaveLength(1);
  await complete(f, retry);
});

it('reuses already-present Utils device storage without executing the guarded bootstrap branch', async () => {
  const f = harness(specs.find(spec => spec.name === 'Utils storage bridge'), { dispatcher: false });
  let readyCalls = 0;
  const storage = { ready() { readyCalls++; return Promise.resolve(); } };
  f.window.alloDeviceStorage = storage;
  await expect(f.load()).resolves.toBe(storage);
  expect(readyCalls).toBe(1);
  expect(f.scripts).toHaveLength(0);
  expect(f.timers.size).toBe(0);
});

const coverage = createRequire(import.meta.url)('../dev-tools/check_private_loader_coverage.cjs');
const coverageRoots = [];
afterEach(() => {
  while (coverageRoots.length) {
    const root = path.resolve(coverageRoots.pop());
    if (!root.startsWith(path.resolve(os.tmpdir()) + path.sep) || !path.basename(root).startsWith('alloflow-private-coverage-')) throw new Error('Unexpected coverage fixture root');
    fs.rmSync(root, { recursive: true, force: true });
  }
});
function coverageFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-private-coverage-')); coverageRoots.push(root);
  const buildDir = path.join(root, 'built');
  const write = (file, source) => { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), source); };
  const guard = (name, count) => `function ${name}(){if(typeof window.__alloConfigureTrustedScript!=="function")throw Error("unavailable");${'window.__alloConfigureTrustedScript(script,"https://reviewed.example/asset.js");'.repeat(count)}}\n`;
  const whisper = 'function _getWhisperPipeline(){return window.__alloLoadVerifiedRuntime("transformers331");}\n';
  for (const item of coverage.COMPILED) {
    const document = item.document ? 'function documentRuntime(){window.__alloGetVerifiedRuntimeAsset("pdfjs");window.__alloGetVerifiedRuntimeAsset("tesseract");window.__alloCreateVerifiedWorker("raster");window.__alloFetchTrustedScriptText("axe");const opts={workerPath:"blob:fixture"};'
      + '_configureTrustedDocumentScript(script,url);'.repeat(8) + 'pdfjsLib.getDocument({isEvalSupported:false});'.repeat(10) + '}\n' : '';
    const code = item.loaders.map(([name, count]) => guard(name, count)).join('') + (item.whisper ? whisper : '') + document;
    write(item.source, code); write(item.compiled, code); write('desktop/web-app/public/' + item.compiled, code); write('built/' + item.compiled, code);
  }
  for (const item of coverage.STEM) {
    const code = item.loaders.map(([name, count]) => guard(name, count)).join('');
    write(item.source, code); write('desktop/web-app/public/' + item.source, code); write('built/' + item.source, code);
  }
  for (const item of coverage.RUNTIME) {
    const code = 'function runtime(){' + item.markers.map(marker => 'window.' + marker + '(' + JSON.stringify(item.graphs[0]) + ');').join('')
      + item.graphs.map(name => JSON.stringify(name) + ';').join('') + '}';
    write(item.source, code); write('desktop/web-app/public/' + item.source, code); write('built/' + item.source, code);
  }
  return { root, buildDir, write, read: file => fs.readFileSync(path.join(root, file), 'utf8'), check: () => coverage.checkPrivateLoaderCoverage({ root, buildDir }) };
}

describe('read-only private loader publication gate', () => {
  it('accepts hardened callable markers and exact source/compiled/public/built fixtures', () => {
    const f = coverageFixture(); expect(f.check().ok).toBe(true);
    expect(coverage.assertPrivateLoaderCoverage({ root: f.root, buildDir: f.buildDir }).errors).toEqual([]);
  });
  it('blocks uncompiled canonical hardening even when source is guarded', () => {
    const f = coverageFixture(), file = 'utils_pure_module.js';
    f.write(file, 'function _dsBridge(){script.src="legacy.js";}');
    const report = f.check(); expect(report.ok).toBe(false);
    expect(report.errors.some(error => error.startsWith(file + ':') && error.includes('lacks guarded delivery'))).toBe(true);
    expect(report.errors.some(error => error.startsWith('utils_pure_source.jsx:'))).toBe(false);
    expect(() => coverage.assertPrivateLoaderCoverage({ root: f.root, buildDir: f.buildDir })).toThrow(/publication is blocked/);
  });
  it('blocks a stale generated public mirror', () => {
    const f = coverageFixture(); f.write('desktop/web-app/public/utils_pure_module.js', f.read('utils_pure_module.js') + '// stale');
    expect(f.check().errors.some(error => error.includes('desktop/web-app/public/utils_pure_module.js: bytes differ'))).toBe(true);
  });
  it('keeps raw STEM parity scoped to the six reviewed canonical modules', () => {
    const f = coverageFixture(); f.write('stem_lab/unrelated.js', 'new work'); f.write('desktop/web-app/public/stem_lab/unrelated.js', 'old work');
    expect(f.check().ok).toBe(true);
    f.write('desktop/web-app/public/stem_lab/stem_tool_birdlab.js', 'old reviewed loader');
    expect(f.check().errors.some(error => error.includes('public/stem_lab/stem_tool_birdlab.js: bytes differ'))).toBe(true);
  });
  it('does not accept a dispatcher marker alongside an unsigned teacher fallback', () => {
    const f = coverageFixture(), file = 'teacher_module.js';
    const unsafe = f.read(file).replace('function ConceptQuestTeacherControlsLoader(){', 'function ConceptQuestTeacherControlsLoader(){script.src="unsigned-fallback.js";');
    f.write(file, unsafe); f.write('desktop/web-app/public/' + file, unsafe); f.write('built/' + file, unsafe);
    expect(f.check().errors.some(error => error.startsWith(file + ':') && error.includes('rawSrcWrites=1'))).toBe(true);
  });
  it('does not accept unguarded raw modules merely because their public copies match', () => {
    const f = coverageFixture(), file = 'stem_lab/stem_tool_universe.js', old = 'function loadUniverseFlight(){script.src="old.js";}';
    f.write(file, old); f.write('desktop/web-app/public/' + file, old); f.write('built/' + file, old);
    expect(f.check().errors.some(error => error.startsWith(file + ':') && error.includes('lacks guarded delivery'))).toBe(true);
  });
  it('blocks signed-marker runtime loaders that retain a legacy executable import', () => {
    const f = coverageFixture(), file = 'piper_tts_loader.js', unsafe = f.read(file) + '\nimport("https://legacy.example/runtime.js");';
    f.write(file, unsafe); f.write('desktop/web-app/public/' + file, unsafe); f.write('built/' + file, unsafe);
    expect(f.check().errors.some(error => error.startsWith(file + ':') && error.includes('legacyImports=1'))).toBe(true);
  });
  it('checks the Whisper generated helper independently of Commands device-storage markers', () => {
    const f = coverageFixture(), file = 'allo_commands_module.js';
    const unsafe = f.read(file).replace('return window.__alloLoadVerifiedRuntime("transformers331");', 'return import("https://legacy.example/whisper.js");');
    f.write(file, unsafe); f.write('desktop/web-app/public/' + file, unsafe); f.write('built/' + file, unsafe);
    expect(f.check().errors.some(error => error.startsWith(file + ':') && error.includes('Whisper lacks verified graph delivery'))).toBe(true);
  });
  it('checks runtime loader root/public bytes as well as their hardened markers', () => {
    const f = coverageFixture(); f.write('desktop/web-app/public/kokoro_tts_loader.js', f.read('kokoro_tts_loader.js') + '// stale');
    expect(f.check().errors.some(error => error.includes('public/kokoro_tts_loader.js: bytes differ'))).toBe(true);
  });
  it('blocks an actual built copy that differs from the guarded root/public artifacts', () => {
    const f = coverageFixture(); f.write('built/stem_lab/stem_tool_coding.js', 'old runtime');
    expect(f.check().errors.some(error => error.includes('stem_tool_coding.js: bytes differ'))).toBe(true);
  });
  it('blocks a document build that loses the PDF evaluation ceiling on one path', () => {
    const f = coverageFixture(), file = 'doc_pipeline_module.js', unsafe = f.read(file).replace('isEvalSupported:false', 'isEvalSupported:true');
    f.write(file, unsafe); f.write('desktop/web-app/public/' + file, unsafe); f.write('built/' + file, unsafe);
    expect(f.check().errors.some(error => error.startsWith(file + ':') && error.includes('unsafePdf=1'))).toBe(true);
  });
  it('blocks a partially hardened document build despite retaining its helper marker', () => {
    const f = coverageFixture(), file = 'doc_pipeline_module.js';
    let unsafe = f.read(file); for (let index = 0; index < 4; index++) unsafe = unsafe.replace('_configureTrustedDocumentScript(script,url);', '');
    f.write(file, unsafe); f.write('desktop/web-app/public/' + file, unsafe); f.write('built/' + file, unsafe);
    expect(f.check().errors.some(error => error.startsWith(file + ':') && error.includes('signedCalls=4'))).toBe(true);
  });
});
