// Area Model deep rebuild (2026-11-03): one regression per confirmed review bug
// (C:/tmp/stem_tool_review_2026-11-03b/area_report.md). Driven through the real UI.
// AREAMODEL_DEEP_SRC points the suite at another copy of the tool; the pre-rebuild
// copy (C:/tmp/stem_tool_deep_2026-11-03/orig/stem_tool_areamodel.js) turns these red.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.AREAMODEL_DEEP_SRC || 'stem_lab/stem_tool_areamodel.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root = null;
let rafCalls = 0;
beforeEach(() => {
  resetStemLab();
  loadTool(FILE, 'areamodel');
  document.body.innerHTML = '<div id="root"></div>';
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => new Proxy({ measureText: () => ({ width: 20 }) }, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => { t[k] = v; return true; } }));
  if (!window.ResizeObserver) { window.ResizeObserver = class { observe() {} disconnect() {} }; globalThis.ResizeObserver = window.ResizeObserver; }
});
afterEach(async () => {
  if (root) await React.act(async () => { root.unmount(); });
  root = null;
  if (window._areaModelKbHandler) { window.removeEventListener('keydown', window._areaModelKbHandler); window._areaModelKbHandler = null; }
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

async function mount(seed, extra) {
  const out = { latest: null, award: vi.fn(), announce: vi.fn() };
  function App() {
    const [state, setState] = React.useState({ _areamodel: seed || {} });
    out.latest = state._areamodel;
    return window.StemLab._registry.areamodel.render(makeCtx(Object.assign({ toolData: state, setToolData: setState, awardXP: out.award, announceToSR: out.announce }, extra || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  return out;
}
// Text nodes joined with spaces, so the row labels "1 2 3 4 5 6 7" never read as "56".
const text = () => {
  const walker = document.createTreeWalker(document.getElementById('root'), NodeFilter.SHOW_TEXT);
  const parts = [];
  while (walker.nextNode()) parts.push(walker.currentNode.nodeValue);
  return parts.join(' ').replace(/\s+/g, ' ');
};
const hasNumber = (n) => new RegExp('(^|[^\\d.])' + n + '(?![\\d]|\\.\\d)').test(text());
const byAria = (label) => document.querySelector('[aria-label="' + label + '"]');
const button = (label) => [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === label || b.textContent.trim() === label);
async function type(el, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await React.act(async () => { setter.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function click(el) { await React.act(async () => { el.click(); }); }
async function press(el, key, extra) {
  await React.act(async () => { el.dispatchEvent(new window.KeyboardEvent('keydown', Object.assign({ key, bubbles: true, cancelable: true }, extra || {}))); });
}

describe('answers stay hidden during a challenge (review HIGH :463-483, :538-540, :545-607)', () => {
  it('the skip-count overlay of a grid challenge does not print the product', async () => {
    await mount({ viewMode: 'basic', dims: { rows: 7, cols: 8 }, challenge: { a: 7, b: 8, answer: 56, mode: 'basic', question: 'What is 7 × 8?' } });
    expect(text()).toContain('What is 7 × 8');
    expect(hasNumber(56)).toBe(false);
  });

  it('a distributive challenge shows the split but neither piece nor the total', async () => {
    await mount({ viewMode: 'distributive', dims: { rows: 7, cols: 9 }, splitAt: 5, challenge: { a: 7, b: 9, split: 5, answer: 63, mode: 'distributive', question: '7 × 9 = 7 × 5 + 7 × 4 = ?' } });
    const t = text();
    expect(t).toContain('7 × 9 = 7 × 5 + 7 × 4');
    expect(hasNumber(63)).toBe(false);
    expect(hasNumber(35)).toBe(false);
    expect(hasNumber(28)).toBe(false);
  });
});

describe('wrong answers name the mistake without giving the answer; copies earn nothing (review HIGH :308-322, :625, :712, :357)', () => {
  it('a wrong partial-products answer keeps the product and partial products hidden', async () => {
    await mount({ viewMode: 'multidigit', multiDims: { a: 23, b: 14 }, challenge: { a: 23, b: 14, answer: 322, mode: 'multidigit', question: 'Use partial products to find 23 × 14.' } });
    await type(byAria('Challenge answer'), '210');
    await click(button('Check'));
    const t = text();
    expect(hasNumber(322)).toBe(false);
    expect(hasNumber(200)).toBe(false);
    expect(hasNumber(92)).toBe(false);
    // 210 = 200 + 10? no: 20×10 + 3×4 = 212; 210 is a near miss. Still no answer on screen.
  });

  it('the "added" mistake is named, and the sentence does not contain the product', async () => {
    const m = await mount({ viewMode: 'basic', dims: { rows: 7, cols: 8 }, challenge: { a: 7, b: 8, answer: 56, mode: 'basic', question: 'What is 7 × 8?' } });
    await type(byAria('Challenge answer'), '15');
    await click(button('Check'));
    expect(text()).toMatch(/You added 7 \+ 8/);
    expect(hasNumber(56)).toBe(false);
    expect(m.latest.score).toEqual({ correct: 0, total: 1 });
  });

  it('after the answer is revealed, typing it earns no score, no XP and no badge', async () => {
    const m = await mount({ viewMode: 'basic', dims: { rows: 7, cols: 8 }, challenge: { id: 'r1', a: 7, b: 8, answer: 56, mode: 'basic', question: 'What is 7 × 8?' } });
    for (const wrong of ['15', '30']) {
      await type(byAria('Challenge answer'), wrong);
      await click(button('Check'));
    }
    const reveal = document.querySelector('[data-reveal-button]');
    expect(reveal, 'a reveal appears only after two tries').toBeTruthy();
    await click(reveal);
    expect(text()).toContain('56');
    const input = byAria('Challenge answer');
    expect(input.disabled).toBe(true);
    await type(input, '56');
    await click(button('Check'));
    expect(m.latest.score.correct).toBe(0);
    expect(m.award).not.toHaveBeenCalled();
    expect(m.latest.badges && m.latest.badges.firstArea).toBeFalsy();
  });

  it('no reveal before a second try', async () => {
    await mount({ viewMode: 'basic', dims: { rows: 7, cols: 8 }, challenge: { id: 'r2', a: 7, b: 8, answer: 56, mode: 'basic', question: 'What is 7 × 8?' } });
    await type(byAria('Challenge answer'), '15');
    await click(button('Check'));
    expect(document.querySelector('[data-reveal-button]')).toBeNull();
    expect(hasNumber(56)).toBe(false);
  });
});

describe('factor typing (review MED :652, :662)', () => {
  it('typing 4 then 45 into Factor A gives 45, and clearing does not jump to 10', async () => {
    const m = await mount({ viewMode: 'multidigit' });
    const el = () => byAria('Factor A');
    await type(el(), '4');
    expect(el().value).toBe('4');
    await type(el(), '45');
    expect(el().value).toBe('45');
    expect(m.latest.multiDims.a).toBe(45);
    await type(el(), '');
    expect(el().value).toBe('');
    expect(m.latest.multiDims.a).toBe(45);
  });
});

describe('inputs lock during a challenge (review MED :648-663, :1041-1062, :410-414)', () => {
  it('Factor A cannot change a multi-digit challenge', async () => {
    const m = await mount({ viewMode: 'multidigit', multiDims: { a: 23, b: 14 }, challenge: { a: 23, b: 14, answer: 322, mode: 'multidigit', question: 'q' } });
    const el = byAria('Factor A');
    expect(el.readOnly || el.disabled).toBe(true);
    await type(el, '45');
    expect(m.latest.multiDims.a).toBe(23);
    expect(document.querySelector('#am-partial-desc').textContent).toContain('23 × 14');
  });

  it('the rows control cannot resize a grid challenge', async () => {
    const m = await mount({ viewMode: 'basic', dims: { rows: 7, cols: 8 }, challenge: { a: 7, b: 8, answer: 56, mode: 'basic', question: 'q' } });
    const exact = byAria('Number of rows (exact value)');
    expect(exact.disabled).toBe(true);
    expect(byAria('Number of rows').disabled).toBe(true);
    await type(exact, '3');
    expect(m.latest.dims).toEqual({ rows: 7, cols: 8 });
  });

  it('a bare "c" on a focused button does not swap a distributive challenge', async () => {
    const m = await mount({ viewMode: 'distributive', dims: { rows: 7, cols: 9 }, splitAt: 5, challenge: { a: 7, b: 9, split: 5, answer: 63, mode: 'distributive', question: 'q' } });
    await React.act(async () => { await new Promise((r) => setTimeout(r, 5)); });
    const btn = document.querySelector('[data-areamodel-root] button');
    const before = JSON.stringify(m.latest);
    for (const key of ['c', 'C', 'n', 'w', 'b']) await press(btn, key);
    expect(JSON.stringify(m.latest)).toBe(before);
  });
});

describe('grid accessibility (review MED a11y :432-446)', () => {
  it('a 12 × 12 grid is one tab stop, arrow keys move inside it, and it has a whole-array description', async () => {
    await mount({ viewMode: 'basic', dims: { rows: 12, cols: 12 } });
    const cells = [...document.querySelectorAll('[role="gridcell"]')];
    expect(cells).toHaveLength(144);
    expect(cells.filter((c) => c.getAttribute('tabindex') === '0')).toHaveLength(1);
    const grid = document.querySelector('[role="grid"]');
    const desc = document.getElementById(grid.getAttribute('aria-describedby'));
    expect(desc.textContent).toContain('12 rows with 12 squares in each row');
    const first = document.querySelector('[data-cell="0-0"]');
    first.focus();
    await press(first, 'ArrowRight');
    expect(document.activeElement.getAttribute('data-cell')).toBe('0-1');
    await press(document.activeElement, 'ArrowDown');
    expect(document.activeElement.getAttribute('data-cell')).toBe('1-1');
    expect(document.querySelector('[data-cell="1-1"]').getAttribute('tabindex')).toBe('0');
    expect(document.querySelectorAll('[role="gridcell"][tabindex="0"]')).toHaveLength(1);
    await press(document.activeElement, 'Enter');
    expect(document.querySelector('[data-cell="0-0"]').getAttribute('aria-selected')).toBe('true');
    expect(document.querySelector('[data-cell="2-2"]').getAttribute('aria-selected')).toBe('false');
  });
});

describe('low-severity items (review LOW)', () => {
  it('developer notes are not shown to students (:1351, :1383)', async () => {
    await mount({ showAreaPatterns: true });
    expect(text()).not.toMatch(/Design note|Discrete 4-state|No score, no reveal/);
  });

  it('the pattern canvas stops animating under reduced motion (:1237-1319)', async () => {
    const mm = vi.fn(() => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    window.matchMedia = mm;
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => { rafCalls += 1; return rafCalls; });
    rafCalls = 0;
    await mount({ showAreaPatterns: true });
    expect(document.querySelector('canvas')).toBeTruthy();
    expect(raf).not.toHaveBeenCalled();
    delete window.matchMedia;
  });

  it('"Well Rounded" needs solves in all four modes, not starts (:221, :257)', async () => {
    const m = await mount({
      viewMode: 'basic', dims: { rows: 2, cols: 3 }, challengeTypesUsed: { basic: true, distributive: true, multidigit: true, word: true },
      challenge: { a: 2, b: 3, answer: 6, mode: 'basic', question: 'q' }, answer: '6'
    });
    await click(button('Check'));
    expect(m.latest.badges.firstArea).toBe(true);
    expect(m.latest.badges.allModes).toBeFalsy();
  });

  it('the tab panel wraps the mode content, not only a heading (:995-1003)', async () => {
    await mount({ viewMode: 'basic' });
    const panel = document.querySelector('[role="tabpanel"]');
    expect(panel.querySelector('[role="grid"]'), 'grid inside the panel').toBeTruthy();
    await mount({ viewMode: 'multidigit' });
    const panels = document.querySelectorAll('[role="tabpanel"]');
    expect(panels[panels.length - 1].querySelector('[data-partial-model]')).toBeTruthy();
  });
});

describe('Dynamic Assessment presets (misc_handlers_module.js writes rows/cols into _areamodel)', () => {
  it('a { rows, cols, highlight } preset shows that array', async () => {
    const m = await mount({ rows: 5, cols: 7, highlight: { row: 1, col: 2 } });
    expect(document.querySelectorAll('[role="gridcell"]')).toHaveLength(35);
    expect(m.latest.dims).toEqual({ rows: 5, cols: 7 });
    expect(m.latest.rows).toBeUndefined();
    expect(document.querySelectorAll('[role="gridcell"][aria-selected="true"]')).toHaveLength(6);
  });
});
