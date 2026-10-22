import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const BASE = { view: 'inspection', insp_sect: 'et' };
const IDS = ['coil', 'currents', 'discontinuity', 'instrument'];
const CAPTIONS = [
  '1. Coil generates alternating magnetic field near surface of conductive material.',
  '2. Eddy currents induced in the material flow in circular patterns parallel to surface.',
  '3. Defects (cracks, voids, conductivity changes) disrupt eddy current flow → impedance of coil changes.',
  '4. Coil impedance change is displayed on instrument; operator interprets.',
];
let root, host;
const explorer = (node = host) => node.querySelector('[data-et-explorer]');
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab;
  localStorage.clear();
  resetStemLab();
  loadTool(SRC, 'weldLab');
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount());
  root = null;
  host?.remove();
});
function render(extra = {}, contrast = false) {
  const node = document.createElement('div');
  node.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast });
  return node;
}
async function mount(extra = {}, contrast = false) {
  let latest;
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } });
    latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({
      toolData: data, setToolData: setData, isContrast: contrast,
      update: (id, key, value) => setData(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } })),
    }));
  }
  host = document.createElement('div'); document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return () => latest;
}
async function click(node) { expect(node).toBeTruthy(); await React.act(() => node.click()); }
async function stage(id) { await click(host.querySelector('[data-et-stage="' + id + '"]')); }
async function buttonText(text) { await click([...host.querySelectorAll('button')].find(node => node.textContent.trim() === text)); }

describe('Eddy current causal stage explorer', () => {
  it('replaces the static how-works card only in the ET reading tab and preserves its lesson context', () => {
    const node = render(), section = explorer(node);
    expect(section).toBeTruthy();
    expect(section.dataset.etExplorer).toBe('coil');
    expect(section.querySelectorAll('[data-et-stage]')).toHaveLength(4);
    expect(node.textContent).toContain('Surface + near-surface defects disrupt the eddy current pattern');
    expect(node.textContent).toContain('Only conductive materials. Depth is limited by the skin effect');
    expect(node.textContent).toContain('Heat exchanger tube inspection');
    expect(node.querySelectorAll('#insp4-et-title')).toHaveLength(1);
    for (const sect of ['overview', 'bench', 'visual', 'pt_mt', 'ut', 'rt', 'ndt', 'exam', 'invalid']) expect(explorer(render({ insp_sect: sect }))).toBeNull();
  });

  it('links all four native stage choices to the original explanation and matching schematic focus', async () => {
    await mount();
    for (const [i, id] of IDS.entries()) {
      await stage(id);
      const section = explorer(), button = section.querySelector('[data-et-stage="' + id + '"]');
      expect(section.dataset.stage).toBe(String(i));
      expect(section.dataset.etExplorer).toBe(id);
      expect(section.querySelector('[data-et-schematic]').dataset.etSchematic).toBe(id);
      expect(section.querySelector('[data-et-focus]').dataset.etFocus).toBe(id);
      expect(section.querySelectorAll('button[aria-pressed="true"]')).toHaveLength(1);
      expect(button.getAttribute('aria-pressed')).toBe('true');
      expect(section.querySelector('[data-et-caption] p').textContent).toBe(CAPTIONS[i]);
      expect(section.querySelector('[data-et-caption]').dataset.etCaption).toBe(id);
      expect(section.querySelector('svg').getAttribute('aria-label')).toContain(button.textContent.slice(4));
      expect(section.querySelector('[data-et-caption]').getAttribute('aria-live')).toBe('polite');
    }
  });

  it('shows circular paths before the discontinuity, then a changed path and qualitative instrument glyph', async () => {
    await mount();
    expect(explorer().querySelector('[data-et-current-paths]').dataset.etCurrentPaths).toBe('not-yet-shown');
    expect(explorer().querySelector('[data-et-component="discontinuity"]')).toBeNull();
    await stage('currents');
    const clean = explorer().querySelector('[data-et-current-paths]');
    expect(clean.dataset.etCurrentPaths).toBe('circular');
    expect(clean.querySelectorAll('ellipse')).toHaveLength(3);
    expect(explorer().querySelector('[data-et-component="discontinuity"]')).toBeNull();
    expect(explorer().querySelector('[data-et-instrument-glyph]').dataset.etInstrumentGlyph).toBe('inactive');
    await stage('discontinuity');
    const disrupted = explorer().querySelector('[data-et-current-paths]');
    expect(disrupted.dataset.etCurrentPaths).toBe('disrupted');
    expect(disrupted.querySelectorAll('ellipse')).toHaveLength(0);
    expect(disrupted.querySelectorAll('path').length).toBeGreaterThan(3);
    expect(explorer().querySelector('[data-et-component="discontinuity"] path').getAttribute('d')).toContain('239 188');
    expect(explorer().querySelector('[data-et-instrument-glyph]').dataset.etInstrumentGlyph).toBe('inactive');
    await stage('instrument');
    expect(explorer().querySelector('[data-et-instrument-glyph]').dataset.etInstrumentGlyph).toBe('changed');
    expect(explorer().querySelector('[data-et-current-paths]').dataset.etCurrentPaths).toBe('disrupted');
    expect(explorer().querySelector('[data-et-component="instrument"]').getAttribute('opacity')).toBe('1');
    expect(explorer().querySelector('[data-et-model-note]').textContent).toContain('do not predict a signal, flaw size, inspection depth or acceptance result');
    expect(explorer().querySelector('output, meter, progress, input[type="range"]')).toBeNull();
    expect(explorer().textContent).not.toMatch(/\d+\s*(?:Hz|MHz|mm|mV|ohm|%)|passed|rejected|accepted/i);
    await stage('coil');
    expect(explorer().querySelector('[data-et-component="discontinuity"]')).toBeNull();
    expect(explorer().querySelector('[data-et-instrument-glyph]').dataset.etInstrumentGlyph).toBe('inactive');
  });

  it('keeps exploration local, retains it across reading tabs, and leaves inspection records and answers intact', async () => {
    const bench = { uc1: { pick: 'reject', recs: [6.5] } };
    const latest = await mount({ insp2_bench: bench, insp2_ndtQuiz: { 0: 1 }, insp2_ndtMat: 'al', insp2_ndtFlaw: 'lof', insp2_ndtAccess: 'one', insp2_utDepth: 0.65, insp2_rtAngle: 40 });
    const initial = { ...latest() };
    for (const id of IDS) await stage(id);
    expect(latest()).toEqual(initial);
    await buttonText('📡 Ultrasonic (UT)');
    expect(explorer()).toBeNull();
    await buttonText('🧲 Eddy current (ET)');
    expect(explorer().dataset.etExplorer).toBe('instrument');
    expect(latest()).toEqual(initial);
    await buttonText('🧭 NDT Method Chooser');
    expect(explorer()).toBeNull();
    expect(host.querySelector('[data-inspection-specimen]').dataset.material).toBe('al');
    expect(host.querySelectorAll('[data-inspection-method]')).toHaveLength(4);
    await buttonText('📝 Quiz: 8 cases');
    expect(host.querySelector('[data-inspection-specimen]')).toBeNull();
    const choices = host.querySelector('[aria-label="Pick the best NDT method"]').querySelectorAll('button');
    expect([...choices].every(button => button.disabled)).toBe(true);
    await click(choices[0]);
    expect(latest().insp2_ndtQuiz).toEqual({ 0: 1 });
    expect(latest().insp2_bench).toEqual(bench);
  });

  it('does not leak quiz recommendations, commit an answer or affect the first-answer lock', async () => {
    const latest = await mount({ insp2_ndtMode: 'quiz', insp2_ndtQuiz: {} });
    await stage('instrument');
    expect(latest().insp2_ndtQuiz).toEqual({});
    await buttonText('🧭 NDT Method Chooser');
    expect(explorer()).toBeNull();
    expect(host.textContent).not.toContain('Best answer:');
    expect(host.querySelector('[data-inspection-specimen]')).toBeNull();
    const choices = () => host.querySelector('[aria-label="Pick the best NDT method"]').querySelectorAll('button');
    await click(choices()[0]);
    expect(latest().insp2_ndtQuiz).toEqual({ 0: 0 });
    expect([...choices()].every(button => button.disabled)).toBe(true);
    await buttonText('🧲 Eddy current (ET)');
    await stage('currents');
    await buttonText('🧭 NDT Method Chooser');
    await click(choices()[1]);
    expect(latest().insp2_ndtQuiz).toEqual({ 0: 0 });
  });

  it('offers manual keyboard-friendly choices and full-size captions in explicit contrast states without autoplay', async () => {
    await mount({}, true);
    const section = explorer();
    expect(section.style.background).toBe('rgb(0, 0, 0)');
    expect(section.style.color).toBe('rgb(255, 255, 255)');
    expect(section.querySelector('h4').style.color).toBe('rgb(255, 255, 0)');
    expect(section.querySelector('[role="group"]').className).toContain('flex-wrap');
    expect(section.querySelector('svg').style.width).toBe('100%');
    expect(section.querySelector('svg').style.height).toBe('auto');
    expect(section.querySelector('svg').getAttribute('role')).toBe('img');
    for (const button of section.querySelectorAll('button')) {
      expect(button.tagName).toBe('BUTTON');
      expect(button.type).toBe('button');
      expect(button.style.minHeight).toBe('44px');
      expect(button.className).toContain('focus:ring-4');
      const selected = button.getAttribute('aria-pressed') === 'true';
      expect(button.style.background).toBe(selected ? 'rgb(255, 255, 0)' : 'rgb(0, 0, 0)');
      expect(button.style.color).toBe(selected ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 0)');
      expect(button.getAttribute('aria-controls')).toBe(section.querySelector('[data-et-caption]').id);
    }
    await React.act(() => section.querySelector('[data-et-stage="instrument"]').focus());
    expect(section.dataset.etExplorer).toBe('coil');
    await stage('instrument');
    expect(section.querySelector('[data-et-stage="instrument"]').style.background).toBe('rgb(255, 255, 0)');
    expect(section.querySelector('[data-et-stage="coil"]').style.background).toBe('rgb(0, 0, 0)');
    expect(section.querySelector('animate, animateTransform, canvas, [style*="animation"]')).toBeNull();
  });
});
