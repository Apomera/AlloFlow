// Area Model deep rebuild (2026-11-03): the new teaching layer, driven through the UI.
// Box fill-in with per-box named mistakes, predict-then-check, the algorithm and
// algebra bridges, fading worked examples, hint ladder, teacher hooks, cross-links,
// AI gating, old-save loading, and a clean mount in every mode and theme.
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_areamodel.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
let errors = [];
beforeEach(() => {
  resetStemLab();
  loadTool(FILE, 'areamodel');
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
    return window.StemLab._registry.areamodel.render(makeCtx(Object.assign({ toolData: state, setToolData: setState, awardXP: out.award, announceToSR: out.announce, setStemLabTool: out.setTool }, extra || {})));
  }
  if (root) { await React.act(async () => { root.unmount(); }); }
  document.body.innerHTML = '<div id="root"></div>';
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  return out;
}
const text = () => {
  const walker = document.createTreeWalker(document.getElementById('root'), NodeFilter.SHOW_TEXT);
  const parts = [];
  while (walker.nextNode()) parts.push(walker.currentNode.nodeValue);
  return parts.join(' ').replace(/\s+/g, ' ');
};
const hasNumber = (n) => new RegExp('(^|[^\\d.])' + String(n).replace('.', '\\.') + '(?![\\d]|\\.\\d)').test(text());
const byAria = (label) => document.querySelector('[aria-label="' + label + '"]');
const button = (label) => [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === label || b.textContent.trim() === label);
async function type(el, value) {
  const proto = el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  await React.act(async () => { setter.call(el, value); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); });
}
async function click(el) { await React.act(async () => { el.click(); }); }

describe('mounts cleanly', () => {
  it('every tab, in light, dark, contrast and teacher mode, with the pattern lab open', async () => {
    for (const viewMode of ['basic', 'distributive', 'multidigit', 'algorithm', 'fraction', 'algebra', 'word']) {
      for (const extra of [{}, { isDark: true }, { isContrast: true }, { isTeacherMode: true, gradeLevel: '7th Grade' }]) {
        await mount({ viewMode, showAreaPatterns: true }, extra);
        expect(document.querySelector('[role="tabpanel"]').id).toBe('stem-areamodel-panel-' + viewMode);
      }
    }
    expect(errors).toEqual([]);
  // 28 full mounts: stage C's learning path adds DOM, and jsdom under a loaded machine passes 5 s.
  }, 20000);

  it('old saves load: legacy challenge without an id, old feedback text, old highlight and old dims', async () => {
    await mount({ viewMode: 'multidigit', challenge: { a: 23, b: 14, answer: 322, question: 'Use partial products to find 23 × 14 = ?', mode: 'multidigit' }, feedback: { correct: false, msg: 'old message' }, highlight: { rows: 2, cols: 3 }, dims: { rows: 30, cols: 'x' }, multiDims: { a: 23, b: 14 } });
    expect(text()).toContain('old message');
    await mount({ viewMode: 'nonsense', dims: { rows: 4, cols: 6 }, answer: 12 });
    // Stage C: an unknown saved tab opens the level's first core tab (5th grade: Partial Products).
    expect(document.querySelector('[role="tabpanel"]').id).toBe('stem-areamodel-panel-multidigit');
    expect(errors).toEqual([]);
  });

  it('damaged saves cannot crash any tab', async () => {
    const junk = [
      { viewMode: 'multidigit', multiDims: { a: 'x', b: null }, challenge: { mode: 'multidigit' } },
      { viewMode: 'fraction', fsides: { n1: 99, d1: 0, n2: -3, d2: 'q' }, challenge: { mode: 'fraction', n1: 2 } },
      { viewMode: 'algebra', alg: { f1: { x: 'a', c: null }, f2: 7, x: 999 }, challenge: { mode: 'algebra' } },
      { viewMode: 'algorithm', algo: { a: -5, b: 1e9, res: null } },
      { viewMode: 'distributive', dims: { rows: 3, cols: 1 }, challenge: { mode: 'distributive', a: 3, b: 4, split: 9, answer: 12 } },
      { viewMode: 'word', wordDims: { a: 500, b: -1 }, wordCtxIdx: 77, worked: 'x', teacher: 5, missedLog: 'nope', chWork: 3 }
    ];
    for (const seed of junk) {
      await mount(seed, { isTeacherMode: true });
      expect(document.querySelector('[role="tabpanel"]')).toBeTruthy();
      expect(document.querySelector('[data-challenge-card="active"]')).toBeNull();
    }
    expect(errors).toEqual([]);
  });
});

describe('students fill the partial products, with feedback per box', () => {
  it('multi-digit boxes: right boxes lock with a tick, wrong boxes name the mistake, no values leak', async () => {
    const m = await mount({ viewMode: 'multidigit', multiDims: { a: 23, b: 14 }, challenge: { id: 'p1', a: 23, b: 14, answer: 322, mode: 'multidigit', question: 'q' } });
    const inputs = [...document.querySelectorAll('[data-box-input]')];
    // 23 > 14, so 23 runs across the top and the table follows the drawing (engagement build 2026-11-04):
    // columns are 20 | 3, rows 10 | 4, so the boxes read 20×10, 3×10, 20×4, 3×4.
    expect(inputs.map((i) => i.getAttribute('data-box-input'))).toEqual(['b0', 'b2', 'b1', 'b3']);
    await type(document.querySelector('[data-box-input="b0"]'), '200');
    await type(document.querySelector('[data-box-input="b1"]'), '24');
    await type(document.querySelector('[data-box-input="b2"]'), '3');
    await click(document.querySelector('[data-check-boxes]'));
    const work = m.latest.chWork.boxes;
    expect(work.b0.st).toBe('ok');
    expect(work.b1.st).toBe('box_added');
    expect(work.b2.st).toBe('box_pv_small');
    expect(document.querySelector('[data-box-input="b0"]').readOnly).toBe(true);
    expect(text()).toContain('You added the two sides of this box');
    expect(text()).toContain('this box is too small by a power of ten');
    expect(hasNumber(322)).toBe(false);
    expect(hasNumber(80)).toBe(false);
    expect(m.award).not.toHaveBeenCalled();
  });

  it('distributive pieces: both pieces checked on their own', async () => {
    const m = await mount({ viewMode: 'distributive', dims: { rows: 7, cols: 9 }, challenge: { id: 'd1', a: 7, b: 9, split: 5, answer: 63, mode: 'distributive', question: 'q' } });
    await type(document.querySelector('[data-box-input="L"]'), '35');
    await type(document.querySelector('[data-box-input="R"]'), '11');
    await click(document.querySelector('[data-check-boxes]'));
    expect(m.latest.chWork.boxes.L.st).toBe('ok');
    expect(m.latest.chWork.boxes.R.st).toBe('box_added');
    expect(hasNumber(63)).toBe(false);
  });
});

describe('predict, then check', () => {
  it('with prediction on, the product waits for a committed prediction and the mistake is named', async () => {
    const m = await mount({ viewMode: 'basic', dims: { rows: 7, cols: 8 }, predictFirst: true });
    expect(document.querySelector('[data-areamodel-focus] p').textContent).toBe('7 × 8 = ?');
    expect(hasNumber(56)).toBe(false);
    await type(document.querySelector('#am-predict'), '15');
    await click(document.querySelector('[data-predict-check]'));
    expect(m.latest.pred).toMatchObject({ key: 'b:7x8', ok: false, code: 'added' });
    expect(document.querySelector('[data-areamodel-focus] p').textContent).toBe('7 × 8 = 56');
    expect(text()).toContain('You predicted 15. The model shows 56.');
    expect(text()).toContain('You added 7 + 8');
    // A new array asks for a new prediction.
    await type(byAria('Number of rows (exact value)'), '6');
    expect(document.querySelector('[data-areamodel-focus] p').textContent).toBe('6 × 8 = ?');
  });

  it('teachers can switch prediction on for everyone', async () => {
    await mount({ viewMode: 'multidigit', multiDims: { a: 23, b: 14 }, teacher: { predictFirst: true } });
    expect(document.querySelector('[data-predict-card]')).toBeTruthy();
    expect(hasNumber(322)).toBe(false);
  });
});

describe('bridge to the standard algorithm, line by line', () => {
  it('names a missing carry, links each line to its column of boxes, and credits an unaided finish once', async () => {
    const m = await mount({ viewMode: 'algorithm', algo: { a: 23, b: 14 } });
    const input = () => document.querySelector('#am-algo-input');
    expect(document.querySelector('[data-algo-step="0"]').getAttribute('data-algo-state')).toBe('current');
    await type(input(), '82');
    await click(document.querySelector('[data-algo-check]'));
    expect(m.latest.algo.code[0]).toBe('algo_no_carry');
    expect(text()).toContain('You forgot a regrouped (carried) digit');
    await type(input(), '92');
    await click(document.querySelector('[data-algo-check]'));
    expect(document.querySelector('[data-algo-step="0"]').textContent).toContain('20 × 4 + 3 × 4 = 80 + 12 = 92');
    expect(text()).toContain('3 × 4 = 12. Write 2 and carry 1.');
    expect(text()).toContain('2 × 4 = 8, plus the carried 1 makes 9. Write 9.');
    await type(input(), '23');
    await click(document.querySelector('[data-algo-check]'));
    expect(m.latest.algo.code[1]).toBe('algo_no_placeholder');
    await type(input(), '230');
    await click(document.querySelector('[data-algo-check]'));
    await type(input(), '322');
    await click(document.querySelector('[data-algo-check]'));
    expect(m.latest.algorithmSolved).toBe(1);
    expect(m.award.mock.calls.filter((c) => c[0] === 'areamodel')).toHaveLength(1);
    expect(document.querySelector('[data-areamodel-focus] p').textContent).toBe('23 × 14 = 322');
  });

  it('a shown line ends the problem without credit', async () => {
    const m = await mount({ viewMode: 'algorithm', algo: { a: 23, b: 4 } });
    for (const v of ['1', '2']) { await type(document.querySelector('#am-algo-input'), v); await click(document.querySelector('[data-algo-check]')); }
    await click(document.querySelector('[data-algo-show]'));
    expect(m.latest.algo.res[0]).toBe('shown');
    expect(m.latest.algorithmSolved || 0).toBe(0);
    expect(m.award).not.toHaveBeenCalled();
  });
});

describe('bridge to algebra', () => {
  it('(x + 3)(x + 2) on the same rectangle, checked at x = 10 against 13 × 12', async () => {
    const m = await mount({ viewMode: 'algebra' });
    expect(document.querySelector('[data-areamodel-focus] p').textContent).toBe('(x + 3)(x + 2) = x² + 5x + 6');
    expect(text()).toContain('the area is 13 × 12 = 156');
    expect(text()).toContain('The expression x² + 5x + 6 also gives 156');
    await click(document.querySelector('[data-algebra-bridge]'));
    expect(m.latest.viewMode).toBe('multidigit');
    expect(m.latest.multiDims).toEqual({ a: 13, b: 12 });
  });

  it('an algebra challenge grades the coefficients and names the missing x terms', async () => {
    const m = await mount({ viewMode: 'algebra', challenge: { id: 'g1', mode: 'algebra', f1: { x: 1, c: 3 }, f2: { x: 1, c: 2 }, answer: { A: 1, B: 5, C: 6 } } });
    expect(text()).not.toContain('5x');
    await type(document.querySelector('[data-coef-input="A"]'), '1');
    await type(document.querySelector('[data-coef-input="C"]'), '6');
    await click(button('Check'));
    expect(m.latest.feedback.code).toBe('alg_missing_middle');
    await type(document.querySelector('[data-coef-input="B"]'), '5');
    await click(button('Check'));
    expect(m.latest.feedback.correct).toBe(true);
    expect(m.latest.algebraSolved).toBe(1);
    expect(m.latest.score).toEqual({ correct: 1, total: 1 });
  });
});

describe('fraction side lengths (5.NF.4b)', () => {
  it('accepts an equivalent fraction and counts the solve once', async () => {
    const m = await mount({ viewMode: 'fraction', challenge: { id: 'f1', mode: 'fraction', n1: 2, d1: 3, n2: 3, d2: 4, answer: { num: 6, den: 12 } } });
    expect(document.querySelector('[data-fraction-model]')).toBeTruthy();
    expect(text()).not.toContain('6/12');
    await type(byAria('Challenge answer'), '6');
    await click(button('Check'));
    expect(m.latest.feedback.code).toBe('frac_tile_count');
    await type(byAria('Challenge answer'), '1/2');
    await click(button('Check'));
    expect(m.latest.feedback.correct).toBe(true);
    expect(m.latest.fractionSidesSolved).toBe(1);
    expect(m.award.mock.calls.filter((c) => c[0] === 'areamodel')).toHaveLength(1);
  });
});

describe('fading worked examples', () => {
  it('starts fully worked, then hides one more step after each correct example', async () => {
    const m = await mount({ viewMode: 'multidigit' });
    const sec = () => document.querySelector('[data-worked-mode="multidigit"]');
    expect(sec().getAttribute('data-worked-level')).toBe('0');
    expect(sec().querySelectorAll('[data-worked-input]')).toHaveLength(0);
    await click(sec().querySelector('[data-worked-next]'));
    expect(sec().getAttribute('data-worked-level')).toBe('1');
    const blanks = [...sec().querySelectorAll('[data-worked-input]')];
    expect(blanks).toHaveLength(1);
    // The one blank is the total: read the shown boxes and add them.
    const shown = [...sec().querySelectorAll('li')].slice(0, -1).map((li) => Number(li.textContent.split('=').pop().trim()));
    const total = shown.reduce((s, v) => s + v, 0);
    await type(blanks[0], String(total + 1));
    await click(sec().querySelector('[data-worked-check]'));
    expect(m.latest.worked.multidigit.results[blanks[0].getAttribute('data-worked-input')]).not.toBe('ok');
    await type(sec().querySelector('[data-worked-input]'), String(total));
    await click(sec().querySelector('[data-worked-check]'));
    expect(m.latest.worked.multidigit.done).toBe('advance');
    await click(sec().querySelector('[data-worked-next]'));
    expect(sec().getAttribute('data-worked-level')).toBe('2');
    expect(sec().querySelectorAll('[data-worked-input]')).toHaveLength(2);
  });

  it('worked examples are hidden while a challenge is open', async () => {
    await mount({ viewMode: 'multidigit', challenge: { id: 'w', a: 23, b: 14, answer: 322, mode: 'multidigit', question: 'q' } });
    expect(document.querySelector('[data-worked-mode]')).toBeNull();
  });
});

describe('hint ladder', () => {
  it('three rungs, none of which states the product', async () => {
    const m = await mount({ viewMode: 'multidigit', challenge: { id: 'h', a: 23, b: 14, answer: 322, mode: 'multidigit', question: 'q' } });
    for (let i = 0; i < 4; i += 1) { const b = document.querySelector('[data-hint-button]'); if (!b.disabled) await click(b); }
    expect(m.latest.chWork.hints).toBe(3);
    expect(document.querySelector('[data-hint-level]').getAttribute('data-hint-level')).toBe('3');
    expect(text()).toContain('20 × 10, 20 × 4, 3 × 10, 3 × 4');
    expect(hasNumber(322)).toBe(false);
    expect(m.latest.hintsUsed).toBe(3);
  });
});

describe('teacher hooks', () => {
  it('the teacher panel shows only in teacher mode', async () => {
    await mount({});
    expect(document.querySelector('[data-areamodel-teacher]')).toBeNull();
    await mount({}, { isTeacherMode: true });
    expect(document.querySelector('[data-areamodel-teacher]')).toBeTruthy();
  });

  it('a locked level and hidden tabs apply to students', async () => {
    await mount({ teacher: { lockBand: true, band: 'g3', hidden: { algebra: true, fraction: true } } }, { gradeLevel: '7th Grade' });
    expect(document.querySelector('#am-band').value).toBe('g3');
    expect(document.querySelector('#am-band').disabled).toBe(true);
    const tabs = [...document.querySelectorAll('[role="tab"]')].map((t) => t.id);
    expect(tabs).not.toContain('stem-areamodel-tab-algebra');
    expect(tabs).not.toContain('stem-areamodel-tab-fraction');
    expect(byAria('Algebra tiles')).toBeNull();
  });

  it('with reveals off, no answer appears even after three wrong tries', async () => {
    await mount({ viewMode: 'basic', dims: { rows: 7, cols: 8 }, teacher: { noReveal: true }, challenge: { id: 'n', a: 7, b: 8, answer: 56, mode: 'basic', question: 'q' } });
    for (const v of ['15', '30', '50']) { await type(byAria('Challenge answer'), v); await click(button('Check')); }
    expect(document.querySelector('[data-reveal-button]')).toBeNull();
    expect(document.querySelector('[data-revealed-answer]')).toBeNull();
    expect(text()).toContain('Your teacher turned off answer reveals');
    expect(hasNumber(56)).toBe(false);
  });

  it('the missed-items summary names each mistake', async () => {
    const m = await mount({ viewMode: 'basic', dims: { rows: 7, cols: 8 }, challenge: { id: 's', a: 7, b: 8, answer: 56, mode: 'basic', question: 'q' } });
    await type(byAria('Challenge answer'), '15');
    await click(button('Check'));
    expect(m.latest.missedLog).toEqual([{ m: 'basic', p: '7 × 8', c: 'added' }]);
    await mount(m.latest, { isTeacherMode: true });
    const table = document.querySelector('[data-teacher-misses]');
    expect(table.textContent).toContain('Added instead of multiplied');
  });
});

describe('cross-links', () => {
  it('opens the Area & Perimeter Lab from the discovery panel when it is reachable', async () => {
    window.StemLab.registerTool('areaPerimeter', { label: 'Area & Perimeter Lab', render: () => null });
    const m = await mount({ showAreaPatterns: true });
    const link = document.querySelector('[data-area-discovery] [data-areamodel-link="areaPerimeter"]');
    expect(link).toBeTruthy();
    await click(link);
    expect(m.setTool).toHaveBeenCalledWith('areaPerimeter');
  });

  it('hides links to tools the host cannot load', async () => {
    await mount({ showAreaPatterns: true });
    expect(document.querySelector('[data-areamodel-link="areaPerimeter"]')).toBeNull();
  });

  it('the discovery panel states the units caveat', async () => {
    await mount({ showAreaPatterns: true, _areaHunt: { rows: 4, cols: 4 } });
    expect(text()).toContain('area is counted in square units and perimeter in units');
  });
});

describe('AI stays optional and never leaks', () => {
  it('no tutor button without a live AI backend, or when the teacher turned AI hints off', async () => {
    await mount({});
    expect(button('🤖 AI Tutor')).toBeUndefined();
    await mount({}, { callGemini: vi.fn(), aiHintsEnabled: false });
    expect(button('🤖 AI Tutor')).toBeUndefined();
    await mount({}, { callGemini: vi.fn() });
    expect(button('🤖 AI Tutor')).toBeTruthy();
  });

  it('the tutor prompt omits the product while a challenge is open', async () => {
    const callGemini = vi.fn(() => new Promise(() => {}));
    await mount({ viewMode: 'multidigit', showAITutor: true, aiQuestion: 'help', challenge: { id: 'a', a: 31, b: 12, answer: 372, mode: 'multidigit', question: 'q' } }, { callGemini });
    await click(button('Ask'));
    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(callGemini.mock.calls[0][0]).toContain('factors 31 and 12');
    expect(callGemini.mock.calls[0][0]).not.toContain('372');
  });
});

describe('products stay hidden on every tab while a challenge is open', () => {
  it('a grid challenge hides the explore product on the Partial Products tab', async () => {
    await mount({ viewMode: 'multidigit', multiDims: { a: 23, b: 14 }, challenge: { id: 'x', a: 7, b: 8, answer: 56, mode: 'basic', question: 'q' } });
    expect(document.querySelector('[data-areamodel-focus] p').textContent).toBe('23 × 14 = ?');
    expect(document.querySelector('[data-challenge-card="elsewhere"]')).toBeTruthy();
    expect(hasNumber(322)).toBe(false);
  });
});

describe('i18n', () => {
  it('every t() call uses a literal stem.areamodel key and an English fallback', () => {
    const src = fs.readFileSync(FILE, 'utf8');
    const calls = [...src.matchAll(/[^\w.]t\(\s*([^)]{0,80})/g)].map((m) => m[1]);
    expect(calls.length).toBeGreaterThan(300);
    const bad = calls.filter((c) => !/^'stem\.areamodel\.[a-z0-9_]+',\s*['"]/.test(c));
    expect(bad).toEqual([]);
  });
});
