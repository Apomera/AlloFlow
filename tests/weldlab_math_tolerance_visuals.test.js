import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const initial = { view: 'mathBlueprint', mb_mode: 'browse', mb_sect: 'measure', sym2_m_score: 4, sym2_m_tries: 8, sym2_m_streak: 2, mb_q_score: 2, mb_q_picked: 3 };
let host, root;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab');
});
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); });
async function mount(contrast = false) {
  let latest; const writes = [];
  function App() {
    const [data, setData] = React.useState({ weldLab: initial }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast,
      update: (bucket, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [bucket]: { ...prev[bucket], [key]: value } })); } }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return { latest: () => latest, writes };
}
const panel = () => host.querySelector('[data-math-tolerance]');
async function click(selector) { await React.act(() => host.querySelector(selector).click()); }
async function probe(value) { await React.act(() => Simulate.change(host.querySelector('[data-math-tolerance-probe]'), { target: { value: String(value) } })); }

describe('Tolerance window explorer', () => {
  it('shows the authored bilateral example with its exact sixty-thousandth interval', async () => {
    await mount();
    expect(panel().dataset).toMatchObject({ mathTolerance: 'bilateral', probeThou: '24000', lowerThou: '23970', upperThou: '24030', inside: 'true' });
    expect(panel().querySelector('[data-math-tolerance-limit="lower"]').textContent).toBe('23.970 in');
    expect(panel().querySelector('[data-math-tolerance-limit="upper"]').textContent).toBe('24.030 in');
    expect(panel().querySelector('[data-math-tolerance-reading]').textContent).toContain('Window width: 0.060 in');
    expect(panel().textContent).toContain('Both limit values are included');
    expect(host.textContent).toContain('Tape measure');
    expect(host.textContent).toContain('Practice problems');
    expect(host.querySelectorAll('[data-math-tolerance]')).toHaveLength(1);
  });

  it('includes each exact boundary and rejects only its outward neighbor', async () => {
    await mount();
    for (const mode of ['bilateral', 'unilateral']) {
      await click(`[data-math-tolerance-mode="${mode}"]`);
      for (const edge of ['lower', 'upper']) {
        await click(`[data-math-tolerance-edge="${edge}"]`);
        const boundary = Number(panel().dataset[edge + 'Thou']);
        for (const step of [-1, 0, 1]) {
          const btn = panel().querySelector(`[data-math-tolerance-step="${step}"]`);
          expect(Number(btn.dataset.sampleThou)).toBe(boundary + step);
          await click(`[data-math-tolerance-step="${step}"]`);
          expect(panel().dataset.probeThou).toBe(String(boundary + step));
          expect(panel().dataset.inside).toBe(String(edge === 'lower' ? step >= 0 : step <= 0));
          expect(panel().querySelector(`[data-math-tolerance-step="${step}"]`).getAttribute('aria-pressed')).toBe('true');
        }
      }
    }
  });

  it('holds the measured length and ruler fixed when the authored tolerance changes', async () => {
    await mount(); await probe(23999);
    expect(panel().dataset.inside).toBe('true');
    const before = panel().querySelector('[data-math-tolerance-marker]').getAttribute('x1');
    await click('[data-math-tolerance-mode="unilateral"]');
    expect(panel().dataset).toMatchObject({ probeThou: '23999', lowerThou: '24000', upperThou: '24020', inside: 'false' });
    expect(panel().querySelector('[data-math-tolerance-marker]').getAttribute('x1')).toBe(before);
    expect(panel().querySelector('[data-math-tolerance-reading]').textContent).toContain('Window width: 0.020 in');
    expect(panel().querySelector('[data-math-tolerance-ruler]').getAttribute('viewBox')).toBe('0 0 640 104');
    expect(panel().querySelector('[data-math-tolerance-reading]').textContent).toContain('−0.001'.replace('−', '-'));
    await probe(24021); expect(panel().dataset.inside).toBe('false');
    await click('[data-math-tolerance-mode="bilateral"]');
    expect(panel().dataset).toMatchObject({ probeThou: '24021', inside: 'true' });
  });

  it('maps the bands and measured marker onto one fixed physical scale', async () => {
    await mount();
    expect(panel().querySelector('[data-math-tolerance-band]').getAttribute('x')).toBe('140');
    expect(panel().querySelector('[data-math-tolerance-band]').getAttribute('width')).toBe('360');
    await probe(23950); expect(panel().querySelector('[data-math-tolerance-marker]').getAttribute('x1')).toBe('20');
    await probe(24050); expect(panel().querySelector('[data-math-tolerance-marker]').getAttribute('x1')).toBe('620');
    await click('[data-math-tolerance-mode="unilateral"]');
    expect(panel().querySelector('[data-math-tolerance-band]').getAttribute('x')).toBe('320');
    expect(panel().querySelector('[data-math-tolerance-band]').getAttribute('width')).toBe('120');
    expect(panel().querySelector('[data-math-tolerance-nominal]').getAttribute('x1')).toBe('320');
  });

  it('bounds and rounds probe events and ignores nonnumeric or empty events', async () => {
    await mount(); await probe(99000); expect(panel().dataset.probeThou).toBe('24050');
    await probe(0); expect(panel().dataset.probeThou).toBe('23950');
    await probe(24012.8); expect(panel().dataset.probeThou).toBe('24013');
    await probe('bad'); await probe(''); await probe('Infinity'); expect(panel().dataset.probeThou).toBe('24013');
    expect(panel().textContent).not.toMatch(/NaN|Infinity|undefined/);
  });

  it('leaves saved answers and all scores untouched while exploring', async () => {
    const app = await mount(), before = JSON.stringify(app.latest()), writes = app.writes.length;
    await probe(24030); await click('[data-math-tolerance-mode="unilateral"]');
    await click('[data-math-tolerance-edge="lower"]'); await click('[data-math-tolerance-step="-1"]');
    expect(JSON.stringify(app.latest())).toBe(before); expect(app.writes).toHaveLength(writes);
  });

  it('provides a labeled native slider, semantic selections and explicit contrast colors', async () => {
    await mount(true);
    expect(panel().style.background).toBe('rgb(0, 0, 0)'); expect(panel().style.color).toBe('rgb(255, 255, 255)');
    const slider = panel().querySelector('[data-math-tolerance-probe]');
    expect(slider.type).toBe('range'); expect(slider.step).toBe('1'); expect(slider.style.minHeight).toBe('44px');
    expect(panel().querySelector(`label[for="${slider.id}"]`)).toBeTruthy(); expect(slider.getAttribute('aria-valuetext')).toBe('24.000 in');
    for (const button of panel().querySelectorAll('button')) expect(button.style.minHeight).toBe('44px');
    const chosen = panel().querySelector('[data-math-tolerance-mode="bilateral"]');
    expect(chosen.getAttribute('aria-pressed')).toBe('true'); expect(chosen.style.background).toBe('rgb(255, 255, 0)'); expect(chosen.style.color).toBe('rgb(0, 0, 0)');
    expect(panel().querySelector('[data-math-tolerance-mode="unilateral"]').style.background).toBe('rgb(0, 0, 0)');
    expect(panel().querySelector('[data-math-tolerance-ruler]').getAttribute('aria-label')).toContain('23.970 to 24.030');
    expect(panel().querySelector('animate,animateTransform')).toBeNull();
  });

  it('keeps the new reference explorer outside checked practice, the quiz and other browse topics', () => {
    for (const state of [{ mb_mode: 'practice' }, { mb_mode: 'quiz' }, { mb_sect: 'estimate' }, { mb_sect: 'arithmetic' }]) {
      const html = renderTool('weldLab', { weldLab: { ...initial, ...state } });
      expect(html).not.toContain('data-math-tolerance=');
    }
  });
});
