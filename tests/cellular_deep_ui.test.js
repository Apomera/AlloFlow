// Cellular Automaton Lab deep pass (2026-11-03): mounted UI behaviour.
// Mounts the real tool in jsdom through the shared STEM harness and drives it
// by keyboard and clicks; numbers are checked against the pure engine.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab, renderTool } from './helpers/stem_widgets_smoke_harness.js';
// CELLULAR_TOOL_FILE lets the suite run against the pre-pass backup to prove each gate can fail.
const TOOL_FILE = process.env.CELLULAR_TOOL_FILE || 'stem_lab/stem_tool_cellular.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
let errSpy;

beforeEach(() => {
  resetStemLab();
  errSpy = vi.spyOn(console, 'error');
  loadTool(TOOL_FILE, 'cellularLab');
  document.body.innerHTML = '<div id="root"></div>';
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount());
  root = null;
  vi.restoreAllMocks();
  vi.useRealTimers();
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
const lifeGrid = () => document.querySelector('[role="grid"][data-life-grid]');
async function key(el, k, extra) { await React.act(() => { el.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true }, extra || {}))); }); }
async function click(el) { if (!el) throw new Error('missing element'); await React.act(() => el.click()); }
async function tab(id) { await click(document.getElementById('cell-tab-' + id)); }
function liveText() { return Array.from(document.querySelectorAll('[aria-live]')).map((n) => n.textContent).join(' | '); }
function statusText() { return Array.from(document.querySelectorAll('[role="status"]')).map((n) => n.textContent).join(' || '); }
async function drawBlock() {
  const g = lifeGrid(); g.focus();
  await key(g, ' '); await key(g, 'ArrowRight'); await key(g, ' '); await key(g, 'ArrowDown'); await key(g, ' '); await key(g, 'ArrowLeft'); await key(g, ' ');
}
function setInput(el, value) {
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('Cellular Lab deep: mount and sections', () => {
  it('mounts every section in every band, light/dark/teacher, with no console errors', async () => {
    for (const over of [{ gradeBand: 'g35' }, { gradeBand: 'g68' }, { gradeBand: 'g912', isDark: true }, { gradeBand: 'g912', isTeacherMode: true }, { isContrast: true }]) {
      await mount(over);
      const ids = Array.from(document.querySelectorAll('[role="tab"]')).map((b) => b.id.replace('cell-tab-', ''));
      for (const id of ids) { await tab(id); expect(document.getElementById('cell-panel').textContent.length).toBeGreaterThan(20); }
      await React.act(() => root.unmount()); root = null;
    }
    expect(errSpy.mock.calls.map((c) => String(c[0]).slice(0, 200))).toEqual([]);
  });

  it('shows the Rules tab from grade 6 up but not for K-5, and the Teacher tab only in teacher mode', async () => {
    await mount({ gradeBand: 'k2' });
    expect(document.getElementById('cell-tab-rules')).toBeNull();
    expect(document.getElementById('cell-tab-teacher')).toBeNull();
    await React.act(() => root.unmount()); root = null;
    await mount({ gradeBand: 'g912', isTeacherMode: true });
    expect(document.getElementById('cell-tab-rules')).not.toBeNull();
    expect(document.getElementById('cell-tab-teacher')).not.toBeNull();
  });

  it('routes every visible label through ctx.t with stem.cellular keys', async () => {
    const seen = new Set();
    const tr = (k, fb) => { seen.add(k); return fb; };
    await mount({ t: tr, gradeBand: 'g912', isTeacherMode: true });
    for (const id of ['rules', 'patterns', 'practice', 'investigate', 'missions', 'learn', 'teacher']) await tab(id);
    const keys = Array.from(seen);
    expect(keys.length).toBeGreaterThan(250);
    expect(keys.every((k) => k.startsWith('stem.cellular.'))).toBe(true);
  });

  it('a translation reaches the page', async () => {
    await mount({ t: (k, fb) => (k === 'stem.cellular.title' ? 'Laboratoire des automates' : fb) });
    expect(document.querySelector('h1').textContent).toBe('Laboratoire des automates');
  });

  it('dark mode paints a dark surface (isDark is honoured)', async () => {
    await mount({ isDark: true });
    const bg = document.querySelector('[data-cellularlab-tool]').style.background;
    expect(bg).toMatch(/rgb\(11, 18, 32\)|#0b1220/);
  });
});

describe('Cellular Lab deep: keyboard grid', () => {
  it('is one tab stop with a roving active cell that names the cell and its neighbours', async () => {
    await mount();
    const g = lifeGrid();
    expect(g.getAttribute('tabindex')).toBe('0');
    expect(g.querySelectorAll('[tabindex]').length).toBe(0);
    const activeId = g.getAttribute('aria-activedescendant');
    expect(document.getElementById(activeId).getAttribute('role')).toBe('gridcell');
    g.focus();
    await key(g, 'Home', { ctrlKey: true });
    expect(document.getElementById(activeId).textContent).toMatch(/Row 1, column 1/);
    await key(g, ' ');
    expect(liveText()).toMatch(/Row 1, column 1 is now alive/);
    await key(g, 'ArrowRight');
    expect(document.getElementById(activeId).textContent).toMatch(/Row 1, column 2: empty, 1 live neighbour\b/);
    await key(g, 'End');
    expect(document.getElementById(activeId).textContent).toMatch(/column 40/);
    await key(g, 'PageDown');
    expect(document.getElementById(activeId).textContent).toMatch(/Row 6/);
  });

  it('the old picture is hidden from assistive tech (no role=img grid with key handlers)', async () => {
    await mount();
    const svg = document.querySelector('svg.cellularlab-svg');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('role')).toBeNull();
    expect(svg.getAttribute('tabindex')).toBeNull();
  });
});

describe('Cellular Lab deep: challenges', () => {
  it('Oscillator: a 2x2 block (a still life) fails and earns nothing; a blinker passes', async () => {
    const award = vi.fn();
    await mount({ awardXP: award });
    await click(btnByText('Oscillator'));
    await drawBlock();
    await click(btnByText('Step'));
    expect(statusText()).toMatch(/Try again: That pattern never changed/);
    expect(award).not.toHaveBeenCalled();
    await click(btnByText('Oscillator'));
    const g = lifeGrid(); g.focus();
    await key(g, ' '); await key(g, 'ArrowRight'); await key(g, ' '); await key(g, 'ArrowRight'); await key(g, ' ');
    await click(btnByText('Step')); await click(btnByText('Step'));
    expect(statusText()).toMatch(/Success: Oscillator found: it changed, then came back after 2 generations/);
    expect(award).toHaveBeenCalledTimes(1);
    expect(award.mock.calls[0][0]).toBe('cellularLab');
    expect(award.mock.calls[0][1]).toBe(10);
  });

  it('Methuselah: a still life fails (it settled), the R-pentomino passes', async () => {
    const award = vi.fn();
    await mount({ awardXP: award });
    await click(btnByText('Methuselah'));
    await drawBlock();
    await click(btnByText('Step'));
    expect(statusText()).toMatch(/Try again: It settled at generation 0 into a pattern that repeats every 1 generation\b/);
    await click(btnByText('Methuselah'));
    // R-pentomino: .XX / XX. / .X.
    const g = lifeGrid(); g.focus();
    await key(g, 'ArrowRight'); await key(g, ' '); await key(g, 'ArrowRight'); await key(g, ' ');
    await key(g, 'ArrowDown'); await key(g, 'ArrowLeft'); await key(g, ' '); await key(g, 'ArrowLeft'); await key(g, ' ');
    await key(g, 'ArrowDown'); await key(g, 'ArrowRight'); await key(g, ' ');
    for (let i = 0; i < 50; i++) await click(btnByText('Step'));
    expect(statusText()).toMatch(/Success: 5 cells were still changing at generation 50/);
    expect(award).toHaveBeenCalledTimes(1);
  });

  it('Extinction: one lonely cell is refused; it needs at least 4 cells', async () => {
    await mount();
    await click(btnByText('Extinction'));
    const g = lifeGrid(); g.focus(); await key(g, ' ');
    await click(btnByText('Step'));
    expect(statusText()).toMatch(/Try again: Start with at least 4 live cells/);
  });

  it('XP for a challenge is paid once, however often it is solved', async () => {
    const award = vi.fn();
    const out = await mount({ awardXP: award });
    for (let rep = 0; rep < 4; rep++) { await click(btnByText('Still Life')); await drawBlock(); await click(btnByText('Step')); }
    expect(statusText()).toMatch(/Success: Still life confirmed/);
    expect(award).toHaveBeenCalledTimes(1);
    expect(out.latest._cellularLab.xp.challenge_still).toBe(true);
    expect(out.latest._cellularLab.challengesDone.still).toBe(true);
  });
});

describe('Cellular Lab deep: seeded soup, rule field, reduced motion', () => {
  it('Re-roll makes a different soup; the same seed remakes the same soup; density slider changes it', async () => {
    await mount();
    const sig = () => document.querySelector('[data-life-description]').textContent;
    await click(btnByText('Make soup')); const a = sig();
    await click(btnByText('Clear'));
    await click(btnByText('Make soup')); const a2 = sig();
    expect(a2).toBe(a);
    await click(btnByText('Re-roll')); const b = sig();
    expect(b).not.toBe(a);
    const slider = Array.from(document.querySelectorAll('input[type="range"]')).find((i) => i.min === '5' && i.max === '80');
    await React.act(() => setInput(slider, '70'));
    await click(btnByText('Make soup'));
    const pop = Number((document.querySelector('[data-life-description]').textContent.match(/(\d+) live cells/) || [])[1]);
    expect(pop / 1600).toBeGreaterThan(0.6);
  });

  it('rule field: clearing it keeps the draft (no snap to 30); typing 9 gives Rule 9', async () => {
    await mount({ gradeBand: 'g68' });
    await tab('rules');
    const inp = document.getElementById('cell-rule-number');
    await React.act(() => setInput(inp, '110'));
    expect(inp.value).toBe('110');
    await React.act(() => setInput(inp, ''));
    expect(inp.value).toBe('');
    expect(document.getElementById('cell-rule-error')).not.toBeNull();
    await React.act(() => setInput(inp, '9'));
    expect(inp.value).toBe('9');
    expect(document.body.textContent).toContain('00001001');
    await React.act(() => setInput(inp, '300'));
    expect(document.getElementById('cell-rule-error')).not.toBeNull();
    expect(document.body.textContent).toContain('00001001');
  });

  it('reduced motion: Run advances one generation per second, and stops on unmount', async () => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn().mockImplementation((q) => ({ matches: /reduce/.test(q), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
    await mount();
    await click(btnByText('Run'));
    await React.act(async () => { vi.advanceTimersByTime(3050); });
    const gen = Number(document.querySelector('[data-life-description]').textContent.match(/Generation (\d+)/)[1]);
    expect(gen).toBe(3);
    await React.act(() => root.unmount()); root = null;
    expect(vi.getTimerCount()).toBe(0);
    delete window.matchMedia;
  });

  it('without reduced motion Run is fast (control for the test above)', async () => {
    vi.useFakeTimers();
    await mount();
    await click(btnByText('Run'));
    await React.act(async () => { vi.advanceTimersByTime(3050); });
    const gen = Number(document.querySelector('[data-life-description]').textContent.match(/Generation (\d+)/)[1]);
    expect(gen).toBeGreaterThan(10);
  });
});

describe('Cellular Lab deep: trials, run log, CSV', () => {
  it('Log with both edge types logs two rows that differ only in edges, and they reach the Investigate log', async () => {
    const out = await mount({ gradeBand: 'g68' });
    await click(btnByText('Make soup'));
    await click(btnByText('Log with both edge types'));
    const log = out.latest._cellularLab.runLog;
    expect(log.length).toBe(2);
    expect(log[0].wrap).toBe(true); expect(log[1].wrap).toBe(false);
    expect(log[0].seed).toBe(log[1].seed);
    await tab('investigate');
    expect(document.body.textContent).toMatch(/Run log \(2 trials\)/);
    await click(btnByText('Show CSV'));
    const csv = document.getElementById('cell-csv-text').value;
    const lines = csv.split(/\r?\n/);
    expect(lines[0]).toBe('id,kind,start,pattern,density,seed,size,edges,rule,start_cells,lifetime,end_state,period,end_cells,peak_cells,cap');
    expect(lines.length).toBe(3);
    expect(lines[1]).toMatch(/,wrap,B3\/S23,/);
    expect(lines[2]).toMatch(/,fixed,B3\/S23,/);
  });
});

describe('Cellular Lab deep: generated practice', () => {
  const answerCells = () => Array.from(document.querySelectorAll('[role="grid"] [role="gridcell"][aria-colindex]')).filter((c) => /next/.test(c.getAttribute('aria-label') || ''));
  async function setAnswer(target) {
    const n = target.length;
    const cells = answerCells();
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const cell = cells[r * n + c];
      const alive = cell.getAttribute('aria-selected') === 'true';
      if (alive !== !!target[r][c]) await click(cell);
    }
  }
  it('names the misconception, allows a second try, then reveals with no XP', async () => {
    const award = vi.fn();
    const P = window.__alloCellularPure;
    await mount({ awardXP: award, gradeBand: 'g68' });
    await tab('practice');
    const prob = P.makeNextGenProblem(1, 'g68');
    expect(answerCells().length).toBe(25);
    await setAnswer(prob.board); // "nothing changes" is wrong
    await click(btnByText('Check'));
    expect(statusText()).toMatch(/cells are not right yet/);
    expect(btnByText('Show the answer (no XP)')).toBeUndefined();
    await click(btnByText('Check'));
    await click(btnByText('Show the answer (no XP)'));
    expect(answerCells().map((c) => c.getAttribute('aria-selected') === 'true' ? 1 : 0).join('')).toBe(prob.next.flat().join(''));
    expect(award).not.toHaveBeenCalled();
  });
  it('a right answer earns practice XP once; a new board follows', async () => {
    const award = vi.fn();
    const P = window.__alloCellularPure;
    const out = await mount({ awardXP: award, gradeBand: 'g68' });
    await tab('practice');
    await setAnswer(P.makeNextGenProblem(1, 'g68').next);
    await click(btnByText('Check'));
    expect(statusText()).toMatch(/Correct on the first try/);
    expect(award).toHaveBeenCalledTimes(1);
    expect(award.mock.calls[0].slice(0, 2)).toEqual(['cellularLab_practice', 2]);
    expect(out.latest._cellularLab.practice.solved).toBe(1);
  });
  it('the answer grid is keyboard-operable with one tab stop', async () => {
    await mount({ gradeBand: 'g68' });
    await tab('practice');
    const cells = answerCells();
    expect(cells.filter((c) => c.getAttribute('tabindex') === '0').length).toBe(1);
    cells[0].focus();
    await key(cells[0], 'ArrowRight');
    await key(document.activeElement, ' ');
    expect(answerCells()[1].getAttribute('aria-selected')).toBe('true');
    expect(liveText()).toMatch(/Row 1, column 2: alive next/);
  });
  it('a teacher can switch reveals off', async () => {
    await mount({ gradeBand: 'g68' }, { _cellularLab: { teacher: { noReveal: true } } });
    await tab('practice');
    await click(btnByText('Check')); await click(btnByText('Check'));
    expect(btnByText('Show the answer (no XP)')).toBeUndefined();
  });
  it('9-12 also gets Wolfram-class practice with named-misconception feedback', async () => {
    await mount({ gradeBand: 'g912' });
    await tab('practice');
    await click(btnByText('Name the Wolfram class'));
    const P = window.__alloCellularPure;
    const prob = P.makeClassProblem(1);
    const wrong = prob.cls === 2 ? 3 : 2;
    await click(buttons().find((b) => b.textContent.startsWith('Class ' + wrong + ':')));
    expect(statusText()).toMatch(/Try again/);
    expect(document.querySelector('table caption').textContent).toMatch(/Every 10 generations/);
  });
});

describe('Cellular Lab deep: predict-check-explain and missions', () => {
  it('a card locks the prediction, runs the model, names the misconception and pays XP once for the explanation', async () => {
    const award = vi.fn();
    await mount({ awardXP: award, gradeBand: 'g68' });
    await tab('investigate');
    const card = document.querySelector('[data-pce-card="bigger"]');
    const big = Array.from(card.querySelectorAll('input[type="radio"]')).find((r) => r.value === 'big');
    await click(big);
    await click(Array.from(card.querySelectorAll('button')).find((b) => b.textContent === 'Lock in my prediction'));
    await click(Array.from(document.querySelector('[data-pce-card="bigger"]').querySelectorAll('button')).find((b) => b.textContent === 'Run the check'));
    const text = document.querySelector('[data-pce-card="bigger"]').textContent;
    expect(text).toMatch(/kept changing until generation 1103/);
    expect(text).toMatch(/Misconception: “a bigger start lives longer.”/);
    const ta = document.getElementById('pce-explain-bigger');
    await React.act(() => setInput(ta, 'Crowded cells with four or more neighbours die, so the big square collapses.'));
    const save = () => Array.from(document.querySelector('[data-pce-card="bigger"]').querySelectorAll('button')).find((b) => /explanation/.test(b.textContent));
    await click(save()); await click(save());
    expect(award).toHaveBeenCalledTimes(1);
    expect(award.mock.calls[0].slice(0, 2)).toEqual(['cellularLab_pce', 3]);
  });

  it('traffic mission: goals come from the student’s own runs; the misconception answer gets feedback; the right one completes it once', async () => {
    const award = vi.fn();
    const out = await mount({ awardXP: award, gradeBand: 'g68' });
    await tab('missions');
    await click(btnByText('Traffic jam'));
    const slider = () => Array.from(document.querySelectorAll('input[type="range"]')).find((i) => i.min === '5' && i.max === '95');
    for (const v of ['20', '50', '60', '80']) { await React.act(() => setInput(slider(), v)); await click(btnByText('Run 5 trials')); }
    expect(out.latest._cellularLab.missions.traffic.trials.length).toBe(20);
    const radio = (id) => Array.from(document.querySelectorAll('input[type="radio"][name="mq-radio-traffic"]'))[id];
    await click(radio(1)); // "more cars get through"
    await click(btnByText('Submit'));
    expect(statusText()).toMatch(/more cars means more traffic moved/);
    expect(award).not.toHaveBeenCalled();
    await click(radio(0));
    await click(btnByText('Submit'));
    expect(statusText()).toMatch(/most cars moved at 50% full/);
    expect(award).toHaveBeenCalledTimes(1);
    expect(out.latest._cellularLab.missions.traffic.done).toBe(true);
  });

  it('density investigation completes only with three densities, a number and a science idea', async () => {
    const award = vi.fn();
    const out = await mount({ awardXP: award, gradeBand: 'g68' });
    const slider = () => Array.from(document.querySelectorAll('input[type="range"]')).find((i) => i.min === '5' && i.max === '80');
    for (const v of ['10', '30', '60']) { await React.act(() => setInput(slider(), v)); await click(btnByText('Log 5 soups')); }
    await tab('investigate');
    const boxes = () => Array.from(document.querySelectorAll('input[type="checkbox"][aria-label^="Use trial"]'));
    await click(boxes()[0]); await click(boxes()[5]);
    await React.act(() => setInput(document.getElementById('cer-density-claim'), 'Medium density soups keep changing longest.'));
    await React.act(() => setInput(document.getElementById('cer-density-evidence'), 'At 30% the soups settled near generation 400.'));
    await React.act(() => setInput(document.getElementById('cer-density-reasoning'), 'Crowded cells die from too many neighbours and lonely cells die too.'));
    const done = () => btnByText('Complete investigation');
    expect(done().disabled).toBe(true); // only two densities picked
    await click(boxes()[10]);
    expect(done().disabled).toBe(false);
    await click(done());
    expect(out.latest._cellularLab.cer.density.done).toBe(true);
    expect(award).toHaveBeenCalledWith('cellularLab_cer', 15, expect.any(String));
  });

  it('a teacher section lock leaves students on that section only', async () => {
    await mount({ gradeBand: 'g68' }, { _cellularLab: { teacher: { lockTab: 'missions' } } });
    const ids = Array.from(document.querySelectorAll('[role="tab"]')).map((b) => b.id);
    expect(ids).toEqual(['cell-tab-missions']);
  });

  it('the teacher panel summarises missed items', async () => {
    await mount({ gradeBand: 'g68', isTeacherMode: true }, { _cellularLab: { practice: { attempts: 3, solved: 1, missed: { overcrowd: 2 } } } });
    await tab('teacher');
    expect(document.getElementById('cell-panel').textContent).toMatch(/Kept an overcrowded cell alive: 2 times/);
  });
});

describe('Cellular Lab deep: grade bands', () => {
  it('K-5: simpler Life tab, 4 x 4 practice boards with counts, the forest mission only', async () => {
    await mount({ gradeBand: 'k2' });
    expect(document.body.textContent).toMatch(/Notice and wonder/);
    expect(btnByText('Log this start')).toBeUndefined();
    await tab('practice');
    const cells = Array.from(document.querySelectorAll('[role="gridcell"][aria-colindex]')).filter((c) => /next/.test(c.getAttribute('aria-label') || ''));
    expect(cells.length).toBe(16);
    await tab('missions');
    expect(btnByText('Traffic jam')).toBeUndefined();
    expect(document.body.textContent).toMatch(/Forest fire/);
  });
  it('a learner can change level unless the teacher locked it', async () => {
    const out = await mount({ gradeBand: 'g68' });
    await click(btnByText('Grades 9–12'));
    expect(out.latest._cellularLab.band).toBe('g912');
    await React.act(() => root.unmount()); root = null;
    await mount({ gradeBand: 'g68' }, { _cellularLab: { teacher: { lockBand: 'k5' } } });
    expect(document.querySelector('[data-cellularlab-tool]').getAttribute('data-band')).toBe('k5');
    expect(btnByText('Grades 9–12').disabled).toBe(true);
  });
});

describe('Cellular Lab deep: saved-state compatibility', () => {
  it('old quest-only saves and hostile shapes still load in every section', async () => {
    const hostile = { _cellularLab: { drew: true, ranLong: true, maxGen: 77, band: 'zz', teacher: 'x', runLog: 'nope', pce: { bigger: 'junk', soup: { pick: 'sparse', checked: true, evidence: 7 } }, cer: [], missions: { traffic: { trials: [null, { p: 'a' }, { p: 0.5, flow: 0.5 }] } }, practice: { missed: 'bad', solved: -3 }, challengesDone: 'str', xp: 5 } };
    await mount({ gradeBand: 'g912', isTeacherMode: true }, hostile);
    for (const id of ['life', 'rules', 'patterns', 'practice', 'investigate', 'missions', 'learn', 'teacher']) await tab(id);
    await tab('practice');
    await click(btnByText('Check'));
    expect(errSpy.mock.calls.map((c) => String(c[0]).slice(0, 200))).toEqual([]);
  });
});

describe('Cellular Lab deep: performance', () => {
  it('a 120 x 120 soup renders live cells as a handful of paths, not thousands of rects', async () => {
    await mount();
    await click(btnByText('120 × 120'));
    await click(btnByText('Make soup'));
    const svg = document.querySelector('svg.cellularlab-svg');
    expect(svg.querySelectorAll('rect').length).toBeLessThan(10);
    expect(svg.querySelectorAll('path[data-life-live-layer]').length).toBeLessThan(12);
    const t0 = performance.now();
    for (let i = 0; i < 5; i++) await click(btnByText('Step'));
    const perStep = (performance.now() - t0) / 5;
    expect(perStep).toBeLessThan(400);
  });
});

describe('Cellular Lab deep: SSR', () => {
  it('renders deterministically for the golden harness', () => {
    const a = renderTool('cellularLab', {});
    const b = renderTool('cellularLab', {});
    expect(a).toBe(b);
  });
});
