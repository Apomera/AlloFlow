// Independent hunt of the Cellular engagement build (2026-11-04). Each test here
// failed on the build as handed over (CELLULAR_TOOL_FILE points the suite at the start copy).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const TOOL_FILE = process.env.CELLULAR_TOOL_FILE || 'stem_lab/stem_tool_cellular.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
let errSpy;
let P;

beforeEach(() => {
  resetStemLab();
  errSpy = vi.spyOn(console, 'error');
  loadTool(TOOL_FILE, 'cellularLab');
  P = window.__alloCellularPure;
  Element.prototype.scrollIntoView = vi.fn();
  document.body.innerHTML = '<div id="root"></div>';
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount());
  root = null;
  vi.restoreAllMocks();
  delete Element.prototype.scrollIntoView;
});

async function mount(over, initial) {
  const out = { latest: null };
  function App() {
    const [state, setState] = React.useState(initial || {});
    out.latest = state;
    return window.StemLab._registry.cellularLab.render(makeCtx(Object.assign({ toolData: state, setToolData: setState }, over || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(() => root.render(React.createElement(App)));
  return out;
}
const buttons = () => Array.from(document.querySelectorAll('button'));
const btnByText = (txt) => buttons().find((b) => b.textContent.trim() === txt) || buttons().find((b) => b.textContent.includes(txt));
async function click(el) { if (!el) throw new Error('missing element'); await React.act(() => el.click()); }
async function key(el, k, extra) { await React.act(() => { el.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true }, extra || {}))); }); }
const lifeGrid = () => document.querySelector('[role="grid"][data-life-grid]');
const radio = (v) => document.querySelector('input[type="radio"][name="cell-life-predict"][value="' + v + '"]');
const popNow = () => Number((document.querySelector('[data-life-description]').textContent.match(/(\d+) live cells?/) || [])[1] || 0);
const genNow = () => Number((document.querySelector('[data-life-description]').textContent.match(/Generation (\d+)/) || [])[1]);
const result = () => document.querySelector('[data-predict-result]');
// Absolute cells from a known cursor; Ctrl+Home parks the cursor at (0, 0) first.
async function drawCells(cells) {
  const g = lifeGrid(); g.focus();
  await key(g, 'Home', { ctrlKey: true });
  let cur = [0, 0];
  for (const [r, c] of cells) {
    while (cur[0] < r) { await key(g, 'ArrowDown'); cur[0]++; }
    while (cur[0] > r) { await key(g, 'ArrowUp'); cur[0]--; }
    while (cur[1] < c) { await key(g, 'ArrowRight'); cur[1]++; }
    while (cur[1] > c) { await key(g, 'ArrowLeft'); cur[1]--; }
    await key(g, ' ');
  }
}
async function predict(pick) {
  await click(radio(pick));
  await click(btnByText('Lock in my guess and run'));
  await click(btnByText('Skip to the result'));
  return result();
}
async function again() { await click(btnByText('Predict again')); }
// Becomes a block, so "settles" is right. Not in the gallery.
const ELL = [[13, 18], [13, 19], [14, 18]];

describe('a tap on a touch screen', () => {
  it('draws one square: the browser\'s follow-up mouse events do not undo it', async () => {
    await mount();
    await click(btnByText('Clear'));
    const svg = document.querySelector('svg.cellularlab-svg');
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 400, right: 400, bottom: 400 });
    const at = { clientX: 105, clientY: 105 };
    await React.act(() => {
      const ts = new Event('touchstart', { bubbles: true, cancelable: true });
      ts.touches = [at];
      svg.dispatchEvent(ts);
    });
    expect(popNow()).toBe(1);
    await React.act(() => { svg.dispatchEvent(new Event('touchend', { bubbles: true })); });
    // What Chromium and Safari send after the finger lifts (React's root touch listener is passive).
    await React.act(() => {
      svg.dispatchEvent(new MouseEvent('mousemove', Object.assign({ bubbles: true }, at)));
      svg.dispatchEvent(new MouseEvent('mousedown', Object.assign({ bubbles: true }, at)));
      svg.dispatchEvent(new MouseEvent('mouseup', Object.assign({ bubbles: true }, at)));
    });
    expect(popNow()).toBe(1);
  });
  it('a real mouse still toggles: the guard only swallows the events a touch sends', async () => {
    await mount();
    await click(btnByText('Clear'));
    const svg = document.querySelector('svg.cellularlab-svg');
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 400, right: 400, bottom: 400 });
    const press = () => React.act(() => { svg.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 105, clientY: 105 })); svg.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); });
    await press();
    expect(popNow()).toBe(1);
    await press();
    expect(popNow()).toBe(0);
  });
  it('the Erase brush erases on a live square, on an empty square and through a stroke', async () => {
    await mount();
    await click(btnByText('Clear'));
    const svg = document.querySelector('svg.cellularlab-svg');
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 400, right: 400, bottom: 400 });
    await drawCells([[10, 10], [10, 11], [10, 12]]);
    expect(popNow()).toBe(3);
    await click(btnByText('Erase'));
    await React.act(() => { svg.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 95, clientY: 105 })); });
    expect(popNow()).toBe(3);
    await React.act(() => { svg.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 105, clientY: 105 })); svg.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 115, clientY: 105 })); });
    expect(popNow()).toBe(1);
    await React.act(() => { svg.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); });
  });
});

describe('prediction XP cannot be earned by re-presenting a start', () => {
  it('a gallery pattern with one square taken off and put back is still the gallery pattern', async () => {
    const award = vi.fn();
    await mount({ awardXP: award });
    // The default start is the gallery glider at (2, 2): (2, 3) is live.
    await drawCells([[2, 3]]);
    await drawCells([[2, 3]]);
    expect(popNow()).toBe(5);
    const res = await predict('flies');
    expect(res.getAttribute('data-predict-result')).toBe('right');
    expect(res.textContent).toMatch(/No XP: gallery patterns/);
    expect(award).not.toHaveBeenCalled();
  });
  it('a gallery pattern redrawn by hand, or a turned or mirrored copy, earns nothing', async () => {
    const award = vi.fn();
    await mount({ awardXP: award });
    const G = P.patterns.glider.cells;
    const turned = G.map(([r, c]) => [c + 20, 10 - r]);
    const shapes = [
      { cells: P.patterns.blinker.cells.map(([r, c]) => [r + 20, c + 20]), pick: 'repeats' },
      { cells: P.patterns.blinker.cells.map(([r, c]) => [c + 20, r + 20]), pick: 'repeats' },
      { cells: P.patterns.block.cells.map(([r, c]) => [r + 20, c + 20]), pick: 'settles' },
      { cells: turned, pick: 'flies' },
    ];
    for (const s of shapes) {
      await click(btnByText('Clear'));
      await drawCells(s.cells);
      const res = await predict(s.pick);
      expect(res.getAttribute('data-predict-result')).toBe('right');
      expect(res.textContent).toMatch(/No XP: gallery patterns/);
      await again();
    }
    expect(award).not.toHaveBeenCalled();
  });
  it('watching a start, then flipping the edges, does not make it a start nobody has seen', async () => {
    const award = vi.fn();
    await mount({ awardXP: award });
    await click(btnByText('Clear'));
    await drawCells(ELL);
    await click(btnByText('Step'));
    await click(btnByText('Step'));
    await click(btnByText('Rewind'));
    await click(btnByText('Rewind'));
    expect(genNow()).toBe(0);
    await click(btnByText('Wrapping edges'));
    const res = await predict('settles');
    expect(res.getAttribute('data-predict-result')).toBe('right');
    expect(res.textContent).toMatch(/No XP: this start had already been run/);
    expect(award).not.toHaveBeenCalled();
  });
  it('"Log with both edge types" prints the outcome under both edges, so neither pays afterwards', async () => {
    const award = vi.fn();
    await mount({ awardXP: award });
    await click(btnByText('Clear'));
    await drawCells(ELL);
    await click(btnByText('Log with both edge types'));
    await click(btnByText('Wrapping edges'));
    const res = await predict('settles');
    expect(res.textContent).toMatch(/No XP: this start had already been run/);
    expect(award).not.toHaveBeenCalled();
  });
  it('one earned start does not pay again when moved, turned, mirrored, resized or put across the wrapped seam', async () => {
    const award = vi.fn();
    await mount({ awardXP: award });
    await click(btnByText('Clear'));
    await drawCells(ELL);
    expect((await predict('settles')).textContent).toMatch(/You earned 1 XP/);
    expect(award).toHaveBeenCalledTimes(1);
    await again();
    const copies = [
      [[30, 5], [30, 6], [31, 5]], // moved
      [[20, 20], [20, 21], [21, 21]], // turned
      [[5, 30], [6, 30], [6, 31]], // turned again
      [[10, 39], [10, 0], [11, 39]], // across the left and right seam
      [[39, 10], [39, 11], [0, 10]], // across the top and bottom seam
    ];
    for (const cells of copies) {
      await click(btnByText('Clear'));
      await drawCells(cells);
      const res = await predict('settles');
      expect(res.getAttribute('data-predict-result')).toBe('right');
      expect(res.textContent).toMatch(/No XP/);
      await again();
    }
    await click(btnByText('Wrapping edges'));
    await click(btnByText('Clear'));
    await drawCells(ELL);
    expect((await predict('settles')).textContent).toMatch(/No XP/);
    await again();
    await click(btnByText('60 × 60'));
    await drawCells(ELL);
    expect((await predict('settles')).textContent).toMatch(/No XP/);
    expect(award).toHaveBeenCalledTimes(1);
  });
  it('a genuinely different shape or rule still pays, up to the cap of 5 and no further', async () => {
    const award = vi.fn();
    const out = await mount({ awardXP: award });
    // Five different shapes that are not in the gallery, each read off the real run first.
    const shapes = [
      { cells: [[10, 10], [10, 11], [11, 10]], pick: 'settles' },
      { cells: [[10, 10], [10, 11], [10, 12], [11, 11]], pick: 'repeats' }, // T becomes a traffic light
      { cells: [[10, 10], [11, 11]], pick: 'dies' },
      { cells: [[10, 10], [10, 11]], pick: 'dies' },
      { cells: [[10, 10]], pick: 'dies' },
      { cells: [[10, 10], [12, 12]], pick: 'dies' },
    ];
    for (let i = 0; i < shapes.length; i++) {
      await click(btnByText('Clear'));
      await drawCells(shapes[i].cells);
      const res = await predict(shapes[i].pick);
      expect(res.getAttribute('data-predict-result')).toBe('right');
      if (i < 5) expect(res.textContent).toMatch(/You earned 1 XP/);
      else expect(res.textContent).toMatch(/prediction XP is used up/);
      await again();
    }
    expect(award).toHaveBeenCalledTimes(5);
    expect(Object.keys(out.latest._cellularLab.xp).filter((k) => k.startsWith('pr_')).length).toBe(5);
    // The saved keys are hashes, never the drawing.
    for (const k of Object.keys(out.latest._cellularLab.xp)) expect(k).toMatch(/^pr_[0-9a-z]+$/);
  });
  it('the same shape under a different rule is a new start, and a gallery shape only counts under Life\'s rule', () => {
    const g = P.stampPattern(P.emptyGrid(40, 40), 'glider', 5, 5);
    expect(P.startKeyOf(g, true, '3', '23')).not.toBe(P.startKeyOf(g, true, '36', '23'));
    expect(P.isGalleryShape(g, true, '3', '23')).toBe(true);
    expect(P.isGalleryShape(g, true, '36', '23')).toBe(false);
  });
  it('every phase the Patterns tab draws is recognised, wherever it sits; ordinary shapes are not', () => {
    let g = P.stampPattern(P.emptyGrid(40, 40), 'glider', 18, 18);
    for (let i = 0; i < 4; i++) { expect(P.isGalleryShape(g, true, '3', '23')).toBe(true); g = P.stepLife(g, true, '3', '23'); }
    const seam = P.emptyGrid(40, 40); [[39, 39], [39, 0], [39, 1]].forEach(([r, c]) => { seam[r][c] = 1; });
    expect(P.isGalleryShape(seam, true, '3', '23')).toBe(true); // a blinker across the seam, on wrapping edges
    expect(P.isGalleryShape(seam, false, '3', '23')).toBe(false); // on fixed edges those squares are not neighbours
    const ell = P.emptyGrid(40, 40); [[9, 9], [9, 10], [10, 9]].forEach(([r, c]) => { ell[r][c] = 1; });
    expect(P.isGalleryShape(ell, true, '3', '23')).toBe(false);
  });
});

describe('Skip to the result keeps the record of the run it skipped', () => {
  it('Peak is the real peak of the skipped generations, and Rewind restores it', async () => {
    await mount();
    await click(btnByText('Clear'));
    // Rises and falls before it settles: read the true peak off the engine.
    const cells = [[20, 18], [20, 19], [20, 20], [21, 19]];
    await drawCells(cells);
    await click(radio('repeats'));
    await click(btnByText('Lock in my guess and run'));
    await click(btnByText('Skip to the result'));
    const shown = Number(Array.from(document.querySelectorAll('[data-cell-area="stats"] *')).find((n) => n.children.length === 0 && n.textContent.trim() === 'Peak').parentElement.textContent.replace(/\D/g, ''));
    const lastGen = genNow();
    let realPeak = 4; let g = P.emptyGrid(40, 40); cells.forEach(([r, c]) => { g[r][c] = 1; });
    for (let i = 0; i < lastGen; i++) { g = P.stepLife(g, true, '3', '23'); realPeak = Math.max(realPeak, P.countPop(g)); }
    expect(popNow()).toBeLessThan(realPeak);
    expect(shown).toBe(realPeak);
    // Stepping back one generation keeps the same record.
    await click(btnByText('Rewind'));
    expect(genNow()).toBe(lastGen - 1);
    const after = Number(Array.from(document.querySelectorAll('[data-cell-area="stats"] *')).find((n) => n.children.length === 0 && n.textContent.trim() === 'Peak').parentElement.textContent.replace(/\D/g, ''));
    expect(after).toBe(realPeak);
  });
});

describe('the result text', () => {
  it('has no "1 rows and 1 columns" plural trap', async () => {
    await mount();
    await click(btnByText('Clear'));
    await drawCells(P.patterns.glider.cells.map(([r, c]) => [r + 10, c + 10]));
    const res = await predict('flies');
    expect(res.textContent).not.toMatch(/\b1 rows|\b1 columns|\b1 generations/);
    expect(res.textContent).toMatch(/4/);
  });
  it('a glider coming out of the wrapped seam is measured the short way round', async () => {
    await mount();
    await click(btnByText('Clear'));
    // A south-east glider a few squares above the bottom edge, run into the seam first.
    await drawCells(P.patterns.glider.cells.map(([r, c]) => [r + 33, c + 10]));
    for (let i = 0; i < 16; i++) await click(btnByText('Step'));
    const before = document.querySelector('[data-life-description]').textContent;
    expect(before).toBeTruthy();
    const res = await predict('flies');
    const m = res.textContent.match(/(\d+) rows/) || res.textContent.match(/Rows moved: (\d+)/);
    expect(m).not.toBeNull();
    expect(Number(m[1])).toBeLessThan(10);
  });
});

describe('a finished result', () => {
  it('does not stay on screen as the verdict for a rule or edges it was not run under', async () => {
    await mount();
    await click(btnByText('Clear'));
    await drawCells(ELL);
    await predict('settles');
    expect(result()).not.toBeNull();
    await click(btnByText('HighLife'));
    expect(result()).toBeNull();
    expect(document.getElementById('cell-predict').getAttribute('data-life-predict')).toBe('open');
    expect(radio('settles').checked).toBe(true);
    await click(btnByText('Conway'));
    await predict('settles');
    expect(result()).not.toBeNull();
    await click(btnByText('Wrapping edges'));
    expect(result()).toBeNull();
  });
});

describe('Start here while a challenge is under way', () => {
  it('Life challenges keeps the design in progress instead of clearing it', async () => {
    await mount({ gradeBand: 'g68' });
    await click(document.querySelector('[data-path-step="challenges"]'));
    expect(document.querySelector('[data-challenge-strip]').getAttribute('data-challenge-strip')).toBe('still');
    await drawCells(ELL);
    expect(popNow()).toBe(3);
    await click(document.querySelector('[data-path-step="challenges"]'));
    expect(document.querySelector('[data-challenge-strip]').getAttribute('data-challenge-strip')).toBe('still');
    expect(popNow()).toBe(3);
    expect(document.activeElement).toBe(lifeGrid());
  });
});

// ── Addendum: lead's follow-ups, each failing on the first hunt fix (hunt\start2_*). ──
const peakShown = () => Number(Array.from(document.querySelectorAll('[data-cell-area="stats"] *')).find((n) => n.children.length === 0 && n.textContent.trim() === 'Peak').parentElement.textContent.replace(/\D/g, ''));
describe('Jump ahead keeps the record of what it jumped over', () => {
  const T_SHAPE = [[20, 18], [20, 19], [20, 20], [21, 19]];
  for (const [label, steps] of [['Jump +10', 10], ['Jump +100', 100]]) {
    it(label + ': Peak is the true peak of the jumped generations', async () => {
      await mount();
      await click(btnByText('Clear'));
      await drawCells(T_SHAPE);
      let g = P.emptyGrid(40, 40); T_SHAPE.forEach(([r, c]) => { g[r][c] = 1; });
      let realPeak = 4;
      for (let i = 0; i < steps; i++) { g = P.stepLife(g, true, '3', '23'); realPeak = Math.max(realPeak, P.countPop(g)); }
      await click(btnByText(label));
      expect(genNow()).toBe(steps);
      expect(popNow()).toBeLessThan(realPeak);
      expect(peakShown()).toBe(realPeak);
    });
  }
});

describe('a "flies" result on fixed edges', () => {
  const WALL = /will hit a wall when it gets there/;
  const TWO = P_TWO_GLIDERS();
  function P_TWO_GLIDERS() { const G = [[13, 19], [14, 20], [15, 20], [15, 19], [15, 18]]; return G.concat(G.map(([r, c]) => [r, c + 8])); }
  it('says the shape will hit a wall, whether the guess was right or wrong', async () => {
    await mount();
    await click(btnByText('Wrapping edges'));
    await click(btnByText('Clear'));
    await drawCells(TWO);
    const right = await predict('flies');
    expect(right.getAttribute('data-predict-result')).toBe('right');
    expect(right.textContent).toMatch(WALL);
    await again();
    await click(btnByText('Clear'));
    await drawCells(TWO.map(([r, c]) => [r + 3, c + 3]));
    const wrong = await predict('settles');
    expect(wrong.getAttribute('data-predict-result')).toBe('wrong');
    expect(wrong.textContent).toMatch(WALL);
  });
  it('says nothing about walls on wrapping edges, or for an outcome that does not fly', async () => {
    await mount();
    await click(btnByText('Clear'));
    await drawCells(TWO);
    expect((await predict('flies')).textContent).not.toMatch(WALL);
    await again();
    await click(btnByText('Wrapping edges'));
    await click(btnByText('Clear'));
    await drawCells(ELL);
    expect((await predict('settles')).textContent).not.toMatch(WALL);
  });
});

describe('a teacher lock on Missions', () => {
  const lifeMissionBtn = () => buttons().find((b) => /in the Life tab/.test(b.getAttribute('aria-label') || ''));
  it('a student is not offered Life missions they cannot reach, and the hidden grid is kept', async () => {
    const seed = { _cellularLab: { teacher: { lockTab: 'missions' } } };
    await mount({ gradeBand: 'g68' }, seed);
    expect(Array.from(document.querySelectorAll('[role="tab"]')).length).toBe(1);
    expect(lifeMissionBtn()).toBeUndefined();
    expect(document.getElementById('cell-panel').textContent).not.toContain('Life design missions');
    // The real-world missions are still there.
    expect(document.getElementById('cell-panel').textContent).toMatch(/Forest|Traffic|Epidemic/i);
    expect(errSpy.mock.calls.length).toBe(0);
  });
  it('a teacher, who sees every tab, still can start one, under any lock', async () => {
    for (const lockTab of ['missions', 'practice']) {
      await mount({ gradeBand: 'g68', isTeacherMode: true }, { _cellularLab: { teacher: { lockTab } } });
      await click(document.getElementById('cell-tab-missions'));
      await click(lifeMissionBtn());
      expect(document.querySelector('[data-challenge-strip]')).not.toBeNull();
      expect(document.activeElement).toBe(lifeGrid());
      await React.act(() => root.unmount()); root = null;
      document.body.innerHTML = '<div id="root"></div>';
    }
  });
  it('a student with no lock, or locked to Life, keeps them', async () => {
    await mount({ gradeBand: 'g68' });
    await click(document.getElementById('cell-tab-missions'));
    await click(lifeMissionBtn());
    expect(document.querySelector('[data-challenge-strip]')).not.toBeNull();
  });
});

describe('contrast theme: the host forces yellow text, so no status box may stay pale', () => {
  const black = (el) => expect(el.style.background.replace(/\s/g, '')).toMatch(/^(#000000|rgb\(0,0,0\))$/);
  it('the prediction result, right and wrong, and the challenge verdict', async () => {
    await mount({ theme: 'contrast', isContrast: true });
    await click(btnByText('Clear'));
    await drawCells(ELL);
    const right = await predict('settles');
    black(right);
    expect(right.style.border).toMatch(/2px solid/);
    await again();
    await click(btnByText('Clear'));
    await drawCells([[5, 5], [5, 6], [6, 5]].map(([r, c]) => [r, c]));
    black(await predict('flies'));
    await click(btnByText('Oscillator'));
    await drawCells([[13, 18], [13, 19], [13, 20]]);
    await click(btnByText('Step')); await click(btnByText('Step'));
    const verdict = document.querySelector('[data-challenge-strip] [role="status"]');
    expect(verdict.textContent).toMatch(/Success/);
    black(verdict);
  });
  it('light and dark keep their pale boxes, with their own dark text', async () => {
    await mount({ isDark: true, theme: 'dark' });
    await click(btnByText('Clear'));
    await drawCells(ELL);
    const res = await predict('settles');
    expect(res.style.background.replace(/\s/g, '')).toMatch(/^(#d1fae5|rgb\(209,250,229\))$/);
    expect(res.style.border).toBe('');
  });
  it('no other result box in the file paints the pale pair directly', () => {
    const src = require('node:fs').readFileSync(TOOL_FILE, 'utf8');
    expect(src.split("? '#d1fae5' : '#fef3c7', color:").length - 1).toBe(1); // statusTone itself
  });
});

describe('the grid\'s own colours: every live colour reads on the grid background (3:1)', () => {
  const rgbOf = (s) => {
    let m = s.match(/^#([0-9a-f]{6})$/i);
    if (m) return [0, 2, 4].map((i) => parseInt(m[1].substr(i, 2), 16));
    m = s.match(/^hsl\((-?\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)%,\s*(\d+(?:\.\d+)?)%\)$/);
    if (!m) throw new Error('colour? ' + s);
    const H = Number(m[1]), S = Number(m[2]) / 100, L = Number(m[3]) / 100, a = S * Math.min(L, 1 - L);
    const f = (n) => { const k = (n + H / 30) % 12; return Math.round(255 * (L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
    return [f(0), f(8), f(4)];
  };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  function worst() {
    const bg = rgbOf(document.querySelector('svg.cellularlab-svg rect').getAttribute('fill'));
    const fills = Array.from(document.querySelectorAll('svg.cellularlab-svg path[data-life-live-layer]')).map((p) => p.getAttribute('fill'));
    expect(fills.length).toBeGreaterThan(0);
    return fills.map((f) => ({ f, r: ratio(rgbOf(f), bg) })).sort((a, b) => a.r - b.r)[0];
  }
  // Live squares with every neighbour count, 0 to 8.
  const ALL_COUNTS = [[2, 2], [2, 6], [2, 7], [2, 11], [2, 12], [2, 13], [6, 3], [7, 2], [7, 3], [7, 4], [8, 3]];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) ALL_COUNTS.push([12 + r, 2 + c]);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (!(r === 0 && c === 0)) ALL_COUNTS.push([12 + r, 10 + c]);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (!(r === 0 && c === 0) && !(r === 2 && c === 2)) ALL_COUNTS.push([12 + r, 18 + c]);
  const THEMES = [['light', {}], ['dark', { isDark: true, theme: 'dark' }], ['contrast', { isContrast: true, theme: 'contrast' }]];
  for (const [name, over] of THEMES) {
    it(name + ': every cell colour swatch', async () => {
      await mount(over);
      await click(btnByText('Clear'));
      await drawCells(ALL_COUNTS);
      for (const sw of ['Green', 'Cyan', 'Amber', 'Pink', 'Grey']) {
        const b = document.querySelector('button[aria-label="Use ' + sw + ' cells"]');
        if (!b) continue; // the contrast theme keeps its own single colour
        await click(b);
        const w = worst();
        expect(w.r, sw + ' ' + w.f).toBeGreaterThanOrEqual(3);
      }
    });
    it(name + ': Neighbour X-ray, for every neighbour count from 0 to 8', async () => {
      await mount(over);
      await click(btnByText('Clear'));
      await drawCells(ALL_COUNTS);
      const g = P.emptyGrid(40, 40); ALL_COUNTS.forEach(([r, c]) => { g[r][c] = 1; });
      const seen = new Set(); ALL_COUNTS.forEach(([r, c]) => seen.add(P.neighborCount(g, r, c, true)));
      expect([...seen].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
      await click(btnByText('Neighbour X-ray'));
      const w = worst();
      expect(w.r, w.f).toBeGreaterThanOrEqual(3);
    });
    it(name + ': Age map, across every age to the oldest colour', async () => {
      await mount(over);
      await click(btnByText('Clear'));
      await drawCells([[10, 10], [10, 11], [11, 10], [11, 11]]);
      await click(btnByText('Age map'));
      let min = 99, at = '';
      for (let i = 0; i < 48; i++) { await click(btnByText('Step')); const w = worst(); if (w.r < min) { min = w.r; at = w.f; } }
      expect(min, at).toBeGreaterThanOrEqual(3);
    });
  }
});
