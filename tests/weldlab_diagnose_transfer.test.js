import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
let root, host;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab;
  localStorage.clear();
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({}, {
    get: (_, key) => key === 'measureText' ? () => ({ width: 20 })
      : /create.*Gradient/.test(String(key)) ? () => ({ addColorStop() {} }) : () => {},
  }));
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  resetStemLab();
  loadTool(SRC, 'weldLab');
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount());
  root = null;
  host?.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function mount(index) {
  let latest;
  const savedRun = [3, 25, 4, 24];
  const pin = { V: 22, A: 180, TS: 12, P: 'mig', M: 'steel', TH: 0.25, run: [] };
  function App() {
    const [data, setData] = React.useState({ weldLab: {
      view: 'defectDiagnose', dd2Idx: index, dd2Ans: true, dd2Shown: [index],
      bl_V: 10, bl_A: 50, bl_TS: 3, bl_process: 'oxy', bl_material: 'aluminum',
      bl_thickness: 0.125, bl_view: 'helmet', arc_handsOn: true, arc_runHand: true,
      arc_run: savedRun, arc_pin: pin, arc_missions: { retained: { passed: true } },
    } });
    latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({
      toolData: data, setToolData: setData,
      update: (id, key, value) => setData(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } })),
    }));
  }
  host = document.createElement('div');
  document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return {
    state: () => latest, savedRun, pin,
    open: async () => {
      const button = [...host.querySelectorAll('button')].find(b => b.textContent.includes('Open the Bead Lab'));
      expect(button).toBeTruthy();
      await React.act(() => button.click());
    },
  };
}

describe('Defect Diagnose → Bead Lab continuity', () => {
  it.each([
    [1, 28, 280, 20, 0.25],
    [2, 17, 120, 14, 0.5],
    [3, 20, 150, 10, 0.075],
    [5, 18, 110, 6, 0.25],
    [7, 24, 330, 14, 0.375],
  ])('carries case %i with its exact coupon thickness and model result', async (index, V, A, TS, TH) => {
    const app = await mount(index);
    await app.open();
    expect(app.state()).toMatchObject({ view: 'beadLab', bl_V: V, bl_A: A, bl_TS: TS,
      bl_process: 'mig', bl_material: 'steel', bl_thickness: TH, arc_handsOn: false, bl_view: 'topdown' });
    expect(host.querySelector('h1').textContent).toContain('Weld Bead Lab');
    const expected = window.__WeldLabCore.arc.beadReport(V, A, TS, 'mig', 'steel', TH);
    expect(host.querySelector('[data-arc-verdict]').getAttribute('data-arc-verdict')).toBe(expected.verdict);
    expect(host.querySelector('canvas').getAttribute('aria-label')).toContain('score ' + expected.overall + ' percent');
    const savedPin = window.__WeldLabCore.arc.normPin({ V, A, TS, P: 'mig', M: 'steel', TH, run: [] });
    expect(savedPin.TH).toBe(TH);
    expect(app.state().arc_run).toEqual(app.savedRun);
    expect(app.state().arc_pin).toEqual(app.pin);
    expect(app.state().arc_missions).toEqual({ retained: { passed: true } });
  });

  it('transfers the edited repair dials rather than the original defective setup', async () => {
    const app = await mount(1);
    const amperage = [...host.querySelectorAll('input[type="range"]')].find(el => el.getAttribute('aria-label') === 'Amperage');
    expect(amperage).toBeTruthy();
    await React.act(() => Simulate.change(amperage, { target: { value: '220' } }));
    expect(host.textContent).toContain('the model reports no defects');
    await app.open();
    expect(app.state()).toMatchObject({ bl_V: 28, bl_A: 220, bl_TS: 20 });
    expect(host.querySelector('[data-arc-verdict]').getAttribute('data-arc-verdict')).toBe('accept');
  });
});
