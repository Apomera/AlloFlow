// "Use my own sources" controls that did nothing (2026-09-25).
//
// The wiring existed end to end and every source-pin test passed, yet the
// controls failed in use, all for load-timing reasons:
//   - Lumen's evidence/document LIBRARIES were held behind the StemLab host for
//     up to 25 s, while the panel counted documents after 2.5 s: count 0, so the
//     toggle and the manage list stayed hidden for the session.
//   - The panel counted once on open, so a late own_sources_module or Lumen
//     never showed the toggle until the panel was reopened.
//   - Exclude/Remove reported "unavailable" at once when Lumen was not loaded,
//     and the panel showed nothing for any reason but 'storage'.
//   - Remove asked through window.confirm, which returns false in Gemini Canvas.
//   - The Quick Start box was stored but never forwarded to generation.
//
// RAG_TEST_ANTI / RAG_TEST_OWN_SOURCES / RAG_TEST_PHASE_O / RAG_TEST_MISC_PANELS
// point at scratch copies for mutation testing; normal runs use the real files.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(__dirname, '..');
const React = require(path.resolve(ROOT, 'desktop/web-app/node_modules/react'));
const E = require('../stem_lab/stem_lumen_evidence.js');

// ─── The plugin loader, extracted from the host exactly as shipped ─────────

function loaderFactorySource() {
  const shell = fs.readFileSync(process.env.RAG_TEST_ANTI || 'AlloFlowANTI.txt', 'utf8').replace(/\r\n?/g, '\n');
  const start = shell.indexOf('function makeEnsureLoader(');
  const end = shell.indexOf('\n      }\n\n      window.__alloEnsureStemPluginsLoaded', start);
  if (start < 0 || end < 0) throw new Error('Could not extract the production plugin loader');
  return shell.slice(start, end + '\n      }'.length);
}

function loaderHarness(manifest) {
  const history = [];
  const active = [];
  const head = {
    appendChild(node) { node.parentNode = head; active.push(node); history.push(node); return node; },
    removeChild(node) { const i = active.indexOf(node); if (i !== -1) active.splice(i, 1); node.parentNode = null; return node; },
  };
  const doc = {
    head,
    createElement() {
      const attributes = {};
      return { parentNode: null, setAttribute(n, v) { attributes[n] = String(v); }, getAttribute(n) { return attributes[n] || null; } };
    },
    querySelectorAll() { return active.slice(); },
  };
  const win = { __alloDiagLog: [], dispatchEvent() {} };
  class FakeCustomEvent { constructor(type, options) { this.type = type; this.detail = options && options.detail; } }
  const makeEnsureLoader = new Function('window', 'document', 'CustomEvent', 'pluginCdnBase', 'pluginCdnVersion',
    loaderFactorySource() + '\nreturn makeEnsureLoader;')(win, doc, FakeCustomEvent, 'https://plugins.test/', 'timing-test');
  makeEnsureLoader('Stem', manifest, () => true)();
  return { win, history };
}
const modulePath = (script) => new URL(script.src).pathname.replace(/^\//, '');
async function flushJobs(count = 12) { for (let i = 0; i < count; i += 1) await Promise.resolve(); }

describe('Lumen libraries are not held behind the STEM Lab host', () => {
  it('appends the evidence and document libraries at once, while an ordinary STEM tool still waits', async () => {
    vi.useFakeTimers();
    try {
      const harness = loaderHarness([
        'stem_lab/stem_lumen_evidence.js',
        'stem_lab/stem_lumen_documents.js',
        'stem_lab/stem_tool_solarsystem.js',
      ]);
      harness.win.__alloModuleRegistry = {}; // boot pump present, StemLab host not loaded yet
      harness.win.__alloEnsureStemPluginLoaded('stem_lab/stem_lumen_evidence.js');
      harness.win.__alloEnsureStemPluginLoaded('stem_lab/stem_lumen_documents.js');
      harness.win.__alloEnsureStemPluginLoaded('stem_lab/stem_tool_solarsystem.js');
      await flushJobs();
      expect(harness.history.map(modulePath)).toEqual([
        'stem_lab/stem_lumen_evidence.js',
        'stem_lab/stem_lumen_documents.js',
      ]);
    } finally {
      vi.useRealTimers();
    }
  });
});

// ─── own_sources_module: Exclude/Remove wait for Lumen ─────────────────────

function makeDevice() {
  const cells = {};
  return { get: async (k) => cells[k] || null, set: async (k, v) => { cells[k] = v; return true; } };
}

function loadOwnSources({ storageDB, pluginLoader }) {
  const key = require.resolve(process.env.RAG_TEST_OWN_SOURCES || '../own_sources_module.js');
  delete require.cache[key];
  const previous = {
    LumenEvidence: global.LumenEvidence, LumenDocuments: global.LumenDocuments,
    AlloModules: global.AlloModules, ensure: global.__alloEnsureStemPluginLoaded,
  };
  global.LumenEvidence = undefined;
  global.LumenDocuments = undefined;
  global.AlloModules = { UtilsPure: { storageDB } };
  global.__alloEnsureStemPluginLoaded = pluginLoader;
  const api = require(key);
  return { api, restore: () => { Object.assign(global, { LumenEvidence: previous.LumenEvidence, LumenDocuments: previous.LumenDocuments, AlloModules: previous.AlloModules, __alloEnsureStemPluginLoaded: previous.ensure }); } };
}

describe('Exclude and Remove wait for the document engine', () => {
  it('excludes a document even when Lumen arrives after the click', async () => {
    const device = makeDevice();
    const store = E.createProjectStore({ storageDB: device, localStorage: null, scope: E.readingScope({}) });
    let project = E.makeProject({ title: 'My sources' });
    project = E.upsertSource(project, { id: 'src_rain', title: 'Rain notes', content: '# Rain\nClouds form when water vapor condenses on dust.', type: 'document', importMethod: 'local-file' });
    const saved = await store.save(project);
    expect(saved.ok).toBe(true);

    const { api, restore } = loadOwnSources({
      storageDB: device,
      // The host's plugin loader: the libraries register a moment later.
      pluginLoader: () => { setTimeout(() => { global.LumenEvidence = E; global.LumenDocuments = { extractLocalDocument() {} }; }, 150); return true; },
    });
    try {
      const outcome = await api.setSourceActive('src_rain', false, {});
      expect(outcome.reason).not.toBe('unavailable');
      expect(outcome.ok).toBe(true);
      expect(outcome.count).toBe(0);
    } finally {
      restore();
    }
  });
});

// ─── Quick Start forwards "use my own sources" ─────────────────────────────

describe('the Quick Start own-sources box reaches generation', () => {
  it('passes useOwnSources to handleGenerateSource', () => {
    loadAlloModule(process.env.RAG_TEST_PHASE_O || 'phase_o_misc_handlers_module.js');
    const handlers = window.AlloModules && window.AlloModules.PhaseOHandlers;
    expect(typeof handlers?.handleWizardComplete).toBe('function');
    const handleGenerateSource = vi.fn();
    const noop = () => {};
    const deps = new Proxy({ handleGenerateSource, t: (k) => k, addToast: noop, history: [] }, {
      get(target, prop) { return prop in target ? target[prop] : noop; },
    });
    vi.useFakeTimers();
    try {
      handlers.handleWizardComplete({
        grade: '5th Grade', sourceMode: 'generate', topic: 'How clouds form', length: '250',
        tone: 'Informative', verification: true, useOwnSources: true, standards: [],
      }, deps);
      vi.advanceTimersByTime(600);
    } finally {
      vi.useRealTimers();
    }
    expect(handleGenerateSource).toHaveBeenCalledWith(expect.objectContaining({ useOwnSources: true, topic: 'How clouds form' }));
  });
});

// ─── The source panel's controls ───────────────────────────────────────────

let SourceGenPanel;
beforeAll(() => {
  globalThis.React = React;
  window.React = React;
  loadAlloModule(process.env.RAG_TEST_MISC_PANELS || 'view_misc_panels_module.js');
  SourceGenPanel = window.AlloModules && window.AlloModules.SourceGenPanel;
});
afterEach(() => { delete window.AlloOwnSources; vi.restoreAllMocks(); });

const t = (key, vars) => (vars && vars.title ? `${key}:${vars.title}` : vars && 'count' in vars ? `${key}:${vars.count}` : key);
function panelProps(extra = {}) {
  const noop = () => {};
  return {
    addToast: noop, aiStandardQuery: '', aiStandardRegion: '', gradeLevel: '5th Grade',
    handleAddStandard: noop, handleFindStandards: noop, handleGenerateSource: noop, handleRemoveStandard: noop,
    handleSetStandardModeToAi: noop, handleSetStandardModeToManual: noop, includeSourceCitations: true,
    isFindingStandards: false, isGeneratingSource: false, isIndependentMode: false, setAiStandardQuery: noop,
    setAiStandardRegion: noop, setIncludeSourceCitations: noop, setSourceCustomInstructions: noop,
    setSourceLength: noop, setSourceLevel: noop, setSourceTone: noop, setSourceTopic: noop,
    setSourceVocabulary: noop, setStandardInputValue: noop, setTargetStandards: noop, showSourceGen: true,
    sourceCustomInstructions: '', sourceLength: '250', sourceLevel: '5th Grade', sourceTone: 'Informative',
    sourceTopic: 'How clouds form', sourceVocabulary: '', standardInputValue: '', standardMode: 'manual',
    studentInterests: [], suggestedStandards: [], t, targetStandards: [],
    useOwnSources: false, setUseOwnSources: noop,
    ...extra,
  };
}
function fakeOwnSources(overrides = {}) {
  return {
    available: () => true,
    ensureLumen: async () => true,
    acceptAttribute: () => '.pdf,.txt',
    countSources: async () => 1,
    listSources: async () => [{ id: 's1', title: 'Rain notes', active: true, locator: '', chars: 40 }],
    setSourceActive: vi.fn(async () => ({ ok: true, count: 0, sources: [{ id: 's1', title: 'Rain notes', active: false }] })),
    removeSource: vi.fn(async () => ({ ok: true, count: 0, sources: [] })),
    ...overrides,
  };
}
async function mount(props) {
  const { createRoot } = require(path.resolve(ROOT, 'desktop/web-app/node_modules/react-dom/client'));
  const { flushSync } = require(path.resolve(ROOT, 'desktop/web-app/node_modules/react-dom'));
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => root.render(React.createElement(SourceGenPanel, props)));
  return { container, root, flushSync };
}
async function waitFor(check, ms = 4000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (check()) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  return check();
}
const buttonByText = (container, text) => Array.from(container.querySelectorAll('button')).find((b) => b.textContent === text);

describe('source panel own-source controls', () => {
  it('shows saved documents separately from included documents when every file is excluded', async () => {
    window.AlloOwnSources = fakeOwnSources({
      countSources: async () => 0,
      listSources: async () => [{ id: 's1', title: 'Rain notes', active: false }],
    });
    const setUseOwnSources = vi.fn();
    const { container, root } = await mount(panelProps({ useOwnSources: true, setUseOwnSources }));
    try {
      expect(await waitFor(() => container.textContent.includes('input.my_sources_stored:1'))).toBe(true);
      expect(container.textContent).toContain('input.my_sources_included:0');
      expect(container.textContent).not.toContain('input.my_sources_empty');
      expect(container.querySelector('#useOwnSources').disabled).toBe(true);
      expect(setUseOwnSources).toHaveBeenCalledWith(false);
      expect(container.querySelector('#includeCitations').checked).toBe(true);
    } finally { root.unmount(); }
  });

  it('ignores a stale opening snapshot after a document has been excluded', async () => {
    const rows = [{ id: 's1', title: 'Rain notes', active: true }];
    let finishRefresh;
    const os = fakeOwnSources({ listSources: vi.fn().mockResolvedValueOnce(rows).mockImplementationOnce(() => new Promise((resolve) => { finishRefresh = resolve; })) });
    window.AlloOwnSources = os;
    const setUseOwnSources = vi.fn();
    const props = panelProps({ useOwnSources: true, setUseOwnSources });
    const { container, root, flushSync } = await mount(props);
    try {
      expect(await waitFor(() => !!buttonByText(container, 'input.my_sources_exclude'))).toBe(true);
      flushSync(() => root.render(React.createElement(SourceGenPanel, { ...props, showSourceGen: false })));
      flushSync(() => root.render(React.createElement(SourceGenPanel, props)));
      expect(await waitFor(() => !!finishRefresh)).toBe(true);
      flushSync(() => buttonByText(container, 'input.my_sources_exclude').click());
      expect(await waitFor(() => !!buttonByText(container, 'input.my_sources_include'))).toBe(true);
      finishRefresh(rows);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(buttonByText(container, 'input.my_sources_exclude')).toBeUndefined();
      expect(container.textContent).toContain('input.my_sources_included:0');
    } finally { root.unmount(); }
  });

  it('blocks generation and document edits while an import is pending', async () => {
    let finishImport;
    const os = fakeOwnSources({ importFiles: vi.fn(() => new Promise((resolve) => { finishImport = resolve; })) });
    window.AlloOwnSources = os;
    const { container, root, flushSync } = await mount(panelProps());
    try {
      expect(await waitFor(() => !!buttonByText(container, 'input.my_sources_exclude'))).toBe(true);
      const input = container.querySelector('#ownSourcesImport');
      Object.defineProperty(input, 'files', { value: [new File(['Cloud notes'], 'notes.txt', { type: 'text/plain' })] });
      flushSync(() => input.dispatchEvent(new Event('change', { bubbles: true })));
      expect(input.disabled).toBe(true);
      expect(buttonByText(container, 'input.my_sources_exclude').disabled).toBe(true);
      expect(container.querySelector('[data-help-key="source_generate_button"]').disabled).toBe(true);
      finishImport({ ok: true, imported: 1, count: 1, results: [] });
      expect(await waitFor(() => !input.disabled)).toBe(true);
      expect(container.querySelector('[data-help-key="source_generate_button"]').disabled).toBe(false);
    } finally { root.unmount(); }
  });

  it('shows the toggle once the own-sources module loads after the panel opened', async () => {
    expect(typeof SourceGenPanel).toBe('function');
    const { container, root } = await mount(panelProps()); // module not loaded yet
    try {
      await new Promise((r) => setTimeout(r, 200));
      expect(container.querySelector('#useOwnSources')).toBeNull();
      window.AlloOwnSources = fakeOwnSources(); // arrives from the background pump
      expect(await waitFor(() => !!container.querySelector('#useOwnSources'))).toBe(true);
    } finally {
      root.unmount();
    }
  });

  it('asks in the panel before removing, never through window.confirm', async () => {
    const nativeConfirm = vi.spyOn(window, 'confirm').mockImplementation(() => { throw new Error('Blocked in iframe'); });
    const os = fakeOwnSources();
    window.AlloOwnSources = os;
    const { container, root, flushSync } = await mount(panelProps());
    try {
      expect(await waitFor(() => !!buttonByText(container, 'input.my_sources_remove'))).toBe(true);
      flushSync(() => buttonByText(container, 'input.my_sources_remove').click());
      expect(container.textContent).toContain('input.my_sources_remove_confirm:Rain notes');
      expect(os.removeSource).not.toHaveBeenCalled();
      const confirmButtons = Array.from(container.querySelectorAll('button')).filter((b) => b.textContent === 'input.my_sources_remove');
      expect(confirmButtons.length).toBe(2);
      flushSync(() => confirmButtons[1].click());
      expect(await waitFor(() => os.removeSource.mock.calls.length > 0)).toBe(true);
      expect(os.removeSource).toHaveBeenCalledWith('s1', {});
      expect(nativeConfirm).not.toHaveBeenCalled();
    } finally {
      root.unmount();
    }
  });

  it('says so when Exclude cannot complete, instead of looking dead', async () => {
    const os = fakeOwnSources({ setSourceActive: vi.fn(async () => ({ ok: false, reason: 'unavailable', count: 1, sources: [] })) });
    window.AlloOwnSources = os;
    const { container, root, flushSync } = await mount(panelProps());
    try {
      expect(await waitFor(() => !!buttonByText(container, 'input.my_sources_exclude'))).toBe(true);
      flushSync(() => buttonByText(container, 'input.my_sources_exclude').click());
      expect(await waitFor(() => container.textContent.includes('input.my_sources_unavailable'))).toBe(true);
    } finally {
      root.unmount();
    }
  });
});
