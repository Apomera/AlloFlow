// Cellular Automaton Lab stage C (2026-11-03): the band learning path and tab
// order, one hint-ladder / reveal behaviour in every section, translated quest
// labels, the instant Langton's-ant check, optional sonification on the
// More-worlds boards, the honest random-search estimate, restored
// progress-only slices, and the render caches.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
// CELLULAR_TOOL_FILE lets the suite run against the pre-stage-C backup to prove each gate can fail.
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
  vi.useRealTimers();
  delete window.matchMedia;
  delete window.AudioContext;
});

async function mount(over, initial) {
  const out = { latest: null, setOver: null };
  function App() {
    const [state, setState] = React.useState(initial || {});
    const [o, setO] = React.useState(over || {});
    out.latest = state; out.setOver = setO;
    return window.StemLab._registry.cellularLab.render(makeCtx(Object.assign({ toolData: state, setToolData: setState }, o)));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(() => root.render(React.createElement(App)));
  return out;
}
const buttons = () => Array.from(document.querySelectorAll('button'));
const btnByText = (txt) => buttons().find((b) => b.textContent.trim() === txt) || buttons().find((b) => b.textContent.includes(txt));
async function click(el) { if (!el) throw new Error('missing element'); await React.act(() => el.click()); }
async function tab(id) { await click(document.getElementById('cell-tab-' + id)); }
async function wait(ms) { await React.act(async () => { await new Promise((r) => setTimeout(r, ms)); }); }
const panelText = () => document.getElementById('cell-panel').textContent;
const liveText = () => Array.from(document.querySelectorAll('[aria-live]')).map((n) => n.textContent).join(' | ');
const statusText = () => Array.from(document.querySelectorAll('[role="status"]')).map((n) => n.textContent).join(' || ');
const radioByValue = (name, v) => document.querySelector('input[type="radio"][name="' + name + '"][value="' + v + '"]');
const steps = () => Array.from(document.querySelectorAll('[data-cellularlab-path] [data-path-step]'));
const tabIds = () => Array.from(document.querySelectorAll('[role="tab"]')).map((b) => b.id.replace('cell-tab-', ''));
const errors = () => errSpy.mock.calls.map((c) => String(c[0]).slice(0, 200));
function reducedMotion() { window.matchMedia = (q) => ({ matches: /reduce/.test(q), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }); }
function setInput(el, value) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}
// A fake Web Audio context that records every note's frequency.
function fakeAudio() {
  const rec = { tones: [], ctxs: [] };
  window.AudioContext = class {
    constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; rec.ctxs.push(this); }
    createOscillator() { return { frequency: { setValueAtTime: (f) => rec.tones.push(f) }, connect() {}, start() {}, stop() {} }; }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
    close() { this.state = 'closed'; this.closed = true; }
    resume() {}
  };
  return rec;
}

describe('learning path ("Start here") and tab order', () => {
  it('each band gets its own ordered path, ticked from saved progress', async () => {
    await mount({ gradeBand: 'k2' });
    expect(steps().map((b) => b.getAttribute('data-path-step'))).toEqual(['draw', 'notice', 'glider']);
    expect(document.getElementById('cell-path-title').textContent).toBe('Your path for Grades K–5: 0 of 3 steps done');
    await React.act(() => root.unmount()); root = null;

    await mount({ gradeBand: 'g68' }, { _cellularLab: { challengesDone: { still: true, oscillator: true }, practice: { solved: 3 }, cer: { density: { done: true } } } });
    expect(steps().map((b) => b.getAttribute('data-path-step'))).toEqual(['challenges', 'practice', 'cer', 'missions']);
    expect(steps().map((b) => b.getAttribute('data-done'))).toEqual(['true', 'true', 'true', 'false']);
    expect(document.getElementById('cell-path-title').textContent).toMatch(/3 of 4 steps done/);
    expect(steps()[3].textContent).toMatch(/Up next/);
    await React.act(() => root.unmount()); root = null;

    await mount({ gradeBand: 'g912' }, { _cellularLab: { exploredRule: true, saw110: true, practice: { classSolved: 1 }, ruleHunt: { compared: true }, cer: { ffmodel: { done: true } } } });
    expect(steps().map((b) => b.getAttribute('data-path-step'))).toEqual(['rulespace', 'classes', 'hunt', 'critique']);
    expect(steps().map((b) => b.getAttribute('data-done'))).toEqual(['true', 'false', 'true', 'true']);
    expect(steps()[1].textContent).toMatch(/1 of 3 · Up next/);
    expect(errors()).toEqual([]);
  });
  it('a path step opens the right section and sub-view, and moves focus there', async () => {
    await mount({ gradeBand: 'g912' });
    await click(steps().find((b) => b.getAttribute('data-path-step') === 'classes'));
    expect(document.getElementById('cell-tab-practice').getAttribute('aria-selected')).toBe('true');
    expect(panelText()).toMatch(/A mystery rule starts from a random row/);
    await click(steps().find((b) => b.getAttribute('data-path-step') === 'hunt'));
    expect(panelText()).toMatch(/131,072/);
    await click(steps().find((b) => b.getAttribute('data-path-step') === 'critique'));
    expect(document.getElementById('cell-tab-missions').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement.id).toBe('cell-ffmodel');
    await click(steps().find((b) => b.getAttribute('data-path-step') === 'rulespace'));
    expect(document.getElementById('cell-tab-rules').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement.id).toBe('cell-panel');
    expect(liveText()).toMatch(/Rule space selected/);
  });
  it('K-5: Notice and wonder ticks are saved and complete the path step; the glider step opens the mission', async () => {
    const out = await mount({ gradeBand: 'g35' });
    await click(steps()[1]);
    expect(document.activeElement.id).toBe('cell-notice');
    const boxes = Array.from(document.querySelectorAll('input[type="checkbox"][data-notice]'));
    expect(boxes.length).toBe(4);
    await click(boxes[0]);
    expect(steps()[1].getAttribute('data-done')).toBe('false');
    await click(boxes[2]);
    expect(out.latest._cellularLab.notice).toEqual({ n1: true, n3: true });
    expect(steps()[1].getAttribute('data-done')).toBe('true');
    await click(steps()[2]);
    expect(document.querySelector('[data-glider-mission]')).not.toBeNull();
  });
  it('a teacher section lock leaves only the open section’s steps clickable', async () => {
    await mount({ gradeBand: 'g68' }, { _cellularLab: { teacher: { lockTab: 'practice' } } });
    expect(steps().map((b) => b.disabled)).toEqual([true, false, true, true]);
    expect(steps()[0].textContent).toMatch(/Not open right now/);
  });
  it('core sections come first for each band, and every section is still there', async () => {
    await mount({ gradeBand: 'k2' });
    expect(tabIds()).toEqual(['life', 'missions', 'practice', 'worlds', 'patterns', 'investigate', 'learn']);
    await React.act(() => root.unmount()); root = null;
    await mount({ gradeBand: 'g912', isTeacherMode: true });
    expect(tabIds()).toEqual(['life', 'rules', 'practice', 'worlds', 'missions', 'investigate', 'patterns', 'learn', 'teacher']);
    await React.act(() => root.unmount()); root = null;
    await mount({ gradeBand: 'g68' });
    expect(tabIds()).toEqual(['life', 'practice', 'investigate', 'missions', 'worlds', 'patterns', 'rules', 'learn']);
  });
});

describe('quest labels', () => {
  it('quest-hook labels and progress read the last render’s translator', async () => {
    await mount({ t: (k, fb) => (k === 'stem.cellular.quest_draw' ? 'Dessine des cellules' : k === 'stem.cellular.quest_best_gen' ? 'record : gén. {g}' : fb) });
    const hooks = window.StemLab._registry.cellularLab.questHooks;
    expect(hooks.map((q) => q.id)).toEqual(['cell_draw', 'cell_run', 'cell_stamp', 'cell_gun', 'cell_rule', 'cell_challenge', 'cell_110']);
    expect(hooks[0].label).toBe('Dessine des cellules');
    expect(hooks[1].label).toBe('Run Life for 50+ generations');
    expect(hooks[1].progress({ maxGen: 7 })).toBe('record : gén. 7');
    expect(hooks[1].check({ ranLong: true })).toBe(true);
  });
});

describe('one behaviour in every section: hint ladders, reveals, credit', () => {
  it('Practice, Wolfram classes, the ant and the glider all use the same hint ladder', async () => {
    await mount({ gradeBand: 'g68' });
    await tab('practice');
    const ladder = () => document.querySelector('[data-hint-ladder="ng"]');
    expect(ladder().querySelector('button').textContent).toBe('Hint 1 of 3');
    expect(ladder().querySelector('ol')).toBeNull();
    await click(ladder().querySelector('button'));
    expect(ladder().querySelectorAll('li').length).toBe(1);
    expect(ladder().textContent).toMatch(/an empty cell is born with exactly 3 live neighbours/);
    await click(ladder().querySelector('button')); await click(ladder().querySelector('button'));
    expect(ladder().querySelectorAll('li').length).toBe(3);
    expect(ladder().querySelector('button').textContent).toBe('All hints shown');
    expect(ladder().querySelector('button').disabled).toBe(true);
    await React.act(() => root.unmount()); root = null;

    await mount({ gradeBand: 'g912' }, { _cellularLab: { ant: { pick: 'highway', locked: true, checked: true } } });
    await tab('practice'); await click(btnByText('Name the Wolfram class'));
    expect(document.querySelector('[data-hint-ladder="cls"] button').textContent).toBe('Hint 1 of 3');
    await tab('worlds'); await click(btnByText('Langton’s ant')); await click(btnByText('Give me a position to predict'));
    expect(document.querySelector('[data-hint-ladder="ant"] button').textContent).toBe('Hint 1 of 3');
    await React.act(() => root.unmount()); root = null;

    await mount({ gradeBand: 'k2' });
    await tab('missions');
    expect(document.querySelector('[data-hint-ladder="glider"] button').textContent).toBe('Hint 1 of 2');
    expect(document.querySelector('[data-glider-mission] details')).toBeNull();
  });
  it('Wolfram classes: a right answer after two wrong ones earns no XP; a first-try answer does', async () => {
    const award = vi.fn();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    await mount({ awardXP: award, gradeBand: 'g912' });
    await tab('practice'); await click(btnByText('Name the Wolfram class'));
    const classBtn = (n) => buttons().find((b) => b.textContent.startsWith('Class ' + n + ':'));
    const first = P.makeClassProblem(1), wrong = [1, 2, 3, 4].filter((c) => c !== first.cls);
    await click(classBtn(wrong[0])); await click(classBtn(wrong[1]));
    expect(statusText()).toMatch(/Use the hints and try again, or show the answer/);
    await click(classBtn(first.cls));
    expect(statusText()).toMatch(/Correct: Rule/);
    expect(award).not.toHaveBeenCalled();
    await click(btnByText('New mystery rule'));
    const second = P.makeClassProblem(1 + Math.floor(0.5 * 999999));
    await click(classBtn(second.cls));
    expect(award).toHaveBeenCalledTimes(1);
    expect(award.mock.calls[0].slice(0, 2)).toEqual(['cellularLab_classes', 2]);
  });
  const NAMES = { nw: 'Up and left', ne: 'Up and right', sw: 'Down and left', se: 'Down and right' };
  const OPP = { nw: 'se', se: 'nw', ne: 'sw', sw: 'ne' };
  function readRound() {
    const cap = document.querySelector('[data-glider-mission] figcaption').textContent;
    return (/row of 3 is at the bottom/.test(cap) ? 's' : 'n') + (/touches the right end/.test(cap) ? 'e' : 'w');
  }
  it('glider: two wrong guesses do NOT auto-reveal; the reveal is on demand and the round earns no credit', async () => {
    reducedMotion();
    const out = await mount({ gradeBand: 'k2' });
    await tab('missions');
    const hd = readRound(), other = ['nw', 'ne', 'sw', 'se'].find((x) => x !== hd && x !== OPP[hd]);
    await click(btnByText(NAMES[OPP[hd]]));
    expect(btnByText('Show me where it flies (no credit)')).toBeUndefined();
    await click(btnByText(NAMES[other]));
    // Still guessing: the answer is not shown and the star is still hidden.
    expect(statusText()).not.toMatch(/Watch where it really goes/);
    expect(document.querySelector('[data-glider-mission] figcaption').textContent).not.toMatch(/star is in/);
    expect(btnByText(NAMES[hd])).toBeDefined();
    await click(btnByText('Show me where it flies (no credit)'));
    expect(statusText()).toMatch(/Watch where it really goes/);
    expect(out.latest._cellularLab.glider.revealed).toBe(1);
    await wait(320);
    const cap = document.querySelector('[data-glider-mission] figcaption').textContent;
    const star = /top-left/.test(cap) ? 'nw' : /top-right/.test(cap) ? 'ne' : /bottom-left/.test(cap) ? 'sw' : 'se';
    await click(document.querySelector('button[role="radio"][aria-label="Glider that flies ' + { nw: 'up and to the left', ne: 'up and to the right', sw: 'down and to the left', se: 'down and to the right' }[star] + '"]'));
    await click(btnByText('Launch'));
    await wait(320);
    expect(statusText()).toMatch(/It reached the star/);
    expect(out.latest._cellularLab.glider.solved || 0).toBe(0);
    expect(out.latest._cellularLab.glider.played).toBe(1);
    await React.act(() => root.unmount()); root = null;
    await mount({ gradeBand: 'k2' }, { _cellularLab: { teacher: { noReveal: true } } });
    await tab('missions');
    const hd2 = readRound(), other2 = ['nw', 'ne', 'sw', 'se'].find((x) => x !== hd2 && x !== OPP[hd2]);
    await click(btnByText(NAMES[OPP[hd2]])); await click(btnByText(NAMES[other2]));
    expect(btnByText('Show me where it flies (no credit)')).toBeUndefined();
  });
  it('mission questions: after two wrong answers the answer can be shown; finishing then pays no XP', async () => {
    const award = vi.fn();
    const out = await mount({ awardXP: award, gradeBand: 'g68' });
    await tab('missions');
    await click(btnByText('Traffic jam'));
    const slider = () => Array.from(document.querySelectorAll('input[type="range"]')).find((i) => i.min === '5' && i.max === '95');
    for (const v of ['20', '50', '60', '80']) { await React.act(() => setInput(slider(), v)); await click(btnByText('Run 5 trials')); }
    const radio = (i) => Array.from(document.querySelectorAll('input[type="radio"][name="mq-radio-traffic"]'))[i];
    await click(radio(1)); await click(btnByText('Submit'));
    expect(btnByText('Show the answer (no XP)')).toBeUndefined();
    await click(radio(2)); await click(btnByText('Submit'));
    await click(btnByText('Show the answer (no XP)'));
    expect(statusText()).toMatch(/Answer: “Jams form, and fewer cars get through each step\.”/);
    expect(out.latest._cellularLab.missions.traffic.revealed).toBe(true);
    await click(radio(0)); await click(btnByText('Submit'));
    expect(out.latest._cellularLab.missions.traffic.done).toBe(true);
    expect(award).not.toHaveBeenCalled();
  });
});

describe('Langton’s ant: instant check and restored slices', () => {
  it('“Jump to step 11,000” appears only after the prediction is locked and makes the check available at once', async () => {
    const out = await mount({ gradeBand: 'k2' });
    await tab('worlds'); await click(btnByText('Langton’s ant'));
    expect(btnByText('Jump to step 11,000')).toBeUndefined();
    await click(radioByValue('cell-ant-long', 'highway'));
    await click(btnByText('Lock in my prediction'));
    expect(btnByText('Check my prediction').disabled).toBe(true);
    const t0 = performance.now();
    await click(btnByText('Jump to step 11,000'));
    expect(performance.now() - t0).toBeLessThan(3000);
    const st = P.antAt(11000);
    expect(panelText()).toContain('Step 11000: the ant is at column ' + st.c + ', row ' + st.r);
    expect(btnByText('Jump to step 11,000')).toBeUndefined();
    await click(btnByText('Check my prediction'));
    expect(out.latest._cellularLab.ant.correct).toBe(true);
    expect(statusText()).toMatch(/Right! The run shows it/);
  });
  it('a restored slice with flags but no pick still counts as locked and checked (no re-lock, no crash)', async () => {
    await mount({ gradeBand: 'g68' }, { _cellularLab: { ant: { locked: true, checked: true, correct: true }, ruleHunt: { compared: true, strat: { random: { n: 12, ships: 0 }, near: { n: 12, ships: 5 } } } } });
    await tab('worlds'); await click(btnByText('Langton’s ant'));
    const radios = Array.from(document.querySelectorAll('input[name="cell-ant-long"]'));
    expect(radios.every((r) => r.disabled)).toBe(true);
    expect(document.querySelector('[data-ant-predict]').textContent).not.toMatch(/Lock in my prediction/);
    expect(statusText()).toMatch(/Right! The run shows it/);
    expect(btnByText('Give me a position to predict')).toBeDefined();
    await React.act(() => root.unmount()); root = null;
    await mount({ gradeBand: 'g912' }, { _cellularLab: { ruleHunt: { compared: true, strat: { random: { n: 12, ships: 0 }, near: { n: 12, ships: 5 } } } } });
    await tab('worlds'); await click(btnByText('Rule hunt'));
    expect(Array.from(document.querySelectorAll('input[name="cell-hunt-pred"]')).every((r) => r.disabled && !r.checked)).toBe(true);
    expect(statusText()).toMatch(/Your data: 42% of near rules and 0% of random rules made a spaceship\./);
    expect(statusText()).not.toMatch(/Your prediction/);
    expect(errors()).toEqual([]);
  });
});

describe('sonification on the More-worlds boards', () => {
  it('rule families: off by default; when on, every generation change plays one note; audio closes on unmount', async () => {
    const rec = fakeAudio();
    await mount({ gradeBand: 'g68' });
    await tab('worlds');
    const soundBtn = () => buttons().find((b) => b.textContent === 'Play each step as a note');
    expect(soundBtn().getAttribute('aria-pressed')).toBe('false');
    await click(btnByText('Step'));
    expect(rec.tones.length).toBe(0);
    await click(soundBtn());
    expect(soundBtn().getAttribute('aria-pressed')).toBe('true');
    const n0 = rec.tones.length;
    expect(n0).toBe(1);
    await click(btnByText('Step'));
    await click(btnByText('Jump +10'));
    expect(rec.tones.length).toBe(n0 + 2);
    expect(rec.tones.every((f) => f >= 220 && f <= 880)).toBe(true);
    expect(panelText()).toMatch(/Higher notes mean more live cells/);
    await click(soundBtn());
    await click(btnByText('Step'));
    expect(rec.tones.length).toBe(n0 + 2);
    await React.act(() => root.unmount()); root = null;
    expect(rec.ctxs.every((c) => c.closed)).toBe(true);
  });
  it('Langton’s ant: the note follows the distance from the start square', async () => {
    const rec = fakeAudio();
    await mount({ gradeBand: 'g68' });
    await tab('worlds'); await click(btnByText('Langton’s ant'));
    await click(buttons().find((b) => b.textContent === 'Play each step as a note'));
    await click(btnByText('Step 104'));
    expect(rec.tones[rec.tones.length - 1]).toBeCloseTo(P.antPitch(P.antAt(104)), 6);
    await click(btnByText('Jump +1,000'));
    expect(rec.tones[rec.tones.length - 1]).toBeCloseTo(P.antPitch(P.antAt(1104)), 6);
    expect(panelText()).toMatch(/The farther the ant is from where it started, the higher the note/);
  });
  it('with no audio in the browser the button says so and stays off', async () => {
    delete window.AudioContext;
    await mount({ gradeBand: 'g68' });
    await tab('worlds');
    const soundBtn = () => buttons().find((b) => b.textContent === 'Play each step as a note');
    await click(soundBtn());
    expect(soundBtn().getAttribute('aria-pressed')).toBe('false');
    expect(liveText()).toMatch(/Sound is not available here/);
  });
});

describe('rule hunt: an honest rarity estimate', () => {
  it('commit an estimate first; only random rules tested after the lock are compared, with the rule of three for zero hits', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.37);
    const out = await mount({ gradeBand: 'g912' }, { _cellularLab: { ruleHunt: { strat: { random: { n: 5, ships: 0 } } } } });
    await tab('worlds'); await click(btnByText('Rule hunt'));
    const est = document.querySelector('[data-hunt-estimate]');
    expect(est.textContent).toMatch(/a search that finds no spaceship is a real result/);
    expect(btnByText('Lock in my estimate').disabled).toBe(true);
    await click(radioByValue('cell-hunt-est', 'none'));
    await click(btnByText('Lock in my estimate'));
    expect(out.latest._cellularLab.ruleHunt.estimate).toBe('none');
    expect(out.latest._cellularLab.ruleHunt.estBase).toEqual({ n: 5, ships: 0 });
    expect(document.querySelector('[data-hunt-estimate]').textContent).toMatch(/so far 0/);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await click(btnByText('Search 12 rules'));
    for (let i = 0; i < 16 && btnByText('Stop'); i++) await React.act(() => { vi.runOnlyPendingTimers(); });
    vi.useRealTimers();
    const r = out.latest._cellularLab.ruleHunt.strat.random;
    expect(r.n).toBe(17);
    const k = r.ships;
    const txt = document.querySelector('[data-hunt-estimate]').textContent;
    expect(txt).toContain('Since your estimate, your random searches tested 12 rules and ' + k + ' had a spaceship');
    if (k === 0) { expect(txt).toMatch(/below about 25% \(3 ÷ 12\)/); expect(txt).toMatch(/Your estimate matches your data/); }
    else expect(txt).toMatch(/Your estimate does not match your data/);
  });
  it('the bucket and rule-of-three numbers come from the counts', () => {
    expect(P.huntBucket(0, 12)).toBe('none');
    expect(P.huntBucket(1, 12)).toBe('one');
    expect(P.huntBucket(2, 12)).toBe('one');
    expect(P.huntBucket(3, 12)).toBe('few');
    expect(P.huntBucket(7, 12)).toBe('most');
    expect(P.huntBucket(0, 0)).toBeNull();
  });
});

describe('render caches stay correct', () => {
  it('pattern thumbnails follow the theme and pulse labels follow the language', async () => {
    const out = await mount({ gradeBand: 'g68' });
    await tab('patterns');
    const bg = () => document.querySelector('[data-pattern-evolution-preview="glider"] rect').getAttribute('fill');
    expect(bg()).toBe('#f1f5f9');
    await React.act(() => out.setOver({ gradeBand: 'g68', isDark: true }));
    expect(bg()).toBe('#111827');
    expect(panelText()).toMatch(/First 16 generations/);
    await React.act(() => out.setOver({ gradeBand: 'g68', isDark: true, t: (k, fb) => (k === 'stem.cellular.pulse_title' ? 'Premières 16 générations' : fb) }));
    expect(panelText()).toMatch(/Premières 16 générations/);
    expect(panelText()).not.toMatch(/First 16 generations/);
  });
  it('the Rules diagram redraws when the rule changes', async () => {
    await mount({ gradeBand: 'g68' });
    await tab('rules');
    // The memoised space-time rows must be the rows of the CURRENT rule.
    // From one centre cell (column 40 of 81, 6 px cells), generation 1 is
    // columns 39-41 under Rule 30 but only columns 39 and 41 under Rule 90.
    const rows = () => Array.from(document.querySelectorAll('[data-ca-rows] path')).map((p) => p.getAttribute('d'));
    expect(rows()[1]).toBe('M234 6h6v6h-6zM240 6h6v6h-6zM246 6h6v6h-6z');
    await click(btnByText('Rule 90'));
    expect(rows()[1]).toBe('M234 6h6v6h-6zM246 6h6v6h-6z');
  });
});

describe('saved-state safety', () => {
  it('hostile shapes for the new keys load in every section', async () => {
    const hostile = { _cellularLab: { notice: 'x', ruleHunt: { estimate: 5, estBase: 'bad', compared: 'yes' }, ant: { checked: 'yes', pick: 3 }, glider: { revealed: 'x' }, missions: { traffic: { revealed: 'x' } } } };
    await mount({ gradeBand: 'g912', isTeacherMode: true }, hostile);
    for (const id of tabIds()) await tab(id);
    await tab('worlds'); await click(btnByText('Langton’s ant')); await click(btnByText('Rule hunt'));
    expect(document.querySelector('[data-hunt-estimate]')).not.toBeNull();
    await React.act(() => root.unmount()); root = null;
    await mount({ gradeBand: 'k2' }, hostile);
    for (const id of tabIds()) await tab(id);
    expect(errors()).toEqual([]);
  });
});
