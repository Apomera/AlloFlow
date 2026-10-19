import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Scores, counters and XP in the Fraction Lab must count each solved item
// ONCE. Each case mounts the real tool (jsdom + React 18), solves an item,
// then repeats the click that used to re-pay it.
//
// MR_NUMBERSENSE_FRACTIONS_SRC points the suite at another copy of the tool
// (mutation check: the pre-fix copy must turn these red).

const FILE = process.env.MR_NUMBERSENSE_FRACTIONS_SRC || 'stem_lab/stem_tool_fractions.js';

// jsdom has no 2D canvas; the lab's decorative canvases only need a context
// that accepts calls.
const ctx2d = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => { t[k] = v; return true; } });

class NoopObserver { observe() {} unobserve() {} disconnect() {} }
if (!window.ResizeObserver) window.ResizeObserver = NoopObserver;
if (!window.IntersectionObserver) window.IntersectionObserver = NoopObserver;
if (!window.matchMedia) window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });

let root = null;
beforeEach(() => {
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx2d);
  resetStemLab();
  delete window.__fracTabTracked;
  loadTool(FILE, 'fractions');
});
afterEach(async () => {
  if (root) { await React.act(async () => { root.unmount(); }); root = null; }
  if (window._fracKbHandler) window.removeEventListener('keydown', window._fracKbHandler);
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

async function mount(fractionsState) {
  const tool = window.StemLab._registry.fractions;
  const awardXP = vi.fn();
  const view = { state: null, awardXP };
  function App() {
    const [state, setState] = React.useState({ _fractions: fractionsState });
    view.state = state._fractions;
    return tool.render(makeCtx({ toolData: state, setToolData: setState, awardXP, addToast: () => {} }));
  }
  document.body.innerHTML = '<div id="frac-root"></div>';
  root = ReactDOMClient.createRoot(document.getElementById('frac-root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  return view;
}

const buttonsByText = (text) => [...document.querySelectorAll('button')].filter((b) => b.textContent.trim() === text);
const click = async (el) => { await React.act(async () => { el.click(); }); };
const xpCalls = (view, id) => view.awardXP.mock.calls.filter((c) => c[0] === id).length;

describe('solved items are scored once', () => {
  it('word problem: a second Check on a solved problem adds no score and no XP', async () => {
    // Problem 1 is "Half the cookie recipe": 3/4 x 1/2 = 3/8.
    const view = await mount({ navMode: 'apply', tab: 'wordproblems', wpIdx: 0, wpAnswer: '3/8' });
    const check = buttonsByText('Check');
    expect(check.length).toBe(1);
    await click(check[0]);
    expect(view.state.wpFeedback && view.state.wpFeedback.correct).toBe(true);
    await click(buttonsByText('Check')[0]);
    await click(buttonsByText('Check')[0]);
    expect(view.state.score).toEqual({ correct: 1, total: 1 });
    expect(xpCalls(view, 'fractionWordProblem')).toBe(1);
  });

  it('story chapter: a second Submit on a solved chapter adds no XP', async () => {
    // Chapter 1: 3 batches x 5 1/2 cups = 16 1/2.
    const view = await mount({ navMode: 'apply', tab: 'story', storyCh: 1, storyAnswer: '16 1/2' });
    await click(buttonsByText('Submit')[0]);
    expect(view.state.storyFeedback && view.state.storyFeedback.correct).toBe(true);
    await click(buttonsByText('Submit')[0]);
    await click(buttonsByText('Submit')[0]);
    expect(xpCalls(view, 'fractionStory')).toBe(1);
  });

  it('multi-step: re-checking the last step of a finished problem adds no XP', async () => {
    // Pizza Party, step 3 of 3: 5 pizzas x $12 = 60.
    const view = await mount({ navMode: 'apply', tab: 'multistep', msIdx: 0, msStep: 2, msAnswers: [{ correct: true, answer: '9/2' }, { correct: true, answer: '5' }], msAnswer: '60' });
    await click(buttonsByText('Check')[0]);
    expect(xpCalls(view, 'fractionMultiStep')).toBe(1);
    const input = document.querySelector('input[aria-label="Multi-step answer"]');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    await React.act(async () => { setter.call(input, '60'); input.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(view.state.msAnswer).toBe('60');
    await click(buttonsByText('Check')[0]);
    expect(xpCalls(view, 'fractionMultiStep')).toBe(1);
  });
});

describe('Fraction Bingo pays each line once', () => {
  function card() {
    const row0 = [[1, 2], [2, 4], [3, 6], [4, 8], [5, 10]];
    const rest = [[1, 3], [2, 3], [1, 5], [2, 5], [3, 5], [6, 12], [1, 8], [3, 8], [5, 8], [7, 8], [1, 10], [3, 10], [7, 10], [9, 10], [1, 6], [5, 6], [1, 4], [3, 4], [4, 5]];
    const cells = row0.concat(rest).map(([n, d]) => ({ n, d, key: n + '/' + d }));
    cells.splice(12, 0, { free: true, key: 'FREE' });
    return cells;
  }

  it('unmark + re-mark, or marking another cell, does not re-award a finished line', async () => {
    const view = await mount({ navMode: 'apply', tab: 'games', activeGame: 'bingo', bgGame: { card: card(), called: [{ n: 1, d: 2 }], current: { n: 1, d: 2 }, marked: [12, 0, 1, 2, 3], wins: 0, bingoCount: 0 } });
    const cell = (label) => buttonsByText(label)[0];
    await click(cell('5/10'));
    expect(xpCalls(view, 'fractionBingo')).toBe(1);
    expect(view.state.bgGame.bingoCount).toBe(1);
    await click(cell('5/10')); // unmark
    await click(cell('5/10')); // re-mark: same line again
    await click(cell('6/12')); // another 1/2 cell while row 1 is still complete
    expect(xpCalls(view, 'fractionBingo')).toBe(1);
    expect(view.state.bgGame.bingoCount).toBe(1);
    expect(cell('6/12').getAttribute('aria-pressed')).toBe('true');
  });
});

describe('exploration counters count distinct finds', () => {
  it('fraction wall: the same equivalent pair found twice counts once', async () => {
    let view = await mount({ navMode: 'learn', tab: 'wall', wallCompareA: { n: 1, d: 2 }, wallCompareB: null });
    const wallButton = (n, d) => document.querySelector('button[data-fraction-wall-segment][data-fraction="' + n + '/' + d + '"]');
    let target = wallButton(2, 4);
    expect(target, 'a 2/4 wall piece').toBeTruthy();
    await click(target);
    expect(view.state.wallPairsFound).toBe(1);
    const after = Object.assign({}, view.state, { wallCompareA: { n: 2, d: 4 }, wallCompareB: null });
    await React.act(async () => { root.unmount(); });
    view = await mount(after);
    target = wallButton(1, 2);
    await click(target);
    expect(view.state.wallPairsFound).toBe(1);
    expect(xpCalls(view, 'fractionWall')).toBe(0);
  });

  it('converter: logging the same conversion five times counts one fraction', async () => {
    const view = await mount({ navMode: 'practice', tab: 'converter', convNum: 3, convDen: 4, convDirection: 'fracToDec' });
    for (let i = 0; i < 5; i++) {
      await click(document.querySelector('button[aria-label="Log This Conversion"]'));
    }
    expect(view.state.convertCount).toBe(1);
    expect(view.state.badges && view.state.badges.converter).toBeFalsy();
  });

  it('converter shows the repeating digits of 2/3 truncated, not rounded', () => {
    const html = renderTool('fractions', { _fractions: { navMode: 'practice', tab: 'converter', convNum: 2, convDen: 3, convDirection: 'fracToDec' } });
    expect(html).toContain('0.66666666...');
    expect(html).not.toContain('0.66666667');
  });
});

describe('Equivalent Match deals the six pairs it promises', () => {
  it('Start matching deals 12 cards', async () => {
    const view = await mount({ navMode: 'apply', tab: 'games', activeGame: 'match' });
    const start = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Start matching'));
    await click(start);
    expect(view.state.emGame.cards.length).toBe(12);
  });
});

describe('magic tricks', () => {
  it('the "always 1" trick really lands on 1 for any starting number', () => {
    const html = renderTool('fractions', { _fractions: { navMode: 'learn', tab: 'curiosities', curSub: 'magic' } });
    const text = html.replace(/<[^>]+>/g, ' ');
    const setup = /Pick any number\.([^<]*?)Subtract the original number\./.exec(text);
    expect(setup, 'trick setup on screen').not.toBeNull();
    const steps = setup[1].split('.').map((s) => s.trim()).filter(Boolean);
    for (const start of [0, 1, 7, -3, 2.5, 100]) {
      let v = start;
      for (const s of steps) {
        const m = /^(Add|Subtract|Multiply by|Divide by) (\d+)$/.exec(s);
        expect(m, s).not.toBeNull();
        const k = Number(m[2]);
        v = m[1] === 'Add' ? v + k : m[1] === 'Subtract' ? v - k : m[1] === 'Multiply by' ? v * k : v / k;
      }
      expect(v - start).toBe(1);
    }
    expect(text).not.toContain('that gives 0, not 1');
  });
});
