import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Multiplication Table stage E (2026-11-04, approved by Aaron): a fluency round
// that ends because the teacher's clock runs out counts as a finished round,
// with only the facts actually answered recorded. It must count exactly once
// (clock vs last "Next", unmount mid-round) and pay no XP for unanswered facts.
// MULTTABLE_DEEP_SRC points the suite at another copy (mutation check).

const FILE = process.env.MULTTABLE_DEEP_SRC || 'stem_lab/stem_tool_multtable.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
let host = null;

beforeEach(() => { resetStemLab(); loadTool(FILE, 'multtable'); vi.useFakeTimers(); });
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
  const view = opts.view || { awards: [], ann: [] };
  function App() {
    const [lab, setLab] = React.useState(opts.lab || {});
    const [answer, setAnswer] = React.useState('');
    const [challenge, setChallenge] = React.useState(null);
    const [feedback, setFeedback] = React.useState(null);
    const [hidden, setHidden] = React.useState(false);
    const [revealed, setRevealed] = React.useState(new Set());
    const [score, setScore] = React.useState({ correct: 0, total: 0 });
    Object.assign(view, { lab, setLab });
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
async function unmount() { await React.act(async () => { root.unmount(); }); root = null; host.remove(); host = null; }
const act = (fn) => React.act(async () => { await fn(); });
function button(name) {
  return [...host.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === name || b.textContent.trim() === name) || null;
}
async function click(name) {
  const b = typeof name === 'string' ? button(name) : name;
  expect(b, 'button ' + name).toBeTruthy();
  expect(b.disabled, 'button ' + name + ' disabled').toBe(false);
  await act(() => b.click());
}
async function typeInto(selector, value) {
  const input = host.querySelector(selector);
  expect(input, 'input ' + selector).toBeTruthy();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await act(() => { setter.call(input, String(value)); input.dispatchEvent(new Event('input', { bubbles: true })); });
}
const text = (sel) => (host.querySelector(sel) || { textContent: '' }).textContent;
const ans = (it) => (it.mode === 'div' ? (it.divisor === it.a ? it.b : it.a) : it.a * it.b);
const factAwards = (view) => view.awards.filter((a) => a[0] === 'multtable' && /^multiplication fact/.test(a[2]));
const badgeAwards = (view) => view.awards.filter((a) => a[0] === 'multtable' && a[2] === 'badge');
const advance = (ms) => act(() => vi.advanceTimersByTimeAsync(ms));
const TEACH = { fluencyTimer: 180 };
function timedRound(round, secs, extra) {
  return { _multExt: Object.assign({ mtTab: 'fluency', teacher: TEACH, flu: { id: 'r-test', round, i: 0, results: [], tries: 0, lastWrong: null, mistake: null, phase: 'play', resolved: false, comeBack: [],
    timer: { active: true, paused: false, endTime: Date.now() + secs * 1000, timeLeft: secs, limit: 180 }, timeUp: false } }, extra || {}) };
}

describe('a fluency round that runs out of time counts as finished', () => {
  it('counts the round once, records only the answered facts, and pays no XP for the rest', async () => {
    const view = await mount({ lab: { _multExt: { mtTab: 'fluency', teacher: TEACH } }, ctx: { gradeLevel: '3rd Grade' } });
    await click('Start a round');
    expect(host.querySelector('[role="timer"]')).toBeTruthy();
    for (let i = 0; i < 3; i++) {
      const f = view.lab._multExt.flu;
      await typeInto('#mt-flu-input', ans(f.round[f.i]));
      await click('✔ Check');
      await click('Next question');
    }
    // The fourth fact gets one wrong try, then the clock runs out mid-fact.
    const f4 = view.lab._multExt.flu;
    const pending = f4.round[f4.i];
    await typeInto('#mt-flu-input', ans(pending) + 1);
    await click('✔ Check');
    expect(view.lab._multExt.flu.resolved).toBe(false);
    const xpBefore = factAwards(view).length;
    await advance(181000);
    const ext = view.lab._multExt;
    expect(ext.flu.phase).toBe('done');
    expect(ext.flu.timeUp).toBe(true);
    expect(ext.fluencyRounds).toBe(1);
    expect(ext.fluencyBest).toBe(3);
    expect(ext.badges.fluencyClimber).toBe(true);
    expect(ext.flu.results).toHaveLength(3);
    // The unanswered fact is not a mistake, not a score and not XP.
    const pk = Math.min(pending.a, pending.b) + 'x' + Math.max(pending.a, pending.b);
    expect((ext.visit.missed || []).some((m) => m.a === pending.a && m.b === pending.b)).toBe(false);
    expect(ext.factScores[pk]).toBeUndefined();
    expect(factAwards(view)).toHaveLength(3);
    expect(factAwards(view).length).toBe(xpBefore);
    expect(badgeAwards(view)).toHaveLength(1);
    expect(text('[data-mt-flu-done]')).toContain('Time is up.');
    expect(text('[data-mt-flu-done]')).toContain('Round finished: 3 of 3 facts right on the first try.');
    // More clock time changes nothing.
    await advance(20000);
    expect(view.lab._multExt.fluencyRounds).toBe(1);
    expect(badgeAwards(view)).toHaveLength(1);
  });

  it('the clock and the last "Next" racing in one batch count the round once (clock first)', async () => {
    const view = await mount({ lab: timedRound([{ a: 7, b: 8, mode: 'mult' }], 5) });
    await typeInto('#mt-flu-input', 56); await click('✔ Check');
    const next = button('Next question');
    await act(() => { vi.advanceTimersByTime(6000); next.click(); });
    await advance(2000);
    expect(view.lab._multExt.fluencyRounds).toBe(1);
    expect(view.lab._multExt.flu.phase).toBe('done');
    expect(badgeAwards(view)).toHaveLength(1);
    expect(factAwards(view)).toHaveLength(1);
  });

  it('the clock and the last "Next" racing in one batch count the round once (Next first)', async () => {
    const view = await mount({ lab: timedRound([{ a: 7, b: 8, mode: 'mult' }], 5) });
    await typeInto('#mt-flu-input', 56); await click('✔ Check');
    const next = button('Next question');
    await act(() => { next.click(); vi.advanceTimersByTime(6000); });
    await advance(2000);
    expect(view.lab._multExt.fluencyRounds).toBe(1);
    expect(view.lab._multExt.flu.phase).toBe('done');
    expect(view.lab._multExt.flu.timeUp).not.toBe(true);
    expect(badgeAwards(view)).toHaveLength(1);
  });

  it('an answer and the clock in one batch: the answered fact is recorded and the round counts once', async () => {
    const view = await mount({ lab: timedRound([{ a: 7, b: 8, mode: 'mult' }, { a: 6, b: 9, mode: 'mult' }], 5) });
    await typeInto('#mt-flu-input', 56);
    const check = button('✔ Check');
    await act(() => { check.click(); vi.advanceTimersByTime(6000); });
    await advance(2000);
    const ext = view.lab._multExt;
    expect(ext.fluencyRounds).toBe(1);
    expect(ext.fluencyBest).toBe(1);
    expect(ext.flu.phase).toBe('done');
    expect(ext.flu.results).toHaveLength(1);
    expect(factAwards(view)).toHaveLength(1);
    expect(badgeAwards(view)).toHaveLength(1);
  });

  it('an answer checked in the same batch just after the clock ran out is not recorded and does not reopen the round', async () => {
    const view = await mount({ lab: timedRound([{ a: 7, b: 8, mode: 'mult' }, { a: 6, b: 9, mode: 'mult' }], 5) });
    await typeInto('#mt-flu-input', 56); await click('✔ Check'); await click('Next question');
    await typeInto('#mt-flu-input', 54);
    const check = button('✔ Check');
    await act(() => { vi.advanceTimersByTime(6000); check.click(); });
    await advance(2000);
    const ext = view.lab._multExt;
    expect(ext.flu.phase).toBe('done');
    expect(ext.flu.timeUp).toBe(true);
    expect(ext.flu.results).toHaveLength(1);
    expect(ext.factScores['6x9']).toBeUndefined();
    expect(ext.fluencyRounds).toBe(1);
    expect(factAwards(view)).toHaveLength(1);
    expect(badgeAwards(view)).toHaveLength(1);
  });

  it('a mid-round "Next" or "Show me the answer" in the same batch as the clock does not reopen the round', async () => {
    const round = [{ a: 7, b: 8, mode: 'mult' }, { a: 6, b: 9, mode: 'mult' }, { a: 4, b: 3, mode: 'mult' }];
    const view = await mount({ lab: timedRound(round, 5) });
    await typeInto('#mt-flu-input', 56); await click('✔ Check');
    const next = button('Next question');
    await act(() => { vi.advanceTimersByTime(6000); next.click(); });
    await advance(2000);
    expect(view.lab._multExt.flu.phase).toBe('done');
    expect(view.lab._multExt.fluencyRounds).toBe(1);

    await unmount();
    const v2 = await mount({ lab: timedRound(round, 5) });
    await typeInto('#mt-flu-input', 56); await click('✔ Check'); await click('Next question');
    await typeInto('#mt-flu-input', 15); await click('✔ Check');
    await typeInto('#mt-flu-input', 63); await click('✔ Check');
    const reveal = button('Show me the answer');
    expect(reveal).toBeTruthy();
    await act(() => { vi.advanceTimersByTime(6000); reveal.click(); });
    await advance(2000);
    const ext = v2.lab._multExt;
    expect(ext.flu.phase).toBe('done');
    expect(ext.flu.results).toHaveLength(1);
    expect(ext.fluencyRounds).toBe(1);
    expect((ext.visit.missed || []).some((m) => m.a === 6 && m.b === 9)).toBe(false);
  });

  it('unmounting mid-round: the round counts once, when the tool is back and the clock has run out', async () => {
    const view = await mount({ lab: timedRound([{ a: 7, b: 8, mode: 'mult' }, { a: 6, b: 9, mode: 'mult' }, { a: 4, b: 3, mode: 'mult' }], 20) });
    await typeInto('#mt-flu-input', 56); await click('✔ Check'); await click('Next question');
    expect(view.lab._multExt.fluencyRounds).toBeUndefined();
    const saved = view.lab;
    await unmount();
    await advance(30000);
    const view2 = await mount({ lab: saved, view: { awards: view.awards, ann: [] } });
    await advance(600);
    expect(view2.lab._multExt.fluencyRounds).toBe(1);
    expect(view2.lab._multExt.fluencyBest).toBe(1);
    expect(view2.lab._multExt.flu.timeUp).toBe(true);
    await advance(5000);
    const saved2 = view2.lab;
    await unmount();
    const view3 = await mount({ lab: saved2, view: { awards: view.awards, ann: [] } });
    await advance(5000);
    expect(view3.lab._multExt.fluencyRounds).toBe(1);
    expect(badgeAwards(view)).toHaveLength(1);
    expect(factAwards(view)).toHaveLength(1);
  });

  it('a round finished before the clock runs out still counts once when the clock later passes zero', async () => {
    const view = await mount({ lab: timedRound([{ a: 7, b: 8, mode: 'mult' }], 5) });
    await typeInto('#mt-flu-input', 56); await click('✔ Check'); await click('Next question');
    expect(view.lab._multExt.fluencyRounds).toBe(1);
    await advance(10000);
    expect(view.lab._multExt.fluencyRounds).toBe(1);
    expect(view.lab._multExt.flu.timeUp).not.toBe(true);
    expect(badgeAwards(view)).toHaveLength(1);
  });

  it('a timed-out round with no answered fact is not a finished round and says nothing about "every fact"', async () => {
    const view = await mount({ lab: timedRound([{ a: 7, b: 8, mode: 'mult' }], 5) });
    await advance(6000);
    const ext = view.lab._multExt;
    expect(ext.flu.phase).toBe('done');
    expect(ext.flu.timeUp).toBe(true);
    expect(ext.fluencyRounds).toBeUndefined();
    expect((ext.badges || {}).fluencyClimber).toBeUndefined();
    expect(view.awards).toHaveLength(0);
    expect(text('[data-mt-flu-done]')).toContain('Time is up.');
    expect(text('[data-mt-flu-done]')).not.toContain('Every fact was right on the first try');
    expect(text('[data-mt-flu-done]')).not.toContain('Round finished');
  });
});

// Stage E2 (2026-11-04, approved by Aaron): when the clock ends a round, the focused answer box
// disappears; focus moves to the round's "Play another round" control instead of being lost.
describe('focus when the clock ends a fluency round', () => {
  it('moves focus from the answer box to "Play another round" on time-up', async () => {
    const view = await mount({ lab: timedRound([{ a: 7, b: 8, mode: 'mult' }, { a: 6, b: 9, mode: 'mult' }], 5) });
    await typeInto('#mt-flu-input', 56); await click('✔ Check'); await click('Next question');
    await advance(100);
    const input = host.querySelector('#mt-flu-input');
    await act(() => { input.focus(); });
    expect(document.activeElement).toBe(input);
    // Run the clock tick that ends the round on its own, so React renders the done state before the
    // focus timer fires (as in a browser; one long advance inside act would hold the render back).
    vi.setSystemTime(Date.now() + 6000);
    for (let n = 0; n < 20 && view.lab._multExt.flu.phase !== 'done'; n++) await act(() => { vi.advanceTimersToNextTimer(); });
    await advance(100);
    expect(view.lab._multExt.flu.phase).toBe('done');
    expect(host.querySelector('#mt-flu-input')).toBeNull();
    const start = host.querySelector('[data-mt-flu-start]');
    expect(start, 'the done state has the start control').toBeTruthy();
    expect(start.textContent).toBe('Play another round');
    expect(document.activeElement, 'focus lands on the start control, not the page body').toBe(start);
  });

  it('a clock that ran out while the tool was closed does not pull focus when the tool comes back', async () => {
    const view = await mount({ lab: timedRound([{ a: 7, b: 8, mode: 'mult' }, { a: 6, b: 9, mode: 'mult' }], 20) });
    await typeInto('#mt-flu-input', 56); await click('✔ Check'); await click('Next question');
    const saved = view.lab;
    await unmount();
    await advance(30000);
    const outside = document.createElement('button');
    outside.textContent = 'outside';
    document.body.appendChild(outside);
    outside.focus();
    const view2 = await mount({ lab: saved, view: { awards: view.awards, ann: [] } });
    for (let n = 0; n < 20 && view2.lab._multExt.flu.phase !== 'done'; n++) await act(() => { vi.advanceTimersToNextTimer(); });
    await advance(100);
    expect(view2.lab._multExt.flu.phase).toBe('done');
    expect(host.querySelector('[data-mt-flu-start]')).toBeTruthy();
    expect(document.activeElement, 'focus stays where the student put it').toBe(outside);
  });
});
