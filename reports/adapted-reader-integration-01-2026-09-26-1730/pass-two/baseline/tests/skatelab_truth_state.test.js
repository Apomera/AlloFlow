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

let toolConfig;
let physics;
let container;
let root;
let originalGetContext;
let originalRect;
let originalMatchMedia;

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
      rotationTarget: 360,
      spinRate: 260,
      speedMph: 17,
      angleDeg: 35,
      gapFt: 15,
      cameraAzimuth: 38,
      showVectors: true,
      showTrail: true,
      showEnergy: true,
      estimateChallenge: false,
      estimateValue: '',
      experiments: [],
      stats: { runs: 0, successful: 0, withinTen: 0 },
      ...overrides,
    },
  };
}

function makeCanvasContext() {
  const gradient = { addColorStop: vi.fn() };
  const base = {
    setTransform: vi.fn(),
    createLinearGradient: vi.fn(() => gradient),
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    setLineDash: vi.fn(),
    fillText: vi.fn(),
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
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  ).set;
  setter.call(control, String(value));
  control.dispatchEvent(new window.Event('input', { bubbles: true }));
  control.dispatchEvent(new window.Event('change', { bubbles: true }));
}

function halfpipeModel(overrides = {}) {
  return physics.simHalfpipe({
    pumps: 3,
    vehicle: 'skate',
    gravity: 9.81,
    surfaceId: 'standard',
    rotationTarget: 360,
    spinRate: 260,
    riderMassKg: 62,
    rampDepthM: 2.4,
    bodyPositionId: 'neutral',
    ...overrides,
  });
}

function gapModel(overrides = {}) {
  return physics.simGapJump({
    speedMph: 17,
    angleDeg: 35,
    gapFt: 15,
    riderMassKg: 62,
    landingCompressionM: 0.45,
    vehicle: 'skate',
    gravity: 9.81,
    windId: 'calm',
    airDrag: true,
    ...overrides,
  });
}

beforeEach(() => {
  resetStemLab();
  toolConfig = loadTool('stem_lab/stem_tool_skatelab.js', 'skatelab');
  physics = window.__alloSkatePhysicsPure;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = ReactDOMClient.createRoot(container);

  originalGetContext = HTMLCanvasElement.prototype.getContext;
  originalRect = HTMLCanvasElement.prototype.getBoundingClientRect;
  originalMatchMedia = window.matchMedia;
  HTMLCanvasElement.prototype.getContext = vi.fn(() => makeCanvasContext());
  HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
    width: 800,
    height: 450,
    top: 0,
    left: 0,
    right: 800,
    bottom: 450,
  }));
  window.matchMedia = vi.fn(() => ({
    matches: true,
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
  vi.restoreAllMocks();
});

describe('Skate Lab setup/result truthfulness', () => {
  it('invalidates a measured status when a physics input changes without deleting the comparison run', async () => {
    let latestToolData;
    function Host() {
      const [toolData, setToolData] = React.useState(seed());
      latestToolData = toolData;
      return toolConfig.render(makeCtx({ toolData, setToolData }));
    }

    await act(async () => {
      root.render(React.createElement(Host));
    });
    await act(async () => {
      container.querySelector('[data-skatelab-launch="true"]').click();
    });

    const measuredStatus = container.querySelector('.sk-status').textContent;
    expect(measuredStatus).not.toContain('Predicted result:');
    expect(latestToolData.skatelab.lastResult).toBeTruthy();

    await act(async () => {
      setControlValue(container.querySelector('#sk-pumps'), 5);
    });

    const changedStatus = container.querySelector('.sk-status');
    expect(changedStatus.textContent).toContain('Predicted result:');
    expect(changedStatus.textContent).not.toBe(measuredStatus);
    expect(changedStatus.getAttribute('data-result')).toBe('');
    expect(latestToolData.skatelab.lastResult).toBeTruthy();
    expect(container.querySelector('.sk-trace-previous')).not.toBeNull();
  });

  it('restores the current setup preview after replaying a different saved run', async () => {
    const replayModel = halfpipeModel({ pumps: 1 });
    const currentModel = halfpipeModel({ pumps: 6 });
    expect(Math.round(replayModel.completed)).not.toBe(Math.round(currentModel.completed));

    function Host() {
      const [toolData, setToolData] = React.useState(seed({
        pumps: 6,
        lastResult: replayModel,
        lastSim: replayModel,
      }));
      return toolConfig.render(makeCtx({ toolData, setToolData }));
    }

    await act(async () => {
      root.render(React.createElement(Host));
    });

    const statusBeforeReplay = container.querySelector('.sk-status').textContent;
    expect(statusBeforeReplay).toContain('Predicted result:');
    expect(container.querySelector('.sk-status').getAttribute('data-result')).toBe('');

    await act(async () => {
      [...container.querySelectorAll('button')]
        .find((button) => button.textContent === 'Replay')
        .click();
    });

    expect(container.querySelector('.sk-status').textContent).toBe(statusBeforeReplay);
    expect(container.querySelector('.sk-status').getAttribute('data-result')).toBe('');
    expect(container.querySelector('#sk-playhead').value).toBe('100');
  });

  it('conceals calculated outcomes in estimate mode until this exact setup has run', () => {
    const current = gapModel();
    const lockedHtml = renderTool('skatelab', seed({
      mode: 'gap',
      estimateChallenge: true,
      estimateValue: '20',
      lastSim: gapModel({ speedMph: 14 }),
    }));
    const locked = document.createElement('div');
    locked.innerHTML = lockedHtml;

    expect(locked.querySelector('.skatelab-shell')?.getAttribute('data-skatelab-prediction-locked')).toBe('true');
    expect(locked.querySelector('.sk-status')?.textContent).toMatch(/run.+reveal/i);
    expect(locked.querySelector('.sk-status')?.textContent).not.toContain('Predicted result:');
    expect(locked.querySelector('#sk-canvas-summary')?.textContent).not.toContain('Current model range is');
    expect([...locked.querySelectorAll('.sk-metric-value')].every((metric) => metric.textContent === '—')).toBe(true);
    expect(locked.querySelector('.sk-live-telemetry')?.getAttribute('aria-label')).toMatch(/hidden until/i);
    expect(locked.querySelector('.sk-live-telemetry')?.textContent).not.toMatch(/mph|\d+\.\d+ g/i);
    expect(locked.querySelector('.sk-timeline-trace')?.getAttribute('aria-label')).toMatch(/hidden.+until/i);
    expect(locked.querySelector('.sk-trace-modeled')).toBeNull();
    expect(locked.querySelector('.sk-trace-peak')).toBeNull();
    expect(locked.querySelector('.sk-phase-markers')).toBeNull();
    expect(locked.querySelector('.sk-phase-jumps')).toBeNull();
    expect(locked.querySelector('#sk-phase-insight')?.textContent)
      .toBe('Phase evidence: Run the model to unlock phase-by-phase evidence.');
    expect(locked.querySelector('.sk-ledger-row')?.getAttribute('aria-label')).toMatch(/hidden until/i);
    expect([...locked.querySelectorAll('.sk-ledger-labels span')].every((label) => label.textContent.startsWith('—'))).toBe(true);
    expect(locked.querySelector('.sk-model-note')?.textContent).toMatch(/hidden until/i);
    expect([...locked.querySelectorAll('button')].some((button) => button.textContent === 'Replay')).toBe(false);

    const revealedHtml = renderTool('skatelab', seed({
      mode: 'gap',
      estimateChallenge: true,
      estimateValue: '20',
      lastResult: current,
      lastSim: current,
    }));
    const revealed = document.createElement('div');
    revealed.innerHTML = revealedHtml;

    expect(revealed.querySelector('.skatelab-shell')?.getAttribute('data-skatelab-prediction-locked')).toBe('false');
    expect(revealed.querySelector('.sk-status')?.textContent).not.toMatch(/run.+reveal/i);
    expect([...revealed.querySelectorAll('.sk-metric-value')].some((metric) => metric.textContent !== '—')).toBe(true);
  });
});
