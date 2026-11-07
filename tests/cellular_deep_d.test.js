// Cellular Automaton Lab stage D (2026-11-04): independent bug hunt. Each test
// reproduces one defect found by running the tool, and fails on the stage C file.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
// CELLULAR_TOOL_FILE lets the suite run against the stage C copy to prove each gate can fail.
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
  if (window.StemLab) delete window.StemLab.audioContext;
  document.body.innerHTML = '<div id="root"></div>';
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount());
  root = null;
  vi.restoreAllMocks();
  delete window.matchMedia;
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
const btnByLabel = (txt) => buttons().find((b) => b.getAttribute('aria-label') === txt);
async function click(el) { if (!el) throw new Error('missing element'); await React.act(() => el.click()); }
async function tab(id) { await click(document.getElementById('cell-tab-' + id)); }
async function key(el, k, extra) { await React.act(() => { el.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true }, extra || {}))); }); }
const panelText = () => document.getElementById('cell-panel').textContent;
const radioByValue = (name, v) => document.querySelector('input[type="radio"][name="' + name + '"][value="' + v + '"]');
const errors = () => errSpy.mock.calls.map((c) => String(c[0]).slice(0, 200));

// Draws cells (absolute row/col) with the keyboard cursor, starting from the default cursor (13, 18).
async function drawCells(cells) {
  const grid = document.querySelector('[data-life-grid]');
  let cur = [13, 18];
  for (const [r, c] of cells) {
    while (cur[0] < r) { await key(grid, 'ArrowDown'); cur[0]++; }
    while (cur[0] > r) { await key(grid, 'ArrowUp'); cur[0]--; }
    while (cur[1] < c) { await key(grid, 'ArrowRight'); cur[1]++; }
    while (cur[1] > c) { await key(grid, 'ArrowLeft'); cur[1]--; }
    await key(grid, ' ');
  }
}
async function startChallenge(name) {
  await tab('missions');
  await click(btnByLabel('Start the ' + name + ' challenge in the Life tab'));
}

describe('Life design challenges', () => {
  it('a glider is a spaceship, not a methuselah: the Methuselah challenge must not pass it', async () => {
    const award = vi.fn();
    const app = await mount({ awardXP: award });
    await startChallenge('Methuselah');
    // A 5-cell glider in the middle of the 40 x 40 wrapping grid.
    await drawCells([[13, 19], [14, 20], [15, 20], [15, 19], [15, 18]]);
    const step = btnByText('Step');
    for (let i = 0; i < 52; i++) await click(step);
    expect(panelText()).not.toContain('still changing at generation 50: a methuselah');
    expect(panelText()).toContain('spaceship');
    expect((app.latest._cellularLab.challengesDone || {}).methuselah).not.toBe(true);
    expect(award).not.toHaveBeenCalled();
  });
  it('a real methuselah (the R-pentomino) still passes', async () => {
    const award = vi.fn();
    const app = await mount({ awardXP: award });
    await startChallenge('Methuselah');
    await drawCells([[13, 19], [13, 20], [14, 18], [14, 19], [15, 19]]);
    const step = btnByText('Step');
    for (let i = 0; i < 52; i++) await click(step);
    expect(panelText()).toContain('5 cells were still changing at generation 50: a methuselah.');
    expect(app.latest._cellularLab.challengesDone.methuselah).toBe(true);
    expect(award).toHaveBeenCalledTimes(1);
  });
});

describe('rule-family spaceship detector', () => {
  it('three identical still lifes in a row are not a spaceship', () => {
    const S = 48, life = P.famRule('3', '23', 2, 'moore');
    const cells = new Uint8Array(S * S);
    for (const k of [0, 5, 10]) for (const [r, c] of [[0, 0], [0, 1], [1, 0], [1, 1]]) cells[(20 + r) * S + 10 + k + c] = 1;
    const run = P.famMeasure(life, 1, { cells });
    expect(run.outcome).toBe('settles');
    expect(run.ship).toBeUndefined();
  });
  it('three blinkers in a row are not a spaceship either, but a real glider still is', () => {
    const S = 48, life = P.famRule('3', '23', 2, 'moore');
    const cells = new Uint8Array(S * S);
    for (const k of [0, 6, 12]) for (const c of [0, 1, 2]) cells[20 * S + 10 + k + c] = 1;
    expect(P.famMeasure(life, 1, { cells }).outcome).toBe('settles');
    const g = new Uint8Array(S * S);
    for (const [r, c] of [[0, 1], [1, 2], [2, 0], [2, 1], [2, 2]]) g[(20 + r) * S + 20 + c] = 1;
    const ship = P.famMeasure(life, 1, { cells: g });
    expect(ship.outcome).toBe('spaceship');
    expect([Math.abs(ship.ship.dr), Math.abs(ship.ship.dc), ship.ship.period]).toEqual([1, 1, 4]);
  });
});

describe('Practice: predict the next generation', () => {
  // Seed 4 on the 9-12 board uses rule B36/S23 and has two empty cells with 6 live neighbours.
  async function openB36Board() {
    const app = await mount({ gradeBand: 'g912' });
    await tab('practice');
    vi.spyOn(Math, 'random').mockReturnValue(3.5 / 999999);
    await click(btnByText('New board'));
    vi.restoreAllMocks(); errSpy = vi.spyOn(console, 'error');
    const pr = P.makeNextGenProblem(4, 'g912');
    expect(pr.birth).toBe('36');
    return { app, pr };
  }
  it('a missed 6-neighbour birth under B36 is not explained as “exactly 3”', async () => {
    const { pr } = await openB36Board();
    const cells = Array.from(document.querySelectorAll('[role="gridcell"][aria-colindex]')).filter((c) => c.closest('[aria-rowcount="6"]'));
    expect(cells.length).toBe(36);
    // Answer = the truth, except the two cells that are born with 6 neighbours.
    for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) {
      const born6 = !pr.board[r][c] && pr.counts[r][c] === 6;
      if (pr.next[r][c] && !born6) await click(cells[r * 6 + c]);
    }
    await click(btnByText('Check'));
    const text = panelText();
    expect(text).toContain('You missed 2 births.');
    expect(text).not.toContain('An empty cell with exactly 3 live neighbours comes alive.');
    expect(text).toContain('exactly 3 or 6 live neighbours');
  });
  it('the first hint writes the rule in B/S notation, not “B3 or 6/S2 or 3”', async () => {
    await openB36Board();
    await click(btnByText('Hint 1') || btnByText('Hint'));
    const text = panelText();
    expect(text).not.toMatch(/B3 or 6\/S2 or 3/);
    expect(text).toContain('Rule B36/S23:');
    expect(text).toContain('born with exactly 3 or 6 live neighbours');
  });
});

describe('K-5 glider mission', () => {
  it('the displayed gliders have no column of 3, so no text may tell students to find one', async () => {
    for (const hd of Object.keys(P.GLIDER_HEADINGS)) {
      const cols = [0, 1, 2].map((c) => P.GLIDER_HEADINGS[hd].filter((x) => x[1] === c).length);
      expect(Math.max(...cols), hd).toBeLessThan(3);
    }
    await mount({ gradeBand: 'k2' });
    await tab('missions');
    const mission = () => document.querySelector('[data-glider-mission]');
    expect(mission()).not.toBeNull();
    const wrongPick = (truth) => ['nw', 'ne', 'sw', 'se'].find((d) => d[0] === truth[0] && d[1] !== truth[1]);
    const truth = P.gliderMeasure(P.makeGliderRound(1).heading).heading;
    const names = { nw: 'Up and left', ne: 'Up and right', sw: 'Down and left', se: 'Down and right' };
    // Open both hints and make a left/right mistake twice, so every clue text is on screen.
    for (let i = 0; i < 2; i++) { const b = buttons().find((x) => /^Hint|Next hint|Another hint/.test(x.textContent.trim())); if (b) await click(b); }
    await click(btnByText(names[wrongPick(truth)]));
    await click(btnByText(names[wrongPick(truth)]));
    const all = mission().textContent + ' ' + Array.from(document.querySelectorAll('[aria-live]')).map((n) => n.textContent).join(' ');
    expect(all).not.toMatch(/column of 3/);
    // The clue that IS true of the picture: the row of 3 plus the cell touching one end make an L.
    expect(all).toMatch(/row of 3/);
  });
});

describe('Investigate: the glider evidence', () => {
  it('does not say the oldest cell lived for the whole 4-generation trip while claiming no cell made the trip', async () => {
    const ev = P.pceEvidence('glider', 0);
    expect(ev.oldest).toBe(4); // alive at generations 1-4: born one step after the start
    await mount({});
    await tab('investigate');
    await click(radioByValue('pce-glider', 'reborn'));
    const card = () => document.querySelector('[data-pce-card="glider"]');
    await click(Array.from(card().querySelectorAll('button')).find((b) => b.textContent === 'Lock in my prediction'));
    await click(Array.from(card().querySelectorAll('button')).find((b) => b.textContent === 'Run the check'));
    const text = card().textContent;
    expect(text).not.toContain('had been alive for 4 generations, so no cell made the whole trip');
    expect(text).toContain('born at generation 1');
  });
});

describe('keyboard grid after the grid shrinks', () => {
  it('the cursor stays on the grid when “Try it in the lab” loads a 40 × 40 soup after a 120 × 120 grid', async () => {
    await mount({});
    await click(btnByText('120 × 120'));
    const grid = () => document.querySelector('[data-life-grid]');
    await key(grid(), 'End', { ctrlKey: true });
    expect(document.getElementById('cell-life-active-cell').getAttribute('aria-colindex')).toBe('120');
    await tab('investigate');
    const card = () => document.querySelector('[data-pce-card="soup"]');
    await click(radioByValue('pce-soup', 'sparse'));
    await click(Array.from(card().querySelectorAll('button')).find((b) => b.textContent === 'Lock in my prediction'));
    await click(Array.from(card().querySelectorAll('button')).find((b) => b.textContent === 'Run the check'));
    await click(Array.from(card().querySelectorAll('button')).find((b) => b.textContent === 'Try it in the lab'));
    expect(grid().getAttribute('aria-rowcount')).toBe('40');
    const cell = document.getElementById('cell-life-active-cell');
    expect(Number(cell.getAttribute('aria-colindex'))).toBeLessThanOrEqual(40);
    expect(Number(cell.parentNode.getAttribute('aria-rowindex'))).toBeLessThanOrEqual(40);
    expect(cell.textContent).toMatch(/^Row (40|[1-3]?\d), column (40|[1-3]?\d):/);
  });
});

describe('audio on unmount', () => {
  it('“Play population history” notes scheduled on the host’s shared audio context stop when the tool closes', async () => {
    const notes = [];
    const ac = { state: 'running', currentTime: 0, destination: {},
      createOscillator() { const o = { stopped: [], frequency: { setValueAtTime() {} }, connect() {}, disconnect() { o.disconnected = true; }, start(t) { o.at = t; }, stop(t) { o.stopped.push(t); } }; notes.push(o); return o; },
      createGain() { const g = { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} }, connect() {}, disconnect() { g.disconnected = true; } }; notes[notes.length - 1].gainNode = g; return g; },
      close() { throw new Error('the tool must never close the host context'); } };
    window.StemLab.audioContext = () => ac;
    await mount({});
    const step = btnByText('Step');
    for (let i = 0; i < 6; i++) await click(step);
    await click(btnByText('Play population history'));
    expect(notes.length).toBeGreaterThanOrEqual(6);
    const future = notes.filter((n) => n.at > 0.2);
    expect(future.length).toBeGreaterThan(0);
    await React.act(() => root.unmount()); root = null;
    // Every note still waiting to play is silenced: stopped now or disconnected.
    future.forEach((n) => expect(n.disconnected === true || (n.gainNode && n.gainNode.disconnected === true) || n.stopped.some((t) => t <= 0.01)).toBe(true));
    expect(errors()).toEqual([]);
  });
});
