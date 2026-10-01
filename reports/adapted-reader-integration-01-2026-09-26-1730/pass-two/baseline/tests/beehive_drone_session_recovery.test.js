import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Beehive Drone runtime session recovery', () => {
  let config;
  let host;
  let root;
  let latest;
  let setLatest;

  async function mount(initialBeehive) {
    const Component = () => {
      const [toolData, setToolData] = React.useState({ beehive: initialBeehive });
      latest = toolData;
      setLatest = setToolData;
      return config.render(makeCtx({ toolData, setToolData }));
    };
    await act(async () => {
      root.render(React.createElement(Component));
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  beforeEach(() => {
    resetStemLab();
    config = loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    host?.remove();
    vi.restoreAllMocks();
  });

  it('normalizes an initially persisted active flight to interrupted preflight', async () => {
    const lastRun = { score: 275, success: true, difficulty: 'hard' };
    await mount({
      viewMode: 'drone',
      drone: { active: true, paused: true, difficulty: 'hard', highScore: 410, attempts: 3, lastRun },
    });

    expect(latest.beehive.drone).toMatchObject({
      active: false,
      paused: false,
      interrupted: true,
      difficulty: 'hard',
      highScore: 410,
      attempts: 3,
      lastRun,
    });
    expect(host.querySelector('[data-beehive-stage="drone-briefing"]')).toBeTruthy();
    expect(host.querySelector('[data-beehive-drone-canvas="true"]')).toBeNull();
  });

  it('normalizes an active flight payload hydrated after mount without losing durable results', async () => {
    await mount({
      viewMode: 'drone',
      drone: { active: false, difficulty: 'normal', highScore: 120, attempts: 1 },
    });
    const hydratedRun = { score: 360, success: false, difficulty: 'normal' };

    await act(async () => {
      setLatest((prev) => ({
        ...prev,
        beehive: {
          ...prev.beehive,
          drone: {
            active: true,
            paused: true,
            difficulty: 'normal',
            highScore: 360,
            attempts: 2,
            lastRun: hydratedRun,
          },
        },
      }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(latest.beehive.drone).toMatchObject({
      active: false,
      paused: false,
      interrupted: true,
      difficulty: 'normal',
      highScore: 360,
      attempts: 2,
      lastRun: hydratedRun,
    });
    expect(host.querySelector('[data-beehive-stage="drone-briefing"]')).toBeTruthy();
    expect(host.querySelector('[data-beehive-drone-canvas="true"]')).toBeNull();
  });

  it('clears the interrupted marker when a fresh flight launches', async () => {
    const originalRaf = globalThis.requestAnimationFrame;
    const originalCancelRaf = globalThis.cancelAnimationFrame;
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ setTransform: vi.fn() });
    globalThis.requestAnimationFrame = window.requestAnimationFrame = vi.fn(() => 1);
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = vi.fn();

    try {
      await mount({
        viewMode: 'drone',
        drone: { active: false, paused: false, interrupted: true, difficulty: 'easy', highScore: 410 },
      });
      const launch = host.querySelector('[data-mobile-rail=drone-difficulty] button');
      expect(launch).toBeTruthy();

      await act(async () => {
        launch.click();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(latest.beehive.drone).toMatchObject({
        active: true,
        paused: false,
        interrupted: false,
        difficulty: 'easy',
        highScore: 410,
      });
      expect(host.querySelector('[data-beehive-drone-canvas]')).toBeTruthy();
    } finally {
      globalThis.requestAnimationFrame = window.requestAnimationFrame = originalRaf;
      globalThis.cancelAnimationFrame = window.cancelAnimationFrame = originalCancelRaf;
    }
  });
});