import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let tool, FS, root, host, latest, patch, frameCallback, wallTime, errors;
const hooks = () => window.__testHooks.flightSim;
const cockpit = () => host.querySelector('canvas[role="application"]');
const readButton = () => host.querySelector('[data-flight-read-status]');
const snapshot = () => host.querySelector('[data-flight-status-snapshot]');
const snapshotText = () => host.querySelector('[data-flight-status-text]')?.textContent || '';
const live = () => document.getElementById('skyschool-a11y-live');
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text);
const labelledButton = text => host.querySelector(`button[aria-label="${text}"]`);
const props = node => node[Object.keys(node).find(key => key.startsWith('__reactProps$'))];
const retain = node => {
  expect(node).toBeTruthy();
  const handler = props(node).onClick;
  return () => handler({ currentTarget: node, target: node, preventDefault() {}, stopPropagation() {} });
};
function loadFlightTool() {
  if (!process.env.SKYSCHOOL_STATUS_SOURCE) return loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  new Function(readFileSync(resolve(process.cwd(), 'stem_lab/stem_data_skyschool_geo.js'), 'utf8'))();
  new Function(readFileSync(resolve(process.cwd(), process.env.SKYSCHOOL_STATUS_SOURCE), 'utf8'))();
  const loaded = window.StemLab?._registry?.flightSim;
  if (!loaded) throw new Error('Frozen source did not register Sky School');
  return loaded;
}
async function tick(ms = 60) { await act(async () => vi.advanceTimersByTime(ms)); }
async function click(node) {
  expect(node).toBeTruthy();
  await act(async () => { node.focus(); node.click(); });
}
async function frame(ms = 34) {
  wallTime += ms;
  expect(frameCallback).toBeTypeOf('function');
  await act(async () => { frameCallback(); vi.advanceTimersByTime(ms); });
}
async function pressInfo() {
  await act(async () => {
    cockpit().focus();
    cockpit().dispatchEvent(new KeyboardEvent('keydown', { key: 'i', bubbles: true, cancelable: true }));
    cockpit().dispatchEvent(new KeyboardEvent('keyup', { key: 'i', bubbles: true, cancelable: true }));
  });
  await frame(); await tick();
}
async function mount(seed = {}) {
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', aircraft: 'cessna172', railCollapsed: false,
      takeoffTutorialDismissed: true, landingTutorialDismissed: true, menuSections: { sprints: true, challenges: true },
      earnedBadges: Object.fromEntries(FS.ACHIEVEMENTS.map(item => [item.id, true])), ...seed } });
    latest = data.flightSim;
    patch = values => setData(old => ({ ...old, flightSim: { ...old.flightSim, ...values } }));
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, name, value) => setData(old => ({ ...old, [id]: { ...old[id], [name]: value } })),
      updateMulti: (id, values) => setData(old => ({ ...old, [id]: { ...old[id], ...values } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
async function launch(aircraft = 'cessna172') {
  await mount({ aircraft });
  await click(labelledButton('Free Flight from Portland, ME'));
  Object.assign(hooks().flightRef.current, { speed: 120 / 0.5924838, altitude: 8000, fieldElev: 1000,
    vsi: -3, heading: 359.8, onGround: false, stalling: false, lowAirspeed: false, hitCeiling: false, aoa: 2.5 });
  Object.assign(hooks().controlsRef.current, { pitch: 0, bank: 0, throttle: 0.5, yawRate: 0 });
  Object.assign(hooks().getWeatherRef().current, { type: 'clear', wind: 0, turbulence: 0 });
  await tick();
}
async function request() { await click(readButton()); await tick(); return snapshotText(); }

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
  tool = loadFlightTool(); FS = window.__RR_TEST_EXPORTS__.flightSim;
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const gfx = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
  }, { get: (target, key) => key in target ? target[key] : () => {},
    set: (target, key, value) => { target[key] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(gfx);
  // Keep native React events and the real flight loop, but keep aircraft motion
  // deterministic: this suite verifies access to telemetry, not aerodynamics.
  vi.spyOn(FS.Physics, 'step').mockImplementation(state => ({ ...state,
    forces: { lift: 2550, thrust: 200, drag: 200, weight: 2550, normal: 0 } }));
  wallTime = 1000; vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  frameCallback = null;
  vi.stubGlobal('requestAnimationFrame', callback => { if (callback.name === 'loop') frameCallback = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled();
  delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('requested readable flight status', () => {
  it('offers a named native action and quiet snapshot without announcing unsolicited telemetry', async () => {
    await launch();
    expect(readButton()?.tagName).toBe('BUTTON');
    expect(readButton().textContent).toBe('Read flight status');
    expect(readButton().disabled).toBe(false);
    expect(snapshot()?.id).toBe('skyschool-flight-status');
    expect(snapshot().getAttribute('aria-live')).toBe('off');
    expect(snapshot().hidden || snapshotText() === '').toBe(true);
    expect(live().textContent).not.toContain('Altitude 8000');
  });

  it('samples current air data with explicit units, type, AGL, vertical speed and normalized heading', async () => {
    await launch();
    const ac = FS.AIRCRAFT.find(item => item.id === 'cessna172');
    const telemetry = FS.computeFlightTelemetry(hooks().flightRef.current, hooks().controlsRef.current,
      hooks().getWeatherRef().current, 0, 0, null, null, ac);
    const text = await request();
    expect(text).toContain('Altitude 8000 feet above sea level.');
    expect(text).toContain(`Indicated airspeed ${Math.round(telemetry.iasKts)} knots.`);
    expect(text).toContain('Height above ground 7000 feet.');
    expect(text).toContain('Vertical speed -180 feet per minute.');
    expect(text).toContain('Heading 0 degrees.');
    expect(text).toContain('Angle of attack 2.5 degrees.');
    expect(snapshot().hidden).toBe(false);
    expect(live().textContent).toBe(text);
    expect(host.querySelector('[data-flight-status-note]')?.textContent).toMatch(/snapshot/i);
    expect(host.querySelector('[data-flight-status-note]').textContent).toMatch(/pause/i);
    expect(snapshot().getAttribute('role')).not.toBe('status');
  });

  it('keeps requested text frozen until another explicit request', async () => {
    await launch(); const before = await request(), node = snapshot();
    Object.assign(hooks().flightRef.current, { altitude: 9000, vsi: 4 });
    await act(async () => patch({ flightDetails: true }));
    await tick(500);
    expect(snapshot()).toBe(node);
    expect(snapshotText()).toBe(before);
    expect(live().textContent).toBe(before);
    const after = await request();
    expect(after).toContain('Altitude 9000 feet');
    expect(after).toContain('Vertical speed 240 feet per minute.');
    expect(after).not.toBe(before);
  });

  it('uses the same snapshot and announcement for the focused cockpit I shortcut', async () => {
    await launch(); await click(labelledButton('Pause flight'));
    const text = await request();
    await pressInfo();
    expect(snapshotText()).toBe(text);
    expect(live().textContent).toBe(text);
    expect(hooks().keysRef.current.i).toBe(false);
    expect(hooks().pausedRef.current).toBe(true);
  });

  it('reads while paused without moving focus, resuming, changing controls or disengaging assistance', async () => {
    await launch(); await click(labelledButton('Pause flight'));
    await act(async () => patch({ autopilot: { hdg: true, alt: true, spd: true, tgtHdg: 180, tgtAlt: 8000, tgtSpd: 100 } }));
    const controls = { ...hooks().controlsRef.current }, assistance = { ...latest.autopilot };
    await request();
    expect(hooks().pausedRef.current).toBe(true);
    expect(hooks().controlsRef.current).toEqual(controls);
    expect(latest.autopilot).toEqual(assistance);
    expect(document.activeElement).toBe(readButton());
    readButton().dispatchEvent(new KeyboardEvent('keydown', { key: 'i', bubbles: true, cancelable: true }));
    expect(hooks().keysRef.current.i).toBeFalsy();
  });

  it.each(['rescue_heli', 'drone'])('reports ground speed for %s without a fixed-wing AoA claim', async aircraft => {
    await launch(aircraft);
    const ac = FS.AIRCRAFT.find(item => item.id === aircraft);
    const telemetry = FS.computeFlightTelemetry(hooks().flightRef.current, hooks().controlsRef.current,
      hooks().getWeatherRef().current, 0, 0, null, null, ac);
    const text = await request();
    expect(text).toContain(`Ground speed ${Math.round(telemetry.gsKts)} knots.`);
    expect(text).not.toContain('Indicated airspeed');
    expect(text).not.toContain('Angle of attack');
  });

  it('reports the HyperJet route speed and clears its snapshot when replay starts', async () => {
    await mount(); const route = FS.SPRINT_ROUTES[0];
    await click([...host.querySelectorAll('#skyschool-sec-sprints button')].find(node => node.textContent.includes(route.name)));
    const text = await request();
    expect(text).toContain(`Route speed ${Math.round(route.speed * 0.5924838)} knots.`);
    expect(text).not.toContain('Indicated airspeed');
    const old = retain(readButton());
    Object.assign(hooks().getSprintRef().current, { active: false, phase: 'result' });
    await frame(); await click(labelledButton('Replay geography sprint'));
    expect(snapshot().hidden || snapshotText() === '').toBe(true);
    await act(async () => old()); await tick();
    expect(snapshot().hidden || snapshotText() === '').toBe(true);
    await request(); expect(snapshotText()).toContain('Route speed');
  });

  it('preserves requested warnings and discovery navigation in the visible and spoken versions', async () => {
    await launch();
    Object.assign(hooks().flightRef.current, { stalling: true, lowAirspeed: true, onGround: true });
    const text = await request();
    expect(text).toContain('Warning: stalling!');
    expect(text).not.toContain('Low airspeed advisory.');
    expect(text).toContain('On ground.');
    expect(text).toContain('Next discovery:');
    expect(live().textContent).toBe(text);
    Object.assign(hooks().flightRef.current, { stalling: false, onGround: false });
    expect(await request()).toContain('Low airspeed advisory.');
  });

  it('keeps mission guidance ahead of ordinary discovery directions', async () => {
    await mount(); await click(host.querySelector('[data-flight-challenge-id="coastal_rescue"]'));
    const text = await request();
    expect(text).toContain('Rescue');
    expect(text).toContain('AGL');
    expect(text).not.toContain('Next discovery:');
    expect(live().textContent).toBe(text);
  });

  it('keeps challenge navigation and requested priority through ambient milestones in the same frame', async () => {
    await mount(); await act(async () => hooks().startFlightChallenge('cross_country'));
    await pressInfo();
    expect(snapshotText()).toContain('Current approach: JFK');
    expect(live().textContent).toBe(snapshotText());
    expect(live().textContent).not.toContain('Next discovery:');
  });
});

describe('flight snapshot ownership', () => {
  it('keeps the same-flight snapshot when the deck folds, but rejects its detached button', async () => {
    await launch(); const text = await request(), old = retain(readButton());
    await click(labelledButton('Collapse the flight deck controls'));
    Object.assign(hooks().flightRef.current, { altitude: 2222 });
    await act(async () => old()); await tick();
    await click(labelledButton('Expand the flight deck controls'));
    expect(snapshotText()).toBe(text);
    expect(await request()).toContain('Altitude 2222 feet');
  });

  it('rejects an old callback after controls are replaced before React renders', async () => {
    await launch(); const before = await request(), old = retain(readButton());
    hooks().controlsRef.current = { ...hooks().controlsRef.current, throttle: 0.2 };
    hooks().flightRef.current.altitude = 2222;
    await act(async () => old()); await tick();
    expect(snapshotText()).toBe(before);
    expect(live().textContent).toBe(before);
  });

  it('drops a queued announcement if its control owner is replaced during the announcement delay', async () => {
    await launch();
    await click(readButton());
    expect(snapshotText()).toContain('Altitude 8000 feet');
    hooks().controlsRef.current = { ...hooks().controlsRef.current };
    await tick();
    expect(live().textContent).not.toContain('Altitude 8000 feet');
    await act(async () => patch({ flightDetails: true }));
    expect(snapshot().hidden).toBe(true);
    expect(snapshotText()).toBe('');
    expect(await request()).toContain('Altitude 8000 feet');
  });

  it('does not let a retained status callback speak behind Controls and help', async () => {
    await launch(); await request(); const old = retain(readButton());
    await click(button('Controls and help')); await tick(); const helpAnnouncement = live().textContent;
    await act(async () => old()); await tick();
    expect(live().textContent).toBe(helpAnnouncement);
    expect(live().textContent).not.toContain('Altitude 8000');
    expect(host.querySelector('[data-flightsim-help]')).toBeTruthy();
  });

  it('clears prior flight text and rejects old callbacks after exit and fresh departure', async () => {
    await launch(); await request(); const old = retain(readButton());
    await click(button('✕ Exit')); await tick();
    expect(latest.view).toBe('debrief');
    const afterExit = live().textContent;
    await act(async () => old()); await tick(); expect(live().textContent).toBe(afterExit);
    await click(button('🏠 Back to Menu')); await click(labelledButton('Free Flight from Portland, ME'));
    expect(snapshot().hidden || snapshotText() === '').toBe(true);
    await act(async () => old()); await tick();
    expect(snapshot().hidden || snapshotText() === '').toBe(true);
    expect(await request()).not.toContain('Altitude 8000');
  });

  it('retires pending status output and retained callbacks on unmount', async () => {
    await launch(); const old = retain(readButton());
    await click(readButton());
    await act(async () => root.unmount()); root = null;
    await act(async () => old()); await tick();
    expect(live()).toBeNull();
    expect(host.textContent).toBe('');
  });
});
