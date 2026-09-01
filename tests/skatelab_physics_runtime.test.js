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

let toolConfig;
let container;
let root;
let contextCalls;
let originalGetContext;
let originalRect;
let originalMatchMedia;

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
      if (property in target) return target[property];
      return undefined;
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

function seed() {
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
    },
  };
}

beforeEach(() => {
  resetStemLab();
  toolConfig = loadTool('stem_lab/stem_tool_skatelab.js', 'skatelab');
  container = document.createElement('div');
  document.body.appendChild(container);
  root = ReactDOMClient.createRoot(container);
  contextCalls = [];

  originalGetContext = HTMLCanvasElement.prototype.getContext;
  originalRect = HTMLCanvasElement.prototype.getBoundingClientRect;
  originalMatchMedia = window.matchMedia;

  HTMLCanvasElement.prototype.getContext = vi.fn(() => {
    const ctx = makeCanvasContext();
    contextCalls.push(ctx);
    return ctx;
  });
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

describe('Skate Lab mounted canvas runtime', () => {
  it('draws, switches views and modes, then completes and logs a reduced-motion run', async () => {
    function Host() {
      const [toolData, setToolData] = React.useState(seed());
      const ctx = makeCtx({
        toolData,
        setToolData,
        announceToSR: vi.fn(),
      });
      return toolConfig.render(ctx);
    }

    await act(async () => {
      root.render(React.createElement(Host));
    });

    expect(container.querySelector('canvas')).not.toBeNull();
    expect(contextCalls.length).toBeGreaterThan(0);
    expect(container.textContent).toContain('2D side view');
    expect(container.querySelector('canvas')?.getAttribute('aria-label')).toContain('2D view');
    expect(container.querySelector('#sk-playhead')).not.toBeNull();
    expect(container.querySelector('#sk-playhead')?.getAttribute('aria-describedby'))
      .toBe('sk-phase-times sk-phase-insight');
    expect(container.querySelector('#sk-phase-insight')?.textContent)
      .toContain('Gravity converts height into speed');
    expect(container.querySelectorAll('.sk-phase-jump').length).toBeGreaterThanOrEqual(5);
    expect(container.querySelector('.sk-phase-jump[aria-label^="Jump to apex at"]')).not.toBeNull();
    expect(container.querySelector('#sk-phase-times')?.textContent).toContain('bottom');
    expect(container.querySelector('#sk-phase-times')?.textContent).toContain('re-entry');
    expect(container.querySelector('#sk-phase-times')?.textContent).toContain('return');
    expect(container.querySelector('.sk-timeline-trace')?.getAttribute('role')).toBe('img');
    expect(container.querySelector('.sk-timeline-trace')?.getAttribute('aria-label'))
      .toContain('Transition normal load trace');
    expect(container.querySelector('.sk-timeline-trace')?.getAttribute('aria-label'))
      .toContain('tangent-matched wall re-entry');
    expect(container.querySelector('.sk-timeline-trace')?.getAttribute('aria-label'))
      .toContain('return to the bottom');
    expect(container.querySelector('.sk-trace-reentry-peak')).not.toBeNull();
    expect(container.querySelector('.sk-trace-modeled')?.getAttribute('d')).toMatch(/^M /);
    expect(container.querySelector('#sk-ramp-depth')?.value).toBe('2.4');
    expect(container.querySelector('.sk-live-telemetry')?.getAttribute('aria-label')).toContain('Live motion telemetry');
    expect(container.querySelector('.sk-live-telemetry')?.getAttribute('aria-label')).toContain('degrees of trick rotation');
    expect(container.querySelector('#sk-canvas-summary')?.textContent).toContain('board follows the local surface tangent');
    expect(contextCalls.some((ctx) => ctx.fillText.mock.calls.some((call) => String(call[0]).startsWith('peak ')))).toBe(true);

    const apexJump = container.querySelector('.sk-phase-jump[aria-label^="Jump to apex at"]');
    await act(async () => {
      apexJump.click();
    });
    expect(Number(container.querySelector('#sk-playhead')?.value)).toBeGreaterThan(50);
    expect(container.querySelector('.sk-live-telemetry')?.textContent).toContain('at the apex');
    expect(container.querySelector('#sk-phase-insight')?.textContent)
      .toContain('Vertical velocity is momentarily near zero');
    expect(container.querySelector('.sk-status')?.textContent).toContain('Inspecting at the apex');

    const halfpipePlayhead = container.querySelector('#sk-playhead');
    await act(async () => {
      setControlValue(halfpipePlayhead, 100);
    });
    expect(halfpipePlayhead?.value).toBe('100');
    expect(container.querySelector('.sk-live-telemetry')?.textContent)
      .toContain('compressing on the return');
    expect(container.querySelector('.sk-live-telemetry')?.textContent)
      .toContain('° trick');
    expect(container.querySelector('.sk-live-telemetry')?.textContent)
      .toMatch(/[1-9][0-9]*(?:\.[0-9])? g load/);

    const orbit = [...container.querySelectorAll('button')]
      .find((button) => button.textContent === '3D orbit view');
    await act(async () => {
      orbit.click();
    });

    expect(orbit.getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('canvas')?.getAttribute('aria-label')).toContain('3D view');
    expect(container.textContent).toContain('Camera azimuth');

    const gapTab = container.querySelector('#sk-mode-tab-gap');
    await act(async () => {
      gapTab.click();
    });

    expect(gapTab.getAttribute('aria-selected')).toBe('true');
    expect(container.textContent).toContain('Horizontal range');
    expect(container.textContent).toContain('Launch Jump');
    expect(container.querySelector('#sk-air-drag')?.checked).toBe(true);
    expect(container.querySelector('#sk-landing-compression')?.value).toBe('0.45');
    expect(container.querySelector('#sk-phase-times')?.textContent).toContain('pulse end');
    expect(container.querySelector('.sk-timeline-trace')?.getAttribute('aria-label'))
      .toContain('Support load trace');
    expect(container.querySelector('.sk-timeline-trace')?.getAttribute('aria-label'))
      .toContain('0 g in free flight');
    expect(container.querySelector('.sk-timeline-trace')?.getAttribute('aria-label'))
      .toContain('smooth half-sine landing pulse');
    expect(container.querySelector('#sk-wind-cross_right')).not.toBeNull();
    expect(container.textContent).toContain('Landing angle');
    expect(container.textContent).toContain('Lateral drift');
    expect(container.textContent).toContain('Landing load');
    expect(container.textContent).toContain('vertical kinetic energy removed');
    expect(container.textContent).toContain('support-work magnitude');
    expect(container.textContent).toContain('net vertical impulse');
    expect(container.textContent).toContain('mean contact force');
    expect(container.textContent).toContain('ideal no-drag reference');

    const launch = container.querySelector('[data-skatelab-launch="true"]');
    await act(async () => {
      launch.click();
    });

    expect(container.querySelector('[role="status"]')?.textContent)
      .toMatch(/Landing zone reached|Short of the platform|Past the landing zone/);
    expect(container.querySelector('[role="status"]')?.textContent).toContain('landing load');
    expect(container.textContent).toContain('Recent Skate Lab experiments');
    expect(container.querySelectorAll('.sk-table tbody tr')).toHaveLength(1);
    expect(container.querySelector('#sk-playhead')?.value).toBe('100');
    expect(container.querySelector('.sk-live-telemetry')?.textContent)
      .toContain('contact pulse complete');
    expect(container.querySelector('.sk-live-telemetry')?.textContent)
      .toMatch(/COM ↓ 0\.45 m · 1(?:\.0)? g/);
    expect(contextCalls.some((ctx) => ctx.fillText.mock.calls.length > 0)).toBe(true);

    const contactModel = window.__alloSkatePhysicsPure.simGapJump({
      speedMph: 17,
      angleDeg: 35,
      gapFt: 15,
      riderMassKg: 62,
      vehicle: 'skate',
      gravity: 9.81,
      windId: 'calm',
      airDrag: true,
      landingCompressionM: 0.45,
    });
    const contactMidPercent = Math.round(100 * (
      contactModel.approachTime + contactModel.airTime +
      contactModel.landingStopTimeS * 0.5
    ) / contactModel.motionDuration);
    await act(async () => {
      setControlValue(container.querySelector('#sk-playhead'), contactMidPercent);
    });

    expect(container.querySelector('#sk-phase-insight')?.textContent)
      .toContain('board stays on the deck');
    expect(container.querySelector('#sk-phase-insight')?.textContent)
      .toContain('center of mass has moved');
    expect(container.querySelector('.sk-live-telemetry')?.textContent)
      .toContain('COM ↓');
    expect(container.querySelector('.sk-live-telemetry')?.getAttribute('aria-label'))
      .toContain('board supported at deck height');
    expect(container.querySelector('.sk-live-telemetry')?.getAttribute('aria-label'))
      .toContain('center-of-mass compression');
    expect(container.querySelector('.sk-live-telemetry')?.getAttribute('aria-label'))
      .toContain('net vertical impulse delivered');
    expect(container.querySelector('#sk-canvas-summary')?.textContent)
      .toContain('cyan COM marker');
    expect(container.querySelector('#sk-canvas-summary')?.textContent)
      .toContain('green marks the moving board-support point');
    expect(contextCalls.some((ctx) => ctx.fillText.mock.calls.some(
      ([text]) => String(text).startsWith('COM ↓'),
    ))).toBe(true);

    const landingCompression = container.querySelector('#sk-landing-compression');
    await act(async () => {
      setControlValue(landingCompression, 0.8);
    });

    expect(container.querySelector('.sk-trace-previous')).not.toBeNull();
    expect(container.querySelector('.sk-stage-legend')?.textContent)
      .toContain('lavender dashed = previous run');
    expect(container.querySelector('#sk-canvas-summary')?.textContent)
      .toContain('One-variable prediction: Landing absorption increased');

    await act(async () => {
      launch.click();
    });

    expect(container.querySelectorAll('.sk-table tbody tr')).toHaveLength(2);
    expect(container.querySelector('.sk-trace-previous')).not.toBeNull();
    expect(container.querySelector('#sk-canvas-summary')?.textContent)
      .toContain('One-variable result: Landing absorption increased');
  });

  it('pauses and resumes a live animation without advancing during the pause or logging twice', async () => {
    window.matchMedia = vi.fn(() => ({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    let nextFrameId = 0;
    const queuedFrames = new Map();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      nextFrameId += 1;
      queuedFrames.set(nextFrameId, callback);
      return nextFrameId;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((frameId) => {
      queuedFrames.delete(frameId);
    });

    function advanceFrame(time) {
      const pending = [...queuedFrames.values()];
      queuedFrames.clear();
      pending.forEach((callback) => callback(time));
    }

    function Host() {
      const [toolData, setToolData] = React.useState(seed());
      return toolConfig.render(makeCtx({ toolData, setToolData }));
    }

    await act(async () => {
      root.render(React.createElement(Host));
    });
    await act(async () => {
      container.querySelector('[data-skatelab-launch="true"]').click();
    });

    expect(container.querySelector('[data-skatelab-playback-toggle="true"]')?.textContent)
      .toBe('Pause motion');
    await act(async () => {
      advanceFrame(100);
      advanceFrame(1200);
    });
    const movingProgress = Number(container.querySelector('#sk-playhead')?.value);
    expect(movingProgress).toBeGreaterThan(0);
    expect(movingProgress).toBeLessThan(100);

    await act(async () => {
      container.querySelector('[data-skatelab-playback-toggle="true"]').click();
    });
    const pausedProgress = container.querySelector('#sk-playhead')?.value;
    expect(container.querySelector('[data-skatelab-playback-toggle="true"]')?.textContent)
      .toBe('Resume motion');
    expect(container.querySelector('[data-skatelab-launch="true"]')?.textContent).toBe('Paused');
    expect(container.querySelector('.sk-status')?.textContent).toContain('Paused at');
    await act(async () => {
      advanceFrame(9000);
    });
    expect(container.querySelector('#sk-playhead')?.value).toBe(pausedProgress);

    await act(async () => {
      container.querySelector('[data-skatelab-playback-toggle="true"]').click();
    });
    await act(async () => {
      advanceFrame(9000);
    });
    expect(container.querySelector('#sk-playhead')?.value).toBe(pausedProgress);
    await act(async () => {
      advanceFrame(15000);
    });

    expect(container.querySelector('#sk-playhead')?.value).toBe('100');
    expect(container.querySelector('[data-skatelab-playback-toggle="true"]')).toBeNull();
    expect(container.querySelectorAll('.sk-table tbody tr')).toHaveLength(1);
  });

  it('uses the measured narrow canvas box without stretching a forced minimum coordinate space', async () => {
    HTMLCanvasElement.prototype.getBoundingClientRect.mockReturnValue({
      width: 278,
      height: 278,
      top: 0,
      left: 0,
      right: 278,
      bottom: 278,
    });

    function Host() {
      const [toolData, setToolData] = React.useState(seed());
      return toolConfig.render(makeCtx({ toolData, setToolData }));
    }

    await act(async () => {
      root.render(React.createElement(Host));
    });

    const canvas = container.querySelector('canvas');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    expect(canvas.width).toBe(Math.round(278 * dpr));
    expect(canvas.height).toBe(Math.round(278 * dpr));
    expect(contextCalls.some((ctx) => ctx.fillText.mock.calls.length > 0)).toBe(true);
  });
});
