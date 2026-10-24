import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const BASE = { view: 'mathBlueprint', mb_mode: 'browse', mb_sect: 'geometry', sym2_m_seed: 12345, sym2_m_score: 4, sym2_m_tries: 8, sym2_m_streak: 2, sym2_m_best: 3, sym2_m_rounds: { brace: 2 }, mb_q_score: 2, mb_q_picked: 3 };
let host, root;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab');
});
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); });
async function mount(contrast = false) {
  let latest; const writes = [];
  function App() {
    const [data, setData] = React.useState({ weldLab: BASE }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast,
      update: (bucket, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [bucket]: { ...prev[bucket], [key]: value } })); } }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return { latest: () => latest, writes };
}
const panel = () => host.querySelector('[data-math-bevel]');
const value = kind => Number(panel().querySelector(`[data-bevel-reading="${kind}"]`).dataset.value);
const coord = (node, name) => Number(node.getAttribute(name));
async function angle(value) { await React.act(() => Simulate.change(panel().querySelector('[data-bevel-angle]'), { target: { value: String(value) } })); }
async function lens(id) { await React.act(() => panel().querySelector(`[data-bevel-lens="${id}"]`).click()); }
async function reset() { await React.act(() => panel().querySelector('[data-bevel-reset]').click()); }

describe('Bevel-face complementary-angle inspector', () => {
  it('opens the authored half-inch, thirty-degree example with matching calculated lengths', async () => {
    await mount();
    expect(panel().dataset).toMatchObject({ angleVertical: '30', angleHorizontal: '60', lens: 'vertical', thickness: '0.5' });
    expect(value('face')).toBeCloseTo(1 / Math.sqrt(3), 12);
    expect(value('run')).toBeCloseTo(0.5 / Math.sqrt(3), 12);
    expect(panel().querySelector('[data-bevel-reading="face"]').textContent).toBe('0.577 in');
    expect(panel().querySelector('[data-bevel-reference]').textContent).toContain('0.5 / cos(30°) = 0.5 / 0.866 = 0.577"');
    expect(panel().querySelector('[data-bevel-formula]').textContent).toBe('Face = 0.5 ÷ cos(30°) = 0.577 in');
  });

  it('keeps the half-inch thickness fixed while angle changes the actual face and run geometry', async () => {
    await mount();
    for (const [degrees, face, run] of [[0, 0.5, 0], [30, 1 / Math.sqrt(3), 0.5 / Math.sqrt(3)], [45, Math.SQRT1_2, 0.5], [60, 1, Math.sqrt(3) / 2]]) {
      await angle(degrees);
      expect(value('thickness')).toBe(0.5); expect(value('face')).toBeCloseTo(face, 12); expect(value('run')).toBeCloseTo(run, 12);
      const drawn = panel().querySelector('[data-bevel-face]');
      expect(coord(drawn, 'x2')).toBe(470); expect(coord(drawn, 'y1')).toBe(130); expect(coord(drawn, 'y2')).toBe(250);
      expect((coord(drawn, 'x2') - coord(drawn, 'x1')) / 240).toBeCloseTo(run, 12);
      expect(Math.hypot(coord(drawn, 'x2') - coord(drawn, 'x1'), coord(drawn, 'y2') - coord(drawn, 'y1')) / 240).toBeCloseTo(face, 12);
    }
  });

  it('draws the active arc at the correct vertex and along the face ray in both angle lenses', async () => {
    await mount();
    for (const degrees of [1, 15, 30, 45, 60]) {
      await angle(degrees);
      const drawn = panel().querySelector('[data-bevel-face]');
      const top = [coord(drawn, 'x1'), 130], bottom = [470, 250];
      for (const mode of ['vertical', 'horizontal']) {
        await lens(mode);
        const arc = panel().querySelector('[data-bevel-active-arc]'), center = mode === 'vertical' ? bottom : top;
        expect(Number(arc.dataset.centerX)).toBe(center[0]); expect(Number(arc.dataset.centerY)).toBe(center[1]);
        const from = [Number(arc.dataset.fromX), Number(arc.dataset.fromY)], to = [Number(arc.dataset.toX), Number(arc.dataset.toY)];
        expect(Math.hypot(from[0] - center[0], from[1] - center[1])).toBeCloseTo(28, 12);
        expect(Math.hypot(to[0] - center[0], to[1] - center[1])).toBeCloseTo(28, 12);
        const faceRay = mode === 'vertical' ? [top[0] - bottom[0], top[1] - bottom[1]] : [bottom[0] - top[0], bottom[1] - top[1]];
        expect((to[0] - center[0]) * faceRay[1] - (to[1] - center[1]) * faceRay[0]).toBeCloseTo(0, 9);
        const dot = ((from[0] - center[0]) * (to[0] - center[0]) + (from[1] - center[1]) * (to[1] - center[1])) / (28 * 28);
        expect(Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI).toBeCloseTo(mode === 'vertical' ? degrees : 90 - degrees, 9);
        const tokens = arc.getAttribute('d').match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/gi).map(Number);
        expect(tokens.slice(0, 2)).toEqual(from); expect(tokens.slice(-2)).toEqual(to); expect(tokens[6]).toBe(mode === 'vertical' ? 0 : 1);
      }
    }
  });

  it('changes only the angle reference, location and formula when switching complementary lenses', async () => {
    await mount(); await angle(37);
    const body = panel().querySelector('[data-bevel-body]').getAttribute('d'), face = panel().querySelector('[data-bevel-face]').outerHTML;
    const lengths = [value('thickness'), value('face'), value('run')];
    await lens('horizontal');
    expect(value('angle')).toBe(53); expect(panel().dataset.lens).toBe('horizontal');
    expect(panel().querySelector('[data-bevel-body]').getAttribute('d')).toBe(body);
    expect(panel().querySelector('[data-bevel-face]').outerHTML).toBe(face);
    expect([value('thickness'), value('face'), value('run')]).toEqual(lengths);
    expect(panel().querySelector('[data-bevel-angle-location]').textContent).toContain('upper bevel vertex');
    expect(panel().querySelector('[data-bevel-formula]').textContent).toContain('sin(53°)');
    expect(0.5 / Math.sin(53 * Math.PI / 180)).toBeCloseTo(value('face'), 12);
    await lens('vertical'); expect(value('angle')).toBe(37);
    expect(panel().querySelector('[data-bevel-angle-location]').textContent).toContain('lower bevel vertex');
    expect(panel().querySelector('[data-bevel-formula]').textContent).toContain('cos(37°)');
  });

  it('handles zero run honestly without a fake nonzero vertical-angle arc', async () => {
    await mount(); await angle(0);
    expect(panel().querySelector('[data-bevel-active-arc]')).toBeNull(); expect(panel().querySelector('[data-bevel-zero-angle]')).toBeTruthy();
    expect(panel().querySelector('[data-bevel-right-angle]')).toBeNull();
    expect(panel().querySelector('[data-bevel-degenerate]').textContent).toContain('triangle collapses to a vertical face');
    await lens('horizontal');
    expect(Number(panel().querySelector('[data-bevel-active-arc]').dataset.degrees)).toBe(90);
    const guide = panel().querySelector('[data-bevel-active-guide="horizontal"]');
    expect(coord(guide, 'x2') - coord(guide, 'x1')).toBe(60);
    expect(panel().textContent).not.toMatch(/NaN|Infinity|undefined/);
  });

  it('keeps every numbered marker inside the diagram and separated across the angle range', async () => {
    await mount();
    for (const degrees of [0, 1, 5, 15, 30, 45, 60]) {
      await angle(degrees);
      for (const mode of ['vertical', 'horizontal']) {
        await lens(mode);
        const points = [...panel().querySelectorAll('[data-bevel-marker] circle')].map(c => [coord(c, 'cx'), coord(c, 'cy')]);
        expect(points).toHaveLength(4);
        for (let i = 0; i < points.length; i++) {
          expect(points[i][0] - 16).toBeGreaterThanOrEqual(0); expect(points[i][0] + 16).toBeLessThanOrEqual(640);
          expect(points[i][1] - 16).toBeGreaterThanOrEqual(0); expect(points[i][1] + 16).toBeLessThanOrEqual(330);
          for (let j = i + 1; j < points.length; j++) expect(Math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1])).toBeGreaterThan(32);
        }
      }
    }
  });

  it('bounds finite inputs, ignores invalid events and restores the authored reference without saved writes', async () => {
    const app = await mount(), before = JSON.stringify(app.latest()), writes = app.writes.length;
    const practice = [...host.querySelectorAll('[data-sym2-math]')].map(el => el.outerHTML);
    await angle(999); expect(panel().dataset.angleVertical).toBe('60');
    await angle(-10); expect(panel().dataset.angleVertical).toBe('0');
    await angle(29.8); expect(panel().dataset.angleVertical).toBe('30');
    for (const invalid of ['bad', '', 'Infinity']) await angle(invalid);
    expect(panel().dataset.angleVertical).toBe('30');
    await angle(57); await lens('horizontal'); await reset();
    expect(panel().dataset).toMatchObject({ angleVertical: '30', lens: 'vertical' });
    expect([...host.querySelectorAll('[data-sym2-math]')].map(el => el.outerHTML)).toEqual(practice);
    expect(JSON.stringify(app.latest())).toBe(before); expect(app.writes).toHaveLength(writes);
  });

  it('uses 44px native controls, full-size HTML readings and explicit contrast selections', async () => {
    await mount(true);
    expect(panel().style.background).toBe('rgb(0, 0, 0)'); expect(panel().style.color).toBe('rgb(255, 255, 255)');
    for (const control of panel().querySelectorAll('button,input')) expect(control.style.minHeight).toBe('44px');
    const slider = panel().querySelector('[data-bevel-angle]'); expect(slider.type).toBe('range'); expect(slider.min).toBe('0'); expect(slider.max).toBe('60'); expect(slider.step).toBe('1');
    expect(panel().querySelector(`label[for="${slider.id}"]`)).toBeTruthy();
    const selected = panel().querySelector('[data-bevel-lens="vertical"]');
    expect(selected.getAttribute('aria-pressed')).toBe('true'); expect(selected.style.background).toBe('rgb(255, 255, 0)'); expect(selected.style.color).toBe('rgb(0, 0, 0)');
    expect(panel().querySelectorAll('[data-bevel-reading]')).toHaveLength(4);
    expect(panel().querySelector('svg').getAttribute('aria-label')).toContain('lower bevel vertex');
    expect(panel().querySelector('animate,animateTransform')).toBeNull();
  });

  it('preserves the adjacent geometry lessons and both practice types without exposing the inspector elsewhere', async () => {
    await mount();
    expect(host.textContent).toContain('SOH-CAH-TOA'); expect(host.textContent).toContain('climbing 12" vertical');
    expect(host.textContent).toContain('12 / sin(30°) = 12 / 0.5 = 24"');
    for (const kind of ['brace', 'square']) expect(host.querySelector(`[data-sym2-math="${kind}"]`)).toBeTruthy();
    for (const extra of [{ mb_mode: 'practice' }, { mb_mode: 'quiz' }, { mb_sect: 'arithmetic' }, { mb_sect: 'measure' }]) {
      expect(renderTool('weldLab', { weldLab: { ...BASE, ...extra } })).not.toContain('data-math-bevel=');
    }
  });
});
