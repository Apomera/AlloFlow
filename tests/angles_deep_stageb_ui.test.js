// Angle Explorer stage B (2026-11-03): polygons (angle-sum investigation,
// exterior walk, tiling, practice), circle theorems and the unit circle, real
// contexts, compass constructions, and the pointer-capture drag core, through
// a live mount with the hub's hosted state. ANGLES_DEEP_SRC points at another copy.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = process.env.ANGLES_DEEP_SRC || 'stem_lab/stem_tool_angles.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let mounted = [];
let live = null;
let xp = [];
let errors = [];
let said = [];

beforeEach(() => {
  resetStemLab();
  loadTool(SOURCE, 'protractor');
  live = null; xp = []; errors = []; said = [];
  vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ').slice(0, 400)); });
});

afterEach(async () => {
  vi.restoreAllMocks();
  // Every announcement and every mounted text had its {placeholders} filled
  // (checked after unmounting, so a failure here cannot leak into the next test).
  const screens = mounted.map(({ container }) => container.textContent).join(' ');
  while (mounted.length) {
    const { root, container } = mounted.pop();
    await React.act(async () => root.unmount());
    container.remove();
  }
  expect(said.filter((m) => /\{\w+\}/.test(m)), 'unfilled placeholder in an announcement').toEqual([]);
  expect(screens.match(/\{\w+\}/g), 'unfilled placeholder on screen').toBe(null);
});

async function mount(init, extra) {
  const cfg = window.StemLab._registry.protractor;
  const container = document.createElement('div');
  document.body.appendChild(container);
  function Host() {
    const [angleValue, setAngleValue] = React.useState(init.angleValue != null ? init.angleValue : 45);
    const [angleChallenge, setAngleChallenge] = React.useState(null);
    const [angleFeedback, setAngleFeedback] = React.useState(null);
    const [exploreScore, setExploreScore] = React.useState({ correct: 0, total: 0 });
    const [toolData, setToolData] = React.useState({ protractor: init.protractor || {}, angles: {} });
    live = { angleValue, exploreScore, d: toolData.protractor || {} };
    const update = (slot, key, val) => setToolData((p) => Object.assign({}, p, { [slot]: Object.assign({}, p[slot] || {}, { [key]: val }) }));
    const updateMulti = (slot, obj) => setToolData((p) => Object.assign({}, p, { [slot]: Object.assign({}, p[slot] || {}, obj) }));
    return cfg.render(makeCtx(Object.assign({
      toolData, setToolData, update, updateMulti,
      angleValue, setAngleValue, angleChallenge, setAngleChallenge, angleFeedback, setAngleFeedback,
      exploreScore, setExploreScore,
      awardXP: (id, n, why) => xp.push([id, n, why]),
      announceToSR: (m) => said.push(m),
      addToast: () => {},
      t: (k, fb) => fb || k,
    }, extra || {})));
  }
  const root = ReactDOMClient.createRoot(container);
  await React.act(async () => { root.render(React.createElement(Host)); });
  mounted.push({ root, container });
  return container;
}
async function unmountLast() { const { root, container } = mounted.pop(); await React.act(async () => root.unmount()); container.remove(); }
const click = async (el) => { expect(el, 'element to click').toBeTruthy(); await React.act(async () => { el.click(); }); };
const key = async (el, k, opts) => React.act(async () => { el.dispatchEvent(new window.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true }, opts || {}))); });
async function type(input, value) {
  expect(input, 'input').toBeTruthy();
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}
async function choose(select, value) {
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(select, value);
    select.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
}
const byText = (c, text) => Array.from(c.querySelectorAll('button')).find((b) => (b.textContent || '').includes(text));
const xpFor = (why) => xp.filter((a) => a[2] === why);

const vtx = (c, v) => c.querySelector('button[aria-label="Vertex ' + v + '"]');
const evidenceInputs = (c) => Array.from(c.querySelectorAll('[data-angles-step="pg-evidence"] input'));
async function recordRow(c, tri, sum) {
  const [ti, si] = evidenceInputs(c);
  await type(ti, tri); await type(si, sum);
  await click(byText(c, 'Record this row'));
}

describe('polygon angle sums: claim, evidence, reasoning', () => {
  it('evidence waits for a locked prediction; students triangulate; rows are graded with named mistakes', async () => {
    const c = await mount({ protractor: { activeTab: 'polygons', pgMode: 'sum', level: 'g8' } });
    expect(c.querySelector('[data-angles-step="pg-evidence"]'), 'evidence before a prediction').toBe(null);
    expect(byText(c, 'Lock in my prediction').disabled).toBe(true);
    await click(byText(c, 'The total is 180° times the number of sides.'));
    await click(byText(c, 'Lock in my prediction'));
    expect(live.d.pgPred).toEqual({ pick: 'p_n180', locked: true });
    expect(byText(c, 'Every polygon’s angles add to 360°.').disabled, 'prediction stays locked').toBe(true);
    await click(byText(c, '5 sides'));
    expect(live.d.pgN).toBe(5);
    // A side, then a crossing diagonal, are refused with a reason.
    await click(vtx(c, 'A')); await click(vtx(c, 'B'));
    expect(said.slice(-1)[0]).toMatch(/that is a side, not a diagonal/);
    await click(vtx(c, 'A')); await click(vtx(c, 'C'));
    expect(live.d.pgDiags).toEqual([[0, 2]]);
    await click(vtx(c, 'B')); await click(vtx(c, 'E'));
    expect(said.slice(-1)[0]).toMatch(/would cross/);
    expect(evidenceInputs(c).length, 'no row before the polygon is all triangles').toBe(0);
    await click(vtx(c, 'D')); await click(vtx(c, 'A'));
    expect(live.d.pgDiags).toEqual([[0, 2], [0, 3]]);
    const pieces = c.querySelector('[data-angles-pg-desc]').textContent.match(/Pieces: ([A-E; ]+)\./)[1].split('; ').map((p) => p.split('').sort().join('')).sort();
    expect(pieces).toEqual(['ABC', 'ACD', 'ADE']);
    // No measured angles on screen before the row is recorded.
    expect(c.querySelector('[data-angles-poly-svg]').textContent).not.toMatch(/°/);
    await recordRow(c, '5', '900');
    expect(live.d.pgRow.code).toBe('tri_counted_sides');
    expect(c.textContent).toMatch(/That is the number of sides/);
    await recordRow(c, '3', '540');
    expect(live.d.pgRow.ok).toBe(true);
    expect(xpFor('polygon evidence')).toEqual([['protractor', 3, 'polygon evidence']]);
    expect(live.d.pgRuns[5]).toEqual({ tri: 3, sum: 540 });
    // The protractor check appears only now, and its angles really add to 540.
    const measured = c.textContent.match(/the corners measure ([\d°, ]+), a total of (\d+)°/);
    expect(measured[2]).toBe('540');
    expect(measured[1].split(',').map((x) => parseInt(x, 10)).reduce((a, b) => a + b, 0)).toBe(540);
    expect((live.d.misTally || {}).tri_counted_sides).toBe(1);
  });

  it('three rows unlock the claim; a broken claim names the row; the reason step follows', async () => {
    const runs = { 3: { tri: 1, sum: 180 }, 4: { tri: 2, sum: 360 } };
    const c = await mount({ protractor: { activeTab: 'polygons', pgMode: 'sum', pgPred: { pick: 'p_360', locked: true }, pgRuns: runs, pgN: 6, pgSeed: 99 } });
    expect(c.textContent).toMatch(/Record at least 3 different polygons/);
    await click(vtx(c, 'A')); await click(vtx(c, 'C'));
    await click(vtx(c, 'A')); await click(vtx(c, 'D'));
    await click(vtx(c, 'A')); await click(vtx(c, 'E'));
    await recordRow(c, '4', '720');
    expect(live.d.pgRuns[6].sum).toBe(720);
    expect(xpFor('polygon evidence')).toEqual([['protractor', 5, 'polygon evidence']]);
    const table = c.querySelector('[data-angles-pg-table]');
    expect(table.querySelectorAll('tbody tr').length).toBe(3);
    await click(byText(c, 'Angle sum = 360° for every polygon'));
    expect(live.d.pgClaim.ok).toBe(false);
    expect(c.textContent).toMatch(/Your row for 3 sides shows 180°, but this claim predicts 360°/);
    expect(c.querySelector('[data-angles-step="pg-why"]'), 'reason before the claim').toBe(null);
    await click(byText(c, 'Angle sum = (n − 2) × 180°'));
    expect(live.d.pgClaim.ok).toBe(true);
    expect(xpFor('polygon claim')).toEqual([['protractor', 3, 'polygon claim']]);
    expect(c.querySelector('[data-angles-pg-reflect]').textContent).toMatch(/does not support/);
    await click(byText(c, 'Joining every vertex to the centre'));
    expect(c.textContent).toMatch(/360° round the centre point/);
    await click(byText(c, 'From one vertex, n − 3 diagonals'));
    expect(live.d.pgWhy.ok).toBe(true);
    expect(live.d.pgInv.claim).toBe(true);
  });

  it('the exterior walk turns 360° for any polygon, then asks why', async () => {
    const c = await mount({ protractor: { activeTab: 'polygons', pgMode: 'ext' } });
    expect(byText(c, 'Walk to the next corner'), 'walk before predicting').toBeFalsy();
    await click(byText(c, '360°'));
    await click(byText(c, 'Lock in my prediction'));
    for (const n of [5, 7]) {
      await click(byText(c, n + ' sides'));
      for (let i = 0; i < n; i++) await click(byText(c, 'Walk to the next corner'));
      expect(byText(c, 'Walk to the next corner').disabled).toBe(true);
      const turns = c.querySelector('[data-angles-walk-desc]').textContent.match(/Turns so far: ([\d°, ]+)\. Total: (\d+)°/);
      expect(turns[1].split(',').length).toBe(n);
      expect(turns[1].split(',').map((x) => parseInt(x, 10)).reduce((a, b) => a + b, 0)).toBe(360);
      expect(turns[2]).toBe('360');
    }
    expect(live.d.pgWalkRuns).toEqual({ 5: 360, 7: 360 });
    await click(byText(c, 'Each exterior angle is 360° ÷ n.'));
    expect(c.textContent).toMatch(/only true when every corner is the same/);
    await click(byText(c, 'You end up facing the way you started'));
    expect(live.d.pgWalkWhy.ok).toBe(true);
    expect(c.textContent).toMatch(/n × 180° − 360° = \(n − 2\) × 180°/);
  });

  it('tiling: predict, test with copies round a point, name the near-miss, then claim', async () => {
    const c = await mount({ protractor: { activeTab: 'polygons', pgMode: 'tile' } });
    await click(byText(c, 'Pentagon'));
    await click(byText(c, 'Lock in my prediction'));
    expect(live.d.pgTilePred.picks).toEqual({ 5: true });
    const ans = (txt) => Array.from(c.querySelectorAll('[role="group"] button')).find((b) => b.textContent === txt);
    const testBtn = (name) => Array.from(c.querySelectorAll('[aria-label="Polygon to test"] button')).find((x) => x.textContent === name);
    await click(testBtn('Pentagon'));
    expect(c.querySelector('[data-angles-tile-desc]').textContent).toMatch(/Each corner of a regular Pentagon is 108°\. 3 copies fit round the point, using 324°/);
    await click(ans('Yes'));
    expect(c.textContent).toMatch(/Close is not enough/);
    expect((live.d.misTally || {}).tile_gap).toBe(1);
    await click(ans('No'));
    expect(c.textContent).toMatch(/leaving a 36° gap, and one more copy would overlap by 72°/);
    for (const [name, yes] of [['Triangle', true], ['Square', true], ['Octagon', false]]) {
      await click(testBtn(name));
      await click(ans(yes ? 'Yes' : 'No'));
    }
    expect(c.querySelectorAll('[data-angles-tile-table] tbody tr').length).toBe(4);
    await click(byText(c, 'Regular polygons with fewer than 7 sides tile.'));
    expect(live.d.pgTileClaim.ok).toBe(false);
    expect(c.textContent).toMatch(/Your Pentagon row does not fit that statement/);
    await click(byText(c, 'interior angle divides 360° exactly'));
    expect(live.d.pgTileClaim.ok).toBe(true);
    expect(c.querySelector('[data-angles-tile-reflect]').textContent).toMatch(/right for 5 of 9/);
    // Mixing polygons at a point: 4.8.8 fits exactly.
    for (const n of ['Square', 'Octagon', 'Octagon']) await click(byText(c, '+ ' + n));
    expect(c.querySelector('[data-angles-mix]').textContent).toMatch(/Square \+ Octagon \+ Octagon: 360°/);
    expect(c.querySelector('[data-angles-mix]').getAttribute('data-angles-mix')).toBe('fits');
  });

  it('practice: named mistake, reveal without credit, then a fresh question credits once', async () => {
    const task = { kind: 'sum', n: 7, answer: 900, id: 'pg:sum:7' };
    const c = await mount({ protractor: { activeTab: 'polygons', pgMode: 'practice', level: 'g57', pgpT: task, pgpKind: 'sum', pgSolved: { sum: 2 } } });
    expect(c.textContent.includes('900')).toBe(false);
    await type(c.querySelector('#stem-angles-pgp-input'), '1260');
    await click(c.querySelector('button[aria-label="Check my answer"]'));
    expect(c.querySelector('[data-angles-task-result]').getAttribute('data-angles-task-result')).toBe('n180');
    expect(c.textContent).toMatch(/You multiplied 180° by the number of sides/);
    await type(c.querySelector('#stem-angles-pgp-input'), '1000');
    await click(c.querySelector('button[aria-label="Check my answer"]'));
    // Stage C: the second miss offers the answer; it does not appear by itself.
    expect(c.textContent.includes('900')).toBe(false);
    await click(c.querySelector('[data-angles-reveal="pgp"]'));
    expect(c.textContent).toMatch(/The answer is 900°/);
    expect(c.querySelector('[data-angles-task-solution]').textContent).toMatch(/5 triangles/);
    expect(xpFor('polygon practice').length).toBe(0);
    await click(byText(c, 'Next question'));
    const p = live.d.pgpT;
    expect(p.kind).toBe('sum');
    await type(c.querySelector('#stem-angles-pgp-input'), String(p.answer));
    const chk = c.querySelector('button[aria-label="Check my answer"]');
    await React.act(async () => { chk.click(); chk.click(); });
    expect(xpFor('polygon practice')).toEqual([['protractor', 5, 'polygon practice']]);
  });

  it('the worked example fades: a different polygon in full, then the set-up, then nothing', async () => {
    const task = { kind: 'regular', n: 9, answer: 140, id: 'pg:regular:9' };
    for (const [solved, want] of [[0, 'full'], [1, 'setup'], [2, null]]) {
      const c = await mount({ protractor: { activeTab: 'polygons', pgMode: 'practice', level: 'g57', pgpT: task, pgSolved: { regular: solved } } });
      const w = c.querySelector('[data-angles-task-worked]');
      expect(w ? w.getAttribute('data-angles-task-worked') : null).toBe(want);
      if (want === 'full') expect(w.textContent.includes('140'), 'worked example is not this question').toBe(false);
      await unmountLast();
    }
  });
});

describe('circle theorems: predict, check, then move a point', () => {
  const insc = { kind: 'inscribed', a: 0, b: 100, p: 230, m: 100, ask: 'insc', given: 100, answer: 50, id: 'ci:insc:100:insc' };
  it('no movable point and no answer before the prediction; named mistake; live measurement afterwards', async () => {
    const c = await mount({ protractor: { activeTab: 'circles', ciMode: 'inscribed', level: 'g8', citT: insc } });
    const svg = c.querySelector('[data-angles-circle-svg]');
    const labels = Array.from(svg.querySelectorAll('text')).map((x) => x.textContent);
    expect(labels).toContain('100°');
    expect(labels).toContain('?');
    expect(labels.includes('50°'), 'answer on the diagram').toBe(false);
    expect(c.querySelector('[data-angles-ci-handle]'), 'point movable before predicting').toBe(null);
    await type(c.querySelector('#stem-angles-cit-input'), '100');
    await click(c.querySelector('button[aria-label="Check my prediction"]'));
    expect(c.textContent).toMatch(/The inscribed angle is not equal to the central angle/);
    await type(c.querySelector('#stem-angles-cit-input'), '50');
    await click(c.querySelector('button[aria-label="Check my prediction"]'));
    expect(xpFor('circle theorem')).toEqual([['protractor', 3, 'circle theorem']]);
    const handle = c.querySelector('[data-angles-ci-handle]');
    expect(handle.getAttribute('aria-label')).toBe('Point P on the circle');
    for (let i = 0; i < 5; i++) await key(c.querySelector('[data-angles-ci-handle]'), 'ArrowRight', { shiftKey: true });
    expect(live.d.ciLive.p).toBe(280);
    expect(c.querySelector('[data-angles-ci-readout]').textContent).toMatch(/∠APB = 50°.*central angle of 100°/);
    expect(said.slice(-1)[0]).toMatch(/P is at about/);
    await click(byText(c, 'Move B'));
    await key(c.querySelector('[data-angles-ci-handle]'), 'ArrowRight', { shiftKey: true });
    expect(live.d.ciLive.b).toBe(110);
    expect(c.querySelector('[data-angles-ci-readout]').textContent).toMatch(/∠APB = 55°.*central angle of 110°/);
    // A point cannot be pushed onto another one.
    await click(byText(c, 'Move P'));
    for (let i = 0; i < 40; i++) await key(c.querySelector('[data-angles-ci-handle]'), 'ArrowRight', { shiftKey: true });
    expect(Math.abs(live.d.ciLive.p - 0) % 360).toBeGreaterThanOrEqual(4);
  });
  it('cyclic quadrilateral: the "opposite angles are equal" mistake is named; a reveal gives no credit; sums stay 180', async () => {
    const cyc = { kind: 'cyclic', pos: [10, 100, 190, 280], gaps: [90, 90, 90, 90], angles: [90, 90, 90, 90], givenIdx: 0, askIdx: 2, given: 90, answer: 90, id: 'x' };
    const real = { kind: 'cyclic', pos: [20, 120, 200, 290], gaps: [100, 80, 90, 90], angles: [85, 90, 95, 90], givenIdx: 0, askIdx: 2, given: 85, answer: 95, id: 'ci:cyc:100-80-90-90:0' };
    expect(cyc.kind).toBe('cyclic');
    const c = await mount({ protractor: { activeTab: 'circles', ciMode: 'cyclic', citT: real } });
    await type(c.querySelector('#stem-angles-cit-input'), '85');
    await click(c.querySelector('button[aria-label="Check my prediction"]'));
    expect(c.textContent).toMatch(/in a cyclic quadrilateral they add to 180°/);
    await type(c.querySelector('#stem-angles-cit-input'), '100');
    await click(c.querySelector('button[aria-label="Check my prediction"]'));
    expect(c.textContent).not.toMatch(/The angle is 95°/);
    await click(c.querySelector('[data-angles-reveal="cit"]'));
    expect(c.textContent).toMatch(/The angle is 95°/);
    expect(xpFor('circle theorem').length).toBe(0);
    expect(c.querySelector('[data-angles-ci-readout]').textContent).toMatch(/∠A \+ ∠C = 180°.*∠B \+ ∠D = 180°/);
    await click(byText(c, 'Move C'));
    for (let i = 0; i < 3; i++) await key(c.querySelector('[data-angles-ci-handle]'), 'ArrowLeft', { shiftKey: true });
    expect(live.d.ciLive.pos[2]).toBe(170);
    const txt = c.querySelector('[data-angles-ci-readout]').textContent;
    const m = txt.match(/∠A = ([\d.]+)°, ∠B = ([\d.]+)°, ∠C = ([\d.]+)°, ∠D = ([\d.]+)°/).slice(1).map(Number);
    expect(m[0] + m[2]).toBeCloseTo(180, 0);
    expect(m[1] + m[3]).toBeCloseTo(180, 0);
    expect(m[1]).not.toBeCloseTo(90, 0);
  });
  it('angle in a semicircle stays 90° wherever P goes', async () => {
    const semi = { kind: 'semi', a: 180, b: 0, p: 70, phi: 70, ask: 'apb', given: 35, answer: 90, id: 'ci:semi:70:apb' };
    const c = await mount({ protractor: { activeTab: 'circles', ciMode: 'semi', citT: semi } });
    await type(c.querySelector('#stem-angles-cit-input'), '90');
    await click(c.querySelector('button[aria-label="Check my prediction"]'));
    for (let i = 0; i < 6; i++) await key(c.querySelector('[data-angles-ci-handle]'), 'ArrowRight', { shiftKey: true });
    expect(live.d.ciLive.p).toBe(130);
    expect(c.querySelector('[data-angles-ci-readout]').textContent).toMatch(/∠APB = 90°, ∠PAB = 65°, ∠PBA = 25°/);
  });
});

describe('unit circle bridge', () => {
  it('the explorer moves P by keyboard and reports exact coordinates, radians and the reference angle', async () => {
    const c = await mount({ protractor: { activeTab: 'circles', ciMode: 'unit', ucDeg: 120 } });
    const table = () => c.querySelector('[data-angles-uc-table]').textContent;
    expect(table()).toMatch(/2π\/3/);
    expect(table()).toMatch(/Reference angle60°/);
    expect(table()).toMatch(/cos θ \(x-coordinate\)−1\/2/);
    await key(c.querySelector('[data-angles-uc-handle]'), 'ArrowRight');
    expect(live.d.ucDeg).toBe(135);
    expect(table()).toMatch(/−√2\/2/);
    expect(said.slice(-1)[0]).toMatch(/θ = 135°, 3π\/4 radians, quadrant II/);
    await key(c.querySelector('[data-angles-uc-handle]'), 'ArrowRight', { shiftKey: true });
    expect(live.d.ucDeg).toBe(136);
    expect(c.querySelector('[data-angles-uc-signs] tr.font-bold').textContent).toMatch(/quadrant II/);
    expect(c.querySelector('[data-angles-uc-watch]').textContent).toMatch(/“π = 180” is not true as a number/);
  });
  it('a right-size, wrong-sign coordinate is named "sign by quadrant"', async () => {
    const task = { kind: 'coord', deg: 150, fn: 'cos', answer: '-√3/2', id: 'uc:coord:150:cos' };
    const c = await mount({ protractor: { activeTab: 'circles', ciMode: 'unit', ucView: 'practice', level: 'g8', uctT: task, ucSolved: { coord: 3 } } });
    const svgText = c.querySelector('[data-angles-unit-svg="task"]').textContent;
    expect(svgText.includes('√3'), 'coordinates shown before answering').toBe(false);
    await click(c.querySelector('button[aria-label="root 3 over 2"]'));
    expect(c.querySelector('[data-angles-task-result]').getAttribute('data-angles-task-result')).toBe('sign_quadrant');
    expect(c.textContent).toMatch(/Right size, wrong sign/);
    await click(c.querySelector('button[aria-label="minus root 3 over 2"]'));
    expect(xpFor('unit circle')).toEqual([['protractor', 3, 'unit circle']]);
    expect(c.querySelector('[data-angles-unit-svg="task"]').textContent).toMatch(/−√3\/2, 1\/2/);
  });
  it('π used as the number 180 is named', async () => {
    const task = { kind: 'pinum', k: 1, den: 2, c: 1, answer: 2.57, id: 'uc:pinum:1-2-1' };
    const c = await mount({ protractor: { activeTab: 'circles', ciMode: 'unit', ucView: 'practice', level: 'g8', uctT: task } });
    expect(c.querySelector('[data-angles-task-prompt]').textContent).toMatch(/π\/2 \+ 1/);
    await type(c.querySelector('#stem-angles-uct-input'), '91');
    await click(c.querySelector('button[aria-label="Check my answer"]'));
    expect(c.querySelector('[data-angles-task-result]').getAttribute('data-angles-task-result')).toBe('pi_is_180_number');
    expect((live.d.misTally || {}).pi_is_180_number).toBe(1);
  });
});

describe('real contexts', () => {
  it('clock: the frozen hour hand is named with how far it really moved', async () => {
    const task = { kind: 'clock', h: 4, m: 20, answer: 10, id: 'cx:clock:4:20' };
    const c = await mount({ protractor: { activeTab: 'contexts', cxMode: 'clock', cxtT: task } });
    expect(c.querySelector('[data-angles-cx-svg="clock"]').textContent.includes('10°')).toBe(false);
    await type(c.querySelector('#stem-angles-cxt-input'), '0');
    await click(c.querySelector('button[aria-label="Check my answer"]'));
    expect(c.textContent).toMatch(/You left the hour hand pointing exactly at 4\. By 4:20 it has moved 10° on/);
    await type(c.querySelector('#stem-angles-cxt-input'), '10');
    await click(c.querySelector('button[aria-label="Check my answer"]'));
    expect(xpFor('angle in context')).toEqual([['protractor', 3, 'angle in context']]);
    expect(c.querySelector('[data-angles-cx-svg="clock"]').textContent.includes('10°')).toBe(true);
  });
  it('bearings accept three figures and name the missing wrap', async () => {
    const task = { kind: 'bearing', v: 'back', b: 250, answer: 70, id: 'cx:brg:back:250' };
    const c = await mount({ protractor: { activeTab: 'contexts', cxMode: 'bearing', cxtT: task } });
    expect(c.querySelector('[data-angles-task-prompt]').textContent).toMatch(/bearing of 250°/);
    await type(c.querySelector('#stem-angles-cxt-input'), '430');
    await click(c.querySelector('button[aria-label="Check my answer"]'));
    expect(c.textContent).toMatch(/Bearings run from 000° to 359°/);
    await type(c.querySelector('#stem-angles-cxt-input'), '070');
    await click(c.querySelector('button[aria-label="Check my answer"]'));
    expect(live.d.cxtRes.ok).toBe(true);
  });
  it('ramps: the 1:12 rule is a choice with a worked reason', async () => {
    const task = { kind: 'pitch', v: 'ada', rise: 6, run: 60, answer: 'no', id: 'cx:pt:ada:6:60' };
    const c = await mount({ protractor: { activeTab: 'contexts', cxMode: 'pitch', cxtT: task } });
    await click(byText(c, 'Yes, it meets the rule'));
    expect(c.textContent).toMatch(/needs at least 12 × 6 = 72 inches of run\. This ramp has 60/);
    await click(byText(c, 'No, it is too steep'));
    expect(live.d.cxtRes.ok).toBe(true);
  });
});

describe('constructions: keyboard-operable compass and straightedge', () => {
  async function arc(c, centre) {
    await choose(c.querySelector('#stem-angles-con-centre'), centre);
    await click(byText(c, 'Draw arc'));
  }
  async function setWidth(c, w) {
    const r = c.querySelector('#stem-angles-con-width');
    await React.act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(r, String(w));
      r.dispatchEvent(new window.Event('input', { bubbles: true }));
      r.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
  }
  it('bisects an angle step by step; the protractor check confirms equal halves; credit once', async () => {
    const c = await mount({ protractor: { activeTab: 'construct', conKind: 'bisect' } });
    expect(c.querySelector('[data-angles-con-guide]')).toBeTruthy();
    await arc(c, 'A');
    expect(c.querySelector('[data-angles-con-msg]').textContent).toMatch(/needle on the vertex B/);
    await setWidth(c, 50);
    await arc(c, 'B');
    expect(live.d.con.steps.length).toBe(1);
    expect(c.querySelector('[data-angles-con-steps]').textContent).toMatch(/crosses BA at D and BC at E/);
    // Open the compass to DE exactly, then arcs from D and E.
    await choose(c.querySelector('#stem-angles-con-ma'), 'D');
    await choose(c.querySelector('#stem-angles-con-mb'), 'E');
    await click(byText(c, 'Set the width'));
    const de = live.d.conW;
    expect(de).toBeGreaterThan(10);
    await arc(c, 'D');
    await arc(c, 'E');
    expect(c.querySelector('[data-angles-con-steps]').textContent).toMatch(/cross at F/);
    await click(byText(c, 'Straightedge'));
    await choose(c.querySelector('#stem-angles-con-from'), 'B');
    await choose(c.querySelector('#stem-angles-con-through'), 'F');
    await click(byText(c, 'Draw the ray'));
    const msg = c.querySelector('[data-angles-con-msg]');
    expect(msg.getAttribute('data-angles-con-msg')).toBe('verified');
    const halves = msg.textContent.match(/∠ABF = ([\d.]+)° and ∠FBC = ([\d.]+)°/);
    expect(halves[1]).toBe(halves[2]);
    expect(Number(halves[1]) * 2).toBeCloseTo(live.d.con.m, 0);
    expect(xpFor('construction')).toEqual([['protractor', 5, 'construction']]);
    expect(live.d.conSolved).toEqual({ bisect: 1 });
  });
  it('changing the width between the two arcs misses the bisector, is named, and can be undone', async () => {
    const c = await mount({ protractor: { activeTab: 'construct', conKind: 'bisect' } });
    await setWidth(c, 50); await arc(c, 'B');
    await click(byText(c, 'Set the width'));
    const de = live.d.conW;
    await arc(c, 'D');
    await setWidth(c, Math.round(de * 1.4));
    await arc(c, 'E');
    await click(byText(c, 'Straightedge'));
    await click(byText(c, 'Draw the ray'));
    expect(c.querySelector('[data-angles-con-msg]').getAttribute('data-angles-con-msg')).toBe('verify_off');
    expect(c.textContent).toMatch(/used different widths/);
    expect((live.d.misTally || {}).con_width_changed).toBe(1);
    expect(xpFor('construction').length).toBe(0);
    await click(byText(c, 'Undo last step'));
    await click(byText(c, 'Undo last step'));
    expect(live.d.con.steps.length).toBe(2);
  });
  it('copies an angle with the chord-length step', async () => {
    const c = await mount({ protractor: { activeTab: 'construct', conKind: 'copy' } });
    await setWidth(c, 40); await arc(c, 'B');
    await arc(c, 'P');
    await choose(c.querySelector('#stem-angles-con-ma'), 'D');
    await choose(c.querySelector('#stem-angles-con-mb'), 'E');
    await click(byText(c, 'Set the width'));
    await arc(c, 'E2');
    expect(c.querySelector('[data-angles-con-steps]').textContent).toMatch(/crosses the arc from P at D′/);
    await click(byText(c, 'Straightedge'));
    await choose(c.querySelector('#stem-angles-con-from'), 'P');
    await choose(c.querySelector('#stem-angles-con-through'), 'D2');
    await click(byText(c, 'Draw the ray'));
    expect(c.querySelector('[data-angles-con-msg]').textContent).toMatch(new RegExp('∠D′PE′ = ' + live.d.con.m + '° and ∠ABC = ' + live.d.con.m + '°'));
  });
});

describe('pointer drag: pointer capture, other pointers ignored, touch fallback, cleanup', () => {
  class FakePointerEvent extends window.MouseEvent {
    constructor(type, init) { super(type, init); this.pointerId = init.pointerId; this.isPrimary = init.isPrimary !== false; this.pointerType = init.pointerType || 'mouse'; }
  }
  const pe = (type, x, y, id, extra) => new FakePointerEvent(type, Object.assign({ bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: id, button: 0 }, extra || {}));
  afterEach(() => { delete window.PointerEvent; });
  function rig(svg, w, h) { svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: w, height: h, right: w, bottom: h }); }
  it('captures the pointer, follows only that pointer, and stops on pointerup and lost capture', async () => {
    window.PointerEvent = FakePointerEvent;
    const c = await mount({ angleValue: 0, protractor: { activeTab: 'explore' } });
    rig(c.querySelector('[data-protractor-svg]'), 400, 420);
    const handle = c.querySelector('[aria-label="Angle ray handle"]');
    expect(handle.style.touchAction).toBe('none');
    const caps = [];
    handle.setPointerCapture = (id) => caps.push(['set', id]);
    handle.hasPointerCapture = () => true;
    handle.releasePointerCapture = (id) => caps.push(['release', id]);
    await React.act(async () => { handle.dispatchEvent(pe('pointerdown', 370, 200, 7)); });
    expect(caps).toEqual([['set', 7]]);
    // Far outside the SVG, still dragging: straight up from the centre is 90°.
    await React.act(async () => { window.dispatchEvent(pe('pointermove', 200, -500, 7)); });
    expect(live.angleValue).toBe(90);
    await React.act(async () => { window.dispatchEvent(pe('pointermove', 0, 200, 8)); });
    expect(live.angleValue, 'a second finger moved the ray').toBe(90);
    await React.act(async () => { window.dispatchEvent(pe('pointerup', 0, 200, 7)); });
    expect(caps).toContainEqual(['release', 7]);
    await React.act(async () => { window.dispatchEvent(pe('pointermove', 0, 200, 7)); });
    expect(live.angleValue, 'still dragging after pointerup').toBe(90);
    // Lost capture ends a drag too.
    await React.act(async () => { c.querySelector('[aria-label="Angle ray handle"]').dispatchEvent(pe('pointerdown', 200, 30, 9)); });
    await React.act(async () => { window.dispatchEvent(pe('pointermove', 30, 200, 9)); });
    expect(live.angleValue).toBe(180);
    await React.act(async () => { c.querySelector('[aria-label="Angle ray handle"]').dispatchEvent(pe('lostpointercapture', 0, 0, 9, { bubbles: false })); });
    await React.act(async () => { window.dispatchEvent(pe('pointermove', 200, 400, 9)); });
    expect(live.angleValue).toBe(180);
    // A right-button press does not start a drag.
    await React.act(async () => { c.querySelector('[aria-label="Angle ray handle"]').dispatchEvent(pe('pointerdown', 200, 30, 10, { button: 2 })); });
    await React.act(async () => { window.dispatchEvent(pe('pointermove', 200, 400, 10)); });
    expect(live.angleValue).toBe(180);
  });
  it('moves the protractor by pointer, and unmounting mid-drag removes the window listeners', async () => {
    window.PointerEvent = FakePointerEvent;
    const c = await mount({ protractor: { activeTab: 'protractor', mMode: 'read', mPlace: { x: 100, y: 200, rot: 0 } } });
    rig(c.querySelector('[data-angles-measure-svg]'), 420, 350);
    const prot = c.querySelector('[data-angles-protractor]');
    prot.setPointerCapture = () => {};
    await React.act(async () => { prot.dispatchEvent(pe('pointerdown', 100, 200, 3)); });
    await React.act(async () => { window.dispatchEvent(pe('pointermove', 130, 180, 3)); });
    expect(live.d.mPlace).toMatchObject({ x: 130, y: 180 });
    const removed = [];
    const orig = window.removeEventListener.bind(window);
    window.removeEventListener = (type, fn, o) => { removed.push(type); return orig(type, fn, o); };
    try { await unmountLast(); } finally { window.removeEventListener = orig; }
    expect(removed).toContain('pointermove');
    expect(removed).toContain('pointerup');
  });
  it('without Pointer Events, a one-finger touch drag works and other fingers are ignored', async () => {
    const c = await mount({ angleValue: 0, protractor: { activeTab: 'explore' } });
    rig(c.querySelector('[data-protractor-svg]'), 400, 420);
    const handle = c.querySelector('[aria-label="Angle ray handle"]');
    const touchEv = (type, list, changed, target) => { const e = new window.Event(type, { bubbles: true, cancelable: true }); Object.defineProperty(e, 'touches', { value: list }); Object.defineProperty(e, 'changedTouches', { value: changed || list }); (target || window).dispatchEvent(e); };
    await React.act(async () => { touchEv('touchstart', [{ identifier: 1, clientX: 370, clientY: 200 }], null, handle); });
    await React.act(async () => { touchEv('touchmove', [{ identifier: 2, clientX: 0, clientY: 200 }, { identifier: 1, clientX: 200, clientY: 30 }]); });
    expect(live.angleValue).toBe(90);
    await React.act(async () => { touchEv('touchmove', [{ identifier: 2, clientX: 30, clientY: 200 }]); });
    expect(live.angleValue).toBe(90);
    await React.act(async () => { touchEv('touchend', [], [{ identifier: 1, clientX: 200, clientY: 30 }]); });
    await React.act(async () => { touchEv('touchmove', [{ identifier: 1, clientX: 30, clientY: 200 }]); });
    expect(live.angleValue).toBe(90);
  });
  it('the unit-circle point drags and snaps to 15°', async () => {
    window.PointerEvent = FakePointerEvent;
    const c = await mount({ protractor: { activeTab: 'circles', ciMode: 'unit', ucDeg: 0 } });
    rig(c.querySelector('[data-angles-unit-svg="explore"]'), 360, 320);
    const hd = c.querySelector('[data-angles-uc-handle]');
    hd.setPointerCapture = () => {};
    await React.act(async () => { hd.dispatchEvent(pe('pointerdown', 300, 160, 4)); });
    // 50° from the centre (180, 160) snaps to 45°.
    await React.act(async () => { window.dispatchEvent(pe('pointermove', 180 + 100 * Math.cos(50 * Math.PI / 180), 160 - 100 * Math.sin(50 * Math.PI / 180), 4)); });
    expect(live.d.ucDeg).toBe(45);
  });
});

describe('tabs, teacher hooks, i18n and old saves', () => {
  it('ten tabs; every aria-controls target exists; the teacher can lock a new tab', async () => {
    const c = await mount({ protractor: { activeTab: 'polygons' } }, { isTeacherMode: true });
    const tabs = Array.from(c.querySelectorAll('[role="tab"]'));
    // Stage C: band-aware order (no band = grades 5–7: puzzles, polygons, real world first; Reference last).
    expect(tabs.map((tb) => tb.id.replace('stem-angles-tab-', ''))).toEqual(['puzzles', 'polygons', 'contexts', 'protractor', 'challenges', 'explore', 'circles', 'construct', 'tools', 'reference']);
    for (const tb of tabs) expect(c.querySelector('#' + tb.getAttribute('aria-controls'))).toBeTruthy();
    const lock = c.querySelectorAll('[data-angles-teacher] select')[1];
    expect(Array.from(lock.options).map((o) => o.value)).toContain('construct');
    await choose(lock, 'circles');
    expect(live.d.teacher.lockTab).toBe('circles');
    await unmountLast();
    const s = await mount({ protractor: { activeTab: 'protractor', teacher: { lockTab: 'circles' } } });
    expect(Array.from(s.querySelectorAll('[role="tab"]')).map((tb) => tb.id)).toEqual(['stem-angles-tab-circles', 'stem-angles-tab-reference']);
    expect(s.querySelector('[data-angles-circles]')).toBeTruthy();
  });
  it('the missed-items table names the new misconceptions; reveals can be switched off', async () => {
    const c = await mount({ protractor: { activeTab: 'circles', misTally: { sum_n180: 2, pi_is_180_number: 1, con_width_changed: 1 } } }, { isTeacherMode: true });
    const tally = c.querySelector('[data-angles-tally]').textContent;
    expect(tally).toMatch(/Polygons: used n × 180° for the angle sum\s*2/);
    expect(tally).toMatch(/Radians: treated π as the number 180\s*1/);
    expect(tally).toMatch(/changed the compass width/);
    await unmountLast();
    const task = { kind: 'sum', n: 7, answer: 900, id: 'pg:sum:7' };
    const s = await mount({ protractor: { activeTab: 'polygons', pgMode: 'practice', pgpT: task, teacher: { noReveal: true } } });
    for (const v of ['1260', '1000', '1100']) {
      await type(s.querySelector('#stem-angles-pgp-input'), v);
      await click(s.querySelector('button[aria-label="Check my answer"]'));
    }
    expect(s.textContent.includes('The answer is 900')).toBe(false);
    expect(s.querySelector('button[aria-label="Check my answer"]').disabled).toBe(false);
  });
  it('every visible string in the new tabs goes through t()', async () => {
    const cases = [
      { activeTab: 'polygons', pgMode: 'sum', pgPred: { pick: 'p_add180', locked: true }, pgN: 4, pgDiags: [[0, 2]], pgRuns: { 4: { tri: 2, sum: 360 } }, pgRow: { n: 4, code: 'ok', ok: true, tries: 1 } },
      { activeTab: 'polygons', pgMode: 'ext', pgWalkPred: { pick: 'w_360', locked: true }, pgWalk: { n: 4, seed: 3, step: 4 }, pgWalkRuns: { 4: 360, 5: 360 } },
      { activeTab: 'polygons', pgMode: 'tile', pgTilePred: { picks: { 3: true }, locked: true }, pgTileRows: { 3: { ok: true }, 4: { ok: true }, 5: { ok: true }, 6: { ok: true } }, pgMix: [4, 8] },
      { activeTab: 'polygons', pgMode: 'practice', level: 'g8', pgpT: { kind: 'missing', n: 5, seed: 12, angles: [100, 110, 120, 90, 120], which: 1, answer: 110, id: 'pg:miss:t' }, pgpHint: 2 },
      { activeTab: 'circles', ciMode: 'inscribed', citT: { kind: 'inscribed', a: 0, b: 100, p: 230, m: 100, ask: 'insc', given: 100, answer: 50, id: 'i' }, citRes: { code: 'ok', ok: true }, citHint: 0 },
      { activeTab: 'circles', ciMode: 'cyclic', level: 'g4' },
      { activeTab: 'circles', ciMode: 'unit', ucDeg: 135 },
      { activeTab: 'circles', ciMode: 'unit', ucView: 'practice', level: 'g8', uctT: { kind: 'coord', deg: 150, fn: 'cos', answer: '-√3/2', id: 'u' }, uctHint: 2 },
      { activeTab: 'contexts', cxMode: 'bearing', level: 'g8', cxtT: { kind: 'bearing', v: 'quad', ns: 'S', x: 30, ew: 'W', answer: 210, id: 'q' }, cxtHint: 2 },
      { activeTab: 'contexts', cxMode: 'pitch', level: 'g8', cxtT: { kind: 'pitch', v: 'tan', rise: 6, run: 12, answer: 26.6, id: 'p' }, cxtRes: { code: 'pitch_used_sin', revealed: true }, cxtTries: 2 },
      { activeTab: 'construct', conKind: 'copy' }
    ];
    for (const st of cases) {
      const c = await mount({ protractor: st }, { t: (k) => (/^stem\.angles\./.test(k) ? '⟦T⟧' : k) });
      const walker = document.createTreeWalker(c, window.NodeFilter.SHOW_TEXT);
      const bad = [];
      while (walker.nextNode()) {
        const s = walker.currentNode.nodeValue.trim();
        if (s && /[A-Za-z]{3,}/.test(s) && !s.includes('⟦T⟧')) bad.push(s);
      }
      const labels = Array.from(c.querySelectorAll('[aria-label]')).map((e) => e.getAttribute('aria-label')).filter((s) => /[A-Za-z]{3,}/.test(s) && !s.includes('⟦T⟧'));
      expect(bad.concat(labels), JSON.stringify(st).slice(0, 80)).toEqual([]);
      await unmountLast();
    }
  });
  it('junk saved values for every new key still load', async () => {
    const junk = { activeTab: 'polygons', pgMode: 7, pgN: 'x', pgSeed: null, pgDiags: [[0, 1], 'x', [5, 2], [0, 99]], pgSel: 42, pgRuns: [1], pgRow: 'x', pgPred: 3, pgClaim: [], pgWalk: { n: 99 }, pgTileRows: 'x', pgMix: ['a', 3, 99],
      pgpT: { kind: 'missing' }, citT: { kind: 'cyclic', pos: [1] }, ciLive: { id: 5 }, ciMove: 'zz', ucDeg: 'x', uctT: { kind: 'coord' }, cxtT: { kind: 'clock' }, con: { kind: 'bisect', steps: [{ tool: 'compass', centre: 'Z', r: 'x' }] }, conW: 'big', conCentre: 'Q' };
    for (const tab of ['polygons', 'circles', 'contexts', 'construct']) {
      for (const sub of [{}, { pgMode: 'practice', ciMode: 'unit', ucView: 'practice' }]) {
        const c = await mount({ protractor: Object.assign({}, junk, sub, { activeTab: tab }) });
        expect(c.querySelector('[role="tabpanel"]:not([hidden])').textContent.length).toBeGreaterThan(50);
        await unmountLast();
      }
    }
    // A saved construction is replayed: an illegal saved step is dropped, not drawn.
    const ok = { kind: 'bisect', m: 80, base: 0, B: { x: 140, y: 200 }, lenBA: 150, lenBC: 150, id: 'con:bisect:80:0', steps: [{ tool: 'compass', centre: 'B', r: 50 }, { tool: 'line', from: 'B', through: 'A' }] };
    const c = await mount({ protractor: { activeTab: 'construct', con: ok } });
    expect(c.querySelector('[data-angles-con-steps]').querySelectorAll('li').length).toBe(1);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

describe('smoke: every new tab and mode mounts cleanly', () => {
  it('light, dark and teacher, every level', async () => {
    const states = [];
    for (const m of ['sum', 'ext', 'tile', 'practice']) states.push({ activeTab: 'polygons', pgMode: m });
    for (const m of ['inscribed', 'semi', 'cyclic', 'unit']) states.push({ activeTab: 'circles', ciMode: m });
    states.push({ activeTab: 'circles', ciMode: 'unit', ucView: 'practice' });
    for (const m of ['clock', 'bearing', 'pitch']) states.push({ activeTab: 'contexts', cxMode: m });
    states.push({ activeTab: 'construct' }, { activeTab: 'construct', conKind: 'copy' });
    for (const st of states) {
      for (const lv of ['g4', 'g57', 'g8']) {
        for (const extra of [{}, { isDark: true }, { isTeacherMode: true }]) {
          // Hints open on every card; teacher runs also show revealed solutions.
          const shown = { pgpHint: 2, citHint: 2, uctHint: 2, cxtHint: 2 };
          if (extra.isTeacherMode) ['pgp', 'cit', 'uct', 'cxt'].forEach((pf) => { shown[pf + 'Res'] = { code: 'off', revealed: true }; shown[pf + 'Tries'] = 2; });
          const c = await mount({ protractor: Object.assign({ level: lv }, shown, st) }, extra);
          const panel = c.querySelector('[role="tabpanel"]:not([hidden])');
          expect(panel.id, JSON.stringify(st)).toBe('stem-angles-panel-' + st.activeTab);
          const sel = { polygons: '[data-angles-polygons]', circles: '[data-angles-circles]', contexts: '[data-angles-contexts]', construct: '[data-angles-construct]' }[st.activeTab];
          expect(panel.querySelector(sel), JSON.stringify(st)).toBeTruthy();
          const ariaText = Array.from(c.querySelectorAll('[aria-label]')).map((e) => e.getAttribute('aria-label')).join(' ');
          expect((c.textContent + ' ' + ariaText).match(/\{\w+\}|undefined|NaN/g), JSON.stringify(st)).toBe(null);          await unmountLast();
        }
      }
    }
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
