import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Beehive Drone measurement-driven coaching', () => {
  let host;
  let root;
  let latest;
  let config;
  let rafQueue;
  let originalRaf;
  let originalCancelRaf;

  async function stepFrame(offset = 16) {
    const callback = rafQueue.shift();
    expect(callback).toBeTypeOf('function');
    await act(async () => {
      callback(performance.now() + offset);
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  beforeEach(() => {
    resetStemLab();
    config = loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
    window.__testHooks = {};
    const gradient = { addColorStop: vi.fn() };
    const context = new Proxy({
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      measureText: vi.fn((text) => ({ width: String(text).length * 6 })),
      createLinearGradient: vi.fn(() => gradient),
      createRadialGradient: vi.fn(() => gradient),
    }, {
      get(target, property) {
        if (property in target) return target[property];
        target[property] = vi.fn();
        return target[property];
      },
      set(target, property, value) { target[property] = value; return true; },
    });
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    rafQueue = [];
    originalRaf = globalThis.requestAnimationFrame;
    originalCancelRaf = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = vi.fn((callback) => {
      rafQueue.push(callback);
      return rafQueue.length;
    });
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = vi.fn();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    host?.remove();
    globalThis.requestAnimationFrame = window.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = originalCancelRaf;
    delete window.__testHooks;
    vi.restoreAllMocks();
  });

  it('turns finished telemetry into a prioritized and actionable retry plan', async () => {
    const Component = () => {
      const [toolData, setToolData] = React.useState({
        beehive: { viewMode: 'drone', drone: { active: false, difficulty: 'easy' } },
      });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    };
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
    const launch = host.querySelector('[data-mobile-rail="drone-difficulty"] button');
    await act(async () => { launch.click(); await Promise.resolve(); await Promise.resolve(); });

    const state = window.__testHooks.beehive.droneStateRef.current;
    state.phase = 'end';
    state.energy = 4;
    state.maxAlt = 68;
    state.distance = 420;
    state.reachedDca = false;
    state.obstacleHits = 1;
    state.trafficHits = 1;
    state.nectarCollected = 3;
    state.nectarGoal = 8;
    await stepFrame();

    const coach = host.querySelector('[data-drone-debrief-coach="energy-budget"]');
    expect(coach).toBeTruthy();
    expect(coach.textContent).toContain('Energy was the limiting factor');
    expect(coach.textContent).toContain('Boost-first');
    expect(coach.querySelectorAll('[data-drone-coach-evidence]')).toHaveLength(3);
    expect(host.querySelector('[data-drone-colony-consequence="true"]').textContent).toContain('without a mating contribution');

    const retry = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Apply plan & fly again'));
    expect(retry).toBeTruthy();
    await act(async () => { retry.click(); await Promise.resolve(); await Promise.resolve(); });
    expect(latest.beehive.drone.routePlan).toBe('boost-first');
    expect(latest.beehive.drone.active).toBe(true);
  });
});
