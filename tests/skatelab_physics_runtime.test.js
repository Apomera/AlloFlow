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
    expect(container.querySelector('.sk-live-telemetry')?.getAttribute('aria-label')).toContain('Live motion telemetry');

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
    expect(container.querySelector('#sk-wind-cross_right')).not.toBeNull();
    expect(container.textContent).toContain('Landing angle');
    expect(container.textContent).toContain('Lateral drift');
    expect(container.textContent).toContain('Landing load');
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
    expect(contextCalls.some((ctx) => ctx.fillText.mock.calls.length > 0)).toBe(true);
  });
});

