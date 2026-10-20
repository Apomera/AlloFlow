// Math review 3: Coordinate Grid locks an item once a checker has shown its answer.
// A wrong slope check printed "rise should be 2, run should be 3, slope should be
// 2/3" and a wrong distance check printed "Distance = 10.0"; typing those back in
// then paid full score, streak, XP and quest credit. Decision (Aaron, 10-19): once
// the answer is shown the item is locked (no credit, inputs disabled, "Answer shown.
// Try the next one."), keyed by the item and kept in tool state, so a reload or a
// grid click cannot reopen it. An item solved before any reveal pays as before.
// MATH_REVIEW3_COORDGRID points the suite at another copy (mutation checks).
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MATH_REVIEW3_COORDGRID || 'stem_lab/stem_tool_coordgrid.js';
const LOCKED = 'Answer shown. Try the next one.';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root = null;
let latest = null;
let explore = null;
let xp = [];

beforeEach(() => { resetStemLab(); loadTool(FILE, 'coordinate'); latest = null; explore = null; xp = []; });
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null;
  document.body.innerHTML = '';
});

async function mount(cg) {
  if (root) { await React.act(async () => root.unmount()); root = null; }
  document.body.innerHTML = '<div id="root"></div>';
  function App() {
    const [state, setState] = React.useState({ _coordGrid: cg });
    const [es, setEs] = React.useState({ correct: 0, total: 0 });
    latest = state._coordGrid;
    explore = es;
    return window.StemLab._registry.coordinate.render(makeCtx({
      toolData: state, setToolData: setState, exploreScore: es, setExploreScore: setEs,
      awardXP: (id, amt, why) => { xp.push(why); }, announceToSR: () => {}, addToast: () => {}
    }));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => root.render(React.createElement(App)));
}

const input = (sel) => document.querySelector('input[aria-label' + sel + ']');
const checkBtn = () => document.querySelector('button[aria-label="Check"]');
const pageText = () => document.body.textContent.replace(/\s+/g, ' ');

async function type(sel, value) {
  const el = input(sel);
  expect(el, sel).toBeTruthy();
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}
async function click(el) { await React.act(async () => { el.click(); }); }
async function pressEnter(el) {
  await React.act(async () => { el.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
}
// Every way a student can submit: the Check button and Enter in the answer box.
async function submit(enterSel) {
  const b = checkBtn();
  if (b) await click(b);
  const el = input(enterSel);
  if (el) await pressEnter(el);
}

// Points outside the -6..6 the random generators use, so a new problem never
// repeats the locked one.
const SLOPE = { type: 'slope', p1: { x: 0, y: 0 }, p2: { x: 9, y: 6 }, slopeData: { rise: 6, run: 9, value: 2 / 3, display: '2/3' } };
const DIST = { type: 'distance', p1: { x: 0, y: 0 }, p2: { x: 8, y: 6 }, distance: 10 };
const slopeStart = () => ({ gridChallenge: SLOPE, gridFeedback: { slopeAnswer: '' }, gridPoints: [SLOPE.p1, SLOPE.p2], streak: 2, bestStreak: 2 });
const distStart = () => ({ gridChallenge: DIST, gridFeedback: { distanceAnswer: '' }, gridPoints: [DIST.p1, DIST.p2], streak: 2, bestStreak: 2 });

async function typeSlope(rise, run, slope) {
  await type('^="Rise"', rise);
  await type('^="Run"', run);
  await type('^="Slope as"', slope);
}
function expectNoCredit(kind) {
  expect(latest.gridFeedback && latest.gridFeedback.correct, kind + ' marked correct').toBeFalsy();
  expect(latest[kind + 'Solved'] || 0, kind + ' quest count').toBe(0);
  expect(latest.streak, 'streak').toBe(0);
  expect(explore.correct, 'score').toBe(0);
  expect(xp, 'XP').toEqual([]);
}

describe('slope: a wrong check shows the answer and locks the item', () => {
  it('typing the shown answer back in earns nothing, and says why', async () => {
    await mount(slopeStart());
    await typeSlope('6', '8', '3/4');
    await click(checkBtn());
    expect(latest.gridFeedback.correct).toBe(false);
    expect(latest.gridFeedback.msg).toMatch(/run should be 9/);
    await typeSlope('6', '9', '2/3');
    await submit('^="Slope as"');
    expectNoCredit('slopes');
    expect(pageText().includes(LOCKED), 'lock notice').toBe(true);
    for (const sel of ['^="Rise"', '^="Run"', '^="Slope as"']) expect(input(sel).disabled, sel + ' disabled').toBe(true);
    expect(checkBtn().disabled, 'Check disabled').toBe(true);
  });

  it('a grid click and a reload do not reopen it', async () => {
    await mount(slopeStart());
    await typeSlope('1', '1', '1');
    await click(checkBtn());
    // The keyboard plot button at (0, 0) hits the challenge point, which used to clear the feedback.
    const plot = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Plot or remove point');
    expect(plot, 'plot button').toBeTruthy();
    await click(plot);
    // Reload with the shown answer typed in.
    await mount(Object.assign({}, latest, { gridFeedback: Object.assign({}, latest.gridFeedback, { riseAnswer: '6', runAnswer: '9', slopeAnswer: '2/3', msg: null }) }));
    await submit('^="Slope as"');
    expectNoCredit('slopes');
    expect(pageText().includes(LOCKED), 'lock notice after reload').toBe(true);
  });

  it('a new problem is open again', async () => {
    await mount(slopeStart());
    await typeSlope('1', '1', '1');
    await click(checkBtn());
    await click(document.querySelector('button[aria-label="Find Slope"]'));
    expect(latest.gridChallenge.p2).not.toEqual(SLOPE.p2);
    expect(input('^="Slope as"').disabled).toBe(false);
    expect(pageText().includes(LOCKED)).toBe(false);
  });

  it('solved before any reveal pays once, as before', async () => {
    await mount(slopeStart());
    await typeSlope('6', '9', '2/3');
    await submit('^="Slope as"');
    expect(latest.gridFeedback.correct).toBe(true);
    expect(latest.slopesSolved).toBe(1);
    expect(latest.streak).toBe(3);
    expect(xp.filter((w) => w === 'slope calc').length).toBe(1);
    expect(pageText().includes(LOCKED)).toBe(false);
  });

  it('a blank box is not an attempt and locks nothing', async () => {
    await mount(slopeStart());
    await type('^="Rise"', '6');
    await click(checkBtn());
    await typeSlope('6', '9', '2/3');
    await click(checkBtn());
    expect(latest.gridFeedback.correct).toBe(true);
    expect(latest.slopesSolved).toBe(1);
  });
});

describe('distance: a wrong check shows the answer and locks the item', () => {
  it('typing the shown distance back in earns nothing, even after a reload', async () => {
    await mount(distStart());
    await type('="Distance answer"', '7');
    await click(checkBtn());
    expect(latest.gridFeedback.msg).toMatch(/Distance = 10\.0/);
    await type('="Distance answer"', '10');
    await submit('="Distance answer"');
    expectNoCredit('distance');
    expect(input('="Distance answer"').disabled).toBe(true);
    expect(pageText().includes(LOCKED)).toBe(true);
    await mount(Object.assign({}, latest, { gridFeedback: { distanceAnswer: '10' } }));
    await submit('="Distance answer"');
    expectNoCredit('distance');
  });

  it('solved before any reveal pays once, as before', async () => {
    await mount(distStart());
    await type('="Distance answer"', '10');
    await submit('="Distance answer"');
    expect(latest.gridFeedback.correct).toBe(true);
    expect(latest.distanceSolved).toBe(1);
    expect(xp.filter((w) => w === 'distance calc').length).toBe(1);
  });
});

describe('plot: the feedback only repeats the prompt, so a retry still counts', () => {
  it('wrong, then right, earns the plot', async () => {
    const target = { x: 3, y: -2 };
    await mount({ gridChallenge: { type: 'plot', target }, gridPoints: [{ x: -2, y: 3 }], streak: 0 });
    await click(checkBtn());
    expect(latest.gridFeedback.correct).toBe(false);
    await mount(Object.assign({}, latest, { gridPoints: [target], gridFeedback: null }));
    await click(checkBtn());
    expect(latest.gridFeedback.correct).toBe(true);
    expect(latest.plotsSolved).toBe(1);
    expect(pageText().includes(LOCKED)).toBe(false);
  });
});
