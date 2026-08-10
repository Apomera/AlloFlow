import { vi } from 'vitest';
import { React, ReactDOMClient, makeCtx } from './stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

export async function mountStartedDrone(config, { paused = true } = {}) {
  const originalRaf = globalThis.requestAnimationFrame;
  const originalCancelRaf = globalThis.cancelAnimationFrame;
  const originalMatchMedia = window.matchMedia;
  window.matchMedia = vi.fn(() => ({
    matches: false,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

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
  const getContextSpy = vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  globalThis.requestAnimationFrame = window.requestAnimationFrame = vi.fn(() => 1);
  globalThis.cancelAnimationFrame = window.cancelAnimationFrame = vi.fn();

  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  let latest;
  const Component = () => {
    const [toolData, setToolData] = React.useState({
      beehive: { viewMode: 'drone', drone: { active: false, difficulty: 'easy' } },
    });
    latest = toolData;
    return config.render(makeCtx({ toolData, setToolData }));
  };

  try {
    await act(async () => {
      root.render(React.createElement(Component));
      await Promise.resolve();
    });
    const launch = host.querySelector('[data-mobile-rail="drone-difficulty"] button');
    if (!launch) throw new Error('Drone runtime harness could not find a difficulty launch button');
    await act(async () => {
      launch.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    if (paused) {
      const pause = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Pause flight'));
      if (!pause) throw new Error('Drone runtime harness could not find the pause control after launch');
      await act(async () => {
        pause.click();
        await Promise.resolve();
      });
    }
  } catch (error) {
    act(() => root.unmount());
    host.remove();
    getContextSpy.mockRestore();
    window.matchMedia = originalMatchMedia;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = originalCancelRaf;
    throw error;
  }

  return {
    host,
    context,
    get latest() { return latest; },
    cleanup() {
      act(() => root.unmount());
      host.remove();
      getContextSpy.mockRestore();
      window.matchMedia = originalMatchMedia;
      globalThis.requestAnimationFrame = window.requestAnimationFrame = originalRaf;
      globalThis.cancelAnimationFrame = window.cancelAnimationFrame = originalCancelRaf;
    },
  };
}