// Skate Lab run log -> Data Plot (Regression mode) and -> CODAP through Data Lab (2026-11-03).
// The receiving hooks live in lazily loaded modules, so both paths are pinned: hook present
// (the real Data Plot / Data Lab modules loaded) and hook absent (inbox + open the tool).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));

let toolConfig;
let container;
let root;
let originals;

const experiments = [[1, 2], [2, 4.1], [3, 5.9], [4, 8.2]].map(([x, y], index) => ({
  id: 100 + index, n: index + 1, mode: 'halfpipe', setup: 'run ' + (index + 1), measured: y, unit: 'ft', errorPct: null,
  runSuccessful: true, values: { dropHeight: x, startPE: y },
}));
const seed = () => ({
  skatelab: {
    mode: 'halfpipe', viewMode: '2d', _predictDefaultV: 2, experiments,
    stats: { runs: 4, successful: 4, withinTen: 0 },
    logView: { x: 'dropHeight', y: 'startPE', group: 'none', sort: 'id', dir: 'asc' },
  },
});

async function mount(ctxOverrides = {}) {
  const state = { latest: null };
  function Host() {
    const [toolData, setToolData] = React.useState(seed());
    state.latest = toolData;
    return toolConfig.render(makeCtx({ toolData, setToolData, ...ctxOverrides }));
  }
  await act(async () => { root.render(React.createElement(Host)); });
  return state;
}
const buttonByText = (text) => [...container.querySelectorAll('button')].find((button) => button.textContent === text);
const click = (element) => act(async () => { element.click(); });

beforeEach(() => {
  resetStemLab();
  toolConfig = loadTool('stem_lab/stem_tool_skatelab.js', 'skatelab');
  container = document.createElement('div');
  document.body.appendChild(container);
  root = ReactDOMClient.createRoot(container);
  originals = { getContext: HTMLCanvasElement.prototype.getContext, matchMedia: window.matchMedia };
  HTMLCanvasElement.prototype.getContext = vi.fn(() => new Proxy({ measureText: () => ({ width: 40 }) }, {
    get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => { t[k] = v; return true; },
  }));
  window.matchMedia = vi.fn(() => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
});
afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  container.remove();
  HTMLCanvasElement.prototype.getContext = originals.getContext;
  window.matchMedia = originals.matchMedia;
  delete window.__alloDataLabInbox;
  delete window.__alloEnsureStemPluginLoaded;
  vi.restoreAllMocks();
});

describe('Skate Lab log handoff', () => {
  it('sends the chosen axes to the real Data Plot import hook and opens Charts & Graphs', async () => {
    loadTool('stem_lab/stem_tool_dataplot.js', 'dataPlot');
    expect(typeof window.StemLab.dataPlotImport).toBe('function');
    const setStemLabTool = vi.fn();
    const state = await mount({ setStemLabTool });
    await click(buttonByText('Graph these axes in Data Plot'));
    const dp = state.latest.dataPlot;
    expect(dp.points).toEqual([{ x: 1, y: 2 }, { x: 2, y: 4.1 }, { x: 3, y: 5.9 }, { x: 4, y: 8.2 }]);
    expect(dp.xLabel).toMatch(/drop/i);
    expect(state.latest._dataStudio.studioMode).toBe('regression');
    expect(setStemLabTool).toHaveBeenCalled();
    // The skate log itself is untouched.
    expect(state.latest.skatelab.experiments).toHaveLength(4);
  });

  it('without Data Plot loaded, queues the inbox, loads Charts & Graphs and switches to it', async () => {
    delete window.StemLab.dataPlotImport;
    const order = [];
    window.__alloEnsureStemPluginLoaded = vi.fn((id) => { order.push('load:' + id); return true; });
    const setStemLabTool = vi.fn((id) => order.push('open:' + id));
    const state = await mount({ setStemLabTool });
    await click(buttonByText('Graph these axes in Data Plot'));
    expect(window.StemLab._dataPlotInbox.points).toHaveLength(4);
    expect(state.latest._dataStudio.studioMode).toBe('regression');
    expect(order).toEqual(['load:dataStudio', 'open:dataStudio']);
  });

  it('opens the log in CODAP through the real Data Lab hook', async () => {
    loadTool('stem_lab/stem_tool_datalab.js', 'dataLab');
    const hook = vi.spyOn(window.StemLab, 'openInDataLab').mockImplementation(() => ({ ok: true, status: 'opening' }));
    await mount();
    await click(buttonByText('Explore the log in CODAP'));
    expect(hook).toHaveBeenCalledTimes(1);
    const dataset = hook.mock.calls[0][0];
    expect(dataset.rows).toHaveLength(4);
    expect(dataset.attributes.length).toBe(dataset.rows[0].length);
    // The dataset passes Data Lab's own validator.
    hook.mockRestore();
    expect(window.StemLab.dataLab.normalizeDataset(dataset).ok).toBe(true);
  });

  it('Heat Lab notebook rows go to Data Plot and to CODAP the same way', async () => {
    const LOG = [
      { kind: 'mug', at: 1000, material: 'wood', thickness_mm: 10, T60_C: 60.6 },
      { kind: 'radiation', at: 2000, surface_C: 33, emitted_W: 878.7 },
      { kind: 'mug', at: 3000, material: 'fibre', thickness_mm: 5, T60_C: 66.1 },
      { kind: 'mug', at: 4000, material: 'aerogel', thickness_mm: 2, T60_C: 65.2 },
    ];
    const heat = loadTool('stem_lab/stem_tool_heatlab.js', 'heatLab');
    loadTool('stem_lab/stem_tool_dataplot.js', 'dataPlot');
    loadTool('stem_lab/stem_tool_datalab.js', 'dataLab');
    const codap = vi.spyOn(window.StemLab, 'openInDataLab').mockImplementation(() => ({ ok: true, status: 'opening' }));
    const state = { latest: null };
    function Host() {
      const [toolData, setToolData] = React.useState({ _heatLab: { log: LOG, nbKind: 'mug', nbX: 'thickness_mm', nbY: 'T60_C' } });
      state.latest = toolData;
      return heat.render(makeCtx({ toolData, setToolData, setStemLabTool: () => {} }));
    }
    await act(async () => { root.render(React.createElement(Host)); });
    const nb = container.querySelector('#htsec-notebook');
    const btn = (text) => [...nb.querySelectorAll('button')].find((b) => b.textContent.trim() === text);
    await click(btn('Graph these columns in Data Plot'));
    expect(state.latest.dataPlot.points).toEqual([{ x: 10, y: 60.6 }, { x: 5, y: 66.1 }, { x: 2, y: 65.2 }]);
    expect(state.latest._dataStudio.studioMode).toBe('regression');
    await click(btn('Explore these rows in CODAP'));
    const dataset = codap.mock.calls[0][0];
    expect(dataset.rows).toHaveLength(3);
    codap.mockRestore();
    expect(window.StemLab.dataLab.normalizeDataset(dataset).ok).toBe(true);
  });

  it('in the desktop app (Data Lab answers desktop-app), queues the runs in the inbox and opens Data Lab', async () => {
    window.StemLab.openInDataLab = vi.fn(() => ({ ok: false, error: 'desktop-app' }));
    const setStemLabTool = vi.fn();
    await mount({ setStemLabTool });
    await click(buttonByText('Explore the log in CODAP'));
    expect(window.__alloDataLabInbox).toHaveLength(1);
    expect(window.__alloDataLabInbox[0].rows).toHaveLength(4);
    expect(setStemLabTool).toHaveBeenCalledWith('dataLab');
    expect(container.textContent).toContain('CODAP opens in your web browser');
    delete window.StemLab.openInDataLab;
  });

  it('without Data Lab loaded, leaves the dataset in its inbox and opens Data Lab', async () => {
    delete window.StemLab.openInDataLab;
    window.__alloEnsureStemPluginLoaded = vi.fn(() => true);
    const setStemLabTool = vi.fn();
    await mount({ setStemLabTool });
    await click(buttonByText('Explore the log in CODAP'));
    expect(window.__alloDataLabInbox).toHaveLength(1);
    expect(window.__alloEnsureStemPluginLoaded).toHaveBeenCalledWith('dataLab');
    expect(setStemLabTool).toHaveBeenCalledWith('dataLab');
  });
});
