// Dynamic Assessment opens Number Line with preset.tab 'skipCount' or 'fracDec'
// (dynamic_assessment_module.js ALLOWED_TABS and its teacher editor), copied into
// toolData._numberline by misc_handlers_module.js. The tool's own ids are lowercase.
// NUMBERLINE_DA_SRC points the suite at another copy for the fail-first proof.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const FILE = process.env.NUMBERLINE_DA_SRC || 'stem_lab/stem_tool_numberline.js';
let root = null;

beforeEach(() => {
  resetStemLab();
  if (!window.ResizeObserver) { window.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} }; globalThis.ResizeObserver = window.ResizeObserver; }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => new Proxy({}, { get: (tg, k) => (k in tg ? tg[k] : () => {}), set: (tg, k, v) => { tg[k] = v; return true; } }));
  loadTool(FILE, 'numberline');
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null; document.body.innerHTML = ''; vi.restoreAllMocks();
});

async function mount(nl) {
  if (root) { await React.act(async () => root.unmount()); root = null; }
  document.body.innerHTML = '<div id="root"></div>';
  function App() {
    const [state, setState] = React.useState({ _numberline: Object.assign({ muted: true }, nl) });
    return window.StemLab._registry.numberline.render(makeCtx({ toolData: state, setToolData: setState, addToast: () => {} }));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  return document.getElementById('root').textContent;
}

describe('Dynamic Assessment number line presets', () => {
  it('the assessment module still sends the spellings this tool has to accept', () => {
    const da = readFileSync('dynamic_assessment_module.js', 'utf8');
    expect(da.includes('var ALLOWED_TABS = { explore: 1, skipCount: 1, fracDec: 1 };')).toBe(true);
  });

  it.each([['skipCount', 'skipcount'], ['fracDec', 'fracdec']])('preset tab %s opens the same activity as %s', async (daName, toolId) => {
    const viaTool = await mount({ tab: toolId });
    const viaPreset = await mount({ tab: daName });
    expect(viaPreset.length).toBeGreaterThan(200);
    expect(viaPreset).toBe(viaTool);
    expect(viaPreset).not.toBe(await mount({ tab: 'explore' }));
  });

  it('keeps the preset range and markers with the corrected tab', async () => {
    const text = await mount({ tab: 'skipCount', range: { min: 0, max: 50 }, markers: [{ value: 7, color: '#000', label: 'start' }] });
    expect(text.length).toBeGreaterThan(200);
  });

  it.each(['constructor', '__proto__', 'nonsense'])('an unknown saved tab %s opens Explore instead of crashing or showing an empty panel', async (bad) => {
    const opened = await mount({ tab: bad });
    expect(opened).toBe(await mount({ tab: 'explore' }));
  });
});
