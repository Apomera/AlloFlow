// Area & Perimeter Lab stage C (2026-11-03): one teacher grade range for every
// activity, a band-aware "Start here" path and tab order, three more unit pairs
// (mm²/cm², hectares/m², acres/ft²), reading the circle track off the ruler,
// the same hint ladder / second try / reveal in every tab, translated quest
// labels and memoised grids.
// AP_FILE lets the gate checks run against the stage-B file.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const FILE = process.env.AP_FILE || 'stem_lab/stem_tool_areaperimeter.js';
const ID = 'areaPerimeter';
let root = null;

beforeEach(() => {
  resetStemLab();
  document.body.innerHTML = '<div id="root"></div>';
});
afterEach(async () => {
  if (root) await React.act(async () => { root.unmount(); });
  root = null;
  delete window.matchMedia;
});

async function mount(initial, overrides = {}) {
  const tool = loadTool(FILE, ID);
  let latest;
  function App() {
    const [state, setState] = React.useState(initial);
    latest = state;
    return tool.render(makeCtx(Object.assign({ toolData: state, setToolData: setState }, overrides)));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  return () => latest._areaPerimeter || {};
}
function button(label) {
  return [...document.querySelectorAll('button')].find((el) => el.textContent.trim() === label || el.getAttribute('aria-label') === label);
}
async function click(label) {
  const el = button(label);
  expect(el, label).toBeTruthy();
  await React.act(async () => { el.click(); });
}
async function type(el, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await React.act(async () => { setter.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function key(el, k) {
  await React.act(async () => { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); });
}
async function select(id, value) {
  const el = document.getElementById(id);
  expect(el, id).toBeTruthy();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
  await React.act(async () => { setter.call(el, String(value)); el.dispatchEvent(new Event('change', { bubbles: true })); });
}
function reducedMotion() {
  window.matchMedia = (q) => ({ matches: /reduce/.test(q), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
}
function pure() { return window.AreaPerimeterPure; }
const tabIds = () => [...document.querySelectorAll('[role="tab"]')].map((el) => el.id.replace('ap-tab-', ''));
const pathSteps = () => [...document.querySelectorAll('[data-ap-path-step]')].map((el) => el.getAttribute('data-ap-path-step'));
const ALL_MODES = ['explore', 'compare', 'composite', 'investigate', 'fence', 'challenge', 'units', 'circles', 'irregular', 'missions'];

describe('one teacher grade range for every activity', () => {
  it('maps grades to levels and offers only the levels a range allows', () => {
    loadTool(FILE, ID);
    const P = pure();
    expect(P.normalizeRange({})).toEqual({ min: 3, max: 8 });
    expect(P.normalizeRange({ min: 8, max: 3 })).toEqual({ min: 3, max: 8 });
    expect(P.practiceRangeOf({ min: 7, max: 8 })).toEqual({ min: 6, max: 6 });
    // Each grade 3-8 belongs to exactly one level of each activity, and the
    // levels rise with the grade.
    for (const key of ['unitLevel', 'circleLevel', 'blobLevel', 'missionLevel']) {
      let prev = 1;
      for (let g = 3; g <= 8; g += 1) {
        const lv = P.levelForGrade(key, g);
        const hits = P.levelGrades[key].filter(([lo, hi]) => g >= lo && g <= hi).length;
        expect(hits, key + ' grade ' + g).toBe(1);
        expect(lv).toBeGreaterThanOrEqual(prev);
        prev = lv;
      }
      expect(P.allowedLevels(key, { min: 3, max: 8 })).toEqual([1, 2, 3]);
    }
    expect(P.allowedLevels('unitLevel', { min: 3, max: 4 })).toEqual([1]);
    expect(P.allowedLevels('circleLevel', { min: 7, max: 8 })).toEqual([2, 3]);
    expect(P.pickLevel('unitLevel', 3, 4, { min: 3, max: 4 })).toBe(1);
    expect(P.pickLevel('blobLevel', 1, 7, { min: 6, max: 8 })).toBe(3);
    expect(P.pickLevel('missionLevel', 2, 3, { min: 3, max: 8 })).toBe(2);
  });

  it('applies the range to Square Units, Circles, Irregular Shapes and Missions, not only Challenges', () => {
    loadTool(FILE, ID);
    const P = pure();
    const sig = () => document.querySelector('[data-ap-drill]').getAttribute('data-ap-drill-sig');
    // A saved level 3 is outside a grade 3-4 range: the class gets level 1.
    document.body.innerHTML = renderTool(ID, { _areaPerimeter: { mode: 'units', unitLevel: 3, teacherRange: { min: 3, max: 4 } } }, { gradeLevel: '7th Grade' });
    expect(sig()).toBe(P.generateConversion(1, 108).sig);
    expect(document.querySelector('[data-ap-level-fixed="1"]')).toBeTruthy();
    // Grades 7-8: circles offer levels 2 and 3 only.
    document.body.innerHTML = renderTool(ID, { _areaPerimeter: { mode: 'circles', teacherRange: { min: 7, max: 8 } } }, { gradeLevel: '4th Grade' });
    const levels = [...document.querySelectorAll('[role="group"][aria-label="Level"] button')].map((b) => b.textContent);
    expect(levels).toEqual(['Level 2: on level', 'Level 3: stretch']);
    expect(sig()).toBe(P.generateCircle(2, 216).sig);
    document.body.innerHTML = renderTool(ID, { _areaPerimeter: { mode: 'irregular', blobLevel: 1, teacherRange: { min: 6, max: 8 } } });
    expect(document.querySelector('[data-ap-blob]').getAttribute('data-ap-blob')).toMatch(/^b:3:/);
    document.body.innerHTML = renderTool(ID, { _areaPerimeter: { mode: 'missions', missionLevel: 3, teacherRange: { min: 5, max: 6 } } });
    expect(document.querySelector('[data-ap-level-fixed="2"]')).toBeTruthy();
    // Challenges use the part of the range up to grade 6.
    document.body.innerHTML = renderTool(ID, { _areaPerimeter: { mode: 'challenge', teacherRange: { min: 7, max: 8 } } }, { gradeLevel: '3rd Grade' });
    expect(document.querySelector('[data-challenge-grade]').getAttribute('data-challenge-grade')).toBe('6');
  });

  it('has one teacher control: setting the range retires the old fixed level and reports what students can choose', async () => {
    const speak = vi.fn();
    const state = await mount({ _areaPerimeter: { mode: 'units', teacherLevel: 2 } }, { isTeacherMode: true, announceToSR: speak });
    expect(document.getElementById('ap-teacher-level')).toBeNull();
    expect(document.querySelector('[data-ap-legacy-level="2"]')).toBeTruthy();
    expect([...document.querySelectorAll('#ap-teacher-min option')].map((o) => o.value)).toEqual(['3', '4', '5', '6', '7', '8']);
    await select('ap-teacher-min', 7);
    expect(state().teacherRange).toEqual({ min: 7, max: 8 });
    expect(state().teacherLevel).toBe('');
    expect(document.querySelector('[data-ap-legacy-level]')).toBeNull();
    expect(speak.mock.calls.at(-1)[0]).toBe('Grade range set: Grade 7 to Grade 8.');
    const rows = [...document.querySelectorAll('[data-ap-teacher] tbody tr')].map((tr) => tr.textContent);
    expect(rows).toContain('ChallengesGrade 6');
    expect(rows).toContain('Square Unitslevel 3');
    expect(rows).toContain('Circleslevels 2 to 3');
    await select('ap-teacher-max', 4);
    expect(state().teacherRange).toEqual({ min: 4, max: 4 });
  });
});

describe('"Start here" path and tab order by grade band', () => {
  it('gives each band its own short path and puts its core tabs first, keeping every tab', () => {
    loadTool(FILE, ID);
    const cases = [
      ['3rd Grade', 'g3', ['tile', 'fence', 'same_area', 'practice3'], ['explore', 'fence', 'investigate', 'challenge']],
      ['5th Grade', 'g45', ['formulas', 'composite', 'fractions', 'units'], ['challenge', 'composite', 'units']],
      ['7th Grade', 'g67', ['shapes6', 'circles', 'circle_drill', 'irregular', 'missions'], ['challenge', 'circles', 'irregular', 'missions']],
    ];
    for (const [grade, band, steps, core] of cases) {
      // 2026-11-04: the step list and the non-core tabs are folded by default
      // (a "Next" line, "More activities"); open both to check the full order.
      document.body.innerHTML = renderTool(ID, { _areaPerimeter: { mode: 'explore', pathOpen: true, moreTabsOpen: true } }, { gradeLevel: grade });
      expect(document.querySelector('[data-ap-path]').getAttribute('data-ap-path'), grade).toBe(band);
      expect(pathSteps()).toEqual(steps);
      expect(steps.length).toBeGreaterThanOrEqual(3);
      expect(steps.length).toBeLessThanOrEqual(6);
      const tabs = tabIds();
      expect(tabs.slice(0, core.length)).toEqual(core);
      expect([...tabs].sort()).toEqual([...ALL_MODES].sort());
      expect([...document.querySelectorAll('[data-ap-core="yes"]')].map((el) => el.id.replace('ap-tab-', ''))).toEqual(core);
    }
    // The band follows the teacher's range when the host grade is outside it.
    document.body.innerHTML = renderTool(ID, { _areaPerimeter: { teacherRange: { min: 6, max: 8 } } }, { gradeLevel: '3rd Grade' });
    expect(document.querySelector('[data-ap-path]').getAttribute('data-ap-path')).toBe('g67');
  });

  it('ticks steps from the progress the tool already keeps', () => {
    loadTool(FILE, ID);
    const P = pure();
    const s = {
      revealedBest: 24, fenceChecked: { 20: 'square' }, targetsExplored: { 12: true, 18: true },
      solvedChallenges: { 'g:tile_area:3-4': true, 'g:rect_perimeter:4-5': true, 'g:triangle_area:6-4-0': true },
    };
    expect(P.pathStepProgress('tile', s)).toEqual({ have: 20, need: 20, done: true });
    expect(P.pathStepProgress('fence', s).done).toBe(true);
    expect(P.pathStepProgress('same_area', s)).toEqual({ have: 2, need: 3, done: false });
    expect(P.pathStepProgress('practice3', s)).toEqual({ have: 2, need: 3, done: false });
    expect(P.pathStepProgress('shapes6', s).have).toBe(1);
    expect(P.pathStepProgress('units', { drillSolved: { 'u:m_cm:down:300': true, 'u:yd_ft:down:200': true, 'c:area_from_r:4': true } }).done).toBe(true);
    expect(P.pathStepProgress('circle_drill', { drillSolved: { 'c:area_from_r:4': true } }).have).toBe(1);
    expect(P.pathStepProgress('circles', { circleAwarded: { claim: true } }).done).toBe(true);
    expect(P.pathStepProgress('irregular', { blobSolved: { 'b:2:5': true } }).done).toBe(true);
    expect(P.pathStepProgress('missions', {}).done).toBe(false);
    document.body.innerHTML = renderTool(ID, { _areaPerimeter: { ...s, pathOpen: true } }, { gradeLevel: '3rd Grade' });
    const done = [...document.querySelectorAll('[data-ap-path-step]')].map((el) => el.getAttribute('data-ap-done'));
    expect(done).toEqual(['yes', 'yes', 'no', 'no']);
    expect(document.querySelector('[data-ap-path-count]').textContent).toBe('2 of 4 steps done.');
    // Status words, not colour alone, and the next step is named.
    expect(document.querySelector('[data-ap-path-step="same_area"]').textContent).toContain('Next step. 2 of 3');
    expect(document.querySelector('[data-ap-path-step="tile"]').textContent).toContain('Done');
  });

  it('opens a step, starting fresh practice at the step’s grade, and hides for a locked student', async () => {
    const state = await mount({ _areaPerimeter: { mode: 'explore' } }, { gradeLevel: '5th Grade' });
    // 2026-11-04: the list starts folded behind "Show all steps".
    expect(document.querySelector('[data-ap-action="path-toggle"]').getAttribute('aria-expanded')).toBe('false');
    await click('Show all steps');
    await click('Open step 3: Fraction side lengths');
    expect(state().mode).toBe('challenge');
    expect(state().genGrade).toBe(5);
    expect(['frac_area', 'mixed_area', 'frac_perimeter']).toContain(state().genType);
    expect(document.querySelector('[data-challenge-grade]').getAttribute('data-challenge-grade')).toBe('5');
    expect(button('You are on step 3: Fraction side lengths').disabled).toBe(true);
    await click('Open step 4: Square units');
    expect(state().mode).toBe('units');
    const toggle = document.querySelector('[data-ap-action="path-toggle"]');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    await click('Hide all steps');
    expect(document.getElementById('ap-path-list')).toBeNull();
    expect(state().pathOpen).toBe(false);
    await click('Show all steps');
    expect(document.getElementById('ap-path-list')).toBeTruthy();
    loadTool(FILE, ID);
    document.body.innerHTML = renderTool(ID, { _areaPerimeter: { teacherLockMode: 'fence' } });
    expect(document.querySelector('[data-ap-path]')).toBeNull();
    document.body.innerHTML = renderTool(ID, { _areaPerimeter: { teacherLockMode: 'fence' } }, { isTeacherMode: true });
    expect(document.querySelector('[data-ap-path]')).toBeTruthy();
  });
});

describe('more square-unit pairs', () => {
  it('converts mm²/cm², hectares/m² and acres/ft² with exact factors and named slips', () => {
    loadTool(FILE, ID);
    const P = pure();
    expect(P.unitPairs.cm_mm.factor).toBe(100);
    expect(P.unitPairs.ha_m.factor).toBe(100 * 100);
    expect(P.unitPairs.acre_ft.factor).toBe(43560);
    expect(660 * 66).toBe(P.unitPairs.acre_ft.factor);
    const seen = { 1: new Set(), 2: new Set(), 3: new Set() };
    for (const level of [1, 2, 3]) for (let seed = 1; seed <= 400; seed += 1) {
      const p = P.generateConversion(level, seed);
      seen[level].add(p.pair);
      const f = P.unitPairs[p.pair].factor;
      expect(Math.abs(p.answer - (p.dir === 'down' ? p.value * f : p.value / f)) < 1e-6, p.sig).toBe(true);
      expect(P.diagnoseConversion(p, p.dir === 'down' ? p.value / f : p.value * f)).toBe('wrong_direction');
      if (p.pair === 'acre_ft') {
        expect(P.diagnoseConversion(p, p.dir === 'down' ? p.value * 726 : p.value / 726)).toBe('two_sides');
        expect(p.traps.some((tr) => tr.id === 'linear_factor')).toBe(false);
      }
      if (p.pair === 'cm_mm' || p.pair === 'ha_m') expect(p.traps.some((tr) => tr.id === 'metric_factor')).toBe(false);
    }
    expect([...seen[1]].sort()).toEqual(['cm_mm', 'ft_in', 'yd_ft']);
    expect([...seen[2]].sort()).toEqual(['cm_mm', 'ft_in', 'ha_m', 'm_cm', 'yd_ft']);
    expect([...seen[3]].sort()).toEqual(['acre_ft', 'cm_mm', 'ft_in', 'ha_m', 'm_cm', 'yd_ft']);
    expect(P.parseBigAnswer('43,560')).toBe(43560);
  });

  it('draws mm in cm as a full 10 by 10 grid, and says so when a picture is scaled', async () => {
    const state = await mount({ _areaPerimeter: { mode: 'units', unitPair: 'cm_mm' } });
    await type(document.getElementById('ap-unit-predict'), '10');
    await click('Check my prediction');
    expect(document.querySelector('[data-ap-unit-verdict]').getAttribute('data-ap-unit-verdict')).toBe('linear_factor');
    const cm = document.querySelector('[data-ap-unit-square="cm_mm"]');
    expect(cm.querySelectorAll('line').length).toBe(18); // 9 inner lines each way: 100 squares, all drawn
    expect(cm.getAttribute('data-ap-unit-scaled')).toBeNull();
    expect(state().mistakeCounts.linear_factor).toBe(1);

    await click('1 ha in m²');
    expect(document.getElementById('ap-unit-predict').closest('label').textContent).toContain('A hectare is a square 100 m on each side');
    await type(document.getElementById('ap-unit-predict'), '100');
    await click('Check my prediction');
    expect(document.querySelector('[data-ap-unit-verdict]').getAttribute('data-ap-unit-verdict')).toBe('linear_factor');
    const ha = document.querySelector('[data-ap-unit-square="ha_m"]');
    expect(ha.getAttribute('data-ap-unit-scaled')).toBe('blocks');
    expect(document.querySelector('[data-ap-unit-scale-note]').textContent).toContain('10000 small squares are too many to draw one by one');
    expect(ha.querySelector('desc').textContent).toContain('100 × 100 = 10000 m²');
    expect(ha.textContent).not.toMatch(/ha²/);

    await click('1 acre in ft²');
    await type(document.getElementById('ap-unit-predict'), '726');
    await click('Check my prediction');
    expect(document.querySelector('[data-ap-unit-verdict]').getAttribute('data-ap-unit-verdict')).toBe('two_sides');
    const acre = document.querySelector('[data-ap-unit-square="acre_ft"]');
    expect(acre.getAttribute('data-ap-unit-scaled')).toBe('strip');
    const noteText = document.querySelector('[data-ap-unit-scale-note]').textContent;
    expect(noteText).toContain('43560 squares are too many to draw');
    expect(noteText).toContain('66 × 66 = 4356 ft²');
    expect(acre.querySelector('title').textContent).toBe('One acre, filled with square feet');
    expect(state().mistakeCounts.two_sides).toBe(1);
  });

  it('asks acre and hectare drill questions in named units, with matching mistakes, hints and steps', async () => {
    loadTool(FILE, ID);
    const P = pure();
    let seed = 1;
    while (seed < 500 && P.generateConversion(3, seed).pair !== 'acre_ft') seed += 1;
    const p = P.generateConversion(3, seed);
    expect(p.pair).toBe('acre_ft');
    const state = await mount({ _areaPerimeter: { mode: 'units', unitLevel: 3, drills: { units: { seed, level: 3 } } } });
    const prompt = document.querySelector('[data-ap-drill-prompt]').textContent;
    expect(prompt).toContain('acres');
    expect(prompt).not.toMatch(/acre²|acres²/);
    await type(document.getElementById('ap-drill-units'), String(p.dir === 'down' ? p.value * 726 : p.value / 726));
    await click('Check answer');
    const fb = document.querySelector('[data-ap-drill-feedback]');
    expect(fb.getAttribute('data-ap-mistake')).toBe('two_sides');
    expect(fb.textContent).toContain('660 + 66 = 726 is a length');
    expect(document.querySelector('[data-ap-drill="units"] [data-ap-unit-square="acre_ft"]')).toBeTruthy();
    await click('Show hint'); await click('Show hint'); await click('Show hint');
    expect(document.querySelector('[data-ap-drill-hints]').textContent).toContain('660 × 66');
    await type(document.getElementById('ap-drill-units'), String(p.answer));
    await click('Check answer');
    expect(document.querySelector('[data-ap-drill-feedback]').getAttribute('data-ap-drill-feedback')).toBe('correct');
    expect(document.querySelector('[data-ap-drill-solution]').textContent).toContain('1 acre = 660 × 66 = 43560 ft²');
    expect(state().drillSolved[p.sig]).toBe(true);
  });
});

describe('circle roll: read the track off the ruler', () => {
  it('has a ruler for every circle with a one-small-mark tolerance and named misreadings', () => {
    loadTool(FILE, ID);
    const P = pure();
    for (const o of P.circleObjects) {
      const r = P.rulerFor(o.id);
      expect(r.max).toBeGreaterThan(r.c);
      expect(Math.round(r.major / r.minor) * r.minor).toBeCloseTo(r.major, 9);
      const near = P.snapReading(r, r.c);
      expect(Math.abs(near - r.c)).toBeLessThanOrEqual(r.minor / 2 + 1e-9);
      expect(P.checkReading(o.id, near), o.id).toBe('correct');
      expect(P.checkReading(o.id, String(near))).toBe('correct');
      // Two small marks away is outside the tolerance.
      expect(P.checkReading(o.id, near - 2 * r.minor)).not.toBe('correct');
      expect(P.checkReading(o.id, o.d)).toBe('read_diameter');
      expect(P.checkReading(o.id, near + r.major)).toBe('read_major_slip');
      expect(P.checkReading(o.id, near - 3 * r.minor)).toBe('read_close_short');
      expect(P.checkReading(o.id, r.c * 0.5)).toBe('read_short');
      expect(P.markerPlace(r, near)).toBe('end');
      expect(P.markerPlace(r, 0)).toBe('on');
      expect(P.markerPlace(r, r.max)).toBe('past');
      expect(P.snapReading(r, 1e9)).toBe(r.max);
      expect(P.snapReading(r, -5)).toBe(0);
      // C ÷ d is computed from the learner's own reading.
      expect(P.checkRatio(o.d, (near / o.d).toFixed(2), near)).toBe('correct');
    }
    expect(P.checkReading('coin', 'abc')).toBeNull();
  });

  it('moves a ruler marker by keyboard and pointer, with spoken positions, and checks the typed reading', async () => {
    reducedMotion();
    const P = pure();
    const state = await mount({ _areaPerimeter: { mode: 'circles', circleClaim: 'same', circleObject: 'lid' } });
    await click('Roll it one full turn');
    const r = P.rulerFor('lid');
    // Nothing states the length: the learner has to read it.
    expect(document.body.textContent).not.toMatch(/track: \d|The track is \d|cm long/);
    expect(document.querySelector('[data-ap-track-end]')).toBeTruthy();
    expect(document.getElementById('ap-circle-ratio')).toBeNull();
    let marker = document.querySelector('[role="slider"][data-ap-marker]');
    expect(marker.getAttribute('aria-label')).toBe('Ruler marker');
    expect(marker.getAttribute('aria-valuetext')).toBe('Ruler marker at 0 cm, on the track.');
    await key(marker, 'ArrowRight');
    expect(state().circleRead.lid.marker).toBeCloseTo(r.minor, 9);
    await key(document.querySelector('[data-ap-marker]'), 'PageUp');
    expect(state().circleRead.lid.marker).toBeCloseTo(r.minor + r.major, 9);
    await key(document.querySelector('[data-ap-marker]'), 'End');
    marker = document.querySelector('[data-ap-marker]');
    expect(marker.getAttribute('aria-valuenow')).toBe(String(r.max));
    expect(marker.getAttribute('aria-valuetext')).toContain('past the end of the track');
    // Pointer: a click on the ruler at the track end puts the marker there.
    const svg = document.querySelector('[data-ap-roll]');
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 300, right: 640, bottom: 300 });
    const hit = document.querySelector('[data-ap-ruler-hit]');
    await React.act(async () => { hit.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.x0 + r.c * r.scale })); });
    const near = P.snapReading(r, r.c);
    expect(state().circleRead.lid.marker).toBeCloseTo(near, 9);
    expect(document.querySelector('[data-ap-marker]').getAttribute('aria-valuetext')).toBe('Ruler marker at ' + near + ' cm, at the end of the track.');
    // A wrong reading: named feedback and a second try, no reveal yet.
    await type(document.getElementById('ap-circle-reading'), '7');
    await click('Check my reading');
    expect(document.querySelector('[data-ap-read]').getAttribute('data-ap-read')).toBe('read_diameter');
    expect(document.querySelector('[data-ap-read]').textContent).toContain('second try');
    expect(button('Show the reading')).toBeUndefined();
    await type(document.getElementById('ap-circle-reading'), String(near));
    await click('Check my reading');
    expect(state().circleRead.lid.value).toBe(near);
    expect(document.querySelector('[data-ap-read]').getAttribute('data-ap-read')).toBe('correct');
    expect(document.getElementById('ap-circle-ratio')).toBeTruthy();
    expect(document.getElementById('ap-roll-desc').textContent).toContain('You read the track it left as ' + near + ' cm');
    await type(document.getElementById('ap-circle-ratio'), (near / 7).toFixed(2));
    await click('Check and record');
    expect(state().circleRecords.lid).toBe(true);
    expect(state().mistakeCounts.read_diameter).toBe(1);
    const row = [...document.querySelectorAll('tbody tr')].find((tr) => tr.textContent.startsWith('Jar lid'));
    expect(row.textContent).toContain(near + ' cm');
    expect(row.textContent).toContain((near / 7).toFixed(2));
  });

  it('offers the reading and the division only after two tries, with no points', async () => {
    reducedMotion();
    const P = pure();
    const awardXP = vi.fn();
    const state = await mount({ _areaPerimeter: { mode: 'circles', circleClaim: 'same', circleObject: 'plate', circleRolled: { plate: true } } }, { awardXP });
    await click('Show hint');
    expect(document.querySelector('#ap-reading-hint').getAttribute('data-ap-hint-ladder')).toBe('1');
    for (const wrong of ['40', '50']) {
      await type(document.getElementById('ap-circle-reading'), wrong);
      await click('Check my reading');
    }
    expect(document.querySelector('[data-ap-read]').textContent).toContain('show the reading');
    await click('Show the reading');
    const shown = P.snapReading(P.rulerFor('plate'), P.rulerFor('plate').c);
    expect(state().circleRead.plate).toMatchObject({ value: shown, revealed: true });
    expect(document.querySelector('[data-ap-read]').getAttribute('data-ap-read')).toBe('revealed');
    for (const wrong of ['3', '4']) {
      await type(document.getElementById('ap-circle-ratio'), wrong);
      await click('Check and record');
    }
    expect(button('Show the division')).toBeTruthy();
    await click('Show the division');
    expect(state().circleRecords.plate).toBe(true);
    expect(state().circleRatioRevealed.plate).toBe(true);
    expect(document.querySelector('[data-ap-ratio]').textContent).toContain('without points');
    expect(awardXP).not.toHaveBeenCalled();
  });

  it('keeps a reveal off when the teacher turns reveals off', async () => {
    reducedMotion();
    await mount({ _areaPerimeter: { mode: 'circles', circleClaim: 'same', circleObject: 'coin', circleRolled: { coin: true }, teacherNoReveal: true, circleRead: { coin: { tries: 3, verdict: 'read_short' } } } });
    expect(button('Show the reading')).toBeUndefined();
    expect(document.querySelector('[data-ap-read]').textContent).toContain('Try again or use a hint.');
  });
});

describe('the same try / hint / reveal pattern in every tab', () => {
  it('Irregular Shapes: hint ladder, second try, then “Show the adding” without points', async () => {
    loadTool(FILE, ID);
    const P = pure();
    const blob = P.generateBlob(1, 31);
    const marks = {};
    for (const c of blob.cells) if (c.cover >= 0.97) marks[c.key] = 'full'; else if (c.cover >= 0.03) marks[c.key] = 'half';
    const own = P.blobMarkCounts(blob, marks);
    const awardXP = vi.fn();
    const state = await mount({ _areaPerimeter: { mode: 'irregular', blobLevel: 1, blobSeed: 31, blobMarks: { sig: blob.sig, marks } } }, { awardXP });
    await click('Show hint');
    expect(document.getElementById('ap-blob-hint').textContent).toContain('whole (1)');
    await type(document.getElementById('ap-blob-estimate'), String(own.full + own.half));
    await click('Check my estimate');
    expect(document.querySelector('[data-ap-blob-feedback]').textContent).toContain('second try');
    expect(button('Show the adding')).toBeUndefined();
    await type(document.getElementById('ap-blob-estimate'), String(own.full));
    await click('Check my estimate');
    await click('Show the adding');
    expect(document.querySelector('[data-ap-blob-revealed="yes"]')).toBeTruthy();
    expect(document.body.textContent).toContain(blob.exactText);
    expect(state().blobRevealed[blob.sig]).toBe(true);
    expect(state().blobSolved || {}).not.toHaveProperty(blob.sig);
    expect(button('Check my estimate').disabled).toBe(true);
    expect(awardXP).not.toHaveBeenCalled();
  });

  it('Design Missions: the same hint ladder as the drills', async () => {
    await mount({ _areaPerimeter: { mode: 'missions' } });
    await click('Show hint');
    const ladder = document.getElementById('ap-mission-hint');
    expect(ladder.getAttribute('data-ap-hint-ladder')).toBe('1');
    expect(ladder.textContent).toContain('perimeter must equal the fence length');
    // Same markup and style as the drill and challenge ladders.
    loadTool(FILE, ID);
    const P = pure();
    const m = P.generateGardenMission(2, 63);
    document.body.innerHTML = renderTool(ID, { _areaPerimeter: { mode: 'missions', missionLevel: 2, missions: { garden: { seed: 63, level: 2, sig: m.sig, hint: 1 } } } });
    const missionStyle = document.getElementById('ap-mission-hint').getAttribute('style');
    document.body.innerHTML = renderTool(ID, { _areaPerimeter: { mode: 'units', drills: { units: { seed: 108, level: 1, sig: P.generateConversion(1, 108).sig, hintStep: 1 } } } }, { gradeLevel: '3rd Grade' });
    expect(document.querySelector('[data-ap-drill-hints]').getAttribute('style')).toBe(missionStyle);
    document.body.innerHTML = renderTool(ID, { _areaPerimeter: { mode: 'challenge', genGrade: 4, genType: 'rect_area', genSeed: 11, itemSig: P.generateProblem(4, 'rect_area', 11).sig, hintStep: 1 } });
    expect(document.getElementById('ap-challenge-hint').getAttribute('style')).toBe(missionStyle);
  });
});

describe('quest labels and memoised grids', () => {
  it('translates quest labels and progress with the last render’s translator', () => {
    loadTool(FILE, ID);
    const tool = window.StemLab._registry[ID];
    expect(tool.questHooks[0].label).toBe('Reveal 20 unit squares');
    const t = (k, f) => (k.indexOf('stem.areaperimeter.quest_') === 0 ? '«' + f + '»' : f);
    renderTool(ID, { _areaPerimeter: {} }, { t });
    expect(tool.questHooks.map((q) => q.label)).toEqual(['«Reveal 20 unit squares»', '«Explore 5 lab modes»', '«Solve 5 practice problems»', '«Investigate 3 target areas»', '«Use both composite-shape strategies»']);
    expect(tool.questHooks[0].progress({ revealedBest: 7 })).toBe('«7/20 tiles»');
    renderTool(ID, { _areaPerimeter: {} });
    expect(tool.questHooks[1].progress({ modeVisits: { explore: true } })).toBe('1/5 modes');
  });

  it('runs the current handler when a skipped rebuild left old cells in place', async () => {
    // Checking the prediction changes what a tile click announces but not what
    // the cells show, so the grid is not rebuilt; the click must still use the
    // new state ("of 20", not "so far").
    const speak = vi.fn();
    await mount({ _areaPerimeter: { mode: 'explore', width: 5, height: 4, predictMeasurements: true } }, { announceToSR: speak });
    await type(document.getElementById('ap-predict-area'), '20');
    await type(document.getElementById('ap-predict-perimeter'), '18');
    await click('Check my prediction');
    await React.act(async () => { document.querySelector('[data-ap-tile="0-0"]').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(speak.mock.calls.at(-1)[0]).toBe('Revealed the unit square at column 1, row 1. 1 of 20 revealed.');
  });

  it('keeps tile and blob cells live after unrelated typing skips their rebuild', async () => {
    const state = await mount({ _areaPerimeter: { mode: 'explore', width: 5, height: 4, predictMeasurements: true } });
    const firstCell = document.querySelector('[data-ap-tile="0-0"]');
    await type(document.getElementById('ap-predict-area'), '20');
    // The memoised grid kept the same DOM node while the rest re-rendered.
    expect(document.querySelector('[data-ap-tile="0-0"]')).toBe(firstCell);
    await React.act(async () => { document.querySelector('[data-ap-tile="1-0"]').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await type(document.getElementById('ap-predict-perimeter'), '18');
    await React.act(async () => { document.querySelector('[data-ap-tile="2-1"]').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(Object.keys(state().revealedTiles).sort()).toEqual(['1-0', '2-1']);
    expect(state().predictArea).toBe('20');
    expect(document.querySelector('[data-ap-tile="2-1"]').getAttribute('aria-pressed')).toBe('true');
  });
});

describe('saved state', () => {
  it('survives hostile or half-written stage-C state', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    loadTool(FILE, ID);
    const hostile = {
      teacherRange: { min: 'a', max: 99 }, teacherLevel: 7, pathHidden: 'yes', circleRead: { coin: { value: 'abc', marker: 'zz', tries: -3, verdict: 'bogus', hint: 99, typed: { a: 1 } }, plate: 5 },
      circleRatioTries: [1], circleRatioRevealed: 'x', circleObject: 'coin', circleClaim: 'same', circleRolled: { coin: true },
      blobAttempt: 5, blobRevealed: [3], unitPair: 'acre_ft', unitPredictChecked: { acre_ft: 'zz' }, missions: { garden: { hint: 'lots' } },
    };
    for (const mode of ALL_MODES) for (const look of [{}, { isTeacherMode: true }, { isDark: true }]) {
      const html = renderTool(ID, { _areaPerimeter: { ...hostile, mode } }, look);
      expect(html, mode).toContain('Area &amp; Perimeter Lab');
      expect(html, mode).not.toMatch(/undefined|NaN|\[object Object\]|Infinity/);
    }
    expect(errors.mock.calls.map((c) => String(c[0]).slice(0, 200))).toEqual([]);
    errors.mockRestore();
  });
});
