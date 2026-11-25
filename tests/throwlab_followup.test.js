// Throw Lab follow-up round (2026-11-23, late).
// 1. "Post" means the ball touches the frame. It used to mean "center within 0.5 m of the frame", so the
//    fix-this-miss card said "Off the post" beside "It crossed the line 0.28 m over the bar". Now the
//    center must pass within ball radius (0.11 m) + half the 12 cm post or bar (0.06 m) = 0.17 m.
// 2. Bounce losses on grass scale with how hard the ball comes down: mu·(1 + e)·|v_down| (the cricket rule),
//    capped where the ball grips and rolls. Each landing used to cost 22% of level speed however shallow, so
//    a 60 mph ground drive started rolling at 25 mph.
// 3. During a drill the call panel's body text says the call is needed; the Formulas panel text is 12 px.
// THROWLAB_FILE=C:/tmp/sports_labs_1123/throwlab/start_r5.js runs the checks against the earlier copy.
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
// Center of the ball to the frame line, worked out here from the goal size (not from the tool's helper).
function frameGap(c) {
  const ox = Math.max(0, Math.abs(c.x) - mm.goalHalfWidth), oy = Math.max(0, c.y - mm.goalHeight);
  return Math.hypot(ox, oy);
}
const TOUCH = R + 0.06; // ball radius + half of a 12 cm post (FIFA Law 1 maximum)

describe('"post" means the ball touches the frame', () => {
  it('the touch distance comes from the ball and the frame sizes in the model', () => {
    expect(mm.frameHalf).toBe(0.06);
    expect(R + mm.frameHalf).toBeCloseTo(0.17, 10);
  });

  it('every kick called "post" passes within 0.17 m of the frame, and every over/wide kick passes farther', () => {
    let posts = 0, misses = 0;
    for (const id of ['curling', 'knuckle', 'power', 'chip']) {
      for (let sp = 40; sp <= 90; sp += 5) for (let v = 4; v <= 24; v += 4) for (const hh of [-15, -9, 0, 9, 15]) {
        const r = run('freekick', id, { speedMph: sp, aimDegV: v, aimDegH: hh });
        const c = r.read.cross;
        if (r.location === 'post') { posts++; expect(frameGap(c), JSON.stringify({ id, sp, v, hh })).toBeLessThanOrEqual(TOUCH + 1e-9); }
        if ((r.location === 'over' || r.location === 'wide') && c && !r.read.rolledAtCross) { misses++; expect(frameGap(c), JSON.stringify({ id, sp, v, hh })).toBeGreaterThan(TOUCH); }
      }
    }
    expect(posts).toBeGreaterThan(3);
    expect(misses).toBeGreaterThan(50);
  });

  it('the fix-this-miss kick is ruled over the bar, and its sentence agrees', () => {
    const fm = M.fixMissSetup('freekick');
    const r = M.evaluateThrow(fm);
    expect(fm.speedMph).toBe(70);
    expect(r.location).toBe('over');
    const said = Number(/([0-9.]+) m over the bar/.exec(r.whereText)[1]);
    expect(said).toBeCloseTo(r.read.cross.y - mm.goalHeight, 2);
    expect(said).toBeGreaterThan(TOUCH);
    // one control fixes it: a little less speed scores
    expect(M.isMakeOutcome(run('freekick', 'curling', { speedMph: 65 }).location)).toBe(true);
  });

  it('a kick that clips the bar says so, with the gap in cm from the same crossing', () => {
    const r = run('freekick', 'curling', { speedMph: 68 });
    expect(r.location).toBe('post');
    expect(r.read.frame.part).toBe('bar');
    const gapCm = Math.round((r.read.cross.y - mm.goalHeight) * 100);
    expect(r.whereText).toBe('It clipped the crossbar. The center of the ball passed ' + gapCm + ' cm over the bar, and the ball touches the frame when that gap is 17 cm or less.');
  });

  it('a kick that clips a post says which post', () => {
    let found = null;
    for (let hh = -15; hh <= 15 && !found; hh += 0.25) {
      const r = run('freekick', 'power', { aimDegH: hh });
      if (r.location === 'post' && r.read.frame.part === 'post') found = r;
    }
    expect(found).toBeTruthy();
    const c = found.read.cross;
    const side = c.x > 0 ? 'left' : 'right';
    const gapCm = Math.round((Math.abs(c.x) - mm.goalHalfWidth) * 100);
    expect(found.whereText).toContain('clipped the ' + side + ' post. The center of the ball passed ' + (gapCm < 1 ? 'less than 1 cm' : gapCm + ' cm') + ' outside the post');
  });

  it('the knuckle card still holds: some air patterns hit the bar, most score', () => {
    const count = {};
    const parts = new Set();
    for (let s = 1; s <= 40; s++) {
      const r = run('freekick', 'knuckle', { flutterSeed: s });
      count[r.location] = (count[r.location] || 0) + 1;
      if (r.location === 'post') parts.add(r.read.frame.part);
    }
    expect(count).toEqual({ goal: 27, post: 13 });
    expect([...parts]).toEqual(['bar']);
    expect(M.findPreset('freekick', 'knuckle').teach).toContain('the same kick can hit the bar');
  });

  // Round 5 (11-23) moved field goals onto the same touch rule (0.11 m ball + 0.05 m upright), so the
  // old 0.30 m tolerance is gone on purpose; tests/throwlab_round5.test.js checks the new rule.
  it('field goals keep their own classifier, now with the touch rule', () => {
    expect(source).not.toContain("if (Math.abs(gx) - goalHalfWidth < 0.30) return 'doink';");
    expect(source).toContain('if (fr.gap <= fr.touch) return \'doink\';');
  });
});

describe('bounce losses on grass follow the impact', () => {
  const mu = () => M.GRASS_SURFACE.mu, e = M.BALLS.soccer.cor;

  it('each hop loses mu·(1 + e)·|v_down| of level speed, up to the 40% grip limit', () => {
    for (const [id, over] of [['power', { speedMph: 60, aimDegV: 0, aimDegH: -9 }], ['curling', { speedMph: 50 }], ['chip', { speedMph: 30 }]]) {
      const r = run('freekick', id, over);
      expect(r.read.hops.length, id).toBeGreaterThan(0);
      for (const hp of r.read.hops) {
        const want = Math.min(mu() * (1 + e) * hp.vDown, 0.4 * hp.levelIn);
        expect(hp.levelIn - hp.levelOut, id).toBeCloseTo(want, 6);
      }
    }
  });

  it('a 60 mph ground drive keeps most of its speed through the shallow hops', () => {
    const r = run('freekick', 'power', { speedMph: 60, aimDegV: 0, aimDegH: -9 });
    expect(r.location).toBe('goal');
    for (const hp of r.read.hops) expect(1 - hp.levelOut / hp.levelIn).toBeLessThan(0.06);
    expect(r.read.roll.speed * MPH).toBeGreaterThan(40);
    // a steep landing (the 30 mph chip) loses far more at each bounce
    const chip = run('freekick', 'chip', { speedMph: 30 });
    for (const hp of chip.read.hops) expect(1 - hp.levelOut / hp.levelIn).toBeGreaterThan(0.3);
  });

  it('a slow chip is followed until it stops, not cut off by the flight timer', () => {
    const r = run('freekick', 'chip', { speedMph: 25 });
    expect(r.location).toBe('short');
    expect(r.read.rollStop).toBeTruthy();
    expect(r.read.flightTime).toBeGreaterThan(4);
    expect(r.whereText).toMatch(/^It landed [0-9.]+ m before the goal line, rolled, and stopped [0-9.]+ m short of it\.$/);
  });

  it('every free-kick card number still holds', () => {
    for (const id of ['curling', 'power', 'knuckle', 'chip']) expect(run('freekick', id).location, id).toBe('goal');
    expect(M.slowestMake(setupFor('freekick', 'curling', { flutterSeed: 1 }))).toBe(50);
    expect(Math.abs(run('freekick', 'curling').read.spinShift.side)).toBeCloseTo(2.84, 2); // "about 2.8 m"
    expect(run('freekick', 'power').read.flightTime).toBeCloseTo(0.74, 2);              // "about 0.7 s"
  });

  it('other sports keep the flat bounce rule: a bounce pass still loses 22% of its level speed', () => {
    const r = M.simulatePitch({ ball: 'basketball', speedMph: 16, releaseHeight: 1.2, aimDegV: -20, aimDegH: 0, spinRpm: 0, spinAxisDeg: 0,
      throwerHand: 'right', targetZ: 6, releaseStride: 0, truncateAtTarget: false, allowBounces: true, gravity: 9.81, maxT: 4 });
    const i = r.samples.findIndex((s) => s.ground);
    expect(i).toBeGreaterThan(0);
    const before = r.samples[i], after = r.samples[i + 1];
    expect(after.vz / before.vz).toBeGreaterThan(0.76);
    expect(after.vz / before.vz).toBeLessThan(0.79);
  });
});

// ── Mounted: the call panel body, the result headline and the Formulas panel ──
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
async function launchAndSkip() {
  await clickAsync(container.querySelector('[data-throwlab-launch]'));
  await clickAsync(container.querySelector('[data-throwlab-launch]'));
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

  const body = () => container.querySelector('[data-throwlab-prediction] p').textContent;

  it('outside a drill the body text says the call is ungraded', () => {
    mountThrowLab({ drillActive: false });
    expect(body()).toContain('Make an ungraded call before launch.');
  });

  it('while a drill runs the body text agrees with the heading: a call is needed for the drill', () => {
    mountThrowLab({ drillActive: true, drillTaskIdx: 0 });
    expect(body()).toContain('this throw will not count for the drill');
    expect(body()).not.toContain('ungraded');
  });

  it('a kick that clips the bar is headed "Off the crossbar", next to the sentence that says so', async () => {
    const api = mountThrowLab({ speedMph: 68 });
    await launchAndSkip();
    expect(api.getData().lastResult.location).toBe('post');
    const card = container.querySelector('[aria-labelledby="tl-result-heading"]').textContent;
    expect(card).toContain('Off the crossbar');
    expect(card).not.toContain('Off the post');
    expect(card).toContain('It clipped the crossbar.');
  });

  it('the fix-this-miss speed is headed "Over the bar", not "Off the post"', async () => {
    mountThrowLab({ speedMph: 70 });
    await launchAndSkip();
    const card = container.querySelector('[aria-labelledby="tl-result-heading"]').textContent;
    expect(card).toContain('Over the bar');
    expect(card).not.toContain('Off the post');
    expect(card).toContain('0.28 m over the bar');
  });

  it('the Formulas panel is 12 px or larger and shows each bounce of the last kick', async () => {
    const api = mountThrowLab(Object.assign({}, M.presetPatch('freekick', 'power'), { speedMph: 60, aimDegV: 0, aimDegH: -9, showFormulas: true }));
    await launchAndSkip();
    const sec = container.querySelector('[aria-labelledby="tl-formulas-heading"]');
    const small = [...sec.querySelectorAll('*')].filter((el) => el.style.fontSize && parseFloat(el.style.fontSize) < 12);
    expect(small.map((el) => el.textContent.slice(0, 40))).toEqual([]);
    const regs = container.querySelector('[aria-labelledby="tl-regs-heading"]');
    expect([...regs.querySelectorAll('*')].filter((el) => el.style.fontSize && parseFloat(el.style.fontSize) < 12).length).toBe(0);
    const row = container.querySelector('[data-throwlab-formula-hops]').textContent;
    const hops = api.getData().lastResult.read.hops;
    expect(row).toContain('μ = ' + M.GRASS_SURFACE.mu.toFixed(2));
    expect(row).toContain('a model choice');
    expect(row).toContain('Last kick: ' + hops.map((hp) => (hp.levelIn * MPH).toFixed(0) + ' → ' + (hp.levelOut * MPH).toFixed(0)).join(', ') + ' mph');
  });
});
