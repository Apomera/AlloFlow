import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host, root, latest, frameCallback, wallTime, fullscreenHelper;
const hooks = () => window.__testHooks.flightSim;
const deck = () => host.querySelector('#skyschool-flight-container');
const cockpit = () => host.querySelector('canvas[role="application"]');
const help = () => host.querySelector('[data-flightsim-help]');

// Exercise the actual shared helper and its document Escape listener: a stub
// which only toggles the marker would miss the original event-ordering bug.
function loadSharedFullscreen() {
  const source = readFileSync('stem_lab/stem_lab_module.js', 'utf8');
  const start = source.indexOf('var _stemFsProps =');
  const end = source.indexOf('// Fullscreen button binder', start);
  const segment = source.slice(start, end);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  new Function('window', 'document', segment.slice(0, segment.lastIndexOf('};') + 2))(window, document);
}
async function click(node) {
  expect(node).toBeTruthy();
  await act(async () => { node.focus(); node.click(); });
}
async function escape(target = cockpit()) {
  await act(async () => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    target.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true, cancelable: true }));
  });
}
async function frame() {
  expect(frameCallback).toBeTypeOf('function');
  await act(async () => { wallTime += 1000 / 60; frameCallback(); });
}

beforeEach(async () => {
  vi.useFakeTimers(); resetStemLab(); window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
  const tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  const FS = window.__RR_TEST_EXPORTS__.flightSim;
  fullscreenHelper = window.__alloStemFS;
  delete window.__alloStemFS;
  loadSharedFullscreen();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const gfx = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
  }, { get: (target, name) => name in target ? target[name] : () => {}, set: (target, name, value) => { target[name] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(gfx);
  wallTime = 1000; vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  frameCallback = null;
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => { if (callback.name === 'loop') frameCallback = callback; return 1; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', railCollapsed: false,
      takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(FS.ACHIEVEMENTS.map(item => [item.id, true])) } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
  await click(host.querySelector('[aria-label="Free Flight from Portland, ME"]'));
  vi.spyOn(FS.Physics, 'step').mockImplementation(state => ({ ...state,
    forces: { lift: 2550, thrust: 200, drag: 200, weight: 2550, normal: 2550 } }));
});
afterEach(async () => {
  const stage = deck();
  if (stage?.hasAttribute('data-allo-fullscreen-active')) window.__alloStemFS(stage);
  if (root) await act(async () => root.unmount()); root = null; host?.remove();
  if (fullscreenHelper) window.__alloStemFS = fullscreenHelper; else delete window.__alloStemFS;
  delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('SkySchool fullscreen Escape ownership', () => {
  it('leaves CSS fullscreen on the first Escape and ends flight only on a later Escape', async () => {
    await click(host.querySelector('[data-flight-fullscreen]'));
    expect(deck().getAttribute('data-allo-fullscreen-active')).toBe('true');
    const flight = { ...hooks().flightRef.current };
    cockpit().focus();
    await escape(); await frame();
    expect(deck()).toBeTruthy();
    expect(deck().hasAttribute('data-allo-fullscreen-active')).toBe(false);
    expect(latest.view).toBe('flying');
    expect(latest.lastDebrief).toBeUndefined();
    expect(hooks().flightRef.current).toMatchObject({ lat: flight.lat, lon: flight.lon, altitude: flight.altitude });
    expect(hooks().keysRef.current.escape).toBe(false);
    await escape(); await frame();
    expect(latest.view).toBe('debrief');
  });

  it('exits fullscreen before dismissing Help and keeps the flight paused', async () => {
    await click(host.querySelector('[data-flight-fullscreen]'));
    await click([...host.querySelectorAll('button')].find(item => item.textContent.trim() === 'Controls and help'));
    const close = host.querySelector('#skyschool-close-help');
    await escape(close); await frame();
    expect(deck().hasAttribute('data-allo-fullscreen-active')).toBe(false);
    expect(help()).toBeTruthy();
    expect(hooks().pausedRef.current).toBe(true);
    expect(document.activeElement).toBe(close);
    await escape(close);
    expect(help()).toBeNull();
    expect(latest.view).toBe('flying');
  });

  it.each(['standard', 'webkit'])('exits %s fullscreen before an Escape can latch a flight exit', async mode => {
    const property = mode === 'standard' ? 'fullscreenElement' : 'webkitFullscreenElement';
    const method = mode === 'standard' ? 'exitFullscreen' : 'webkitExitFullscreen';
    const previousProperty = Object.getOwnPropertyDescriptor(document, property);
    const previousMethod = Object.getOwnPropertyDescriptor(document, method);
    let active = deck();
    const exit = vi.fn(() => { active = null; document.dispatchEvent(new Event(mode === 'standard' ? 'fullscreenchange' : 'webkitfullscreenchange')); });
    Object.defineProperty(document, property, { configurable: true, get: () => active });
    Object.defineProperty(document, method, { configurable: true, value: exit });
    try {
      cockpit().focus(); await escape(); await frame();
      expect(exit).toHaveBeenCalledOnce();
      expect(latest.view).toBe('flying');
      expect(hooks().keysRef.current.escape).toBe(false);
    } finally {
      if (previousProperty) Object.defineProperty(document, property, previousProperty); else delete document[property];
      if (previousMethod) Object.defineProperty(document, method, previousMethod); else delete document[method];
    }
  });
});
