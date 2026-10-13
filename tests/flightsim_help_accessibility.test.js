import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host, root, latest, setData, cockpit, frameCallback, fullscreen, errors;
const hooks = () => window.__testHooks.flightSim;
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent === text);
const help = () => host.querySelector('[data-flightsim-help]');
function press(target, key) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  target.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }));
  return event;
}
async function frame() {
  expect(frameCallback).toBeTypeOf('function');
  await act(async () => { vi.advanceTimersByTime(34); frameCallback(); });
  expect(errors).not.toHaveBeenCalled();
}
async function openHelp() {
  await act(async () => { button('Controls and help').click(); });
  expect(help()).toBeTruthy();
}

beforeEach(async () => {
  vi.useFakeTimers();
  resetStemLab();
  window.__testHooks = {};
  const tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  fullscreen = null;
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fullscreen });
  Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: vi.fn(() => {
    fullscreen = null;
    return Promise.resolve();
  }) });
  const context = new Proxy({
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  }, {
    get(target, property) { return property in target ? target[property] : () => {}; },
    set(target, property, value) { target[property] = value; return true; },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  frameCallback = null;
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => {
    if (callback.name === 'loop') frameCallback = callback;
    return 1;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, updateData] = React.useState({ flightSim: { view: 'menu', railCollapsed: false,
      takeoffTutorialDismissed: true, landingTutorialDismissed: true } });
    latest = data.flightSim;
    setData = updateData;
    return tool.render(makeCtx({ toolData: data, setToolData: updateData,
      update: (id, key, value) => updateData(previous => ({ ...previous, [id]: { ...previous[id], [key]: value } })),
      updateMulti: (id, patch) => updateData(previous => ({ ...previous, [id]: { ...previous[id], ...patch } })),
    }));
  }
  await act(async () => { root.render(React.createElement(App)); });
  await act(async () => { host.querySelector('button[aria-label="Free Flight from Portland, ME"]').click(); });
  cockpit = host.querySelector('canvas[role="application"]');
  cockpit.focus();
});

afterEach(async () => {
  fullscreen = null;
  if (root) await act(async () => { root.unmount(); });
  host?.remove();
  root = null;
  delete document.fullscreenElement;
  delete document.exitFullscreen;
  delete window.__testHooks;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('Accessible flight controls reference', () => {
  it('provides readable controls and a focused close button without advancing flight', async () => {
    await frame();
    const initialTime = hooks().timeRef.current;
    const initialState = { ...hooks().flightRef.current };
    await openHelp();
    expect(help().getAttribute('role')).toBe('region');
    expect(help().getAttribute('aria-labelledby')).toBe('skyschool-help-title');
    expect(help().textContent).toContain('Touch controls');
    expect(help().textContent).toContain('far right edge');
    expect(help().textContent).toContain('critical angle of attack');
    expect(help().textContent).toContain('1–4');
    expect(document.activeElement).toBe(button('Close help'));
    expect(hooks().pausedRef.current).toBe(true);
    await frame();
    await frame();
    expect(hooks().timeRef.current).toBe(initialTime);
    expect(hooks().flightRef.current).toEqual(initialState);
    expect(latest.view).toBe('flying');
    expect(latest.lastDebrief).toBeUndefined();
    await act(async () => { button('Close help').click(); });
    expect(help()).toBeNull();
    expect(hooks().pausedRef.current).toBe(false);
    expect(document.activeElement).toBe(cockpit);
    await frame();
    expect(hooks().timeRef.current).toBeGreaterThan(initialTime);
  });

  it('opens with a fast help-key tap even in a held paused frame and preserves the original pause', async () => {
    await act(async () => { host.querySelector('button[aria-label="Pause flight"]').click(); });
    await frame();
    await frame();
    cockpit.focus();
    press(cockpit, '?');
    await frame();
    expect(help()).toBeTruthy();
    expect(document.activeElement).toBe(button('Close help'));
    await act(async () => { press(button('Close help'), 'Escape'); });
    expect(help()).toBeNull();
    expect(latest.view).toBe('flying');
    expect(hooks().pausedRef.current).toBe(true);
    expect(document.activeElement).toBe(cockpit);
    press(cockpit, 'Escape');
    await frame();
    expect(latest.view).toBe('debrief');
  });

  it('Escape closes help before an active geography quiz or the flight', async () => {
    cockpit.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', bubbles: true, cancelable: true }));
    await frame();
    cockpit.dispatchEvent(new KeyboardEvent('keyup', { key: 'q', bubbles: true, cancelable: true }));
    await openHelp();
    let escape;
    await act(async () => { escape = press(button('Close help'), 'Escape'); });
    expect(escape.defaultPrevented).toBe(true);
    expect(help()).toBeNull();
    expect(latest.view).toBe('flying');
    expect(latest.lastDebrief).toBeUndefined();
    press(cockpit, 'Escape');
    await frame();
    expect(latest.view).toBe('flying');
    press(cockpit, 'Escape');
    await frame();
    expect(latest.view).toBe('debrief');
  });

  it('leaves fullscreen first, then closes help, and returns to the cockpit', async () => {
    await openHelp();
    fullscreen = host;
    await act(async () => { press(button('Close help'), 'Escape'); });
    expect(document.exitFullscreen).toHaveBeenCalledOnce();
    expect(help()).toBeTruthy();
    expect(latest.view).toBe('flying');
    await act(async () => { press(button('Close help'), 'Escape'); });
    expect(help()).toBeNull();
    expect(document.activeElement).toBe(cockpit);
    expect(latest.view).toBe('flying');
  });

  it('clears a stale open-help flag when a fresh challenge starts', async () => {
    await openHelp();
    await act(async () => { setData(previous => ({ ...previous, flightSim: { ...previous.flightSim, view: 'menu' } })); });
    await act(async () => { hooks().startFlightChallenge('first_flight'); });
    expect(latest.showHelp).toBe(false);
    expect(help()).toBeNull();
    expect(hooks().pausedRef.current).toBe(false);
    expect(host.querySelector('[data-flightsim-command-rail]')).toBeTruthy();
  });

  it('uses rotorcraft yaw instructions instead of the fixed-wing quiz shortcut', async () => {
    await act(async () => { setData(previous => ({ ...previous, flightSim: { ...previous.flightSim, aircraft: 'rescue_heli' } })); });
    await openHelp();
    expect(help().textContent).toContain('Hold to turn the nose left or right');
    expect(help().textContent).not.toContain('Open a geography quiz');
    expect(help().textContent).not.toContain('critical angle of attack');
  });
});
