import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Beehive evidence handoff actions', () => {
  let host;
  let root;
  let config;
  let latest;
  let originalRaf;
  let originalCancelRaf;

  beforeEach(() => {
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
    host?.remove();
    globalThis.requestAnimationFrame = window.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = originalCancelRaf;
    vi.restoreAllMocks();
  });

  it('moves from Beekeeper to Queen to Drone and then opens the Notebook', async () => {
    const Component = () => {
      const [toolData, setToolData] = React.useState({ beehive: { viewMode: 'beekeeper', beeView: 'scene', day: 12, journeyOpen: true } });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    };

    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });

    let action = host.querySelector('[data-beehive-handoff-action="beekeeper"]');
    expect(action).toBeTruthy();
    expect(action.textContent).toContain('Open Queen RTS');
    expect(action.getAttribute('aria-label')).toContain('field report to command map');
    await act(async () => { action.click(); await Promise.resolve(); });
    expect(latest.beehive.viewMode).toBe('queen');

    action = host.querySelector('[data-beehive-handoff-action="queen"]');
    expect(action.textContent).toContain('Open Drone Flight');
    await act(async () => { action.click(); await Promise.resolve(); });
    expect(latest.beehive.viewMode).toBe('drone');

    action = host.querySelector('[data-beehive-handoff-action="drone"]');
    expect(action.textContent).toContain('Open Science Notebook');
    await act(async () => { action.click(); await Promise.resolve(); });
    expect(latest.beehive.notebookOpen).toBe(true);
  });
});
