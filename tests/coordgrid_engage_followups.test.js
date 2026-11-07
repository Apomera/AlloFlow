// Follow-ups from the independent hunt (2026-11-05). Each block failed on the start
// copy; run with COORDGRID_DEEP_FILE=<start copy> to see it.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.COORDGRID_DEEP_FILE || 'stem_lab/stem_tool_coordgrid.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root = null, latest = null, sr = [], xp = [], score = null;
beforeEach(() => {
  resetStemLab();
  loadTool(FILE, 'coordinate');
  latest = null; sr = []; xp = []; score = null;
  window.HTMLElement.prototype.scrollIntoView = function () {};
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null;
  document.body.innerHTML = '';
  delete window.HTMLElement.prototype.scrollIntoView;
  vi.restoreAllMocks();
});

async function mount(cg) {
  document.body.innerHTML = '<div id="root"></div>';
  function App() {
    const [state, setState] = React.useState({ _coordGrid: cg });
    const [es, setEs] = React.useState({ correct: 0, total: 0 });
    latest = state._coordGrid; score = es;
    return window.StemLab._registry.coordinate.render(makeCtx({
      toolData: state, setToolData: setState, exploreScore: es, setExploreScore: setEs, gradeLevel: '7th Grade',
      awardXP: (...a) => xp.push(a), announceToSR: (m) => sr.push(m), addToast: () => {},
    }));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => root.render(React.createElement(App)));
}
const click = async (el) => { expect(el, 'element to click').toBeTruthy(); await React.act(async () => { el.click(); }); };
async function type(el, value) {
  expect(el, 'input to type in').toBeTruthy();
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}
const checkBtn = () => document.querySelector('button[aria-label="Check"]');
const input = (label) => document.querySelector('input[aria-label="' + label + '"]');
const P = (x, y) => ({ x, y });
const NAME = () => ({ type: 'name', target: P(3, -2), tries: 0, hint: 0 });
const SAME = /same answer/i;

describe('checking the same unchanged answer again is not another attempt', () => {
  it('name the point: the second press keeps the item open, keeps the score, and says why', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g6', gridChallenge: NAME(), gridFeedback: { ansX: '-2', ansY: '3' } });
    await click(checkBtn());
    expect(latest.gridChallenge.tries).toBe(1);
    expect(score.total).toBe(1);
    const before = (latest.missedLog || []).length;
    await click(checkBtn());
    expect(latest.gridChallenge.tries, 'unchanged answer did not use a try').toBe(1);
    expect(score.total, 'unchanged answer not scored').toBe(1);
    expect((latest.missedLog || []).length).toBe(before);
    expect(document.querySelector('[data-coordgrid-locked]')).toBeFalsy();
    expect(latest.gridFeedback.msg).toMatch(SAME);
    expect(latest.gridFeedback.msg, 'the named slip stays on screen').toMatch(/swap/i);
    expect(sr[sr.length - 1]).toMatch(SAME);
  });

  it('a changed answer still uses the second try, and closing still works', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g6', gridChallenge: NAME(), gridFeedback: { ansX: '-2', ansY: '3' } });
    await click(checkBtn());
    await click(checkBtn());
    await type(input('Your x-coordinate'), '1');
    await type(input('Your y-coordinate'), '1');
    await click(checkBtn());
    expect(latest.gridChallenge.tries).toBe(2);
    expect(document.querySelector('[data-coordgrid-locked]')).toBeTruthy();
    expect(xp).toEqual([]);
  });

  it('retyping the same number in another form is the same answer', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g6', gridChallenge: NAME(), gridFeedback: { ansX: '-2', ansY: '3' } });
    await click(checkBtn());
    await type(input('Your y-coordinate'), '03');
    await click(checkBtn());
    expect(latest.gridChallenge.tries).toBe(1);
  });

  it('a save from before this change (one miss, no record of the answer) still grades normally', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g6', gridChallenge: Object.assign(NAME(), { tries: 1, lastCode: 'swapped' }), gridFeedback: { ansX: '-2', ansY: '3' } });
    await click(checkBtn());
    expect(latest.gridChallenge.tries).toBe(2);
    expect(document.querySelector('[data-coordgrid-locked]')).toBeTruthy();
  });

  it('plot: the one point, unchanged, checked twice is one attempt', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g6', gridChallenge: { type: 'plot', target: P(2, 3), tries: 0, hint: 0 }, gridPoints: [P(3, 2)] });
    await click(checkBtn());
    await click(checkBtn());
    expect(latest.gridChallenge.tries).toBe(1);
    expect(latest.gridFeedback.msg).toMatch(SAME);
  });

  it('slope and distance tasks', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g8', gridChallenge: { type: 'distance', kind: 'pythag', p1: P(0, 0), p2: P(3, 4), distance: 5, tries: 0, hint: 0 }, gridPoints: [P(0, 0), P(3, 4)], gridFeedback: { distanceAnswer: '7' } });
    await click(checkBtn());
    await click(checkBtn());
    expect(latest.gridChallenge.tries).toBe(1);
  });

  it('transform tab: a rotation answer checked twice unchanged is one attempt', async () => {
    await mount({ cgTab: 'transform', cgLevel: 'g8', tfTask: { type: 'rotate', p: P(3, 1), angle: 90, c: P(0, 0), answer: P(-1, 3), tries: 0, hint: 0, stage: 'answer' } });
    await type(input('Your x-coordinate'), '1');
    await type(input('Your y-coordinate'), '-3');
    await click(checkBtn());
    expect(latest.tfTask.tries).toBe(1);
    await click(checkBtn());
    expect(latest.tfTask.tries).toBe(1);
    expect(latest.tfTask.done).toBeFalsy();
    expect(latest.tfFb.msg).toMatch(SAME);
  });

  it('transform tab: a changed answer still closes the item on the second miss', async () => {
    await mount({ cgTab: 'transform', cgLevel: 'g8', tfTask: { type: 'rotate', p: P(3, 1), angle: 90, c: P(0, 0), answer: P(-1, 3), tries: 0, hint: 0, stage: 'answer' } });
    await type(input('Your x-coordinate'), '1');
    await type(input('Your y-coordinate'), '-3');
    await click(checkBtn());
    await type(input('Your x-coordinate'), '5');
    await click(checkBtn());
    expect(latest.tfTask.done).toBe(true);
  });

  it('chess find: a second press on the same wrong square is not a second try', async () => {
    await mount({ cgTab: 'maps', mapScenario: 'chess', chessPracticeOn: true, chessChallenge: { type: 'find', target: 'e4', tries: 0 } });
    const sq = () => document.querySelector('[role="button"][aria-label*="h8"]');
    const press = async () => { await React.act(async () => { sq().dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }); };
    expect(sq(), 'h8 square').toBeTruthy();
    await press();
    expect(latest.chessChallenge.tries).toBe(1);
    await press();
    expect(latest.chessFeedback || null, 'the square stays open').toBe(null);
    expect(sr[sr.length - 1]).toMatch(SAME);
  });
});

describe('the world map, typed path', () => {
  it('the same latitude and longitude placed again do not use the second try; a new spot does', async () => {
    await mount({ cgTab: 'maps', mapScenario: 'world', worldPracticeOn: true, worldChallenge: { lat: 40, lon: -74, cityName: 'New York', cityId: 'nyc', tries: 0 }, worldTypedLat: '-60', worldTypedLon: '100' });
    const btn = () => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Check my guess');
    expect(btn(), 'the typed-path button').toBeTruthy();
    await click(btn());
    expect(latest.worldChallenge.tries).toBe(1);
    await click(btn());
    expect(latest.worldFeedback || null, 'still open').toBe(null);
    expect(latest.worldRetryMsg).toMatch(SAME);
    expect(sr[sr.length - 1]).toMatch(SAME);
    await mount(Object.assign({}, latest, { worldTypedLat: '-50' }));
    await click(btn());
    expect(latest.worldFeedback.correct).toBe(false);
  });
});

describe('the Plotted announcement says what comes next on a plot task', () => {
  const gridEl = () => document.querySelector('[data-coordgrid-grid], [role="application"], svg[tabindex="0"]');
  const keyOn = async (el, key) => { await React.act(async () => { el.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); }); };
  it('one point on a plot task: tells the student to choose Check; plotting alone does not grade', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g6', gridChallenge: { type: 'plot', target: P(2, 3), tries: 0, hint: 0 }, coordinateInputX: 1, coordinateInputY: 1 });
    await keyOn(gridEl(), 'Enter');
    expect(sr[sr.length - 1]).toBe('Plotted (1, 1), in quadrant I. Then choose Check.');
    expect(latest.gridChallenge.tries, 'no grade until Check').toBe(0);
    expect(latest.gridFeedback || {}).not.toHaveProperty('msg', expect.stringContaining('Correct'));
  });
  it('free plotting has no Check, so no such words', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g6', coordinateInputX: 1, coordinateInputY: 1 });
    await keyOn(gridEl(), 'Enter');
    expect(sr[sr.length - 1]).toBe('Plotted (1, 1), in quadrant I.');
  });
  it('a second point on a plot task is not told to check: Check would refuse it', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g6', gridChallenge: { type: 'plot', target: P(2, 3), tries: 0, hint: 0 }, gridPoints: [P(4, 4)], coordinateInputX: 1, coordinateInputY: 1 });
    await keyOn(gridEl(), 'Enter');
    expect(sr[sr.length - 1]).toBe('Plotted (1, 1), in quadrant I.');
  });
});
