import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Beehive Queen mode - real-time RTS behavior', () => {
  let host;
  let root;
  let latest;
  let config;
  let originalRaf;
  let originalCancelRaf;

  async function mountQueen(overrides = {}) {
    const initialQueen = Object.assign({
      active: true,
      paused: false,
      speed: 1,
      day: 0,
      hiveHealth: 100,
      territory: 50,
      rival: { name: 'Thistle Crown', health: 100, strength: 360, stores: 35, structures: 3, pressure: 10, intel: 0 },
    }, overrides);
    const Component = () => {
      const [toolData, setToolData] = React.useState({ beehive: { viewMode: 'queen', queen: initialQueen } });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    };
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    resetStemLab();
    config = loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ setTransform: vi.fn() });
    originalRaf = globalThis.requestAnimationFrame;
    originalCancelRaf = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = vi.fn(() => 1);
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = vi.fn();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    globalThis.requestAnimationFrame = window.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = originalCancelRaf;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('advances economy and rival AI automatically at 1x speed', async () => {
    await mountQueen();
    expect(latest.beehive.queen.day).toBe(0);

    await act(async () => { vi.advanceTimersByTime(2450); await Promise.resolve(); });

    expect(latest.beehive.queen.day).toBe(1);
    expect(latest.beehive.queen.rival.strength).toBeGreaterThan(360);
    expect(latest.beehive.queen.feedback.text).toContain('Cycle 1');
    expect(host.textContent).toContain('Cycle 1');
  });

  it('stops simulation cycles while paused', async () => {
    await mountQueen({ paused: true });
    await act(async () => { vi.advanceTimersByTime(7200); await Promise.resolve(); });

    expect(latest.beehive.queen.day).toBe(0);
    expect(host.textContent).toContain('PAUSED');
  });

  it('uses structure selection plus a battlefield click for direct building', async () => {
    await mountQueen({ paused: true });
    const guardButton = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Guard Post'));
    expect(guardButton).toBeTruthy();

    await act(async () => { guardButton.click(); await Promise.resolve(); });
    expect(latest.beehive.queen.buildMode).toBe('guard');

    const canvas = host.querySelector('[data-beehive-queen-canvas="true"]');
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 500, height: 400, right: 500, bottom: 400, x: 0, y: 0, toJSON() {} });
    await act(async () => {
      canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 150, clientY: 180 }));
      await Promise.resolve();
    });

    expect(latest.beehive.queen.structures).toHaveLength(4);
    expect(latest.beehive.queen.structures.at(-1).type).toBe('guard');
    expect(latest.beehive.queen.structures.at(-1).x).toBeCloseTo(0.3);
    expect(latest.beehive.queen.buildMode).toBeNull();
    expect(latest.beehive.queen.feedback.text).toContain('Guard Post online');
  });
});