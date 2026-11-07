// Independent hunt of the Skate Lab engagement build (2026-11-04). Each test
// fails on the start copy:
// SKATELAB_SRC=C:/tmp/stem_engage_2026-11-04/skatelab/hunt/start_stem_tool_skatelab.js
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
let reducedMotion;

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
  return new Proxy(base, {
    get(target, property) { return property in target ? target[property] : undefined; },
    set(target, property, value) { target[property] = value; return true; },
  });
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

const launchButton = () => container.querySelector('[data-skatelab-launch="true"]');
const launch = () => act(async () => { launchButton().click(); });
const chooseFirstAnswer = () => act(async () => { container.querySelector('[data-skatelab-predict] input[type="radio"]').click(); });
const xpIds = (spy) => spy.mock.calls.map((call) => call[0]);

function setNativeValue(element, value) {
  const proto = element.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(element, value);
}
const typeInto = (element, value) => act(async () => {
  setNativeValue(element, value);
  element.dispatchEvent(new window.Event('input', { bubbles: true }));
});
const pickOption = (element, value) => act(async () => {
  setNativeValue(element, value);
  element.dispatchEvent(new window.Event('change', { bubbles: true }));
});
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
  reducedMotion = true;
  originals = {
    getContext: HTMLCanvasElement.prototype.getContext,
    rect: HTMLCanvasElement.prototype.getBoundingClientRect,
    scroll: window.HTMLElement.prototype.scrollIntoView,
    matchMedia: window.matchMedia,
  };
  HTMLCanvasElement.prototype.getContext = vi.fn(() => makeCanvasContext());
  HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({ width: 800, height: 450, top: 0, left: 0, right: 800, bottom: 450 }));
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.matchMedia = vi.fn(() => ({ matches: reducedMotion, media: '(prefers-reduced-motion: reduce)', addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});

afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  if (container) container.remove();
  HTMLCanvasElement.prototype.getContext = originals.getContext;
  HTMLCanvasElement.prototype.getBoundingClientRect = originals.rect;
  window.HTMLElement.prototype.scrollIntoView = originals.scroll;
  window.matchMedia = originals.matchMedia;
  vi.restoreAllMocks();
});

describe('the Moon hang-time guess after a reveal', () => {
  it('a guess copied from the revealed Moon air time does not complete the mission', async () => {
    const awardXP = vi.fn();
    const state = await mount(seed({ activeMission: 'moon_hang' }), { awardXP });
    expect(container.querySelector('#sk-predict-question').textContent).toMatch(/Moon/);
    await chooseFirstAnswer();
    await launch();

    const moon = physics.runSimulation('halfpipe', { ...HALFPIPE, gravity: 1.62 });
    expect(container.querySelector('.sk-ghost-note').textContent).toContain(moon.airTime.toFixed(2) + ' s in the air');

    await pickOption(container.querySelector('#sk-gravity'), '1.62');
    const guessBox = container.querySelector('[data-skatelab-active-mission] input');
    await typeInto(guessBox, moon.airTime.toFixed(2));
    const helpBeforeRun = container.querySelector('[data-skatelab-active-mission]').textContent;
    await launch();

    expect(xpIds(awardXP)).not.toContain('skatelab_mission_moon_hang');
    expect(state.latest.skatelab.missions.moon_hang && state.latest.skatelab.missions.moon_hang.done).not.toBe(true);
    // The learner is told before the run, not surprised after it.
    expect(helpBeforeRun).toContain('will not count');
  });

  it('a Moon setup with no reveal still accepts the guess', async () => {
    const awardXP = vi.fn();
    const moon = physics.runSimulation('halfpipe', { ...HALFPIPE, gravity: 1.62 });
    await mount(seed({ activeMission: 'moon_hang', gravity: 1.62 }), { awardXP });
    await typeInto(container.querySelector('[data-skatelab-active-mission] input'), moon.airTime.toFixed(2));
    expect(container.querySelector('[data-skatelab-active-mission]').textContent).not.toContain('will not count');
    await launch();
    expect(xpIds(awardXP)).toContain('skatelab_mission_moon_hang');
  });

  it('with answers hidden nothing was revealed, so the Moon setup stays open', async () => {
    const state = await mount(seed({ teacher: { hideAnswers: true } }));
    await chooseFirstAnswer();
    await launch();
    expect(state.latest.skatelab.moonSeen || []).toEqual([]);
  });
});

describe('trick XP', () => {
  it('a No spin ride earns no "landed a spin" award', async () => {
    expect(physics.simHalfpipe({ ...HALFPIPE, rotationTarget: 0, spinRate: 0 }).runSuccessful).toBe(true);
    const awardXP = vi.fn();
    await mount(seed({ rotationTarget: 0, spinRate: 0, estimateChallenge: false }), { awardXP });
    await launch();
    expect(xpIds(awardXP)).not.toContain('skatelab_trick_landed');
    expect(xpIds(awardXP)).not.toContain('skatelab_half_turn');
  });
});

describe('the run button during a ride', () => {
  it('Space on the focused run button pauses and resumes, as its aria-keyshortcuts says', async () => {
    reducedMotion = false;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    await mount(seed({ estimateChallenge: false }));
    launchButton().focus();
    await launch();
    expect(launchButton().textContent).toContain('Running');
    expect(document.activeElement).toBe(launchButton());
    expect(launchButton().getAttribute('aria-keyshortcuts')).toBe('Space');

    const press = () => act(async () => {
      launchButton().dispatchEvent(new window.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    });
    await press();
    expect(launchButton().textContent).toContain('Paused');
    await press();
    expect(launchButton().textContent).toContain('Running');
  });

  it('Space on the idle run button is left to the button, so a ride starts once', async () => {
    await mount(seed({ estimateChallenge: false }));
    const event = new window.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    await act(async () => { launchButton().dispatchEvent(event); });
    expect(event.defaultPrevented).toBe(false);
  });
});

describe('focus after the reveal', () => {
  it('"Try this to see why" moves focus to the new setup\'s guess, not to the page', async () => {
    await mount(seed());
    await chooseFirstAnswer();
    await launch();
    const tryButton = [...container.querySelectorAll('button')].find((button) => /Try this to see why/.test(button.textContent));
    tryButton.focus();
    await act(async () => { tryButton.click(); });
    expect(tryButton.isConnected).toBe(false);
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement.closest('[data-skatelab-quickstart]')).not.toBeNull();
  });
});

describe('the start handle', () => {
  it('stays under the pointer when the canvas rescales during the drag', async () => {
    const big = { rampDepthM: 4.5, dropHeightM: 4.5, pumps: 6, spinRate: 400, estimateChallenge: false };
    await mount(seed(big));
    const handle = container.querySelector('[data-skatelab-start-handle]');
    const canvas = container.querySelector('canvas.sk-canvas');
    const startScale = canvas.__skStartMarker.sy;
    const y = canvas.__skStartMarker.y + 80;
    await act(async () => { pointer('pointerdown', handle, canvas.__skStartMarker.y); });
    for (let move = 0; move < 6; move += 1) {
      await act(async () => { pointer('pointermove', handle, y); });
    }
    await act(async () => { pointer('pointerup', handle, y); });
    const marker = canvas.__skStartMarker;
    expect(marker.sy).not.toBeCloseTo(startScale, 1);
    // Within two 0.1 m slider steps of the pointer.
    expect(Math.abs(marker.y - y)).toBeLessThanOrEqual(0.2 * marker.sy + 1);
  });
});

describe('the Simple band description', () => {
  it('the canvas description is readable while "Describe the ride" is closed', async () => {
    await mount(seed({ estimateChallenge: false }), { gradeBand: 'g68' });
    const canvas = container.querySelector('canvas.sk-canvas');
    const describedBy = document.getElementById(canvas.getAttribute('aria-describedby'));
    const details = container.querySelector('details[data-skatelab-describe]');
    expect(details.open).toBe(false);
    expect(describedBy.textContent.length).toBeGreaterThan(20);
    // Chromium gives an empty description for text inside a closed <details>.
    expect(details.contains(describedBy)).toBe(false);
    expect(details.querySelector('.sk-canvas-summary').textContent).toBe(describedBy.textContent);
    expect(container.querySelectorAll('#sk-canvas-summary').length).toBe(1);
  });
});
