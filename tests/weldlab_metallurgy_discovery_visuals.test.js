import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const BASE = { view: 'metallurgy', met_sect: 'ce' };
let root, host;
const core = () => window.__WeldLabCore;
const preset = index => core().STEEL_PRESETS[index].comp;
const signature = comp => ['C', 'Mn', 'Cr', 'Mo', 'V', 'Ni', 'Cu'].map(k => Number(comp[k]) > 0 ? Number(comp[k]).toFixed(3) : '0').join('|');

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab;
  localStorage.clear();
  resetStemLab();
  loadTool(SRC, 'weldLab');
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount());
  root = null; host?.remove();
});
function render(extra = {}, contrast = false) {
  const el = document.createElement('div');
  el.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast });
  return el;
}
async function mount(extra = {}, contrast = false) {
  let latest;
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast,
      update: (id, key, value) => setData(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } })) }));
  }
  host = document.createElement('div'); document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return () => latest;
}
const workbench = el => el.querySelector('[data-met-ce-workbench]');
const number = (el, attr) => Number(el.getAttribute(attr));
async function term(id) { await React.act(() => host.querySelector(`[data-met-ce-term="${id}"]`).click()); }
async function band(label) {
  const group = host.querySelector('[aria-label="Your CE band prediction"]');
  const button = [...group.querySelectorAll('button')].find(el => el.textContent.startsWith(label));
  expect(button).toBeTruthy(); await React.act(() => button.click());
}

describe('CE contribution discovery workbench', () => {
  it('only reveals the current composition after its prediction or explicit free-explore choice', () => {
    const comp = preset(2), sig = signature(comp);
    expect(workbench(render())).toBeNull();
    expect(workbench(render({ met2_cePred: { sig: 'stale', band: 'VERY HIGH' } }))).toBeNull();
    expect(workbench(render({ met2_cePred: { sig, band: 'VERY HIGH' } }))).toBeTruthy();
    expect(workbench(render({ met2_ceFree: true }))).toBeTruthy();
    expect(workbench(render({ met2_ceFree: 'true' }))).toBeNull();
  });

  it.each([0, 1, 2, 3])('represents preset %i with exact IIW weighted terms on one common comparison scale', index => {
    const comp = preset(index), el = render({ met_ce_comp: comp, met2_ceFree: true }), bench = workbench(el);
    const expected = { c: comp.C, mn: comp.Mn / 6, cr: (comp.Cr + comp.Mo + comp.V) / 5, ni: (comp.Ni + comp.Cu) / 15 };
    const div = { c: 1, mn: 6, cr: 5, ni: 15 };
    const max = Math.max(...Object.entries(expected).map(([id, value]) => value * div[id]), 0.01);
    expect(number(bench, 'data-scale-max')).toBeCloseTo(max, 12);
    let sum = 0, stripWidth = 0;
    for (const [id, value] of Object.entries(expected)) {
      const raw = bench.querySelector(`[data-met-ce-raw-bar="${id}"]`), weighted = bench.querySelector(`[data-met-ce-weighted-bar="${id}"]`);
      expect(number(weighted, 'data-value')).toBeCloseTo(value, 12);
      expect(number(raw, 'data-value')).toBeCloseTo(value * div[id], 12);
      expect(number(raw, 'width')).toBeCloseTo(258 * value * div[id] / max, 10);
      expect(number(weighted, 'width')).toBeCloseTo(258 * value / max, 10);
      const segment = bench.querySelector(`[data-met-ce-total-term="${id}"]`);
      expect(number(segment, 'width')).toBeCloseTo(552 * value / core().carbonEquivalentIIW(comp), 10);
      sum += value; stripWidth += number(segment, 'width');
    }
    expect(number(bench, 'data-ce-total')).toBeCloseTo(sum, 12);
    expect(sum).toBeCloseTo(core().carbonEquivalentIIW(comp), 12);
    expect(stripWidth).toBeCloseTo(552, 10);
  });

  it('selects a formula term without rescaling the bars, changing composition or scoring another prediction', async () => {
    const comp = preset(3), tally = { n: 3, right: 2 };
    const latest = await mount({ met_ce_comp: comp, met2_ceFree: true, met2_ceTally: tally });
    const widths = () => [...workbench(host).querySelectorAll('[data-met-ce-raw-bar], [data-met-ce-weighted-bar]')].map(el => el.getAttribute('width'));
    const before = widths();
    for (const id of ['mn', 'cr', 'ni', 'c']) {
      await term(id);
      expect(widths()).toEqual(before);
      expect(latest().met_ce_comp).toEqual(comp);
      expect(latest().met2_ceTally).toEqual(tally);
      expect(workbench(host).dataset.metCeWorkbench).toBe(id);
      expect(workbench(host).querySelectorAll('[data-met-ce-term][aria-pressed="true"]')).toHaveLength(1);
      const detail = host.querySelector('[data-met-ce-term-detail]');
      expect(detail.dataset.metCeTermDetail).toBe(id);
      expect(number(detail, 'data-input-sum') / number(detail, 'data-divisor')).toBeCloseTo(number(detail, 'data-contribution'), 12);
      expect(number(detail, 'data-share')).toBeCloseTo(100 * number(detail, 'data-contribution') / core().carbonEquivalentIIW(comp), 10);
      expect(host.querySelector(`[data-met-ce-total-term="${id}"]`).getAttribute('stroke-width')).toBe('4');
    }
    await term('ni');
    expect(host.querySelector('[data-met-ce-term-detail]').textContent).toContain('(1.800 + 0.000) ÷ 15 = 0.120');
  });

  it('closes the visual result when composition changes after a prediction, then reveals the new calculation after a new prediction', async () => {
    const latest = await mount();
    expect(workbench(host)).toBeNull();
    await band('VERY HIGH');
    expect(latest().met2_ceTally).toEqual({ n: 1, right: 1 });
    expect(number(workbench(host), 'data-ce-total')).toBeCloseTo(core().carbonEquivalentIIW(preset(2)), 12);
    await term('cr');
    await React.act(() => Simulate.change(host.querySelector('#ce-el-C'), { target: { value: '0.30' } }));
    expect(workbench(host)).toBeNull();
    expect(latest().met2_ceTally).toEqual({ n: 1, right: 1 });
    await band('HIGH');
    expect(workbench(host).dataset.metCeWorkbench).toBe('cr');
    expect(latest().met2_ceTally).toEqual({ n: 2, right: 2 });
    expect(number(workbench(host), 'data-ce-total')).toBeCloseTo(core().carbonEquivalentIIW({ ...preset(2), C: 0.3 }), 12);
  });

  it('shows zero and malformed composition terms without invalid bar geometry or invented shares', () => {
    expect(number(workbench(render({ met_ce_comp: null, met2_ceFree: true })), 'data-ce-total')).toBeCloseTo(core().carbonEquivalentIIW(preset(2)), 12);
    for (const comp of [{}, { C: -4, Mn: 'bad', Cr: null, Mo: {}, V: Infinity, Ni: [], Cu: '0' }]) {
      const bench = workbench(render({ met_ce_comp: comp, met2_ceFree: true }));
      expect(number(bench, 'data-ce-total')).toBe(0);
      expect(bench.querySelector('[data-met-ce-term-detail]').dataset.share).toBe('0');
      for (const bar of bench.querySelectorAll('[data-met-ce-raw-bar], [data-met-ce-weighted-bar], [data-met-ce-total-term]')) {
        expect(number(bar, 'width')).toBe(0);
      }
      expect(bench.innerHTML).not.toMatch(/NaN|Infinity|undefined/);
    }
  });

  it('declines to draw numeric overflow rather than create infinite widths', () => {
    const comp = { C: 1e308, Mn: 1e308, Cr: 1e308, Mo: 1e308, V: 1e308, Ni: 1e308, Cu: 1e308 };
    const bench = workbench(render({ met_ce_comp: comp, met2_ceFree: true }));
    expect(bench.dataset.metCeWorkbench).toBe('unavailable');
    expect(bench.querySelector('svg')).toBeNull();
    expect(bench.textContent).toContain('exceed the contribution display');
  });

  it('retains the HAZ discovery and prediction gate when navigating between metallurgy sections', async () => {
    await mount({ met2_ceFree: true });
    await term('mn');
    const haz = [...host.querySelectorAll('button')].find(el => el.textContent.includes('HAZ') && el.hasAttribute('aria-pressed'));
    expect(haz).toBeTruthy(); await React.act(() => haz.click());
    expect(host.querySelector('[data-met-microstructure]')).toBeTruthy();
    expect(host.querySelector('#met2-haz-h').disabled).toBe(true);
    const ce = [...host.querySelectorAll('button')].find(el => el.textContent.includes('Carbon Equivalent') && el.hasAttribute('aria-pressed'));
    expect(ce).toBeTruthy(); await React.act(() => ce.click());
    expect(workbench(host).dataset.metCeWorkbench).toBe('mn');
  });

  it('keeps manual controls and scientific patterns readable in contrast mode', () => {
    const bench = workbench(render({ met2_ceFree: true }, true));
    expect(bench.style.background).toBe('rgb(0, 0, 0)');
    expect(bench.style.color).toBe('rgb(255, 255, 255)');
    expect(bench.querySelector('h4').style.color).toBe('rgb(255, 255, 0)');
    expect(bench.querySelector('[role="group"]').style.flexWrap).toBe('wrap');
    for (const button of bench.querySelectorAll('button')) {
      expect(button.tagName).toBe('BUTTON');
      expect(button.style.minHeight).toBe('44px');
      expect(button.className).toContain('focus:ring-4');
      if (button.getAttribute('aria-pressed') === 'true') {
        expect(button.style.borderWidth).toBe('3px');
        expect(button.style.boxShadow).toContain('inset');
        expect(button.textContent.startsWith('●')).toBe(true);
      }
    }
    const image = bench.querySelector('[data-met-ce-total-strip]');
    expect(image.getAttribute('role')).toBe('img');
    expect(image.getAttribute('aria-label')).toContain('Carbon-equivalent sum');
    expect(image.querySelectorAll('pattern')).toHaveLength(4);
    expect(image.querySelector('pattern circle')).toBeTruthy();
    expect(image.querySelector('animate,animateTransform')).toBeNull();
    expect(bench.textContent).toContain('not a percentage of the steel or a probability of cracking');
  });
});
