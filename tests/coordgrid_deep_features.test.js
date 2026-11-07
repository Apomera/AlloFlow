// Coordinate Grid deep pass (2026-11-03): the task engine (run, not grepped), grade
// bands, two-try misconception feedback, predict-then-check, teacher hooks, the
// keyboard grid cursor, "describe my points", the shared graph core and i18n.
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.COORDGRID_DEEP_FILE || 'stem_lab/stem_tool_coordgrid.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root = null, latest = null, xp = [], sr = [], errors = [], CORE = null;
beforeEach(() => {
  resetStemLab();
  CORE = loadTool(FILE, 'coordinate')._core;
  latest = null; xp = []; sr = []; errors = [];
  vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ').slice(0, 300)); });
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null;
  if (window._coordGridKeyHandler) { window.removeEventListener('keydown', window._coordGridKeyHandler); window._coordGridKeyHandler = null; }
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
const click = async (el) => { await React.act(async () => { el.click(); }); };
async function type(el, value) {
  await React.act(async () => {
    const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}
async function key(el, k, extra) {
  await React.act(async () => { el.dispatchEvent(new window.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, extra || {}))); });
}
const byText = (re) => [...document.querySelectorAll('button')].find((b) => re.test(b.textContent.trim()));
const byLabel = (l) => document.querySelector('button[aria-label="' + l + '"]');
const input = (l) => document.querySelector('input[aria-label="' + l + '"]');
const paid = () => xp.filter((x) => x[0] === 'coordinate');
const svgText = () => [...document.querySelectorAll('#coordinate-section-panel svg text')].map((t) => t.textContent);
// Deterministic generator for the engine sweeps.
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

describe('engine: grade bands', () => {
  it('maps grade levels to the three bands', () => {
    expect(CORE.bandFor('5th Grade')).toBe('g5');
    expect(CORE.bandFor('3rd Grade')).toBe('g5');
    expect(CORE.bandFor('Kindergarten')).toBe('g5');
    expect(CORE.bandFor('6th Grade')).toBe('g6');
    expect(CORE.bandFor('7th Grade')).toBe('g6');
    expect(CORE.bandFor('8th Grade')).toBe('g8');
    expect(CORE.bandFor('11th Grade')).toBe('g8');
    expect(CORE.bandFor('College')).toBe('g8');
    expect(CORE.bandFor('', 'g912')).toBe('g8');
    expect(CORE.bandFor('', 'g35')).toBe('g5');
    expect(CORE.bandFor('', undefined)).toBe('g6');
  });

  it('grade 5 stays in quadrant I; grade 6 uses four quadrants; slope is grade 8', () => {
    for (let s = 1; s <= 300; s++) {
      for (const tp of ['plot', 'name']) {
        const a = CORE.generate(tp, 'g5', rng(s));
        expect(a.target.x >= 0 && a.target.x <= 10 && a.target.y >= 0 && a.target.y <= 10, JSON.stringify(a)).toBe(true);
        expect(a.target.x).not.toBe(a.target.y);
        expect(a.view).toBe('q1');
      }
      const tr = CORE.generate('translate', 'g5', rng(s));
      for (const p of [tr.p, tr.answer]) expect(p.x >= 0 && p.x <= 10 && p.y >= 0 && p.y <= 10, JSON.stringify(tr)).toBe(true);
      expect(tr.answer).toEqual({ x: tr.p.x + tr.v.dx, y: tr.p.y + tr.v.dy });
      const d5 = CORE.generate('distance', 'g5', rng(s));
      expect(d5.kind).toBe('axis');
      expect(d5.p1.x === d5.p2.x || d5.p1.y === d5.p2.y).toBe(true);
      expect(Math.min(d5.p1.x, d5.p1.y, d5.p2.x, d5.p2.y)).toBeGreaterThanOrEqual(0);
      const pg = CORE.generate('polygon', 'g5', rng(s));
      expect(pg.shape).toBe('rect');
      for (const v of pg.vertices) expect(v.x >= 0 && v.x <= 10 && v.y >= 0 && v.y <= 10).toBe(true);
    }
    expect(CORE.inLevel('g5', 'reflect')).toBe(false);
    expect(CORE.inLevel('g6', 'reflect')).toBe(true);
    expect(CORE.inLevel('g6', 'slope')).toBe(false);
    expect(CORE.inLevel('g8', 'slope')).toBe(true);
  });

  it('grade 6 distances run along a grid line (half cross an axis); grade 8 needs Pythagoras', () => {
    let crossed = 0;
    for (let s = 1; s <= 300; s++) {
      const d6 = CORE.generate('distance', 'g6', rng(s));
      expect(d6.kind).toBe('axis');
      const u = d6.p1.x === d6.p2.x ? [d6.p1.y, d6.p2.y] : [d6.p1.x, d6.p2.x];
      expect(d6.distance).toBe(Math.abs(u[1] - u[0]));
      if (u[0] * u[1] < 0) crossed++;
      const d8 = CORE.generate('distance', 'g8', rng(s));
      expect(d8.kind).toBe('pythag');
      expect(d8.p1.x !== d8.p2.x && d8.p1.y !== d8.p2.y).toBe(true);
      expect(d8.distance).toBe(Math.round(Math.hypot(d8.p2.x - d8.p1.x, d8.p2.y - d8.p1.y) * 10) / 10);
    }
    expect(crossed).toBeGreaterThan(60);
  });
});

describe('engine: misconception diagnosis', () => {
  it('ordered pairs', () => {
    const t = { x: 3, y: -5 };
    expect(CORE.diagnosePoint({ x: 3, y: -5 }, t)).toBe('correct');
    expect(CORE.diagnosePoint({ x: -5, y: 3 }, t)).toBe('swapped');
    expect(CORE.diagnosePoint({ x: -3, y: 5 }, t)).toBe('sign_both');
    expect(CORE.diagnosePoint({ x: -3, y: -5 }, t)).toBe('sign_x');
    expect(CORE.diagnosePoint({ x: 3, y: 5 }, t)).toBe('sign_y');
    expect(CORE.diagnosePoint({ x: 4, y: -5 }, t)).toBe('off_by_one');
    expect(CORE.diagnosePoint({ x: 0, y: 0 }, t)).toBe('other');
  });

  it('every reflection slip is told apart on every generated item', () => {
    for (let s = 1; s <= 300; s++) {
      const it = CORE.generate('reflect', 'g8', rng(s));
      const p = it.p;
      expect(CORE.diagnoseReflect(it.answer, it)).toBe('correct');
      expect(CORE.diagnoseReflect(p, it)).toBe('no_change');
      expect(CORE.diagnoseReflect({ x: p.y, y: p.x }, it)).toBe('swapped');
      if (it.axis === 'x') { expect(CORE.diagnoseReflect({ x: -p.x, y: p.y }, it)).toBe('wrong_axis'); expect(CORE.diagnoseReflect({ x: -p.x, y: -p.y }, it)).toBe('both_flipped'); }
      if (it.axis === 'y') { expect(CORE.diagnoseReflect({ x: p.x, y: -p.y }, it)).toBe('wrong_axis'); expect(CORE.diagnoseReflect({ x: -p.x, y: -p.y }, it)).toBe('both_flipped'); }
      if (it.axis === 'origin') expect(CORE.diagnoseReflect({ x: p.x, y: -p.y }, it)).toBe('one_flipped');
    }
  });

  it('translations', () => {
    const it = { type: 'translate', p: { x: -1, y: 4 }, v: { dx: 3, dy: -5 }, answer: { x: 2, y: -1 } };
    expect(CORE.diagnoseTranslate({ x: 2, y: -1 }, it)).toBe('correct');
    expect(CORE.diagnoseTranslate({ x: -6, y: 7 }, it)).toBe('swapped_vector');
    expect(CORE.diagnoseTranslate({ x: -4, y: 9 }, it)).toBe('opposite');
    expect(CORE.diagnoseTranslate({ x: -4, y: -1 }, it)).toBe('one_direction');
    expect(CORE.diagnoseTranslate({ x: 2, y: 4 }, it)).toBe('one_coordinate');
    expect(CORE.diagnoseTranslate({ x: -1, y: 4 }, it)).toBe('no_change');
  });

  it('distances', () => {
    const across = { type: 'distance', kind: 'axis', p1: { x: -3, y: 2 }, p2: { x: 4, y: 2 }, distance: 7 };
    expect(CORE.diagnoseDistance(7, across)).toBe('correct');
    expect(CORE.diagnoseDistance(1, across)).toBe('subtracted_across_axis');
    expect(CORE.diagnoseDistance(8, across)).toBe('counted_points');
    expect(CORE.diagnoseDistance(-7, across)).toBe('negative');
    const sameSide = { type: 'distance', kind: 'axis', p1: { x: 2, y: 1 }, p2: { x: 2, y: 6 }, distance: 5 };
    expect(CORE.diagnoseDistance(7, sameSide)).toBe('added_same_side');
    const py = { type: 'distance', kind: 'pythag', p1: { x: 0, y: 0 }, p2: { x: 3, y: 4 }, distance: 5 };
    expect(CORE.diagnoseDistance(5.04, py)).toBe('correct');
    expect(CORE.diagnoseDistance(7, py)).toBe('added_legs');
    expect(CORE.diagnoseDistance(25, py)).toBe('no_sqrt');
    expect(CORE.diagnoseDistance(4, py)).toBe('one_leg');
  });

  it('slopes: either direction counts; slips are named', () => {
    const cs = CORE.slopeOf({ x: 1, y: 2 }, { x: 4, y: 8 });
    expect(CORE.gradeSlope(6, 3, '2', cs).allCorrect).toBe(true);
    expect(CORE.gradeSlope(-6, -3, '2', cs).allCorrect).toBe(true);
    expect(CORE.gradeSlope(-6, 3, '-2', cs).code).toBe('mixed_direction');
    expect(CORE.gradeSlope(3, 6, '1/2', cs).code).toBe('rise_run_swapped');
    expect(CORE.gradeSlope(6, 3, '1/2', cs).code).toBe('reciprocal');
    expect(CORE.gradeSlope(6, 3, '-2', cs).code).toBe('slope_sign');
    expect(CORE.gradeSlope(6, 3, '3', cs).code).toBe('slope_from_pair');
    const vert = CORE.slopeOf({ x: 3, y: 1 }, { x: 3, y: 5 });
    expect(CORE.gradeSlope(-4, 0, 'Undefined', vert).allCorrect).toBe(true);
  });

  it('polygon area and perimeter match an independent count of unit squares', () => {
    const inside = (vs, px, py) => { let c = false; for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) { const a = vs[i], b = vs[j]; if ((a.y > py) !== (b.y > py) && px < (b.x - a.x) * (py - a.y) / (b.y - a.y) + a.x) c = !c; } return c; };
    for (let s = 1; s <= 200; s++) {
      const it = CORE.generate('polygon', 'g6', rng(s));
      if (it.shape === 'tri') { expect(it.area).toBe(it.w * it.h / 2); expect(it.ask).toBe('area'); continue; }
      let squares = 0;
      for (let x = -10; x < 10; x++) for (let y = -10; y < 10; y++) if (inside(it.vertices, x + 0.5, y + 0.5)) squares++;
      expect(it.area, JSON.stringify(it.vertices)).toBe(squares);
      let per = 0;
      it.vertices.forEach((v, i) => { const w = it.vertices[(i + 1) % it.vertices.length]; per += Math.abs(w.x - v.x) + Math.abs(w.y - v.y); });
      expect(it.perimeter).toBe(per);
      expect(it.answer).toBe(it.ask === 'area' ? it.area : it.perimeter);
    }
    const rect = { shape: 'rect', ask: 'area', w: 5, h: 3, area: 15, perimeter: 16, answer: 15 };
    expect(CORE.diagnosePolygon(16, rect)).toBe('area_perimeter_swap');
    expect(CORE.diagnosePolygon(24, rect)).toBe('counted_points');
    expect(CORE.diagnosePolygon(8, Object.assign({}, rect, { ask: 'perimeter', answer: 16 }))).toBe('half_perimeter');
    expect(CORE.diagnosePolygon(12, { shape: 'tri', ask: 'area', w: 4, h: 3, area: 6, answer: 6 })).toBe('no_half');
  });

  it('item keys keep the pre-11-03 slope and distance shapes; hostile saves are dropped', () => {
    expect(CORE.itemKey({ type: 'slope', p1: { x: 0, y: 0 }, p2: { x: 3, y: 4 } })).toBe('slope:0,0>3,4');
    expect(CORE.itemKey({ type: 'distance', p1: { x: 1, y: 1 }, p2: { x: 4, y: 5 } })).toBe('distance:1,1>4,5');
    expect(CORE.cleanChallenge({ type: 'plot', target: { x: NaN, y: 1 } })).toBe(null);
    expect(CORE.cleanChallenge({ type: 'polygon', vertices: 'x' })).toBe(null);
    expect(CORE.cleanChallenge('nope')).toBe(null);
    expect(CORE.cleanChallenge({ type: 'distance', p1: { x: 0, y: 0 }, p2: { x: 8, y: 6 }, distance: 10 }).kind).toBe('pythag');
  });
});

describe('two tries, then the answer (and the teacher sees it)', () => {
  it('name the point: first miss names the slip and hides the answer; second shows it and locks', async () => {
    await mount({ cgTab: 'explore', gridChallenge: { type: 'name', target: { x: 3, y: -2 } } });
    // The marked point carries no label before the answer.
    expect(svgText().some((s) => s.includes('(3, −2)'))).toBe(false);
    await type(input('Your x-coordinate'), '-2');
    await type(input('Your y-coordinate'), '3');
    await click(byLabel('Check'));
    expect(latest.gridFeedback.msg).toMatch(/swap/i);
    expect(latest.gridFeedback.msg).not.toContain('(3, −2)');
    expect(latest.revealedItems || {}).toEqual({});
    await type(input('Your x-coordinate'), '1');
    await type(input('Your y-coordinate'), '1');
    await click(byLabel('Check'));
    // Stage C: the second miss closes the item; the answer waits for "Show the answer".
    expect(latest.gridFeedback.msg).not.toContain('(3, −2)');
    expect(svgText().some((s) => s.includes('(3, −2)'))).toBe(false);
    await click(document.querySelector('[data-coordgrid-reveal]'));
    expect(latest.gridFeedback.msg).toContain('(3, −2)');
    expect(Object.keys(latest.revealedItems)).toEqual(['name:3,-2']);
    expect(latest.missedLog.map((m) => [m.task, m.code])).toEqual([['name', 'other']]);
    expect(document.querySelector('[data-coordgrid-locked]')).toBeTruthy();
    expect(xp).toEqual([]);
    // Typing the shown answer now earns nothing.
    await type(input('Your x-coordinate'), '3');
    await click(byLabel('Check'));
    expect(latest.gridFeedback.correct).toBe(false);
  });

  it('a teacher can turn the reveal off', async () => {
    await mount({ cgTab: 'explore', cgTeacher: { reveals: false }, gridChallenge: { type: 'name', target: { x: 3, y: -2 } }, gridFeedback: { ansX: '1', ansY: '1' } });
    await click(byLabel('Check'));
    await type(input('Your x-coordinate'), '2');
    await click(byLabel('Check'));
    expect(latest.gridFeedback.msg).not.toContain('(3, −2)');
    expect(document.body.textContent).toContain('This one is closed.');
  });

  it('a right answer on the second try still counts, at reduced XP', async () => {
    await mount({ cgTab: 'explore', gridChallenge: { type: 'name', target: { x: 3, y: -2 } }, gridFeedback: { ansX: '-2', ansY: '3' } });
    await click(byLabel('Check'));
    await type(input('Your x-coordinate'), '3');
    await type(input('Your y-coordinate'), '-2');
    await click(byLabel('Check'));
    expect(latest.gridFeedback.correct).toBe(true);
    expect(latest.namesSolved).toBe(1);
    expect(paid()).toEqual([['coordinate', 2, 'name point']]);
  });
});

describe('predict, then check', () => {
  const REF = { type: 'reflect', p: { x: 4, y: -3 }, axis: 'y', answer: { x: -4, y: -3 } };
  it('the image is drawn only after the check; XP once per item', async () => {
    await mount({ cgTab: 'explore', gridChallenge: REF });
    expect(svgText().some((s) => s.startsWith('P′'))).toBe(false);
    await type(input('Your x-coordinate'), '-4');
    await type(input('Your y-coordinate'), '-3');
    await click(byLabel('Check'));
    expect(latest.gridFeedback.correct).toBe(true);
    expect(latest.gridFeedback.msg).toMatch(/x changes sign/);
    expect(svgText().some((s) => s.startsWith('P′'))).toBe(true);
    expect(paid()).toEqual([['coordinate', 5, 'reflection']]);
    // The same item again (regenerated) does not pay twice.
    await mount(Object.assign({}, latest, { gridChallenge: REF, gridFeedback: { ansX: '-4', ansY: '-3' } }));
    await click(byLabel('Check'));
    expect(latest.gridFeedback.correct).toBe(true);
    expect(paid().length).toBe(1);
  });

  it('a grid click sets the prediction', async () => {
    await mount({ cgTab: 'explore', gridChallenge: REF, coordinateInputX: -4, coordinateInputY: -3 });
    await click(byText(/^Use as my prediction$/));
    expect(latest.gridFeedback.ansX).toBe('-4');
    expect(latest.gridFeedback.ansY).toBe('-3');
    expect(latest.gridPoints || []).toEqual([]);
  });

  it('translation slips are named', async () => {
    await mount({ cgTab: 'explore', gridChallenge: { type: 'translate', p: { x: -1, y: 4 }, v: { dx: 3, dy: -5 }, answer: { x: 2, y: -1 } }, gridFeedback: { ansX: '-6', ansY: '7' } });
    await click(byLabel('Check'));
    expect(latest.gridFeedback.msg).toMatch(/Left and right change x/);
  });
});

describe('polygons (6.G.3)', () => {
  it('hints label the sides; area is graded; perimeter-for-area is named', async () => {
    const vs = [{ x: -2, y: -1 }, { x: 3, y: -1 }, { x: 3, y: 2 }, { x: -2, y: 2 }];
    await mount({ cgTab: 'explore', gridChallenge: { type: 'polygon', shape: 'rect', vertices: vs, ask: 'area', w: 5, h: 3, area: 15, perimeter: 16, answer: 15 } });
    expect(svgText().filter((s) => s === '5' || s === '3').length).toBe(0);
    await click(byLabel('Hint'));
    await click(byLabel('Hint'));
    expect(svgText().filter((s) => s === '5').length).toBeGreaterThanOrEqual(2);
    await type(input('Your answer'), '16');
    await click(byLabel('Check'));
    expect(latest.gridFeedback.msg).toMatch(/perimeter, not the area/);
    await type(input('Your answer'), '15');
    await click(byLabel('Check'));
    expect(latest.gridFeedback.correct).toBe(true);
    expect(latest.polygonsSolved).toBe(1);
  });
});

describe('grade 5 view', () => {
  it('a grade-5 plot task shows quadrant I only (0 to 10)', async () => {
    await mount({ cgTab: 'explore' }, { gradeLevel: '5th Grade' });
    await click(byLabel('Plot a Point'));
    const tg = latest.gridChallenge.target;
    expect(tg.x >= 0 && tg.y >= 0).toBe(true);
    const labels = svgText().filter((s) => /^[−\d]+$/.test(s));
    expect(labels.some((s) => s.startsWith('−'))).toBe(false);
    expect(labels).toContain('10');
  });
});

describe('the keyboard grid cursor and "describe my points"', () => {
  it('arrow keys move and announce; Enter plots; Home goes to the origin', async () => {
    await mount({ cgTab: 'explore' });
    const app = document.querySelector('[role="application"].allo-cg-app');
    expect(app.getAttribute('tabindex')).toBe('0');
    await key(app, 'ArrowRight');
    await key(app, 'ArrowUp', { shiftKey: true });
    expect([latest.coordinateInputX, latest.coordinateInputY]).toEqual([1, 5]);
    expect(sr[sr.length - 1]).toMatch(/x 1, y 5, in quadrant I\./);
    await key(app, 'Enter');
    expect(latest.gridPoints).toEqual([{ x: 1, y: 5 }]);
    expect(sr[sr.length - 1]).toMatch(/Plotted \(1, 5\), in quadrant I/);
    await key(app, 'Home');
    expect([latest.coordinateInputX, latest.coordinateInputY]).toEqual([0, 0]);
  });

  it('naming a point: the cursor gives landmarks, not coordinates', async () => {
    await mount({ cgTab: 'explore', gridChallenge: { type: 'name', target: { x: 2, y: 1 } } });
    const app = document.querySelector('[role="application"].allo-cg-app');
    sr = [];
    await key(app, 'ArrowRight'); await key(app, 'ArrowRight'); await key(app, 'ArrowUp');
    expect(sr.join(' ')).not.toMatch(/\d/);
    expect(sr[sr.length - 1]).toMatch(/marked point/);
    // The X/Y entry boxes (a coordinate readout) are hidden for this task.
    expect(document.querySelector('[aria-label="Coordinate entry"]')).toBe(null);
  });

  it('describes every point in words, with a table', async () => {
    await mount({ cgTab: 'explore', gridPoints: [{ x: 1, y: 2 }, { x: -3, y: 0 }] });
    await click(byText(/^Describe my points$/));
    const panel = document.querySelector('[data-coordgrid-describe]');
    expect(panel.textContent).toContain('Point 1: (1, 2), in quadrant I.');
    expect(panel.textContent).toContain('Point 2: (−3, 0), on the x-axis.');
    expect(panel.querySelectorAll('tbody tr').length).toBe(2);
  });
});

describe('teacher hooks', () => {
  it('hidden from students; a teacher can lock the level and read the missed list', async () => {
    const missed = [{ task: 'plot', prompt: 'Plot the point (3, −5).', code: 'swapped', at: 1 }];
    await mount({ cgTab: 'explore', missedLog: missed });
    expect(document.querySelector('[data-coordgrid-teacher]')).toBe(null);
    await mount({ cgTab: 'explore', missedLog: missed }, { isTeacherMode: true });
    const panel = document.querySelector('[data-coordgrid-teacher]');
    expect(panel.textContent).toContain('Swapped x and y: 1');
    const select = panel.querySelector('select');
    await React.act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(select, 'g8');
      select.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
    expect(latest.cgTeacher.level).toBe('g8');
    const g5 = [...document.querySelectorAll('button[aria-pressed]')].find((b) => /Grade 5/.test(b.textContent));
    expect(g5.disabled).toBe(true);
    expect(byLabel('Find Slope')).toBeTruthy();
  });

  it('a teacher can hide stretch tasks', async () => {
    await mount({ cgTab: 'explore', cgTeacher: { level: 'g5', hideStretch: true } });
    expect(byLabel('Find Slope')).toBe(null);
    expect(byLabel('Plot a Point')).toBeTruthy();
  });
});

describe('compatibility', () => {
  it('lines and a slope hint saved inside gridFeedback (pre-11-03) still load', async () => {
    const ln = { from: { x: 0, y: 0 }, to: { x: 2, y: 2 }, slope: { rise: 2, run: 2, value: 1, display: '1' } };
    await mount({ cgTab: 'explore', gridPoints: [ln.from, ln.to], gridFeedback: { connectMode: true, lines: [ln], connectFirst: null } });
    expect(document.body.textContent).toContain('Your lines');
    const p1 = { x: 0, y: 0 }, p2 = { x: 3, y: 2 };
    await mount({ cgTab: 'explore', gridChallenge: { type: 'slope', p1, p2, slopeData: { rise: 2, run: 3, value: 2 / 3, display: '2/3' } }, gridFeedback: { hinted: true, riseAnswer: '2', runAnswer: '3', slopeAnswer: '2/3' } });
    await click(byLabel('Check'));
    expect(paid()).toEqual([['coordinate', 2, 'slope calc']]);
  });

  it('hostile saved state renders without errors', async () => {
    await mount({ cgTab: 'explore', gridPoints: [{ x: NaN, y: 1 }, null, { x: 1, y: 1 }], gridLines: [null, { from: 1 }], gridChallenge: { type: 'polygon', vertices: 3 }, missedLog: 'x', cgTeacher: 7, creditedItems: [] }, { isTeacherMode: true });
    expect(errors).toEqual([]);
    expect(document.querySelector('[data-coordinate-theme]')).toBeTruthy();
  });
});

describe('shared graph core and the function plotter', () => {
  it('the pasted alloGraphAccess block is byte-identical to the Graphing Calculator copy', () => {
    const START = '  // == alloGraphAccess core v2 (keep byte-identical in graphcalc + funcgrapher) ==';
    const END = '  // == end alloGraphAccess core v2 ==';
    const block = (f) => { const s = fs.readFileSync(f, 'utf8'); const a = s.indexOf(START); const b = s.indexOf(END, a); expect(a).toBeGreaterThan(-1); return s.slice(a, b + END.length); };
    expect(block(FILE)).toBe(block('stem_lab/stem_tool_graphcalc.js'));
  });

  it('a plotted function can be described and stepped through with keys', async () => {
    await mount({ cgTab: 'explore', funcsOn: true, funcs: [{ id: 'f1', expr: 'x^2-4', color: '#4338ca', visible: true }] });
    const panel = document.querySelector('[data-graph-access="coordgrid-ga"]');
    expect(panel).toBeTruthy();
    await click(panel.querySelector('[data-graph-access-describe]'));
    expect(document.querySelector('[data-graph-access-text]').textContent).toMatch(/−2|-2/);
    const region = panel.querySelector('[data-graph-access-explore]');
    await key(region, 'ArrowRight');
    expect(typeof latest.gaIdx).toBe('number');
  });
});

describe('investigation: claim, evidence, reasoning', () => {
  it('needs a claim before testing, three points and reasoning before the check; pays once', async () => {
    await mount({ cgTab: 'quadrants', qtPointX: 3, qtPointY: 2 });
    const sec = () => document.querySelector('[data-coordgrid-investigation]');
    const testBtn = () => [...sec().querySelectorAll('button')].find((b) => /Test the focus point/.test(b.textContent));
    expect(testBtn().disabled).toBe(true);
    await click([...sec().querySelectorAll('button')].find((b) => /Sometimes/.test(b.textContent)));
    for (const [x, y] of [[3, 2], [-4, 1], [2, -5]]) {
      await mount(Object.assign({}, latest, { qtPointX: x, qtPointY: y }));
      await click(testBtn());
    }
    expect(sec().querySelectorAll('tbody tr').length).toBe(3);
    const checkBtn = () => [...sec().querySelectorAll('button')].find((b) => /Check my claim/.test(b.textContent));
    expect(checkBtn().disabled).toBe(true);
    await type(sec().querySelector('textarea'), 'x flips and then y flips, so both flip.');
    await click(checkBtn());
    expect(latest.qtInvest.result).toBe('wrong');
    await click([...sec().querySelectorAll('button')].find((b) => /Always/.test(b.textContent)));
    await click(checkBtn());
    expect(latest.qtInvest.result).toBe('right');
    await click(checkBtn());
    expect(paid()).toEqual([['coordinate', 5, 'reflection investigation']]);
  });
});

describe('accessibility and i18n sweeps', () => {
  const STATES = [
    { cgTab: 'explore' }, { cgTab: 'explore', gridChallenge: { type: 'slope', p1: { x: 0, y: 0 }, p2: { x: 3, y: 2 }, slopeData: { rise: 2, run: 3, value: 2 / 3, display: '2/3' } } },
    { cgTab: 'explore', gridChallenge: { type: 'polygon', shape: 'tri', vertices: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 3 }], ask: 'area', w: 4, h: 3, area: 6, perimeter: 12, answer: 6 } },
    { cgTab: 'explore', gridChallenge: { type: 'translate', p: { x: 1, y: 1 }, v: { dx: 2, dy: 3 }, answer: { x: 3, y: 4 } }, funcsOn: true, funcs: [{ id: 'a', expr: '2x+1', color: '#4338ca', visible: true }], showHelp: true, descOpen: true, gridPoints: [{ x: 1, y: 1 }] },
    { cgTab: 'quadrants', qtInvest: { claim: 'always', tested: [{ x: 1, y: 2 }], reasoning: 'r', msg: null } }, { cgTab: 'maps', mapScenario: 'chess', chessPracticeOn: true, chessChallenge: { type: 'name', target: 'c6' }, chessSelected: 'c6' },
    { cgTab: 'maps', mapScenario: 'battleship', bsShips: [{ size: 2, cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }] }], bsShots: [{ x: 5, y: 5, hit: false }] },
    { cgTab: 'maps', mapScenario: 'world', worldPracticeOn: true, worldChallenge: { lat: 35.68, lon: 139.69, cityName: 'Tokyo, Japan' } },
    { cgTab: 'quadHunt' }
  ];

  it('every tab mounts in light, dark and contrast themes, as student and teacher, with no console errors', async () => {
    for (const st of STATES) {
      for (const theme of [{}, { isDark: true }, { isContrast: true }]) {
        await mount(st, Object.assign({ isTeacherMode: !!theme.isDark }, theme));
        expect(document.querySelector('[data-coordinate-theme]'), JSON.stringify(st)).toBeTruthy();
      }
    }
    expect(errors).toEqual([]);
  });

  it('no visible English escapes t(): with every string translated to a marker, no words remain', async () => {
    const leaks = new Set();
    const allow = /^(?:x|y|P|P′|m|d|M|A|B|C|D|E|F|G|H|I|J|undefined)$/;
    for (const st of STATES) {
      await mount(st, { t: () => '§', isTeacherMode: true });
      const walker = document.createTreeWalker(document.getElementById('root'), window.NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        // Code a student typed or picked (function expressions) is not UI text.
        if (n.parentElement && n.parentElement.closest('[data-graph-access-point]')) continue;
        const words = (n.textContent.match(/[A-Za-z]{3,}/g) || []).filter((w) => !allow.test(w));
        words.forEach((w) => leaks.add(w + ' <' + n.parentElement.tagName + '>'));
      }
      document.querySelectorAll('#root [aria-label], #root [placeholder], #root [title]').forEach((el) => {
        ['aria-label', 'placeholder', 'title'].forEach((a) => {
          const v = el.getAttribute(a);
          if (!v) return;
          (v.match(/[A-Za-z]{3,}/g) || []).forEach((w) => leaks.add(w + ' @' + a));
        });
      });
    }
    expect([...leaks]).toEqual([]);
  });

  it('inline-coloured text meets 4.5:1 on its real background in light, dark and contrast themes', async () => {
    const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const hex = (c) => { if (!c) return null; if (c[0] === '#') return c.length === 4 ? '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3] : c.slice(0, 7).toLowerCase(); const m = c.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/); return m ? '#' + [m[1], m[2], m[3]].map((n) => (+n).toString(16).padStart(2, '0')).join('') : null; };
    // Tailwind light surfaces and the tool's light panel classes count as white.
    const LIGHT = /\b(bg-white|bg-[a-z]+-50|bg-[a-z]+-100|allo-cg-bg-\w+)\b/;
    const bgOf = (el) => {
      for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
        const b = hex(n.style && (n.style.backgroundColor || n.style.background));
        if (b) return b;
        if (LIGHT.test(n.getAttribute('class') || '')) return '#ffffff';
      }
      return null;
    };
    const bad = [];
    const states = [{ cgTab: 'explore', gridPoints: [{ x: 1, y: 1 }], descOpen: true, showHelp: true, streak: 2, bestStreak: 3 },
      { cgTab: 'explore', gridChallenge: { type: 'name', target: { x: 2, y: 1 }, hint: 2, tries: 1 }, gridFeedback: { msg: 'x', correct: false } },
      { cgTab: 'quadrants', qtInvest: { claim: 'always', tested: [{ x: 1, y: 2 }], msg: 'm', result: 'right' } }];
    for (const theme of [{}, { isDark: true }, { isContrast: true }]) {
      for (const st of states) {
        await mount(st, Object.assign({ isTeacherMode: true, missedLog: [] }, theme));
        document.querySelectorAll('#root [style]').forEach((el) => {
          if (el.closest('svg') || !el.textContent.trim()) return;
          const fg = hex(el.style.color);
          if (!fg) return;
          const bg = bgOf(el);
          if (!bg) return;
          const r = ratio(fg, bg);
          if (r < 4.5) bad.push(JSON.stringify(theme) + ' ' + el.tagName + ' "' + el.textContent.trim().slice(0, 30) + '" ' + fg + ' on ' + bg + ' ' + r.toFixed(2));
        });
      }
    }
    expect(bad).toEqual([]);
  });

  it('every t() key is a literal in the coordgrid namespace', () => {
    const src = fs.readFileSync(FILE, 'utf8');
    const ours = src.slice(src.indexOf('var CG_CORE'));
    const calls = [...ours.matchAll(/\bt\(\s*([^,)]+)/g)].map((m) => m[1].trim());
    const bad = calls.filter((c) => !/^'stem\.coordgrid\.[a-z0-9_]+'$/.test(c));
    expect(bad).toEqual([]);
  });

  it('unmount removes the window key handler', async () => {
    await mount({ cgTab: 'explore' });
    expect(typeof window._coordGridKeyHandler).toBe('function');
    await React.act(async () => root.unmount());
    root = null;
    expect(window._coordGridKeyHandler).toBe(null);
  });

  it('reduced motion: "Walk it" jumps straight to the finished path', async () => {
    const mm = window.matchMedia;
    window.matchMedia = (q) => ({ matches: /reduce/.test(q), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    try {
      await mount({ cgTab: 'quadrants' });
      await click(byLabel('Animate walk from origin to this point'));
      expect(latest.qtWalkPhase).toBe(3);
    } finally { window.matchMedia = mm; }
  });

  it('the AI tutor appears only when the host offers it and AI hints are on', async () => {
    await mount({ cgTab: 'explore' });
    expect(byLabel('AI Tutor')).toBe(null);
    await mount({ cgTab: 'explore' }, { callGemini: () => Promise.resolve('ok') });
    expect(byLabel('AI Tutor')).toBeTruthy();
    await mount({ cgTab: 'explore' }, { callGemini: () => Promise.resolve('ok'), aiHintsEnabled: false });
    expect(byLabel('AI Tutor')).toBe(null);
  });
});
