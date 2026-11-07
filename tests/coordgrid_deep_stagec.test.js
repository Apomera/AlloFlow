// Coordinate Grid stage C (2026-11-03): coherence across the seven tabs.
// - A band-aware "Start here" path (grade 5 / 6 / 8) ticked by the existing
//   progress counters; tabs ordered core-first, map games as optional Play.
// - One teacher panel for every tab (plus "hide Play").
// - One rule on every tab: two tries, then the item closes; the answer appears
//   only when the student presses "Show the answer"; a reveal earns nothing.
// - Judge Kai: one decision (each step, or "No step is wrong") with two tries.
// - Quest labels translate through the last render's t.
// The pointer-mapping checks run in Chromium: coordgrid_deep_stagec_browser.test.js.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.COORDGRID_DEEP_FILE || 'stem_lab/stem_tool_coordgrid.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root = null, latest = null, xp = [], sr = [], errors = [], CORE = null, TOOL = null;
beforeEach(() => {
  resetStemLab();
  TOOL = loadTool(FILE, 'coordinate');
  CORE = TOOL._core;
  latest = null; xp = []; sr = []; errors = [];
  vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ').slice(0, 300)); });
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null;
  document.body.innerHTML = '';
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
      toolData: state, setToolData: setState, exploreScore: es, setExploreScore: setEs,
      awardXP: (id, amt, why) => xp.push([id, amt, why]), announceToSR: (m) => sr.push(m), addToast: () => {},
    }, extra || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => root.render(React.createElement(App)));
}
const click = async (el) => { expect(el, 'element to click').toBeTruthy(); await React.act(async () => { el.click(); }); };
async function type(el, value) {
  expect(el, 'input to type in').toBeTruthy();
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}
const byText = (re, scope) => [...(scope || document).querySelectorAll('button')].find((b) => re.test(b.textContent.trim()));
const byLabel = (l) => document.querySelector('button[aria-label="' + l + '"]');
const inputLabelled = (l) => document.querySelector('input[aria-label="' + l + '"]');
const labelInput = (text) => { const lab = [...document.querySelectorAll('label')].find((l) => l.textContent.trim().startsWith(text)); return lab && lab.querySelector('input'); };
const reveal = () => document.querySelector('[data-coordgrid-reveal]');
const paid = () => xp.filter((x) => x[0] === 'coordinate');
const svgText = () => [...document.querySelectorAll('#coordinate-section-panel svg text')].map((t) => t.textContent);
const tabs = () => [...document.querySelectorAll('[role="tab"]')].map((b) => b.id.replace('coordinate-section-tab-', ''));
const pathSteps = () => [...document.querySelectorAll('[data-coordgrid-path-step]')].map((li) => [li.getAttribute('data-coordgrid-path-step'), li.getAttribute('data-done') === 'true']);
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const P = (x, y) => ({ x, y });
const TRI = [P(1, 1), P(4, 1), P(1, 3)];
const B = [P(-1, -4), P(-4, -4), P(-1, -2)];
const JUDGE_NO = { type: 'judge', A: TRI, B, proposed: [{ kind: 'reflect', line: 'x', a: 0 }, { kind: 'translate', dx: 0, dy: -5 }], maps: false, wrongStep: 0, slip: 'wrong_mirror', fixStep: { kind: 'reflect', line: 'y', a: 0 }, similar: false, tries: 0, hint: 0, stage: 'pick' };
const JUDGE_YES = { type: 'judge', A: TRI, B, proposed: [{ kind: 'reflect', line: 'y', a: 0 }, { kind: 'translate', dx: 0, dy: -5 }], maps: true, wrongStep: -1, slip: null, fixStep: null, similar: false, tries: 0, hint: 0, stage: 'pick' };
const ROT = { type: 'rotate', p: P(3, 1), angle: 90, c: P(0, 0), answer: P(-1, 3), tries: 0, hint: 0, stage: 'answer' };
const PAT = { type: 'patterns', addA: 2, addB: 6, ratio: 3, A: [0, 2, 4, 6, 8], B: [0, 6, 12, 18, 24], tries: 0, hint: 0, stage: 'fill' };
const MISSION = { type: 'mission', lo: 0, hi: 10, T: P(4, 6), lms: [{ id: 'well', p: P(4, 2) }, { id: 'palm', p: P(8, 6) }], clues: [{ kind: 'same_x', lm: 0 }, { kind: 'same_y', lm: 1 }], digs: [], marks: [], tries: 0, hint: 0, done: false };

describe('learning path and tab order by band', () => {
  it('the engine gives each band 3 to 6 ordered steps, all on counters the tool keeps', () => {
    const known = ['plotsSolved', 'namesSolved', 'reflectsSolved', 'translatesSolved', 'distanceSolved', 'polygonsSolved', 'slopesSolved', 'sequencesSolved', 'judgesSolved', 'rotationsSolved', 'dilationsSolved', 'scalesSolved', 'patternsSolved', 'tablesSolved', 'treasuresFound'];
    for (const lv of ['g5', 'g6', 'g8']) {
      const p = CORE.pathFor(lv);
      expect(p.length).toBeGreaterThanOrEqual(3);
      expect(p.length).toBeLessThanOrEqual(6);
      for (const s of p) { expect(known).toContain(s.counter); expect(s.goal).toBeGreaterThan(0); }
      expect(CORE.tabOrder(lv).slice(0, CORE.CORE_TABS[lv].length)).toEqual(CORE.CORE_TABS[lv]);
      expect(CORE.tabOrder(lv).sort()).toEqual(CORE.ALL_TABS.slice().sort());
      expect(CORE.tabOrder(lv)[CORE.tabOrder(lv).length - 1]).toBe('maps');
    }
    expect(CORE.pathFor('g5').map((s) => s.id)).toEqual(['plot5', 'name5', 'patterns', 'treasure5']);
    expect(CORE.pathFor('g6').map((s) => s.id)).toEqual(['plot6', 'reflect', 'distance6', 'polygon', 'table']);
    expect(CORE.pathFor('g8').map((s) => s.id)).toEqual(['sequence', 'rotate', 'dilate', 'judge', 'slope', 'pythag']);
    expect(CORE.pathFor('g8', { noDilate: true }).map((s) => s.id)).not.toContain('dilate');
    expect(CORE.tabOrder('g8', true)).not.toContain('maps');
  });

  it('grade 5: quadrant I plotting and patterns first; ticks come from the saved counters', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g5', plotsSolved: 3, namesSolved: 1 });
    expect(tabs()).toEqual(['explore', 'patterns', 'treasure', 'transform', 'quadrants', 'quadHunt', 'maps']);
    expect(pathSteps()).toEqual([['plot5', true], ['name5', false], ['patterns', false], ['treasure5', false]]);
    const next = document.querySelector('[data-coordgrid-path-step][aria-current="step"]');
    expect(next.getAttribute('data-coordgrid-path-step')).toBe('name5');
    expect(next.textContent).toContain('1 of 3 solved.');
    expect(document.querySelector('[data-coordgrid-path]').textContent).toContain('1 of 4 done');
    // Start opens the activity on its tab, generated for the band.
    await click(document.querySelector('[data-coordgrid-path-step="patterns"] button'));
    expect(latest.cgTab).toBe('patterns');
    expect(latest.ptTask.type).toBe('patterns');
    await click(document.querySelector('[data-coordgrid-path-step="name5"] button'));
    expect(latest.cgTab).toBe('explore');
    expect(latest.gridChallenge.type).toBe('name');
    expect(latest.gridChallenge.target.x).toBeGreaterThanOrEqual(0);
    expect(latest.gridChallenge.target.y).toBeGreaterThanOrEqual(0);
    // A second Start on an open task goes back to it instead of replacing it.
    const keep = latest.gridChallenge;
    await click(document.querySelector('[data-coordgrid-path-step="name5"] button'));
    expect(latest.gridChallenge).toEqual(keep);
    expect(errors).toEqual([]);
  });

  it('grade 6: four quadrants, polygons and tables; grade 8: transformations, slope and Pythagoras', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g6', tablesSolved: 2 });
    expect(tabs().slice(0, 4)).toEqual(['explore', 'transform', 'patterns', 'treasure']);
    expect(pathSteps().map((s) => s[0])).toEqual(['plot6', 'reflect', 'distance6', 'polygon', 'table']);
    expect(pathSteps()[4]).toEqual(['table', true]);
    await click(document.querySelector('[data-coordgrid-path-step="polygon"] button'));
    expect(latest.gridChallenge.type).toBe('polygon');
    await mount({ cgTab: 'explore', cgLevel: 'g8' });
    expect(tabs().slice(0, 3)).toEqual(['transform', 'explore', 'patterns']);
    expect(pathSteps().map((s) => s[0])).toEqual(['sequence', 'rotate', 'dilate', 'judge', 'slope', 'pythag']);
    await click(document.querySelector('[data-coordgrid-path-step="judge"] button'));
    expect(latest.cgTab).toBe('transform');
    expect(latest.tfTask.type).toBe('judge');
    await click(document.querySelector('[data-coordgrid-path-step="pythag"] button'));
    expect(latest.gridChallenge.type).toBe('distance');
    // Core tabs are marked; the note says which.
    expect(document.getElementById('coordinate-section-tab-transform').getAttribute('data-core')).toBe('true');
    expect(document.getElementById('coordinate-section-tab-maps').getAttribute('data-core')).toBe('false');
    expect(document.getElementById('coordgrid-tabs-note').textContent).toMatch(/Grade 8 core: the first three tabs/);
    expect(document.getElementById('coordinate-section-tab-maps').textContent).toContain('Play: Real-World Maps');
  });

  it('a teacher lock decides the path; turning dilations off drops that step; the path folds away', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g5', cgTeacher: { level: 'g8', noDilate: true } });
    expect(pathSteps().map((s) => s[0])).toEqual(['sequence', 'rotate', 'judge', 'slope', 'pythag']);
    // Engagement build 2026-11-04: the path is one line by default (only the next
    // step shows); "All steps" opens the full list and folds it again.
    const all = document.querySelector('[data-coordgrid-path-all]');
    const shown = () => [...document.querySelectorAll('[data-coordgrid-path-step]')].filter((li) => !li.hidden).map((li) => li.getAttribute('data-coordgrid-path-step'));
    expect(all.textContent).toBe('All steps');
    expect(all.getAttribute('aria-expanded')).toBe('false');
    expect(shown()).toEqual(['sequence']);
    await click(all);
    expect(latest.pathAll).toBe(true);
    expect(shown()).toEqual(['sequence', 'rotate', 'judge', 'slope', 'pythag']);
    expect(document.querySelector('[data-coordgrid-path-all]').getAttribute('aria-expanded')).toBe('true');
    await click(document.querySelector('[data-coordgrid-path-all]'));
    expect(shown()).toEqual(['sequence']);
  });

  it('every step done says so', async () => {
    await mount({ cgLevel: 'g5', plotsSolved: 9, namesSolved: 3, patternsSolved: 2, treasuresFound: 1 });
    expect(pathSteps().every((s) => s[1])).toBe(true);
    expect(document.querySelector('[data-coordgrid-path]').textContent).toContain('Every step is done.');
    expect(byLabel('Practise more: Plot points in quadrant I: across first, then up.')).toBeTruthy();
  });
});

describe('one teacher panel for every tab', () => {
  it('appears once, outside the tab panel, on all seven tabs; students never see it', async () => {
    for (const tab of ['explore', 'transform', 'patterns', 'treasure', 'quadrants', 'maps', 'quadHunt']) {
      await mount({ cgTab: tab, cgLevel: 'g6' }, { isTeacherMode: true });
      expect(document.querySelectorAll('[data-coordgrid-teacher]').length, tab).toBe(1);
      expect(document.querySelector('#coordinate-section-panel [data-coordgrid-teacher]'), tab).toBe(null);
      await mount({ cgTab: tab, cgLevel: 'g6' });
      expect(document.querySelector('[data-coordgrid-teacher]'), tab).toBe(null);
    }
    expect(errors).toEqual([]);
  });

  it('a teacher can hide the Play tab; a saved Play tab falls back to the first core tab', async () => {
    await mount({ cgTab: 'maps', cgLevel: 'g8' }, { isTeacherMode: true });
    const box = [...document.querySelectorAll('[data-coordgrid-teacher] label')].find((l) => /Hide the Play tab/.test(l.textContent)).querySelector('input');
    await click(box);
    expect(latest.cgTeacher.hidePlay).toBe(true);
    expect(tabs()).not.toContain('maps');
    expect(document.querySelector('#coordinate-section-panel').getAttribute('aria-labelledby')).toBe('coordinate-section-tab-transform');
  });
});

describe('two tries, then "Show the answer", on every tab', () => {
  it('explore: the second miss closes the item with no answer; Show the answer draws it, for no credit', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g6', gridChallenge: { type: 'reflect', axis: 'x', p: P(3, 4), answer: P(3, -4) }, gridFeedback: { ansX: '-3', ansY: '4' } });
    await click(byLabel('Check'));
    expect(latest.gridFeedback.msg).toMatch(/other axis/);
    expect(document.body.textContent).toContain('Second try. If this one misses too');
    await type(document.querySelector('input[aria-label="Your x-coordinate"]'), '5');
    await click(byLabel('Check'));
    expect(latest.gridFeedback.msg).toContain('That was your second try');
    expect(svgText().some((s) => s.startsWith('P′'))).toBe(false);
    expect(document.querySelector('[data-coordgrid-locked]').textContent).toContain('Show the answer, or try the next one.');
    await click(reveal());
    expect(svgText()).toContain('P′ (3, −4)');
    expect(latest.gridFeedback.msg).toContain('(3, −4)');
    expect(document.querySelector('[data-coordgrid-locked]').textContent).toBe('Answer shown. Try the next one.');
    expect(reveal()).toBe(null);
    expect(paid()).toEqual([]);
    expect(latest.missedLog.length).toBe(1);
  });

  it('with reveals turned off there is no button and the answer never appears', async () => {
    await mount({ cgTab: 'transform', cgLevel: 'g8', cgTeacher: { reveals: false }, tfTask: ROT, tfFb: { ansX: '1', ansY: '1' } });
    await click(byLabel('Check'));
    await type(document.querySelector('input[aria-label="Your x-coordinate"]'), '2');
    await click(byLabel('Check'));
    expect(latest.tfTask.done).toBe(true);
    expect(reveal()).toBe(null);
    expect(latest.tfFb.msg).toContain('Your teacher can go over this one with you.');
    expect(svgText().some((s) => s.startsWith('P′'))).toBe(false);
  });

  it('transformations: a rotation reveal draws P′ only on request; retyping the answer earns nothing', async () => {
    await mount({ cgTab: 'transform', cgLevel: 'g8', tfTask: ROT, tfFb: { ansX: '1', ansY: '-3' } });
    await click(byLabel('Check'));
    expect(latest.tfFb.msg).toMatch(/wrong way|direction/i);
    await type(document.querySelector('input[aria-label="Your x-coordinate"]'), '2');
    await click(byLabel('Check'));
    expect(svgText().some((s) => s.startsWith('P′'))).toBe(false);
    await click(reveal());
    expect(svgText()).toContain('P′ (−1, 3)');
    expect(latest.tfFb.revealed).toBe(true);
    await mount(Object.assign({}, latest, { tfTask: Object.assign({}, ROT), tfFb: { ansX: '-1', ansY: '3' } }));
    await click(byLabel('Check'));
    expect(latest.tfFb.correct).toBe(true);
    expect(paid()).toEqual([]);
    expect(latest.rotationsSolved || 0).toBe(0);
  });

  it('patterns: a multi-part item waits for the reveal, then carries on for practice only', async () => {
    await mount({ cgTab: 'patterns', cgLevel: 'g5', ptTask: PAT, ptFb: { vals: { a1: '1', a2: '2', a3: '3', a4: '4', b1: '1', b2: '2', b3: '3', b4: '4' } } });
    await click(byLabel('Check the terms'));
    await mount(Object.assign({}, latest, { ptFb: Object.assign({}, latest.ptFb, { vals: Object.assign({}, latest.ptFb.vals, { a1: '9' }) }) }));
    await click(byLabel('Check the terms'));
    expect(latest.ptTask.stage).toBe('fill');
    expect(latest.ptTask.done).toBe(true);
    expect(byLabel('Check the terms')).toBe(null);
    await click(reveal());
    expect(latest.ptTask.stage).toBe('plot');
    expect(latest.ptTask.done).toBe(false);
    expect(latest.ptFb.vals.b4).toBe('24');
    expect(document.body.textContent).toContain('Practice only: this item no longer earns credit.');
  });

  it('treasure: out of digs hides the spot until Show where the treasure was', async () => {
    await mount({ cgTab: 'treasure', cgLevel: 'g5', thMission: Object.assign({}, MISSION, { digs: [P(1, 1), P(2, 2)] }) });
    await type(labelInput('X coordinate'), '3');
    await type(labelInput('Y coordinate'), '3');
    await click(byText(/^Dig here$/));
    expect(latest.thMission.done).toBe(true);
    expect(document.querySelector('#coordinate-section-panel svg polygon[class="allo-cg-pop"]')).toBe(null);
    await click(byText(/^Describe the map$/));
    expect(document.querySelector('[data-coordgrid-th-describe]').textContent).not.toContain('The treasure is at');
    await click(reveal());
    expect(latest.thFb.msg).toContain('The treasure was at (4, 6)');
    expect(document.querySelector('[data-coordgrid-th-describe]').textContent).toContain('The treasure is at (4, 6).');
  });

  it('chess practice (Play): a second miss names no square until Show the answer', async () => {
    await mount({ cgTab: 'maps', mapScenario: 'chess', chessPracticeOn: true, chessChallenge: { type: 'name', target: 'e4', tries: 1 }, chessChallengeInput: 'h8' });
    const box = inputLabelled('Type the chess notation for the highlighted square');
    await React.act(async () => { box.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
    expect(latest.chessFeedback.correct).toBe(false);
    expect(latest.chessFeedback.msg).not.toContain('e4');
    await click(reveal());
    expect(latest.chessFeedback.msg).toContain('e4');
    expect(latest.chessSelected).toBe('e4');
    expect(paid()).toEqual([]);
  });

  it('every tab draws the hint ladder with the same button', async () => {
    const classes = [];
    for (const st of [{ cgTab: 'explore', cgLevel: 'g6', gridChallenge: { type: 'plot', target: P(2, 3) } }, { cgTab: 'transform', cgLevel: 'g8', tfTask: ROT }, { cgTab: 'patterns', cgLevel: 'g5', ptTask: PAT }, { cgTab: 'treasure', cgLevel: 'g5', thMission: MISSION }]) {
      await mount(st);
      const b = byLabel('Hint');
      expect(b, st.cgTab).toBeTruthy();
      classes.push(b.className + '|' + b.textContent);
    }
    expect(new Set(classes).size).toBe(1);
  });
});

describe('judge Kai: one decision, two tries, never a coin flip', () => {
  it('generated judge items always have at least two steps (three or more choices)', () => {
    for (let s = 1; s <= 300; s++) {
      for (const lv of ['g6', 'g8']) {
        const j = CORE.genJudge(lv, rng(s), {});
        expect(j.proposed.length, JSON.stringify(j)).toBeGreaterThanOrEqual(2);
        expect(CORE.cleanTf(j)).toBeTruthy();
      }
    }
  });

  it('Kai is right: picking a step first is a named miss with no giveaway, then "No step is wrong" pays 2', async () => {
    await mount({ cgTab: 'transform', cgLevel: 'g6', tfTask: JUDGE_YES });
    await click(byText(/^Step 2$/));
    expect(latest.tfTask.done).toBeFalsy();
    expect(latest.tfFb.msg).toContain('Step 2 is not a wrong move.');
    expect(byText(/^Step 2$/).disabled).toBe(true);
    // Kai's image is not drawn yet: it would show that the sequence works.
    expect(svgText().some((s) => s === 'A′')).toBe(false);
    expect(byText(/^Step 1$/).disabled).toBe(false);
    await click(byText(/^No step is wrong: Kai is right$/));
    expect(latest.tfFb.correct).toBe(true);
    expect(latest.judgesSolved).toBe(1);
    expect(paid()).toEqual([['coordinate', 2, 'judge sequence']]);
    expect(svgText().some((s) => s === 'A′')).toBe(true);
  });

  it('Kai is right and the student says so first: full credit', async () => {
    await mount({ cgTab: 'transform', cgLevel: 'g6', tfTask: JUDGE_YES });
    await click(byText(/^No step is wrong: Kai is right$/));
    expect(paid()).toEqual([['coordinate', 5, 'judge sequence']]);
  });

  it('a stage B save in the "which step" stage keeps "Kai is wrong" decided; a one-step save keeps one try', async () => {
    await mount({ cgTab: 'transform', cgLevel: 'g6', tfTask: Object.assign({}, JUDGE_NO, { stage: 'which' }) });
    expect(byText(/^No step is wrong: Kai is right$/).disabled).toBe(true);
    expect(svgText().some((s) => s === 'A′')).toBe(true);
    await click(byText(/^Step 1$/));
    expect(latest.tfFb.correct).toBe(true);
    const one = { type: 'judge', A: TRI, B: [P(6, 2), P(9, 2), P(6, 4)], proposed: [{ kind: 'translate', dx: 2, dy: 5 }], maps: false, wrongStep: 0, slip: 'swapped_vector', fixStep: { kind: 'translate', dx: 5, dy: 1 }, similar: false, tries: 0, hint: 0, stage: 'yesno' };
    await mount({ cgTab: 'transform', cgLevel: 'g6', tfTask: one });
    await click(byText(/^No step is wrong: Kai is right$/));
    expect(latest.tfTask.done).toBe(true); // two choices only: a second try would be a giveaway
  });
});

describe('quest labels translate through the last render', () => {
  it('labels and progress use the translator of the latest render', async () => {
    const hooks = TOOL.questHooks;
    expect(hooks.map((q) => q.id)).toEqual(['plot_3', 'slope_3', 'distance_3', 'streak_5', 'name_3', 'transform_3', 'polygon_3', 'sequence_3', 'pattern_table_3', 'treasure_3']);
    const fr = (k, f) => (k.indexOf('stem.coordgrid.quest_') === 0 ? 'FR:' + f : f);
    await mount({}, { t: fr });
    expect(hooks[0].label).toBe('FR:Solve 3 plot-the-point challenges');
    expect(hooks[0].progress({ plotsSolved: 2 })).toBe('FR:2/3 plotted');
    expect(hooks[9].progress({ treasuresFound: 1 })).toBe('FR:1/3 found');
    expect(hooks[5].check({ reflectsSolved: 2, translatesSolved: 1 })).toBe(true);
    expect(hooks[3].check({ bestStreak: 'x' })).toBe(false);
    await mount({});
    expect(hooks[0].label).toBe('Solve 3 plot-the-point challenges');
  });
});

describe('stage C surfaces: themes, translation, render', () => {
  const STATES = [
    { cgTab: 'explore', cgLevel: 'g5' }, { cgTab: 'explore', cgLevel: 'g6', gridChallenge: { type: 'name', target: P(3, -2), tries: 2 }, revealedItems: { 'name:3,-2': 1 }, gridFeedback: { msg: 'x', revealed: false } },
    { cgTab: 'transform', cgLevel: 'g8', tfTask: Object.assign({}, JUDGE_NO, { excluded: ['none'], tries: 1 }) },
    { cgTab: 'transform', cgLevel: 'g8', tfTask: Object.assign({}, ROT, { done: true, missed: true, pend: { answer: 'A.', stage: null, fb: null } }) },
    { cgTab: 'patterns', cgLevel: 'g6', ptTask: Object.assign({}, PAT, { done: true, missed: true, pend: { answer: 'B.', stage: 'plot', fb: {} } }) },
    { cgTab: 'treasure', cgLevel: 'g5', thMission: Object.assign({}, MISSION, { done: true, digs: [P(1, 1), P(2, 2), P(3, 3)] }), thFb: { msg: 'm', correct: false } },
    { cgTab: 'maps', mapScenario: 'chess', chessPracticeOn: true, chessChallenge: { type: 'find', target: 'b2', tries: 1 }, chessFeedback: { correct: false, msg: 'm' } },
    { cgTab: 'quadHunt', cgLevel: 'g8', pathHidden: true },
  ];

  it('mounts in every theme as student and teacher without console errors; hostile reveal saves are ignored', async () => {
    for (const st of STATES) for (const theme of [{}, { isDark: true }, { isContrast: true }]) {
      await mount(st, Object.assign({ isTeacherMode: !!theme.isDark }, theme));
      expect(document.querySelector('[data-coordgrid-path]'), JSON.stringify(st)).toBeTruthy();
    }
    await mount({ cgTab: 'transform', cgLevel: 'g8', tfTask: Object.assign({}, ROT, { done: true, missed: true, pend: { answer: { x: 1 } } }), cgTeacher: 'bad', pathHidden: 'yes', excluded: 5 });
    expect(reveal()).toBe(null);
    await mount({ cgTab: 'nonsense', cgLevel: 'g8' });
    expect(document.querySelector('#coordinate-section-panel').getAttribute('aria-labelledby')).toBe('coordinate-section-tab-transform');
    expect(errors).toEqual([]);
  });

  it('no visible English escapes t() on the new surfaces', async () => {
    const leaks = new Set();
    for (const st of STATES) {
      await mount(st, { t: () => '§', isTeacherMode: true });
      for (const sel of ['[data-coordgrid-path]', '#coordgrid-tabs-note', '[data-coordgrid-reveal]', '[data-coordgrid-tf]', '[data-coordgrid-teacher]', '[role="tablist"]']) {
        document.querySelectorAll(sel).forEach((el) => {
          const walker = document.createTreeWalker(el, window.NodeFilter.SHOW_TEXT);
          let n;
          while ((n = walker.nextNode())) (n.textContent.match(/[A-Za-z]{3,}/g) || []).forEach((w) => leaks.add(w + ' in ' + sel));
          el.querySelectorAll('[aria-label]').forEach((x) => (String(x.getAttribute('aria-label')).match(/[A-Za-z]{3,}/g) || []).forEach((w) => leaks.add(w + ' @aria ' + sel)));
        });
      }
    }
    expect([...leaks]).toEqual([]);
  });

  it('the Quadrant Hunt no longer prints a developer design note to students', async () => {
    await mount({ cgTab: 'quadHunt' });
    expect(document.body.textContent).not.toMatch(/Design note|discrete 7-state|Widget tells you/);
    expect(document.querySelector('#coordinate-section-panel').textContent).toContain('Move x and y with the sliders');
  });

  it('a curve is compiled once, not on every render', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g8', funcsOn: true, funcs: [{ id: 'f1', expr: '3x-7+0', color: '#4338ca', visible: true }] });
    const cache = window._coordGridFnCache;
    expect(cache && typeof cache.map['3x-7+0']).toBe('function');
    const fn = cache.map['3x-7+0'];
    expect(fn(2)).toBe(-1);
    for (let i = 0; i < 3; i++) await mount(Object.assign({}, latest, { gaTick: i }));
    expect(window._coordGridFnCache.map['3x-7+0']).toBe(fn);
    expect(window._coordGridFnCache.keys.filter((k) => k === '3x-7+0').length).toBe(1);
    expect(document.querySelectorAll('#coordinate-section-panel polyline').length).toBeGreaterThan(0);
  });
});
