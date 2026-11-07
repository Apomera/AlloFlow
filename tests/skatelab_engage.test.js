// Engagement pass (2026-11-04): keep the ride in view, predict + run first
// with positive wording, no trick XP for the untouched default, a what-if
// ghost after the reveal only, a calmer Simple band and a draggable start
// point that mirrors the Drop-in height slider. Each test fails on the
// start copy (SKATELAB_SRC=C:/tmp/stem_engage_2026-11-04/skatelab/build_start_stem_tool_skatelab.js).
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
let contexts;
let canvasRect;

const HALFPIPE = {
  mode: 'halfpipe', viewMode: '2d', vehicle: 'skate', gravity: 9.81, surfaceId: 'standard', windId: 'calm',
  riderMassKg: 62, rampDepthM: 2.4, dropHeightM: 2.4, pumpTimingId: 'bottom', landingCompressionM: 0.45,
  bodyPositionId: 'neutral', airDrag: true, pumps: 3, rotationTarget: 180, spinRate: 210, speedMph: 17,
  angleDeg: 35, gapFt: 15, pushForceN: 200, cameraAzimuth: 38, showVectors: true, showTrail: true, showEnergy: true,
};

function seed(overrides = {}) {
  return {
    skatelab: {
      ...HALFPIPE,
      estimateChallenge: true,
      _predictDefaultV: 2,
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
  const proxy = new Proxy(base, {
    get(target, property) { return property in target ? target[property] : undefined; },
    set(target, property, value) { target[property] = value; return true; },
  });
  contexts.push(base);
  return proxy;
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
const launchButton = () => container.querySelector('[data-skatelab-launch="true"]');
const launch = () => click(launchButton());
const chooseFirstAnswer = () => click(container.querySelector('[data-skatelab-predict] input[type="radio"]'));
const xpIds = (spy) => spy.mock.calls.map((call) => call[0]);
const drawnTexts = () => contexts.flatMap((ctx) => ctx.fillText.mock.calls.map(([text]) => String(text)));
const before = (a, b) => !!(a && b && (a.compareDocumentPosition(b) & window.Node.DOCUMENT_POSITION_FOLLOWING));

function pointer(type, target, clientY) {
  const event = new window.MouseEvent(type, { bubbles: true, cancelable: true, clientY, clientX: 10 });
  Object.defineProperty(event, 'pointerId', { value: 7 });
  target.dispatchEvent(event);
}

beforeEach(() => {
  resetStemLab();
  toolConfig = loadTool(SOURCE, 'skatelab');
  physics = window.__alloSkatePhysicsPure;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = ReactDOMClient.createRoot(container);
  contexts = [];
  canvasRect = { width: 800, height: 450, top: 0, left: 0, right: 800, bottom: 450 };
  originals = {
    getContext: HTMLCanvasElement.prototype.getContext,
    rect: HTMLCanvasElement.prototype.getBoundingClientRect,
    scroll: window.HTMLElement.prototype.scrollIntoView,
    matchMedia: window.matchMedia,
    innerHeight: window.innerHeight,
  };
  HTMLCanvasElement.prototype.getContext = vi.fn(() => makeCanvasContext());
  HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({ ...canvasRect }));
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  // Reduced motion: every run finishes at once.
  window.matchMedia = vi.fn(() => ({ matches: true, media: '(prefers-reduced-motion: reduce)', addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});

afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  if (container) container.remove();
  HTMLCanvasElement.prototype.getContext = originals.getContext;
  HTMLCanvasElement.prototype.getBoundingClientRect = originals.rect;
  window.HTMLElement.prototype.scrollIntoView = originals.scroll;
  window.matchMedia = originals.matchMedia;
  Object.defineProperty(window, 'innerHeight', { value: originals.innerHeight, configurable: true, writable: true });
  vi.restoreAllMocks();
});

describe('3: no trick XP for the untouched default', () => {
  it('the default 180° neutral 3-pump ride lands but pays no trick or half-turn award', async () => {
    expect(physics.simHalfpipe({ pumps: 3, rotationTarget: 180, spinRate: 210 }).runSuccessful).toBe(true);
    const awardXP = vi.fn();
    await mount(seed(), { awardXP });
    await chooseFirstAnswer();
    await launch();
    const ids = xpIds(awardXP);
    expect(ids.some((id) => /^skatelab_setup_/.test(id))).toBe(true);
    expect(ids).not.toContain('skatelab_trick_landed');
    expect(ids).not.toContain('skatelab_half_turn');
  });

  it('a learner-changed spin that lands earns both, once; legacy credits stay and never re-pay', async () => {
    const changed = { spinRate: 220 };
    expect(physics.simHalfpipe({ pumps: 3, rotationTarget: 180, ...changed }).runSuccessful).toBe(true);
    const awardXP = vi.fn();
    const state = await mount(seed({ ...changed, estimateChallenge: false }), { awardXP });
    await launch();
    expect(xpIds(awardXP).filter((id) => id === 'skatelab_trick_landed')).toHaveLength(1);
    expect(xpIds(awardXP).filter((id) => id === 'skatelab_half_turn')).toHaveLength(1);
    expect(state.latest.skatelab.xpCredits).toContain('skatelab_trick_landed');

    // A learner who earned it on the old default keeps it and is not paid again.
    await act(async () => { root.unmount(); });
    root = ReactDOMClient.createRoot(container);
    const legacy = vi.fn();
    const kept = await mount(seed({ ...changed, pumps: 4, estimateChallenge: false, xpCredits: ['skatelab_trick_landed', 'skatelab_half_turn'] }), { awardXP: legacy });
    await launch();
    expect(xpIds(legacy)).not.toContain('skatelab_trick_landed');
    expect(kept.latest.skatelab.xpCredits).toEqual(expect.arrayContaining(['skatelab_trick_landed', 'skatelab_half_turn']));
  });

  it('the rule reads the run itself (spin, spin rate, body, pumps)', () => {
    const base = { pumps: 3, rotationTarget: 180, spinRate: 210, bodyPositionId: 'neutral' };
    expect(physics.trickSetupChanged(physics.simHalfpipe(base))).toBe(false);
    expect(physics.trickSetupChanged(physics.simHalfpipe({ ...base, rotationTarget: 540 }))).toBe(true);
    expect(physics.trickSetupChanged(physics.simHalfpipe({ ...base, bodyPositionId: 'tuck' }))).toBe(true);
    expect(physics.trickSetupChanged(physics.simHalfpipe({ ...base, pumps: 2 }))).toBe(true);
    expect(physics.trickSetupChanged(physics.simHalfpipe({ ...base, dropHeightM: 1.5 }))).toBe(false);
  });
});

describe('2: predict and run come first, in positive words', () => {
  it('the guess, the estimate and Drop In come before the rider setup in the controls', async () => {
    await mount(seed());
    const panel = container.querySelector('#sk-mode-panel');
    const quick = panel.querySelector('[data-skatelab-quickstart]');
    expect(quick).not.toBeNull();
    expect(quick.querySelector('[data-skatelab-predict]')).not.toBeNull();
    expect(quick.querySelector('#sk-estimate')).not.toBeNull();
    expect(quick.querySelector('[data-skatelab-launch="true"]')).not.toBeNull();
    expect(before(launchButton(), container.querySelector('#sk-gravity'))).toBe(true);
    expect(before(launchButton(), container.querySelector('#sk-drop-height'))).toBe(true);
  });

  it('says "Guess first", then "Guess saved"; never "prediction locked"', async () => {
    await mount(seed());
    const phase = () => container.querySelector('.sk-live-telemetry .sk-phase').textContent;
    expect(phase()).toBe('Guess first');
    expect(container.querySelector('.sk-status').textContent).toContain('Make your guess');
    await chooseFirstAnswer();
    expect(phase()).toBe('Guess saved');
    expect(container.querySelector('.sk-status').textContent).toContain('Guess saved');
    expect(container.textContent.toLowerCase()).not.toContain('prediction locked');
    expect(drawnTexts().join(' | ').toLowerCase()).not.toContain('prediction locked');
  });
});

describe('1: the ride stays in view', () => {
  it('Drop In scrolls an off-screen canvas into view (instantly under reduced motion)', async () => {
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true, writable: true });
    await mount(seed({ estimateChallenge: false }));
    canvasRect = { width: 800, height: 450, top: -900, left: 0, right: 800, bottom: -450 };
    await launch();
    const calls = window.HTMLElement.prototype.scrollIntoView.mock.calls;
    expect(calls.length).toBe(1);
    expect(window.HTMLElement.prototype.scrollIntoView.mock.contexts[0].tagName).toBe('CANVAS');
    expect(calls[0][0]).toMatchObject({ block: 'center', behavior: 'auto' });
  });

  it('does not scroll when the canvas is already fully visible, and a blocked run does not scroll', async () => {
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true, writable: true });
    await mount(seed());
    await launch(); // no guess yet: blocked
    expect(window.HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
    await chooseFirstAnswer();
    await launch();
    expect(window.HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('the run button stays focusable while the ride plays (focus is not dropped)', async () => {
    window.matchMedia = vi.fn(() => ({ matches: false, media: '', addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    await mount(seed({ estimateChallenge: false }));
    launchButton().focus();
    await launch();
    expect(raf).toHaveBeenCalled();
    expect(launchButton().textContent).toContain('Running');
    expect(launchButton().disabled).toBe(false);
    expect(launchButton().getAttribute('aria-disabled')).toBe('true');
    expect(document.activeElement).toBe(launchButton());
  });
});

describe('4: the what-if ghost appears on the canvas after the reveal only', () => {
  it('Moon prompt: no ghost before the run; after it, a ghost note and canvas tag from the model', async () => {
    await mount(seed());
    expect(container.querySelector('#sk-predict-question').textContent).toMatch(/Moon/);
    expect(container.querySelector('.sk-ghost-note')).toBeNull();
    expect(drawnTexts()).not.toContain('what-if: Moon');
    await chooseFirstAnswer();
    expect(container.querySelector('.sk-ghost-note')).toBeNull();
    await launch();

    const note = container.querySelector('.sk-ghost-note');
    expect(note).not.toBeNull();
    expect(note.getAttribute('data-skatelab-ghost')).toBe('hp_moon');
    const top = (sim) => Math.max(0, ...(sim.passPeaks || []).map((p) => p.heightM));
    const earth = physics.runSimulation('halfpipe', { ...HALFPIPE });
    const moon = physics.runSimulation('halfpipe', { ...HALFPIPE, gravity: 1.62 });
    expect(note.textContent).toContain('the same ride on the Moon');
    expect(note.textContent).toContain(top(moon).toFixed(2) + ' m with ' + moon.airTime.toFixed(2) + ' s in the air');
    expect(note.textContent).toContain(top(earth).toFixed(2) + ' m with ' + earth.airTime.toFixed(2) + ' s');
    // Same drop, same height; longer air on the Moon (the model's own answer).
    expect(top(moon).toFixed(2)).toBe(top(earth).toFixed(2));
    expect(moon.airTime).toBeGreaterThan(earth.airTime);
    expect(drawnTexts()).toContain('what-if: Moon');
    expect(container.querySelector('.sk-stage-legend').textContent).toContain('white dashes = what-if ghost');
  });

  it('no ghost when the teacher hides answers, or when predict-first is off', async () => {
    await mount(seed({ teacher: { hideAnswers: true } }));
    await chooseFirstAnswer();
    await launch();
    expect(container.querySelector('[data-skatelab-predict-feedback="hidden"]')).not.toBeNull();
    expect(container.querySelector('.sk-ghost-note')).toBeNull();
    expect(drawnTexts()).not.toContain('what-if: Moon');

    await act(async () => { root.unmount(); });
    root = ReactDOMClient.createRoot(container);
    contexts = [];
    await mount(seed({ estimateChallenge: false }));
    await launch();
    expect(container.querySelector('.sk-ghost-note')).toBeNull();
  });

  it('the ghost patch is the same one-variable change as "Try this to see why"', () => {
    const sim = physics.runSimulation('halfpipe', { ...HALFPIPE });
    expect(physics.ghostSimFor(sim, 'hp_moon').patch).toEqual({ gravity: 1.62 });
    expect(physics.ghostSimFor(sim, 'hp_spin').patch).toEqual({ bodyPositionId: 'tuck' });
    expect(physics.ghostSimFor(sim, 'hp_friction').sim.pumps).toBe(0);
    const coasting = physics.runSimulation('halfpipe', { ...HALFPIPE, pumps: 0 });
    expect(physics.ghostSimFor(coasting, 'hp_friction')).toBeNull();
  });
});

describe('5: a plain Simple band and a draggable start point', () => {
  it('Simple level: the long ride description sits behind "Describe the ride"; the canvas still points to it', async () => {
    await mount(seed(), { gradeBand: 'g68' });
    const canvas = container.querySelector('canvas.sk-canvas');
    expect(canvas.getAttribute('aria-describedby')).toBe('sk-canvas-summary');
    const details = container.querySelector('details[data-skatelab-describe]');
    expect(details).not.toBeNull();
    expect(details.open).toBe(false);
    expect(details.querySelector('summary').textContent).toBe('Describe the ride');
    // The text is in the disclosure; a hidden twin keeps the canvas description while it is closed.
    expect(details.querySelector('.sk-canvas-summary')).not.toBeNull();
    expect(details.querySelector('#sk-canvas-summary')).toBeNull();
    expect(container.querySelector('#sk-canvas-summary').hidden).toBe(true);
  });

  it('Simple level keeps the cause-and-effect check visible while the description is closed', async () => {
    await mount(seed({ estimateChallenge: false, lastSim: physics.simHalfpipe({ ...HALFPIPE, pumps: 2 }) }), { gradeBand: 'g68' });
    const line = container.querySelector('.sk-comparison-line');
    expect(line).not.toBeNull();
    expect(line.closest('details')).toBeNull();
    expect(line.textContent).toContain('Cause-and-effect check');
    // The canvas description still carries it for screen readers.
    expect(container.querySelector('#sk-canvas-summary').textContent).toContain('Cause-and-effect check');
  });

  it('Standard level keeps the description open as before', async () => {
    await mount(seed({ scaffoldLevel: 'standard' }), { gradeBand: 'g68' });
    expect(container.querySelector('details[data-skatelab-describe]')).toBeNull();
    expect(container.querySelector('#sk-canvas-summary').closest('details')).toBeNull();
  });

  it('dragging the start handle sets the same drop height the slider would, and the slider follows', async () => {
    const state = await mount(seed());
    const handle = container.querySelector('[data-skatelab-start-handle]');
    expect(handle).not.toBeNull();
    expect(handle.getAttribute('aria-hidden')).toBe('true');
    expect(handle.hidden).toBe(false);
    const canvas = container.querySelector('canvas.sk-canvas');
    const marker = canvas.__skStartMarker;
    expect(marker && marker.sy > 0).toBe(true);
    // The handle sits on the drawn start point.
    expect(handle.style.left).toBe(Math.round(marker.x - 22) + 'px');
    expect(handle.style.top).toBe(Math.round(marker.y - 22) + 'px');

    const yFor = (metres) => marker.baseY - metres * marker.sy;
    await act(async () => { pointer('pointerdown', handle, marker.y); });
    await act(async () => { pointer('pointermove', handle, yFor(1.53)); });
    expect(state.latest.skatelab.dropHeightM).toBe(1.5);
    const slider = container.querySelector('#sk-drop-height');
    expect(Number(slider.value)).toBe(1.5);
    // Clamped to the slider's own range.
    await act(async () => { pointer('pointermove', handle, yFor(9)); });
    expect(state.latest.skatelab.dropHeightM).toBe(Number(slider.max));
    await act(async () => { pointer('pointermove', handle, yFor(-3)); });
    expect(state.latest.skatelab.dropHeightM).toBe(Number(slider.min));
    await act(async () => { pointer('pointerup', handle, yFor(1)); });
    await act(async () => { pointer('pointermove', handle, yFor(2)); });
    expect(state.latest.skatelab.dropHeightM).toBe(Number(slider.min));
  });

  it('the handle is only offered on the 2D halfpipe', async () => {
    await mount(seed({ viewMode: '3d' }));
    expect(container.querySelector('[data-skatelab-start-handle]').hidden).toBe(true);
    await act(async () => { root.unmount(); });
    root = ReactDOMClient.createRoot(container);
    await mount(seed({ mode: 'gap' }));
    expect(container.querySelector('[data-skatelab-start-handle]').hidden).toBe(true);
  });
});
