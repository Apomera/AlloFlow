import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Multiplication Table deep rebuild (2026-11-03): the practice loop, mounted
// and clicked. Review items (C:\tmp\stem_tool_review_2026-11-03b\arith_mult_report.md):
// A/B AI path, C fair XP, D "Practice these", E stop-early results, H teacher gate.
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
  vi.restoreAllMocks();
  vi.useRealTimers();
});

async function mount(opts = {}) {
  const tool = window.StemLab._registry.multtable;
  const view = { awards: [], ann: [], toasts: [] };
  function App() {
    const [lab, setLab] = React.useState(opts.lab || {});
    const [answer, setAnswer] = React.useState(opts.answer || '');
    const [challenge, setChallenge] = React.useState(opts.challenge || null);
    const [feedback, setFeedback] = React.useState(null);
    const [hidden, setHidden] = React.useState(false);
    const [revealed, setRevealed] = React.useState(new Set());
    const [score, setScore] = React.useState({ correct: 0, total: 0 });
    Object.assign(view, { lab, challenge, feedback, score, setChallenge, setLab });
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
const act = (fn) => React.act(async () => { await fn(); });
function button(name) {
  return [...host.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === name || b.textContent.trim() === name) || null;
}
async function click(name) {
  const b = typeof name === 'string' ? button(name) : name;
  expect(b, 'button ' + name).toBeTruthy();
  await act(() => b.click());
}
async function type(value) {
  const input = host.querySelector('#multtable-input');
  expect(input, 'answer input').toBeTruthy();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await act(() => { setter.call(input, String(value)); input.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function answer(value) { await type(value); await click('Check'); }
const right = (c) => (c.mode === 'div' ? (c.divisor === c.a ? c.b : c.a) : c.mode === 'missing' ? (c.known === c.a ? c.b : c.a) : c.a * c.b);
const feedbackText = () => (host.querySelector('[data-mt-feedback]') || { textContent: '' }).textContent;
const xpFacts = (view) => view.awards.filter((a) => a[0] === 'multtable' && a[2] !== 'badge');

describe('second try with a named mistake before any reveal', () => {
  it('names an added answer, keeps the answer hidden, and lets the learner try again', async () => {
    const view = await mount({ challenge: { a: 7, b: 8, mode: 'mult', divisor: null, source: 'tool', id: 'q1' } });
    await answer(15);
    expect(view.feedback).toMatchObject({ correct: false, retry: true, tries: 1 });
    expect(host.querySelector('[data-mt-mistake="added"]').textContent).toContain('7 + 8 = 15');
    expect(feedbackText()).not.toMatch(/\b56\b/);
    expect(host.querySelector('#multtable-input').disabled).toBe(false);
    expect(view.score).toEqual({ correct: 0, total: 0 });
    expect(feedbackText()).toContain('Find 8 × 5 and 8 × 2, then add.');

    await answer(65);
    expect(host.querySelector('[data-mt-mistake="swapped"]')).toBeTruthy();
    expect(host.querySelector('[data-mt-hint-picture]')).toBeTruthy();
    expect(feedbackText()).not.toMatch(/\b56\b/);
    expect(button('Show me the answer')).toBeTruthy();

    await answer(63);
    expect(view.feedback).toMatchObject({ correct: false, resolved: true, revealed: true, tries: 3 });
    expect(feedbackText()).toContain('7 × 8 = 56');
    expect(view.lab._multExt.factScores['7x8']).toEqual({ attempts: 1, correct: 0 });
    expect(view.score).toEqual({ correct: 0, total: 1 });
    expect(xpFacts(view)).toHaveLength(0);
  });

  it('a right second try earns reduced XP and does not count as first-try mastery', async () => {
    const view = await mount({ challenge: { a: 6, b: 7, mode: 'mult', source: 'tool', id: 'q2' } });
    await answer(13);
    await answer(42);
    expect(view.feedback).toMatchObject({ correct: true, resolved: true, firstTry: false, tries: 2 });
    expect(view.lab._multExt.factScores['6x7']).toEqual({ attempts: 1, correct: 0 });
    expect(xpFacts(view)).toEqual([['multtable', 2, 'multiplication fact, second try']]);
  });

  it('names giving the product for a division question', async () => {
    await mount({ challenge: { a: 7, b: 8, mode: 'div', divisor: 7, source: 'tool', id: 'q3' } });
    await answer(56);
    const m = host.querySelector('[data-mt-mistake="product"]');
    expect(m.textContent).toContain('groups of 7 fit into 56');
    expect(feedbackText()).toContain('Count by 7s');
    expect(feedbackText()).not.toMatch(/(^|[^\d])8([^\d]|$)/);
  });

  it('never shows the answer in the hints, for every multiplication and division fact', async () => {
    const view = await mount();
    for (let a = 1; a <= 12; a++) for (let b = 1; b <= 12; b++) {
      for (const ch of [{ a, b, mode: 'mult' }, { a, b, mode: 'div', divisor: a }]) {
        const ans = right(ch);
        const shown = ch.mode === 'div' ? [a * b, ch.divisor] : [a, b]; // numbers the question itself shows
        await act(() => view.setChallenge({ ...ch, source: 'tool', id: 'sweep-' + a + '-' + b + ch.mode }));
        await act(() => view.setLab((p) => ({ ...p, _multInputDisabled: false })));
        await answer(ans + 100);
        await answer(ans + 200);
        if (shown.includes(ans)) continue; // the question itself already shows it
        const panel = host.querySelector('[data-mt-retry]').cloneNode(true);
        panel.querySelectorAll('[data-mt-tries]').forEach((n) => n.remove()); // "Try 3 of 3" is a counter, not a hint
        const text = panel.textContent;
        expect(new RegExp('(^|[^\\d])' + ans + '([^\\d]|$)').test(text), ch.mode + ' ' + a + 'x' + b + ': ' + text).toBe(false);
      }
    }
  }, 120000);
});

describe('AI hint path (review A, B)', () => {
  it('works fully offline: no AI button, the strategy coach opens, nothing throws', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    await mount({ ctx: { callGemini: null } });
    expect(button('Get a hint from AI')).toBeNull();
    await click(button('🧭 Strategy coach'));
    expect(host.querySelector('[data-mt-coach]')).toBeTruthy();
    expect(host.textContent).not.toMatch(/Thinking/);
    expect(errors).not.toHaveBeenCalled();
  });

  it('routes through ctx.getHint with the division problem itself, after two tries', async () => {
    const callGemini = vi.fn(() => Promise.resolve('x'));
    const getHint = vi.fn((tool, q, wrong, correct, tries, show) => show('💡 Think of 7 groups.'));
    await mount({ challenge: { a: 7, b: 8, mode: 'div', divisor: 7, source: 'tool', id: 'q4' }, ctx: { callGemini, getHint, aiHintsEnabled: true } });
    await answer(7);
    expect(button('Get a hint from AI')).toBeNull();
    await answer(6);
    await click('Get a hint from AI');
    expect(getHint).toHaveBeenCalledTimes(1);
    expect(getHint.mock.calls[0].slice(0, 5)).toEqual(['multtable', '56 ÷ 7 = ?', '6', '8', 2]);
    expect(callGemini).not.toHaveBeenCalled();
    expect(feedbackText()).toContain('Think of 7 groups.');
  });

  it('hides the AI hint when the teacher has hints switched off', async () => {
    await mount({ challenge: { a: 7, b: 8, mode: 'mult', source: 'tool', id: 'q5' }, ctx: { callGemini: vi.fn(), getHint: vi.fn(), aiHintsEnabled: false } });
    await answer(1); await answer(2);
    expect(button('Get a hint from AI')).toBeNull();
  });
});

describe('fair XP (review C)', () => {
  it('a fact picked from the table earns no XP, and the table hides answers while a question is open', async () => {
    const view = await mount();
    const cell = host.querySelector('[data-mt-grid="table"] [data-r="1"][data-c="1"]');
    await act(() => cell.click());
    await click('Practise this fact (no XP)');
    expect(view.challenge).toMatchObject({ a: 1, b: 1, source: 'chosen' });
    expect(host.querySelector('[data-mt-grid="table"] [data-r="7"][data-c="8"]').textContent).toBe('?');
    for (let i = 0; i < 3; i++) {
      await answer(1);
      await act(() => view.setChallenge({ a: 1, b: 1, mode: 'mult', source: 'chosen', id: 'again' + i }));
      await act(() => view.setLab((p) => ({ ...p, _multInputDisabled: false })));
    }
    expect(xpFacts(view)).toHaveLength(0);
    expect(view.lab._multExt.totalCorrect || 0).toBe(0);
  });

  it('a tool-chosen fact earns XP once per visit, and a revealed fact earns none', async () => {
    const view = await mount({ challenge: { a: 3, b: 4, mode: 'mult', source: 'tool', id: 'a' } });
    await answer(12);
    await act(() => view.setChallenge({ a: 4, b: 3, mode: 'mult', source: 'tool', id: 'b' }));
    await act(() => view.setLab((p) => ({ ...p, _multInputDisabled: false })));
    await answer(12);
    expect(xpFacts(view)).toEqual([['multtable', 5, 'multiplication fact']]);

    await act(() => view.setChallenge({ a: 6, b: 9, mode: 'mult', source: 'tool', id: 'c' }));
    await act(() => view.setLab((p) => ({ ...p, _multInputDisabled: false })));
    await answer(1); await answer(2); await answer(3);
    await act(() => view.setChallenge({ a: 6, b: 9, mode: 'mult', source: 'tool', id: 'd' }));
    await act(() => view.setLab((p) => ({ ...p, _multInputDisabled: false })));
    await answer(54);
    expect(xpFacts(view)).toHaveLength(1);
  });

  it('speed badges carry no XP', async () => {
    const view = await mount({ lab: { _multTimer: { active: true, paused: false, endTime: Date.now() + 60000, score: 20, total: 20, timeLeft: 60, missed: [] } } });
    await click('Stop');
    expect(view.lab._multExt.badges).toMatchObject({ speedDemon: true, perfectRun: true });
    expect(view.awards.filter((a) => a[2] === 'badge')).toHaveLength(0);
  });
});

describe('speed run (review E) and practice sets (review D)', () => {
  const missed = [{ a: 7, b: 8, answer: 56, mode: 'mult' }, { a: 6, b: 9, answer: 54, mode: 'mult' }, { a: 8, b: 8, answer: 64, mode: 'mult' }];

  it('stopping early still shows the results and the missed list', async () => {
    const view = await mount({ lab: { _multTimer: { active: true, paused: true, score: 4, total: 6, timeLeft: 80, endTime: Date.now() + 80000, missed: [missed[0]] } } });
    await click('Stop');
    expect(view.lab._multTimer).toMatchObject({ active: false, ended: true, endedEarly: true, timeLeft: 80 });
    const results = host.querySelector('[data-mt-results]');
    expect(results).toBeTruthy();
    expect(results.textContent).toContain('You stopped the run with 80 seconds left.');
    expect(results.textContent).toContain('Review mistakes (1)');
  });

  it('Try again starts a real run', async () => {
    const view = await mount({ lab: { _multTimer: { active: false, score: 5, total: 10, timeLeft: 0, missed: [] } } });
    await click('Try Again');
    expect(view.lab._multTimer).toMatchObject({ active: true, score: 0, total: 0, timeLeft: 120 });
    expect(view.challenge).toBeTruthy();
  });

  it('"Practice these" drills only the missed set until each is right first time', async () => {
    const view = await mount({ lab: { _multTimer: { active: false, score: 7, total: 10, timeLeft: 0, missed } } });
    await click('Practice These');
    const keys = new Set(missed.map((m) => Math.min(m.a, m.b) + 'x' + Math.max(m.a, m.b)));
    const seen = [];
    for (let i = 0; i < 12 && view.lab._multTimer.drill && view.lab._multTimer.drill.active; i++) {
      const c = view.challenge;
      seen.push(Math.min(c.a, c.b) + 'x' + Math.max(c.a, c.b));
      if (i === 0) { await answer(right(c) + 1); await answer(right(c) + 2); await answer(right(c) + 3); }
      else await answer(right(c));
      await click('Next question');
    }
    expect(seen.every((k) => keys.has(k)), seen.join(',')).toBe(true);
    expect(new Set(seen).size).toBe(3);
    expect(seen.length).toBe(4); // the fact missed inside the drill came back once
    expect(view.lab._multTimer.drill).toMatchObject({ active: false, done: true });
    expect(host.querySelector('[data-mt-drill]').textContent).toContain('all 3 facts');
    expect(xpFacts(view)).toHaveLength(0); // their answers were shown in the review
  });
});

describe('smart practice, grade bands and directions', () => {
  it('Smart practice serves the weak and missed facts most', async () => {
    let s = 99;
    vi.spyOn(Math, 'random').mockImplementation(() => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; });
    const factScores = {};
    for (let a = 2; a <= 12; a++) for (let b = a; b <= 12; b++) factScores[a + 'x' + b] = { attempts: 3, correct: 3 };
    factScores['7x8'] = { attempts: 3, correct: 0 };
    const view = await mount({ lab: { _multExt: { factScores, difficulty: 'adaptive' } } });
    const counts = {};
    for (let i = 0; i < 60; i++) {
      await click('Quick Quiz');
      const k = Math.min(view.challenge.a, view.challenge.b) + 'x' + Math.max(view.challenge.a, view.challenge.b);
      counts[k] = (counts[k] || 0) + 1;
    }
    const others = Object.entries(counts).filter(([k]) => k !== '7x8').map(([, n]) => n);
    expect(counts['7x8'] || 0).toBeGreaterThanOrEqual(3);
    expect(counts['7x8']).toBeGreaterThan(Math.max(...others));
  });

  it('a first grader starts on 2s, 5s and 10s with arrays suggested', async () => {
    const view = await mount({ ctx: { gradeLevel: '1st Grade' } });
    // Stage C: K-2 opens on Arrays & groups (the band's first activity); Practice is one tab away.
    expect(host.querySelector('[role="tab"][aria-selected="true"]').id).toBe('multtable-tab-visual');
    await click(host.querySelector('#multtable-tab-practice'));
    expect(host.querySelector('[data-mt-band]').getAttribute('data-mt-band')).toBe('early');
    for (let i = 0; i < 15; i++) {
      await click('Quick Quiz');
      const { a, b } = view.challenge;
      expect([a, b].some((x) => [2, 5, 10].includes(x)), a + 'x' + b).toBe(true);
    }
    expect(button('Open Arrays & groups')).toBeTruthy();
  });

  it('suggests division and missing factors for grade 5 and asks "7 × ? = 56" in missing-factor mode', async () => {
    const view = await mount({ ctx: { gradeLevel: '5th Grade' }, lab: { _multExt: { quizMode: 'missing' } } });
    expect(button('Division and missing factors ★')).toBeTruthy();
    await click('Quick Quiz');
    const c = view.challenge;
    expect(c.mode).toBe('missing');
    expect(host.querySelector('[data-mt-challenge]').textContent).toContain('?');
    await answer(right(c));
    expect(view.feedback).toMatchObject({ correct: true, firstTry: true });
  });

  it('"Use a fact I know" shows the anchor fact and asks for a neighbour', async () => {
    const view = await mount({ lab: { _multExt: { quizMode: 'derive' } } });
    await click('Quick Quiz');
    const c = view.challenge;
    expect(c.mode).toBe('derive');
    expect(host.querySelector('[data-mt-challenge]').textContent).toContain('You know ' + c.a + ' × ' + c.anchor + ' = ' + (c.a * c.anchor));
    await answer(c.a * c.anchor);
    expect(host.querySelector('[data-mt-mistake="anchorEcho"]')).toBeTruthy();
  });
});

describe('fading worked examples and cross-links', () => {
  it('shows every step at first, then asks the learner to work out the later steps', async () => {
    const view = await mount();
    const stepsShown = () => host.querySelectorAll('[data-fact-strategy-equation] > p').length;
    const facts = [[7, 8], [6, 8], [7, 9], [8, 6], [9, 7], [6, 6]];
    const seen = [];
    for (const [a, b] of facts) {
      await act(() => view.setChallenge({ a, b, mode: 'mult', source: 'tool', id: 'f' + a + b }));
      await act(() => view.setLab((p) => ({ ...p, _multInputDisabled: false })));
      await answer(a * b);
      seen.push(stepsShown());
    }
    expect(seen).toEqual([2, 2, 1, 1, 0, 0]);
    await click('Show the next step');
    expect(stepsShown()).toBe(1);
    await click('Show the next step');
    expect(stepsShown()).toBe(2);
    expect(host.querySelector('[data-fact-strategy-equation]').textContent).toContain('= 36');
  });

  it('links to the Area Model and Arithmetic Strategy Studio', async () => {
    const setStemLabTool = vi.fn();
    await mount({ ctx: { setStemLabTool } });
    await click('Area Model: split big facts');
    await click('Arithmetic Strategy Studio');
    expect(setStemLabTool.mock.calls).toEqual([['areamodel'], ['arithmeticStudio']]);
  });
});

describe('teacher hooks (review H)', () => {
  it('hides the teacher panel and threshold activity from learners', async () => {
    await mount();
    expect(host.querySelector('[data-mt-teacher]')).toBeNull();
    expect(host.querySelector('[data-teacher-mastery-demo]')).toBeNull();
  });

  it('teacher mode shows the panel; a band lock and two-try reveal apply to the learner', async () => {
    const view = await mount({ ctx: { isTeacherMode: true } });
    expect(host.querySelector('[data-teacher-mastery-demo]').open).toBe(false);
    await click(host.querySelector('[data-mt-teacher] [role="group"][aria-label="Lock the fact set"] button:nth-of-type(2)'));
    await click(host.querySelector('[data-mt-teacher] [role="group"][aria-label="Tries before the answer is shown"] button'));
    const saved = view.lab;
    await act(() => root.unmount()); root = null; host.remove(); host = null;
    // Stage C: a K-2 lock would open Arrays first, so this learner is on the Practice tab.
    const learner = await mount({ lab: { ...saved, _multExt: { ...saved._multExt, mtTab: 'practice' } }, challenge: { a: 7, b: 8, mode: 'mult', source: 'tool', id: 't1' } });
    expect(host.querySelector('[data-mt-teacher]')).toBeNull();
    expect(host.querySelector('[data-mt-band]').getAttribute('data-mt-band')).toBe('early');
    expect(button('All facts to 10').disabled).toBe(true);
    await answer(1);
    await answer(2);
    expect(learner.feedback).toMatchObject({ resolved: true, revealed: true, tries: 2 });
  });

  it('lists the session misses and mistake types for the teacher', async () => {
    await mount({ ctx: { isTeacherMode: true }, challenge: { a: 7, b: 8, mode: 'mult', source: 'tool', id: 't2' } });
    await answer(15); await answer(15); await answer(15);
    const panel = host.querySelector('[data-mt-teacher-missed]');
    expect(panel.textContent).toContain('7 × 8 = 56');
    expect(panel.textContent).toContain('Added instead of multiplied: 3');
  });
});

describe('Arrays & groups: predict, then build', () => {
  it('hides the total and the running totals until the learner commits a prediction', async () => {
    const view = await mount({ lab: { _multExt: { mtTab: 'visual', visualA: 7, visualB: 8 } } });
    const panel = host.querySelector('[role="tabpanel"]');
    expect(panel.textContent).not.toMatch(/\b56\b/);
    // Approved 2026-11-05: grades 3 and up get an empty frame before the prediction, so nothing can be counted (K-2: tests/multtable_engage.test.js).
    expect(panel.querySelectorAll('.allo-mt-dot')).toHaveLength(0);
    expect(host.querySelector('[data-mt-frame]')).toBeTruthy();
    expect(panel.querySelectorAll('[data-mt-skip-total]')).toHaveLength(0);
    expect(host.querySelector('[data-mt-live-total]').textContent).toBe('7 × 8 = ?');
    const input = host.querySelector('[data-mt-predict-input]');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    await act(() => { setter.call(input, '54'); input.dispatchEvent(new Event('input', { bubbles: true })); });
    await click('Build it and check');
    expect(panel.querySelectorAll('.allo-mt-dot')).toHaveLength(56);
    expect(panel.textContent).toContain('You predicted 54, and the array has 56 dots.');
    expect(view.lab._multExt.visualExplored).toEqual({ '7x8': true });
    expect(host.querySelector('[data-mt-derived]').textContent).toContain('5 + 3');
  });
});

describe('pattern claims (claim, evidence, reasoning)', () => {
  it('a counterexample settles a false claim, once for XP', async () => {
    const view = await mount({ lab: { _multExt: { mtTab: 'patterns' } } });
    const claim = host.querySelector('[data-mt-claim="squares_odd"]');
    const btnIn = (label) => [...claim.querySelectorAll('button')].find((b) => b.textContent.trim() === label);
    await act(() => btnIn('Always true').click());
    const [fa, fb] = claim.querySelectorAll('input');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    await act(() => { setter.call(fa, '4'); fa.dispatchEvent(new Event('input', { bubbles: true })); });
    await act(() => { setter.call(fb, '4'); fb.dispatchEvent(new Event('input', { bubbles: true })); });
    await act(() => btnIn('Test this fact').click());
    expect(claim.textContent).toContain('4 × 4 = 16: the rule breaks here');
    await act(() => btnIn('It is not always true').click());
    await act(() => btnIn('It is not always true').click());
    expect(claim.textContent).toContain('your counterexample proves');
    expect(view.awards.filter((a) => a[2] === 'pattern claim with evidence')).toHaveLength(1);
  });
});
