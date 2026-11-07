// Cellular Automaton Lab engagement build (2026-11-04): the transport bar beside
// the grid, challenges that land on the grid, the live rule card with "Step and
// explain", predict-then-run on Life, and a calmer Life tab.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
// CELLULAR_TOOL_FILE lets the suite run against the start copy to prove each gate can fail.
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
async function tab(id) { await click(document.getElementById('cell-tab-' + id)); }
const lifeGrid = () => document.querySelector('[role="grid"][data-life-grid]');
const statusText = () => Array.from(document.querySelectorAll('[role="status"]')).map((n) => n.textContent).join(' || ');
const liveText = () => Array.from(document.querySelectorAll('[aria-live]')).map((n) => n.textContent).join(' | ');
const errors = () => errSpy.mock.calls.map((c) => String(c[0]).slice(0, 200));
const genNow = () => Number((document.querySelector('[data-life-description]').textContent.match(/Generation (\d+)/) || [])[1]);
const radio = (v) => document.querySelector('input[type="radio"][name="cell-life-predict"][value="' + v + '"]');
// Draws cells (absolute row/col) with the keyboard cursor from the default cursor (13, 18).
async function drawCells(cells) {
  const g = lifeGrid(); g.focus();
  let cur = [13, 18];
  for (const [r, c] of cells) {
    while (cur[0] < r) { await key(g, 'ArrowDown'); cur[0]++; }
    while (cur[0] > r) { await key(g, 'ArrowUp'); cur[0]--; }
    while (cur[1] < c) { await key(g, 'ArrowRight'); cur[1]++; }
    while (cur[1] > c) { await key(g, 'ArrowLeft'); cur[1]--; }
    await key(g, ' ');
  }
}
const BLINKER = [[13, 18], [13, 19], [13, 20]];
const BLOCK = [[13, 18], [13, 19], [14, 19], [14, 18]];
const ELL = [[13, 18], [13, 19], [14, 18]]; // becomes a block: settles
const GLIDER = [[13, 19], [14, 20], [15, 20], [15, 19], [15, 18]];
// Hunt 11-04: gallery shapes redrawn by hand earn no XP, so the paying starts here are not in the gallery.
const TWO_BLINKERS = [[13, 18], [13, 19], [13, 20], [20, 24], [20, 25], [20, 26]];
const TWO_GLIDERS = GLIDER.concat(GLIDER.map(([r, c]) => [r, c + 8]));
// Tab stops a keyboard user meets: focusable, enabled, not inside a closed <details> (its summary counts), radio groups once.
function tabStops(rootEl) {
  const sel = 'button, input, select, textarea, a[href], summary, [tabindex]';
  const seenRadio = new Set();
  return Array.from(rootEl.querySelectorAll(sel)).filter((el) => {
    if (el.disabled || el.closest('fieldset[disabled]')) return false;
    if (el.getAttribute('tabindex') === '-1') return false;
    const d = el.closest('details');
    if (d && !d.open && !(el.tagName === 'SUMMARY' && el.parentElement === d)) return false;
    let p = d && d.parentElement ? d.parentElement.closest('details') : null;
    while (p) { if (!p.open) return false; p = p.parentElement ? p.parentElement.closest('details') : null; }
    if (el.type === 'radio') { if (seenRadio.has(el.name)) return false; seenRadio.add(el.name); }
    return true;
  }).length;
}

describe('1. transport bar beside the grid, no duplicate stats, draw-then-Run badge', () => {
  it('Run, Step, Rewind and Clear sit in a run-controls group in the grid row, as 44 px targets', async () => {
    await mount();
    const row = document.querySelector('[data-cell-life-row]');
    expect(row).not.toBeNull();
    expect(row.querySelector('[data-life-grid]')).not.toBeNull();
    const tr = row.querySelector('[data-cell-transport][role="group"]');
    expect(tr.getAttribute('aria-label')).toBe('Run controls');
    const names = Array.from(tr.querySelectorAll('button')).map((b) => b.textContent.trim());
    expect(names.slice(0, 4)).toEqual(['Run', 'Step', 'Rewind', 'Clear']);
    for (const b of Array.from(tr.querySelectorAll('button')).slice(0, 4)) expect(b.style.minHeight).toBe('44px');
    // Run works from there.
    await click(btnByText('Step'));
    expect(genNow()).toBe(1);
  });
  it('each count is shown once (the focus-panel copy is gone)', async () => {
    await mount();
    const tool = document.querySelector('[data-cellularlab-tool]');
    const exact = (txt) => Array.from(tool.querySelectorAll('div,span')).filter((n) => n.children.length === 0 && n.textContent.trim() === txt).length;
    expect(document.querySelector('[data-cellularlab-status-grid]')).toBeNull();
    expect(exact('Generation')).toBe(1);
    expect(exact('Population')).toBe(1);
    expect(exact('Cells')).toBe(0);
    expect(exact('Mode')).toBe(0);
  });
  it('at generation 0 the badge says to draw, then Run; after a step it shows the dynamics', async () => {
    await mount();
    const badge = () => document.querySelector('[data-life-badge]');
    expect(badge().getAttribute('data-life-badge')).toBe('draw');
    expect(badge().textContent).toContain('Click squares to draw, then press Run.');
    expect(badge().textContent).not.toMatch(/Run or step to begin/);
    await click(btnByText('Step'));
    expect(badge().getAttribute('data-life-badge')).not.toBe('draw');
  });
  it('a pointer stroke that starts on a live square erases it (Draw brush), so a click toggles', async () => {
    await mount();
    const svg = document.querySelector('svg.cellularlab-svg');
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 400, right: 400, bottom: 400 });
    // The default glider has a live square at row 2, column 3 (0-based) on the 40 x 40 grid: 10 px per square here.
    expect(P.stampPattern(P.emptyGrid(40, 40), 'glider', 2, 2)[2][3]).toBe(1);
    const pop = () => Number((document.querySelector('[data-life-description]').textContent.match(/(\d+) live cells/) || [])[1] || 0);
    expect(pop()).toBe(5);
    await React.act(() => { svg.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 35, clientY: 25 })); svg.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); });
    expect(pop()).toBe(4);
    await React.act(() => { svg.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 35, clientY: 25 })); svg.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); });
    expect(pop()).toBe(5);
  });
});

describe('2. challenges happen on the grid, with a challenge strip', () => {
  it('starting a challenge focuses the grid, scrolls the strip into view and walks draw -> Run -> verdict', async () => {
    await mount();
    await click(btnByText('Oscillator'));
    expect(document.activeElement).toBe(lifeGrid());
    const strip = document.querySelector('[data-challenge-strip="oscillator"]');
    expect(strip).not.toBeNull();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(Element.prototype.scrollIntoView.mock.instances[0].id).toBe('cell-challenge-strip');
    const current = () => document.querySelector('[data-challenge-strip] li[aria-current="step"]').textContent;
    expect(current()).toMatch(/Draw your start on the grid/);
    await drawCells(BLINKER);
    expect(current()).toMatch(/Press Run or Step/);
    await click(btnByText('Step')); await click(btnByText('Step'));
    expect(current()).toMatch(/Read the verdict/);
    expect(document.querySelector('[data-challenge-strip]').textContent).toMatch(/Success: Oscillator found/);
    expect(errors()).toEqual([]);
  });
  it('Start-here step 1 starts the first unsolved challenge on the grid (not a scroll to the list)', async () => {
    await mount({ gradeBand: 'g68' }, { _cellularLab: { challengesDone: { still: true } } });
    await click(document.querySelector('[data-path-step="challenges"]'));
    expect(document.querySelector('[data-challenge-strip]').getAttribute('data-challenge-strip')).toBe('oscillator');
    expect(document.activeElement).toBe(lifeGrid());
    expect(liveText()).toMatch(/Challenge started: Oscillator/);
  });
  it('K-5 step 1 ("draw") lands on the grid too; "Choose another challenge" moves focus to the list; Close removes the strip', async () => {
    await mount({ gradeBand: 'k2' });
    await click(document.querySelector('[data-path-step="draw"]'));
    expect(document.activeElement).toBe(lifeGrid());
    await click(btnByText('Oscillator'));
    await click(btnByText('Choose another challenge'));
    expect(document.activeElement.id).toBe('cell-challenges');
    await click(btnByText('Close the challenge'));
    expect(document.querySelector('[data-challenge-strip]')).toBeNull();
    expect(document.activeElement).toBe(lifeGrid());
  });
});

describe('3. live rule card and Step and explain', () => {
  it('the rule card is written from the parsed B/S rule and follows the rule editor', async () => {
    await mount({ gradeBand: 'g68' });
    const card = () => document.querySelector('[data-life-rule-card]');
    expect(card().getAttribute('data-life-rule-card')).toBe('B3/S23');
    expect(card().textContent).toContain('An empty square comes alive when exactly 3 of its 8 neighbours are alive.');
    expect(card().textContent).toContain('A live square stays alive with 2 or 3 live neighbours. With any other number it dies.');
    await click(btnByText('HighLife'));
    expect(card().textContent).toContain('when 3 or 6 of its 8 neighbours');
    await click(btnByText('Seeds'));
    expect(card().textContent).toContain('A live square always dies at the next step.');
    expect(P.lifeRuleWords('3678', '34678').birth).toContain('3, 6, 7 or 8 of its 8');
    expect(P.lifeRuleWords('', '012345678').birth).toBe('An empty square never comes alive.');
    expect(P.lifeRuleWords('3', '012345678').survive).toBe('A live square never dies.');
  });
  it('explainLifeStep agrees with the engine for every square, rule and edge type', () => {
    for (const [b, s] of [['3', '23'], ['36', '23'], ['2', ''], ['3678', '34678'], ['35678', '5678'], ['1', '1357']]) {
      for (const wrap of [true, false]) {
        for (const seed of [1, 7, 42]) {
          const g = P.soupGrid(17, 19, 0.35, seed), next = P.stepLifeDetailed(g, null, wrap, b, s), ex = P.explainLifeStep(g, wrap, b, s);
          expect(ex.born).toBe(next.born); expect(ex.stay).toBe(next.survived); expect(ex.died).toBe(next.died);
          expect(ex.few + ex.many + ex.gap + ex.none).toBe(ex.died);
          for (let r = 0; r < 17; r++) for (let c = 0; c < 19; c++) {
            const f = ex.fate[r * 19 + c];
            expect(f === 'born' || f === 'stays').toBe(next.grid[r][c] === 1);
            if (f === 'few') expect(P.neighborCount(g, r, c, wrap)).toBeLessThan(Math.min(...s.split('').map(Number)));
            if (f === 'many') expect(P.neighborCount(g, r, c, wrap)).toBeGreaterThan(Math.max(...s.split('').map(Number)));
          }
        }
      }
    }
  });
  it('Step and explain shows the next step on the grid with a text summary, then Do this step advances it', async () => {
    await mount({ gradeBand: 'g68' });
    const g0 = P.stampPattern(P.emptyGrid(40, 40), 'glider', 2, 2), n0 = P.stepLifeDetailed(g0, null, true, '3', '23');
    await click(btnByText('Step and explain'));
    expect(genNow()).toBe(0); // explaining does not step
    const sum = document.getElementById('cell-explain-summary').textContent;
    expect(sum).toContain(`Next step, generation 0 to 1. Born: ${n0.born}. Stay alive: ${n0.survived}. Die: ${n0.died}.`);
    expect(sum).toMatch(/Dying of loneliness, with fewer than 2 live neighbours/);
    expect(document.querySelector('[data-life-explain-layer="die"]')).not.toBeNull();
    expect(document.querySelector('[data-life-explain-layer="born"]')).not.toBeNull();
    expect(document.activeElement.id).toBe('cell-do-step');
    expect(liveText()).toContain('Next step, generation 0 to 1.');
    // The keyboard cell description names the fate too.
    const grid = lifeGrid(); grid.focus();
    await key(grid, 'Home', { ctrlKey: true });
    expect(document.getElementById(grid.getAttribute('aria-activedescendant')).textContent).toMatch(/Next step: it stays empty\./);
    await click(btnByText('Do this step'));
    expect(genNow()).toBe(1);
    expect(document.getElementById('cell-explain-summary').textContent).toContain('Next step, generation 1 to 2.');
    await click(btnByText('Stop explaining'));
    expect(document.getElementById('cell-explain-summary')).toBeNull();
    expect(document.activeElement.id).toBe('cell-step-explain');
  });
  it('the X-ray lens has a text summary from the same engine', async () => {
    await mount({ gradeBand: 'g68' });
    await click(btnByText('Neighbour X-ray'));
    expect(document.querySelector('[data-life-xray-summary]').textContent).toMatch(/X-ray summary for the next step\. Born: 2\. Stay alive: 3\. Die: 2\./);
  });
  it('never on Practice boards: the Practice tab has no Step and explain and no explanation', async () => {
    await mount({ gradeBand: 'g68' });
    await click(btnByText('Step and explain'));
    await tab('practice');
    expect(btnByText('Step and explain')).toBeUndefined();
    expect(btnByText('Do this step')).toBeUndefined();
    expect(document.querySelector('[data-life-explain], [data-life-explain-layer], [data-life-rule-card]')).toBeNull();
    expect(errors()).toEqual([]);
  });
});

describe('4. predict-then-run on Life', () => {
  it('nothing about the answer is in the DOM before the commit; a right guess on a new drawn start pays 1 XP once', async () => {
    const award = vi.fn();
    const out = await mount({ awardXP: award });
    await click(btnByText('Clear'));
    await drawCells(TWO_BLINKERS);
    expect(btnByText('Lock in my guess and run').disabled).toBe(true);
    await click(radio('repeats'));
    const card = document.getElementById('cell-predict');
    expect(card.getAttribute('data-life-predict')).toBe('open');
    expect(document.querySelector('[data-predict-result]')).toBeNull();
    expect(card.textContent).not.toMatch(/right|cycling|Not this time/);
    await click(btnByText('Lock in my guess and run'));
    expect(document.getElementById('cell-predict').getAttribute('data-life-predict')).toBe('locked');
    expect(radio('dies').disabled || radio('dies').closest('fieldset').disabled).toBe(true);
    const skip = btnByText('Skip to the result'); skip.focus(); // a real click focuses the button
    await click(skip);
    const res = document.querySelector('[data-predict-result]');
    expect(res.getAttribute('data-predict-result')).toBe('right');
    expect(res.textContent).toMatch(/Your guess was right\. It repeats: by generation 2 it was cycling every 2 generations\. You earned 1 XP/);
    expect(award).toHaveBeenCalledTimes(1);
    expect(award.mock.calls[0].slice(0, 2)).toEqual(['cellularLab_predict', 1]);
    const prKeys = Object.keys(out.latest._cellularLab.xp).filter((k) => k.startsWith('pr_'));
    expect(prKeys.length).toBe(1);
    expect(out.latest._cellularLab.lifePredict).toEqual({ made: 1, right: 1 });
    expect(document.activeElement.id).toBe('cell-predict-again');
    // The same start again (moved elsewhere) pays nothing.
    await click(btnByText('Clear'));
    await drawCells([[11, 14], [11, 15], [11, 16], [18, 20], [18, 21], [18, 22]]);
    await click(radio('repeats'));
    await click(btnByText('Lock in my guess and run'));
    await click(btnByText('Skip to the result'));
    expect(document.querySelector('[data-predict-result]').getAttribute('data-predict-result')).toBe('right');
    expect(document.querySelector('[data-predict-result]').textContent).toMatch(/No XP/);
    expect(award).toHaveBeenCalledTimes(1);
    expect(errors()).toEqual([]);
  });
  it('a wrong guess earns nothing and says what really happened', async () => {
    const award = vi.fn();
    await mount({ awardXP: award });
    await click(btnByText('Clear'));
    await drawCells(BLOCK);
    await click(radio('flies'));
    await click(btnByText('Lock in my guess and run'));
    await click(btnByText('Skip to the result'));
    const res = document.querySelector('[data-predict-result]');
    expect(res.getAttribute('data-predict-result')).toBe('wrong');
    expect(res.textContent).toMatch(/Not this time: you guessed “Flies away/);
    expect(res.textContent).toMatch(/It settled: by generation 1 it had stopped changing/);
    expect(award).not.toHaveBeenCalled();
  });
  it('classification is the badge’s own tracking: a glider flies, a soup that dies out dies', async () => {
    const award = vi.fn();
    await mount({ awardXP: award });
    await click(btnByText('Clear'));
    await drawCells(TWO_GLIDERS);
    await click(radio('flies'));
    await click(btnByText('Lock in my guess and run'));
    await click(btnByText('Skip to the result'));
    expect(document.querySelector('[data-predict-result]').textContent).toMatch(/It flies: the same shape came back somewhere else\. Generations it took: 4\. Rows moved: 1\. Columns moved: 1\./);
    expect(award).toHaveBeenCalledTimes(1);
    await click(btnByText('Predict again'));
    await click(btnByText('Clear'));
    await drawCells([[13, 18], [13, 19]]);
    await click(radio('dies'));
    await click(btnByText('Lock in my guess and run'));
    // two lonely squares die at generation 1, before any skip
    await React.act(async () => { await new Promise((r) => setTimeout(r, 400)); });
    expect(document.querySelector('[data-predict-result]').textContent).toMatch(/It died out: no live squares were left at generation 1/);
  });
  it('no XP for a gallery pattern, for a start already stepped or forecast, or past the cap', async () => {
    const award = vi.fn();
    await mount({ awardXP: award });
    // Default glider = a gallery pattern.
    await click(radio('flies'));
    await click(btnByText('Lock in my guess and run'));
    await click(btnByText('Skip to the result'));
    expect(document.querySelector('[data-predict-result]').textContent).toMatch(/No XP: gallery patterns are named in Patterns/);
    await click(btnByText('Predict again'));
    // Peek: step a new start forward, rewind, then predict.
    await click(btnByText('Clear'));
    await drawCells(ELL);
    await click(btnByText('Step'));
    await click(btnByText('Rewind'));
    expect(genNow()).toBe(0);
    await click(radio('settles'));
    await click(btnByText('Lock in my guess and run'));
    await click(btnByText('Skip to the result'));
    expect(document.querySelector('[data-predict-result]').getAttribute('data-predict-result')).toBe('right');
    expect(document.querySelector('[data-predict-result]').textContent).toMatch(/No XP: this start had already been run, forecast or explained/);
    expect(award).not.toHaveBeenCalled();
    await React.act(() => root.unmount()); root = null;
    // Cap: five prediction XP entries already in the ledger.
    const xp = { pr_a: true, pr_b: true, pr_c: true, pr_d: true, pr_e: true };
    await mount({ awardXP: award }, { _cellularLab: { xp } });
    await click(btnByText('Clear'));
    await drawCells(TWO_BLINKERS);
    await click(radio('repeats'));
    await click(btnByText('Lock in my guess and run'));
    await click(btnByText('Skip to the result'));
    expect(document.querySelector('[data-predict-result]').textContent).toMatch(/prediction XP is used up/);
    expect(award).not.toHaveBeenCalled();
  });
  it('editing the grid after the commit cancels the prediction; the card is hidden during an active challenge', async () => {
    await mount();
    await click(btnByText('Clear'));
    await drawCells(ELL);
    await click(radio('settles'));
    await click(btnByText('Lock in my guess and run'));
    await click(btnByText('Pause'));
    await drawCells([[20, 20]]);
    expect(document.getElementById('cell-predict').getAttribute('data-life-predict')).toBe('open');
    expect(radio('settles').checked).toBe(true);
    await click(btnByText('Extinction'));
    expect(document.getElementById('cell-predict')).toBeNull();
  });
});

describe('5. a calmer Life tab', () => {
  it('lenses, sound, rule editor, logging and start shapes are in closed disclosures; the tab has at most 26 tab stops', async () => {
    await mount({ gradeBand: 'g68' });
    const more = (id) => document.querySelector('[data-life-more="' + id + '"]');
    for (const id of ['shapes', 'world', 'see', 'rules', 'transport']) { expect(more(id).tagName).toBe('DETAILS'); expect(more(id).open).toBe(false); }
    expect(more('see').textContent).toContain('Neighbour X-ray');
    expect(more('see').textContent).toContain('Population sound');
    expect(more('rules').textContent).toContain('Birth (B)');
    expect(more('rules').textContent).toContain('Log this start');
    expect(more('shapes').textContent).toContain('Make soup');
    expect(more('transport').textContent).toContain('Jump +10');
    const stops = tabStops(document.querySelector('[data-cellularlab-tool]'));
    expect(stops).toBeLessThanOrEqual(26);
    // Opening a disclosure reveals its controls to the keyboard.
    more('see').open = true;
    expect(tabStops(document.querySelector('[data-cellularlab-tool]'))).toBeGreaterThan(stops);
  });
  it('the summaries are named, and a K-5 Life tab has no lens or rule editor disclosure', async () => {
    await mount({ gradeBand: 'k2' });
    expect(document.querySelector('[data-life-more="rules"]')).toBeNull();
    expect(document.querySelector('[data-life-more="see"] summary').textContent).toBe('Hear and describe');
    expect(document.querySelector('[data-life-more="see"]').textContent).not.toContain('Neighbour X-ray');
    expect(errors()).toEqual([]);
  });
});
