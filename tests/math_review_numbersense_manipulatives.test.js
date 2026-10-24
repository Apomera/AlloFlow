import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { sliceBetween } from './helpers/anchored_slice.js';

// Base-10 / manipulatives lab: generators must pose answerable items, graders
// must accept equivalent right answers and reject wrong ones, and a solved item
// scores once.
//
// MR_NUMBERSENSE_MANIP_SRC points the suite at another copy of the tool
// (mutation check: the pre-fix copy must turn these red).

const FILE = process.env.MR_NUMBERSENSE_MANIP_SRC || 'stem_lab/stem_tool_manipulatives.js';
const src = fs.readFileSync(FILE, 'utf8');
const cut = (a, b) => sliceBetween(src, a, b, { file: FILE });

class NoopObserver { observe() {} unobserve() {} disconnect() {} }
if (!window.ResizeObserver) window.ResizeObserver = NoopObserver;
const ctx2d = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => { t[k] = v; return true; } });

let root = null;
beforeEach(() => {
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx2d);
  resetStemLab();
  loadTool(FILE, 'base10');
});
afterEach(async () => {
  if (root) { await React.act(async () => { root.unmount(); }); root = null; }
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

async function mount(manipState) {
  const tool = window.StemLab._registry.base10;
  const awardXP = vi.fn();
  const view = { state: null, awardXP };
  function App() {
    const [state, setState] = React.useState({ _manipulatives: manipState });
    view.state = state._manipulatives;
    return tool.render(makeCtx({ toolData: state, setToolData: setState, awardXP }));
  }
  document.body.innerHTML = '<div id="m-root"></div>';
  root = ReactDOMClient.createRoot(document.getElementById('m-root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  return view;
}
const click = async (el) => { await React.act(async () => { el.click(); }); };
const setValue = async (el, value) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await React.act(async () => { setter.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
};
const buttonByText = (text) => { const all = [...document.querySelectorAll('button')]; return all.find((b) => b.textContent.trim() === text) || all.find((b) => b.textContent.includes(text)); };

describe('a solved challenge scores once', () => {
  it('base-10 blocks: clicking Check again on a solved 347 adds nothing', async () => {
    // Before: 25 clicks gave 25/25, streak 25, blocksSolved 25 and 25 XP awards.
    const view = await mount({ mode: 'blocks', b10Challenge: { target: 347, type: 'build' }, b10: { thousands: 0, hundreds: 3, tens: 4, ones: 7 } });
    const check = () => document.querySelector('button[aria-label="Check"]');
    for (let i = 0; i < 4; i++) await click(check());
    expect(view.state.score).toEqual({ correct: 1, total: 1 });
    expect(view.state.streak).toBe(1);
    expect(view.state.blocksSolved).toBe(1);
    expect(view.awardXP.mock.calls.filter((c) => c[0] === 'base10').length).toBe(1);
  });

  it('abacus: clicking Check again on a solved target adds nothing', async () => {
    const view = await mount({ mode: 'abacus', abacusChallenge: { target: 52 }, abacus: { rods: [2, 5, 0, 0, 0] } });
    const check = () => document.querySelector('button[aria-label="Check"]');
    for (let i = 0; i < 3; i++) await click(check());
    expect(view.state.score).toEqual({ correct: 1, total: 1 });
    expect(view.state.abacusSolved).toBe(1);
  });

});

describe('graders accept equivalent right answers and reject wrong ones', () => {
  it('pattern-block fraction: 2/4 and 0.5 are the red trapezoid (1/2); 1/3 is not', async () => {
    const results = {};
    for (const typed of ['1/2', '2/4', '0.5', ' 1 / 2 ', '1/3']) {
      const view = await mount({ mode: 'challenges', crChallenge: { catId: 'pb_frac', cat: 'Pattern Blocks', q: 'If a yellow hexagon = 1, what fraction is the red trapezoid?', ans: '1/2', mode: 'patternBlocks', strAnswer: true }, crUserAns: typed });
      await click(buttonByText('Check'));
      results[typed] = view.state.crFeedback.ok;
      await React.act(async () => { root.unmount(); }); root = null;
    }
    expect(results).toEqual({ '1/2': true, '2/4': true, '0.5': true, ' 1 / 2 ': true, '1/3': false });
  });

  it('place-value disks: the right total with extra disks is explained, not "Currently 120, need 120"', async () => {
    const view = await mount({ mode: 'pvDisks', pvdChallenge: { type: 'build', target: 120, q: 'Build 120 using the fewest disks possible.' }, pvDisks: { ones: 0, tens: 12, hundreds: 0, thousands: 0 } });
    await click(buttonByText('Check'));
    expect(view.state.pvdFeedback.ok).toBe(false);
    expect(view.state.pvdFeedback.msg).not.toMatch(/Currently 120, need 120/);
    expect(view.state.pvdFeedback.msg).toContain('fewest disks');
  });

  it('number bonds: 4.9 is not the missing part 4', async () => {
    const view = await mount({ mode: 'numberBonds', nbMode: 'practice', nbWhole: 7, nbPart1: 3, nbAnswer: '4.9' });
    await click(buttonByText('Check'));
    expect(view.state.nbFeedback.correct).toBe(false);
  });

  it('hundreds chart: grades the cell clicked LAST, not the largest highlighted one', async () => {
    // Clicking 40 then 15 (target 15) used to report "You clicked 40".
    const view = await mount({ mode: 'hundredsChart', hcChallenge: { type: 'skipFind', q: 'Skip-count by 5s. Click the 3rd number you land on.', target: 15 } });
    await click(document.querySelector('button[aria-label^="Number 40"]'));
    await click(document.querySelector('button[aria-label^="Number 15"]'));
    await click(buttonByText('Check (last clicked cell)'));
    expect(view.state.hcFeedback.ok).toBe(true);
  });

  it('hundreds chart "multiple" and "prime" challenges still grade after a save/reload (no function in state)', async () => {
    const kinds = {};
    // genHc draws: type index (0.3 -> 'multiple', 0.6 -> 'prime'), then base index (0.1 -> 3).
    for (const seq of [[0.3, 0.1, 0.1], [0.6, 0.1]]) {
      const view = await mount({ mode: 'hundredsChart' });
      let i = 0;
      const spy = vi.spyOn(Math, 'random').mockImplementation(() => seq[Math.min(i++, seq.length - 1)]);
      await click(buttonByText('🎲 New'));
      spy.mockRestore();
      const saved = JSON.parse(JSON.stringify(view.state));
      kinds[saved.hcChallenge.type] = true;
      await React.act(async () => { root.unmount(); }); root = null;
      const reloaded = await mount(saved);
      const answer = saved.hcChallenge.type === 'prime' ? 37 : 24; // 24 is a multiple of 3 (seq picks base 3)
      await click(document.querySelector('button[aria-label^="Number ' + answer + '"]'));
      await click(buttonByText('Check (last clicked cell)'));
      expect(reloaded.state.hcFeedback.ok, saved.hcChallenge.type).toBe(true);
      await React.act(async () => { root.unmount(); }); root = null;
    }
    expect(Object.keys(kinds).sort()).toEqual(['multiple', 'prime']);
  });

  it('pattern blocks: "ONLY trapezoids" rejects a square, and "exactly 6 pieces" does not count valueless squares', async () => {
    let view = await mount({ mode: 'patternBlocks', pbChallenge: { q: 'Cover one hexagon using ONLY trapezoids. (Goal: total = 1)', target: 1, mustUse: 'trap' }, patternBlocks: [{ type: 'trap' }, { type: 'trap' }, { type: 'square' }] });
    await click(buttonByText('Check'));
    expect(view.state.pbFeedback.ok).toBe(false);
    expect(view.state.pbFeedback.msg).not.toContain('rhombus_blue');
    await React.act(async () => { root.unmount(); }); root = null;
    view = await mount({ mode: 'patternBlocks', pbChallenge: { q: 'Build a value of 2 using exactly 6 pieces.', target: 2, mustUse: null, exactCount: 6 }, patternBlocks: [{ type: 'hex' }, { type: 'hex' }, { type: 'square' }, { type: 'square' }, { type: 'square' }, { type: 'square' }] });
    await click(buttonByText('Check'));
    expect(view.state.pbFeedback.ok).toBe(false);
  });

  it('pattern blocks: six triangles read as exactly 1 whole hexagon', () => {
    const tri = Array.from({ length: 6 }, () => ({ type: 'triangle' }));
    const html = renderTool('base10', { _manipulatives: { mode: 'patternBlocks', patternBlocks: tri } });
    expect(html.replace(/<[^>]+>/g, '')).toContain('= 1 whole hexagon');
  });
});

describe('generators pose answerable items', () => {
  it('challenge hub items have whole-number answers and sensible wording', () => {
    // eslint-disable-next-line no-new-func
    const problems = new Function(cut('var chProblems = [', 'var chPick = function()') + '\nreturn chProblems;')();
    const bad = [];
    for (const p of problems) {
      for (let i = 0; i < 400; i++) {
        const made = p.gen();
        if (p.strAnswer) continue;
        if (!Number.isInteger(made.a)) bad.push(p.id + ': ' + made.q + ' -> ' + made.a);
        if (/ -\d| −\d|-1 more/.test(made.q)) bad.push(p.id + ': ' + made.q);
        if (/\b[23]th\b/.test(made.q)) bad.push(p.id + ': ' + made.q);
        if (p.id === 'cr_fit' && /orange-(4|6|8)\b/.test(made.q)) bad.push(p.id + ': only the 10-rod is orange: ' + made.q);
      }
    }
    expect([...new Set(bad)].slice(0, 6)).toEqual([]);
  });

  it('place-value disk subtraction never asks for a negative result', () => {
    const out = [];
    // eslint-disable-next-line no-new-func
    const genPvd = new Function('upd', cut('var genPvd = function() {', 'var checkPvd = function()') + '\nreturn genPvd;')((p) => out.push(p));
    for (let i = 0; i < 3000; i++) genPvd();
    const subtract = out.map((p) => p.pvdChallenge).filter((c) => c.type === 'subtractWithUngroup');
    expect(subtract.length).toBeGreaterThan(500);
    const bad = subtract.filter((c) => c.target < 0).map((c) => c.q + ' -> ' + c.target);
    expect(bad.slice(0, 3), bad.length + ' negative targets').toEqual([]);
  });

  it('the CRA "regroup" generator always needs regrouping and clears the old answer', () => {
    const out = [];
    // eslint-disable-next-line no-new-func
    const gen = new Function('upd', cut('var craGenRegroup = function() {', 'var craGenMultiplication') + '\nreturn craGenRegroup;')((p) => out.push(p));
    for (let i = 0; i < 1000; i++) gen();
    const bad = out.filter((p) => (p.craTarget.a % 10) + (p.craTarget.b % 10) < 10).map((p) => p.craTarget.a + ' + ' + p.craTarget.b);
    expect(bad.slice(0, 3), bad.length + ' need no regrouping').toEqual([]);
    expect(out.every((p) => p.craUserAns === '')).toBe(true);
  });
});

describe('accessibility', () => {
  it('place-value quiz choices are named by their own text, not all "Next"', () => {
    const html = renderTool('base10', { _manipulatives: { mode: 'quiz', pvQuiz: { type: 'compare', q: '345 ___ 354', answer: '<', opts: ['<', '>', '='] } } });
    const choices = [...html.matchAll(/<button([^>]*)>(&lt;|&gt;|=)<\/button>/g)];
    expect(choices.length).toBe(3);
    for (const c of choices) expect(c[1]).not.toContain('aria-label="Next"');
  });
});
