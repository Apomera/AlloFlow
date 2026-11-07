import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Multiplication Table stage D (independent bug hunt, 2026-11-04). Each block
// pins one defect found by driving the tool: it fails on the stage-C file
// (MULTTABLE_DEEP_SRC points the suite at another copy) and passes after the fix.

const FILE = process.env.MULTTABLE_DEEP_SRC || 'stem_lab/stem_tool_multtable.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
let host = null;

beforeEach(() => { resetStemLab(); loadTool(FILE, 'multtable'); });
afterEach(async () => {
  if (root) { await React.act(async () => { root.unmount(); }); root = null; }
  if (host) { host.remove(); host = null; }
  document.body.innerHTML = '';
  window._multTableMuted = false;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

async function mount(opts = {}) {
  const tool = window.StemLab._registry.multtable;
  const view = { awards: [], ann: [] };
  function App() {
    const [lab, setLab] = React.useState(opts.lab || {});
    const [answer, setAnswer] = React.useState('');
    const [challenge, setChallenge] = React.useState(opts.challenge || null);
    const [feedback, setFeedback] = React.useState(null);
    const [hidden, setHidden] = React.useState(false);
    const [revealed, setRevealed] = React.useState(new Set());
    const [score, setScore] = React.useState({ correct: 0, total: 0 });
    Object.assign(view, { lab, challenge, feedback, setLab, setChallenge, setFeedback });
    return tool.render(makeCtx(Object.assign({
      labToolData: lab, setLabToolData: setLab,
      multTableAnswer: answer, setMultTableAnswer: setAnswer,
      multTableChallenge: challenge, setMultTableChallenge: setChallenge,
      multTableFeedback: feedback, setMultTableFeedback: setFeedback,
      multTableHidden: hidden, setMultTableHidden: setHidden,
      multTableHover: null, setMultTableHover: () => {},
      multTableRevealed: revealed, setMultTableRevealed: setRevealed,
      exploreScore: score, setExploreScore: setScore,
      awardXP: (...args) => view.awards.push(args),
      announceToSR: (m) => view.ann.push(String(m)),
      addToast: () => {},
    }, opts.ctx || {})));
  }
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(async () => { root.render(React.createElement(App)); });
  return view;
}
const act = (fn) => React.act(async () => { await fn(); });
function button(name, scope) {
  return [...(scope || host).querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === name || b.textContent.trim() === name) || null;
}
async function click(name, scope) {
  const b = typeof name === 'string' ? button(name, scope) : name;
  expect(b, 'button ' + name).toBeTruthy();
  expect(b.disabled, 'button ' + name + ' disabled').toBe(false);
  await act(() => b.click());
}
async function typeInto(selector, value) {
  const input = typeof selector === 'string' ? host.querySelector(selector) : selector;
  expect(input, 'input ' + selector).toBeTruthy();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await act(() => { setter.call(input, String(value)); input.dispatchEvent(new Event('input', { bubbles: true })); });
}
const awardsFor = (view, reason) => view.awards.filter((a) => a[0] === 'multtable' && a[2] === reason);
const factAward = (view) => view.awards.filter((a) => /^multiplication fact/.test(a[2]));
const rightAnswer = (c) => (c.mode === 'div' ? (c.divisor === c.a ? c.b : c.a) : c.mode === 'missing' ? (c.known === c.a ? c.b : c.a)
  : c.mode === 'divmiss' ? (c.form === 'divisor' ? c.divisor : c.a * c.b) : c.a * c.b);
const wait = (ms) => act(() => new Promise((r) => setTimeout(r, ms)));

describe('speed-run auto-advance keeps the XP-once ledger (stale visit)', () => {
  it('a fact answered in a speed run stays in the ledger after the next question appears', async () => {
    vi.useFakeTimers();
    const view = await mount({ lab: { _multExt: { difficulty: 'easy', quizMode: 'mult' } } });
    await click('Speed Run (2min)');
    const c1 = view.challenge;
    expect(c1 && c1.mode).toBe('mult');
    await typeInto('#multtable-input', c1.a * c1.b); await click('Check');
    expect(factAward(view)).toHaveLength(1);
    expect(Object.keys(view.lab._multExt.visit.xp)).toHaveLength(1);
    await act(() => vi.advanceTimersByTimeAsync(1300)); // auto-advance to the next question
    expect(view.challenge.id).not.toBe(c1.id);
    // The ledger (and the rest of this visit's record) must survive the advance.
    expect(Object.keys(view.lab._multExt.visit.xp)).toEqual(['mult:' + Math.min(c1.a, c1.b) + 'x' + Math.max(c1.a, c1.b)]);
    // The same fact again in the same run earns nothing.
    await act(() => view.setChallenge({ a: c1.b, b: c1.a, mode: 'mult', source: 'tool', id: 'again' }));
    await typeInto('#multtable-input', c1.a * c1.b); await click('Check');
    expect(factAward(view)).toHaveLength(1);
  });

  it('a missed speed-run fact stays on the visit missed list after the advance', async () => {
    vi.useFakeTimers();
    const view = await mount({ lab: { _multExt: { difficulty: 'easy', quizMode: 'mult' } } });
    await click('Speed Run (2min)');
    const c1 = view.challenge;
    await typeInto('#multtable-input', c1.a * c1.b + 50); await click('Check');
    expect(view.lab._multExt.visit.missed).toHaveLength(1);
    await act(() => vi.advanceTimersByTimeAsync(2300));
    expect(view.lab._multExt.visit.missed).toHaveLength(1);
    expect(view.lab._multExt.visit.revealed[Math.min(c1.a, c1.b) + 'x' + Math.max(c1.a, c1.b)]).toBe(true);
  });
});

describe('a fact picked from the visible table is practice only', () => {
  async function answerChosen(view, i) {
    await act(() => view.setChallenge({ a: 1, b: 1, mode: 'mult', source: 'chosen', id: 'c' + i }));
    await act(() => view.setLab((p) => ({ ...p, _multInputDisabled: false })));
    await typeInto('#multtable-input', 1); await click('Check');
  }
  it('copying answers from the table does not build a streak toward streak badges', async () => {
    const view = await mount();
    for (let i = 0; i < 4; i++) await answerChosen(view, i);
    expect(view.lab._multTimer.streak || 0).toBe(0);
    await act(() => view.setChallenge({ a: 3, b: 4, mode: 'mult', source: 'tool', id: 'tool-1' }));
    await act(() => view.setLab((p) => ({ ...p, _multInputDisabled: false })));
    await typeInto('#multtable-input', 12); await click('Check');
    expect(view.lab._multTimer.streak).toBe(1);
    expect(view.lab._multExt.badges.streak5).toBeFalsy();
    expect(awardsFor(view, 'badge')).toHaveLength(1); // firstCorrect only
  });

  it('does not record a first-try success in the mastery scores or tick the path', async () => {
    const view = await mount({ ctx: { gradeLevel: '3rd Grade' } });
    await answerChosen(view, 0);
    expect((view.lab._multExt.factScores || {})['1x1']).toBeUndefined();
    expect((view.lab._multTimer.adaptiveHistory || [])).toHaveLength(0);
    // A tool-chosen fact still counts.
    await act(() => view.setChallenge({ a: 2, b: 3, mode: 'mult', source: 'tool', id: 'tool-2' }));
    await act(() => view.setLab((p) => ({ ...p, _multInputDisabled: false })));
    await typeInto('#multtable-input', 6); await click('Check');
    expect(view.lab._multExt.factScores['2x3']).toEqual({ attempts: 1, correct: 1 });
  });
});

describe('an item shown this visit earns nothing when it comes back', () => {
  const detItem = { type: 'prime', n: 21, id: 'prime:21' };
  const freshDet = () => ({ item: detItem, tries: 0, wrong: [], resolved: false, ok: false, mistake: null });
  const choice = (v) => host.querySelector('[data-mt-det-choice="' + v + '"]');

  it('number detective: the evidence was shown, so the same number later earns no XP or path tick', async () => {
    const view = await mount({ lab: { _multExt: { mtTab: 'factors', det: freshDet() } } });
    await click(choice('prime')); await click(choice('neither'));
    expect(view.lab._multExt.det.resolved).toBe(true);
    await act(() => view.setLab((p) => ({ ...p, _multExt: { ...p._multExt, det: freshDet() } })));
    await click(choice('composite'));
    expect(awardsFor(view, 'number detective')).toHaveLength(0);
    expect(view.lab._multExt.primeCorrect || 0).toBe(0);
  });

  it('number detective control: right on the first try still earns once', async () => {
    const view = await mount({ lab: { _multExt: { mtTab: 'factors', det: freshDet() } } });
    await click(choice('composite'));
    expect(awardsFor(view, 'number detective')).toHaveLength(1);
    expect(view.lab._multExt.primeCorrect).toBe(1);
  });

  const fam = () => ({
    a: 2, b: 3, p: 6, id: 'fam:2x3',
    cards: [
      { id: 'm1', l: 2, op: 'mul', r: 3, v: 6, ok: true }, { id: 'x1', l: 2, op: 'div', r: 6, v: 3, ok: false, kind: 'divReverse' },
      { id: 'm2', l: 3, op: 'mul', r: 2, v: 6, ok: true }, { id: 'd1', l: 6, op: 'div', r: 2, v: 3, ok: true },
      { id: 'x2', l: 2, op: 'add', r: 3, v: 6, ok: false, kind: 'addFamily' }, { id: 'd2', l: 6, op: 'div', r: 3, v: 2, ok: true }
    ]
  });
  const freshFam = () => ({ fam: fam(), picked: {}, tries: 0, resolved: false, ok: false, diag: null });
  async function tickMembers() { for (const id of ['m1', 'm2', 'd1', 'd2']) await act(() => host.querySelector('[data-mt-fam-card="' + id + '"]').click()); }

  it('fact family: "Show me the family" then the same family again earns no XP', async () => {
    const view = await mount({ lab: { _multExt: { mtTab: 'visual', fam: freshFam() } } });
    await click('Check my family'); await click('Check my family');
    await click('Show me the family');
    expect(view.lab._multExt.fam.shown).toBe(true);
    await act(() => view.setLab((p) => ({ ...p, _multExt: { ...p._multExt, fam: freshFam() } })));
    await tickMembers();
    await click('Check my family');
    expect(view.lab._multExt.fam.ok).toBe(true);
    expect(awardsFor(view, 'fact family')).toHaveLength(0);
    expect(view.lab._multExt.familyCorrect || 0).toBe(0);
  });

  it('fact family control: all four on the first check earns once', async () => {
    const view = await mount({ lab: { _multExt: { mtTab: 'visual', fam: freshFam() } } });
    await tickMembers();
    await click('Check my family');
    expect(awardsFor(view, 'fact family')).toHaveLength(1);
  });

  it('factor rectangles: after "Show me the missing pairs", rebuilding the same number earns no XP', async () => {
    const view = await mount({ lab: { _multExt: { mtTab: 'factors', fx: { n: 6, pred: 'composite', found: [], tests: [], checks: 2, complete: false, revealed: false } } } });
    await click('Show me the missing pairs');
    expect(view.lab._multExt.fx.revealed).toBe(true);
    // (The box already shows 6, so type another value first or React sees no change.)
    await typeInto('[data-mt-fx-number]', 7); await typeInto('[data-mt-fx-number]', 6); await click('Explore this number');
    expect(view.lab._multExt.fx.found).toEqual([]);
    await click('Composite');
    for (const w of [1, 2]) { await typeInto('[data-mt-fx-width]', w); await click('Test these rows'); }
    await click('I have found every pair');
    expect(view.lab._multExt.fx.complete).toBe(true);
    expect(awardsFor(view, 'factor pairs found')).toHaveLength(0);
  });

  it('factor rectangles control: finding every pair yourself earns once', async () => {
    const view = await mount({ lab: { _multExt: { mtTab: 'factors', fx: { n: 6, pred: 'composite', found: [], tests: [], checks: 0, complete: false, revealed: false } } } });
    for (const w of [1, 2]) { await typeInto('[data-mt-fx-width]', w); await click('Test these rows'); }
    await click('I have found every pair');
    expect(awardsFor(view, 'factor pairs found')).toHaveLength(1);
  });
});

describe('pattern detective needs three different facts as evidence', () => {
  it('the same fact tested three times is not three facts', async () => {
    const view = await mount({ lab: { _multExt: { mtTab: 'patterns' } } });
    const card = () => host.querySelector('[data-mt-claim="fives_end"]');
    await click('Always true', card());
    const testFact = async (a, b) => {
      const [fa, fb] = card().querySelectorAll('input[type="number"]');
      await typeInto(fa, a); await typeInto(fb, b);
      await click('Test this fact', card());
    };
    for (let i = 0; i < 3; i++) await testFact(5, 2);
    await click('It is always true', card());
    expect(awardsFor(view, 'pattern claim with evidence')).toHaveLength(0);
    expect(card().textContent).toContain('Test at least three facts from the group before you decide.');
    await testFact(2, 5); // the same fact turned around
    await click('It is always true', card());
    expect(awardsFor(view, 'pattern claim with evidence')).toHaveLength(0);
    await testFact(5, 3); await testFact(5, 7);
    await click('It is always true', card());
    expect(awardsFor(view, 'pattern claim with evidence')).toHaveLength(1);
  });
});

describe('sieve: re-pressing a number crossed out in this pass', () => {
  const src = fs.readFileSync(FILE, 'utf8');
  const start = src.indexOf('var DIFFICULTY = {');
  const end = src.indexOf("window.StemLab.registerTool('multtable'", start);
  // eslint-disable-next-line no-new-func
  const E = new Function('window', src.slice(start, end) + '\nreturn { sieveInit, sieveAct };')({});
  it('says it is already crossed out, not "crossed out as a multiple of" the same prime', () => {
    let s = E.sieveInit(30);
    for (const act2 of [{ type: 'one', choice: 'cross' }, { type: 'cell', n: 2 }, { type: 'predict', yes: true }, { type: 'cell', n: 4 }]) s = E.sieveAct(s, act2).s;
    expect(E.sieveAct(s, { type: 'cell', n: 4 }).fb).toEqual({ kind: 'alreadyCrossed', n: 4 });
    // Crossed in an earlier pass: still named as the smaller prime's multiple.
    for (let m = 6; m <= 30; m += 2) s = E.sieveAct(s, { type: 'cell', n: m }).s;
    for (const act2 of [{ type: 'cell', n: 3 }, { type: 'predict', yes: true }]) s = E.sieveAct(s, act2).s;
    expect(E.sieveAct(s, { type: 'cell', n: 6 }).fb).toEqual({ kind: 'alsoMultiple', n: 6, p: 3, f: 2 });
    s = E.sieveAct(s, { type: 'cell', n: 9 }).s;
    expect(E.sieveAct(s, { type: 'cell', n: 9 }).fb).toEqual({ kind: 'alreadyCrossed', n: 9 });
  });
});

describe('focus is not dropped when the control you used disappears', () => {
  it('Practice: after the answer is checked, focus moves to "Next question"', async () => {
    await mount({ challenge: { a: 3, b: 4, mode: 'mult', source: 'tool', id: 'f1' } });
    await typeInto('#multtable-input', 12);
    host.querySelector('#multtable-input').focus();
    await act(() => host.querySelector('#multtable-input').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    await wait(60);
    expect(document.activeElement).toBe(button('Next question'));
  });

  it('Fluency: after a fact is checked, focus moves to "Next question"', async () => {
    const view = await mount({ lab: { _multExt: { mtTab: 'fluency' } } });
    await click('Start a round');
    await wait(60);
    const it0 = view.lab._multExt.flu.round[0];
    await typeInto('#mt-flu-input', rightAnswer(it0));
    await click(host.querySelector('[data-mt-flu-play] button'));
    await wait(60);
    expect(document.activeElement).toBe(button('Next question'));
  });

  it('Word problems: choosing the operation moves focus to the answer box, solving moves it to the next problem', async () => {
    const view = await mount({ lab: { _multExt: { mtTab: 'words', wpKind: 'one' } } });
    await click('Give me a word problem');
    await wait(60);
    expect(document.activeElement.getAttribute('data-mt-wp-op')).toBeTruthy();
    const it0 = view.lab._multExt.wp.item;
    await click(host.querySelector('[data-mt-wp-op="' + it0.ops.join('-') + '"]'));
    await wait(60);
    expect(document.activeElement).toBe(host.querySelector('[data-mt-wp-input]'));
    await typeInto('[data-mt-wp-input]', it0.answer); await click('✔ Check');
    await wait(60);
    expect(document.activeElement).toBe(button('Next word problem'));
  });

  it('Number detective and fact family: focus lands on the question, then on "next"', async () => {
    const view = await mount({ lab: { _multExt: { mtTab: 'factors' } } });
    await click('Give me a question');
    await wait(60);
    expect(document.activeElement.getAttribute('data-mt-det-choice')).toBeTruthy();
    const item = view.lab._multExt.det.item;
    const ans = item.type === 'prime' ? (item.n === 1 ? 'neither' : (() => { let k = 0; for (let d = 1; d <= item.n; d++) if (item.n % d === 0) k++; return k === 2 ? 'prime' : 'composite'; })())
      : item.type === 'more' ? String(item.answer) : (item.n % item.d === 0 ? 'yes' : 'no');
    await click(host.querySelector('[data-mt-det-choice="' + ans + '"]'));
    await wait(60);
    expect(document.activeElement).toBe(button('Next question'));
    await act(() => view.setLab((p) => ({ ...p, _multExt: { ...p._multExt, mtTab: 'visual' } })));
    await click('Give me a fact family');
    await wait(60);
    expect(document.activeElement.getAttribute('data-mt-fam-card')).toBeTruthy();
    await click(button('Check my family')); await click(button('Check my family')); await click('Show me the family');
    await wait(60);
    expect(document.activeElement).toBe(button('Another fact family'));
  });
});
