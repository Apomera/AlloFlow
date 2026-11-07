// Cellular Automaton Lab stage B (2026-11-03): mounted UI for More worlds
// (rule families, Langton's ant, rule hunt), the K-5 glider mission, the
// forest-model argument, and the stage-A limitation fixes (seed grid rows,
// translated atlas labels, a PNG fallback that works without downloads).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
// CELLULAR_TOOL_FILE lets the suite run against the pre-stage-B backup to prove each gate can fail.
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
async function key(el, k, extra) { await React.act(() => { el.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true }, extra || {}))); }); }
async function click(el) { if (!el) throw new Error('missing element'); await React.act(() => el.click()); }
async function tab(id) { await click(document.getElementById('cell-tab-' + id)); }
async function wait(ms) { await React.act(async () => { await new Promise((r) => setTimeout(r, ms)); }); }
const panelText = () => document.getElementById('cell-panel').textContent;
const liveText = () => Array.from(document.querySelectorAll('[aria-live]')).map((n) => n.textContent).join(' | ');
const statusText = () => Array.from(document.querySelectorAll('[role="status"]')).map((n) => n.textContent).join(' || ');
const radioByValue = (name, v) => document.querySelector('input[type="radio"][name="' + name + '"][value="' + v + '"]');
function setInput(el, value) {
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}
function reducedMotion() { window.matchMedia = (q) => ({ matches: /reduce/.test(q), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }); }
const errors = () => errSpy.mock.calls.map((c) => String(c[0]).slice(0, 200));

describe('More worlds: mounting', () => {
  it('the More worlds section mounts in every band and theme with no console errors; Rule hunt is 9-12 (or teacher) only', async () => {
    for (const [over, hunt] of [[{ gradeBand: 'k2' }, false], [{ gradeBand: 'g68', isDark: true }, false], [{ gradeBand: 'g912' }, true], [{ gradeBand: 'g68', isTeacherMode: true }, true], [{ isContrast: true }, false]]) {
      await mount(over);
      await tab('worlds');
      expect(panelText()).toMatch(/Brian’s Brain/);
      expect(!!btnByText('Rule hunt')).toBe(hunt);
      await click(btnByText('Langton’s ant'));
      expect(panelText()).toMatch(/On a white square it turns right/);
      if (hunt) { await click(btnByText('Rule hunt')); expect(panelText()).toMatch(/131,072/); }
      await React.act(() => root.unmount()); root = null;
    }
    expect(errors()).toEqual([]);
  });
  it('every new label goes through ctx.t with a stem.cellular key', async () => {
    const seen = new Set();
    await mount({ t: (k, fb) => { seen.add(k); return fb; }, gradeBand: 'g912', isTeacherMode: true });
    await tab('worlds'); await click(btnByText('Langton’s ant')); await click(btnByText('Rule hunt'));
    for (const k of ['stem.cellular.tab_worlds', 'stem.cellular.wv_ant', 'stem.cellular.hunt_intro', 'stem.cellular.ant_intro']) expect(seen.has(k), k).toBe(true);
    expect(Array.from(seen).every((k) => k.startsWith('stem.cellular.'))).toBe(true);
  });
});

describe('Rule families', () => {
  it('presets set the rule; von Neumann switches off the numbers 5 to 8', async () => {
    await mount({ gradeBand: 'g68' });
    await tab('worlds');
    await click(btnByText('Seeds'));
    expect(panelText()).toMatch(/B2\/S\b/);
    await click(btnByText('Conway’s Life'));
    expect(document.getElementById('cell-fam-desc').textContent).toMatch(/Rule B3\/S23,/);
    const b6 = () => document.querySelector('button[aria-label="Born with 6 live neighbours"]');
    expect(b6().disabled).toBe(false);
    await click(radioByValue('cell-fam-nb', 'vn'));
    expect(b6().disabled).toBe(true);
    expect(document.querySelector('button[aria-label="Born with 4 live neighbours"]').disabled).toBe(false);
    expect(document.getElementById('cell-fam-desc').textContent).toMatch(/B3\/S23V/);
    expect(liveText()).toMatch(/4 cells that share a side/);
  });
  it('the grid is one tab stop with a roving cell that counts neighbours for the chosen neighbourhood', async () => {
    await mount();
    await tab('worlds');
    await click(btnByText('Conway’s Life'));
    await click(btnByText('Clear'));
    const g = document.querySelector('[role="grid"][data-fam-grid]');
    expect(g.getAttribute('tabindex')).toBe('0');
    expect(g.querySelectorAll('[tabindex]').length).toBe(0);
    const active = () => document.getElementById(g.getAttribute('aria-activedescendant'));
    expect(active().getAttribute('role')).toBe('gridcell');
    expect(active().parentElement.getAttribute('role')).toBe('row');
    g.focus();
    await key(g, ' '); // (25,25) alive
    await key(g, 'ArrowUp'); await key(g, 'ArrowLeft'); await key(g, ' '); // (24,24) alive: a diagonal neighbour of (25,25)
    await key(g, 'ArrowRight');
    expect(active().textContent).toMatch(/Row 24, column 25: empty, 2 live neighbours/);
    await key(g, 'ArrowRight'); // (24,26): (25,25) is only a DIAGONAL neighbour
    expect(active().textContent).toMatch(/Row 24, column 26: empty, 1 live neighbour\b/);
    await click(radioByValue('cell-fam-nb', 'vn'));
    expect(document.getElementById(g.getAttribute('aria-activedescendant')).textContent).toMatch(/Row 24, column 26: empty, 0 live neighbours/);
  });
  it('predict-then-measure: no measuring before a locked prediction; the verdict comes from 10 real runs with named feedback', async () => {
    const out = await mount({ gradeBand: 'g68' });
    await tab('worlds');
    await click(btnByText('Seeds'));
    expect(btnByText('Measure 10 patches')).toBeUndefined();
    expect(btnByText('Lock in my prediction').disabled).toBe(true);
    await click(radioByValue('cell-fam-pred', 'dies'));
    await click(btnByText('Lock in my prediction'));
    expect(radioByValue('cell-fam-pred', 'settles').disabled).toBe(true);
    await click(btnByText('Measure 10 patches'));
    const truth = P.famMeasureMany(P.famRule('2', '', 2, 'moore'), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(truth.top).toBe('explodes');
    expect(statusText()).toMatch(/does not match/);
    expect(statusText()).toMatch(new RegExp('Most patches exploded through the world \\(' + truth.tally.explodes + ' of 10\\)'));
    expect(statusText()).toMatch(/no survival means it dies out/);
    expect(document.querySelectorAll('[data-fam-predict] tbody tr').length).toBe(10);
    expect(out.latest._cellularLab.worlds).toEqual({ predicted: 1 });
  });
  it('a spaceship found in the student’s OWN rule is saved and pays XP once; a ready-made preset pays nothing', async () => {
    const award = vi.fn();
    const out = await mount({ awardXP: award, gradeBand: 'g912' });
    await tab('worlds');
    // Brian's Brain is a preset: its spaceships are recorded but earn no XP.
    await click(radioByValue('cell-fam-pred', 'spaceship')); await click(btnByText('Lock in my prediction')); await click(btnByText('Measure 10 patches'));
    expect(statusText()).toMatch(/Your prediction matches/);
    expect(out.latest._cellularLab.ruleHunt.found.map((f) => f.rule)).toEqual(['B2/S/C3']);
    expect(award).not.toHaveBeenCalled();
    // HighLife = Life + birth on 6: the student's own rule.
    await click(btnByText('Conway’s Life'));
    await click(document.querySelector('button[aria-label="Born with 6 live neighbours"]'));
    expect(document.getElementById('cell-fam-desc').textContent).toMatch(/B36\/S23/);
    for (let i = 0; i < 2; i++) {
      await click(radioByValue('cell-fam-pred', 'settles')); await click(btnByText('Lock in my prediction')); await click(btnByText('Measure 10 patches'));
      if (i === 0) await click(btnByText('Predict another rule'));
    }
    expect(out.latest._cellularLab.ruleHunt.found.map((f) => f.rule)).toEqual(['B2/S/C3', 'B36/S23']);
    expect(award).toHaveBeenCalledTimes(1);
    expect(award.mock.calls[0].slice(0, 2)).toEqual(['cellularLab_hunt', 15]);
    // "Watch" loads the measured patch into the grid at generation 0.
    const watch = document.querySelector('button[aria-label="Watch patch 1 on the grid"]');
    await click(watch);
    expect(document.getElementById('cell-fam-desc').textContent).toMatch(/^Generation 0/);
  });
});

describe('Langton’s ant', () => {
  it('stops at step 2,000 until a prediction is locked, then checks it against the measured highway', async () => {
    const award = vi.fn();
    const out = await mount({ awardXP: award, gradeBand: 'k2' });
    await tab('worlds'); await click(btnByText('Langton’s ant'));
    for (let i = 0; i < 3; i++) await click(btnByText('Jump +1,000'));
    expect(panelText()).toMatch(/Step 2000: the ant is at column/);
    expect(liveText()).toMatch(/Lock in your prediction first/);
    await click(radioByValue('cell-ant-long', 'mess'));
    await click(btnByText('Lock in my prediction'));
    expect(out.latest._cellularLab.ant).toEqual({ pick: 'mess', locked: true });
    expect(btnByText('Check my prediction').disabled).toBe(true);
    for (let i = 0; i < 9; i++) await click(btnByText('Jump +1,000'));
    const st = P.antAt(11000);
    expect(panelText()).toContain('Step 11000: the ant is at column ' + st.c + ', row ' + st.r);
    expect(panelText()).toMatch(/It is on its highway/);
    await click(btnByText('Check my prediction'));
    expect(statusText()).toMatch(/a messy start means it stays messy/);
    expect(statusText()).toMatch(/for 9977 steps/);
    expect(out.latest._cellularLab.ant.correct).toBe(false);
    const ta = document.getElementById('cell-ant-explain');
    await React.act(() => setInput(ta, 'Order emerged from mess: the rule never changed but a pattern repeated.'));
    await click(btnByText('Save my explanation'));
    expect(award).toHaveBeenCalledWith('cellularLab_ant', 3, expect.any(String));
    // K-5 stops at the long-run idea: no position arithmetic.
    expect(btnByText('Give me a position to predict')).toBeUndefined();
  });
  it('grades 6-8: a generated position problem caps the ant, names the misconception, then pays XP once', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
    const award = vi.fn();
    const out = await mount({ awardXP: award, gradeBand: 'g68' }, { _cellularLab: { ant: { pick: 'highway', locked: true, checked: true, correct: true } } });
    await tab('worlds'); await click(btnByText('Langton’s ant'));
    await click(btnByText('Give me a position to predict'));
    const pr = P.makeAntProblem(1 + Math.floor(0.25 * 999999), 'g68');
    expect(panelText()).toContain('At step ' + pr.base + ' the ant is at column ' + pr.baseC + ', row ' + pr.baseR + '. Where will it be at step ' + pr.target + '?');
    // The viewer cannot be run to the answer.
    await click(btnByText('Go to step ' + pr.base));
    for (let i = 0; i < 4; i++) await click(btnByText('Step 104'));
    expect(panelText()).toContain('Step ' + (pr.base + 208) + ':');
    expect(liveText()).toMatch(/While your position prediction is open/);
    const [col, row] = Array.from(document.querySelectorAll('[data-ant-problem] input[type="text"]'));
    await React.act(() => { setInput(col, String(pr.baseC + pr.dc)); setInput(row, String(pr.baseR + pr.dr)); });
    await click(btnByText('Check'));
    expect(statusText()).toMatch(/only one period of 104 steps/);
    await click(btnByText('Hint')); await click(btnByText('Hint')); await click(btnByText('Hint'));
    expect(panelText()).toContain('there are ' + pr.k + ' whole periods of 104');
    await React.act(() => { setInput(col, String(pr.c)); setInput(row, String(pr.r)); });
    await click(btnByText('Check'));
    expect(statusText()).toMatch(/Yes! At step/);
    expect(award).toHaveBeenCalledTimes(1);
    expect(award.mock.calls[0].slice(0, 2)).toEqual(['cellularLab_ant', 3]);
    expect(out.latest._cellularLab.ant.solved).toBe(1);
    expect(out.latest._cellularLab.ant.missed).toEqual({ one_period: 1 });
  });
  it('after two wrong answers the reveal pays no XP, and a teacher can switch the reveal off', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.6);
    const award = vi.fn();
    await mount({ awardXP: award, gradeBand: 'g912' }, { _cellularLab: { ant: { pick: 'highway', locked: true, checked: true } } });
    await tab('worlds'); await click(btnByText('Langton’s ant'));
    await click(btnByText('Give me a position to predict'));
    const [col, row] = Array.from(document.querySelectorAll('[data-ant-problem] input[type="text"]'));
    await React.act(() => { setInput(col, '0'); setInput(row, '0'); });
    await click(btnByText('Check')); await click(btnByText('Check'));
    await click(btnByText('Show the answer'));
    expect(statusText()).toMatch(/No XP for a shown answer/);
    expect(award).not.toHaveBeenCalled();
    await React.act(() => root.unmount()); root = null;
    await mount({ gradeBand: 'g912' }, { _cellularLab: { teacher: { noReveal: true }, ant: { pick: 'highway', locked: true, checked: true } } });
    await tab('worlds'); await click(btnByText('Langton’s ant'));
    await click(btnByText('Give me a position to predict'));
    const [c2, r2] = Array.from(document.querySelectorAll('[data-ant-problem] input[type="text"]'));
    await React.act(() => { setInput(c2, '0'); setInput(r2, '0'); });
    await click(btnByText('Check')); await click(btnByText('Check'));
    expect(btnByText('Show the answer')).toBeUndefined();
  });
});

describe('Rule hunt (grades 9-12)', () => {
  it('searches live, fills the table rule by rule, saves the per-search counts and compares them against the locked prediction', async () => {
    const award = vi.fn();
    const out = await mount({ awardXP: award, gradeBand: 'g912' }, { _cellularLab: { ruleHunt: { strat: { random: { n: 12, ships: 0 } } } } });
    await tab('worlds');
    await click(btnByText('Conway’s Life'));
    await click(btnByText('Rule hunt'));
    await click(radioByValue('cell-hunt-pred', 'near'));
    await click(btnByText('Lock in my prediction'));
    await click(radioByValue('cell-hunt-strat', 'near'));
    expect(panelText()).toMatch(/Every rule one change away from B3\/S23/);
    // Fake timers let the test watch the search one rule at a time.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      await click(btnByText('Search 12 rules'));
      expect(btnByText('Search 12 rules').disabled).toBe(true);
      expect(panelText()).toMatch(/Measured 0 of 12 rules/);
      await React.act(() => { vi.runOnlyPendingTimers(); });
      expect(panelText()).toMatch(/Measured 1 of 12 rules/);
      expect(document.querySelectorAll('[role="region"][aria-label="Rule hunt results (scrolls)"] tbody tr').length).toBe(1);
      for (let i = 0; i < 14 && btnByText('Stop'); i++) await React.act(() => { vi.runOnlyPendingTimers(); });
    } finally { vi.useRealTimers(); }
    expect(btnByText('Stop')).toBeUndefined();
    const rows = document.querySelectorAll('[role="region"][aria-label="Rule hunt results (scrolls)"] tbody tr');
    expect(rows.length).toBe(12);
    const near = out.latest._cellularLab.ruleHunt.strat.near;
    expect(near.n).toBe(12);
    // Every saved hit is a rule the measurement really found a spaceship in.
    const hits = Array.from(rows).filter((r) => r.textContent.includes('spaceship moving'));
    expect(near.ships).toBe(hits.length);
    expect(near.ships).toBeGreaterThan(0);
    for (const f of out.latest._cellularLab.ruleHunt.found) expect(P.famMeasureMany(P.famRule(f.birth, f.survive, f.states, f.nb), [1, 2, 3]).ship).not.toBeNull();
    // The verdict is read off the student's own counts (random: 0 of 12 saved before).
    const nearWins = near.ships / near.n - 0 > 0.1;
    expect(statusText()).toMatch(nearWins ? /Your prediction matches your data/ : /Your prediction does not match your data/);
    expect(statusText()).toContain('Your data: ' + Math.round(near.ships / near.n * 100) + '% of near rules and 0% of random rules made a spaceship.');
    await wait(10);
    expect(award.mock.calls.map((c) => c[0])).toContain('cellularLab_hunt');
    expect(out.latest._cellularLab.ruleHunt.compared).toBe(true);
    expect(errors()).toEqual([]);
  });
  it('Stop ends a search part-way and still saves what was measured; unmounting mid-search leaves no timer running', async () => {
    const out = await mount({ gradeBand: 'g912' });
    await tab('worlds'); await click(btnByText('Rule hunt'));
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      await click(btnByText('Search 12 rules'));
      await React.act(() => { vi.runOnlyPendingTimers(); });
      await React.act(() => { vi.runOnlyPendingTimers(); });
      await click(btnByText('Stop'));
      expect(out.latest._cellularLab.ruleHunt.strat.random.n).toBe(2);
      expect(btnByText('Stop')).toBeUndefined();
      await React.act(() => { vi.runOnlyPendingTimers(); });
      expect(out.latest._cellularLab.ruleHunt.strat.random.n).toBe(2);
      await click(btnByText('Search 12 rules'));
      await React.act(() => root.unmount()); root = null;
      expect(vi.getTimerCount()).toBe(0);
    } finally { vi.useRealTimers(); }
    expect(errors()).toEqual([]);
  });
});

describe('K-5 glider mission', () => {
  function readRound() {
    const cap = document.querySelector('[data-glider-mission] figcaption').textContent;
    const v = /row of 3 is at the bottom/.test(cap) ? 's' : 'n', hz = /touches the right end/.test(cap) ? 'e' : 'w';
    return v + hz;
  }
  const NAMES = { nw: 'Up and left', ne: 'Up and right', sw: 'Down and left', se: 'Down and right' };
  const OPP = { nw: 'se', se: 'nw', ne: 'sw', sw: 'ne' };
  it('K-5 opens on the glider mission: wrong guess -> named misconception and a second try; three solved rounds pay XP once', async () => {
    reducedMotion();
    const award = vi.fn();
    const out = await mount({ awardXP: award, gradeBand: 'k2' });
    await tab('missions');
    expect(document.querySelector('[data-glider-mission]')).not.toBeNull();
    expect(btnByText('Forest fire')).toBeDefined();
    for (let round = 0; round < 3; round++) {
      const hd = readRound();
      expect(document.querySelector('[data-glider-mission] figcaption').textContent).not.toMatch(/star is in/);
      if (round === 0) {
        await click(btnByText(NAMES[OPP[hd]]));
        expect(statusText()).toMatch(/That is the opposite way/);
      }
      await click(btnByText(NAMES[hd]));
      expect(statusText()).toMatch(/Yes! Watch it fly/);
      await wait(320);
      const cap = document.querySelector('[data-glider-mission] figcaption').textContent;
      expect(cap).toMatch(/Generation 8\./);
      const star = /top-left/.test(cap) ? 'nw' : /top-right/.test(cap) ? 'ne' : /bottom-left/.test(cap) ? 'sw' : 'se';
      await click(document.querySelector('button[role="radio"][aria-label="Glider that flies ' + { nw: 'up and to the left', ne: 'up and to the right', sw: 'down and to the left', se: 'down and to the right' }[star] + '"]'));
      await click(btnByText('Launch'));
      await wait(320);
      expect(statusText()).toMatch(/It reached the star at generation 16/);
      await click(btnByText('Next round'));
    }
    expect(out.latest._cellularLab.glider.solved).toBe(3);
    expect(out.latest._cellularLab.glider.done).toBe(true);
    expect(award).toHaveBeenCalledTimes(1);
    expect(award.mock.calls[0].slice(0, 2)).toEqual(['cellularLab_missions', 15]);
    expect(errors()).toEqual([]);
  });
  it('a missed launch says so and does not count the round', async () => {
    reducedMotion();
    const out = await mount({ gradeBand: 'k2' });
    await tab('missions');
    const hd = readRound();
    await click(btnByText(NAMES[hd]));
    await wait(320);
    const cap = document.querySelector('[data-glider-mission] figcaption').textContent;
    const star = /top-left/.test(cap) ? 'nw' : /top-right/.test(cap) ? 'ne' : /bottom-left/.test(cap) ? 'sw' : 'se';
    const wrong = { nw: 'down and to the right', se: 'up and to the left', ne: 'down and to the left', sw: 'up and to the right' }[star];
    await click(document.querySelector('button[role="radio"][aria-label="Glider that flies ' + wrong + '"]'));
    await click(btnByText('Launch'));
    await wait(320);
    expect(statusText()).toMatch(/It missed the star/);
    expect((out.latest._cellularLab.glider || {}).solved || 0).toBe(0);
  });
});

describe('Forest model as an argument', () => {
  it('sorting names each misconception; the CER completes only with a correct sort, own data, a strength, two limitations and reasoning', async () => {
    const award = vi.fn();
    const out = await mount({ awardXP: award, gradeBand: 'g68' });
    await tab('missions');
    const sec = () => document.querySelector('[data-ff-model]');
    expect(sec()).not.toBeNull();
    const truth = { touch: 'in', wind: 'out', onestep: 'in', embers: 'out', gaps: 'in', terrain: 'out', same: 'in', people: 'out' };
    for (const [id, v] of Object.entries(truth)) await click(radioByValue('ffm-' + id, id === 'wind' || id === 'gaps' ? (v === 'in' ? 'out' : 'in') : v));
    await click(btnByText('Check my sort'));
    // Stage E: the first check gives only the count; explanations come from the second check.
    expect(statusText()).toMatch(/need another look: 2 of 8/);
    expect(statusText()).not.toMatch(/There is no wind/);
    await click(btnByText('Check my sort'));
    expect(statusText()).toMatch(/need another look: 2 of 8/);
    expect(statusText()).toMatch(/There is no wind/);
    expect(statusText()).toMatch(/the fire stops where there are no trees/);
    await click(radioByValue('ffm-wind', 'out')); await click(radioByValue('ffm-gaps', 'in'));
    await click(btnByText('Check my sort'));
    expect(statusText()).toMatch(/All eight sorted correctly/);
    const slider = () => Array.from(document.querySelectorAll('input[type="range"]')).find((i) => i.min === '30' && i.max === '90');
    await React.act(() => setInput(slider(), '40')); await click(btnByText('Run 5 trials'));
    const done = () => btnByText('Complete investigation');
    const box = (label) => Array.from(sec().querySelectorAll('label')).find((l) => l.textContent.includes(label)).querySelector('input');
    await click(box('There is a tipping point'));
    await click(box('Wind pushes')); await click(box('Burning embers'));
    await React.act(() => setInput(document.getElementById('cer-ffmodel-claim'), 'The model is good for showing a tipping point but too simple for real fire paths.'));
    await React.act(() => setInput(document.getElementById('cer-ffmodel-evidence'), 'At 40% trees the fire crossed 0 of 5 times.'));
    await React.act(() => setInput(document.getElementById('cer-ffmodel-reasoning'), 'Gaps stop fire in the model, but wind and embers in real fires could carry it across.'));
    expect(done().disabled).toBe(true); // only one density with 3+ runs
    await React.act(() => setInput(slider(), '80')); await click(btnByText('Run 5 trials'));
    expect(done().disabled).toBe(false);
    await click(done());
    expect(out.latest._cellularLab.cer.ffmodel.done).toBe(true);
    expect(out.latest._cellularLab.cer.ffmodel.limits.sort()).toEqual(['embers', 'wind']);
    expect(award).toHaveBeenCalledWith('cellularLab_cer', 15, expect.any(String));
  });
  it('K-5 does not get the model critique', async () => {
    await mount({ gradeBand: 'k2' });
    await tab('missions');
    await click(btnByText('Forest fire'));
    expect(document.querySelector('[data-ff-model]')).toBeNull();
  });
});

describe('stage-A limitations fixed', () => {
  it('the custom-seed editor is a one-row grid: one gridcell inside a real row, roving with the arrow keys', async () => {
    await mount({ gradeBand: 'g68' });
    await tab('rules');
    await click(btnByText('Custom start'));
    const g = document.querySelector('[role="grid"][data-seed-grid]');
    expect(g).not.toBeNull();
    expect(g.querySelectorAll('[role="gridcell"]').length).toBe(1);
    const cell = () => g.querySelector('[role="gridcell"]');
    expect(cell().parentElement.getAttribute('role')).toBe('row');
    expect(g.getAttribute('aria-activedescendant')).toBe(cell().id);
    expect(cell().getAttribute('aria-colindex')).toBe('41');
    g.focus();
    await key(g, 'ArrowRight');
    expect(cell().getAttribute('aria-colindex')).toBe('42');
    expect(cell().textContent).toBe('Seed cell 42, empty');
    await key(g, ' ');
    expect(cell().textContent).toBe('Seed cell 42, alive');
    expect(liveText()).toMatch(/Seed cell 42, alive/);
  });
  it('the behaviour-atlas labels are translated', async () => {
    await mount({ t: (k, fb) => (k === 'stem.cellular.abbr_glider' ? 'Pl' : fb) });
    await tab('patterns');
    const labels = Array.from(document.querySelectorAll('[data-pattern-behavior-atlas] text')).map((n) => n.textContent);
    expect(labels).toContain('Pl');
    expect(labels).not.toContain('Gl');
  });
  it('Export PNG shows the picture on the page and can open it in a new window (no download needed)', async () => {
    const realImage = window.Image;
    window.Image = class { set src(v) { this._src = v; setTimeout(() => this.onload && this.onload(), 0); } get src() { return this._src; } };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ fillRect() {}, drawImage() {}, set fillStyle(v) {} });
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,AAAA');
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:x';
    if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    try {
      await mount();
      await click(btnByText('Export PNG'));
      await wait(5);
      const img = document.querySelector('[data-png-shot] img');
      expect(img).not.toBeNull();
      expect(img.getAttribute('src')).toBe('data:image/png;base64,AAAA');
      expect(img.getAttribute('alt')).toBe('Picture of the Life grid at generation 0.');
      expect(anchorClick).toHaveBeenCalledTimes(1);
      const doc = { written: '', open() {}, write(s) { this.written += s; }, close() {} };
      vi.spyOn(window, 'open').mockReturnValue({ document: doc });
      await click(btnByText('Open the image in a new window'));
      expect(doc.written).toContain('<img alt="Picture of the Life grid at generation 0." src="data:image/png;base64,AAAA"');
      window.open.mockReturnValue(null);
      await click(btnByText('Open the image in a new window'));
      expect(liveText()).toMatch(/The new window was blocked/);
      await click(btnByText('Close the picture'));
      expect(document.querySelector('[data-png-shot]')).toBeNull();
    } finally { window.Image = realImage; }
  });
});

describe('teacher view and saved-state safety', () => {
  it('the teacher summary reports the new work, and Start fresh clears it', async () => {
    const out = await mount({ gradeBand: 'g912', isTeacherMode: true }, { _cellularLab: { glider: { solved: 2, guesses: 4, guessRight: 3 }, ant: { pick: 'loop', locked: true, checked: true, correct: false, solved: 2, attempts: 5, revealed: 1, missed: { direction: 2 } }, ruleHunt: { tested: 24, found: [{ rule: 'B36/S23', birth: '36', survive: '23', states: 2, nb: 'moore', seed: 1, dr: 1, dc: 1, p: 4, n: 5 }] }, worlds: { predicted: 3, predictedRight: 1 } } });
    await tab('teacher');
    const txt = panelText();
    expect(txt).toMatch(/2 of 3 rounds solved, 3 of 4 direction guesses right/);
    expect(txt).toMatch(/long run: prediction wrong; 2 positions solved, 5 checks, 1 answer shown/);
    expect(txt).toMatch(/24 rules searched, 1 spaceship rule measured; family predictions 1 of 3 right/);
    expect(txt).toMatch(/Ant highway: moved the wrong way: 2 times/);
    await click(btnByText('Clear saved work on this device'));
    await click(btnByText('Yes, clear'));
    expect(out.latest._cellularLab.glider).toEqual({});
    expect(out.latest._cellularLab.ant).toEqual({});
    expect(out.latest._cellularLab.ruleHunt).toEqual({});
  });
  it('hostile shapes for every new key still load in every section', async () => {
    const hostile = { _cellularLab: { glider: 'x', ant: [1, 2], ruleHunt: { found: [null, { rule: 5 }, { rule: 'B3/S23', p: 'a' }], strat: 'bad', pick: 7 }, worlds: 7, cer: { ffmodel: 'junk' } } };
    await mount({ gradeBand: 'g912', isTeacherMode: true }, hostile);
    for (const id of ['life', 'rules', 'patterns', 'worlds', 'practice', 'investigate', 'missions', 'learn', 'teacher']) await tab(id);
    await tab('worlds'); await click(btnByText('Langton’s ant')); await click(btnByText('Rule hunt'));
    expect(panelText()).toMatch(/Spaceship rules you have measured \(0\)/);
    expect(errors()).toEqual([]);
  });
});
