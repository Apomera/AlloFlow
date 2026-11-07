// Stage E (2026-11-04, approved by Aaron): on the Moon hang-time mission a
// typed hang-time guess is a real prediction, so it opens the predict-first
// Run gate on its own. Blank or invalid guesses do not; credit still needs a
// blind, fresh setup; the typed guess is what the log records and compares.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
const SOURCE = process.env.SKATELAB_SRC || 'stem_lab/stem_tool_skatelab.js';

let toolConfig;
let physics;
let container;
let root;
let originals;

function seed(overrides = {}) {
  return {
    skatelab: {
      mode: 'halfpipe', viewMode: '2d', vehicle: 'skate', gravity: 1.62, surfaceId: 'standard', windId: 'calm',
      riderMassKg: 62, rampDepthM: 2.4, dropHeightM: 2.4, pumpTimingId: 'bottom', landingCompressionM: 0.45,
      bodyPositionId: 'neutral', airDrag: true, pumps: 3, rotationTarget: 180, spinRate: 210, speedMph: 17,
      angleDeg: 35, gapFt: 15, pushForceN: 200, cameraAzimuth: 38, showVectors: true, showTrail: true, showEnergy: true,
      estimateChallenge: true,
      _predictDefaultV: 2,
      activeMission: 'moon_hang',
      estimateValue: '', experiments: [], stats: { runs: 0, successful: 0, withinTen: 0 },
      ...overrides,
    },
  };
}

function makeCanvasContext() {
  const gradient = { addColorStop: vi.fn() };
  const base = {
    setTransform: vi.fn(), createLinearGradient: vi.fn(() => gradient), fillRect: vi.fn(), clearRect: vi.fn(),
    save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), closePath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
    stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(), translate: vi.fn(), rotate: vi.fn(), setLineDash: vi.fn(),
    fillText: vi.fn(), measureText: vi.fn(() => ({ width: 40 })),
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
const typeGuess = (value) => act(async () => { setControlValue(container.querySelector('#sk-mission-guess-banner'), value); });
const missionXp = (spy) => spy.mock.calls.map((call) => call[0]).filter((id) => /^skatelab_mission_/.test(id));
const metricTexts = () => [...container.querySelectorAll('.sk-metric-value')].map((node) => node.textContent);
const moonSim = (overrides = {}) => physics.simHalfpipe({ pumps: 3, rotationTarget: 180, spinRate: 210, gravity: 1.62, ...overrides });

beforeEach(() => {
  resetStemLab();
  toolConfig = loadTool(SOURCE, 'skatelab');
  physics = window.__alloSkatePhysicsPure;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = ReactDOMClient.createRoot(container);
  originals = {
    getContext: HTMLCanvasElement.prototype.getContext,
    rect: HTMLCanvasElement.prototype.getBoundingClientRect,
    matchMedia: window.matchMedia,
  };
  HTMLCanvasElement.prototype.getContext = vi.fn(() => makeCanvasContext());
  HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({ width: 800, height: 450, top: 0, left: 0, right: 800, bottom: 450 }));
  // Reduced motion: every run finishes at once.
  window.matchMedia = vi.fn(() => ({ matches: true, media: '(prefers-reduced-motion: reduce)', addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});

afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  if (container) container.remove();
  HTMLCanvasElement.prototype.getContext = originals.getContext;
  HTMLCanvasElement.prototype.getBoundingClientRect = originals.rect;
  window.matchMedia = originals.matchMedia;
  vi.restoreAllMocks();
});

describe('E1: a typed Moon hang-time guess counts as the prediction', () => {
  it('opens the Run gate, earns the mission once, and is what the log records', async () => {
    const awardXP = vi.fn();
    const moon = moonSim();
    const state = await mount(seed(), { awardXP });
    // The guess is typed while the answer is hidden.
    expect(container.querySelector('[data-skatelab-prediction-locked="true"]')).not.toBeNull();
    expect(metricTexts()).not.toContain(moon.airTime.toFixed(2) + ' s');
    expect(container.querySelector('#sk-predict-needed').textContent).toContain('hang-time prediction');
    const guess = Number((moon.airTime * 1.04).toFixed(2));
    await typeGuess(String(guess));
    // No choice and no estimate: the guess alone lets Run start.
    expect(container.querySelector('[data-skatelab-predict] input:checked')).toBeNull();
    expect(container.querySelector('#sk-predict-needed')).toBeNull();
    expect(container.querySelector('[data-skatelab-launch="true"]').getAttribute('aria-disabled')).toBeNull();
    await launch();
    const saved = state.latest.skatelab;
    expect(saved.stats.runs).toBe(1);
    expect(saved.missions.moon_hang.done).toBe(true);
    expect(missionXp(awardXP)).toEqual(['skatelab_mission_moon_hang']);
    // The log row keeps the typed guess and its error against the model.
    const row = saved.experiments[0];
    expect(row.hangGuess).toBe(guess);
    expect(row.hangErrPct).toBeCloseTo(Math.abs(guess - moon.airTime) / moon.airTime * 100, 6);
    expect(saved.missions.moon_hang.err).toBe(Math.round(row.hangErrPct));
    const cells = [...container.querySelectorAll('.sk-table tbody tr:first-child td')].map((td) => td.textContent);
    expect(cells.some((text) => text.includes(String(guess) + ' s') && text.includes(row.hangErrPct.toFixed(1) + '%'))).toBe(true);
  });

  it('a blank or invalid guess does not open the gate', async () => {
    const state = await mount(seed());
    await launch();
    expect(state.latest.skatelab.stats.runs).toBe(0);
    expect(container.querySelector('#sk-estimate-error')).not.toBeNull();
    for (const bad of ['0', '-2', '']) {
      await typeGuess(bad);
      await launch();
      expect(state.latest.skatelab.stats.runs).toBe(0);
      expect(container.querySelector('[data-skatelab-launch="true"]').getAttribute('aria-disabled')).toBe('true');
    }
  });

  it('editing the guess after the run does not re-earn the mission', async () => {
    const awardXP = vi.fn();
    const moon = moonSim();
    const state = await mount(seed(), { awardXP });
    await typeGuess((moon.airTime * 1.5).toFixed(2));
    await launch();
    expect(state.latest.skatelab.missions.moon_hang.reason).toBe('guess_off');
    // The answer is now on screen; copying it into the guess earns nothing.
    expect(metricTexts()).toContain(moon.airTime.toFixed(2) + ' s');
    await typeGuess(moon.airTime.toFixed(2));
    await launch();
    expect(state.latest.skatelab.stats.runs).toBe(2);
    expect(state.latest.skatelab.missions.moon_hang.done).toBe(false);
    expect(missionXp(awardXP)).toHaveLength(0);
    // The second row still records what was typed for it.
    expect(state.latest.skatelab.experiments[0].hangGuess).toBe(Number(moon.airTime.toFixed(2)));
  });

  it('with predict-first off the guess still never counts (stage D4 holds)', async () => {
    const awardXP = vi.fn();
    const moon = moonSim();
    const state = await mount(seed({ estimateChallenge: false }), { awardXP });
    await typeGuess(moon.airTime.toFixed(2));
    await launch();
    expect(state.latest.skatelab.missions.moon_hang.done).toBe(false);
    expect(missionXp(awardXP)).toHaveLength(0);
  });

  it('hostile saved guesses and log rows load without errors in every mode', async () => {
    const errors = vi.spyOn(console, 'error');
    for (const mode of ['halfpipe', 'flat', 'gap']) {
      if (root) await act(async () => { root.unmount(); });
      root = ReactDOMClient.createRoot(container);
      const state = await mount(seed({
        mode,
        missionGuess: 'junk',
        experiments: [{ id: 1, n: 1, mode: 'halfpipe', setup: 's', measured: 1, hangGuess: '2', hangErrPct: NaN }, null],
      }));
      expect(container.querySelector('.skatelab-shell')).not.toBeNull();
      if (mode === 'halfpipe') {
        await launch();
        expect(state.latest.skatelab.stats.runs).toBe(0);
      }
    }
    // The harness's own act() environment warnings are not tool errors.
    const real = errors.mock.calls.filter((call) => !/act\(|ReactDOMTestUtils\.act/.test(String(call[0])));
    expect(real).toEqual([]);
  });

  it('outside the Moon mission a typed estimate or choice is still required', async () => {
    const state = await mount(seed({ activeMission: null, missionGuess: { value: '3', signature: 'x' } }));
    expect(container.querySelector('#sk-mission-guess-banner')).toBeNull();
    expect(container.querySelector('#sk-predict-needed').textContent).not.toContain('hang-time');
    await launch();
    expect(state.latest.skatelab.stats.runs).toBe(0);
  });
});
