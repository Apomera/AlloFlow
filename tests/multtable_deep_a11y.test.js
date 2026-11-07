import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Multiplication Table deep rebuild (2026-11-03): keyboard grids, names,
// target sizes, non-colour meaning, contrast, shortcut scope, cleanup and
// i18n coverage. Review items F, G, J. MULTTABLE_DEEP_SRC points the suite at
// another copy (mutation check).

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
  const view = { ann: [], awards: [] };
  function App() {
    const [lab, setLab] = React.useState(opts.lab || {});
    const [answer, setAnswer] = React.useState(opts.answer || '');
    const [challenge, setChallenge] = React.useState(opts.challenge || null);
    const [feedback, setFeedback] = React.useState(opts.feedback || null);
    const [hidden, setHidden] = React.useState(false);
    const [revealed, setRevealed] = React.useState(new Set());
    const [score, setScore] = React.useState({ correct: 0, total: 0 });
    view.lab = lab; view.challenge = challenge;
    view.snap = JSON.stringify([lab, challenge, hidden]);
    return tool.render(makeCtx(Object.assign({
      labToolData: lab, setLabToolData: setLab,
      multTableAnswer: answer, setMultTableAnswer: setAnswer,
      multTableChallenge: challenge, setMultTableChallenge: setChallenge,
      multTableFeedback: feedback, setMultTableFeedback: setFeedback,
      multTableHidden: hidden, setMultTableHidden: setHidden,
      multTableHover: null, setMultTableHover: () => {},
      multTableRevealed: revealed, setMultTableRevealed: setRevealed,
      exploreScore: score, setExploreScore: setScore,
      announceToSR: (m) => view.ann.push(String(m)), awardXP: (...a) => view.awards.push(a),
    }, opts.ctx || {})));
  }
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(async () => { root.render(React.createElement(App)); });
  return view;
}
const act = (fn) => React.act(async () => { await fn(); });
async function key(target, k, extra) {
  await act(() => { target.dispatchEvent(new window.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, extra || {}))); });
}
async function unmount() { await act(() => root.unmount()); root = null; host.remove(); host = null; }

function lum(hex) {
  const v = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }
function rgbToHex(s) {
  const m = /rgb\((\d+), (\d+), (\d+)\)/.exec(s);
  return m ? '#' + m.slice(1).map((n) => Number(n).toString(16).padStart(2, '0')).join('') : s;
}

// Every state worth inspecting: tabs, retry, results, badges, coach, teacher.
const STATES = [
  { name: 'practice default', lab: {} },
  { name: 'practice retry', lab: {}, challenge: { a: 7, b: 8, mode: 'mult', source: 'tool', id: 'x' }, feedback: { correct: false, retry: true, tries: 2, forKey: 'x', lastWrong: 15, mistake: { kind: 'added', given: 15, a: 7, b: 8 } } },
  { name: 'practice resolved', lab: { _multInputDisabled: true }, challenge: { a: 7, b: 8, mode: 'div', divisor: 7, source: 'tool', id: 'y' }, feedback: { correct: false, resolved: true, revealed: true, tries: 3, forKey: 'y', lastWrong: 9, mistake: { kind: 'offByOne', given: 9, d: 7, p: 56 } } },
  { name: 'results + badges + coach + heatmap', lab: { _multTimer: { active: false, score: 7, total: 10, timeLeft: 0, ended: true, missed: [{ a: 7, b: 8, answer: 56, mode: 'mult' }] }, _multExt: { showBadges: true, showCoach: true, showHeatmap: true, badges: { firstCorrect: true }, factScores: { '7x8': { attempts: 3, correct: 1 }, '2x2': { attempts: 3, correct: 3 }, '6x7': { attempts: 3, correct: 2 } } } } },
  { name: 'speed run', lab: { _multTimer: { active: true, paused: true, score: 1, total: 2, timeLeft: 90, endTime: Date.now() + 90000, missed: [] } } },
  { name: 'teacher', lab: {}, ctx: { isTeacherMode: true } },
  { name: 'visual predict', lab: { _multExt: { mtTab: 'visual' } } },
  { name: 'visual built', lab: { _multExt: { mtTab: 'visual', visualA: 7, visualB: 8, visualPred: { key: '7x8', built: true, committed: 54 } } } },
  { name: 'patterns', lab: { _multExt: { mtTab: 'patterns', patternId: 'nines' } } },
];

describe('keyboard grids (review F)', () => {
  it('the full table is one tab stop with arrow keys, Home/End and Enter to select', async () => {
    const view = await mount();
    const grid = host.querySelector('[data-mt-grid="table"]');
    expect(grid.getAttribute('role')).toBe('grid');
    const stops = () => [...grid.querySelectorAll('[role="gridcell"]')].filter((c) => c.tabIndex === 0);
    expect(grid.querySelectorAll('[role="gridcell"]')).toHaveLength(144);
    expect(stops()).toHaveLength(1);
    let cell = stops()[0];
    cell.focus();
    await key(cell, 'ArrowRight'); await key(document.activeElement, 'ArrowDown');
    expect(document.activeElement.dataset).toMatchObject({ r: '2', c: '2' });
    expect(stops()[0]).toBe(document.activeElement);
    await key(document.activeElement, 'End');
    expect(document.activeElement.dataset).toMatchObject({ r: '2', c: '12' });
    await key(document.activeElement, 'End', { ctrlKey: true });
    expect(document.activeElement.dataset).toMatchObject({ r: '12', c: '12' });
    await key(document.activeElement, 'Home', { ctrlKey: true });
    cell = document.activeElement;
    for (let i = 0; i < 6; i++) await key(document.activeElement, 'ArrowRight');
    for (let i = 0; i < 6; i++) await key(document.activeElement, 'ArrowDown');
    await key(document.activeElement, 'Enter');
    const sel = grid.querySelector('[aria-selected="true"]');
    expect(sel.dataset).toMatchObject({ r: '7', c: '7' });
    expect(sel.getAttribute('aria-label')).toBe('7 times 7 equals 49.');
    expect(view.ann.at(-1)).toContain('7 × 7 = 49');
  });

  it('the heatmap carries its meaning in a symbol and a spoken status, not colour alone', async () => {
    const view = await mount({ lab: { _multExt: { showHeatmap: true, factScores: { '7x8': { attempts: 3, correct: 1 }, '2x2': { attempts: 3, correct: 3 }, '6x7': { attempts: 3, correct: 2 } } } } });
    const grid = host.querySelector('[data-mt-grid="heat"]');
    const cell = (r, c) => grid.querySelector(`[data-r="${r}"][data-c="${c}"]`);
    expect(cell(7, 8).textContent).toBe('!');
    expect(cell(8, 7).getAttribute('aria-label')).toBe('8 times 7: 1 of 3 right on the first try, needs practice.');
    expect(cell(2, 2).textContent).toBe('✓');
    expect(cell(6, 7).textContent).toBe('~');
    expect(cell(3, 3).getAttribute('aria-label')).toBe('3 times 3: not tried yet.');
    expect([...grid.querySelectorAll('[role="gridcell"]')].filter((c) => c.tabIndex === 0)).toHaveLength(1);
    for (const c of [cell(7, 8), cell(2, 2), cell(6, 7), cell(3, 3)]) {
      expect(ratio(rgbToHex(c.style.color), rgbToHex(c.style.backgroundColor))).toBeGreaterThanOrEqual(4.5);
    }
    cell(1, 1).focus();
    await key(cell(1, 1), 'Enter');
    expect(view.challenge).toMatchObject({ a: 1, b: 1, source: 'chosen' });
  });
});

describe('names, sizes and contrast (review F, G)', () => {
  it('every button in every state has an accessible name and a 24px+ target', async () => {
    const problems = [];
    for (const st of STATES) {
      await mount(st);
      for (const b of host.querySelectorAll('button')) {
        const name = (b.getAttribute('aria-label') || b.textContent || '').trim();
        const minH = parseFloat(b.style.minHeight || '0');
        if (!name || /^[✕×]$/.test(name)) problems.push(st.name + ': unnamed ' + b.outerHTML.slice(0, 80));
        if (!(minH >= 24) && b.getAttribute('role') !== 'tab') problems.push(st.name + ': small ' + name.slice(0, 40));
      }
      await unmount();
    }
    expect(problems).toEqual([]);
  });

  it('pattern accents hold 4.5:1 against white text and in-pattern cells have a non-colour outline', async () => {
    const src = fs.readFileSync(FILE, 'utf8');
    // eslint-disable-next-line no-new-func
    const PATTERNS = new Function('t', src.slice(src.indexOf('var PATTERNS = ['), src.indexOf('var renderPatterns')) + '\nreturn PATTERNS;')((k, fb) => fb);
    for (const p of PATTERNS) expect(ratio(p.accent, '#ffffff'), p.id).toBeGreaterThanOrEqual(4.5);
    await mount({ lab: { _multExt: { mtTab: 'patterns', patternId: 'nines' } } });
    const lit = [...host.querySelectorAll('td.allo-mt-pattern-cell')];
    expect(lit).toHaveLength(23);
    expect(lit.every((td) => td.style.outline.includes('solid') && td.textContent.includes('(in pattern)'))).toBe(true);
    expect(lit.every((td) => td.style.opacity === '')).toBe(true);
  });

  it('speed-run result titles are readable (4.5:1 on white)', async () => {
    for (const [score, total] of [[10, 10], [9, 10], [8, 10], [5, 10], [1, 10]]) {
      await mount({ lab: { _multTimer: { active: false, score, total, timeLeft: 0, missed: [] } } });
      const title = host.querySelector('[data-mt-results] h3');
      expect(ratio(rgbToHex(title.style.color), '#ffffff'), title.textContent).toBeGreaterThanOrEqual(4.5);
      await unmount();
    }
  });

  it('feedback lives in a polite status region', async () => {
    await mount({ challenge: { a: 7, b: 8, mode: 'mult', source: 'tool', id: 'z' } });
    const region = host.querySelector('[data-mt-feedback]');
    expect(region.getAttribute('role')).toBe('status');
    expect(region.getAttribute('aria-live')).toBe('polite');
  });
});

describe('single-key shortcuts never fire from a control (WCAG 2.1.4)', () => {
  it('ignores keys outside the tool, with Ctrl, and on a focused button; acts on the panel itself', async () => {
    const view = await mount();
    const before = view.snap;
    await key(document.body, 'b');
    expect(view.snap).toBe(before);
    const btn = host.querySelector('button');
    await key(btn, 'b', { ctrlKey: true });
    expect(view.snap).toBe(before);
    await key(btn, 'b');
    expect(view.snap, 'b on a focused button').toBe(before);
    const cell = host.querySelector('[role="gridcell"]');
    await key(cell, 'b');
    expect(view.snap, 'b on a grid cell').toBe(before);
    await key(host.querySelector('[role="tabpanel"]'), 'b');
    expect(view.lab._multExt.showBadges).toBe(true);
  });
});

describe('cleanup', () => {
  it('removes its key listener and stops the speed-run clock on unmount', async () => {
    vi.useFakeTimers();
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const view = await mount({ lab: { _multTimer: { active: true, paused: false, score: 0, total: 0, timeLeft: 120, endTime: Date.now() + 120000, missed: [] } } });
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(view.lab._multTimer.timeLeft).toBeLessThan(120);
    const keyAdds = add.mock.calls.filter((c) => c[0] === 'keydown').map((c) => c[1]);
    await unmount();
    const keyRemoves = remove.mock.calls.filter((c) => c[0] === 'keydown').map((c) => c[1]);
    expect(keyAdds.length).toBeGreaterThan(0);
    expect(keyAdds.every((fn) => keyRemoves.includes(fn))).toBe(true);
    const pending = vi.getTimerCount();
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(vi.getTimerCount()).toBeLessThanOrEqual(pending);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('mounts every state, plain, dark and high contrast, with no console errors', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    for (const st of STATES) for (const theme of [{}, { isDark: true }, { isContrast: true }]) {
      await mount({ ...st, ctx: { ...(st.ctx || {}), ...theme } });
      await unmount();
    }
    expect(errors.mock.calls.map((c) => String(c[0]).slice(0, 160))).toEqual([]);
  });
});

describe('i18n (review J)', () => {
  it('every visible sentence and accessible name goes through t()', async () => {
    const leftovers = new Set();
    for (const st of STATES) {
      await mount({ ...st, ctx: { ...(st.ctx || {}), t: () => '⟦⟧' } });
      const chunks = [host.textContent];
      host.querySelectorAll('[aria-label],[placeholder],[title]').forEach((el) => {
        ['aria-label', 'placeholder', 'title'].forEach((a) => { if (el.getAttribute(a)) chunks.push(el.getAttribute(a)); });
      });
      for (const chunk of chunks) {
        chunk.split('⟦⟧').forEach((seg) => {
          const s = seg.replace(/[\d\s.,:;()+\-−×÷=?/'"→⇄%<≥…!✓·~★←-⇿]+/g, ' ').trim();
          if (/[A-Za-z]{3,}/.test(s)) leftovers.add(st.name + ': ' + s.slice(0, 80));
        });
      }
      await unmount();
    }
    expect([...leftovers]).toEqual([]);
  });
});
