import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const BASE = { view: 'mathBlueprint', mb_mode: 'browse', mb_sect: 'arithmetic', sym2_m_score: 4, sym2_m_tries: 8, sym2_m_streak: 2, sym2_m_best: 3, sym2_m_rounds: { frac2dec: 2 }, mb_q_score: 2, mb_q_picked: 3 };
const PRESETS = [[1, 64, '1/64'], [1, 32, '1/32'], [3, 64, '3/64'], [1, 16, '1/16'], [5, 64, '5/64'], [3, 32, '3/32'], [1, 8, '1/8'], [5, 32, '5/32'], [3, 16, '3/16'], [7, 32, '7/32'], [1, 4, '1/4'], [5, 16, '5/16'], [3, 8, '3/8'], [7, 16, '7/16'], [1, 2, '1/2'], [5, 8, '5/8'], [3, 4, '3/4'], [7, 8, '7/8'], [1, 1, '1"'], [3, 2, '1.5"']];
let host, root;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab');
});
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); });
async function mount(extra = {}, contrast = false) {
  let latest; const writes = [];
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast,
      update: (bucket, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [bucket]: { ...prev[bucket], [key]: value } })); } }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return { latest: () => latest, writes };
}
const panel = () => host.querySelector('[data-math-length]');
const reading = kind => panel().querySelector(`[data-math-length-reading="${kind}"]`).textContent;
async function choose(value) { await React.act(() => Simulate.change(host.querySelector('[data-math-length-preset]'), { target: { value: String(value) } })); }
async function compare() { await React.act(() => host.querySelector('[data-math-length-compare]').click()); }

describe('Exact-length conversion inspector', () => {
  it('starts with one length represented exactly in fractional, decimal and metric units', async () => {
    await mount();
    expect(panel().dataset).toMatchObject({ presetIndex: '8', inches: '0.1875', compare: 'false' });
    expect(Number(panel().dataset.mm)).toBeCloseTo(4.7625, 12);
    expect(reading('fraction')).toBe('3/16 in'); expect(reading('decimal')).toBe('0.1875 in'); expect(reading('metric')).toBe('4.7625 mm');
    expect(panel().querySelector('[data-math-length-conversion]').textContent).toBe('0.1875 in × 25.4 mm/in = 4.7625 mm');
    expect(panel().querySelector('[data-math-length-rounded-marker]')).toBeNull();
    expect(panel().querySelector('#math8-length-rounded').hidden).toBe(true);
  });

  it('retains all twenty authored presets and converts each on one fixed ruler', async () => {
    await mount();
    expect([...panel().querySelector('select').options].map(option => option.textContent)).toEqual(PRESETS.map(row => row[2]));
    expect(panel().querySelectorAll('[data-math-length-tick]')).toHaveLength(25);
    for (const n of [0, 0.5, 1, 1.5]) expect(panel().querySelector('[data-math-length-axis="' + n + '"]').style.left).toBe(((20 + n * 400) / 640 * 100) + '%');
    expect(panel().querySelector('[data-math-length-axis="0"]').style.transform).toBe('none');
    expect(panel().querySelector('[data-math-length-axis="0.5"]').style.transform).toBe('translateX(-50%)');
    expect(panel().querySelector('[data-math-length-axis="1"]').style.transform).toBe('translateX(-50%)');
    expect(panel().querySelector('[data-math-length-axis="1.5"]').style.transform).toBe('translateX(-100%)');
    for (let i = 0; i < PRESETS.length; i++) {
      const [n, d] = PRESETS[i], inches = n / d, mm = inches * 25.4;
      await choose(i);
      expect(Number(panel().dataset.inches)).toBe(inches); expect(Number(panel().dataset.mm)).toBeCloseTo(mm, 12);
      expect(parseFloat(reading('decimal'))).toBe(inches); expect(parseFloat(reading('metric'))).toBeCloseTo(mm, 12);
      expect(Number(panel().querySelector('[data-math-length-exact-marker]').dataset.x)).toBeCloseTo(20 + inches * 400, 12);
      expect(panel().querySelector('[data-math-length-ruler]').getAttribute('viewBox')).toBe('0 0 640 104');
      expect(inches).toBeGreaterThanOrEqual(0); expect(inches).toBeLessThanOrEqual(1.5);
    }
    expect(reading('fraction')).toBe('1-1/2 in'); expect(reading('metric')).toBe('38.1 mm');
  });

  it('keeps terminating decimals exact instead of carrying over rounded reference-card text', async () => {
    await mount(); await choose(0);
    expect(reading('fraction')).toBe('1/64 in'); expect(reading('decimal')).toBe('0.015625 in'); expect(reading('metric')).toBe('0.396875 mm');
    await choose(1); expect(reading('decimal')).toBe('0.03125 in'); expect(reading('metric')).toBe('0.79375 mm');
    await choose(7); expect(reading('decimal')).toBe('0.15625 in'); expect(reading('metric')).toBe('3.96875 mm');
  });

  it('shows signed rounding changes on either side and uses the existing positive halfway rule', async () => {
    await mount(); await compare();
    const cases = [[0, 0, -0.015625], [1, 0.0625, 0.03125], [2, 0.0625, 0.015625], [4, 0.0625, -0.015625], [5, 0.125, 0.03125]];
    for (const [index, rounded, error] of cases) {
      await choose(index);
      expect(Number(panel().querySelector('[data-math-length-rounded-reading]').dataset.inches)).toBe(rounded);
      expect(Number(panel().querySelector('[data-math-length-error]').dataset.errorInches)).toBe(error);
      expect(Number(panel().querySelector('[data-math-length-rounded-marker]').dataset.x)).toBe(20 + rounded * 400);
      if (error > 0) expect(panel().querySelector('[data-math-length-error]').textContent).toContain('+' + error);
      if (error < 0) expect(panel().querySelector('[data-math-length-error]').textContent).toContain(String(error));
    }
    expect(panel().textContent).toContain('rounding difference, not an inch-to-millimetre conversion difference');
    expect(panel().textContent).toContain('same rounding rule as checked practice');
  });

  it('keeps exact readings fixed when comparison is toggled and distinguishes coincident markers by shape', async () => {
    await mount(); await choose(6);
    const before = ['fraction', 'decimal', 'metric'].map(reading);
    await compare();
    expect(['fraction', 'decimal', 'metric'].map(reading)).toEqual(before);
    expect(panel().querySelector('[data-math-length-exact-marker]').dataset.x).toBe(panel().querySelector('[data-math-length-rounded-marker]').dataset.x);
    expect(panel().querySelector('[data-math-length-exact-marker] path')).toBeTruthy();
    expect(panel().querySelector('[data-math-length-rounded-marker] circle').getAttribute('fill')).toBe('none');
    expect(panel().querySelector('[data-math-length-error]').textContent).toBe('Rounded − exact: 0 in');
    expect(panel().textContent).toContain('two markers line up');
    await compare(); expect(panel().querySelector('[data-math-length-rounded-marker]')).toBeNull();
    expect(panel().querySelector('[data-math-length-rounded-reading]')).toBeNull();
    expect(['fraction', 'decimal', 'metric'].map(reading)).toEqual(before);
  });

  it('keeps all exact and rounded marker shapes within the common ruler at both extremes', async () => {
    await mount(); await compare();
    for (const index of [0, 19]) {
      await choose(index);
      for (const marker of panel().querySelectorAll('[data-math-length-exact-marker],[data-math-length-rounded-marker]')) {
        const x = Number(marker.dataset.x); expect(x - 9).toBeGreaterThanOrEqual(0); expect(x + 9).toBeLessThanOrEqual(640);
      }
    }
    expect(Number(panel().querySelector('[data-math-length-exact-marker]').dataset.x)).toBe(620);
    expect(Number(panel().querySelector('[data-math-length-rounded-marker]').dataset.x)).toBe(620);
  });

  it('ignores invalid preset events and never writes reference exploration into saved scores or answers', async () => {
    const app = await mount(), before = JSON.stringify(app.latest()), writes = app.writes.length;
    for (const value of ['', 'bad', -1, 20, 1.2, 'Infinity']) { await choose(value); expect(panel().dataset.presetIndex).toBe('8'); }
    await choose(0); await compare(); await choose(19); await compare();
    expect(JSON.stringify(app.latest())).toBe(before); expect(app.writes).toHaveLength(writes);
    expect(panel().textContent).not.toMatch(/NaN|Infinity|undefined/);
  });

  it('provides labeled 44px native controls, explicit contrast colors and accessible shape descriptions', async () => {
    await mount({}, true);
    expect(panel().style.background).toBe('rgb(0, 0, 0)'); expect(panel().style.color).toBe('rgb(255, 255, 255)');
    const select = panel().querySelector('select'), button = panel().querySelector('[data-math-length-compare]');
    expect(select.style.minHeight).toBe('44px'); expect(button.style.minHeight).toBe('44px');
    expect(panel().querySelector(`label[for="${select.id}"]`)).toBeTruthy();
    expect(button.getAttribute('aria-pressed')).toBe('false'); await compare();
    expect(button.getAttribute('aria-pressed')).toBe('true'); expect(button.style.background).toBe('rgb(255, 255, 0)'); expect(button.style.color).toBe('rgb(0, 0, 0)');
    expect(panel().querySelector('[data-math-length-ruler]').getAttribute('aria-label')).toContain('filled diamond');
    expect(panel().querySelector('[data-math-length-ruler]').getAttribute('aria-label')).toContain('open ring');
    expect(panel().querySelector('animate,animateTransform')).toBeNull();
  });

  it('retains the metric explanation and three practice kinds while isolating the inspector from other modes', async () => {
    await mount();
    expect(host.textContent).toContain('1 in = 25.4 mm exactly');
    for (const kind of ['frac2dec', 'frac2mm', 'mm2frac']) expect(host.querySelector(`[data-sym2-math="${kind}"]`)).toBeTruthy();
    for (const extra of [{ mb_mode: 'practice' }, { mb_mode: 'quiz' }, { mb_sect: 'measure' }, { mb_sect: 'geometry' }]) {
      const html = renderTool('weldLab', { weldLab: { ...BASE, ...extra } });
      expect(html).not.toContain('data-math-length=');
    }
  });
});
