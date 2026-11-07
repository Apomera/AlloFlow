// Area Model stage D (2026-11-04): an independent tester's regression tests.
// Each block reproduces a defect found by driving the tool, and fails on the
// stage-D start copy (AREAMODEL_STAGED_SRC points the suite at another copy).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.AREAMODEL_STAGED_SRC || 'stem_lab/stem_tool_areamodel.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
let errors = [];
let C = null;
beforeEach(() => {
  resetStemLab();
  C = loadTool(FILE, 'areamodel')._core;
  document.body.innerHTML = '<div id="root"></div>';
  errors = [];
  vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ').slice(0, 300)); });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => new Proxy({ measureText: () => ({ width: 20 }) }, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => { t[k] = v; return true; } }));
  if (!window.ResizeObserver) { window.ResizeObserver = class { observe() {} disconnect() {} }; globalThis.ResizeObserver = window.ResizeObserver; }
});
afterEach(async () => {
  if (root) await React.act(async () => { root.unmount(); });
  root = null;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

async function mount(seed, extra) {
  const out = { latest: null, award: vi.fn(), announce: vi.fn(), setTool: vi.fn() };
  function App() {
    const [state, setState] = React.useState({ _areamodel: seed || {} });
    out.latest = state._areamodel;
    return window.StemLab._registry.areamodel.render(makeCtx(Object.assign({ toolData: state, setToolData: setState, awardXP: out.award, announceToSR: out.announce, setStemLabTool: out.setTool, gradeLevel: '4th Grade' }, extra || {})));
  }
  if (root) { await React.act(async () => { root.unmount(); }); }
  document.body.innerHTML = '<div id="root"></div>';
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  return out;
}
const q = (sel) => document.querySelector(sel);
const qa = (sel) => [...document.querySelectorAll(sel)];
const button = (label) => qa('button').find((b) => b.getAttribute('aria-label') === label || b.textContent.trim() === label);
async function type(el, value) {
  const proto = el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  await React.act(async () => { setter.call(el, value); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); });
}
async function click(el) { await React.act(async () => { el.click(); }); }
const algoTop = () => qa('input').find((i) => i.getAttribute('aria-label') === 'Top number (2 to 9999)');
const algoBottom = () => qa('input').find((i) => i.getAttribute('aria-label') === 'Bottom number (1 to 99)');
const xpCalls = (out) => out.award.mock.calls.filter((c) => c[0] === 'areamodel');

async function solveAlgo(lines) {
  for (const v of lines) { await type(q('#am-algo-input'), String(v)); await click(q('[data-algo-check]')); }
}
async function solveDiv(chunks, d, n) {
  let left = n;
  for (const c of chunks) {
    await type(q('[data-div-input="c"]'), String(c));
    await type(q('[data-div-input="area"]'), String(c * d));
    await type(q('[data-div-input="left"]'), String(left - c * d));
    await click(q('[data-div-check]'));
    left -= c * d;
  }
  await click(q('[data-div-finish]'));
  await type(q('[data-div-final="q"]'), String(chunks.reduce((s, c) => s + c, 0)));
  await type(q('[data-div-final="r"]'), String(left));
  await click(q('[data-div-final-check]'));
}

describe('XP is earned once per problem on the self-set tabs (no farming by retyping)', () => {
  it('Algorithm Bridge: retyping the same problem and solving it again earns nothing more', async () => {
    const out = await mount({ viewMode: 'algorithm', band: 'g4' });
    await type(algoTop(), '2'); await type(algoBottom(), '1');
    await solveAlgo([2]);
    expect(xpCalls(out).length).toBe(1);
    expect(out.latest.algorithmSolved).toBe(1);
    for (let i = 0; i < 3; i += 1) {
      await type(algoTop(), '3'); await type(algoTop(), '2');
      expect(q('#am-algo-input'), 'the problem reset, so it can be worked again').toBeTruthy();
      await solveAlgo([2]);
    }
    expect(xpCalls(out).length).toBe(1);
    expect(out.latest.algorithmSolved).toBe(1);
    // A different problem still earns.
    await type(algoTop(), '3'); await solveAlgo([3]);
    expect(xpCalls(out).length).toBe(2);
    expect(out.latest.algorithmSolved).toBe(2);
  });

  it('Division: retyping the same dividend and divisor and solving again earns nothing more; a reload keeps that', async () => {
    const out = await mount({ viewMode: 'division', band: 'g4' });
    await type(q('[data-div-n]'), '4'); await type(q('[data-div-d]'), '2');
    await solveDiv([2], 2, 4);
    expect(q('[data-div-done]')).toBeTruthy();
    expect(xpCalls(out).length).toBe(1);
    expect(out.latest.divisionSolved).toBe(1);
    await type(q('[data-div-n]'), '5'); await type(q('[data-div-n]'), '4');
    await solveDiv([2], 2, 4);
    expect(q('[data-div-done]')).toBeTruthy();
    expect(xpCalls(out).length).toBe(1);
    expect(out.latest.divisionSolved).toBe(1);
    // Reload from the saved state: still no second award.
    const saved = out.latest;
    const out2 = await mount(Object.assign({}, saved, { div: null }));
    await type(q('[data-div-n]'), '4'); await type(q('[data-div-d]'), '2');
    await solveDiv([2], 2, 4);
    expect(xpCalls(out2).length).toBe(0);
    expect(out2.latest.divisionSolved).toBe(1);
  });
});

describe('Division: a dividend smaller than the old divisor is not lost', () => {
  it('typing the dividend first, then a smaller divisor, sets up that problem', async () => {
    const out = await mount({ viewMode: 'division', band: 'g4' });
    expect(out.latest.div == null || out.latest.div.n == null).toBe(true);
    await type(q('[data-div-n]'), '4');
    // 4 is below the old divisor 6: the box says so and keeps the 4.
    expect(q('[data-div-n]').getAttribute('aria-invalid')).toBe('true');
    expect(q('[data-div-bad]')).toBeTruthy();
    expect(q('[data-div-n]').getAttribute('aria-describedby')).toBe('am-div-bad');
    await React.act(async () => { q('[data-div-n]').dispatchEvent(new FocusEvent('focusout', { bubbles: true })); });
    expect(q('[data-div-n]').value).toBe('4');
    await type(q('[data-div-d]'), '2');
    expect(out.latest.div.n).toBe(4);
    expect(out.latest.div.d).toBe(2);
    expect(q('[data-div-bad]')).toBeNull();
    expect(q('[data-div-n]').value).toBe('4');
  });
  it('a typed remainder that is too big gets a true explanation, not "what is left still fits another chunk"', async () => {
    const out = await mount({ viewMode: 'division', band: 'g4', div: { n: 50, d: 6, steps: [{ c: 8 }], phase: 'final' } });
    await type(q('[data-div-final="q"]'), '8'); await type(q('[data-div-final="r"]'), '8');
    await click(q('[data-div-final-check]'));
    const note = q('[data-div-code]');
    expect(note.getAttribute('data-div-code')).toBe('div_r_too_big');
    expect(note.textContent).not.toMatch(/2 is left, and that is at least 6/);
    expect(note.textContent).toContain('smaller than the divisor, 6');
    expect(out.latest.missedLog.at(-1).c).toBe('div_r_too_big');
    // An older save with the old code shows the new sentence too.
    await mount({ viewMode: 'division', band: 'g4', div: { n: 50, d: 6, steps: [{ c: 8 }], phase: 'final', fin: { q: '8', r: '8' }, finCode: 'div_remainder_too_big', finTries: 1 } });
    expect(q('[data-div-code]').textContent).not.toMatch(/at least 6, so another chunk/);
  });
  it('a divisor larger than the dividend is flagged, and the model keeps the last good problem', async () => {
    const out = await mount({ viewMode: 'division', band: 'g4', div: { n: 30, d: 5 } });
    await type(q('[data-div-d]'), '50');
    expect(q('[data-div-d]').getAttribute('aria-invalid')).toBe('true');
    expect(q('[data-div-bad]').textContent).toContain('30 ÷ 5');
    expect(out.latest.div.d).toBe(5);
  });
});

describe('focus is not lost when a step removes or disables the focused control', () => {
  const tick = () => React.act(async () => { await new Promise((r) => setTimeout(r, 5)); });
  it('a solved challenge moves focus to Next Challenge', async () => {
    const ch = { mode: 'basic', a: 3, b: 4, answer: 12, id: 'cF1' };
    await mount({ viewMode: 'basic', band: 'g3', challenge: ch, chWork: { key: 'cF1', attempts: 0, revealed: false, hints: 0, boxes: {}, counted: false } });
    const inp = qa('input').find((i) => i.getAttribute('aria-label') === 'Challenge answer');
    inp.focus();
    await type(inp, '12');
    await React.act(async () => { inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
    await tick();
    expect(document.activeElement && document.activeElement.getAttribute('data-next-challenge')).toBe('true');
  });
  it('the last algorithm line moves focus to the done note; finishing a division moves focus on too', async () => {
    await mount({ viewMode: 'algorithm', band: 'g4', algo: { a: 12, b: 3 } });
    q('#am-algo-input').focus();
    await solveAlgo([36]);
    await tick();
    expect(document.activeElement && document.activeElement.hasAttribute('data-algo-done')).toBe(true);
    await mount({ viewMode: 'division', band: 'g4', div: { n: 12, d: 3 } });
    await type(q('[data-div-input="c"]'), '4'); await type(q('[data-div-input="area"]'), '12'); await type(q('[data-div-input="left"]'), '0');
    await click(q('[data-div-check]'));
    q('[data-div-finish]').focus();
    await click(q('[data-div-finish]'));
    await tick();
    expect(document.activeElement && document.activeElement.getAttribute('data-div-final')).toBe('q');
    await type(q('[data-div-final="q"]'), '4');
    await click(q('[data-div-final-check]'));
    await tick();
    expect(document.activeElement && document.activeElement.hasAttribute('data-div-done')).toBe(true);
  });
  it('a working factoring moves focus to the result', async () => {
    await mount({ viewMode: 'algebra', band: 'g6', algMode: 'factor', fac: { F: { A: 1, B: 5, C: 6 }, p: 2, q: 3 } });
    q('[data-fac-check]').focus();
    await click(q('[data-fac-check]'));
    await tick();
    expect(document.activeElement && document.activeElement.hasAttribute('data-fac-done')).toBe(true);
  });
});

describe('path ticks count only the kind they name', () => {
  async function solveChallenge(ch, ans, band) {
    const out = await mount({ pathOpen: true, viewMode: ch.mode, band, challenge: Object.assign({ id: 'cP' }, ch), chWork: { key: 'cP', attempts: 0, revealed: false, hints: 0, boxes: {}, counted: false } }, { gradeLevel: band === 'g6' ? '7th Grade' : '5th Grade' });
    await type(qa('input').find((i) => i.getAttribute('aria-label') === 'Challenge answer'), ans);
    await click(button('Check'));
    return out;
  }
  const tickOf = (id) => q('[data-path-step="' + id + '"]').getAttribute('data-path-done');
  it('grade 6: a decimal hundred-grid challenge does not tick "find a percent of a percent"; a percent one does', async () => {
    const out = await solveChallenge({ mode: 'grid100', kind: 'dec', a: 0.3, b: 0.4, answer: 0.12 }, '0.12', 'g6');
    expect(out.latest.grid100Solved).toBe(1);
    expect(tickOf('g6_pct')).toBe('false');
    await solveChallenge({ mode: 'grid100', kind: 'pct', a: 0.3, b: 0.4, p1: 30, p2: 40, answer: 12 }, '12%', 'g6');
    expect(tickOf('g6_pct')).toBe('true');
  });
  it('grade 5: an area story does not tick "solve a decimal or fraction story"; a decimal story does', async () => {
    const out = await solveChallenge({ mode: 'word', wkind: 'area', wctx: 0, a: 12, b: 15, answer: 180 }, '180', 'g5');
    expect(out.latest.wordSolved).toBe(1);
    expect(tickOf('g5_word')).toBe('false');
    await solveChallenge({ mode: 'word', wkind: 'decimal', wctx: 0, a: 1.2, b: 3, answer: 3.6 }, '3.6', 'g5');
    expect(tickOf('g5_word')).toBe('true');
  });
});

describe('a teacher-hidden tab is not offered as a link from another tab', () => {
  it('with Division hidden, a missing-side story has no "Model it on the Division tab" button', async () => {
    const ch = { mode: 'word', wkind: 'missing', wctx: 0, a: 7, n: 84, answer: 12, id: 'cH' };
    const seed = { viewMode: 'word', band: 'g4', challenge: ch, chWork: { key: 'cH', attempts: 0, revealed: false, hints: 0, boxes: {}, counted: false }, teacher: { hidden: { division: true } } };
    await mount(seed);
    expect(q('[data-story-open="division"]')).toBeNull();
    await mount(Object.assign({}, seed, { teacher: {} }));
    expect(q('[data-story-open="division"]')).toBeTruthy();
  });
  it('with Partial Products hidden, the hundred grid has no bridge to it', async () => {
    await mount({ viewMode: 'grid100', band: 'g5', teacher: { hidden: { multidigit: true } } });
    expect(q('[data-g100-bridge]')).toBeNull();
  });
});

describe('a new word problem over an open one is a skip', () => {
  it('the streak ends, as it does with "Skip this one"', async () => {
    const ch = { mode: 'word', wkind: 'area', wctx: 0, a: 12, b: 15, answer: 180, id: 'cS' };
    const out = await mount({ viewMode: 'word', band: 'g4', streak: 4, bestStreak: 4, challenge: ch, chWork: { key: 'cS', attempts: 1, revealed: false, hints: 0, boxes: {}, counted: true } });
    await click(button('New word problem'));
    expect(out.latest.challenge.id).not.toBe('cS');
    expect(out.latest.streak).toBe(0);
    expect(out.latest.missedLog.at(-1).c).toBe('skipped');
    // A finished challenge keeps the streak.
    const done = Object.assign({}, out.latest, { streak: 3, feedback: { correct: true, msg: 'ok' } });
    const out2 = await mount(done);
    await click(button('New word problem'));
    expect(out2.latest.streak).toBe(3);
  });
});

describe('guard: every tab mounts without console errors (light, dark, contrast, teacher)', () => {
  it('mounts', async () => {
    const modes = ['basic', 'distributive', 'multidigit', 'algorithm', 'division', 'fraction', 'grid100', 'algebra', 'word'];
    for (const viewMode of modes) for (const extra of [{}, { isDark: true }, { isContrast: true }, { isTeacherMode: true }]) {
      await mount({ viewMode, band: 'g5', creditKeys: 'not-an-array', percentSolved: 2 }, extra);
      expect(q('[role="tabpanel"]').id).toBe('stem-areamodel-panel-' + viewMode);
    }
    await mount({ viewMode: 'algebra', algMode: 'factor', fac: { signed: true } });
    await mount({ viewMode: 'division', div: { n: 'x', d: 900, draftN: '5', draftD: '7' } });
    expect(errors).toEqual([]);
  });
});

describe('guard: the memoised grid always runs this render\'s handlers', () => {
  it('after a challenge is solved (the grid itself does not re-render) a cell click announces the product', async () => {
    const ch = { mode: 'basic', a: 3, b: 4, answer: 12, id: 'cG' };
    const out = await mount({ viewMode: 'basic', band: 'g3', challenge: ch, dims: { rows: 3, cols: 4 }, chWork: { key: 'cG', attempts: 0, revealed: false, hints: 0, boxes: {}, counted: false } });
    await click(q('[data-cell="1-1"]'));
    expect(out.announce.mock.calls.at(-1)[0]).toBe('Highlighted 2 rows by 2 columns.');
    await type(qa('input').find((i) => i.getAttribute('aria-label') === 'Challenge answer'), '12');
    await click(button('Check'));
    expect(out.latest.feedback.correct).toBe(true);
    await click(q('[data-cell="1-1"]'));
    expect(out.announce.mock.calls.at(-1)[0]).toBe('Highlighted 2 rows by 2 columns: 4 squares.');
    // Swapped rows and columns: the bounds check uses the new shape.
    await click(qa('button').find((b) => /Swap rows and columns/.test(b.textContent)));
    await click(q('[data-cell="3-2"]'));
    expect(out.announce.mock.calls.at(-1)[0]).toBe('Highlighted 4 rows by 3 columns: 12 squares.');
  });
});

describe('an open challenge cannot be answered with a reveal from the Algorithm or Division tab', () => {
  it('Algorithm Bridge offers no "show this line" while a challenge is open', async () => {
    const ch = { mode: 'multidigit', a: 47, b: 36, answer: 1692, id: 'cOpen1' };
    const out = await mount({ viewMode: 'algorithm', band: 'g4', challenge: ch, chWork: { key: 'cOpen1', attempts: 0, revealed: false, hints: 0, boxes: {}, counted: false } });
    await type(algoTop(), '47'); await type(algoBottom(), '36');
    for (let i = 0; i < 2; i += 1) { await type(q('#am-algo-input'), '1'); await click(q('[data-algo-check]')); }
    expect(q('[data-algo-show]')).toBeNull();
    // After the challenge is finished, the reveal comes back.
    const solved = Object.assign({}, out.latest, { feedback: { correct: true, msg: 'ok' } });
    await mount(solved);
    expect(q('[data-algo-show]')).toBeTruthy();
  });

  it('Division offers no shown chunk or shown answer while a missing-side story is open', async () => {
    const ch = { mode: 'word', wkind: 'missing', wctx: 0, a: 7, n: 84, answer: 12, id: 'cOpen2' };
    await mount({ viewMode: 'word', band: 'g4', challenge: ch, chWork: { key: 'cOpen2', attempts: 0, revealed: false, hints: 0, boxes: {}, counted: false } });
    await click(q('[data-story-open="division"]'));
    for (let i = 0; i < 2; i += 1) { await type(q('[data-div-input="c"]'), '99'); await click(q('[data-div-check]')); }
    expect(q('[data-div-show]')).toBeNull();
  });
});
