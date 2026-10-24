// Math review 2 (algebra lane): Coordinate Grid challenge grading. The plot challenge
// passed if ANY of the plotted points was the target, so filling the grid always won;
// the slope check accepted anything within 0.01, so 0.15 passed for 1/7 (0.142857...).
// MATH_REVIEW2_COORDGRID points the suite at another copy (mutation checks).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MATH_REVIEW2_COORDGRID || 'stem_lab/stem_tool_coordgrid.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
beforeEach(() => { resetStemLab(); loadTool(FILE, 'coordinate'); document.body.innerHTML = '<div id="root"></div>'; });
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; });

async function grade(cg) {
  if (root) { await React.act(() => root.unmount()); root = null; }
  document.body.innerHTML = '<div id="root"></div>';
  let latest;
  const award = vi.fn();
  function App() {
    const [state, setState] = React.useState({ _coordGrid: cg });
    latest = state;
    return window.StemLab._registry.coordinate.render(makeCtx({
      toolData: state, setToolData: setState, exploreScore: { correct: 0, total: 0 }, setExploreScore: vi.fn(), awardXP: award, announceToSR: vi.fn(), addToast: vi.fn()
    }));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(() => root.render(React.createElement(App)));
  const b = document.querySelector('button[aria-label="Check"]');
  expect(b).toBeTruthy();
  await React.act(() => b.click());
  return { cg: latest._coordGrid, paid: award.mock.calls.length };
}

describe('plot-a-point challenge', () => {
  const target = { x: 3, y: -2 };
  const everyPoint = [];
  for (let x = -8; x <= 8; x++) for (let y = -8; y <= 8; y++) everyPoint.push({ x, y });

  it('filling the grid with points does not pass', async () => {
    const r = await grade({ gridChallenge: { type: 'plot', target }, gridPoints: everyPoint, streak: 2 });
    expect(r.cg.gridFeedback.correct).toBe(false);
    expect(r.cg.plotsSolved || 0).toBe(0);
    expect(r.paid).toBe(0);
  });

  it('two points, one of them right, is not an answer yet (and does not cost the streak)', async () => {
    const r = await grade({ gridChallenge: { type: 'plot', target }, gridPoints: [{ x: 1, y: 1 }, { x: 3, y: -2 }], streak: 2 });
    expect(r.cg.gridFeedback.correct).toBe(false);
    expect(r.cg.streak).toBe(2);
    expect(r.cg.gridFeedback.msg).toMatch(/one point/i);
  });

  it('grades the single plotted point', async () => {
    const right = await grade({ gridChallenge: { type: 'plot', target }, gridPoints: [{ x: 3, y: -2 }], streak: 2 });
    expect(right.cg.gridFeedback.correct).toBe(true);
    expect(right.cg.plotsSolved).toBe(1);
    expect(right.cg.streak).toBe(3);
    const swapped = await grade({ gridChallenge: { type: 'plot', target }, gridPoints: [{ x: -2, y: 3 }], streak: 2 });
    expect(swapped.cg.gridFeedback.correct).toBe(false);
    expect(swapped.cg.streak).toBe(0);
  });

  it('checking with no point plotted asks for one instead of grading', async () => {
    const r = await grade({ gridChallenge: { type: 'plot', target }, gridPoints: [], streak: 2 });
    expect(r.cg.gridFeedback.correct).toBe(false);
    expect(r.cg.streak).toBe(2);
  });
});

describe('slope tolerance', () => {
  const seventh = { type: 'slope', p1: { x: 0, y: 0 }, p2: { x: 7, y: 1 }, slopeData: { rise: 1, run: 7, value: 1 / 7, display: '1/7' } };
  const slopeOk = async (challenge, rise, run, slope) =>
    (await grade({ gridChallenge: challenge, gridFeedback: { riseAnswer: String(rise), runAnswer: String(run), slopeAnswer: slope }, gridPoints: [] })).cg.gridFeedback.correct;

  it('rejects 0.15 for 1/7', async () => {
    expect(await slopeOk(seventh, 1, 7, '0.15')).toBe(false);
    expect(await slopeOk(seventh, 1, 7, '0.135')).toBe(false);
  });

  it('accepts 1/7 exactly, an equivalent fraction, and 1/7 rounded to 2 or 3 places', async () => {
    for (const s of ['1/7', '2/14', '0.14', '0.143']) expect(await slopeOk(seventh, 1, 7, s), s).toBe(true);
  });

  it('2/3: accepts 0.67, rejects the truncated 0.66', async () => {
    const twoThirds = { type: 'slope', p1: { x: 0, y: 0 }, p2: { x: 3, y: 2 }, slopeData: { rise: 2, run: 3, value: 2 / 3, display: '2/3' } };
    expect(await slopeOk(twoThirds, 2, 3, '0.67')).toBe(true);
    expect(await slopeOk(twoThirds, 2, 3, '0.66')).toBe(false);
  });

  it('reads a mixed number as a mixed number (1 1/2 is 3/2, not 11/2)', async () => {
    const threeHalves = { type: 'slope', p1: { x: 0, y: 0 }, p2: { x: 2, y: 3 }, slopeData: { rise: 3, run: 2, value: 1.5, display: '3/2' } };
    expect(await slopeOk(threeHalves, 3, 2, '1 1/2')).toBe(true);
    expect(await slopeOk(threeHalves, 3, 2, '11/2')).toBe(false);
  });
});
