// Follow-ups from the independent hunt (2026-11-05). Failing blocks fail on the start copy:
// SKATELAB_SRC=C:/tmp/stem_engage_2026-11-04/followups/skatelab/start_stem_tool_skatelab.js
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

const footerTexts = () => {
  // Every fillText the canvas received, newest last.
  const ctx = HTMLCanvasElement.prototype.getContext.mock.results.map((r) => r.value);
  return ctx.flatMap((c) => c.fillText.mock.calls.map((call) => String(call[0])));
};
const lastFooter = () => footerTexts().filter((s) => /guess/.test(s)).slice(-1)[0];

describe('an estimate after a what-if ghost has shown that setup', () => {
  const revealThenMoon = async (awardXP) => {
    const state = await mount(seed({ activeMission: 'moon_hang' }), { awardXP });
    await chooseFirstAnswer();
    await launch();
    expect(state.latest.skatelab.moonSeen.length, 'the ghost showed the Moon setup').toBe(1);
    await pickOption(container.querySelector('#sk-gravity'), '1.62');
    return state;
  };

  it('a Moon estimate copied from the ghost earns no estimate XP and no within-10 tally', async () => {
    const awardXP = vi.fn();
    const state = await revealThenMoon(awardXP);
    const moon = physics.runSimulation('halfpipe', { ...HALFPIPE, gravity: 1.62 });
    const before = state.latest.skatelab.stats.withinTen;
    await typeInto(container.querySelector('#sk-estimate'), moon.hFt.toFixed(1));
    await launch();
    expect(xpIds(awardXP).filter((id) => id.startsWith('skatelab_estimate_'))).toEqual([]);
    expect(state.latest.skatelab.stats.withinTen).toBe(before);
    expect(state.latest.skatelab.estimateCredits || []).toEqual([]);
  });

  it('says so before the run, not after', async () => {
    await revealThenMoon(vi.fn());
    await typeInto(container.querySelector('#sk-estimate'), '5');
    const note = [...container.querySelectorAll('.sk-estimate-note')].map((n) => n.textContent).join(' ');
    expect(note).toContain('A what-if ghost already showed this setup');
  });

  it('a ghost for another change (the rider\'s mass) counts the same way', async () => {
    const awardXP = vi.fn();
    const state = await mount(seed({ predictionStats: { made: 1 } }), { awardXP });
    await chooseFirstAnswer();
    await launch();
    const ghost = container.querySelector('[data-skatelab-ghost]').getAttribute('data-skatelab-ghost');
    expect(ghost).not.toBe('hp_moon');
    expect(state.latest.skatelab.moonSeen.length, 'the ghost setup is recorded').toBe(1);
  });

  it('a Moon setup nobody has shown still earns the estimate credit', async () => {
    const awardXP = vi.fn();
    const moon = physics.runSimulation('halfpipe', { ...HALFPIPE, gravity: 1.62 });
    const state = await mount(seed({ gravity: 1.62 }), { awardXP });
    await typeInto(container.querySelector('#sk-estimate'), moon.hFt.toFixed(1));
    expect([...container.querySelectorAll('.sk-estimate-note')].length).toBe(0);
    await launch();
    expect(xpIds(awardXP).filter((id) => id.startsWith('skatelab_estimate_')).length).toBe(1);
    expect(state.latest.skatelab.stats.withinTen).toBe(1);
  });
});

describe('the canvas footer after a guess', () => {
  it('asks for a guess until there is one, then says it is saved', async () => {
    await mount(seed());
    expect(lastFooter()).toMatch(/^guess first/);
    await chooseFirstAnswer();
    expect(lastFooter()).toBe('guess saved  |  run it to see the ride');
  });
  it('a typed estimate counts as a guess too; clearing it goes back', async () => {
    await mount(seed());
    const box = container.querySelector('#sk-estimate');
    await typeInto(box, '4');
    expect(lastFooter()).toBe('guess saved  |  run it to see the ride');
    await typeInto(box, '');
    expect(lastFooter()).toMatch(/^guess first/);
  });
});

describe('the verdict on a stacked layout', () => {
  it('a wide layout keeps the verdict in the controls column', async () => {
    await mount(seed());
    await chooseFirstAnswer();
    await launch();
    const card = container.querySelector('[data-skatelab-predict-feedback]');
    expect(card.closest('.sk-controls')).not.toBeNull();
    expect(container.querySelector('[data-skatelab-verdict-dock]')).toBeNull();
  });
  it('a stacked layout moves it (not copies it) to right under the ride, and the ride scrolls to the top', async () => {
    const real = window.getComputedStyle;
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el, ps) => {
      if (el && el.classList && el.classList.contains('sk-workbench')) return { gridTemplateColumns: '320px' };
      return real.call(window, el, ps);
    });
    Object.defineProperty(window, 'innerHeight', { value: 640, configurable: true, writable: true });
    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({ width: 300, height: 170, top: -900, left: 0, right: 300, bottom: -730 }));
    await mount(seed());
    await chooseFirstAnswer();
    await launch();
    const cards = container.querySelectorAll('[data-skatelab-predict-feedback]');
    expect(cards.length).toBe(1);
    const dock = container.querySelector('[data-skatelab-verdict-dock]');
    expect(dock.contains(cards[0])).toBe(true);
    expect(dock.closest('.sk-stage')).not.toBeNull();
    expect(container.querySelector('.sk-canvas-frame').nextElementSibling).toBe(dock);
    expect(window.HTMLElement.prototype.scrollIntoView.mock.calls[0][0]).toMatchObject({ block: 'start' });
  });
});