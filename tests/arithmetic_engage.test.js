// Arithmetic Strategy Studio engagement build (2026-11-04):
// 1. the student makes each trade / take-away in the place-value walk (no "Next step" slideshow);
// 2. K-2 make-ten with a ten frame, and the strategy choice optional in K-2 number talks;
// 3. a calmer first screen: a one-card "Next" path, the tagline in "About this studio";
// 4. Start lands on the problem and focuses it;
// 5. "See it with disks" after a named Practice miss (a hint tier; the total stays hidden);
// plus the "1 more disk" plural and place counts in words ("8 tens + 5 ones", not "8 × 10 + 5 × 1").
// ARITH_ENGAGE_FILE points the suite at an older copy to prove each gate fails on it.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const FILE = process.env.ARITH_ENGAGE_FILE || 'stem_lab/stem_tool_arithmetic.js';
const ID = 'arithmeticStudio';
let root = null;

beforeEach(() => { resetStemLab(); document.body.innerHTML = '<div id="root"></div>'; });
afterEach(async () => { if (root) await React.act(async () => root.unmount()); root = null; });

function pure() { loadTool(FILE, ID); return window.ArithmeticStrategyPure; }

async function mount(initial, overrides) {
  const tool = loadTool(FILE, ID);
  const view = { awards: [], announcements: [] };
  function App() {
    const [state, setState] = React.useState(initial);
    view.state = state;
    view.set = setState;
    return tool.render(makeCtx(Object.assign({
      toolData: state, setToolData: setState,
      awardXP: (...args) => view.awards.push(args),
      announceToSR: (m) => view.announcements.push(m),
    }, overrides || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => root.render(React.createElement(App)));
  view.d = () => view.state._arithmeticStudio || {};
  return view;
}
async function type(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await React.act(async () => { setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function click(el) { await React.act(async () => { el.click(); }); }
const findButton = (label) => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === label || b.getAttribute('aria-label') === label);
function button(label) { const el = findButton(label); expect(el, label).toBeTruthy(); return el; }
const walkMove = () => document.querySelector('[data-walk-next]');
const count = (place) => Number(document.querySelector(`[data-place="${place}"]`).getAttribute('data-count'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function exposed(el) {
  el = el || document.getElementById('root');
  const parts = [el.textContent];
  el.querySelectorAll('[aria-label]').forEach((n) => parts.push(n.getAttribute('aria-label')));
  return parts.join(' | ');
}
const showsNumber = (s, n) => new RegExp('(^|[^0-9.,])' + n + '(?![0-9]|[.,][0-9])').test(s);

describe('the student makes each exchange in the place-value walk', () => {
  it('58 + 27: "Trade 10 ones for 1 ten" replaces "Next step"; counts come from the step engine; the total stays "?"', async () => {
    const P = pure();
    const walk = P.placeValueStages('add', 58, 27);
    const view = await mount({ _arithmeticStudio: { tab: 'learn', operation: 'add', a: 58, b: 27 } });
    expect(findButton('Next step')).toBeUndefined();
    const move = walkMove();
    expect(move.textContent).toBe('Trade 10 ones for 1 ten');
    expect([count(10), count(1)]).toEqual([walk.stages[0].counts[1], walk.stages[0].counts[0]]);
    // The ten disks that will move are marked, in the ones place only.
    expect(document.querySelectorAll('[data-place="1"] [data-disk-marked]')).toHaveLength(10);
    expect(document.querySelectorAll('[data-place="10"] [data-disk-marked]')).toHaveLength(0);
    move.focus();
    await click(move);
    expect([count(10), count(1)]).toEqual([walk.stages[1].counts[1], walk.stages[1].counts[0]]);
    expect(view.d().exchangeStep).toBe(1);
    // Done: the same button stays (aria-disabled) and keeps focus.
    expect(walkMove()).toBe(move);
    expect(move.getAttribute('aria-disabled')).toBe('true');
    expect(move.textContent).toBe('All steps are done');
    expect(document.activeElement).toBe(move);
    await click(move);
    expect(view.d().exchangeStep).toBe(1);
    // Place counts in words; the total is "?" until the prediction.
    expect(document.querySelector('[data-model-total]').textContent).toBe('8 tens + 5 ones = ?');
    expect(showsNumber(exposed(document.querySelector('[data-place-value-model]')), 85)).toBe(false);
    expect(document.querySelector('[data-place-value-model]').textContent).not.toContain('×');
    // "1 more disk", not "1 more disks".
    expect(document.querySelector('[data-place="10"]').textContent).toContain('1 more disk than the previous step');
    expect(document.querySelector('[data-place="1"]').textContent).toContain('10 fewer disks than the previous step');
  });

  it('a tap on the marked disks makes the same trade', async () => {
    const view = await mount({ _arithmeticStudio: { tab: 'learn', operation: 'add', a: 58, b: 67 } });
    const source = document.querySelector('[data-trade-source="true"]');
    expect(source.getAttribute('data-place')).toBe('1');
    await click(source.querySelector('[role="img"]'));
    expect(view.d().exchangeStep).toBe(1);
    expect(walkMove().textContent).toBe('Trade 10 tens for 1 hundred');
    expect(document.querySelector('[data-trade-source="true"]').getAttribute('data-place')).toBe('10');
  });

  it('102 − 38: each move is named by the step engine (trade, take away, check)', async () => {
    const P = pure();
    const walk = P.placeValueStages('subtract', 102, 38);
    await mount({ _arithmeticStudio: { tab: 'learn', operation: 'subtract', a: 102, b: 38 } });
    const labels = [];
    for (let i = 1; i < walk.stages.length; i++) {
      labels.push(walkMove().textContent);
      await click(walkMove());
      expect([count(100), count(10), count(1)]).toEqual([walk.stages[i].counts[2], walk.stages[i].counts[1], walk.stages[i].counts[0]]);
    }
    expect(labels).toEqual(['Trade 1 hundred for 10 tens', 'Trade 1 ten for 10 ones', 'Take away 8 ones', 'Take away 3 tens', 'Check that every place is settled']);
    expect(walkMove().getAttribute('aria-disabled')).toBe('true');
  });

  it('nothing to trade: 23 + 14 says so instead of offering a move', async () => {
    await mount({ _arithmeticStudio: { tab: 'learn', operation: 'add', a: 23, b: 14 } });
    expect(walkMove()).toBeNull();
    expect(document.querySelector('[data-walk-nothing]').textContent).toContain('nothing to trade');
  });
});

describe('K-2 make-ten with a ten frame', () => {
  it('counters move into the frame one at a time; the answer box is open without a strategy; XP stays on the typed answer', async () => {
    const P = pure();
    const item = P.genMentalItem('nt', 'k2', 0);
    expect(item.key).toBe('makeTen');
    const fit = P.mentalFit('makeTen', 'add', item.a, item.b).vals;
    const view = await mount({ _arithmeticStudio: { tab: 'mental', mmMode: 'talk', genBand: 'k2', ntIndex: 0 } }, { gradeBand: 'k2', gradeLevel: '1st Grade' });
    const frame = () => document.querySelector('[data-ten-frame]');
    expect(frame()).toBeTruthy();
    const cells = (kind) => frame().querySelectorAll(`[data-ten-frame-cell="${kind}"]`).length;
    expect([cells('base'), cells('moved'), cells('empty')]).toEqual([fit.x % 10, 0, 10 - fit.x % 10]);
    // Only one counter is a tab stop.
    expect([...frame().querySelectorAll('[data-ten-frame-counter]')].filter((b) => b.tabIndex === 0)).toHaveLength(1);
    const answer = document.querySelector('[data-nt-answer]');
    expect(answer.disabled).toBe(false);
    for (let i = 0; i < fit.gap; i++) await click(frame().querySelector('[data-ten-frame-counter][tabindex="0"]'));
    expect([cells('base'), cells('moved'), cells('empty')]).toEqual([fit.x % 10, fit.gap, 0]);
    expect(frame().querySelectorAll('[data-ten-frame-counter]')).toHaveLength(0);
    expect(frame().querySelectorAll('[data-ten-frame-left]')).toHaveLength(fit.rest);
    expect(frame().querySelector('[data-ten-frame-status]').getAttribute('data-ten-frame-status')).toBe('full');
    expect(frame().textContent).toContain(`${fit.x} + ${fit.gap} = ${fit.ten}`);
    // The frame never states the final total, and moving counters pays nothing.
    expect(showsNumber(exposed(document.querySelector('[data-number-talk]')), item.answer)).toBe(false);
    expect(view.awards).toEqual([]);
    await type(document.querySelector('[data-nt-answer]'), String(item.answer));
    await click(button('Check answer'));
    expect(view.d().ntSolved[item.id]).toBe(true);
    expect(view.awards).toEqual([['arithmeticStudio', 2, expect.any(String)]]);
  });

  it('a wrong answer after skipping the strategy still gets named feedback', async () => {
    const P = pure();
    const item = P.genMentalItem('nt', 'k2', 0);
    const view = await mount({ _arithmeticStudio: { tab: 'mental', mmMode: 'talk', genBand: 'k2', ntIndex: 0 } }, { gradeBand: 'k2', gradeLevel: '1st Grade' });
    await type(document.querySelector('[data-nt-answer]'), String(item.answer + 1));
    await click(button('Check answer'));
    expect(view.d().ntFeedback).toBe('try');
    expect(document.querySelector('[data-named-error]')).toBeTruthy();
    expect(view.awards).toEqual([]);
  });

  it('grade 4 number talks still ask for a strategy first (guard: passes on both copies)', async () => {
    await mount({ _arithmeticStudio: { tab: 'mental', mmMode: 'talk', genBand: 'g4', ntIndex: 0 } });
    expect(document.querySelector('[data-ten-frame]')).toBeNull();
    expect(document.querySelector('[data-number-talk] input[type="number"]').disabled).toBe(true);
  });
});

describe('a calmer first screen', () => {
  it('one "Next" card with one Start; the full list on request; the tagline lives in "About this studio"', async () => {
    const view = await mount({ _arithmeticStudio: {} }, { gradeBand: 'g35', gradeLevel: '4th Grade' });
    const path = document.querySelector('[data-arithmetic-path]');
    expect(path.querySelectorAll('[data-path-go]')).toHaveLength(1);
    expect(path.querySelector('[data-path-next-card]').getAttribute('data-path-next-card')).toBe('g4_addmulti');
    expect(path.querySelectorAll('[data-path-step]')).toHaveLength(0);
    const tagline = 'Build meaning first, compare strategies, and use estimation to check every result.';
    expect(document.querySelector('header').textContent).not.toContain(tagline);
    expect(document.querySelector('[data-arithmetic-about]').textContent).toContain(tagline);
    expect(document.querySelector('[data-arithmetic-about]').open).toBe(false);
    await click(button('Show all steps'));
    expect(view.d().pathHidden).toBe(false);
    expect(document.querySelectorAll('[data-path-step]')).toHaveLength(6);
  });
});

describe('Start lands on the problem and focuses it', () => {
  it('grade 4: Start opens Practice and focuses the estimate box', async () => {
    const view = await mount({ _arithmeticStudio: {} }, { gradeBand: 'g35', gradeLevel: '4th Grade' });
    await click(document.querySelector('[data-path-go]'));
    await React.act(async () => { await wait(80); });
    expect(view.d().tab).toBe('practice');
    const el = document.activeElement;
    expect(el.tagName).toBe('INPUT');
    expect(el.disabled).toBe(false);
    expect(el.closest('label').textContent).toContain('Estimate');
  });

  it('K-2: Start opens make-ten and focuses the first ten-frame counter', async () => {
    await mount({ _arithmeticStudio: {} }, { gradeBand: 'k2', gradeLevel: '1st Grade' });
    await click(document.querySelector('[data-path-go="k2_make_ten"]'));
    await React.act(async () => { await wait(80); });
    expect(document.activeElement.hasAttribute('data-ten-frame-counter')).toBe(true);
  });
});

// Follow-up (2026-11-04): in Learn the disks and their move come right after the
// problem, with the prediction card beside them (wraps below on narrow screens).
describe('Learn: the disks and their move come right after the problem', () => {
  const FOLLOWS = (x, y) => !!(x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING);
  const tabStops = () => [...document.querySelectorAll('#arithmetic-studio-panel button, #arithmetic-studio-panel input, #arithmetic-studio-panel summary')].filter((n) => !n.disabled && n.tabIndex >= 0);

  it('model first, then the prediction card, in one wrapping row; the move sits above the disks and comes first in tab order', async () => {
    await mount({ _arithmeticStudio: { tab: 'learn', operation: 'add', a: 58, b: 27 } });
    const ws = document.querySelector('[data-learn-workspace]');
    expect(ws, 'learn workspace row').toBeTruthy();
    expect([ws.style.display, ws.style.flexWrap]).toEqual(['flex', 'wrap']);
    const modelCol = ws.querySelector('[data-learn-model]');
    const side = ws.querySelector('[data-learn-side]');
    expect(modelCol.parentElement).toBe(ws);
    expect(side.parentElement).toBe(ws);
    expect(Number(modelCol.style.flexGrow)).toBeGreaterThan(Number(side.style.flexGrow));
    const model = modelCol.querySelector('[data-place-value-model]');
    const predict = side.querySelector('[data-learn-predict]');
    expect(model && predict).toBeTruthy();
    expect(FOLLOWS(model, predict)).toBe(true);
    // The model toggles live with the prediction card.
    expect(side.contains(button('Hide model'))).toBe(true);
    expect(side.contains(button('Reveal strategy steps'))).toBe(true);
    // The move is above the disks it changes.
    expect(FOLLOWS(walkMove(), document.querySelector('[data-place]'))).toBe(true);
    // Tab order: operands, then the move, then the prediction.
    const stops = tabStops();
    const predictInput = predict.querySelector('input');
    const iMove = stops.indexOf(walkMove());
    expect(iMove).toBeGreaterThan(stops.indexOf(document.querySelector('#arithmetic-studio-panel input')));
    expect(iMove).toBeLessThan(stops.indexOf(predictInput));
    // (Check my prediction is disabled until a value is typed.)
    expect(FOLLOWS(predictInput, button('Check my prediction'))).toBe(true);
  });

  it('Hide model keeps focus on the toggle and the prediction card stays; Show model brings the disks back first', async () => {
    await mount({ _arithmeticStudio: { tab: 'learn', operation: 'add', a: 58, b: 27 } });
    const predict = document.querySelector('[data-learn-predict]');
    const toggle = button('Hide model');
    toggle.focus();
    await click(toggle);
    expect(document.querySelector('[data-place-value-model]')).toBeNull();
    expect(document.querySelector('[data-learn-model]')).toBeNull();
    expect(document.activeElement).toBe(toggle);
    expect(toggle.textContent).toBe('Show model');
    expect(document.querySelector('[data-learn-predict]')).toBe(predict);
    await click(toggle);
    expect(document.activeElement).toBe(toggle);
    expect(FOLLOWS(document.querySelector('[data-place-value-model]'), predict)).toBe(true);
    expect(walkMove().textContent).toBe('Trade 10 ones for 1 ten');
  });

  it('the final total stays "?" through trades and a wrong prediction, and opens only on a right one (focus stays on Check)', async () => {
    await mount({ _arithmeticStudio: { tab: 'learn', operation: 'add', a: 58, b: 27 } });
    const total = () => document.querySelector('[data-model-total]').textContent;
    expect(total()).toBe('7 tens + 15 ones = ?');
    const move = walkMove();
    move.focus();
    await click(move);
    expect(document.activeElement).toBe(move);
    expect(total()).toBe('8 tens + 5 ones = ?');
    const input = document.querySelector('[data-learn-predict] input');
    const check = button('Check my prediction');
    await type(input, '75');
    check.focus();
    await click(check);
    expect(document.activeElement).toBe(check);
    expect(total()).toBe('8 tens + 5 ones = ?');
    expect(showsNumber(exposed(document.querySelector('[data-place-value-model]')), 85)).toBe(false);
    await type(input, '85');
    await click(check);
    expect(document.activeElement).toBe(check);
    expect(total()).toBe('8 tens + 5 ones = 85');
  });
});

describe('"See it with disks" after a named Practice miss', () => {
  it('appears only after a named miss, keeps the total hidden, lets the student trade, and the typed answer still earns the points', async () => {
    const P = pure();
    expect(P.diagnoseAnswer('add', 27, 35, 52)).toBeTruthy();
    const view = await mount({ _arithmeticStudio: { tab: 'practice', practiceSource: 'set', operation: 'add', level: 1 } });
    const inputs = () => [...document.querySelectorAll('input[type="number"]')];
    expect(document.querySelector('[data-see-disks]')).toBeNull();
    await type(inputs()[0], '60');
    await click(document.querySelector('[data-lock-estimate]'));
    await type(inputs()[1], '52');
    await click(button('Check answer'));
    expect(view.d().feedback).toBe('try');
    const see = document.querySelector('[data-see-disks]');
    expect(see.textContent).toBe('See it with disks');
    expect(see.getAttribute('aria-expanded')).toBe('false');
    await click(see);
    const model = () => document.querySelector('[data-place-value-model="practice"]');
    expect(model()).toBeTruthy();
    expect(walkMove().textContent).toBe('Trade 10 ones for 1 ten');
    await click(walkMove());
    expect(view.d().practiceDiskStep).toBe(1);
    expect(model().querySelector('[data-model-total]').textContent).toBe('6 tens + 2 ones = ?');
    expect(showsNumber(exposed(), 62)).toBe(false);
    expect(view.awards).toEqual([]);
    await type(inputs()[1], '62');
    await click(button('Check answer'));
    expect(view.d().practiceSolved.a1).toBe(true);
    expect(view.awards).toEqual([['arithmeticStudio', 4, expect.any(String)]]);
    expect(document.querySelector('[data-see-disks]')).toBeNull();
  });
});
