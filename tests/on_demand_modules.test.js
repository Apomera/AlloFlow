// On-demand modules (2026-11-17): rarely used teacher tools are parked at boot instead
// of being prefetched, and load when their panel's CDNModuleGate opens.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
const require = createRequire(import.meta.url);
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const source = readFileSync(process.env.ON_DEMAND_HOST || 'AlloFlowANTI.txt', 'utf8');
function section(from, to) {
  const start = source.indexOf(from), end = source.indexOf(to, start);
  if (start < 0 || end < 0) throw Error('Missing ' + from);
  return source.slice(start, end);
}

// The host's loader pieces, run against a stub that records real loads.
function makeHost({ search = '', stored = null } = {}) {
  const loaded = [];
  const listeners = [];
  const window = { AlloModules: {}, __alloModuleLoadDiagnostics: null, addEventListener: (type, fn) => listeners.push([type, fn]) };
  const location = { search };
  const localStorage = { getItem: () => stored };
  const code = section('    const __alloDeferredModuleNames = Object.create(null);', '    const __alloLoadModuleNow = (name, url) => {')
    + section('    const loadModule = (name, url) => {', '    window.__alloRetryModule = function(name) {')
    + section('    window.__alloPromoteModule = function(name) {', '    // A #sel-hub/<tool> link clicked');
  const run = Function('window', 'location', 'localStorage', 'loaded',
    'let __alloBootstrappingModules = true;\n'
    + 'const __alloBootCriticalModules = new Set(["HostHandlers"]);\n'
    + 'const __alloDeferredModuleQueue = [];\n'
    + 'const __alloModuleRegistry = Object.create(null);\n'
    + 'const __alloModuleRegistered = (name) => !!window.AlloModules[name];\n'
    + 'const __alloLoadModuleNow = (name, url) => { loaded.push([name, url]); __alloModuleRegistry[name] = { status: "pending" }; };\n'
    + code
    + '\nreturn { loadModule, queue: __alloDeferredModuleQueue, names: __alloDeferredModuleNames, parked: __alloParkedModules, endBoot: () => { __alloBootstrappingModules = false; } };');
  return { window, loaded, listeners, ...run(window, location, localStorage, loaded) };
}

describe('dependencies load with the module that reads them', () => {
  it('opening the document pipeline also loads its parked helpers, once each', () => {
    const host = makeHost();
    for (const name of ['BrandProfile', 'PdfValidator', 'DocBuilderRenderer', 'SemanticReview']) host.loadModule(name, name + '.js');
    host.endBoot();
    host.loadModule('DocPipelineModule', 'doc_pipeline.js');
    host.loadModule('ExportPreviewView', 'export_preview.js');
    expect(host.loaded.map(([name]) => name)).toEqual(['DocPipelineModule', 'BrandProfile', 'PdfValidator', 'DocBuilderRenderer', 'ExportPreviewView', 'SemanticReview']);
  });
  it('a dependent loaded by the background queue gets its helpers when it registers', () => {
    const host = makeHost();
    host.loadModule('OwnSources', 'own_sources.js');
    host.endBoot();
    host.window.AlloModules.ReportWriter = {};
    for (const [type, fn] of host.listeners) if (type === 'alloflow:module-registry-changed') fn();
    expect(host.loaded).toEqual([['OwnSources', 'own_sources.js']]);
  });
  it('every on-demand module has a way to be asked for: a gate, a dependency, a placeholder or a promote call', () => {
    const list = source.match(/const __alloOnDemandModules = new Set\(__alloPrefetchAll \? \[\] : \[([^\]]*)\]\)/)[1].match(/'([A-Za-z]+)'/g).map(s => s.slice(1, -1));
    const deps = section('    const __alloModuleDeps = new Map([', '    ]);');
    for (const name of list) {
      const asked = source.includes(`moduleKey="${name}"`) || source.includes(`moduleKey="${name}.`)
        || new RegExp(`\\[[^\\]]*'${name}'[^\\]]*\\]\\]`).test(deps)
        || source.includes(`_alloUseOnDemandModule('`) && new RegExp(`_alloUseOnDemandModule\\('[A-Za-z]+', '${name}'`).test(source)
        || source.includes(`window.__alloPromoteModule('${name}')`);
      expect(asked, name).toBe(true);
    }
  });
});

describe('host placeholders for on-demand modules', () => {
  const hookJs = transformSync(section('const _alloUseOnDemandModule = ', 'const WordSoundsGenerator = React.memo'), { configFile: false, babelrc: false }).code;
  const useOnDemand = Function('React', hookJs + '\nreturn _alloUseOnDemandModule;')(React);
  let root, host;
  afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; delete window.__alloPromoteModule; delete window.AlloModules.Lazy; });
  const Probe = ({ active }) => React.createElement('p', null, useOnDemand('Lazy', 'LazyModule', active) ? 'ready' : 'waiting');
  const mount = (active) => { host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host); act(() => root.render(React.createElement(Probe, { active }))); };

  it('does not ask for the module while the placeholder is hidden', () => {
    window.AlloModules = window.AlloModules || {};
    window.__alloPromoteModule = vi.fn();
    mount(false);
    expect(window.__alloPromoteModule).not.toHaveBeenCalled();
  });
  it('asks for it when shown, and redraws when it registers', () => {
    window.AlloModules = window.AlloModules || {};
    window.__alloPromoteModule = vi.fn();
    mount(true);
    expect(window.__alloPromoteModule).toHaveBeenCalledWith('LazyModule');
    expect(host.textContent).toBe('waiting');
    window.AlloModules.Lazy = {};
    act(() => window.dispatchEvent(new CustomEvent('alloflow:module-registry-changed')));
    expect(host.textContent).toBe('ready');
  });
});

describe('on-demand module loader', () => {
  it('parks a pilot module at boot: not loaded, not queued, not counted as pending', () => {
    const host = makeHost();
    host.loadModule('CinematicStudio', 'cinematic.js?v=1');
    host.loadModule('ViewQuizModule', 'view_quiz.js?v=1');
    expect(host.loaded).toEqual([]);
    expect(host.queue.map(q => q.name)).toEqual(['ViewQuizModule']);
    expect(Object.keys(host.names)).toEqual(['ViewQuizModule']);
    expect(Object.keys(host.parked)).toEqual(['CinematicStudio']);
  });
  it('opening the panel promotes by key and loads the stored URL exactly once', () => {
    const host = makeHost();
    host.loadModule('AccessibilityLab', 'a11y.js?v=2');
    host.endBoot();
    expect(host.window.__alloPromoteModuleForKey('AccessibilityLab')).toBe(true);
    expect(host.window.__alloPromoteModuleForKey('AccessibilityLab')).toBe(true);
    expect(host.loaded).toEqual([['AccessibilityLab', 'a11y.js?v=2']]);
  });
  it('a dotted key promotes its root module, and an unknown key does nothing', () => {
    const host = makeHost();
    host.loadModule('CommunityCatalog', 'catalog.js?v=3');
    host.endBoot();
    host.window.__alloPromoteModuleForKey('CommunityCatalog.Panel');
    expect(host.loaded).toEqual([['CommunityCatalog', 'catalog.js?v=3']]);
    expect(host.window.__alloPromoteModuleForKey('NoSuchModule')).toBe(false);
  });
  it('?prefetch=all and the localStorage switch restore prefetching', () => {
    for (const host of [makeHost({ search: '?prefetch=all' }), makeHost({ stored: '1' })]) {
      host.loadModule('AuditRemediator', 'audit.js?v=4');
      expect(host.queue.map(q => q.name)).toEqual(['AuditRemediator']);
      expect(Object.keys(host.parked)).toEqual([]);
    }
  });
  it('lists each on-demand module once, and each is loaded by the host', () => {
    const list = source.match(/const __alloOnDemandModules = new Set\(__alloPrefetchAll \? \[\] : \[([^\]]*)\]\)/)[1].match(/'([A-Za-z]+)'/g).map(s => s.slice(1, -1));
    expect(new Set(list).size).toBe(list.length);
    for (const name of list) expect(source).toContain(`loadModule('${name}', `);
  });
  it('an on-demand module is only read through its gate, never read directly by host code', () => {
    const list = ['CinematicStudio', 'AccessibilityLab', 'AuditRemediator', 'CommunityCatalog'];
    for (const name of list) expect(source.match(new RegExp('AlloModules\\??\\.' + name + '\\b', 'g')) || [], name).toEqual([]);
  });
});

describe('CDNModuleGate asks the host for its module', () => {
  const watchCode = section('// MODULE_GATE_WATCH_START', '// MODULE_GATE_WATCH_END');
  const gateJs = transformSync(watchCode + section('const CDNModuleGate =', '// Thin host adapters'), { configFile: false, babelrc: false, presets: [require.resolve(resolve('desktop/web-app/node_modules/@babel/preset-react'))] }).code;
  const Gate = Function('React', gateJs + '\nreturn CDNModuleGate;')(React);
  let roots;
  beforeEach(() => { roots = []; window.AlloModules = {}; });
  afterEach(() => { roots.forEach(r => act(() => r.unmount())); document.body.innerHTML = ''; delete window.__alloPromoteModuleForKey; vi.useRealTimers(); });
  const render = (element) => { const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host); roots.push(root); act(() => root.render(element)); return host; };

  it('promotes the module on open, shows loading, then renders it', () => {
    vi.useFakeTimers();
    const promote = vi.fn(() => true);
    window.__alloPromoteModuleForKey = promote;
    const host = render(React.createElement(Gate, { moduleKey: 'CinematicStudio', isOpen: true, size: 'inline', displayName: 'Cinematic Studio' }, View => React.createElement(View)));
    expect(promote).toHaveBeenCalledWith('CinematicStudio');
    expect(host.textContent).toContain('Cinematic Studio');
    window.AlloModules.CinematicStudio = () => React.createElement('p', null, 'studio ready');
    act(() => vi.advanceTimersByTime(200));
    expect(host.textContent).toBe('studio ready');
    const calls = promote.mock.calls.length;
    act(() => vi.advanceTimersByTime(1000));
    expect(promote.mock.calls.length).toBe(calls);
  });
  it('keeps asking on the poll until the host can load it (a gate can open before the host parks it)', () => {
    vi.useFakeTimers();
    const promote = vi.fn(() => false);
    window.__alloPromoteModuleForKey = promote;
    render(React.createElement(Gate, { moduleKey: 'AccessibilityLab', isOpen: true, size: 'inline' }, View => React.createElement(View)));
    act(() => vi.advanceTimersByTime(600));
    expect(promote.mock.calls.length).toBeGreaterThan(2);
  });
  it('a gate with its own loader does not use the host promote', () => {
    const promote = vi.fn();
    window.__alloPromoteModuleForKey = promote;
    window.__testLoader = vi.fn();
    render(React.createElement(Gate, { moduleKey: 'QuickStart', loaderName: '__testLoader', isOpen: true, size: 'inline' }, View => React.createElement(View)));
    expect(promote).not.toHaveBeenCalled();
    expect(window.__testLoader).toHaveBeenCalled();
    delete window.__testLoader;
  });
});
