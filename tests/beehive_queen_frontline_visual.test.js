import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Beehive Queen abstract game-score feedback', () => {
  let host;
  let root;
  let config;
  let originalRaf;
  let originalCancelRaf;

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

  it('labels the quantified game score without implying land ownership', async () => {
    const Component = () => React.createElement(() => config.render(makeCtx({
      toolData: { beehive: {
        viewMode: 'queen',
        queen: {
          active: true,
          paused: true,
          territory: 68,
          hiveHealth: 91,
          rival: { name: 'Thistle Crown', health: 74, strength: 360, stores: 35, structures: 3, pressure: 64, intel: 0 }
        }
      } },
      setToolData: vi.fn()
    })));

    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });

    const card = host.querySelector('[data-beehive-frontline-card="true"]');
    expect(card).toBeTruthy();
    expect(card.textContent).toContain('RTS advantage');
    expect(card.textContent).toContain('68/100');
    expect(card.textContent).toContain('Advantage');
    expect(card.textContent).toContain('Game score, not land ownership.');
    expect(card.querySelector('[data-frontline-side="colony"]').style.width).toBe('68%');
    expect(card.querySelector('[data-frontline-side="rival"]').style.width).toBe('32%');

    const playfield = host.querySelector('#beehive-queen-playfield');
    expect(playfield.getAttribute('aria-label')).toContain('your colony 68 out of 100');
    expect(host.querySelector('[data-beehive-frontline-summary="true"]').textContent).toContain('68 out of 100');
  });
});
