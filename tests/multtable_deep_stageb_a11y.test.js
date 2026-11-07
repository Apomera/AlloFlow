import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Multiplication Table stage B (2026-11-03): names, target sizes, full i18n,
// six keyboard tabs, console-clean mounts in every theme, and cleanup of the
// fluency clock and the rhythm on unmount. MULTTABLE_DEEP_SRC points the
// suite at another copy (mutation check).

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
  vi.restoreAllMocks();
  vi.useRealTimers();
});

async function mount(opts = {}) {
  const tool = window.StemLab._registry.multtable;
  const view = { ann: [] };
  function App() {
    const [lab, setLab] = React.useState(opts.lab || {});
    const [answer, setAnswer] = React.useState('');
    const [challenge, setChallenge] = React.useState(opts.challenge || null);
    const [feedback, setFeedback] = React.useState(opts.feedback || null);
    const [revealed, setRevealed] = React.useState(new Set());
    const [score, setScore] = React.useState({ correct: 0, total: 0 });
    view.lab = lab;
    return tool.render(makeCtx(Object.assign({
      labToolData: lab, setLabToolData: setLab,
      multTableAnswer: answer, setMultTableAnswer: setAnswer,
      multTableChallenge: challenge, setMultTableChallenge: setChallenge,
      multTableFeedback: feedback, setMultTableFeedback: setFeedback,
      multTableHidden: false, setMultTableHidden: () => {},
      multTableHover: null, setMultTableHover: () => {},
      multTableRevealed: revealed, setMultTableRevealed: setRevealed,
      exploreScore: score, setExploreScore: setScore,
      announceToSR: (m) => view.ann.push(String(m)),
    }, opts.ctx || {})));
  }
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(async () => { root.render(React.createElement(App)); });
  return view;
}
const act = (fn) => React.act(async () => { await fn(); });
async function unmount() { await act(() => root.unmount()); root = null; host.remove(); host = null; }

const share = { type: 'groups_share', a: 4, b: 6, p: 24, vals: { p: 24, a: 4 }, steps: [{ l: 24, op: 'div', r: 4, v: 6 }], ops: ['div'], answer: 6, variant: 1, id: 'w', options: [['mul'], ['div'], ['add'], ['sub']] };
const two = { type: 'two_add_div', a: 4, b: 6, p: 24, vals: { x: 20, y: 4, a: 4 }, steps: [{ l: 20, op: 'add', r: 4, v: 24 }, { l: 24, op: 'div', r: 4, v: 6 }], ops: ['add', 'div'], answer: 6, variant: 0, id: 'w2', options: [['add', 'div'], ['add', 'mul'], ['mul', 'div'], ['add']] };
const fam = { a: 6, b: 8, p: 48, id: 'fam:6x8', cards: [{ id: 'm1', l: 6, op: 'mul', r: 8, v: 48, ok: true }, { id: 'x1', l: 6, op: 'div', r: 48, v: 8, ok: false, kind: 'divReverse' }, { id: 'm2', l: 8, op: 'mul', r: 6, v: 48, ok: true }, { id: 'd1', l: 48, op: 'div', r: 6, v: 8, ok: true }, { id: 'x2', l: 6, op: 'add', r: 8, v: 48, ok: false, kind: 'addFamily' }, { id: 'd2', l: 48, op: 'div', r: 8, v: 6, ok: true }] };
const flu = (extra) => ({ round: [{ a: 7, b: 8, mode: 'mult' }, { a: 6, b: 9, mode: 'div', divisor: 6 }], i: 0, results: [], tries: 0, phase: 'play', resolved: false, comeBack: [], ...extra });

const STAGEB_STATES = [
  { name: 'factors default', lab: { _multExt: { mtTab: 'factors' } } },
  { name: 'factors working', lab: { _multExt: { mtTab: 'factors', fx: { n: 24, pred: 'composite', found: [[4, 6]], tests: [{ w: 5, ok: false, q: 4, r: 4 }, { w: 4, ok: true, q: 6, r: 0 }, { w: 30, ok: false, q: 0, r: 24 }], checks: 2 } } } },
  { name: 'factors complete + detective resolved', lab: { _multExt: { mtTab: 'factors', fx: { n: 12, pred: 'prime', found: [[1, 12], [2, 6], [3, 4]], tests: [], checks: 0, complete: true }, det: { item: { type: 'prime', n: 21, id: 'prime:21' }, tries: 2, wrong: ['prime', 'neither'], resolved: true, ok: false, mistake: { kind: 'oddPrime', n: 21, s: 4 } } } } },
  { name: 'detective retry (more)', lab: { _multExt: { mtTab: 'factors', det: { item: { type: 'more', x: 12, y: 31, answer: 12, id: 'more' }, tries: 1, wrong: [31], resolved: false, mistake: { kind: 'biggerMore', x: 12, y: 31 } } } } },
  { name: 'detective multiple resolved', lab: { _multExt: { mtTab: 'factors', det: { item: { type: 'multiple', n: 3, d: 9, id: 'm' }, tries: 2, wrong: ['yes'], resolved: true, ok: true, firstTry: false, mistake: { kind: 'factorNotMultiple', n: 3, d: 9 } } } } },
  { name: 'sieve predict', lab: { _multExt: { mtTab: 'factors', sieve: { n: 30, crossed: { 1: true }, primes: { 2: true }, phase: 'predict', p: 2, hits: 0, need: 0, done: false }, sieveFb: { kind: 'circled', n: 2 } } } },
  { name: 'sieve cross', lab: { _multExt: { mtTab: 'factors', sieve: { n: 50, crossed: { 1: true, 4: true }, primes: { 2: true }, phase: 'cross', p: 2, hits: 1, need: 24, done: false }, sieveFb: { kind: 'notMultiple', n: 7, p: 2, lo: 6, hi: 8, k1: 3, k2: 4 } } } },
  { name: 'sieve done', lab: { _multExt: { mtTab: 'factors', sieve: { n: 30, crossed: { 1: true, 4: true, 6: true, 8: true, 9: true, 10: true, 12: true, 14: true, 15: true, 16: true, 18: true, 20: true, 21: true, 22: true, 24: true, 25: true, 26: true, 27: true, 28: true, 30: true }, primes: { 2: true, 3: true, 5: true, 7: true, 11: true, 13: true, 17: true, 19: true, 23: true, 29: true }, phase: 'done', p: null, hits: 0, need: 0, done: true }, sieveFb: { kind: 'finished', p: 7, sq: 49, n: 30, count: 10 } } } },
  { name: 'words idle', lab: { _multExt: { mtTab: 'words' } } },
  { name: 'words op mistake', lab: { _multExt: { mtTab: 'words', wp: { item: share, phase: 'op', opTries: 1, opWrong: ['mul'], opMistake: { kind: 'multForDiv' }, step: 0, ansTries: 0, solved: [] } } } },
  { name: 'words solve with hint picture', lab: { _multExt: { mtTab: 'words', wp: { item: share, phase: 'solve', opTries: 2, opWrong: ['mul'], opMistake: { kind: 'multForDiv' }, opRevealed: true, step: 0, ansTries: 2, lastWrong: 24, ansMistake: { kind: 'product', given: 24, d: 4, p: 24 }, solved: [] } } } },
  { name: 'words two-step step 2', lab: { _multExt: { mtTab: 'words', wp: { item: two, phase: 'solve', opTries: 1, opWrong: [], step: 1, ansTries: 1, lastWrong: 20, ansMistake: { kind: 'subtracted', given: 20, d: 4, p: 24 }, solved: [{ ok: true, tries: 1 }] } } } },
  { name: 'words done', lab: { _multExt: { mtTab: 'words', wp: { item: two, phase: 'done', opTries: 1, opWrong: [], step: 1, ansTries: 0, solved: [{ ok: true, tries: 1 }, { ok: true, tries: 1 }] } } } },
  { name: 'family open + wrong', lab: { _multExt: { mtTab: 'visual', fam: { fam, picked: { m1: true, x1: true }, tries: 1, resolved: false, diag: { wrong: ['divReverse'], wrongCards: [fam.cards[1]], missing: 3, found: 1 } } } } },
  { name: 'family resolved', lab: { _multExt: { mtTab: 'visual', fam: { fam, picked: { m1: true }, tries: 2, resolved: true, ok: false, diag: { wrong: [], wrongCards: [], missing: 3, found: 1 } } } } },
  { name: 'fluency idle', lab: { _multExt: { mtTab: 'fluency' } } },
  { name: 'fluency retry', lab: { _multExt: { mtTab: 'fluency', fluRhythm: true, flu: flu({ tries: 1, lastWrong: 15, mistake: { kind: 'added', given: 15, a: 7, b: 8 } }) } } },
  { name: 'fluency resolved + clock', lab: { _multExt: { mtTab: 'fluency', teacher: { fluencyTimer: 180 }, flu: flu({ tries: 2, resolved: true, ok: false, timer: { active: true, paused: true, endTime: Date.now() + 90000, timeLeft: 90, limit: 180 } }) } } },
  { name: 'fluency done', lab: { _multExt: { mtTab: 'fluency', flu: flu({ phase: 'done', timeUp: true, results: [{ a: 7, b: 8, mode: 'mult', first: false, ok: false }, { a: 6, b: 9, mode: 'div', divisor: 6, first: true, ok: true }] }) } } },
  { name: 'practice divmiss retry', lab: {}, challenge: { a: 6, b: 8, mode: 'divmiss', divisor: 6, form: 'divisor', source: 'tool', id: 'q' }, feedback: { correct: false, retry: true, tries: 2, forKey: 'q', lastWrong: 8, mistake: { kind: 'quotientEcho', given: 8, d: 6, q: 8, p: 48 } } },
  { name: 'practice divmiss resolved', lab: { _multInputDisabled: true }, challenge: { a: 6, b: 8, mode: 'divmiss', divisor: 6, form: 'dividend', source: 'tool', id: 'r' }, feedback: { correct: false, resolved: true, revealed: true, tries: 3, forKey: 'r', lastWrong: 14, mistake: { kind: 'added', given: 14, d: 6, q: 8, p: 48 } } },
  { name: 'teacher with timer', lab: { _multExt: { teacher: { fluencyTimer: 300, fluencyExtended: true, wpLock: 'two' } } }, ctx: { isTeacherMode: true } },
];

describe('names and target sizes in every new state', () => {
  it('every button is named and at least 24px; every input has a name', async () => {
    const problems = [];
    for (const st of STAGEB_STATES) {
      await mount(st);
      for (const b of host.querySelectorAll('button')) {
        const name = (b.getAttribute('aria-label') || b.textContent || '').trim();
        if (!name) problems.push(st.name + ': unnamed button');
        if (!(parseFloat(b.style.minHeight || '0') >= 24) && b.getAttribute('role') !== 'tab') problems.push(st.name + ': small ' + name.slice(0, 40));
      }
      for (const inp of host.querySelectorAll('input')) {
        const named = inp.getAttribute('aria-label') || inp.closest('label') || (inp.id && host.querySelector(`label[for="${inp.id}"]`));
        if (!named) problems.push(st.name + ': unnamed input ' + inp.outerHTML.slice(0, 80));
      }
      for (const cell of host.querySelectorAll('[role="gridcell"]')) {
        if (!cell.getAttribute('aria-label')) { problems.push(st.name + ': unnamed cell'); break; }
      }
      await unmount();
    }
    expect(problems).toEqual([]);
  });

  it('every visible sentence and accessible name goes through t()', async () => {
    const leftovers = new Set();
    for (const st of STAGEB_STATES) {
      await mount({ ...st, ctx: { ...(st.ctx || {}), t: () => '⟦⟧' } });
      const chunks = [host.textContent];
      host.querySelectorAll('[aria-label],[placeholder],[title]').forEach((el) => {
        ['aria-label', 'placeholder', 'title'].forEach((a) => { if (el.getAttribute(a)) chunks.push(el.getAttribute(a)); });
      });
      for (const chunk of chunks) {
        chunk.split('⟦⟧').forEach((seg) => {
          const s = seg.replace(/[\d\s.,:;()+\-−×÷=?/'"→⇄%<≥…!✓✕·~★←–-⇿]+/g, ' ').trim();
          if (/[A-Za-z]{3,}/.test(s)) leftovers.add(st.name + ': ' + s.slice(0, 80));
        });
      }
      await unmount();
    }
    expect([...leftovers]).toEqual([]);
  });

  it('mounts every new state, plain, dark and high contrast, with no console errors', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    for (const st of STAGEB_STATES) for (const theme of [{}, { isDark: true }, { isContrast: true }]) {
      await mount({ ...st, ctx: { ...(st.ctx || {}), ...theme } });
      await unmount();
    }
    expect(errors.mock.calls.map((c) => String(c[0]).slice(0, 160))).toEqual([]);
  });

  it('old or hostile saved state loads on every new tab without errors', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const junk = { fx: { n: 'x', found: [null, 'a', [3, 3]], tests: [null, 4] }, det: { item: { type: 'zzz' } }, wp: { item: { steps: 'no' } }, fam: { fam: { cards: [null] } },
      flu: { round: [null, { a: 'q' }] }, sieve: { n: 7, crossed: null }, sieveFb: { kind: 'nope' }, teacher: { fluencyTimer: 'lots', wpLock: 9 } };
    for (const tab of ['factors', 'words', 'fluency', 'visual']) {
      await mount({ lab: { _multExt: { ...junk, mtTab: tab } } });
      expect(host.querySelector('[role="tabpanel"]').textContent.length).toBeGreaterThan(50);
      await unmount();
    }
    expect(errors).not.toHaveBeenCalled();
  });

  it('feedback for the new activities lives in polite status regions', async () => {
    for (const [st, sel] of [[STAGEB_STATES[3], '[data-mt-det-feedback]'], [STAGEB_STATES[6], '[data-mt-sv-feedback]'], [STAGEB_STATES[9], '[data-mt-wp-feedback]'], [STAGEB_STATES[13], '[data-mt-fam-feedback]'], [STAGEB_STATES[16], '[data-mt-flu-feedback]']]) {
      await mount(st);
      const region = host.querySelector(sel);
      expect(region, sel).toBeTruthy();
      expect(region.getAttribute('role')).toBe('status');
      expect(region.getAttribute('aria-live')).toBe('polite');
      await unmount();
    }
  });
});

describe('keyboard', () => {
  it('the six tabs move with arrows, Home and End, and the panel wraps the real content', async () => {
    const view = await mount();
    const tabs = () => [...host.querySelectorAll('[role="tab"]')];
    // Stage C: tabs follow the grade band (the harness default is 5th grade: division, then factors and primes).
    expect(tabs().map((b) => b.id)).toEqual(['practice', 'factors', 'words', 'fluency', 'patterns', 'visual'].map((x) => 'multtable-tab-' + x));
    const key = async (k) => act(() => { document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); });
    tabs()[0].focus();
    await key('End');
    expect(view.lab._multExt.mtTab).toBe('visual');
    expect(host.querySelector('[role="tabpanel"]').getAttribute('aria-labelledby')).toBe('multtable-tab-visual');
    await key('ArrowLeft');
    expect(view.lab._multExt.mtTab).toBe('patterns');
    await key('ArrowLeft');
    expect(host.querySelector('[role="tabpanel"] [data-mt-fluency]')).toBeTruthy();
    await key('ArrowLeft'); await key('ArrowLeft');
    expect(host.querySelector('[role="tabpanel"] [data-mt-sieve]')).toBeTruthy();
    await key('ArrowRight'); await key('ArrowRight'); await key('ArrowRight'); await key('ArrowRight'); await key('ArrowRight');
    expect(view.lab._multExt.mtTab).toBe('practice');
    expect(tabs().filter((b) => b.tabIndex === 0)).toHaveLength(1);
  });

  it('the sieve grid is one tab stop and Home/End/Ctrl move within it', async () => {
    await mount(STAGEB_STATES[6]);
    const grid = host.querySelector('[data-mt-sieve-grid]');
    const stops = [...grid.querySelectorAll('[role="gridcell"]')].filter((c) => c.tabIndex === 0);
    expect(stops).toHaveLength(1);
    stops[0].focus();
    const key = async (k, extra) => act(() => { document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, extra || {}))); });
    await key('ArrowDown'); await key('End');
    expect(document.activeElement.getAttribute('data-sv')).toBe('20');
    await key('Home');
    expect(document.activeElement.getAttribute('data-sv')).toBe('11');
    await key('End', { ctrlKey: true });
    expect(document.activeElement.getAttribute('data-sv')).toBe('50');
    await key('ArrowRight');
    expect(document.activeElement.getAttribute('data-sv')).toBe('50');
  });

  it('a single-letter key in a new tab input does nothing to the tool', async () => {
    const view = await mount(STAGEB_STATES[1]);
    const input = host.querySelector('[data-mt-fx-width]');
    input.focus();
    const before = JSON.stringify(view.lab);
    for (const k of ['q', 's', 'h', 'b', 'c']) await act(() => { input.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); });
    expect(JSON.stringify(view.lab)).toBe(before);
  });
});

describe('cleanup', () => {
  it('stops the fluency clock and the rhythm on unmount', async () => {
    vi.useFakeTimers();
    const stops = [];
    window.AudioContext = class {
      constructor() { this.currentTime = 0; this.destination = {}; this.state = 'running'; }
      createOscillator() { const o = { frequency: {}, connect() {}, start() {}, stop(t1) { if (t1 === undefined) stops.push(o); } }; return o; }
      createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
    };
    const view = await mount({ lab: { _multExt: { mtTab: 'fluency', teacher: { fluencyTimer: 180 }, flu: flu({ timer: { active: true, paused: false, endTime: Date.now() + 180000, timeLeft: 180, limit: 180 } }) } } });
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(view.lab._multExt.flu.timer.timeLeft).toBeLessThan(180);
    const b = [...host.querySelectorAll('button')].find((x) => x.textContent.includes('Hear the skip-count rhythm'));
    await act(() => b.click());
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    await unmount();
    expect(stops.length).toBe(7);
    expect(vi.getTimerCount()).toBe(0);
  });
});
