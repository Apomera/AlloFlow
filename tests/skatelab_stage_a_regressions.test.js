// Stage A regression tests for the Skate Lab review bugs 1-15
// (C:/tmp/stem_math_depth_review_2026-11-03/skatelab_report.md, section 5).
// Each test failed against the pre-fix file; run them against another copy
// with SKATELAB_SRC=<absolute path>.
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
let originalGetContext;
let originalRect;
let originalMatchMedia;
let reducedMotionQuery;
let canvasLog;

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
      landingCompressionM: 0.45,
      bodyPositionId: 'neutral',
      airDrag: true,
      pumps: 3,
      rotationTarget: 180,
      spinRate: 210,
      speedMph: 17,
      angleDeg: 35,
      gapFt: 15,
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
    setTransform: vi.fn(),
    createLinearGradient: vi.fn(() => gradient),
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: record('beginPath'),
    closePath: vi.fn(),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    setLineDash: vi.fn(),
    fillText: record('fillText'),
    measureText: vi.fn(() => ({ width: 40 })),
  };
  return new Proxy(base, {
    get(target, property) {
      return property in target ? target[property] : undefined;
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    },
  });
}

function setControlValue(control, value) {
  const proto = control.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
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
  await act(async () => {
    root.render(React.createElement(Host));
  });
  return state;
}

function launch() {
  return act(async () => {
    container.querySelector('[data-skatelab-launch="true"]').click();
  });
}

function liveRegions() {
  return [...container.querySelectorAll('[aria-live], [role="status"], [role="alert"]')]
    .filter((element) => element.getAttribute('role') !== 'alert');
}

function hexToRgb(hex) {
  const value = String(hex).trim().replace('#', '');
  return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16) / 255);
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

beforeEach(() => {
  resetStemLab();
  toolConfig = loadTool(SOURCE, 'skatelab');
  physics = window.__alloSkatePhysicsPure;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = ReactDOMClient.createRoot(container);
  canvasLog = [];
  originalGetContext = HTMLCanvasElement.prototype.getContext;
  originalRect = HTMLCanvasElement.prototype.getBoundingClientRect;
  originalMatchMedia = window.matchMedia;
  HTMLCanvasElement.prototype.getContext = vi.fn(() => makeCanvasContext());
  HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
    width: 800, height: 450, top: 0, left: 0, right: 800, bottom: 450,
  }));
  reducedMotionQuery = true;
  window.matchMedia = vi.fn(() => ({
    matches: reducedMotionQuery,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

afterEach(async () => {
  if (root) {
    await act(async () => {
      root.unmount();
    });
  }
  if (container) container.remove();
  HTMLCanvasElement.prototype.getContext = originalGetContext;
  HTMLCanvasElement.prototype.getBoundingClientRect = originalRect;
  window.matchMedia = originalMatchMedia;
  document.documentElement.className = '';
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Skate Lab stage A bug regressions', () => {
  it('bug 1: 180 and 540 rotation targets can be landed, and say which way the rider lands', () => {
    for (const target of [180, 540]) {
      let landed = null;
      for (let spinRate = 0; spinRate <= 700 && !landed; spinRate += 5) {
        const sim = physics.simHalfpipe({ pumps: 3, rotationTarget: target, spinRate });
        if (sim.runSuccessful) landed = sim;
      }
      expect(landed, 'some spin rate should land the ' + target + ' target').not.toBeNull();
      expect(landed.contactSafe).toBe(true);
      expect(landed.landingStance).toBe('forward');
    }
    const straight = physics.simHalfpipe({ pumps: 3, rotationTarget: 0, spinRate: 0 });
    expect(straight.runSuccessful).toBe(true);
    expect(straight.landingStance).toBe('fakie');
    const html = renderTool('skatelab', seed());
    expect(html).toContain('180° (lands forward)');
    expect(html).toContain('360° (lands fakie)');
  });

  it('bug 2: light-theme text colours keep at least 4.5:1 contrast inside the tool', async () => {
    for (const theme of ['theme-default', 'theme-dark']) {
      document.documentElement.className = theme;
      container.innerHTML = renderTool('skatelab', seed());
      const shell = container.querySelector('.skatelab-shell');
      const style = window.getComputedStyle(shell);
      const panel = style.getPropertyValue('--sk-panel').trim();
      const background = style.getPropertyValue('--sk-bg').trim();
      for (const token of ['--sk-cyan', '--sk-green', '--sk-red', '--sk-compare', '--sk-text', '--sk-muted']) {
        const colour = style.getPropertyValue(token).trim();
        expect(contrast(colour, panel), theme + ' ' + token + ' on panel').toBeGreaterThanOrEqual(4.5);
        expect(contrast(colour, background), theme + ' ' + token + ' on background').toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('bug 3: persisted state keeps inputs and a summary, and legacy full saves still load', async () => {
    const state = await mount(seed());
    await launch();
    const saved = state.latest.skatelab;
    expect(saved.lastSim).toBeTruthy();
    expect(JSON.stringify(state.latest).length).toBeLessThan(6000);
    for (const record of [saved.lastSim, saved.lastResult]) {
      expect(JSON.stringify(record)).not.toMatch(/transitionPath|flightPath|"nodes"/);
    }
    expect(JSON.stringify(saved)).not.toMatch(/function/);

    await act(async () => { root.unmount(); });
    root = ReactDOMClient.createRoot(container);
    const legacy = physics.simGapJump({ speedMph: 14 });
    const legacyState = await mount(seed({ mode: 'gap', lastSim: legacy, lastResult: legacy }));
    expect(container.querySelector('.skatelab-shell')).not.toBeNull();
    expect(container.querySelector('.sk-trace-previous')).not.toBeNull();
    expect(JSON.stringify(legacyState.latest).length).toBeLessThan(6000);
  });

  it('bug 4: scrubbing the timeline does not rewrite the live region on every step', async () => {
    await mount(seed());
    const region = liveRegions()[0];
    expect(region).toBeTruthy();
    const playhead = container.querySelector('#sk-playhead');
    const before = region.textContent;
    let changes = 0;
    let previous = before;
    for (let step = 0; step <= 100; step += 5) {
      await act(async () => { setControlValue(playhead, step); });
      if (region.textContent !== previous) changes += 1;
      previous = region.textContent;
    }
    expect(changes).toBeLessThanOrEqual(1);
    await act(async () => { await new Promise((done) => setTimeout(done, 520)); });
    expect(region.textContent.length).toBeLessThan(80);
  });

  it('bug 5: a finished run is announced through one channel only', async () => {
    const announceToSR = vi.fn();
    await mount(seed(), { announceToSR });
    await launch();
    const regions = liveRegions();
    expect(regions).toHaveLength(1);
    expect(announceToSR).not.toHaveBeenCalled();
    expect(regions[0].textContent).toMatch(/Target met|target missed|Unsafe contact|No air/);
  });

  it('bug 6: the app reduce-motion setting skips the animation even when the OS query is off', async () => {
    reducedMotionQuery = false;
    const frames = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    await mount(seed(), { reduceMotion: true });
    await launch();
    expect(container.querySelector('#sk-playhead').value).toBe('100');
    expect(frames).not.toHaveBeenCalled();

    await act(async () => { root.unmount(); });
    root = ReactDOMClient.createRoot(container);
    container.className = 'reduce-motion';
    await mount(seed());
    await launch();
    expect(container.querySelector('#sk-playhead').value).toBe('100');
    expect(frames).not.toHaveBeenCalled();
    container.className = '';
  });

  it('bug 7: the drop-in starts at rest and the ledger matches the live energy display', () => {
    const sim = physics.simHalfpipe({ pumps: 3, rampDepthM: 2.4 });
    const start = physics.sampleHalfpipe(sim, 0);
    const end = physics.sampleHalfpipe(sim, 1);
    expect(start.keJ).toBe(0);
    expect(start.thermalJ).toBe(0);
    expect(start.peJ).toBeCloseTo(sim.massKg * sim.gravity * 2.4, 6);
    expect(end.keJ + end.peJ + end.thermalJ).toBeCloseTo(sim.energyInputJ, 3);
    expect(end.thermalJ).toBeCloseTo(sim.thermalJ, 6);
  });

  it('bug 8: friction heat equals mu times the integral of N ds along the path', () => {
    // Implied coefficient = heat / integral(N ds) from the sampled path. With a
    // real friction force it is the same for any ramp depth or pump count.
    const implied = [];
    for (const setup of [{ rampDepthM: 1.5, pumps: 0 }, { rampDepthM: 3.5, pumps: 0 }, { rampDepthM: 2.4, pumps: 6 }]) {
      const sim = physics.simHalfpipe({ surfaceId: 'standard', ...setup });
      let normalWork = 0;
      let previous = physics.sampleHalfpipe(sim, 0);
      const steps = 40000;
      for (let step = 1; step <= steps; step += 1) {
        const current = physics.sampleHalfpipe(sim, step / steps);
        // Flight is straight up and down at the lip with zero normal force.
        const ds = Math.hypot(current.x - previous.x, current.y - previous.y);
        normalWork += 0.5 * (current.normalG + previous.normalG) * sim.massKg * sim.gravity * ds;
        previous = current;
      }
      implied.push(sim.thermalJ / normalWork);
    }
    expect(implied[1] / implied[0]).toBeCloseTo(1, 2);
    expect(implied[2] / implied[0]).toBeCloseTo(1, 2);
    expect(implied[0]).toBeCloseTo(physics.getSurface('standard').rollingMu, 3);
  });

  it('bug 9: the same drop gives the same air on the Moon and Mars as on Earth', () => {
    const earth = physics.simHalfpipe({ pumps: 4, gravity: 9.81, spinRate: 0, rotationTarget: 0 });
    const mars = physics.simHalfpipe({ pumps: 4, gravity: 3.71, spinRate: 0, rotationTarget: 0 });
    const moon = physics.simHalfpipe({ pumps: 4, gravity: 1.62, spinRate: 0, rotationTarget: 0 });
    expect(earth.hAir).toBeGreaterThan(0.15);
    expect(mars.hAir / earth.hAir).toBeCloseTo(1, 8);
    expect(moon.hAir / earth.hAir).toBeCloseTo(1, 8);
    expect(moon.airTime / earth.airTime).toBeCloseTo(Math.sqrt(9.81 / 1.62), 8);
  });

  it('bug 10: weight is always drawn, and every force arrow shares one scale', async () => {
    await mount(seed());
    const sim = physics.simHalfpipe({ pumps: 3, rotationTarget: 180, spinRate: 210 });
    // First whole-percent playhead where the rider is on the transition under load.
    let percent = 1;
    while (percent < 100 && !(physics.sampleHalfpipe(sim, percent / 100).hasSupport &&
        physics.sampleHalfpipe(sim, percent / 100).normalG > 1.2)) percent += 1;
    canvasLog = [];
    await act(async () => { setControlValue(container.querySelector('#sk-playhead'), percent); });
    const sample = physics.sampleHalfpipe(sim, percent / 100);
    expect(sample.hasSupport).toBe(true);

    function arrowLength(label) {
      const index = canvasLog.map((entry) => entry[0] === 'fillText' && entry[1] === label).lastIndexOf(true);
      if (index < 0) return null;
      const [, , labelX, labelY] = canvasLog[index];
      const tipX = labelX - 6;
      const tipY = labelY + 5;
      for (let back = index - 1; back > 0; back -= 1) {
        const entry = canvasLog[back];
        if (entry[0] === 'lineTo' && Math.abs(entry[1] - tipX) < 1e-6 && Math.abs(entry[2] - tipY) < 1e-6 &&
            canvasLog[back - 1][0] === 'moveTo') {
          return Math.hypot(tipX - canvasLog[back - 1][1], tipY - canvasLog[back - 1][2]);
        }
      }
      return null;
    }
    const weightLength = arrowLength('mg');
    const normalLength = arrowLength('N');
    expect(weightLength, 'weight arrow drawn while supported').not.toBeNull();
    expect(normalLength).not.toBeNull();
    expect((normalLength / sample.normalForceN) / (weightLength / sample.weightN)).toBeCloseTo(1, 2);
  });

  it('bug 11: accuracy evidence is a real half-step check, not an integrator identity', () => {
    const sim = physics.simGapJump({ speedMph: 32, angleDeg: 45, gapFt: 30, windId: 'head' });
    expect(sim.numericalCheck).toBeTruthy();
    expect(sim.numericalCheck.rangeDeltaM).toBeGreaterThan(0);
    expect(sim.numericalCheck.rangeDeltaM).toBeLessThan(0.01);
    const html = renderTool('skatelab', seed({ mode: 'gap' }));
    expect(html).not.toContain('closure residual');
    expect(html).toContain('Half-step check');
  });

  it('bug 12: view and surface quests need completed runs, not clicks', async () => {
    const quests = Object.fromEntries(toolConfig.questHooks.map((quest) => [quest.id, quest]));
    const state = await mount(seed());
    for (const surface of ['wax', 'rough', 'standard']) {
      await act(async () => { container.querySelector('#sk-surface-' + surface).click(); });
    }
    await act(async () => {
      [...container.querySelectorAll('button')].find((button) => button.textContent === '3D orbit view').click();
    });
    await act(async () => {
      [...container.querySelectorAll('button')].find((button) => button.textContent === '2D side view').click();
    });
    expect(quests.sk_surface_test.check(state.latest.skatelab)).toBe(false);
    expect(quests.sk_compare_views.check(state.latest.skatelab)).toBe(false);
    await launch();
    expect(quests.sk_surface_test.progress(state.latest.skatelab)).toBe('1/3 surfaces');
    expect(quests.sk_compare_views.progress(state.latest.skatelab)).toBe('1/2 views');
  });

  it('bug 13: playback uses one real-time scale, with a slow-motion option', async () => {
    reducedMotionQuery = false;
    const queued = new Map();
    let nextId = 0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      nextId += 1;
      queued.set(nextId, callback);
      return nextId;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => { queued.delete(id); });
    function frame(time) {
      const pending = [...queued.values()];
      queued.clear();
      pending.forEach((callback) => callback(time));
    }
    // A short Earth jump (1.5 s) and a long Moon jump (12 s): at 1x, a quarter
    // of the model time must take a quarter of that many real seconds in both.
    for (const setup of [{ mode: 'gap' }, { mode: 'gap', gravity: 1.62, speedMph: 32, angleDeg: 45, gapFt: 30 }]) {
      await act(async () => { root.unmount(); });
      root = ReactDOMClient.createRoot(container);
      await mount(seed(setup));
      const sim = physics.simGapJump({ speedMph: 17, angleDeg: 35, gapFt: 15, ...setup });
      await launch();
      await act(async () => { frame(1000); frame(1000 + 250 * sim.motionDuration); });
      expect(Math.abs(Number(container.querySelector('#sk-playhead').value) - 25)).toBeLessThanOrEqual(1);
    }

    const speed = container.querySelector('#sk-playback-speed');
    expect(speed).not.toBeNull();
    expect([...speed.options].map((option) => option.value)).toContain('0.25');
  });

  it('bug 14: the dead score is gone and a repeated identical estimate counts once', async () => {
    expect(physics.simHalfpipe({}).score).toBeUndefined();
    expect(physics.simGapJump({}).score).toBeUndefined();
    const sim = physics.simGapJump({ speedMph: 17, angleDeg: 35, gapFt: 15 });
    // Stage D: estimates count only while predict-first hides the results.
    const state = await mount(seed({ mode: 'gap', estimateChallenge: true, estimateValue: sim.rangeFt.toFixed(1) }));
    await launch();
    await launch();
    expect(state.latest.skatelab.stats.runs).toBe(2);
    expect(state.latest.skatelab.stats.withinTen).toBe(1);
  });

  it('bug 15: genuine runs award XP through awardXP(id, points, reason), once per setup', async () => {
    const awardXP = vi.fn();
    await mount(seed(), { awardXP });
    await launch();
    expect(awardXP).toHaveBeenCalled();
    for (const call of awardXP.mock.calls) {
      expect(typeof call[0]).toBe('string');
      expect(call[0]).toMatch(/^skatelab_/);
      expect(Number.isFinite(call[1])).toBe(true);
      expect(call[1]).toBeGreaterThan(0);
      expect(typeof call[2]).toBe('string');
    }
    const firstCount = awardXP.mock.calls.length;
    await launch();
    expect(awardXP.mock.calls.length).toBe(firstCount);
    await act(async () => {
      [...container.querySelectorAll('button')].find((button) => button.textContent === 'Replay').click();
    });
    expect(awardXP.mock.calls.length).toBe(firstCount);
  });
});
