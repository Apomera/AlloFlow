import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
let host, root;
const base = { view: 'symbolsReader', sr_view: 'library' };
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab;
  localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab');
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount());
  root = null; host?.remove();
});
function fragment(extra = {}, contrast = false) {
  const el = document.createElement('div');
  el.innerHTML = renderTool('weldLab', { weldLab: { ...base, ...extra } }, { isContrast: contrast });
  return el;
}
async function mount(extra = {}) {
  let latest;
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...base, ...extra } });
    latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData,
      update: (bucket, key, value) => setData(prev => ({ ...prev, [bucket]: { ...prev[bucket], [key]: value } })),
    }));
  }
  host = document.createElement('div'); document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return () => latest;
}
async function click(selector) { await React.act(() => host.querySelector(selector).click()); }
async function probe(value) {
  await React.act(() => Simulate.change(host.querySelector('[data-symbol-run-probe]'), { target: { value: String(value) } }));
}

describe('Symbols length–pitch workbench', () => {
  it.each(['2-6', '2-10', '3-12'])('draws exact weld lengths and centre spacing from the existing %s example', example => {
    const [L, P] = example.split('-').map(Number), el = fragment({ sym3_lp_example: example });
    expect(el.querySelector('[data-symbol-run-value="length"]').textContent).toBe(L + ' in');
    expect(el.querySelector('[data-symbol-run-value="pitch"]').textContent).toBe(P + ' in');
    expect(el.querySelector('[data-symbol-run-value="gap"]').textContent).toBe((P - L) + ' in');
    const beads = [...el.querySelectorAll('[data-symbol-run-bead]')];
    expect(beads.map(b => Number(b.dataset.startIn))).toEqual([0, P, 2 * P]);
    const rects = beads.map(b => b.querySelector('rect'));
    expect(rects.map(r => Number(r.getAttribute('width')))).toEqual([L, L, L].map(v => v * 540 / (2 * P + L)));
    const centres = rects.map(r => Number(r.getAttribute('x')) + Number(r.getAttribute('width')) / 2);
    expect(centres[1] - centres[0]).toBeCloseTo(P * 540 / (2 * P + L), 10);
    expect(el.querySelector('[data-symbol-run-callout] [data-part="lp"] text').textContent).toBe(example);
    expect(el.querySelector('[data-symbol-run-probe]').max).toBe(String(2 * P + L));
  });

  it('distinguishes one weld length, centre pitch and the intervening clear gap with the drawn measurement endpoints', async () => {
    await mount();
    for (const [focus, from, to] of [['length', 0, 2], ['pitch', 1, 7], ['gap', 2, 6]]) {
      await click(`[data-symbol-run-measure="${focus}"]`);
      const measure = host.querySelector('[data-symbol-run-dimension]');
      expect(measure.dataset.symbolRunDimension).toBe(focus);
      expect(Number(measure.dataset.fromIn)).toBe(from);
      expect(Number(measure.dataset.toIn)).toBe(to);
      expect(host.querySelectorAll('[data-symbol-run-measure][aria-pressed="true"]')).toHaveLength(1);
      expect(host.querySelector('[data-symbol-run-explanation]').dataset.symbolRunExplanation).toBe(focus);
    }
    expect(host.querySelector('[data-symbol-run-explanation]').textContent).toContain('not the second number');
  });

  it('moves through welds and gaps, resets only the probe for a new example, and preserves scored answers', async () => {
    const scores = { sym2_pr_ans: { '0_0': 2 }, sym2_b_res: { b1: 1 }, sym2_bp_ans: { bp1: 1 } };
    const latest = await mount(scores);
    for (const [position, region] of [[0, 'weld'], [2, 'weld'], [2.25, 'gap'], [5.75, 'gap'], [6, 'weld'], [8.25, 'gap'], [14, 'weld']]) {
      await probe(position);
      const reading = host.querySelector('[data-symbol-probe-reading]');
      expect(Number(reading.dataset.positionIn)).toBe(position);
      expect(reading.dataset.symbolProbeReading).toBe(region);
      expect(Number(host.querySelector('[data-symbol-run-cursor]').dataset.symbolRunCursor)).toBe(position);
    }
    await click('[data-symbol-run-example="3-12"]');
    expect(latest()).toMatchObject({ ...scores, sym3_lp_example: '3-12' });
    expect(host.querySelector('[data-symbol-probe-reading]').dataset.positionIn).toBe('0');
    expect(host.querySelector('[data-symbol-run-probe]').max).toBe('27');
  });

  it('keeps the symbol side and the illustrated weld lanes synchronized with the original library controls', async () => {
    await mount();
    const labels = { arrow: 'Arrow side (below the line)', other: 'Other side (above the line)', both: 'Both sides' };
    for (const side of ['other', 'both', 'arrow']) {
      const control = [...host.querySelectorAll('[role="radio"]')].find(el => el.textContent.includes(labels[side]));
      await React.act(() => control.click());
      const bench = host.querySelector('[data-symbol-run]');
      expect(bench.dataset.side).toBe(side);
      expect(bench.querySelectorAll('[data-symbol-run-bead]')).toHaveLength(side === 'both' ? 6 : 3);
      expect(bench.querySelectorAll('[data-symbol-run-callout] [data-part="sym"]')).toHaveLength(side === 'both' ? 2 : 1);
      for (const lane of bench.querySelectorAll('[data-symbol-run-lane]')) expect(lane.dataset.active).toBe(String(side === 'both' || side === lane.dataset.symbolRunLane));
    }
  });

  it('keeps the reference workbench out of decoder, builder and blueprint assessment views', () => {
    for (const view of ['anatomy', 'practice', 'builder', 'blueprint']) expect(fragment({ sr_view: view }).querySelector('[data-symbol-run]')).toBeNull();
  });

  it('normalizes saved choices and provides explicit contrast, native controls and readable values', () => {
    for (const bad of ['999-1', {}, null, '__proto__']) {
      const el = fragment({ sym3_lp_example: bad, sym2_lib_side: bad }, true), bench = el.querySelector('[data-symbol-run]');
      expect(bench.dataset.symbolRun).toBe('2-6');
      expect(bench.dataset.side).toBe('arrow');
      expect(bench.textContent).not.toMatch(/NaN|undefined/);
      expect(bench.style.background).toBe('rgb(0, 0, 0)');
      expect(bench.style.color).toBe('rgb(255, 255, 255)');
      expect(bench.querySelector('label').htmlFor).toBe(bench.querySelector('input').id);
      for (const button of bench.querySelectorAll('button')) {
        expect(button.type).toBe('button'); expect(button.style.minHeight).toBe('44px');
      }
      expect(bench.querySelector('[data-symbol-run-callout] [data-part="sym"] path').getAttribute('stroke')).toBe('#ffffff');
      expect(bench.querySelector('animate,animateTransform')).toBeNull();
    }
  });
});
