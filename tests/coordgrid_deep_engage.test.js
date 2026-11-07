// Coordinate Grid engagement build (2026-11-04):
// 1. The open task's card sits right above (or beside) the grid, with Check in it;
//    Start / Next / a task button scroll the task in and focus the grid, quietly.
// 2. A calmer first screen: a one-line path ("All steps" opens the list), no hero
//    stat tiles, the level bar below the grid; about 8 Tab stops before the grid.
// 3. After a Check on plot / name tasks, the walk is drawn: along x, then up or
//    down along y. A miss draws the student's own walk and names the slip; the
//    walk to the answer appears only once solved or shown. Never before a Check.
// 4. A "Quick game" chip opens the Treasure hunt with a map and focus on it;
//    digs pay exactly as before.
// Run against the start copy with COORDGRID_DEEP_FILE=<path> to see these fail.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.COORDGRID_DEEP_FILE || 'stem_lab/stem_tool_coordgrid.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root = null, latest = null, xp = [], sr = [], errors = [], scrolled = [];
beforeEach(() => {
  resetStemLab();
  loadTool(FILE, 'coordinate');
  latest = null; xp = []; sr = []; errors = []; scrolled = [];
  vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ').slice(0, 300)); });
  window.HTMLElement.prototype.scrollIntoView = function (opts) { scrolled.push([this.id || this.getAttribute('data-coordgrid-th') || this.tagName, opts]); };
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null;
  document.body.innerHTML = '';
  delete window.HTMLElement.prototype.scrollIntoView;
  delete window.matchMedia;
  vi.restoreAllMocks();
});

async function mount(cg, extra) {
  if (root) { await React.act(async () => root.unmount()); root = null; }
  document.body.innerHTML = '<div id="root"></div>';
  function App() {
    const [state, setState] = React.useState({ _coordGrid: cg });
    const [es, setEs] = React.useState({ correct: 0, total: 0 });
    latest = state._coordGrid;
    return window.StemLab._registry.coordinate.render(makeCtx(Object.assign({
      toolData: state, setToolData: setState, exploreScore: es, setExploreScore: setEs, gradeLevel: '7th Grade',
      awardXP: (id, amt, why) => xp.push([id, amt, why]), announceToSR: (m) => sr.push(m), addToast: () => {},
    }, extra || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => root.render(React.createElement(App)));
}
const click = async (el) => { expect(el, 'element to click').toBeTruthy(); await React.act(async () => { el.click(); }); };
const settle = async (ms) => { await React.act(async () => { await new Promise((r) => setTimeout(r, ms || 80)); }); };
async function type(el, value) {
  expect(el, 'input to type in').toBeTruthy();
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}
const byText = (re, scope) => [...(scope || document).querySelectorAll('button')].find((b) => re.test(b.textContent.trim()));
const grid = () => document.querySelector('#coordinate-section-panel [role="application"]');
const checkBtn = () => [...document.querySelectorAll('button[aria-label="Check"]')][0];
const walkSvg = () => document.querySelector('[data-coordgrid-walk-svg]');
const walkText = () => { const p = document.querySelector('[data-coordgrid-walk]'); return p ? p.textContent : null; };
const P = (x, y) => ({ x, y });
// Tab stops in DOM order (no positive tabindex here), skipping hidden and disabled.
function tabStops() {
  return [...document.querySelectorAll('button, input, select, textarea, a[href], summary, [tabindex]')]
    .filter((el) => el.tabIndex >= 0 && !el.disabled && !el.closest('[hidden]') && !el.closest('details:not([open]) > :not(summary)'));
}
async function plotAt(x, y) {
  const lab = (txt) => [...document.querySelectorAll('label')].find((l) => l.textContent.trim().startsWith(txt)).querySelector('input');
  await type(lab('X coordinate'), String(x));
  await type(lab('Y coordinate'), String(y));
  await click(byText(/^Plot or remove point$/));
}

describe('1. the challenge card sits with the grid; Start brings the grid in', () => {
  it('an open task renders its card (prompt + Check) right before the grid, in one layout row', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g6', gridChallenge: { type: 'plot', target: P(2, 3), tries: 0, hint: 0 } });
    const layout = document.getElementById('coordgrid-task-layout');
    expect(layout, 'task layout').toBeTruthy();
    const kids = [...layout.children];
    expect(kids.length).toBe(2);
    expect(kids[0].querySelector('[data-coordgrid-task="plot"]')).toBeTruthy();
    expect(kids[0].textContent).toContain('Plot the point (2, 3).');
    expect(kids[0].contains(checkBtn())).toBe(true);
    expect(kids[1].querySelector('[role="application"]')).toBe(grid());
    // Wraps: the card is above the grid on a phone, beside it when the row has room.
    expect(layout.style.flexWrap).toBe('wrap');
    expect(errors).toEqual([]);
  });

  it('the path Start opens the task, scrolls the task row in and focuses the grid without talking over the prompt', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g6' });
    const start = document.querySelector('button[aria-label="Start: Plot points in all four quadrants, with negative coordinates."]');
    await click(start);
    await settle();
    expect(latest.gridChallenge.type).toBe('plot');
    expect(document.activeElement).toBe(grid());
    expect(scrolled.map((s) => s[0])).toContain('coordgrid-task-layout');
    expect(scrolled.find((s) => s[0] === 'coordgrid-task-layout')[1].block).toBe('start');
    // The last thing said is the prompt, not the cursor position.
    expect(sr[sr.length - 1]).toMatch(/^Plot the point \(/);
    // A later, ordinary focus still reads the cursor.
    await React.act(async () => { grid().blur(); grid().focus(); });
    expect(sr[sr.length - 1]).toMatch(/^x 0, y 0/);
  });

  it('Next (which disappears on click) and the task buttons move focus to the grid too', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g6' });
    await click(byText(/^Name the Point$/));
    await settle();
    expect(latest.gridChallenge.type).toBe('name');
    expect(document.activeElement).toBe(grid());
    await mount({ cgTab: 'explore', cgLevel: 'g6', gridChallenge: { type: 'plot', target: P(2, 3), tries: 0, hint: 0 }, gridPoints: [P(2, 3)] });
    await click(checkBtn());
    const next = byText(/^Next: Plot a point$/);
    next.focus();
    await click(next);
    await settle();
    expect(document.activeElement).toBe(grid());
  });
});

describe('2. a calmer first screen', () => {
  it('no hero stat tiles; the path is one line with an All steps disclosure', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g6' });
    const head = document.querySelector('[data-coordinate-command]');
    expect(head.textContent).not.toMatch(/Mode|Solved/);
    const path = document.querySelector('[data-coordgrid-path]');
    const visible = [...path.querySelectorAll('[data-coordgrid-path-step]')].filter((li) => !li.hidden);
    expect(visible.map((li) => li.getAttribute('data-coordgrid-path-step'))).toEqual(['plot6']);
    const all = path.querySelector('[data-coordgrid-path-all]');
    expect(all.getAttribute('aria-expanded')).toBe('false');
    expect(all.getAttribute('aria-controls')).toBe('coordgrid-path-list');
  });

  it('about 8 Tab stops come before the grid (16 before); the level bar moved below it', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g6' });
    const stops = tabStops();
    const gi = stops.indexOf(grid());
    expect(gi).toBeGreaterThan(0);
    expect(gi, stops.slice(0, gi).map((e) => e.getAttribute('aria-label') || e.textContent.trim()).join(' | ')).toBeLessThanOrEqual(8);
    const level = byText(/^Grade 6: four quadrants$/);
    expect(grid().compareDocumentPosition(level) & window.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The panel itself is no longer an extra stop.
    expect(document.getElementById('coordinate-section-panel').hasAttribute('tabindex')).toBe(false);
  });
});

describe('3. the walk, only after a Check', () => {
  it('a swapped plot draws the student own walk and names the slip; the answer walk waits for Show the answer', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g6', gridChallenge: { type: 'plot', target: P(2, 3), tries: 0, hint: 0 } });
    await plotAt(3, 2);
    expect(walkSvg(), 'no walk before Check').toBe(null);
    expect(walkText()).toBe(null);
    await click(checkBtn());
    expect(walkSvg().getAttribute('data-coordgrid-walk-svg')).toBe('mine');
    expect(walkText()).toBe('Your walk: from the origin, 3 right, then 2 up. It ends at (3, 2). Likely slip: Swapped x and y.');
    const labels = [...walkSvg().querySelectorAll('text')].map((t) => t.textContent);
    expect(labels).toEqual(['3 right', '2 up']);
    expect(document.body.textContent).not.toContain('2 right, then 3 up');
    // The legs come from the grid model: origin (200, 200), x = 3 is 260, y = 2 is 160.
    const d = [...walkSvg().querySelectorAll('path')].map((p) => p.getAttribute('d'));
    expect(d).toEqual(['M200.0 200.0L260.0 200.0', 'M260.0 200.0L260.0 168.0']);
    // Changing the answer (removing the point) clears the walk.
    await plotAt(3, 2);
    expect(walkSvg()).toBe(null);
    // Second miss closes the item: still only the student's walk.
    await plotAt(4, 2);
    await click(checkBtn());
    expect(walkSvg().getAttribute('data-coordgrid-walk-svg')).toBe('mine');
    expect(document.body.textContent).not.toContain('2 right, then 3 up');
    await click(document.querySelector('[data-coordgrid-reveal]'));
    expect(walkSvg().getAttribute('data-coordgrid-walk-svg')).toBe('answer');
    expect(walkText()).toBe('The walk to (2, 3): from the origin, 2 right, then 3 up.');
    expect(xp).toEqual([]);
  });

  it('a right plot draws the walk to the answer (left then up), animated unless reduced motion is on', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g6', gridChallenge: { type: 'plot', target: P(-4, 1), tries: 0, hint: 0 } });
    await plotAt(-4, 1);
    await click(checkBtn());
    expect(walkSvg().getAttribute('data-coordgrid-walk-svg')).toBe('answer');
    const paths = [...walkSvg().querySelectorAll('path')];
    expect(paths.map((p) => p.getAttribute('d'))).toEqual(['M200.0 200.0L120.0 200.0', 'M120.0 200.0L120.0 188.0']);
    expect(paths.map((p) => p.getAttribute('class'))).toEqual(['allo-cg-walk-a', 'allo-cg-walk-b']);
    expect(xp.filter((x) => x[2] === 'plot point')).toEqual([['coordinate', 5, 'plot point']]);
    // Reduced motion: static arrows, no animation classes; the CSS pins the end state live.
    window.matchMedia = (q) => ({ matches: /reduce/.test(q), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    await mount({ cgTab: 'explore', cgLevel: 'g6', gridChallenge: { type: 'plot', target: P(-4, 1), tries: 0, hint: 0 }, gridPoints: [P(-4, 1)], gridFeedback: { correct: true, msg: 'ok', walk: P(-4, 1) } });
    expect([...walkSvg().querySelectorAll('path, polygon, text')].every((n) => !n.getAttribute('class'))).toBe(true);
    const css = [...document.querySelectorAll('style')].map((s) => s.textContent).join('\n');
    expect(css).toMatch(/prefers-reduced-motion: reduce\)[^}]*\.allo-cg-walk-a[^}]*animation: none !important; stroke-dashoffset: 0/);
  });

  it('name the point: the walk to the typed answer after Check; typing again clears it', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g6', gridChallenge: { type: 'name', target: P(3, -2), tries: 0, hint: 0 } });
    await type(document.querySelector('input[aria-label="Your x-coordinate"]'), '-2');
    await type(document.querySelector('input[aria-label="Your y-coordinate"]'), '3');
    expect(walkSvg()).toBe(null);
    await click(checkBtn());
    expect(walkSvg().getAttribute('data-coordgrid-walk-svg')).toBe('mine');
    expect(walkText()).toContain('Your walk: from the origin, 2 left, then 3 up. It ends at (−2, 3).');
    await type(document.querySelector('input[aria-label="Your x-coordinate"]'), '3');
    expect(walkSvg()).toBe(null);
  });
});

describe('4. Quick game chip', () => {
  it('opens the Treasure hunt with a fresh map and focus on it; the click pays nothing, a dig pays as before', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g6' });
    const chip = document.querySelector('[data-coordgrid-quick-treasure]');
    expect(chip.textContent).toBe('🗝️ Quick game: find the treasure in 3 digs');
    await click(chip);
    await settle();
    expect(latest.cgTab).toBe('treasure');
    expect(latest.thMission && latest.thMission.done).toBe(false);
    expect(xp).toEqual([]);
    expect(document.activeElement).toBe(document.querySelector('[data-coordgrid-app="th"]'));
    expect(sr[sr.length - 1]).toMatch(/^Find the buried treasure/);
    expect(document.querySelector('[data-coordgrid-quick-treasure]')).toBe(null);
    const T = latest.thMission.T;
    const lab = (txt) => [...document.querySelectorAll('[data-coordgrid-th] label')].find((l) => l.textContent.trim().startsWith(txt)).querySelector('input');
    await type(lab('X coordinate'), String(T.x));
    await type(lab('Y coordinate'), String(T.y));
    await click(byText(/^Dig here$/));
    expect(xp.filter((x) => x[2] === 'treasure')).toEqual([['coordinate', 5, 'treasure']]);
    expect(latest.treasuresFound).toBe(1);
    // Back on another tab, the chip returns to the open map instead of a new one.
    await mount(Object.assign({}, latest, { cgTab: 'explore', thMission: Object.assign({}, latest.thMission, { done: false, digs: [] }) }));
    const keep = latest.thMission;
    await click(document.querySelector('[data-coordgrid-quick-treasure]'));
    expect(latest.thMission).toEqual(keep);
    expect(errors).toEqual([]);
  });
});
