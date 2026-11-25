// Throw Lab, leftovers round (2026-11-23): drills count a throw only after a call; a free kick that bounces in
// front of the goal line and then crosses it is judged at the line with the same goal-mouth check; and the
// "Pitch added to your locker" banner sits in the page flow below the launch button instead of floating over it.
// THROWLAB_FILE=C:/tmp/sports_labs_1123/throwlab/start_r3.js runs the model checks against the earlier copy.
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
const setupFor = (mode, id, over) => Object.assign(
  { mode, throwerHand: 'right', gravityId: 'earth', windMph: 0, windDirDeg: 0 },
  M.presetPatch(mode, id), over || {});
const run = (mode, id, over) => M.evaluateThrow(setupFor(mode, id, over));

// Where the whole simulated path (with its bounces) first passes a plane z = value.
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

describe('free kick: a ball that bounces before the goal line is judged where it crosses the line', () => {
  const mm = M.MODES.freekick;
  // A low curling shot: it lands about 13 m out (8.6 m before the line), bounces, and goes in right of center.
  const low = { aimDegV: 5, aimDegH: -11, speedMph: 70 };

  it('a bounce and then a crossing inside the goal mouth is a goal, read at the line', () => {
    const r = run('freekick', 'curling', low);
    expect(r.read.land.z).toBeLessThan(mm.targetZ);
    expect(r.read.land.t).toBeLessThan(r.read.cross.t);
    expect(r.location).toBe('goal');
    expect(Math.abs(r.read.cross.x)).toBeLessThanOrEqual(mm.goalHalfWidth);
    expect(r.read.cross.y).toBeGreaterThanOrEqual(0);
    expect(r.read.cross.y).toBeLessThanOrEqual(mm.goalHeight);
    expect(M.isMakeOutcome(r.location)).toBe(true);
    // The sentence says it bounced first, with the model's numbers.
    expect(r.whereText).toContain('bounced ' + (mm.targetZ - r.read.land.z).toFixed(1) + ' m before the goal line');
  });

  it('every bounced kick is ruled by the same goal-mouth check at the line', () => {
    let bounced = 0;
    for (const id of ['curling', 'power', 'chip']) {
      for (let v = 2; v <= 8; v += 2) for (let hh = -12; hh <= 12; hh += 4) for (const sp of [40, 55, 70]) {
        const r = run('freekick', id, { aimDegV: v, aimDegH: hh, speedMph: sp });
        if (!r.read.land || r.read.land.z >= mm.targetZ || r.location === 'blocked') continue;
        bounced += 1;
        const c = crossing(r.samples, mm.targetZ);
        const inMouth = !!c && Math.abs(c.x) <= mm.goalHalfWidth && c.y >= 0 && c.y <= mm.goalHeight;
        expect(r.location === 'goal', JSON.stringify({ id, v, hh, sp, loc: r.location, c })).toBe(inMouth);
        if (!c) expect(r.location).toBe('short');
      }
    }
    expect(bounced).toBeGreaterThan(10);
  });

  it('kicks in the air are judged as before', () => {
    for (const id of ['curling', 'power', 'knuckle', 'chip']) expect(run('freekick', id).location).toBe('goal');
    expect(run('freekick', 'power', { aimDegH: 0, aimDegV: 4 }).location).toBe('blocked');
  });
});

describe('the Pitch Locker banner never covers the launch button or the canvas', () => {
  it('is drawn in the page flow, not fixed to the bottom of the screen', () => {
    expect(source).not.toContain("style: { position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',");
    expect(source).toContain("'data-throwlab-locker-banner': 'true'");
    expect(source).toContain('@media (prefers-reduced-motion: reduce){[data-throwlab-locker-banner]{animation:none!important}}');
  });

  it('waits for the ball to arrive: it names a strike, so it is part of the reveal', () => {
    expect(source).toMatch(/if \(firedNewLifter\) \{\n\s*\/\/[^\n]*\n\s*scheduleTl\(function\(\) \{\n\s*try \{\n\s*setTlCeleb\(/);
    expect(source).toContain("added (' + firedNewLifter.total + '/' + PITCH_TYPES.length + ')');\n          }, revealMs + 300, 300);");
  });
});

// ── Mounted: the drill card and the call-first rule ──
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
        customScenarios: [], badgesEarned: {}, drillActive: true, drillTaskIdx: 0,
        drillStats: { goalKickTypes: {}, fgMadeByDist: {}, strikeTypes: {} },
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

describe('drills count a throw only after a call', () => {
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

  it('the drill card says a call is needed', () => {
    mountThrowLab();
    const card = container.querySelector('[aria-labelledby="tl-drill-heading"]');
    expect(card.textContent).toContain('Make a call before each throw. Only throws with a call count for the drill.');
  });

  it('an untouched preset with no call still plays, but the task does not complete', async () => {
    const api = mountThrowLab();
    expect(run('freekick', 'curling').location).toBe('goal');
    await clickAsync(container.querySelector('[data-throwlab-launch]'));
    const d = api.getData();
    expect(d.lastResult && d.lastResult.location).toBe('goal');
    expect(d.drillTaskIdx).toBe(0);
    expect(d.drillLastUncalled).toBe(true);
    expect(container.querySelector('[aria-labelledby="tl-drill-heading"]').textContent)
      .toContain('Your last throw had no call, so it did not count. Make a call, then throw.');
  });

  it('the same throw after a call completes the task', async () => {
    const api = mountThrowLab({ predictionKey: 'target' });
    await clickAsync(container.querySelector('[data-throwlab-launch]'));
    const d = api.getData();
    expect(d.drillTaskIdx).toBe(1);
    expect(d.drillLastUncalled).toBe(false);
    expect(d.drillCallStats.goalKickTypes.curling).toBe(true);
    expect(d.drillIdxAtLaunch).toBe(0);
  });

  it('while the ball is in the air the card keeps the task it had at launch', async () => {
    mountThrowLab({ predictionKey: 'target' });
    await clickAsync(container.querySelector('[data-throwlab-launch]'));
    const card = () => container.querySelector('[aria-labelledby="tl-drill-heading"]').textContent;
    const launch = container.querySelector('[data-throwlab-launch]');
    expect(launch.getAttribute('aria-label')).toBe('Skip the replay and show the result');
    expect(card()).toContain('Task 1 of 3');
    expect(card()).toContain('The ball is in the air. Progress updates when it lands.');
    // Skipping is the reveal: then the card moves on.
    await clickAsync(launch);
    expect(card()).toContain('Task 2 of 3');
  });

  it('a goal with no call does not count later either: a called miss does not finish the task', async () => {
    // The earlier uncalled goal left nothing behind in the drill's own tally.
    const api = mountThrowLab(Object.assign({}, M.presetPatch('freekick', 'power'),
      { predictionKey: 'off', drillCallStats: {}, drillStats: { goalKickTypes: { curling: true } }, aimDegH: 0, aimDegV: 4, spinRpm: 0 }));
    expect(run('freekick', 'power', { aimDegH: 0, aimDegV: 4, spinRpm: 0 }).location).toBe('blocked');
    await clickAsync(container.querySelector('[data-throwlab-launch]'));
    expect(api.getData().drillTaskIdx).toBe(0);
  });
});
