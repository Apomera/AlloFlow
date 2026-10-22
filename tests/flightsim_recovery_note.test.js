import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const hooks = () => window.__testHooks.flightSim;
const observedRecovery = 'The wing is no longer stalled at this moment. A single observation does not establish sustained recovery.';
let FS, tool, host, root, latest, callback, wallTime, errors, physicsSnapshot, step, translatedRecovery;
const flight = patch => ({ lat: 43.646, lon: -70.309, altitude: 5000, fieldElev: 76,
  speed: 160, vsi: 0, heading: 0, onGround: false, aoa: 0, stalling: false,
  lowAirspeed: false, hitCeiling: false, ...patch });
const input = patch => ({ throttle: 0.4, pitch: 0, bank: 0, yawRate: 0, brake: 0, flaps: 0, ...patch });
const recoveryNotes = () => [...host.querySelectorAll('[data-flight-notes] strong')]
  .filter(node => node.textContent === 'Normal airflow restored')
  .map(node => ({ title: node.textContent, message: node.parentElement.querySelector('p').textContent }));

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab();
  window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
  physicsSnapshot = Object.getOwnPropertyDescriptors(FS.Physics);
  callback = null; wallTime = 1000; translatedRecovery = null;
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const gfx = new Proxy({
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  }, {
    get(target, key) { return key in target ? target[key] : () => {}; },
    set(target, key, value) { target[key] = value; return true; },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(gfx);
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  vi.stubGlobal('requestAnimationFrame', vi.fn(next => { if (next.name === 'loop') callback = next; return 1; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; host?.remove(); host = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  for (const key of Reflect.ownKeys(FS.Physics)) if (!Object.hasOwn(physicsSnapshot, key)) delete FS.Physics[key];
  Object.defineProperties(FS.Physics, physicsSnapshot);
  delete window.__RR_TEST_EXPORTS__; delete window.__testHooks;
  vi.useRealTimers();
});

async function mount() {
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', railCollapsed: false,
      takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(FS.ACHIEVEMENTS.map(item => [item.id, true])) } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      t: (key, fallback) => key === 'stem.flightsim.milestone_stall_recovery' && translatedRecovery != null
        ? translatedRecovery : fallback ?? key,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, value) => setData(old => ({ ...old, [id]: { ...old[id], ...value } })) }));
  }
  await act(async () => root.render(React.createElement(App)));
  const departure = host.querySelector('button[aria-label="Free Flight from Portland, ME"]');
  expect(departure).toBeTruthy();
  await act(async () => departure.click());
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 1280 });
    Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: 720 });
  }
  Object.assign(hooks().getWeatherRef().current, { type: 'clear', wind: 0, turbulence: 0 });
  // Call through to the real integrator: path angle can change AoA while the
  // nose input and throttle stay fixed. No stall flags are mocked below.
  step = vi.spyOn(FS.Physics, 'step');
  await frame(flight(), input());
  expect(hooks().flightRef.current.stalling).toBe(false);
  expect(recoveryNotes()).toEqual([]);
}
async function frame(state, controls) {
  if (state) Object.assign(hooks().flightRef.current, state);
  if (controls) Object.assign(hooks().controlsRef.current, controls);
  wallTime += 100;
  expect(callback).toBeTypeOf('function');
  await act(async () => callback());
  expect(errors).not.toHaveBeenCalled();
}
async function beginStall({ speed = 160, throttle = 0.4 } = {}) {
  // At zero pitch, this descending path gives 15.2 degrees of AoA. At the
  // higher speed, lift bends the real path upward enough to reattach flow on
  // the following step without a nose-down command or power increase.
  await frame(flight({ speed, vsi: -speed * Math.sin(15.2 * Math.PI / 180) }), input({ throttle }));
  expect(hooks().flightRef.current.stalling).toBe(true);
  expect(hooks().flightRef.current.aoa).toBeCloseTo(15.2, 6);
  expect(hooks().controlsRef.current.pitch).toBe(0);
}
async function keyFrame(key) {
  const cockpit = host.querySelector('canvas[role="application"]');
  cockpit.focus();
  await act(async () => cockpit.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })));
  await frame();
  await act(async () => cockpit.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true })));
}
function expectObservedMoment() {
  expect(hooks().flightRef.current.onGround).toBe(false);
  expect(hooks().flightRef.current.stalling).toBe(false);
  expect(recoveryNotes()).toEqual([{ title: 'Normal airflow restored', message: observedRecovery }]);
  expect(step).toHaveBeenCalled();
}

describe('observed stall-transition flight note', () => {
  it.each([['unchanged', 0.4], ['reduced', 0.1], ['increased', 0.8]])('describes the observation accurately with %s power', async (description, throttle) => {
    await mount(); await beginStall();
    expect(recoveryNotes()).toEqual([]);
    await frame(null, { throttle });
    expectObservedMoment();
    expect(hooks().controlsRef.current.throttle).toBe(throttle);
    expect(hooks().controlsRef.current.pitch).toBe(0);
    expect(hooks().flightRef.current.aoa).toBeLessThan(FS.Physics.CRITICAL_AOA);
  });

  it('does not invent a nose-down command when the pilot actually raises the nose as flow reattaches', async () => {
    await mount(); await beginStall();
    await keyFrame('w');
    expectObservedMoment();
    expect(hooks().controlsRef.current.pitch).toBeGreaterThan(0);
    expect(hooks().controlsRef.current.throttle).toBe(0.4);
  });

  it('does not present an ended stall as removal of the independent low-airspeed advisory', async () => {
    await mount(); await beginStall({ speed: 80 });
    expect(hooks().flightRef.current.lowAirspeed).toBe(true);
    await keyFrame('s');
    expectObservedMoment();
    expect(hooks().flightRef.current.lowAirspeed).toBe(true);
    expect(hooks().controlsRef.current.throttle).toBe(0.4);
  });

  it('keeps a one-frame observation truthful if the aircraft stalls again immediately afterward', async () => {
    await mount(); await beginStall(); await frame();
    expectObservedMoment();
    await beginStall();
    expect(recoveryNotes()).toEqual([{ title: 'Normal airflow restored', message: observedRecovery }]);
    expect(hooks().flightRef.current.stalling).toBe(true);
    expect(hooks().timeRef.current).toBeLessThan(5);
    await frame();
    expectObservedMoment();
  });

  it('does not record recovery for normal flight that has not stalled', async () => {
    await mount();
    await frame();
    expect(hooks().flightRef.current.stalling).toBe(false);
    expect(recoveryNotes()).toEqual([]);
  });

  it('does not mistake a ground reset of the stall flag for airborne recovery', async () => {
    await mount(); await beginStall();
    await frame(flight({ altitude: 76, fieldElev: 76, speed: 0, vsi: 0, onGround: true }), input({ throttle: 0 }));
    expect(hooks().flightRef.current.stalling).toBe(false);
    expect(hooks().flightRef.current.onGround).toBe(true);
    expect(recoveryNotes()).toEqual([]);
  });

  it('preserves the same observed message when the native Exit action archives the notes', async () => {
    await mount(); await beginStall(); await frame();
    expectObservedMoment();
    const exit = [...host.querySelectorAll('button')].find(button => button.textContent === '✕ Exit');
    expect(exit).toBeTruthy();
    await act(async () => exit.click());
    expect(latest.view).toBe('debrief');
    expect(latest.lastDebrief.flightNotes.filter(note => note.title === 'Normal airflow restored'))
      .toEqual([expect.objectContaining({ title: 'Normal airflow restored', message: observedRecovery })]);
    expect(host.querySelector('[data-flight-notes-scope="latest"]').textContent).toContain(observedRecovery);
  });

  it('uses the existing localized recovery-message key for the same measured transition', async () => {
    translatedRecovery = 'L’aile ne décroche plus à cet instant. Une seule observation ne prouve pas un rétablissement durable.';
    await mount(); await beginStall(); await frame();
    expect(hooks().flightRef.current.stalling).toBe(false);
    expect(recoveryNotes()).toEqual([{ title: 'Normal airflow restored', message: translatedRecovery }]);
  });
});
