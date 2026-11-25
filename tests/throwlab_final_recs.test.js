// Throw Lab, final recommendations round (2026-11-23 evening).
// 1. Rolling free kicks: a low kick used to stop at the bounce cap (about 6 bounces, 0.7 s) and be ruled
//    "short" even at 60 mph. Now, once a bounce is too small to leave the ground, the ball rolls, slowed by
//    a stated rolling resistance (MODES.freekick.rollDecel, a model choice) plus drag. The goal-line check,
//    the wall, the drawn path and the where-it-went sentence all use the rolled path.
// 2. The call panel says a call is needed while a drill runs (it said "optional").
// THROWLAB_FILE=C:/tmp/sports_labs_1123/throwlab/start_r4.js runs the checks against the earlier copy.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.THROWLAB_FILE || 'stem_lab/stem_tool_throwlab.js';
const source = readFileSync(FILE, 'utf8');

function loadModel() {
  const win = { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false }) };
  const doc = {
    getElementById: () => null,
    createElement: () => ({ setAttribute() {}, appendChild() {}, style: {} }),
    head: { appendChild() {} }, body: { appendChild() {} }, addEventListener() {},
  };
  win.document = doc; win.window = win;
  const ctx = vm.createContext({ window: win, document: doc, console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout, navigator: {} });
  vm.runInContext(source, ctx, { filename: 'stem_tool_throwlab.js' });
  return win.StemLab && win.StemLab.ThrowLabModel;
}

const M = loadModel();
const mm = M.MODES.freekick;
const R = M.BALLS.soccer.radius;
const MPH = 2.23694;
const setupFor = (mode, id, over) => Object.assign(
  { mode, throwerHand: 'right', gravityId: 'earth', windMph: 0, windDirDeg: 0 },
  M.presetPatch(mode, id), over || {});
const run = (mode, id, over) => M.evaluateThrow(setupFor(mode, id, over));
const raw = (over) => {
  const s = setupFor('freekick', 'power', over);
  return M.simulatePitch({ ball: 'soccer', speedMph: s.speedMph, releaseHeight: s.releaseHeight, aimDegV: s.aimDegV, aimDegH: s.aimDegH,
    spinRpm: s.spinRpm, spinAxisDeg: s.spinAxisDeg, throwerHand: 'right', targetZ: mm.targetZ, releaseStride: 0,
    truncateAtTarget: false, allowBounces: true, gravity: over && over.g ? over.g : 9.81, maxT: 4,
    roll: { decel: mm.rollDecel, hopM: mm.rollHopM, stopZ: mm.targetZ + 3, maxT: 30 } });
};
function crossing(samples, value) {
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    if (a.z < value && b.z >= value) {
      const f = (value - a.z) / (b.z - a.z);
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
    }
  }
  return null;
}

// A low drive along the grass, aimed outside the wall: the case the old model called "short".
const LOW = { aimDegV: 0, aimDegH: -9, speedMph: 60 };

describe('rolling free kicks', () => {
  it('the rolling resistance is a stated model choice in the 0.3-0.5 m/s² range', () => {
    expect(mm.rollDecel).toBeGreaterThanOrEqual(0.3);
    expect(mm.rollDecel).toBeLessThanOrEqual(0.5);
    expect(source).toContain('MODEL CHOICE, not a measured value');
    expect(source).toContain("'stem.throwlab.formula_roll'");
    // The Formulas note states the hop limit the model uses.
    expect((mm.rollHopM * 100).toFixed(1)).toBe('1.5');
    expect(source).toContain('A bounce lower than 1.5 cm counts as rolling');
  });

  it('a 60 mph kick along the ground rolls in instead of stopping at the bounce cap', () => {
    const r = run('freekick', 'power', LOW);
    expect(r.location).toBe('goal');
    expect(r.read.roll).toBeTruthy();
    expect(r.read.rolledAtCross).toBe(true);
    expect(r.read.roll.z).toBeLessThan(mm.targetZ);
    // Judged where the rolled path crosses the line, inside the posts, on the ground.
    expect(Math.abs(r.read.cross.x)).toBeLessThanOrEqual(mm.goalHalfWidth);
    expect(r.read.cross.y).toBe(0);
    // The sentence and the numbers describe the same roll.
    expect(r.whereText).toBe('It landed ' + (mm.targetZ - r.read.land.z).toFixed(1) + ' m before the goal line, then rolled over the line '
      + Math.abs(r.read.cross.x).toFixed(2) + ' m ' + (r.read.cross.x > 0 ? 'left' : 'right') + ' of center.');
  });

  it('the drawn path is the rolled path: on the ground after the roll starts, into the net, slowing all the way', () => {
    const r = run('freekick', 'power', LOW);
    const i0 = r.samples.findIndex((s) => s.rollStart);
    expect(i0).toBeGreaterThan(0);
    const rolling = r.samples.slice(i0 + 1);
    expect(rolling.length).toBeGreaterThan(20);
    for (const s of rolling) expect(s.y).toBe(0);
    for (let i = 1; i < rolling.length; i++) expect(Math.hypot(rolling[i].vx, rolling[i].vz)).toBeLessThanOrEqual(Math.hypot(rolling[i - 1].vx, rolling[i - 1].vz) + 1e-9);
    const end = r.samples[r.samples.length - 1];
    expect(end.z).toBeCloseTo(mm.targetZ + 1, 5);
  });

  it('on the grass the ball slows by the stated rolling resistance plus drag', () => {
    // Measured slowing minus the drag at that speed, averaged over 0.1 s steps of the roll.
    function frictionPart(sim) {
      const pts = sim.samples.filter((s) => s.roll);
      const out = [];
      for (let i = 10; i < pts.length; i += 10) {
        const a = pts[i - 10], b = pts[i];
        const va = Math.hypot(a.vx, a.vz), vb = Math.hypot(b.vx, b.vz), vm2 = (va + vb) / 2;
        if (vb === 0) break;
        const drag = 0.5 * 1.225 * vm2 * vm2 * M.BALLS.soccer.cd * Math.PI * R * R / M.BALLS.soccer.mass;
        out.push((va - vb) / (b.t - a.t) - drag);
      }
      return out;
    }
    const earth = frictionPart(raw(LOW));
    expect(earth.length).toBeGreaterThan(5);
    for (const a of earth) expect(Math.abs(a - mm.rollDecel)).toBeLessThan(0.02);
    // Rolling resistance follows gravity: on the Moon the same kind of roll slows about 6 times less.
    const moon = frictionPart(raw({ aimDegV: 0, aimDegH: -9, speedMph: 25, g: 1.62 }));
    expect(moon.length).toBeGreaterThan(5);
    for (const a of moon) expect(Math.abs(a - mm.rollDecel * 1.62 / 9.81)).toBeLessThan(0.02);
  });

  it('a kick that is too slow rolls and stops before the line; the verdict waits until it stops', () => {
    // Follow-up round: shallow hops now cost little speed (throwlab_followup.test.js), so a 25 mph ground
    // drive reaches the line. A 25 mph chip lands steeply, loses much more at each bounce, and stops short.
    const r = run('freekick', 'chip', { speedMph: 25 });
    expect(r.location).toBe('short');
    expect(r.read.rollStop).toBeTruthy();
    expect(r.read.rollStop.z).toBeLessThan(mm.targetZ);
    const end = r.samples[r.samples.length - 1];
    expect(end.vx === 0 && end.vz === 0).toBe(true);
    expect(end.z).toBeCloseTo(r.read.rollStop.z, 6);
    expect(r.flightTime).toBeCloseTo(r.read.rollStop.t, 6);
    expect(r.whereText).toBe('It landed ' + (mm.targetZ - r.read.land.z).toFixed(1) + ' m before the goal line, rolled, and stopped '
      + (mm.targetZ - r.read.rollStop.z).toFixed(1) + ' m short of it.');
  });

  it('a kick that rolls wide is ruled wide where it rolls over the line', () => {
    const r = run('freekick', 'power', { aimDegV: 0, aimDegH: -14, speedMph: 60 });
    expect(r.location).toBe('wide');
    expect(r.read.rolledAtCross).toBe(true);
    expect(Math.abs(r.read.cross.x)).toBeGreaterThan(mm.goalHalfWidth + 0.5);
    expect(r.whereText).toContain('rolled over the line ' + (Math.abs(r.read.cross.x) - mm.goalHalfWidth).toFixed(2) + ' m outside the right post.');
  });

  it('a ball rolling into the wall is blocked, and its path ends at the wall', () => {
    const r = run('freekick', 'curling', { aimDegV: 0, aimDegH: -9, speedMph: 25 });
    expect(r.location).toBe('blocked');
    expect(r.read.rolledAtCross).toBe(true);
    expect(r.read.cross.y).toBe(0);
    expect(r.samples[r.samples.length - 1].z).toBeCloseTo(mm.wallZ, 6);
    expect(r.whereText).toContain('rolled into it.');
  });

  it('the whole ball must cross the line: a roll that stops on the line is not a goal', () => {
    let found = null;
    // Follow-up round: searched with the chip (see the test above for why the ground drive no longer stops).
    for (let s = 25; s <= 27 && !found; s += 0.01) {
      const r = run('freekick', 'chip', { speedMph: +s.toFixed(2) });
      if (r.read.rollStop && r.read.rollStop.z >= mm.targetZ && r.read.rollStop.z < mm.targetZ + R) found = r;
    }
    expect(found).toBeTruthy();
    expect(found.location).toBe('short');
    expect(found.whereText).toContain('stopped on the line. The whole ball must cross it.');
  });

  it('every low kick, rolled or bounced, is ruled by the goal-mouth check on its own path', () => {
    let rolled = 0;
    for (const id of ['curling', 'power']) {
      for (let v = -2; v <= 4; v += 2) for (let hh = -14; hh <= 14; hh += 4) for (const sp of [30, 45, 60, 80]) {
        const r = run('freekick', id, { aimDegV: v, aimDegH: hh, speedMph: sp });
        if (r.location === 'blocked') continue;
        if (r.read.rolledAtCross) rolled += 1;
        const c = crossing(r.samples, mm.targetZ);
        const inMouth = !!c && Math.abs(c.x) <= mm.goalHalfWidth && c.y >= 0 && c.y <= mm.goalHeight;
        // A rolled ball must also get all the way over (a flying one always does).
        const fully = !r.read.rolledAtCross || r.samples.some((p) => p.z >= mm.targetZ + R);
        expect(r.location === 'goal', JSON.stringify({ id, v, hh, sp, loc: r.location, c })).toBe(inMouth && fully);
      }
    }
    expect(rolled).toBeGreaterThan(20);
  });

  it('the "biggest curl" record uses what spin bent the ball, not how far the aim sent it sideways', () => {
    expect(source).not.toContain('var curl = Math.max.apply(null, xs) - Math.min.apply(null, xs);');
    expect(source).toContain("var pbCurl = (lr && lr.read && lr.read.spinShift) ? lr.read.spinShift.side : null;");
    // A stopped ball has no velocity arrow in the 3D view.
    expect(source).toContain('if(immersiveVectors.velocity&&(velocity.x||velocity.y||velocity.z))drawVectorArrow(');
  });

  it('kicks in the air and every preset card are judged as before', () => {
    for (const id of ['curling', 'power', 'knuckle', 'chip']) expect(run('freekick', id).location).toBe('goal');
    expect(run('freekick', 'curling').read.rolledAtCross).toBeFalsy();
    const fm = M.evaluateThrow(M.fixMissSetup('freekick'));
    expect(M.isMakeOutcome(fm.location)).toBe(false);
    expect(M.slowestMake(setupFor('freekick', 'curling', { flutterSeed: 1 }))).toBe(50);
  });
});

// ── Mounted: the call panel and the Formulas row ──
let root;
let container;
let originalCanvasGetContext;
let originalResizeObserver;

function mountThrowLab(overrides) {
  const cfg = window.StemLab._registry.throwlab;
  const api = { awardXP: vi.fn(), addToast: vi.fn() };
  container = document.createElement('div');
  document.body.appendChild(container);
  root = ReactDOMClient.createRoot(container);
  function Host() {
    const [toolData, setToolData] = React.useState({
      throwlab: Object.assign({
        mode: 'freekick', gravityId: 'earth', windMph: 0, windDirDeg: 0, throwerHand: 'right',
        customScenarios: [], badgesEarned: {}, drillStats: { goalKickTypes: {}, fgMadeByDist: {}, strikeTypes: {} },
      }, M.presetPatch('freekick', 'curling'), overrides || {}),
    });
    api.getData = () => toolData.throwlab;
    return cfg.render(makeCtx({ toolData, setToolData, awardXP: api.awardXP, addToast: api.addToast }));
  }
  React.act(() => root.render(React.createElement(Host)));
  return api;
}
async function clickAsync(element) {
  await React.act(async () => {
    element.click();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
}

describe('mounted', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(FILE, 'throwlab');
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    originalCanvasGetContext = window.HTMLCanvasElement.prototype.getContext;
    window.HTMLCanvasElement.prototype.getContext = function() {
      const noop = function() {};
      return new Proxy({ measureText: () => ({ width: 20 }), createLinearGradient: () => ({ addColorStop: noop }), createRadialGradient: () => ({ addColorStop: noop }) }, {
        get(target, key) { return key in target ? target[key] : noop; },
        set(target, key, value) { target[key] = value; return true; },
      });
    };
    originalResizeObserver = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  });
  afterEach(async () => {
    if (root) { await React.act(async () => root.unmount()); root = null; }
    container?.remove();
    container = null;
    window.HTMLCanvasElement.prototype.getContext = originalCanvasGetContext;
    if (originalResizeObserver) globalThis.ResizeObserver = originalResizeObserver;
    else delete globalThis.ResizeObserver;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    vi.restoreAllMocks();
  });

  const legend = () => container.querySelector('[data-throwlab-prediction] legend').textContent;

  it('outside a drill the call stays an optional, ungraded hypothesis', () => {
    mountThrowLab({ drillActive: false });
    expect(legend()).toContain('ungraded hypothesis · optional');
  });

  it('while a drill runs the call panel says the call is needed', () => {
    mountThrowLab({ drillActive: true, drillTaskIdx: 0 });
    expect(legend()).toContain('needed for the drill to count');
    expect(legend()).not.toContain('optional');
  });

  it('after the last drill task the call is optional again', () => {
    mountThrowLab({ drillActive: true, drillTaskIdx: 99 });
    expect(legend()).toContain('ungraded hypothesis · optional');
  });

  it('a launched low kick rolls in, and the Formulas panel names the rolling resistance and the last roll', async () => {
    const api = mountThrowLab(Object.assign({}, M.presetPatch('freekick', 'power'), LOW, { showFormulas: true }));
    await clickAsync(container.querySelector('[data-throwlab-launch]'));
    await clickAsync(container.querySelector('[data-throwlab-launch]'));
    const d = api.getData();
    expect(d.lastResult.location).toBe('goal');
    const row = container.querySelector('[data-throwlab-formula-roll]').textContent;
    expect(row).toContain('a_roll = ' + mm.rollDecel.toFixed(2) + ' m/s²');
    expect(row).toContain('model choice, not a measured value');
    expect(row).toContain('started rolling at ' + (d.lastResult.read.roll.speed * MPH).toFixed(0) + ' mph, ' + d.lastResult.read.roll.z.toFixed(1) + ' m out.');
    expect(container.textContent).toContain('Rolling resistance on the grass slowed it to');
    // No curl record from a kick that spin did not bend at the line.
    expect(((d.personalBests || {}).freekick || {}).biggestCurl).toBeUndefined();
  });
});
