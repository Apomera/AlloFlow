import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Multiplication Table stage B (2026-11-03), mounted and clicked: factor
// rectangles, the number detective, the sieve, word problems, fact families,
// the 3.OA.4 missing-number forms in Practice, and the untimed fluency game.
// MULTTABLE_DEEP_SRC points the suite at another copy (mutation check).

const FILE = process.env.MULTTABLE_DEEP_SRC || 'stem_lab/stem_tool_multtable.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
let host = null;

beforeEach(() => { resetStemLab(); loadTool(FILE, 'multtable'); });
afterEach(async () => {
  if (root) { await React.act(async () => { root.unmount(); }); root = null; }
  if (host) { host.remove(); host = null; }
  document.body.innerHTML = '';
  delete window.AudioContext;
  window._multTableMuted = false;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

async function mount(opts = {}) {
  const tool = window.StemLab._registry.multtable;
  const view = { awards: [], ann: [], toasts: [] };
  function App() {
    const [lab, setLab] = React.useState(opts.lab || {});
    const [answer, setAnswer] = React.useState('');
    const [challenge, setChallenge] = React.useState(opts.challenge || null);
    const [feedback, setFeedback] = React.useState(null);
    const [hidden, setHidden] = React.useState(false);
    const [revealed, setRevealed] = React.useState(new Set());
    const [score, setScore] = React.useState({ correct: 0, total: 0 });
    Object.assign(view, { lab, challenge, feedback, setLab, setChallenge });
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
      addToast: (m) => view.toasts.push(String(m)),
    }, opts.ctx || {})));
  }
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(async () => { root.render(React.createElement(App)); });
  return view;
}
async function unmount() { await React.act(async () => { root.unmount(); }); root = null; host.remove(); host = null; }
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
const text = (sel) => (host.querySelector(sel) || { textContent: '' }).textContent;
const hasNumber = (s, n) => new RegExp('(^|[^\\d])' + n + '([^\\d]|$)').test(s);
const awardsFor = (view, reason) => view.awards.filter((a) => a[0] === 'multtable' && a[2] === reason);
const SIEVE30 = { n: 30, crossed: {}, primes: {}, phase: 'one', p: null, hits: 0, need: 0, done: false };

describe('factor rectangles (4.OA.4)', () => {
  it('asks for a prediction first, names a leftover, holds back the missing pairs, then confirms with every rectangle', async () => {
    const view = await mount({ lab: { _multExt: { mtTab: 'factors', fx: { n: 24 } } } });
    expect(host.querySelector('[data-mt-fx-width]')).toBeNull();
    await click('Composite');
    await typeInto('[data-mt-fx-width]', 5); await click('Test these rows');
    expect(text('[data-mt-factors]')).toContain('5 rows: no. 5 rows of 4 make 20, with 4 left over.');
    await typeInto('[data-mt-fx-width]', 4); await click('Test these rows');
    expect(text('[data-mt-factors]')).toContain('4 rows of 6: yes. 4 × 6 = 24');
    await click('I have found every pair');
    const status = text('[data-mt-fx-status]');
    expect(status).toContain('Not yet: there is at least one more factor pair. Test every number of rows from 1 to 4.');
    expect(status).not.toMatch(/3 × 8|2 × 12|1 × 24/);
    expect(button('Show me the missing pairs')).toBeNull();
    for (const w of [1, 2, 3, 8]) { await typeInto('[data-mt-fx-width]', w); await click('Test these rows'); }
    expect(view.ann.at(-1)).toContain('You already have this rectangle.'); // 8 rows = 3 × 8 turned
    await click('I have found every pair');
    expect(text('[data-mt-fx-status]')).toContain('24 has 4 factor pairs, so its factors are 1, 2, 3, 4, 6, 8, 12, 24.');
    expect(text('[data-mt-factors]')).toContain('Your prediction was right');
    const rects = [...host.querySelectorAll('[data-mt-factors] svg[role="img"]')].map((s) => s.getAttribute('aria-label'));
    expect(rects).toEqual(['1 row of 24 squares, 24 squares in all.', '2 rows of 12 squares, 24 squares in all.', '3 rows of 8 squares, 24 squares in all.', '4 rows of 6 squares, 24 squares in all.']);
    expect(awardsFor(view, 'factor pairs found')).toEqual([['multtable', 3, 'factor pairs found']]);
    await click('Build 4 × 6 as an array');
    expect(view.lab._multExt).toMatchObject({ mtTab: 'visual', visualA: 4, visualB: 6 });
  });

  it('offers the missing pairs only after two checks, and a reveal earns nothing', async () => {
    const view = await mount({ lab: { _multExt: { mtTab: 'factors', fx: { n: 36, pred: 'prime' } } } });
    await click('I have found every pair');
    expect(button('Show me the missing pairs')).toBeNull();
    await click('I have found every pair');
    await click('Show me the missing pairs');
    expect(text('[data-mt-fx-status]')).toContain('36 has 5 factor pairs');
    expect(text('[data-mt-factors]')).toContain('You predicted Prime. The rectangles show otherwise');
    expect(awardsFor(view, 'factor pairs found')).toHaveLength(0);
  });
});

describe('number detective: predict, named misconception, second try', () => {
  const det = (item) => ({ _multExt: { mtTab: 'factors', det: { item, tries: 0, wrong: [], resolved: false } } });

  it('"1 is prime" is named without giving the answer away, and a second-try answer earns no XP', async () => {
    const view = await mount({ lab: det({ type: 'prime', n: 1, id: 'prime:1' }) });
    await click('Prime', host.querySelector('[data-mt-detective]'));
    expect(host.querySelector('[data-mt-det-mistake="onePrime"]')).toBeTruthy();
    expect(text('[data-mt-det-feedback]')).not.toMatch(/neither/i);
    expect(host.querySelector('[data-mt-det-choice="prime"]').disabled).toBe(true);
    await click('Neither');
    expect(text('[data-mt-det-feedback]')).toContain('1 has only one factor, so it is neither prime nor composite.');
    expect(awardsFor(view, 'number detective')).toHaveLength(0);
    expect(view.lab._multExt.visit.tally.onePrime).toBe(1);
  });

  it('"every odd number is prime" is named, with a testing hint and the factor pairs as evidence', async () => {
    await mount({ lab: det({ type: 'prime', n: 21, id: 'prime:21' }) });
    await click('Prime', host.querySelector('[data-mt-detective]'));
    const hint = text('[data-mt-det-feedback]');
    expect(hint).toContain('Odd numbers can still be composite');
    expect(hint).not.toMatch(/3 × 7|\b7\b/);
    await click('Composite', host.querySelector('[data-mt-detective]'));
    expect(text('[data-mt-det-feedback]')).toContain('Factors of 21: 1, 3, 7, 21. Factor pairs: 1 × 21, 3 × 7.');
    expect(host.querySelectorAll('[data-mt-detective] svg[role="img"]')).toHaveLength(2);
  });

  it('"a big number has more factors" is named', async () => {
    await mount({ lab: det({ type: 'more', x: 12, y: 31, answer: 12, id: 'more:12-31' }) });
    await click('31');
    expect(host.querySelector('[data-mt-det-mistake="biggerMore"]')).toBeTruthy();
    await click('12');
    expect(text('[data-mt-det-feedback]')).toContain('12 has 6 factors: 1, 2, 3, 4, 6, 12. 31 has 2 factors: 1, 31.');
    expect(text('[data-mt-det-feedback]')).toContain('Size does not decide');
  });

  it('first-try right earns XP once, and generated questions keep coming', async () => {
    const view = await mount({ lab: det({ type: 'multiple', n: 36, d: 4, id: 'multiple:36/4' }) });
    await click('Yes');
    expect(text('[data-mt-det-feedback]')).toContain('Yes: 4 × 9 = 36');
    expect(awardsFor(view, 'number detective')).toEqual([['multtable', 3, 'number detective']]);
    expect(view.lab._multExt.primeCorrect).toBe(1);
    for (let i = 0; i < 25; i++) {
      await click('Next question');
      expect(text('[data-mt-det-question]')).toMatch(/\?$/);
      const item = view.lab._multExt.det.item;
      const opts = [...host.querySelectorAll('[data-mt-det-choice]')];
      expect(opts.length).toBe(item.type === 'prime' ? 3 : 2);
      await act(() => opts[0].click());
      if (!view.lab._multExt.det.resolved) await act(() => [...host.querySelectorAll('[data-mt-det-choice]')].find((b) => !b.disabled).click());
      expect(view.lab._multExt.det.resolved).toBe(true);
    }
  });
});

describe('sieve of Eratosthenes, by keyboard', () => {
  it('one tab stop, arrows move, Enter circles and crosses, wrong cells are named, and it ends at the square-root rule', async () => {
    const view = await mount({ lab: { _multExt: { mtTab: 'factors', sieve: SIEVE30 } } });
    const grid = host.querySelector('[data-mt-sieve-grid]');
    const cells = () => [...grid.querySelectorAll('[role="gridcell"]')];
    expect(cells()).toHaveLength(30);
    expect(cells().filter((c) => c.tabIndex === 0)).toHaveLength(1);
    await click('Circle 1 as a prime');
    expect(text('[data-mt-sv-feedback]')).toContain('1 has only one factor');
    await click('Cross out 1');
    const key = async (el, k) => act(() => { el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); });
    cells()[0].focus();
    await key(document.activeElement, 'ArrowRight');
    expect(document.activeElement.getAttribute('data-sv')).toBe('2');
    await key(document.activeElement, 'Enter');
    expect(grid.querySelector('[data-sv="2"]').getAttribute('aria-label')).toBe('2, circled: prime.');
    await key(document.activeElement, 'Enter');
    expect(text('[data-mt-sv-feedback]')).toContain('Answer the question first');
    await click('Yes, new numbers get crossed out');
    await key(document.activeElement, 'ArrowRight');
    await key(document.activeElement, 'Enter');
    expect(text('[data-mt-sv-feedback]')).toBe('3 is not a multiple of 2: 2 × 1 = 2 and 2 × 2 = 4.');
    await key(document.activeElement, 'ArrowDown');
    expect(document.activeElement.getAttribute('data-sv')).toBe('13');
    const cellN = (n) => grid.querySelector(`[data-sv="${n}"]`);
    for (const n of [4, 6]) await act(() => cellN(n).click());
    expect(button('Cross out the rest of the multiples of 2 for me').disabled).toBe(true);
    await act(() => cellN(8).click());
    expect(cellN(8).getAttribute('aria-label')).toBe('8, crossed out.');
    await click('Cross out the rest of the multiples of 2 for me');
    // Finish: 3 and 5 need crossing (9 and 25 are new); 7 has nothing new under 30.
    for (const p of [3, 5, 7]) {
      await act(() => cellN(p).click());
      if (p * p <= 30) {
        await click('Yes, new numbers get crossed out');
        let hits = 0;
        for (let m = 2 * p; m <= 30 && hits < 3 && view.lab._multExt.sieve.phase === 'cross'; m += p) {
          if (view.lab._multExt.sieve.crossed[m]) continue;
          await act(() => cellN(m).click()); hits++;
        }
        if (view.lab._multExt.sieve.phase === 'cross') await click('Cross out the rest of the multiples of ' + p + ' for me');
      } else {
        await click('Yes, new numbers get crossed out');
        expect(text('[data-mt-sv-feedback]')).toContain('7 × 7 = 49, which is more than 30');
        await click('No, nothing new');
      }
    }
    expect(view.lab._multExt.sieve.done).toBe(true);
    expect(text('[data-mt-sv-summary]')).toContain('Circled so far (10): 2, 3, 5, 7, 11, 13, 17, 19, 23, 29.');
    expect(awardsFor(view, 'sieve of Eratosthenes')).toEqual([['multtable', 10, 'sieve of Eratosthenes']]);
    expect(view.lab._multExt.badges.sieveSolver).toBe(true);
    expect(view.lab._multExt.sieveDone).toBe(1);
  });

  it('"Start over" asks inline before clearing progress', async () => {
    const view = await mount({ lab: { _multExt: { mtTab: 'factors', sieve: SIEVE30 } } });
    await click('Cross out 1');
    await click('Start over');
    await click('Keep going');
    expect(view.lab._multExt.sieve.crossed[1]).toBe(true);
    await click('Start over');
    await click('Yes, start again');
    expect(view.lab._multExt.sieve.phase).toBe('one');
  });
});

describe('word problems (3.OA.3, 3.OA.8): operation first', () => {
  const share = { type: 'groups_share', a: 4, b: 6, p: 24, vals: { p: 24, a: 4 }, steps: [{ l: 24, op: 'div', r: 4, v: 6 }], ops: ['div'], answer: 6, variant: 0, id: 'groups_share:0:24-4', options: [['mul'], ['div'], ['add'], ['sub']] };
  const twoStep = { type: 'two_mul_sub', a: 3, b: 6, p: 18, vals: { a: 3, b: 6, c: 4 }, steps: [{ l: 3, op: 'mul', r: 6, v: 18 }, { l: 18, op: 'sub', r: 4, v: 14 }], ops: ['mul', 'sub'], answer: 14, variant: 0, id: 'two:3-6-4', options: [['mul', 'add'], ['mul', 'sub'], ['mul'], ['add', 'sub']] };
  const wpLab = (item) => ({ _multExt: { mtTab: 'words', wp: { item, phase: 'op', opTries: 0, opWrong: [], step: 0, ansTries: 0, solved: [] } } });

  it('names "multiplied when the total was given", keeps the answer hidden, then solves with a named slip', async () => {
    const view = await mount({ lab: wpLab(share) });
    expect(text('[data-mt-wp-text]')).toBe('24 apples are shared equally into 4 bags. How many apples go in each bag?');
    expect(host.querySelector('[data-mt-wp-input]')).toBeNull();
    await click('Multiply (×)');
    expect(host.querySelector('[data-mt-wp-mistake="multForDiv"]')).toBeTruthy();
    expect(hasNumber(text('[data-mt-words]'), 6)).toBe(false);
    await click('Divide (÷)');
    expect(text('[data-mt-wp-eq]')).toBe('24 ÷ 4 = ?');
    expect(text('[data-mt-words]')).toContain('Or think multiplication: 4 × ? = 24.');
    await typeInto('[data-mt-wp-input]', 24); await click('✔ Check');
    expect(host.querySelector('[data-mt-wp-ans-mistake="product"]')).toBeTruthy();
    expect(hasNumber(text('[data-mt-wp-feedback]'), 6)).toBe(false);
    await typeInto('[data-mt-wp-input]', 6); await click('✔ Check');
    expect(host.querySelector('[data-mt-wp-done]').textContent).toContain('The answer is 6.');
    expect(host.querySelector('[data-mt-wp-picture="full"]')).toBeTruthy();
    expect(awardsFor(view, 'word problem')).toEqual([['multtable', 2, 'word problem']]);
    expect(view.lab._multExt.wordSolved).toBe(1);
  });

  it('a two-step problem names "stopped after one step" and solves step by step', async () => {
    const view = await mount({ lab: wpLab(twoStep) });
    await click('Multiply (×) only');
    expect(host.querySelector('[data-mt-wp-mistake="oneStepOnly"]')).toBeTruthy();
    await click('Multiply (×), then Subtract (−)');
    expect(text('[data-mt-wp-eq]')).toBe('Step 1: 3 × 6 = ?');
    await typeInto('[data-mt-wp-input]', 18); await click('✔ Check');
    expect(text('[data-mt-wp-eq]')).toBe('Step 2: 18 − 4 = ?');
    await typeInto('[data-mt-wp-input]', 22); await click('✔ Check');
    expect(host.querySelector('[data-mt-wp-ans-mistake="addedNotSub"]')).toBeTruthy();
    await typeInto('[data-mt-wp-input]', 14); await click('✔ Check');
    expect(text('[data-mt-wp-done]')).toContain('Step 1: 3 × 6 = 18');
    expect(text('[data-mt-wp-done]')).toContain('Step 2: 18 − 4 = 14');
    expect(awardsFor(view, 'word problem')).toEqual([['multtable', 2, 'word problem']]);
  });

  it('two wrong operations offer "Show me the operation", and a revealed operation earns nothing', async () => {
    const view = await mount({ lab: wpLab(share) });
    await click('Add (+)');
    expect(button('Show me the operation')).toBeNull();
    await click('Subtract (−)');
    // Stage C: like every other tab, the reveal is on demand after two tries.
    expect(text('[data-mt-wp-feedback]')).not.toContain('The operation is');
    await click('Show me the operation');
    expect(text('[data-mt-wp-feedback]')).toContain('The operation is: Divide (÷).');
    await typeInto('[data-mt-wp-input]', 6); await click('✔ Check');
    expect(awardsFor(view, 'word problem')).toHaveLength(0);
  });

  it('a clean solve earns 5 XP once; generated problems never print their answer', async () => {
    const view = await mount({ lab: { _multExt: { mtTab: 'words' } }, ctx: { gradeLevel: '3rd Grade' } });
    await click('Give me a word problem');
    for (let i = 0; i < 120; i++) {
      const it = view.lab._multExt.wp.item;
      const shown = text('[data-mt-wp-text]');
      expect(hasNumber(shown, it.answer), shown + ' → ' + it.answer).toBe(false);
      if (i === 0) {
        await click(host.querySelector('[data-mt-wp-op="' + it.ops.join('-') + '"]'));
        for (const st of it.steps) { await typeInto('[data-mt-wp-input]', st.v); await click('✔ Check'); }
        expect(awardsFor(view, 'word problem')).toEqual([['multtable', 5, 'word problem']]);
        await click('Next word problem');
      } else {
        await act(() => view.setLab((p) => ({ ...p, _multExt: { ...p._multExt, wp: null } })));
        await click('Give me a word problem');
      }
    }
  });

  it('grades K-2 get equal groups and arrays, where repeated addition also counts', async () => {
    const view = await mount({ lab: { _multExt: { mtTab: 'words' } }, ctx: { gradeLevel: '1st Grade' } });
    expect(button('Two-step only')).toBeNull();
    await click('Give me a word problem');
    expect(view.lab._multExt.wp.item.ops).toEqual(['mul']);
    await click('Add (+)');
    expect(view.lab._multExt.wp.phase).toBe('solve');
    expect(text('[data-mt-wp-feedback]')).toContain('Repeated addition works too');
  });

  it('a teacher lock to two-step problems applies to the learner', async () => {
    const view = await mount({ ctx: { isTeacherMode: true } });
    await click(host.querySelector('[data-mt-teacher] [role="group"][aria-label="Word problems"] button:nth-of-type(3)'));
    const saved = view.lab;
    await unmount();
    const learner = await mount({ lab: { ...saved, _multExt: { ...saved._multExt, mtTab: 'words' } }, ctx: { gradeLevel: '4th Grade' } });
    expect(button('One-step only').disabled).toBe(true);
    for (let i = 0; i < 10; i++) {
      await act(() => learner.setLab((p) => ({ ...p, _multExt: { ...p._multExt, wp: null } })));
      await click('Give me a word problem');
      expect(learner.lab._multExt.wp.item.ops).toHaveLength(2);
    }
  });
});

describe('fact family check', () => {
  it('names a reversed division, allows a second try, and pays XP only for a first-try family', async () => {
    const view = await mount({ lab: { _multExt: { mtTab: 'visual' } } });
    await click('Give me a fact family');
    const tick = async (id) => act(() => host.querySelector(`[data-mt-fam-card="${id}"]`).click());
    for (const id of ['m1', 'm2', 'd1', 'd2', 'x1']) await tick(id);
    await click('Check my family');
    expect(text('[data-mt-fam-feedback]')).toContain('turns the division around');
    expect(host.querySelector('[data-mt-family]').getAttribute('data-mt-family')).toBe('open');
    await tick('x1');
    await click('Check my family');
    expect(text('[data-mt-fam-feedback]')).toContain('whole family');
    expect(awardsFor(view, 'fact family')).toHaveLength(0);
    expect(host.querySelector('[data-mt-family]').textContent).toContain('not a member');
    await click('Another fact family');
    for (const id of ['m1', 'm2', 'd1', 'd2']) await tick(id);
    await click('Check my family');
    expect(awardsFor(view, 'fact family')).toEqual([['multtable', 3, 'fact family']]);
  });
});

describe('missing numbers in × and ÷ (3.OA.4) in Practice', () => {
  it('the direction serves a × ? = p, ? × b = p, ? ÷ d = q and p ÷ ? = q', async () => {
    const view = await mount({ lab: { _multExt: { quizMode: 'equations' } } });
    const forms = new Set();
    for (let i = 0; i < 60; i++) {
      await click('Quick Quiz');
      const c = view.challenge;
      expect(['missing', 'divmiss']).toContain(c.mode);
      const q = text('[data-mt-challenge] p');
      forms.add(c.mode === 'missing' ? (q.startsWith('?') ? '?×b' : 'a×?') : c.form);
      if (c.mode === 'divmiss') expect(q).toMatch(c.form === 'divisor' ? /^\d+ ÷ \? = \d+$/ : /^\? ÷ \d+ = \d+$/);
    }
    expect([...forms].sort()).toEqual(['?×b', 'a×?', 'dividend', 'divisor']);
  });

  it('"48 ÷ ? = 8": a named mistake, a hint without the answer, then the drill keeps the form', async () => {
    const view = await mount({ challenge: { a: 6, b: 8, mode: 'divmiss', divisor: 6, form: 'divisor', source: 'tool', id: 'e1' } });
    expect(text('[data-mt-challenge] p')).toBe('48 ÷ ? = 8');
    const input = () => host.querySelector('#multtable-input');
    await typeInto(input(), 8); await click('Check');
    expect(host.querySelector('[data-mt-mistake="quotientEcho"]')).toBeTruthy();
    expect(hasNumber(text('[data-mt-retry]').replace(/Try \d of \d\./, ''), 6)).toBe(false);
    await typeInto(input(), 48); await click('Check');
    await typeInto(input(), 5); await click('Check');
    expect(view.feedback).toMatchObject({ resolved: true, revealed: true });
    expect(view.lab._multExt.visit.missed[0]).toMatchObject({ mode: 'divmiss', form: 'divisor', divisor: 6 });
    await click('Next question');
    await click(host.querySelector('button[class*="border-red-700"]'));
    expect(view.challenge).toMatchObject({ mode: 'divmiss', form: 'divisor', divisor: 6, source: 'drill' });
  });

  it('"? ÷ 3 = 6" accepts 18', async () => {
    const view = await mount({ challenge: { a: 3, b: 6, mode: 'divmiss', divisor: 3, form: 'dividend', source: 'tool', id: 'e2' } });
    expect(text('[data-mt-challenge] p')).toBe('? ÷ 3 = 6');
    await typeInto('#multtable-input', 18); await click('Check');
    expect(view.feedback).toMatchObject({ correct: true, firstTry: true });
  });
});

describe('fluency game: untimed by default', () => {
  it('has no clock by default; ten facts climb ten steps; XP once per fact; a round ends with a badge', async () => {
    const view = await mount({ lab: { _multExt: { mtTab: 'fluency' } }, ctx: { gradeLevel: '3rd Grade' } });
    expect(host.querySelector('[data-mt-fluency] [role="timer"]')).toBeNull();
    expect(text('[data-mt-flu-timer-note]')).toContain('There is no clock');
    await click('Start a round');
    expect(host.querySelector('[role="timer"]')).toBeNull();
    for (let i = 0; i < 10; i++) {
      const f = view.lab._multExt.flu;
      const it = f.round[f.i];
      const ans = it.mode === 'div' ? (it.divisor === it.a ? it.b : it.a) : it.a * it.b;
      await typeInto('#mt-flu-input', ans);
      await click('✔ Check');
      await click('Next question');
    }
    expect(view.lab._multExt.flu.phase).toBe('done');
    expect(text('[data-mt-flu-done]')).toContain('Round finished: 10 of 10 facts right on the first try.');
    expect(awardsFor(view, 'multiplication fact')).toHaveLength(10);
    expect(view.lab._multExt).toMatchObject({ fluencyRounds: 1, fluencyBest: 10 });
    expect(view.lab._multExt.badges.fluencyClimber).toBe(true);
  });

  it('a wrong answer gets a named mistake and a second try; a revealed fact comes back with no XP', async () => {
    const view = await mount({ lab: { _multExt: { mtTab: 'fluency', flu: { round: [{ a: 7, b: 8, mode: 'mult' }], i: 0, results: [], tries: 0, phase: 'play', resolved: false, comeBack: [] } } } });
    await typeInto('#mt-flu-input', 15); await click('✔ Check');
    expect(host.querySelector('[data-mt-flu-mistake="added"]')).toBeTruthy();
    expect(hasNumber(text('[data-mt-flu-feedback]'), 56)).toBe(false);
    await typeInto('#mt-flu-input', 63); await click('✔ Check');
    // Stage C: the same ladder as Practice: rung 2 and "Show me the answer" after two tries, no auto-reveal.
    expect(hasNumber(text('[data-mt-flu-feedback]'), 56)).toBe(false);
    expect(host.querySelector('[data-mt-flu-feedback] [data-mt-hint-ladder="2"]')).toBeTruthy();
    await click('Show me the answer');
    expect(text('[data-mt-flu-feedback]')).toContain('7 × 8 = 56. This fact will come back');
    await click('Next question');
    expect(text('[data-mt-flu-play]')).toContain('Coming back to a fact you missed');
    await typeInto('#mt-flu-input', 56); await click('✔ Check');
    await click('Next question');
    expect(awardsFor(view, 'multiplication fact')).toHaveLength(0);
    expect(text('[data-mt-flu-done]')).toContain('0 of 1');
    expect(text('[data-mt-flu-done]')).toContain('7 × 8 = 56');
    // Like a Practice drill: the come-back counts toward mastery, never XP.
    expect(view.lab._multExt.factScores['7x8']).toEqual({ attempts: 2, correct: 1 });
  });

  it('a teacher opts in to a timer with extended time; learners can pause; time-up counts nothing as wrong', async () => {
    vi.useFakeTimers();
    const view = await mount({ ctx: { isTeacherMode: true } });
    await click(host.querySelector('[data-mt-teacher] [role="group"][aria-label="Fluency game timer"] button:nth-of-type(2)'));
    await click(host.querySelector('[data-mt-teacher] [role="group"][aria-label="Extended time (accommodation)"] button:nth-of-type(2)'));
    const saved = view.lab;
    await unmount();
    const learner = await mount({ lab: { ...saved, _multExt: { ...saved._multExt, mtTab: 'fluency' } } });
    expect(text('[data-mt-flu-timer-note]')).toContain('a 4.5-minute clock');
    await click('Start a round');
    expect(host.querySelector('[role="timer"]').textContent).toContain('4:30');
    await click('Pause the clock');
    await act(() => vi.advanceTimersByTimeAsync(400000));
    expect(learner.lab._multExt.flu.phase).toBe('play');
    await click('Resume the clock');
    await act(() => vi.advanceTimersByTimeAsync(271000));
    expect(learner.lab._multExt.flu.phase).toBe('done');
    expect(text('[data-mt-flu-done]')).toContain('unanswered facts do not count as wrong');
    // Stage E: a timed-out round with no answered fact is not a finished round, so no "0 of 0" claim.
    expect(text('[data-mt-flu-done]')).not.toContain('Round finished');
    expect(learner.lab._multExt.fluencyRounds).toBeUndefined();
  });

  it('plays one beat per group (12 for division), says what it plays, and is silent when muted', async () => {
    const started = [];
    const stopped = [];
    window.AudioContext = class {
      constructor() { this.currentTime = 0; this.destination = {}; this.state = 'running'; }
      createOscillator() { const o = { frequency: {}, connect() {}, start(t0) { started.push(t0); }, stop(t1) { if (t1 === undefined) stopped.push(o); } }; return o; }
      createGain() { return { gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
    };
    const lab = { _multExt: { mtTab: 'fluency', flu: { round: [{ a: 7, b: 8, mode: 'mult' }, { a: 7, b: 8, mode: 'div', divisor: 7 }], i: 0, results: [], tries: 0, phase: 'play', resolved: false, comeBack: [] } } };
    const view = await mount({ lab });
    expect(text('#mt-flu-rhythm-desc')).toBe('Plays 7 beats, one for each group of 8. Count by 8s on each beat.');
    await click('🥁 Hear the skip-count rhythm');
    expect(started).toHaveLength(7);
    await typeInto('#mt-flu-input', 56); await click('✔ Check');
    expect(stopped.length).toBe(7); // a checked answer stops the rhythm
    await click('Next question');
    started.length = 0;
    await click('🥁 Hear the skip-count rhythm');
    expect(started).toHaveLength(12);
    expect(view.ann.at(-1)).toContain('Count by 7s on each beat, and stop when you reach 56.');
    window._multTableMuted = true;
    await act(() => view.setLab((p) => ({ ...p, _multExt: { ...p._multExt, muted: true } })));
    started.length = 0;
    await click('🥁 Hear the skip-count rhythm');
    expect(started).toHaveLength(0);
    expect(view.ann.at(-1)).toContain('Sound is off');
  });
});

describe('speed runs keep the one-try rule', () => {
  it('a wrong answer in a speed run is resolved at once with the mistake named', async () => {
    const view = await mount({ lab: { _multTimer: { active: true, paused: false, endTime: Date.now() + 60000, score: 0, total: 0, timeLeft: 60, missed: [] } }, challenge: { a: 7, b: 8, mode: 'mult', source: 'tool', id: 's1' } });
    await typeInto('#multtable-input', 15); await click('Check');
    expect(view.feedback).toMatchObject({ resolved: true, revealed: true, tries: 1 });
    expect(view.feedback.mistake.kind).toBe('added');
  });
});

describe('teacher sees the new misconceptions', () => {
  it('word-problem and prime misconceptions appear in the mistake summary', async () => {
    const view = await mount({ ctx: { isTeacherMode: true }, lab: { _multExt: { mtTab: 'factors', det: { item: { type: 'prime', n: 1, id: 'prime:1' }, tries: 0, wrong: [], resolved: false } } } });
    await click('Prime', host.querySelector('[data-mt-detective]'));
    await click('🎯 Practice');
    expect(text('[data-mt-teacher-missed]')).toContain('Called 1 prime: 1');
    expect(view.lab._multExt.visit.tally.onePrime).toBe(1);
  });
});
