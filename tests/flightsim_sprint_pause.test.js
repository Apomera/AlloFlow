import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let tool, FS, host, root, latest, frameCallback, wallTime;
const hooks = () => window.__testHooks.flightSim;

async function mount() {
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', railCollapsed: false, menuSections: { sprints: true } } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
  const route = FS.SPRINT_ROUTES[0];
  const launch = [...host.querySelectorAll('#skyschool-sec-sprints button')].find(item => item.textContent.includes(route.name));
  expect(launch).toBeTruthy();
  await act(async () => launch.click());
}
async function frame(elapsed = 16) {
  wallTime += elapsed;
  expect(frameCallback).toBeTypeOf('function');
  await act(async () => frameCallback());
}
async function press(key) {
  const cockpit = host.querySelector('canvas[role="application"]');
  cockpit.focus();
  cockpit.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  cockpit.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }));
  await frame();
}
beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); FS = window.__RR_TEST_EXPORTS__.flightSim;
  const context = new Proxy({
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  }, { get: (target, property) => property in target ? target[property] : () => {}, set: (target, property, value) => { target[property] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  wallTime = 1000; vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  frameCallback = null;
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => { if (callback.name === 'loop') frameCallback = callback; return 1; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('SkySchool active sprint keyboard pause', () => {
  it.each([' ', 'Spacebar'])('pauses an active sprint with %j and resumes its clock and position', async key => {
    await mount(); await frame(); await frame(100);
    const sprint = hooks().getSprintRef().current;
    expect(sprint.active).toBe(true);
    await press(key);
    expect(hooks().pausedRef.current).toBe(true);
    expect(host.querySelector('button[aria-label="Resume flight"]')).toBeTruthy();
    const frozenTime = hooks().timeRef.current, frozenTimer = sprint.timer;
    const frozenFlight = { ...hooks().flightRef.current };
    for (let index = 0; index < 3; index++) await frame(1000);
    expect(hooks().timeRef.current).toBe(frozenTime);
    expect(sprint.timer).toBe(frozenTimer);
    expect(hooks().flightRef.current).toMatchObject({ lat: frozenFlight.lat, lon: frozenFlight.lon, altitude: frozenFlight.altitude });
    expect(latest.lastDebrief).toBeUndefined();
    await press(key);
    expect(hooks().pausedRef.current).toBe(false);
    expect(host.querySelector('button[aria-label="Pause flight"]')).toBeTruthy();
    await frame(100);
    expect(hooks().timeRef.current).toBeGreaterThan(frozenTime);
    expect(sprint.timer).toBeLessThan(frozenTimer);
    expect(hooks().flightRef.current.lon).not.toBe(frozenFlight.lon);
    expect(sprint.active).toBe(true);
  });

  it('does not replay an unfinished paused sprint or consume Space on its buttons', async () => {
    await mount(); await frame();
    await press(' ');
    const route = hooks().getSprintRef().current.route;
    const resume = host.querySelector('button[aria-label="Resume flight"]'); resume.focus();
    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    resume.dispatchEvent(event);
    await frame(100);
    expect(event.defaultPrevented).toBe(false);
    expect(hooks().pausedRef.current).toBe(true);
    expect(hooks().getSprintRef().current.route).toBe(route);
    expect(latest.lastDebrief).toBeUndefined();
  });
});
