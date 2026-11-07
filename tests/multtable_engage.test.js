import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Multiplication Table engagement build (2026-11-04), mounted and clicked:
// 1. "Next, step N" launches the step's first question, scrolls to it and focuses it.
// 2. Practice opens on one choice (the fact set, preselected); direction and range wait under "Change practice".
// 3. Arrays respond: band facts for K-2, live dots with the total "?", tricky chips for grade 3+ only.
// 4. After the build, rows are tap-to-skip-count buttons with announced running totals.
// 5. Focus is kept after "Build this fact", "Build it and check" and "predict again".
// MULTTABLE_DEEP_SRC points it at another copy (the start copy for fail-first proof).

const FILE = process.env.MULTTABLE_DEEP_SRC || 'stem_lab/stem_tool_multtable.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
let host = null;
let scrolled = [];

beforeEach(() => {
  resetStemLab(); loadTool(FILE, 'multtable');
  scrolled = [];
  Element.prototype.scrollIntoView = function (opts) { scrolled.push({ el: this, opts }); };
});
afterEach(async () => {
  if (root) { await React.act(async () => { root.unmount(); }); root = null; }
  if (host) { host.remove(); host = null; }
  document.body.innerHTML = '';
  delete Element.prototype.scrollIntoView;
  window._multTableMuted = false;
  vi.restoreAllMocks();
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
const settle = () => act(() => new Promise((r) => setTimeout(r, 90)));
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
async function slide(id, value) {
  const input = host.querySelector('#' + id);
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await act(() => { setter.call(input, String(value)); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); });
}
const key = (el, k) => act(() => { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); });
const active = () => document.activeElement;
const panel = () => host.querySelector('[role="tabpanel"]');
const dots = () => panel().querySelectorAll('.allo-mt-dot').length;

describe('1. "Next, step N" launches the step', () => {
  it('grade 4: step 1 asks a "use a fact I know" question, scrolls to it and focuses its answer box', async () => {
    const view = await mount({ ctx: { gradeLevel: '4th Grade' } });
    await click(host.querySelector('[data-mt-path-next="strategies"]'));
    await settle();
    expect(view.challenge, 'a question was launched').toBeTruthy();
    expect(view.challenge.mode).toBe('derive');
    expect(view.lab._multExt).toMatchObject({ mtTab: 'practice', quizMode: 'derive', difficulty: 'tens' });
    expect(active().id).toBe('multtable-input');
    expect(active().getAttribute('aria-describedby')).toBe('multtable-q');
    expect(host.querySelector('#multtable-q').textContent).toContain('= ?');
    expect(scrolled.some((s) => s.el.id === 'multtable-input' && s.opts && s.opts.block === 'center')).toBe(true);
  });

  it('grade 5: step 1 asks a division fact; an open question for the same step is kept, not replaced', async () => {
    const view = await mount({ ctx: { gradeLevel: '5th Grade' } });
    await click(host.querySelector('[data-mt-path-next="division"]'));
    await settle();
    expect(view.challenge.mode).toBe('div');
    const first = view.challenge.id;
    await click(host.querySelector('[data-mt-path-next="division"]'));
    await settle();
    expect(view.challenge.id).toBe(first);
    expect(active().id).toBe('multtable-input');
  });

  it('a teacher direction lock still wins when a step launches a question', async () => {
    const view = await mount({ ctx: { gradeLevel: '5th Grade' }, lab: { _multExt: { teacher: { lockMode: 'mult' } } } });
    await click(host.querySelector('[data-mt-path-next="division"]'));
    await settle();
    expect(view.challenge.mode).toBe('mult');
  });

  it('K-2: the arrays step focuses the prediction box', async () => {
    await mount({ ctx: { gradeLevel: '1st Grade' } });
    await click(host.querySelector('[data-mt-path-next="arrays"]'));
    await settle();
    expect(active().hasAttribute('data-mt-predict-input')).toBe(true);
  });

  it('the word-problem, fluency and number-detective steps start their activity and focus its first answer control', async () => {
    let view = await mount({ ctx: { gradeLevel: '4th Grade' }, lab: { _multExt: { pathOpen: true } } });
    await click(host.querySelector('[data-mt-path-step="words"]'));
    await settle();
    expect(view.lab._multExt.wp && view.lab._multExt.wp.phase).toBe('op');
    expect(active().hasAttribute('data-mt-wp-op')).toBe(true);
    await click(host.querySelector('[data-mt-path-step="climb"]'));
    await settle();
    expect(view.lab._multExt.flu && view.lab._multExt.flu.phase).toBe('play');
    expect(active().id).toBe('mt-flu-input');
    await act(() => root.unmount()); root = null; host.remove(); host = null;
    view = await mount({ ctx: { gradeLevel: '5th Grade' }, lab: { _multExt: { pathOpen: true } } });
    await click(host.querySelector('[data-mt-path-step="primes"]'));
    await settle();
    expect(view.lab._multExt.det && view.lab._multExt.det.item).toBeTruthy();
    expect(active().hasAttribute('data-mt-det-choice')).toBe(true);
  });

  it('a teacher fluency clock is not started by the step button: it only focuses Start', async () => {
    const view = await mount({ ctx: { gradeLevel: '4th Grade' }, lab: { _multExt: { pathOpen: true, teacher: { fluencyTimer: 180 } } } });
    await click(host.querySelector('[data-mt-path-step="climb"]'));
    await settle();
    expect(view.lab._multExt.flu).toBeUndefined();
    expect(active().hasAttribute('data-mt-flu-start')).toBe(true);
  });
});

describe('2. Practice opens on one choice', () => {
  function focusablesBefore(target) {
    const all = [...host.querySelectorAll('button,select,input,textarea,a[href],[tabindex]')].filter((n) => n.tabIndex >= 0 && !n.disabled);
    return all.indexOf(target);
  }
  it('the fact set is preselected; direction and range are under "Change practice"; Quick Quiz is about 10 tab stops in', async () => {
    const view = await mount({ ctx: { gradeLevel: '4th Grade' } });
    expect(host.querySelector('[role="group"][aria-label="Direction"]')).toBeNull();
    expect(host.querySelector('[role="group"][aria-label="Which facts"]')).toBeNull();
    const radios = [...host.querySelectorAll('[data-mt-band] [role="radio"]')];
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
    expect(radios.map((r) => r.tabIndex)).toEqual([-1, 0, -1]);
    expect(host.querySelector('[data-mt-practice-now]').textContent).toBe('Now: Multiplication, All to 10 (2-10).');
    const quiz = button('Quick Quiz');
    expect(focusablesBefore(quiz)).toBeLessThanOrEqual(11);
    const toggle = host.querySelector('[data-mt-setup-toggle]');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    await click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-controls')).toBe('mt-practice-setup');
    await click(button('Division', host.querySelector('[role="group"][aria-label="Direction"]')));
    await click(button('Hard (2-12)'));
    expect(view.lab._multExt).toMatchObject({ quizMode: 'div', difficulty: 'hard' });
    expect(host.querySelector('[data-mt-practice-now]').textContent).toBe('Now: Division, Hard (2-12).');
    await click(button('Hide practice choices'));
    expect(host.querySelector('[role="group"][aria-label="Direction"]')).toBeNull();
  });

  it('arrow keys move through the fact sets and choose one, skipping a set the teacher locked out', async () => {
    const view = await mount({ ctx: { gradeLevel: '4th Grade' } });
    await key(host.querySelector('#mt-band-core'), 'ArrowRight');
    expect(view.lab._multExt).toMatchObject({ band: 'extend', difficulty: 'hard', quizMode: 'mixed' });
    expect(active().id).toBe('mt-band-extend');
    await key(active(), 'ArrowRight');
    expect(view.lab._multExt.band).toBe('early');
    expect(view.ann.at(-1)).toBe('Fact set: Arrays with 2s, 5s and 10s.');
  });
});

describe('3. K-2 arrays respond', () => {
  it('K-2 opens on 2 rows of 5 with band-fact chips; the live dots follow the sliders and the total stays "?"', async () => {
    await mount({ ctx: { gradeLevel: '1st Grade' } });
    expect(host.querySelector('#mt-visual-a').value).toBe('2');
    expect(host.querySelector('#mt-visual-b').value).toBe('5');
    const chips = host.querySelector('[data-mt-vis-chips]');
    expect(chips.getAttribute('data-mt-vis-chips')).toBe('band');
    expect(chips.textContent).not.toMatch(/6×7|7×8|12×12/);
    expect(chips.textContent).toContain('2×5');
    expect(dots()).toBe(10);
    expect(host.querySelector('[data-mt-live-total]').textContent).toBe('2 × 5 = ?');
    const card = () => host.querySelector('[data-mt-predict]').textContent;
    expect(card()).not.toMatch(/\b10\b/);
    expect(host.querySelectorAll('[data-mt-skip-total]').length).toBe(0);
    await slide('mt-visual-a', 3);
    expect(dots()).toBe(15);
    expect(host.querySelector('[data-mt-live-total]').textContent).toBe('3 × 5 = ?');
    expect(card()).not.toMatch(/\b15\b/);
    expect(panel().textContent).not.toMatch(/\b15\b/);
  });

  it('after a build, moving a slider keeps the dots on screen; only the new total goes back to "?"', async () => {
    await mount({ ctx: { gradeLevel: '1st Grade' } });
    await click('I am not sure: just build it');
    expect(host.querySelector('[data-mt-built]')).toBeTruthy();
    await slide('mt-visual-b', 2);
    expect(dots()).toBe(4);
    expect(host.querySelector('[data-mt-live-total]').textContent).toBe('2 × 2 = ?');
  });

  it('grade 3+ keep the tricky-fact chips and the 7 × 8 start', async () => {
    await mount({ ctx: { gradeLevel: '4th Grade' }, lab: { _multExt: { mtTab: 'visual' } } });
    expect(host.querySelector('[data-mt-vis-chips]').getAttribute('data-mt-vis-chips')).toBe('tricky');
    expect(host.querySelector('#mt-visual-a').value).toBe('7');
    expect(host.querySelector('#mt-visual-b').value).toBe('8');
  });

  it('facts the learner picks and builds earn no XP, the Visual Explorer badge included', async () => {
    const explored = {};
    for (const k of ['2x2', '2x3', '2x4', '2x6', '2x7', '2x8', '2x9', '3x3', '3x4']) explored[k] = true;
    const view = await mount({ ctx: { gradeLevel: '1st Grade' }, lab: { _multExt: { visualExplored: explored } } });
    await typeInto('[data-mt-predict-input]', 10);
    await click('Build it and check');
    expect(view.lab._multExt.badges.visualLearner).toBe(true);
    expect(view.awards).toEqual([]);
  });
});

describe('4. Tap-to-skip-count rows', () => {
  it('rows are not tappable before the build; after it, each tap announces the running total', async () => {
    const view = await mount({ ctx: { gradeLevel: '1st Grade' }, lab: { _multExt: { visualA: 4, visualB: 5, visualSkipOn: false } } });
    expect(host.querySelectorAll('[data-mt-skiprow]').length).toBe(0);
    await click('I am not sure: just build it');
    const rows = () => [...host.querySelectorAll('[data-mt-skiprow]')];
    expect(rows().length).toBe(4);
    expect(rows().map((r) => r.tabIndex)).toEqual([0, -1, -1, -1]);
    expect(host.querySelectorAll('[data-mt-skip-total]').length).toBe(0);
    await click(rows()[0]);
    expect(view.ann.at(-1)).toBe('1 row of 5 makes 5.');
    await click(rows()[2]);
    expect(view.ann.at(-1)).toBe('3 rows of 5 make 15.');
    expect(host.querySelector('[data-mt-skip-said]').textContent).toBe('Skip-count so far: 5, 10, 15');
    expect([...host.querySelectorAll('[data-mt-skip-total]')].map((n) => n.getAttribute('data-mt-skip-total'))).toEqual(['5', '10', '15']);
    expect(rows().map((r) => r.getAttribute('data-counted'))).toEqual(['true', 'true', 'true', 'false']);
    // Roving focus: one tab stop, arrows move it.
    await act(() => rows()[2].focus());
    await key(rows()[2], 'ArrowDown');
    expect(active()).toBe(rows()[3]);
    expect(rows().map((r) => r.tabIndex)).toEqual([-1, -1, -1, 0]);
    await key(rows()[3], 'Home');
    expect(active()).toBe(rows()[0]);
    expect(view.awards).toEqual([]);
  });

  it('with the overlay on, the running totals appear only once the array is built', async () => {
    await mount({ ctx: { gradeLevel: '1st Grade' } });
    expect(host.querySelectorAll('[data-mt-skip-total]').length).toBe(0);
    await click('I am not sure: just build it');
    expect([...host.querySelectorAll('[data-mt-skip-total]')].map((n) => n.getAttribute('data-mt-skip-total'))).toEqual(['5', '10']);
  });
});

describe('5. Focus is kept after build buttons', () => {
  it('"Build this fact" focuses the prediction box on the Arrays tab', async () => {
    await mount({ ctx: { gradeLevel: '4th Grade' } });
    const b = button('Build this fact');
    await act(() => b.focus());
    await click(b);
    await settle();
    expect(host.querySelector('#multtable-tab-visual').getAttribute('aria-selected')).toBe('true');
    expect(active().hasAttribute('data-mt-predict-input')).toBe(true);
  });

  it('"Build it and check" and "just build it" focus the first row; "predict again" returns to the prediction box', async () => {
    await mount({ ctx: { gradeLevel: '1st Grade' } });
    await typeInto('[data-mt-predict-input]', 9);
    await click('Build it and check');
    await settle();
    expect(active().getAttribute('data-mt-skiprow')).toBe('1');
    await click('Hide the total and predict again');
    await settle();
    expect(active().hasAttribute('data-mt-predict-input')).toBe(true);
    await click('I am not sure: just build it');
    await settle();
    expect(active().getAttribute('data-mt-skiprow')).toBe('1');
    expect(active()).not.toBe(document.body);
  });
});
