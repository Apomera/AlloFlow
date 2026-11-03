// Stage B: linked representations (P2-1..3) and inquiry (P3-1..3) for Skate Lab.
// Spec: C:/tmp/stem_math_depth_review_2026-11-03/skatelab_report.md, phases 2-3.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
const SOURCE = process.env.SKATELAB_SRC || 'stem_lab/stem_tool_skatelab.js';

let toolConfig;
let physics;
let container;
let root;
let canvasLog;
let originals;

function seed(overrides = {}) {
  return {
    skatelab: {
      mode: 'halfpipe',
      viewMode: '2d',
      vehicle: 'skate',
      gravity: 9.81,
      surfaceId: 'standard',
      windId: 'calm',
      riderMassKg: 62,
      rampDepthM: 2.4,
      dropHeightM: 2.4,
      pumpTimingId: 'bottom',
      landingCompressionM: 0.45,
      bodyPositionId: 'neutral',
      airDrag: true,
      pumps: 3,
      rotationTarget: 180,
      spinRate: 210,
      speedMph: 17,
      angleDeg: 35,
      gapFt: 15,
      pushForceN: 200,
      cameraAzimuth: 38,
      showVectors: true,
      showTrail: true,
      showEnergy: true,
      estimateChallenge: false,
      _predictDefaultV: 2,
      estimateValue: '',
      experiments: [],
      stats: { runs: 0, successful: 0, withinTen: 0 },
      ...overrides,
    },
  };
}

function makeCanvasContext() {
  const gradient = { addColorStop: vi.fn() };
  const record = (name) => (...args) => { canvasLog.push([name, ...args]); };
  const base = {
    setTransform: vi.fn(), createLinearGradient: vi.fn(() => gradient), fillRect: vi.fn(), clearRect: vi.fn(),
    save: vi.fn(), restore: vi.fn(), beginPath: record('beginPath'), closePath: vi.fn(), moveTo: record('moveTo'),
    lineTo: record('lineTo'), stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(), translate: vi.fn(), rotate: vi.fn(),
    setLineDash: vi.fn(), fillText: record('fillText'), measureText: vi.fn(() => ({ width: 40 })),
  };
  return new Proxy(base, {
    get(target, property) { return property in target ? target[property] : undefined; },
    set(target, property, value) { target[property] = value; return true; },
  });
}

function setControlValue(control, value) {
  const proto = control.tagName === 'SELECT' ? window.HTMLSelectElement.prototype
    : (control.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype);
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(control, String(value));
  control.dispatchEvent(new window.Event('input', { bubbles: true }));
  control.dispatchEvent(new window.Event('change', { bubbles: true }));
}

async function mount(initial, ctxOverrides = {}) {
  const state = { latest: null };
  function Host() {
    const [toolData, setToolData] = React.useState(initial);
    state.latest = toolData;
    return toolConfig.render(makeCtx({ toolData, setToolData, ...ctxOverrides }));
  }
  await act(async () => { root.render(React.createElement(Host)); });
  return state;
}

const click = (element) => act(async () => { element.click(); });
const launch = () => click(container.querySelector('[data-skatelab-launch="true"]'));
const launchButton = () => container.querySelector('[data-skatelab-launch="true"]');
const runBlocked = () => launchButton().disabled || launchButton().getAttribute('aria-disabled') === 'true';
const buttonByText = (text) => [...container.querySelectorAll('button')].find((button) => button.textContent === text);
const key = (element, name) => act(async () => {
  element.dispatchEvent(new window.KeyboardEvent('keydown', { key: name, bubbles: true }));
});

beforeEach(() => {
  resetStemLab();
  toolConfig = loadTool(SOURCE, 'skatelab');
  physics = window.__alloSkatePhysicsPure;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = ReactDOMClient.createRoot(container);
  canvasLog = [];
  originals = {
    getContext: HTMLCanvasElement.prototype.getContext,
    rect: HTMLCanvasElement.prototype.getBoundingClientRect,
    matchMedia: window.matchMedia,
  };
  HTMLCanvasElement.prototype.getContext = vi.fn(() => makeCanvasContext());
  HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({ width: 800, height: 450, top: 0, left: 0, right: 800, bottom: 450 }));
  window.matchMedia = vi.fn(() => ({ matches: true, media: '(prefers-reduced-motion: reduce)', addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});

afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  if (container) container.remove();
  HTMLCanvasElement.prototype.getContext = originals.getContext;
  HTMLCanvasElement.prototype.getBoundingClientRect = originals.rect;
  window.matchMedia = originals.matchMedia;
  delete window.StemLab.writeClipboard;
  vi.restoreAllMocks();
});

function forceSum(fbd) {
  return fbd.forces.reduce((sum, force) => ({ x: sum.x + force.x, y: sum.y + force.y, z: sum.z + force.z }), { x: 0, y: 0, z: 0 });
}

describe('P2-2 free-body diagram: ΣF = m·a from the model', () => {
  it('halfpipe: the listed forces add up to m·a from the equations of motion (within 1e-6 N)', () => {
    let worst = 0;
    let worstNormalLaw = 0;
    let checked = 0;
    for (const setup of [{ pumps: 3 }, { pumps: 0, surfaceId: 'rough' }, { pumps: 6, gravity: 1.62, riderMassKg: 95 }]) {
      const sim = physics.simHalfpipe(setup);
      const m = sim.massKg;
      const g = sim.gravity;
      for (let i = 0; i <= 3000; i += 1) {
        const s = physics.sampleHalfpipe(sim, i / 3000);
        let maX;
        let maY;
        if (s.hasSupport) {
          // Geometry recomputed from the position, not read from the sample.
          const p = physics.halfpipeTrackPoint(Math.asin(Math.max(-1, Math.min(1, s.x / 4))), sim.rampDepthM);
          const v = s.signedSpeedMps;
          const N = s.normalForceN;
          worstNormalLaw = Math.max(worstNormalLaw, Math.abs(N - m * g * p.ny - m * v * v * p.curvature));
          // m a_t = -m g t_y - sign(v) mu N while sliding; static friction holds a stopped rider.
          const sliding = s.speedMps > 1e-6;
          const maAlong = s.atRest ? 0 : -m * g * p.ty - (sliding ? Math.sign(v) * sim.rollingMu * N : 0);
          const maToward = m * v * v * p.curvature;
          maX = maAlong * p.tx + maToward * p.nx;
          maY = maAlong * p.ty + maToward * p.ny;
        } else if (s.airborne) {
          maX = 0;
          maY = -m * g;
        } else {
          continue;
        }
        const sum = forceSum(physics.freeBodyDiagram(sim, s));
        worst = Math.max(worst, Math.hypot(sum.x - maX, sum.y - maY));
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(8900);
    expect(worstNormalLaw).toBeLessThan(1e-6);
    expect(worst).toBeLessThan(1e-6);
  });

  it('flat ground: push minus friction equals m·a during the push, and −μmg while coasting', () => {
    let worst = 0;
    for (const setup of [{ pushForceN: 200 }, { pushForceN: 400, surfaceId: 'rough', riderMassKg: 100 }, { pushForceN: 20 }]) {
      const sim = physics.simFlatGround(setup);
      const m = sim.massKg;
      for (let i = 0; i <= 1000; i += 1) {
        const s = physics.sampleFlat(sim, i / 1000);
        let a = 0;
        if (sim.moves && s.time < sim.pushTimeS) a = (sim.pushForceN - sim.rollingMu * m * sim.gravity) / m;
        else if (sim.moves && s.speedMps > 1e-6) a = -sim.rollingMu * sim.gravity;
        const sum = forceSum(physics.freeBodyDiagram(sim, s));
        worst = Math.max(worst, Math.hypot(sum.x - m * a, sum.y));
      }
    }
    expect(worst).toBeLessThan(1e-6);
  });

  it('gap: flight forces equal m·(g + drag/m) from the air-relative velocity; landing matches the COM velocity law', () => {
    let worstFlight = 0;
    let worstLanding = 0;
    let landingChecks = 0;
    for (const setup of [{}, { windId: 'cross_right', speedMph: 30 }, { windId: 'head', gravity: 1.62 }, { airDrag: false }]) {
      const sim = physics.simGapJump(setup);
      const m = sim.massKg;
      const g = sim.gravity;
      const wind = physics.getWind(sim.wind.id);
      for (let i = 0; i <= 2000; i += 1) {
        const s = physics.sampleGapJump(sim, i / 2000);
        const fbd = physics.freeBodyDiagram(sim, s);
        if (!fbd.applies) continue;
        const sum = forceSum(fbd);
        if (['rising', 'at the apex', 'falling'].includes(s.phase)) {
          const rel = [s.vx - wind.xMps, s.vy, s.vz - wind.zMps];
          const speed = Math.hypot(...rel);
          const k = sim.airDrag ? 0.5 * physics.constants.airDensity * sim.vehicle.dragArea * speed : 0;
          const ma = [-k * rel[0], -m * g - k * rel[1], -k * rel[2]];
          worstFlight = Math.max(worstFlight, Math.hypot(sum.x - ma[0], sum.y - ma[1], sum.z - ma[2]));
        } else if (s.phase === 'absorbing the landing') {
          // Central difference of the sampled COM vertical velocity.
          const dp = 1e-6 / sim.motionDuration;
          const before = physics.sampleGapJump(sim, i / 2000 - dp);
          const after = physics.sampleGapJump(sim, i / 2000 + dp);
          const ay = (after.vy - before.vy) / 2e-6;
          worstLanding = Math.max(worstLanding, Math.hypot(sum.x, sum.y - m * ay));
          landingChecks += 1;
        }
      }
    }
    expect(worstFlight).toBeLessThan(1e-6);
    expect(landingChecks).toBeGreaterThan(10);
    expect(worstLanding).toBeLessThan(1e-5);
  });

  it('halfpipe ΣF/m also tracks the sampled velocity change (finite differences)', () => {
    const sim = physics.simHalfpipe({ pumps: 3, rotationTarget: 0, spinRate: 0 });
    let worst = 0;
    for (let i = 5; i < 400; i += 1) {
      const t = (i / 400) * sim.motionDuration;
      const dt = 0.002;
      const a = physics.sampleHalfpipe(sim, (t - dt) / sim.motionDuration);
      const b = physics.sampleHalfpipe(sim, (t + dt) / sim.motionDuration);
      const c = physics.sampleHalfpipe(sim, t / sim.motionDuration);
      if (a.phase !== b.phase || a.hasSupport !== b.hasSupport || c.time < 0.01) continue;
      if (sim.pumpEvents.some((event) => Math.abs(event.t - t) < 3 * dt)) continue;
      const fbd = physics.freeBodyDiagram(sim, c);
      const err = Math.hypot((b.vx - a.vx) / (2 * dt) - fbd.netX / sim.massKg, (b.vy - a.vy) / (2 * dt) - fbd.netY / sim.massKg);
      worst = Math.max(worst, err / Math.max(1, fbd.netN / sim.massKg));
    }
    expect(worst).toBeLessThan(0.06);
  });

  it('static friction holds a rider who has rocked to a stop, and it is no more than μN', () => {
    const sim = physics.simHalfpipe({ pumps: 0, surfaceId: 'rough' });
    expect(sim.endReason).toBe('stopped');
    const s = physics.sampleHalfpipe(sim, 1);
    const fbd = physics.freeBodyDiagram(sim, s);
    const hold = fbd.forces.find((force) => force.id === 'staticFriction');
    expect(s.atRest).toBe(true);
    expect(hold).toBeTruthy();
    expect(hold.magnitudeN).toBeLessThanOrEqual(sim.rollingMu * s.normalForceN + 1e-9);
    expect(fbd.netN).toBeLessThan(1e-6);
  });

  it('panel arrows use the scene scale and agree with the canvas arrows', async () => {
    await mount(seed());
    const sim = physics.simHalfpipe({ pumps: 3, rotationTarget: 180, spinRate: 210 });
    let percent = 1;
    while (percent < 100 && !(physics.sampleHalfpipe(sim, percent / 100).hasSupport &&
      physics.sampleHalfpipe(sim, percent / 100).normalG > 1.2)) percent += 1;
    canvasLog = [];
    await act(async () => { setControlValue(container.querySelector('#sk-playhead'), percent); });
    const sample = physics.sampleHalfpipe(sim, percent / 100);

    function canvasArrow(label) {
      const index = canvasLog.map((entry) => entry[0] === 'fillText' && entry[1] === label).lastIndexOf(true);
      const [, , labelX, labelY] = canvasLog[index];
      for (let back = index - 1; back > 0; back -= 1) {
        const entry = canvasLog[back];
        if (entry[0] === 'lineTo' && Math.abs(entry[1] - (labelX - 6)) < 1e-6 && Math.abs(entry[2] - (labelY + 5)) < 1e-6 &&
            canvasLog[back - 1][0] === 'moveTo') {
          return { dx: entry[1] - canvasLog[back - 1][1], dy: entry[2] - canvasLog[back - 1][2] };
        }
      }
      return null;
    }
    function panelArrow(id) {
      const line = container.querySelector('[data-skatelab-fbd-panel] .sk-fbd-' + id + ' .sk-fbd-shaft');
      return { dx: Number(line.getAttribute('x2')) - Number(line.getAttribute('x1')), dy: Number(line.getAttribute('y2')) - Number(line.getAttribute('y1')) };
    }
    const scale = physics.forcePixelsPerNewton(sim, 960);
    const weight = panelArrow('weight');
    const normal = panelArrow('normal');
    expect(Math.abs(Math.hypot(weight.dx, weight.dy) - sample.weightN * scale)).toBeLessThan(0.02);
    expect(Math.abs(Math.hypot(normal.dx, normal.dy) - sample.normalForceN * scale)).toBeLessThan(0.02);
    const canvasWeight = canvasArrow('mg');
    const canvasNormal = canvasArrow('N');
    expect(canvasWeight).not.toBeNull();
    expect(canvasNormal).not.toBeNull();
    // Same proportions and the same directions as the canvas (both use screen y down).
    expect(Math.hypot(normal.dx, normal.dy) / Math.hypot(weight.dx, weight.dy))
      .toBeCloseTo(Math.hypot(canvasNormal.dx, canvasNormal.dy) / Math.hypot(canvasWeight.dx, canvasWeight.dy), 3);
    expect(Math.atan2(normal.dy, normal.dx)).toBeCloseTo(Math.atan2(canvasNormal.dy, canvasNormal.dx), 2);
    const list = container.querySelector('[data-skatelab-fbd-panel] .sk-fbd-list').textContent;
    expect(list).toContain('Weight (gravity), mg: ' + sample.weightN.toFixed(1) + ' N, straight down');
    expect(list).toContain('Normal force from the surface, N: ' + sample.normalForceN.toFixed(1) + ' N');
    expect(container.querySelector('.sk-fbd-verdict').textContent).toMatch(/add up to m·a \(difference 0\.000 N\)/);
  });
});

describe('P2-1 energy panel and P2-3 motion graphs', () => {
  it('energy bars read the model at the playhead and the total equals the energy put in so far', async () => {
    await mount(seed());
    await act(async () => { setControlValue(container.querySelector('#sk-playhead'), 37); });
    const sim = physics.simHalfpipe({ pumps: 3, rotationTarget: 180, spinRate: 210 });
    const s = physics.sampleHalfpipe(sim, 0.37);
    const values = [...container.querySelectorAll('[data-skatelab-energy-panel] .sk-ebar-value')].map((el) => Number(el.textContent.replace(' J', '').replace('−', '-')));
    expect(values).toEqual([Math.round(s.keJ), Math.round(s.peJ), Math.round(s.thermalJ), Math.round(s.riderWorkJ), Math.round(s.keJ + s.peJ + s.thermalJ)]);
    expect(Math.abs(values[4] - (sim.startPotentialJ + s.riderWorkJ))).toBeLessThanOrEqual(1);
    const table = container.querySelector('[data-skatelab-energy-panel] .sk-num-table');
    expect(table.querySelector('caption').textContent).toContain('Energy (J)');
    expect(table.querySelector('tr.is-now')).not.toBeNull();
    expect(container.querySelector('[data-skatelab-energy-panel] summary').textContent).toBe('Show the numbers');
  });

  it('the graph cursor is a keyboard slider that moves the shared playhead', async () => {
    await mount(seed());
    const slider = container.querySelector('[data-skatelab-energy-panel] [role="slider"]');
    expect(slider.getAttribute('tabindex')).toBe('0');
    await key(slider, 'ArrowRight');
    expect(container.querySelector('#sk-playhead').value).toBe('1');
    await key(slider, 'PageUp');
    expect(container.querySelector('#sk-playhead').value).toBe('11');
    await key(slider, 'End');
    expect(container.querySelector('#sk-playhead').value).toBe('100');
    expect(slider.getAttribute('aria-valuenow')).toBe('100');
    const motion = container.querySelector('[data-skatelab-motion-panel] [role="slider"]');
    await key(motion, 'Home');
    expect(container.querySelector('#sk-playhead').value).toBe('0');
    expect(motion.getAttribute('aria-valuetext')).toMatch(/^At 0\.00 s: Height above the bottom 2\.40 m, Speed 0\.00 m\/s/);
  });

  it('gap energy uses the aerodynamic fields: heat and wind work, with launch + wind = KE + PE + heat', async () => {
    await mount(seed({ mode: 'gap', windId: 'head' }));
    await act(async () => { setControlValue(container.querySelector('#sk-playhead'), 60); });
    const sim = physics.simGapJump({ speedMph: 17, angleDeg: 35, gapFt: 15, windId: 'head' });
    const s = physics.sampleGapJump(sim, 0.6);
    const labels = [...container.querySelectorAll('[data-skatelab-energy-panel] .sk-ebar-label')].map((el) => el.textContent);
    expect(labels).toEqual(['Kinetic energy (motion) KE', 'Potential energy (height) PE', 'Heat (air drag and landing)', 'Work done by moving air (wind)', 'Total: KE + PE + heat']);
    // Between 1/180 s solver steps the sampled KE is interpolated, so the sum
    // closes to the model's own residual (|energyClosureResidualJ|), not to zero.
    expect(Math.abs((s.keJ + s.peJ + s.thermalJ) - (sim.energyInputJ + s.windWorkJ)))
      .toBeLessThanOrEqual(Math.abs(s.energyClosureResidualJ) + 1e-9);
    expect(Math.abs(s.energyClosureResidualJ)).toBeLessThan(1e-4 * sim.energyInputJ);
  });

  it('motion graphs show height, speed and acceleration, with the previous run on one time axis', async () => {
    const moon = physics.simHalfpipe({ pumps: 3, rotationTarget: 180, spinRate: 210, gravity: 1.62 });
    await mount(seed({ lastSim: physics.simRecord(moon) }));
    const captions = [...container.querySelectorAll('[data-skatelab-motion-panel] figcaption')].map((el) => el.textContent);
    expect(captions[0]).toMatch(/^Height above the bottom: /);
    expect(captions[1]).toMatch(/^Speed: /);
    expect(captions[2]).toMatch(/^Size of the acceleration: /);
    expect(container.querySelectorAll('[data-skatelab-motion-panel] .sk-m-prev').length).toBe(3);
    const earth = physics.simHalfpipe({ pumps: 3, rotationTarget: 180, spinRate: 210 });
    const path = container.querySelector('[data-skatelab-motion-panel] .sk-chart-line.sk-m-height').getAttribute('d');
    const coords = path.trim().split(/[ML ]+/).filter(Boolean).map(Number);
    const lastX = coords[coords.length - 2];
    // The Earth run ends at its own time on the Moon run's longer axis.
    expect(lastX).toBeCloseTo(46 + (earth.motionDuration / moon.motionDuration) * (312 - 46), 0);
  });

  it('flat ground plots distance and signed acceleration (−μg while coasting)', async () => {
    await mount(seed({ mode: 'flat' }));
    await act(async () => { setControlValue(container.querySelector('#sk-playhead'), 50); });
    const sim = physics.simFlatGround({ pushForceN: 200 });
    const captions = [...container.querySelectorAll('[data-skatelab-motion-panel] figcaption')].map((el) => el.textContent);
    expect(captions[0]).toMatch(/^Distance travelled: /);
    expect(captions[2]).toBe('Acceleration (+ forward): −' + (sim.rollingMu * sim.gravity).toFixed(2) + ' m/s²');
  });

  it('graph and arrow colours keep 3:1 against the panel, and tick text 4.5:1, in every theme', () => {
    const lum = (hex) => {
      const value = hex.trim().replace('#', '');
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255)
        .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
    for (const theme of ['theme-default', 'theme-dark', 'theme-contrast']) {
      document.documentElement.className = theme;
      container.innerHTML = renderTool('skatelab', seed());
      const style = window.getComputedStyle(container.querySelector('.skatelab-shell'));
      const panel = style.getPropertyValue('--sk-panel').trim();
      for (const token of ['--sk-cyan', '--sk-pe', '--sk-accent', '--sk-green', '--sk-compare', '--sk-text', '--sk-red']) {
        expect(ratio(style.getPropertyValue(token), panel), theme + ' ' + token).toBeGreaterThanOrEqual(3);
      }
      for (const token of ['--sk-muted', '--sk-text']) {
        expect(ratio(style.getPropertyValue(token), panel), theme + ' ' + token).toBeGreaterThanOrEqual(4.5);
      }
    }
    document.documentElement.className = '';
  });

  it('every new panel hides its numbers while the prediction is locked', () => {
    const html = renderTool('skatelab', seed({ estimateChallenge: true }));
    const host = document.createElement('div');
    host.innerHTML = html;
    for (const panel of ['energy', 'fbd', 'motion']) {
      const element = host.querySelector('[data-skatelab-' + panel + '-panel]');
      expect(element.textContent).toContain('Hidden until this setup runs');
      expect(element.textContent).not.toMatch(/\d+ J|\d N|m\/s/);
    }
  });
});

describe('P3-1 predict first with misconception feedback', () => {
  it('is on by default: the run waits for a prediction, and the model checks it', async () => {
    const awardXP = vi.fn();
    const state = await mount({}, { awardXP });
    expect(state.latest.skatelab.estimateChallenge).toBe(true);
    // Stage C (a): blocked Run stays focusable (aria-disabled) so pressing it can raise the alert.
    expect(runBlocked()).toBe(true);
    const card = container.querySelector('[data-skatelab-predict]');
    expect(card.textContent).toContain('on the Moon');
    await click(container.querySelector('#sk-predict-hp_moon-same'));
    expect(runBlocked()).toBe(false);
    await launch();
    const result = state.latest.skatelab.predictionResult;
    expect(result.correct).toBe('same');
    expect(result.matched).toBe(true);
    expect(result.misconception).toBeNull();
    expect(container.querySelector('[data-skatelab-predict-feedback="match"]').textContent).toContain('Your prediction matches the model.');
    expect(awardXP.mock.calls.some((call) => /^skatelab_predict_/.test(call[0]) && call[1] === 2)).toBe(true);
  });

  it('tags a wrong answer with its named misconception, keeps a tally, and offers a try-this setup', async () => {
    const state = await mount(seed({ estimateChallenge: true }));
    await click(container.querySelector('#sk-predict-hp_moon-higher'));
    await launch();
    const saved = state.latest.skatelab;
    expect(saved.predictionResult.misconception).toBe('low_gravity_higher');
    expect(saved.misconceptionTally).toEqual({ low_gravity_higher: 1 });
    expect(saved.predictionStats).toEqual({ made: 1, matched: 0 });
    const feedback = container.querySelector('[data-skatelab-predict-feedback="miss"]').textContent;
    expect(feedback).toContain('Lower gravity means higher air from the same drop.');
    expect(feedback).toMatch(/highest point (\d+\.\d+) m on Earth and \1 m on the Moon/);
    await click(buttonByText('Try this to see why: set up the comparison run'));
    expect(state.latest.skatelab.gravity).toBe(1.62);
    // A new setup asks again.
    expect(container.querySelector('[data-skatelab-predict]')).not.toBeNull();
  });

  it('an estimate counts only for the setup it was typed for', async () => {
    const state = await mount(seed({ estimateChallenge: true }));
    await act(async () => { setControlValue(container.querySelector('#sk-estimate'), '3'); });
    expect(runBlocked()).toBe(false);
    await act(async () => { setControlValue(container.querySelector('#sk-pumps'), 5); });
    expect(container.querySelector('#sk-estimate').value).toBe('');
    // Stage C (a): blocked Run stays focusable (aria-disabled) so pressing it can raise the alert.
    expect(runBlocked()).toBe(true);
    expect(state.latest.skatelab.estimateValue).toBe('3');
  });

  it('can switch question, and switching the lock off removes the gate', async () => {
    await mount(seed({ estimateChallenge: true }));
    await click(buttonByText('Ask me a different question'));
    expect(container.querySelector('[data-skatelab-predict]').textContent).toContain('rider with a');
    await act(async () => {
      [...container.querySelectorAll('.sk-check input')].find((input) => input.parentElement.textContent === 'Predict before each run').click();
    });
    expect(container.querySelector('[data-skatelab-predict]')).toBeNull();
    expect(runBlocked()).toBe(false);
  });

  it('every prompt’s answer comes from running the model', () => {
    const hp = physics.simHalfpipe({ pumps: 3 });
    const gap = physics.simGapJump({});
    const flat = physics.simFlatGround({});
    const cases = {
      hp_mass: [hp, 'same'], hp_moon: [hp, 'same'], hp_friction: [hp, 'lower'], hp_spin: [hp, 'same'],
      gap_weight: [gap, 'weight'], gap_mass: [gap, 'farther'], flat_stop: [flat, 'slows'], flat_mass: [flat, 'shorter'], flat_double: [flat, 'more'],
    };
    for (const [id, [sim, expected]] of Object.entries(cases)) {
      expect(physics.evaluatePrediction(id, sim).correct, id).toBe(expected);
    }
    const safe = physics.evaluatePrediction('gap_safe', gap);
    expect(safe.correct).toBe(gap.landingPeakG < 4 ? 'safe' : 'hard');
    const ideal = physics.evaluatePrediction('gap_45', physics.simGapJump({ airDrag: false }));
    expect(ideal.correct).toBe('exact');
    const drag = physics.evaluatePrediction('gap_45', physics.simGapJump({ speedMph: 32, windId: 'head' }));
    expect(drag.correct).toBe('below');
    expect(drag.facts.bestRange).toBeGreaterThan(drag.facts.range45);
    expect(physics.judgePrediction('hp_mass', 'higher', { correct: 'same' })).toEqual({ matched: false, misconception: 'heavier_higher' });
    const named = new Set(Object.values(physics.predictionPrompts).flatMap((prompt) => Object.values(prompt.misconceptions)));
    for (const id of ['heavier_higher', 'low_gravity_higher', 'friction_only_rough', 'spin_needs_energy', 'weight_disappears', 'drag_45_rule']) {
      expect(named.has(id), id).toBe(true);
    }
  });
});

describe('P3-2 experiment log', () => {
  it('least-squares fit and r² match hand values', () => {
    const fit = physics.linearFit([{ x: 1, y: 2 }, { x: 2, y: 4.1 }, { x: 3, y: 5.9 }, { x: 4, y: 8.2 }]);
    // Sxx = 5, Sxy = 10.2, Syy = 20.85: slope 2.04, intercept 5.05 - 2.04*2.5 = -0.05, r² = 10.2²/(5*20.85).
    expect(fit.n).toBe(4);
    expect(fit.slope).toBeCloseTo(2.04, 12);
    expect(fit.intercept).toBeCloseTo(-0.05, 12);
    expect(fit.r2).toBeCloseTo(104.04 / 104.25, 12);
    const exact = physics.linearFit([{ x: -1, y: -2 }, { x: 0, y: 1 }, { x: 2, y: 7 }]);
    expect(exact.slope).toBeCloseTo(3, 12);
    expect(exact.intercept).toBeCloseTo(1, 12);
    expect(exact.r2).toBeCloseTo(1, 12);
    expect(physics.linearFit([{ x: 1, y: 1 }])).toBeNull();
    expect(physics.linearFit([{ x: 2, y: 1 }, { x: 2, y: 5 }])).toBeNull();
    expect(physics.linearFit([{ x: 1, y: 3 }, { x: 2, y: 3 }]).r2).toBeNull();
  });

  it('logs slim records with model values, keeps 50 runs, and stays small', async () => {
    const old = Array.from({ length: 50 }, (_, index) => ({
      id: index + 1, n: 50 - index, mode: 'halfpipe', setup: 'old', measured: 1, unit: 'ft', errorPct: null, runSuccessful: true,
      values: { dropHeight: 1, startPE: 600 },
    }));
    const state = await mount(seed({ experiments: old, stats: { runs: 50, successful: 50, withinTen: 0 } }));
    await launch();
    const saved = state.latest.skatelab;
    expect(saved.experiments).toHaveLength(50);
    const entry = saved.experiments[0];
    expect(entry.n).toBe(51);
    expect(entry.record.v).toBe(2);
    expect(entry.record.inputs.pumps).toBe(3);
    const sim = physics.simHalfpipe({ pumps: 3, rotationTarget: 180, spinRate: 210 });
    expect(entry.values.startPE).toBeCloseTo(sim.startPotentialJ, 2);
    expect(entry.values.bottomKE).toBeCloseTo(0.5 * sim.massKg * sim.bottomSpeed ** 2, 1);
    const json = JSON.stringify(saved);
    expect(json).not.toMatch(/"nodes"|flightPath|transitionPath|function/);
    expect(json.length).toBeLessThan(30000);
  });

  it('plots chosen columns with the least-squares line and sorts the table', async () => {
    const points = [[1, 2], [2, 4.1], [3, 5.9], [4, 8.2]];
    const experiments = points.map(([x, y], index) => ({
      id: 100 + index, n: index + 1, mode: 'halfpipe', setup: 'run ' + (index + 1), measured: y, unit: 'ft', errorPct: null,
      runSuccessful: true, values: { dropHeight: x, startPE: y },
    })).reverse();
    await mount(seed({ experiments, logView: { x: 'dropHeight', y: 'startPE', group: 'none', sort: 'id', dir: 'desc' } }));
    const fits = container.querySelector('.sk-scatter-fits').textContent;
    expect(fits).toContain('best fit y = 2.0400·x + −0.050, r² = 0.9980 (4 runs)');
    expect(container.querySelectorAll('.sk-scatter .sk-scatter-point')).toHaveLength(4);
    await act(async () => { setControlValue(container.querySelector('#sk-log-sort'), 'startPE'); });
    await click(buttonByText('Descending ↓'));
    const firstSetup = container.querySelector('.sk-table tbody tr td:nth-child(3)').textContent;
    expect(firstSetup).toBe('run 1');
    expect(container.querySelector('.sk-table th[aria-sort]').textContent).toBe('Starting PE (J)');
  });

  it('exports CSV through StemLab.writeClipboard and as a download', async () => {
    const writeClipboard = vi.fn(() => Promise.resolve());
    window.StemLab.writeClipboard = writeClipboard;
    const state = await mount(seed({ mode: 'flat' }));
    await launch();
    await click(buttonByText('Copy CSV'));
    expect(writeClipboard).toHaveBeenCalledTimes(1);
    const csv = writeClipboard.mock.calls[0][0];
    const [header, row] = csv.split('\r\n');
    expect(header.split(',')).toContain('Net force during push (N)');
    const cells = row.split(',');
    const netIndex = header.split(',').indexOf('Net force during push (N)');
    expect(Number(cells[netIndex])).toBeCloseTo(state.latest.skatelab.experiments[0].values.netForce, 6);
    const created = [];
    URL.createObjectURL = vi.fn((blob) => { created.push(blob); return 'blob:sk'; });
    URL.revokeObjectURL = vi.fn();
    const anchorClick = vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await click(buttonByText('Download CSV'));
    expect(created).toHaveLength(1);
    expect(created[0].type).toBe('text/csv;charset=utf-8');
    expect(anchorClick).toHaveBeenCalledTimes(1);
  });

  it('deletes a run or clears the log only after an inline confirm (never window.confirm)', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);
    const state = await mount(seed());
    await launch();
    await launch();
    expect(state.latest.skatelab.experiments).toHaveLength(2);
    const firstDelete = container.querySelector('[aria-label="Delete run 2"]');
    await click(firstDelete);
    expect(state.latest.skatelab.experiments).toHaveLength(2);
    await click(buttonByText('Keep'));
    expect(state.latest.skatelab.experiments).toHaveLength(2);
    await click(container.querySelector('[aria-label="Delete run 2"]'));
    await click(container.querySelector('#sk-log-delete-yes'));
    expect(state.latest.skatelab.experiments.map((entry) => entry.n)).toEqual([1]);
    await click(buttonByText('Clear log'));
    expect(state.latest.skatelab.experiments).toHaveLength(1);
    await click(buttonByText('Yes, delete all'));
    expect(state.latest.skatelab.experiments).toHaveLength(0);
    expect(confirmSpy).not.toHaveBeenCalled();
  });
});

describe('P3-3 guided investigations', () => {
  it('each plan gives the expected physics in the logged columns', () => {
    const fits = {};
    for (const investigation of physics.investigations) {
      const rows = investigation.steps.map((step) => physics.runValues(physics.runSimulation(step.patch.mode, step.patch)));
      for (const row of rows) {
        expect(Number.isFinite(row[investigation.x]), investigation.id + ' x').toBe(true);
        expect(Number.isFinite(row[investigation.y]), investigation.id + ' y').toBe(true);
      }
      fits[investigation.id] = rows;
    }
    const ke = fits.ke_speed_mass.slice(0, 4);
    const keFit = physics.linearFit(ke.map((row) => ({ x: row.launchSpeedSq, y: row.launchKE })));
    expect(keFit.slope).toBeCloseTo(ke[0].mass / 2, 3);
    expect(keFit.r2).toBeCloseTo(1, 9);
    const pe = physics.linearFit(fits.pe_height.map((row) => ({ x: row.dropHeight, y: row.startPE })));
    expect(pe.slope).toBeCloseTo(fits.pe_height[0].mass * 9.81, 2);
    const force = fits.net_force.slice(0, 4);
    const forceFit = physics.linearFit(force.map((row) => ({ x: row.netForce, y: row.pushAccel })));
    expect(forceFit.slope).toBeCloseTo(1 / force[0].mass, 6);
    expect(forceFit.r2).toBeCloseTo(1, 9);
    const spin = physics.linearFit(fits.tuck_open.map((row) => ({ x: row.inverseInertia, y: row.airSpin })));
    expect(spin.slope).toBeCloseTo(fits.tuck_open[0].angMomentum * 180 / Math.PI, 0);
    // Log values keep 6 significant figures, so the intercept is zero to about 1e-3 °/s.
    expect(Math.abs(spin.intercept)).toBeLessThan(0.005);
    expect(spin.r2).toBeCloseTo(1, 9);
    const heat = fits.energy_where.map((row) => row.firstPassHeat);
    expect(heat[0]).toBeLessThan(heat[1]);
    expect(heat[1]).toBeLessThan(heat[2]);
    const loads = fits.landing_design.map((row) => row.landingLoad);
    for (let i = 1; i < loads.length; i += 1) expect(loads[i]).toBeLessThan(loads[i - 1]);
    const ranges = fits.range_angle;
    expect(ranges[2].range).toBeGreaterThan(ranges[0].range);
    expect(ranges[6].range).toBeGreaterThan(ranges[2].range);
  });

  it('sets up a planned run, tags the logged run, and keeps the CER text in toolData', async () => {
    const state = await mount(seed());
    await click(container.querySelector('[data-skatelab-investigations] .sk-inv-pick:nth-child(4)'));
    expect(state.latest.skatelab.activeInvestigation).toBe('net_force');
    await click(container.querySelector('[aria-label="Set up run 2: 200 N push"]'));
    expect(state.latest.skatelab.mode).toBe('flat');
    expect(state.latest.skatelab.pushForceN).toBe(200);
    await launch();
    const entry = state.latest.skatelab.experiments[0];
    expect(entry.inv).toBe('net_force');
    expect(entry.step).toBe(1);
    expect(container.querySelector('.sk-inv-plan li:nth-child(2)').textContent).toContain('✓ logged');
    await act(async () => { setControlValue(container.querySelector('#sk-cer-net_force-claim'), 'More net force gives more acceleration.'); });
    expect(state.latest.skatelab.cer.net_force.claim).toBe('More net force gives more acceleration.');
    expect(JSON.stringify(state.latest.skatelab.cer)).not.toMatch(/function/);
  });

  it('the offline self-check names what is missing, and a complete answer earns XP once', async () => {
    const awardXP = vi.fn();
    const investigation = physics.investigations.find((item) => item.id === 'net_force');
    const experiments = investigation.steps.map((step, index) => ({
      id: 10 + index, n: index + 1, mode: 'flat', setup: 'x', measured: 1, unit: 'ft', errorPct: null, runSuccessful: true,
      values: physics.runValues(physics.runSimulation('flat', step.patch)), inv: 'net_force', step: index,
    }));
    const cer = {
      net_force: {
        claim: 'When the net force doubles, the acceleration doubles too.',
        evidence: 'A net force of 92 N gave 1.39 m/s² and 292 N gave 4.42 m/s².',
        reasoning: 'Newton’s second law says ΣF = m·a, so a = ΣF ÷ m.',
        checks: [true, true, true, true, true],
      },
    };
    const state = await mount(seed({ activeInvestigation: 'net_force', experiments, cer: { net_force: { claim: 'Short' } } }), { awardXP });
    await click(buttonByText('Check my writing'));
    const lines = container.querySelector('.sk-cer-feedback').textContent;
    expect(lines).toContain('at least 6 words');
    expect(lines).toContain('at least two numbers');
    expect(awardXP).not.toHaveBeenCalled();
    expect(state.latest.skatelab.cer.net_force.checkCount).toBe(1);

    await act(async () => { root.unmount(); });
    root = ReactDOMClient.createRoot(container);
    await mount(seed({ activeInvestigation: 'net_force', experiments, cer }), { awardXP });
    await click(buttonByText('Check my writing'));
    expect(container.querySelector('.sk-cer-feedback.is-complete')).not.toBeNull();
    await click(buttonByText('Check my writing'));
    const invCalls = awardXP.mock.calls.filter((call) => call[0] === 'skatelab_inv_net_force');
    expect(invCalls).toHaveLength(1);
    expect(invCalls[0][1]).toBe(15);
  });

  it('offers the host hint only when ctx.getHint exists', async () => {
    await mount(seed({ activeInvestigation: 'pe_height' }));
    expect(buttonByText('Ask for a hint (optional)')).toBeUndefined();
    await act(async () => { root.unmount(); });
    root = ReactDOMClient.createRoot(container);
    const getHint = vi.fn((tool, question, wrong, idea, attempts, show) => show('Think about m·g·h.'));
    await mount(seed({ activeInvestigation: 'pe_height' }), { getHint });
    await click(buttonByText('Ask for a hint (optional)'));
    expect(getHint).toHaveBeenCalledWith('skatelab', expect.stringContaining('drop-in height'), '', expect.stringContaining('m·g·h'), 0, expect.any(Function));
    expect(container.querySelector('.sk-hint').textContent).toBe('Think about m·g·h.');
  });
});
