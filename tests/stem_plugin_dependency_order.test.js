import fs from 'node:fs';
import { describe, it, expect, vi } from 'vitest';

function loaderFactorySource() {
  const shell = fs.readFileSync('AlloFlowANTI.txt', 'utf8').replace(/\r\n?/g, '\n');
  const start = shell.indexOf('function makeEnsureLoader(');
  const endMarker = '\n      }\n\n      window.__alloEnsureStemPluginsLoaded';
  const end = shell.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error('Could not extract the production plugin loader');
  return shell.slice(start, end + '\n      }'.length);
}

function createHarness(manifest) {
  const history = [];
  const active = [];
  const head = {
    appendChild(node) {
      node.parentNode = head;
      active.push(node);
      history.push(node);
      return node;
    },
    removeChild(node) {
      const index = active.indexOf(node);
      if (index !== -1) active.splice(index, 1);
      node.parentNode = null;
      return node;
    },
  };
  const document = {
    head,
    createElement() {
      const attributes = {};
      return {
        parentNode: null,
        setAttribute(name, value) { attributes[name] = String(value); },
        getAttribute(name) { return attributes[name] || null; },
      };
    },
    querySelectorAll() { return active.slice(); },
  };
  const window = {
    __alloDiagLog: [],
    dispatchEvent() {},
  };
  class FakeCustomEvent {
    constructor(type, options) {
      this.type = type;
      this.detail = options && options.detail;
    }
  }
  const makeEnsureLoader = new Function(
    'window', 'document', 'CustomEvent', 'pluginCdnBase', 'pluginCdnVersion',
    loaderFactorySource() + '\nreturn makeEnsureLoader;'
  )(window, document, FakeCustomEvent, 'https://plugins.test/', 'dependency-test');
  const start = makeEnsureLoader('Stem', manifest, () => true);
  start();
  return { window, history };
}

function modulePath(script) {
  return new URL(script.src).pathname.replace(/^\//, '');
}

async function flushJobs(count = 12) {
  for (let index = 0; index < count; index += 1) await Promise.resolve();
}

const DATA_MANIFEST = [
  'data_kernel_loader.js',
  'stem_lab/stem_tool_dataplot.js',
  'stem_lab/stem_tool_statslab.js',
  'stem_lab/stem_tool_datastudio.js',
];

describe('STEM demand-loader dependency ordering', () => {
  it('loads Data Kernel, Data Plotter, and Data Studio serially', async () => {
    const harness = createHarness(DATA_MANIFEST);
    expect(harness.window.__alloEnsureStemPluginLoaded('dataStudio')).toBe(true);
    await flushJobs();

    expect(harness.history.map(modulePath)).toEqual(['data_kernel_loader.js']);
    expect(harness.window.__alloGetStemPluginState('dataStudio')).toMatchObject({
      status: 'loading',
      phase: 'dependencies',
      dependency: 'stem_lab/stem_tool_dataplot.js',
    });

    harness.history[0].onload();
    await flushJobs();
    expect(harness.history.map(modulePath)).toEqual([
      'data_kernel_loader.js',
      'stem_lab/stem_tool_dataplot.js',
    ]);

    harness.history[1].onload();
    await flushJobs();
    expect(harness.history.map(modulePath)).toEqual([
      'data_kernel_loader.js',
      'stem_lab/stem_tool_dataplot.js',
      'stem_lab/stem_tool_datastudio.js',
    ]);

    harness.history[2].onload();
    await flushJobs();
    expect(harness.window.__alloGetStemPluginState('dataStudio')).toMatchObject({ status: 'loaded' });
  });

  it('loads the Lumen Evidence, Study, and tool scripts in dependency order', async () => {
    const harness = createHarness([
      'stem_lab/stem_lumen_evidence.js',
      'stem_lab/stem_lumen_study.js',
      'stem_lab/stem_tool_lumen.js',
    ]);
    expect(harness.window.__alloEnsureStemPluginLoaded('lumen')).toBe(true);
    await flushJobs();
    expect(harness.history.map(modulePath)).toEqual(['stem_lab/stem_lumen_evidence.js']);

    harness.history[0].onload();
    await flushJobs();
    expect(harness.history.map(modulePath)).toEqual([
      'stem_lab/stem_lumen_evidence.js',
      'stem_lab/stem_lumen_study.js',
    ]);

    harness.history[1].onload();
    await flushJobs();
    expect(harness.history.map(modulePath)).toEqual([
      'stem_lab/stem_lumen_evidence.js',
      'stem_lab/stem_lumen_study.js',
      'stem_lab/stem_tool_lumen.js',
    ]);
  });

  it('does not append a consumer after dependency failure and retries the full chain', async () => {
    const harness = createHarness(DATA_MANIFEST);
    harness.window.__alloEnsureStemPluginLoaded('dataStudio');
    await flushJobs();
    harness.history[0].onerror();
    await flushJobs(24);

    expect(harness.history.map(modulePath)).toEqual(['data_kernel_loader.js']);
    expect(harness.window.__alloGetStemPluginState('dataStudio')).toMatchObject({
      status: 'error',
      phase: 'dependencies',
      dependency: 'data_kernel_loader.js',
    });

    expect(harness.window.__alloRetryStemPlugin('dataStudio')).toBe(true);
    await flushJobs();
    expect(harness.history.map(modulePath)).toEqual(['data_kernel_loader.js', 'data_kernel_loader.js']);
    expect(harness.history[1].src).toContain('retry=');

    harness.history[1].onload();
    await flushJobs();
    harness.history[2].onload();
    await flushJobs();
    harness.history[3].onload();
    await flushJobs();
    expect(harness.window.__alloGetStemPluginState('dataStudio')).toMatchObject({ status: 'loaded', attempt: 2 });
  });
});

// 2026-09-10: the shell deep link (?tool=solarSystem) requests a plugin as soon as
// the app is ready, while stem_lab_module.js sits in the deferred module pump, so
// on a cold load the plugin script executed before window.StemLab existed. The
// 21 plugins that return in that case never registered ("The plugin loaded but
// did not register" on every shared link); the rest installed a bare shim the
// module then kept, so 3D tools opened that way had no ensureThree. The loader
// now holds a STEM plugin script until the module has executed. The hold is
// keyed on window.__alloModuleRegistry, which the real app creates before the
// loader and which the harness above deliberately lacks, so the older tests in
// this file keep exercising the immediate path.
describe('STEM demand-loader waits for stem_lab_module.js before injecting a plugin', () => {
  const MANIFEST = ['stem_lab/stem_tool_solarsystem.js'];

  it('holds the script while the module is missing and appends it once the module has executed', async () => {
    vi.useFakeTimers();
    try {
      const harness = createHarness(MANIFEST);
      harness.window.__alloModuleRegistry = {};
      expect(harness.window.__alloEnsureStemPluginLoaded('solarSystem')).toBe(true);
      await flushJobs();
      expect(harness.history).toEqual([]);
      expect(harness.window.__alloGetStemPluginState('solarSystem')).toMatchObject({ status: 'loading' });

      vi.advanceTimersByTime(5000);
      await flushJobs();
      expect(harness.history, 'still held five seconds in').toEqual([]);

      harness.window.AlloModules = { StemLab: {} };
      vi.advanceTimersByTime(200);
      await flushJobs();
      expect(harness.history.map(modulePath)).toEqual(['stem_lab/stem_tool_solarsystem.js']);

      harness.history[0].onload();
      await flushJobs();
      expect(harness.window.__alloGetStemPluginState('solarSystem')).toMatchObject({ status: 'loaded' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('gives up waiting after the bound and still injects, so a missing module ends in the normal error card', async () => {
    vi.useFakeTimers();
    try {
      const harness = createHarness(MANIFEST);
      harness.window.__alloModuleRegistry = {};
      harness.window.__alloEnsureStemPluginLoaded('solarSystem');
      await flushJobs();
      vi.advanceTimersByTime(25200);
      await flushJobs();
      expect(harness.history.map(modulePath)).toEqual(['stem_lab/stem_tool_solarsystem.js']);
      // The plugin's own 20 s download timeout only starts once it is injected.
      vi.advanceTimersByTime(19000);
      await flushJobs();
      expect(harness.window.__alloGetStemPluginState('solarSystem')).toMatchObject({ status: 'loading' });
      vi.advanceTimersByTime(1500);
      await flushJobs();
      expect(harness.window.__alloGetStemPluginState('solarSystem')).toMatchObject({ status: 'error' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not hold the script when the module is already there', async () => {
    const harness = createHarness(MANIFEST);
    harness.window.__alloModuleRegistry = {};
    harness.window.StemLab = { ensureThree: function () {} };
    harness.window.__alloEnsureStemPluginLoaded('solarSystem');
    await flushJobs();
    expect(harness.history.map(modulePath)).toEqual(['stem_lab/stem_tool_solarsystem.js']);
  });
});
