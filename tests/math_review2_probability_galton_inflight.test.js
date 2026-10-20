// Math review 2 (2026-10-19): the Galton board lost balls that were still in
// the air. Every drop is counted toward totalTrials the moment it is clicked,
// but the bins only got a ball when its animation finished, so:
//  - a second "Drop 1"/"Drop 10" while balls were falling cancelled them;
//  - a "Drop 100"/"Drop 1000" during an animation was overwritten on the next
//    animation tick by its stale copy of the bins (all 100/1000 vanished);
//  - leaving the mode or the tool mid-flight dropped them, and the frozen
//    yellow balls stayed drawn on the board.
// Reset is the one place that may discard them, and it says so by zeroing.
// MATH_REVIEW2_PROBABILITY_SRC lets a mutation run point this at a variant.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = process.env.MATH_REVIEW2_PROBABILITY_SRC || 'stem_lab/stem_tool_probability.js';

const mounted = [];
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  resetStemLab();
  document.body.innerHTML = '';
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadTool(SOURCE, 'probability');
});
afterEach(async () => {
  while (mounted.length) {
    const m = mounted.pop();
    if (!m.unmounted) await React.act(async () => m.root.unmount());
    m.container.remove();
  }
  vi.useRealTimers();
});

// The hub keeps tool data OUTSIDE the tool, so a write made while the tool is
// unmounting still lands. Model that with an external store.
async function mount(initial) {
  const cfg = window.StemLab._registry.probability;
  const store = { toolData: { probability: initial } };
  const container = document.createElement('div');
  document.body.appendChild(container);
  let force = null;
  const setToolData = (fn) => {
    store.toolData = typeof fn === 'function' ? fn(store.toolData) : fn;
    if (force) force();
  };
  function Host() {
    const [, setTick] = React.useState(0);
    force = () => setTick((n) => n + 1);
    return cfg.render(makeCtx({ toolData: store.toolData, setToolData }));
  }
  const root = ReactDOMClient.createRoot(container);
  await React.act(async () => { root.render(React.createElement(Host)); });
  const entry = { root, container, unmounted: false };
  mounted.push(entry);
  return {
    container,
    get p() { return store.toolData.probability || {}; },
    unmount: async () => { force = null; await React.act(async () => root.unmount()); entry.unmounted = true; },
  };
}

const advance = (ms) => React.act(async () => { vi.advanceTimersByTime(ms); });
const press = (m, label) => React.act(async () => {
  const b = m.container.querySelector('button[aria-label="' + label + '"]');
  expect(b, 'no button ' + label).toBeTruthy();
  b.click();
});
const landed = (p) => (p.galtonBins || []).reduce((a, b) => a + b, 0);
// 12 peg rows -> 13 steps a ball; balls spawn every 2 ticks of 100 ms.
const SETTLE = 6000;

describe('Galton board keeps every ball it was asked to drop', () => {
  it('a second small drop while balls are falling adds to them', async () => {
    const m = await mount({ mode: 'galton', results: [], trials: 0 });
    await press(m, 'Drop 1 ball');
    await advance(250);
    await press(m, 'Drop 1 ball');
    await advance(250);
    await press(m, 'Drop 10 balls');
    await advance(SETTLE);
    expect(landed(m.p), 'balls in flight were cancelled by the next drop').toBe(12);
    expect(m.p.galtonFalling || []).toEqual([]);
  });

  it('an instant drop during an animation is not overwritten by it', async () => {
    const m = await mount({ mode: 'galton', results: [], trials: 0 });
    await press(m, 'Drop 10 balls');
    await advance(300);
    await press(m, 'Drop 100 balls');
    expect(landed(m.p)).toBeGreaterThanOrEqual(100);
    await advance(SETTLE);
    expect(landed(m.p), 'the 100 instant balls vanished on the next animation tick').toBe(110);
  });

  it('balls in flight when the student switches mode still land in the bins', async () => {
    const m = await mount({ mode: 'galton', showAllExperiments: true, results: [], trials: 0 });
    await press(m, 'Drop 10 balls');
    await advance(400);
    expect(landed(m.p)).toBe(0);
    await React.act(async () => { m.container.querySelector('button[data-probability-mode="coin"]').click(); });
    await advance(SETTLE);
    expect(m.p.mode).toBe('coin');
    expect(landed(m.p), 'switching mode lost the falling balls').toBe(10);
    expect(m.p.galtonFalling || []).toEqual([]);
  });

  it('leaving the tool mid-flight lands the balls and leaves no frozen ones drawn', async () => {
    const m = await mount({ mode: 'galton', results: [], trials: 0 });
    await press(m, 'Drop 10 balls');
    await advance(1500);
    const partial = landed(m.p);
    expect(partial).toBeGreaterThan(0);
    expect(partial).toBeLessThan(10);
    await m.unmount();
    await advance(SETTLE);
    expect(landed(m.p), 'leaving the tool lost the falling balls').toBe(10);
    expect(m.p.galtonFalling || [], 'frozen balls left drawn on the board').toEqual([]);
  });

  it('Reset still empties the board, including balls in the air', async () => {
    const m = await mount({ mode: 'galton', results: [], trials: 0 });
    await press(m, 'Drop 10 balls');
    await advance(1500);
    expect(landed(m.p)).toBeGreaterThan(0);
    await React.act(async () => {
      Array.from(m.container.querySelectorAll('button')).find((b) => b.textContent.trim() === '↻ Reset').click();
    });
    await advance(SETTLE);
    expect(landed(m.p), 'balls landed after Reset').toBe(0);
    expect(m.p.galtonFalling || []).toEqual([]);
  });
});
