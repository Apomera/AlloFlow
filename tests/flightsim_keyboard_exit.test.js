import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host, root, latest, cockpit, frameCallback, canvasContext, consoleError, fullscreen;
const hooks = () => window.__testHooks.flightSim;

function press(key, target = cockpit) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}
function release(key) {
  cockpit.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }));
}
async function frame() {
  expect(frameCallback, 'The production simulation RAF must be scheduled').toBeTypeOf('function');
  await act(async () => { frameCallback(); });
  expect(consoleError).not.toHaveBeenCalled();
}
const quiz = () => host.querySelector('[data-flight-geography-quiz]');

beforeEach(async () => {
  vi.useFakeTimers();
  resetStemLab();
  window.__testHooks = {};
  const tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  fullscreen = null;
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fullscreen });
  Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: vi.fn(() => {
    fullscreen = null;
    return Promise.resolve();
  }) });
  canvasContext = new Proxy({
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    fillText: vi.fn(),
  }, {
    get(target, property) { return property in target ? target[property] : () => {}; },
    set(target, property, value) { target[property] = value; return true; },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContext);
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
    return tool.render(makeCtx({
      toolData: data,
      setToolData: updateData,
      update: (id, key, value) => updateData(previous => ({ ...previous, [id]: { ...previous[id], [key]: value } })),
      updateMulti: (id, patch) => updateData(previous => ({ ...previous, [id]: { ...previous[id], ...patch } })),
    }));
  }
  await act(async () => { root.render(React.createElement(App)); });
  await act(async () => { host.querySelector('button[aria-label="Free Flight from Portland, ME"]').click(); });
  cockpit = host.querySelector('canvas[role="application"]');
  expect(cockpit).toBeTruthy();
  cockpit.focus();
});

afterEach(async () => {
  fullscreen = null;
  if (root) await act(async () => { root.unmount(); });
  root = null;
  if (host) host.remove();
  host = null;
  delete document.fullscreenElement;
  delete document.exitFullscreen;
  delete window.__testHooks;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('SkySchool Escape through the simulation RAF', () => {
  it('ends an active flight through the normal debrief action', async () => {
    expect(hooks().flyingRef.current).toBe(true);
    expect(press('Escape').defaultPrevented).toBe(true);
    release('Escape');
    await frame();
    expect(latest.view).toBe('debrief');
    expect(latest.lastDebrief).toMatchObject({ airborneSeconds: 0, flightTime: 0, landings: 0 });
    expect(hooks().flyingRef.current).toBe(false);
    expect(hooks().keysRef.current).toEqual({});
  });

  it('exits a held paused frame without requiring the flight to resume', async () => {
    const pause = host.querySelector('button[aria-label="Pause flight"]');
    await act(async () => { pause.click(); });
    expect(hooks().pausedRef.current).toBe(true);
    await frame();
    const pausedTime = hooks().timeRef.current;
    await frame(); // Exercise the held-frame early return before sending Esc.
    expect(hooks().timeRef.current).toBe(pausedTime);
    cockpit.focus();
    press('Escape');
    release('Escape');
    await frame();
    expect(latest.view).toBe('debrief');
    expect(latest.lastDebrief.sessionTime).toBe(Math.round(pausedTime));
    expect(hooks().flyingRef.current).toBe(false);
  });

  it('closes an active geography quiz while keeping the flight running', async () => {
    press('q');
    await frame();
    release('q');
    expect(quiz()).toBeTruthy();
    expect(document.activeElement).toBe(quiz().querySelector('#skyschool-geoq-question'));
    await act(async () => { press('Escape', document.activeElement); });
    await frame();
    expect(latest.view).toBe('flying');
    expect(hooks().flyingRef.current).toBe(true);
    expect(quiz()).toBeNull();
    expect(latest.lastDebrief).toBeUndefined();
  });

  it('leaves fullscreen on the first Escape and ends flight only on a later Escape', async () => {
    fullscreen = host;
    press('Escape');
    release('Escape');
    expect(document.exitFullscreen).toHaveBeenCalledOnce();
    expect(hooks().keysRef.current.escape).toBe(false);
    await frame();
    expect(latest.view).toBe('flying');
    expect(hooks().flyingRef.current).toBe(true);
    expect(fullscreen).toBeNull();
    press('Escape');
    release('Escape');
    await frame();
    expect(latest.view).toBe('debrief');
  });
});
