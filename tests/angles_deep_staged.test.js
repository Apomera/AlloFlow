// Angle Explorer stage D (2026-11-04): an independent tester's regressions.
// Each test failed on the stage C file. ANGLES_DEEP_SRC points at another copy.
//  - polygon practice drew the answer: a "how many sides?" item showed that polygon;
//  - yes/no questions (ADA ramp, tiling) paid XP on the second try, by elimination;
//  - the minor-arc inscribed item labelled the MAJOR arc with the minor arc's measure;
//  - ramps and roofs drew any angle over ~33 degrees at ~33 degrees (rise was capped);
//  - the crossing-lines description named corners as if the diagram were never rotated;
//  - the clock description said the hour hand "moved past" the hour at o'clock times;
//  - a task card with no diagram (radians as numbers) still drew an empty diagram box.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = process.env.ANGLES_DEEP_SRC || 'stem_lab/stem_tool_angles.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let mounted = [];
let xp = [];
let errors = [];
let said = [];

beforeEach(() => {
  resetStemLab();
  loadTool(SOURCE, 'protractor');
  xp = []; errors = []; said = [];
  vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ').slice(0, 400)); });
});

afterEach(async () => {
  vi.restoreAllMocks();
  while (mounted.length) {
    const { root, container } = mounted.pop();
    await React.act(async () => root.unmount());
    container.remove();
  }
  expect(errors, 'console errors').toEqual([]);
});

async function mount(init, extra) {
  const cfg = window.StemLab._registry.protractor;
  const container = document.createElement('div');
  document.body.appendChild(container);
  function Host() {
    const [angleValue, setAngleValue] = React.useState(45);
    const [angleChallenge, setAngleChallenge] = React.useState(null);
    const [angleFeedback, setAngleFeedback] = React.useState(null);
    const [exploreScore, setExploreScore] = React.useState({ correct: 0, total: 0 });
    const [toolData, setToolData] = React.useState({ protractor: init || {} });
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
const click = async (el) => { expect(el, 'element to click').toBeTruthy(); await React.act(async () => { el.click(); }); };
const byText = (c, text) => Array.from(c.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === text || (b.textContent || '').includes(text));
const emptyFrames = (el) => Array.from(el.querySelectorAll('div')).filter((dv) => /rounded-xl/.test(dv.className) && dv.children.length === 0).length;
const nums = (s) => String(s).trim().split(/[\s,]+/).map(Number);
const dirDeg = (x1, y1, x2, y2) => { const d = Math.atan2(-(y2 - y1), x2 - x1) * 180 / Math.PI; return d < 0 ? d + 360 : d; };

describe('polygon practice never draws the answer', () => {
  for (const [kind, task] of [
    ['sides', { kind: 'sides', n: 7, s: 900, answer: 7, id: 'pg:sides:7' }],
    ['extn', { kind: 'extn', n: 8, e: 45, answer: 8, id: 'pg:extn:8' }],
  ]) {
    it(kind + ': no polygon with the answer\'s number of sides before the attempt; it appears once the item is solved', async () => {
      const c = await mount({ activeTab: 'polygons', pgMode: 'practice', pgpKind: kind, pgpT: task }, { gradeBand: 'g912' });
      const card = c.querySelector('[data-angles-task="pgp"]');
      expect(card).toBeTruthy();
      const sided = Array.from(card.querySelectorAll('svg polygon')).filter((pg) => nums(pg.getAttribute('points')).length === 2 * task.n);
      expect(sided.length, 'a ' + task.n + '-sided polygon is drawn next to "how many sides?"').toBe(0);
      // No empty diagram frame either.
      expect(emptyFrames(card), 'empty diagram frame').toBe(0);
      const input = card.querySelector('#stem-angles-pgp-input');
      await React.act(async () => {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, String(task.answer));
        input.dispatchEvent(new window.Event('input', { bubbles: true }));
      });
      await click(byText(card, '✔ Check'));
      const after = c.querySelector('[data-angles-task="pgp"]');
      expect(after.querySelector('[data-angles-task-result="ok"]')).toBeTruthy();
      const shown = Array.from(after.querySelectorAll('svg polygon')).filter((pg) => nums(pg.getAttribute('points')).length === 2 * task.n);
      expect(shown.length, 'the polygon confirms the answer after it is solved').toBe(1);
    });
  }
  it('a task with no diagram (radians as numbers) draws no empty diagram frame', async () => {
    const c = await mount({ activeTab: 'circles', ciMode: 'unit', ucView: 'practice', uctKind: 'radnum', uctT: { kind: 'radnum', r: 2, answer: 114.6, id: 'uc:radnum:2' } }, { gradeBand: 'g912' });
    const card = c.querySelector('[data-angles-task="uct"]');
    expect(card).toBeTruthy();
    expect(emptyFrames(card), 'empty diagram frame').toBe(0);
    expect(card.querySelector('[data-angles-task-desc]')).toBe(null);
    // A card with a diagram still has its frame and description.
    const c2 = await mount({ activeTab: 'circles', ciMode: 'unit', ucView: 'practice', uctKind: 'ref', uctT: { kind: 'ref', deg: 150, answer: 30, id: 'uc:ref:150' } }, { gradeBand: 'g912' });
    const card2 = c2.querySelector('[data-angles-task="uct"]');
    expect(card2.querySelector('[data-angles-task-diagram] svg')).toBeTruthy();
    expect(card2.querySelector('[data-angles-task-desc]').textContent).toContain('150°');
  });
});

describe('no XP for a yes/no answer found by elimination', () => {
  it('ADA ramp: wrong, then right, earns nothing; right first time earns XP', async () => {
    const task = { kind: 'pitch', v: 'ada', rise: 6, run: 72, answer: 'yes', id: 'cx:pt:ada:6:72' };
    const c = await mount({ activeTab: 'contexts', cxMode: 'pitch', cxtT: task }, { gradeBand: 'g912' });
    await click(byText(c, 'No, it is too steep'));
    await click(byText(c, 'Yes, it meets the rule'));
    expect(c.querySelector('[data-angles-task-result="ok"]'), 'the second try is still marked right').toBeTruthy();
    expect(xp.filter((x) => x[2] === 'angle in context'), 'XP for the second of two choices').toEqual([]);
    const c2 = await mount({ activeTab: 'contexts', cxMode: 'pitch', cxtT: Object.assign({}, task, { run: 66, answer: 'no', id: 'cx:pt:ada:6:66' }) }, { gradeBand: 'g912' });
    await click(byText(c2, 'No, it is too steep'));
    expect(xp.filter((x) => x[2] === 'angle in context').length).toBe(1);
  });
  it('tiling: wrong, then right, earns nothing; right first time earns XP', async () => {
    const c = await mount({ activeTab: 'polygons', pgMode: 'tile', pgTilePred: { picks: {}, locked: true }, pgTileSel: 5 }, { gradeBand: 'g68' });
    const yes = () => Array.from(c.querySelectorAll('[data-angles-pg-tile] button')).find((b) => b.textContent === 'Yes');
    const no = () => Array.from(c.querySelectorAll('[data-angles-pg-tile] button')).find((b) => b.textContent === 'No');
    await click(yes());
    await click(no());
    expect(xp.filter((x) => x[2] === 'tiling evidence'), 'XP for the second of two choices').toEqual([]);
    await click(Array.from(c.querySelectorAll('[aria-label="Polygon to test"] button')).find((b) => b.textContent === 'Hexagon'));
    await click(yes());
    expect(xp.filter((x) => x[2] === 'tiling evidence').length).toBe(1);
  });
});

describe('diagrams match the numbers they carry', () => {
  it('minor-arc inscribed angle: before the check, the central-angle label sits on the minor arc it measures', async () => {
    const task = { kind: 'inscribed', a: 0, b: 100, p: 50, m: 100, ask: 'minor', given: 100, answer: 130, id: 'ci:insc:100:minor' };
    const c = await mount({ activeTab: 'circles', ciMode: 'inscribed', citT: task }, { gradeBand: 'g912' });
    const svg = c.querySelector('[data-angles-circle-svg="inscribed"]');
    const lab = Array.from(svg.querySelectorAll('text')).find((tx) => tx.textContent === '100°');
    expect(lab, 'the 100° label').toBeTruthy();
    const dir = dirDeg(180, 150, Number(lab.getAttribute('x')), Number(lab.getAttribute('y')) - 4);
    expect(dir, 'label direction from O (the minor arc runs 0° to 100°)').toBeGreaterThan(0);
    expect(dir).toBeLessThan(100);
    // The highlighted arc ends at A and B and passes through the minor side (P's side).
    const arc = svg.querySelector('path[stroke-width="5"]');
    const m = arc.getAttribute('d').match(/A [\d.]+ [\d.]+ 0 (\d) (\d)/);
    expect(m && m[1], 'large-arc flag: the minor arc is under 180°').toBe('0');
  });
  it('minor-arc item after the check: the far (major) arc and its measure, as the readout says', async () => {
    const task = { kind: 'inscribed', a: 0, b: 100, p: 50, m: 100, ask: 'minor', given: 100, answer: 130, id: 'ci:insc:100:minor' };
    const c = await mount({ activeTab: 'circles', ciMode: 'inscribed', citT: task, citRes: { code: 'off', revealed: true }, citTries: 2 }, { gradeBand: 'g912' });
    const svg = c.querySelector('[data-angles-circle-svg="inscribed"]');
    const lab = Array.from(svg.querySelectorAll('text')).find((tx) => tx.textContent === '260°');
    expect(lab).toBeTruthy();
    const dir = dirDeg(180, 150, Number(lab.getAttribute('x')), Number(lab.getAttribute('y')) - 4);
    expect(dir > 100 && dir < 360).toBe(true);
  });
  for (const [label, task, want] of [
    ['rafter at 70°', { kind: 'pitch', v: 'vertical', a: 70, answer: 20, id: 'cx:pt:vert:70' }, 70],
    ['12/12 roof (45°)', { kind: 'pitch', v: 'tan', rise: 12, run: 12, answer: 45, id: 'cx:pt:tan:12' }, 45],
    ['roof at 40°', { kind: 'pitch', v: 'rise', a: 40, run: 12, answer: 10.1, id: 'cx:pt:rise:40' }, 40],
    ['rafter at 20° (already fitted)', { kind: 'pitch', v: 'vertical', a: 20, answer: 70, id: 'cx:pt:vert:20' }, 20],
  ]) {
    it('ramps and roofs: the ' + label + ' is drawn at its real angle', async () => {
      const c = await mount({ activeTab: 'contexts', cxMode: 'pitch', cxtT: task }, { gradeBand: 'g912' });
      const lines = c.querySelectorAll('[data-angles-cx-svg="pitch"] line');
      const slope = lines[2];
      const g = (a) => Number(slope.getAttribute(a));
      expect(dirDeg(g('x1'), g('y1'), g('x2'), g('y2'))).toBeCloseTo(want, 0);
      const base = lines[0], post = lines[1];
      expect(Number(base.getAttribute('x2'))).toBeCloseTo(Number(post.getAttribute('x1')), 6);
      // The whole triangle stays inside the 340 x 220 viewBox.
      for (const ln of lines) for (const [ax, lim] of [['x1', 340], ['x2', 340], ['y1', 220], ['y2', 220]]) {
        const v = Number(ln.getAttribute(ax));
        expect(v >= 0 && v <= lim, ax + '=' + v).toBe(true);
      }
    });
  }
});

describe('the worked example never prints the current answer', () => {
  const tokens = (s) => String(s).replace(/−/g, '-').match(/-?√?\d+(?:\.\d+)?π?(?:\/\d+)?|π(?:\/\d+)?/g) || [];
  const parts = (s) => tokens(s).flatMap((tk) => (/\//.test(tk) && !/[π√]/.test(tk) ? [tk].concat(tk.replace(/^-/, '').split('/')) : [tk]));
  // Each item below got a worked example that solved it on the stage C file.
  it('radians: 300° to radians is not worked beside 5π/3 to degrees', async () => {
    const c = await mount({ activeTab: 'puzzles', pzKind: 'rad', pz: { kind: 'rad', deg: 300, dir: 'toRad', answer: '5π/3', id: 'rad:300:toRad' } }, { gradeBand: 'g912' });
    const w = c.querySelector('[data-angles-worked="full"]');
    expect(w, 'a worked example is still shown').toBeTruthy();
    expect(parts(w.textContent)).not.toContain('5π/3');
    expect(parts(w.textContent)).not.toContain('300');
  });
  it('parallel lines: the worked example does not print x', async () => {
    const pz = { kind: 'trans', alpha: 137, given: { i: 0, p: 3 }, ask: { i: 1, p: 0 }, rel: 'co_interior', a: 43, answer: 137, id: 'trans:137:0310' };
    const c = await mount({ activeTab: 'puzzles', pzKind: 'trans', pz: pz }, { gradeBand: 'g912' });
    const w = c.querySelector('[data-angles-worked="full"]');
    expect(w).toBeTruthy();
    expect(parts(w.textContent)).not.toContain('137');
  });
  it('unit circle: cos 300° is not worked beside sin 300°', async () => {
    const c = await mount({ activeTab: 'circles', ciMode: 'unit', ucView: 'practice', uctKind: 'coord', uctT: { kind: 'coord', deg: 300, fn: 'cos', answer: '1/2', id: 'uc:coord:300:cos' } }, { gradeBand: 'g68' });
    const w = c.querySelector('[data-angles-task="uct"] [data-angles-task-worked="full"]');
    expect(w).toBeTruthy();
    expect(w.textContent).not.toContain('300°');
    expect(parts(w.textContent)).not.toContain('1/2');
  });
  it('inscribed angle (grade 4 numbers): the worked example does not print the answer', async () => {
    const task = { kind: 'inscribed', a: 0, b: 120, p: 240, m: 120, ask: 'insc', given: 120, answer: 60, id: 'ci:insc:120:insc' };
    const c = await mount({ activeTab: 'circles', ciMode: 'inscribed', citT: task }, { gradeBand: 'g35' });
    const w = c.querySelector('[data-angles-task="cit"] [data-angles-task-worked="full"]');
    expect(w).toBeTruthy();
    expect(parts(w.textContent)).not.toContain('60');
  });
});

describe('hostile saved polygon state', () => {
  it('fractional vertex indexes and walk sizes are dropped, not rendered (they crashed the tab)', async () => {
    const c = await mount({ activeTab: 'polygons', pgMode: 'sum', pgN: 5, pgPred: { pick: 'p_add180', locked: true }, pgDiags: [[0.5, 2.5], [0, 2]], pgSel: 1.5 }, { gradeBand: 'g68' });
    expect(c.querySelector('[data-angles-pg-desc]').textContent).toContain('Diagonals drawn: AC.');
    expect(c.querySelector('[data-angles-pg-sum] [aria-pressed="true"][aria-label^="Vertex"]')).toBe(null);
    const c2 = await mount({ activeTab: 'polygons', pgMode: 'ext', pgWalkPred: { pick: 'w_360', locked: true }, pgWalk: { n: 3.5, seed: 5, step: 2 } }, { gradeBand: 'g68' });
    expect(c2.querySelector('[data-angles-walk-svg]')).toBeTruthy();
    const c3 = await mount({ activeTab: 'polygons', pgMode: 'ext', pgWalkPred: { pick: 'w_360', locked: true }, pgWalk: { n: 5, seed: 5, step: 1.5 } }, { gradeBand: 'g68' });
    expect(c3.querySelector('[data-angles-walk-desc]').textContent).toMatch(/Turns so far: \d+°, \d+°\. Total: \d+°\./);
  });
});

describe('words match the picture', () => {
  it('crossing lines: corner names follow the rotated diagram', async () => {
    const pz = { kind: 'vert', a: 60, ask: 'vertical', askPos: 2, answer: 60, rot: 180, id: 'vert:60:2' };
    const c = await mount({ activeTab: 'puzzles', pzKind: 'vert', pz: pz }, { gradeBand: 'g68' });
    const label = c.querySelector('[data-angles-puzzle-svg="vert"]').getAttribute('aria-label');
    expect(label).toContain('The lower left angle is 60°');
    expect(label).toContain('x is the upper right angle');
    const c2 = await mount({ activeTab: 'puzzles', pzKind: 'vert', pz: { kind: 'vert', a: 70, ask: 'linear', askPos: 1, answer: 110, rot: 0, id: 'vert:70:1' } }, { gradeBand: 'g68' });
    const label2 = c2.querySelector('[data-angles-puzzle-svg="vert"]').getAttribute('aria-label');
    expect(label2).toContain('The upper right angle is 70°');
    expect(label2).toContain('x is the upper left angle');
  });
  it('clock at an o\'clock time: the hour hand points exactly at the hour', async () => {
    const c = await mount({ activeTab: 'contexts', cxMode: 'clock', cxtT: { kind: 'clock', h: 3, m: 0, answer: 90, id: 'cx:clock:3:0' } }, { gradeBand: 'g35' });
    const desc = c.querySelector('[data-angles-task-desc="cxt"]').textContent;
    expect(desc).not.toContain('moved past');
    expect(desc).toContain('exactly at 3');
    const c2 = await mount({ activeTab: 'contexts', cxMode: 'clock', cxtT: { kind: 'clock', h: 3, m: 30, answer: 75, id: 'cx:clock:3:30' } }, { gradeBand: 'g35' });
    expect(c2.querySelector('[data-angles-task-desc="cxt"]').textContent).toContain('moved past 3 toward 4');
  });
});
