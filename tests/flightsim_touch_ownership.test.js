import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const KTS_PER_FPS = 0.5924838;
const indicatedFactor = Math.sqrt(Math.pow(1 - 0.0000068756 * 5000, 4.2561));
const finger = (identifier, clientX, clientY) => ({ identifier, clientX, clientY });
const stick = () => finger(3, 300, 350);
const power = () => finger(8, 1030, 450);
const input = patch => ({ throttle: 0.5, pitch: 0, bank: 0, yawRate: 0, flaps: 0, brake: 0, ...patch });
const cruise = () => ({ speed: 100 / KTS_PER_FPS / indicatedFactor, altitude: 5000, vsi: 0, heading: 180,
  lat: 43.646, lon: -70.309, fieldElev: 76, onGround: false, stalling: false, lowAirspeed: false });
let FS, tool, host, root, cockpit, latest, frameCallback, wallTime, errors, apUpdates, physicsSnapshot;
const hooks = () => window.__testHooks.flightSim;
const controls = () => hooks().controlsRef.current;

// Derive balanced trim from the actual integrator, independently of assistance.
function bisect(residual, low, high) {
  expect(residual(low)).toBeLessThan(0); expect(residual(high)).toBeGreaterThan(0);
  for (let iteration = 0; iteration < 52; iteration++) {
    const middle = (low + high) / 2;
    if (residual(middle) < 0) low = middle; else high = middle;
  }
  return (low + high) / 2;
}
function cruiseTrim(current) {
  const powerAt = pitch => bisect(throttle =>
    FS.Physics.step(current, 1 / 60, input({ pitch, throttle })).speed - current.speed, 0, 1);
  const pitch = bisect(angle =>
    FS.Physics.step(current, 1 / 60, input({ pitch: angle, throttle: powerAt(angle) })).vsi, -2, 4);
  expect(pitch).toBeGreaterThan(1); expect(pitch).toBeLessThan(3);
  return input({ pitch, throttle: powerAt(pitch) });
}
function touch(type, changedTouches, touches = changedTouches) {
  const event = new TouchEvent(type, { bubbles: true, cancelable: true,
    changedTouches, touches, targetTouches: touches });
  cockpit.dispatchEvent(event); return event;
}
function key(type, value) {
  cockpit.focus(); cockpit.dispatchEvent(new KeyboardEvent(type, { key: value, bubbles: true, cancelable: true }));
}
async function frames(count = 1) {
  for (let frame = 0; frame < count; frame++) {
    expect(frameCallback).toBeTypeOf('function');
    await act(async () => { wallTime += 1000 / 60; vi.advanceTimersByTime(1000 / 60); frameCallback(); });
    expect(errors).not.toHaveBeenCalled();
  }
}
async function mount({ assisted = true } = {}) {
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', aircraft: 'cessna172', railCollapsed: true,
      takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(FS.ACHIEVEMENTS.map(item => [item.id, true])) } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, name, value) => {
        if (name === 'autopilot') apUpdates.push(value);
        setData(old => ({ ...old, [id]: { ...old[id], [name]: value } }));
      },
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
  await act(async () => host.querySelector('button[aria-label="Free Flight from Portland, ME"]').click());
  cockpit = host.querySelector('canvas[role="application"]');
  vi.spyOn(cockpit, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 50, width: 1000, height: 600 });
  cockpit.focus();
  const current = cruise(), trim = cruiseTrim(current);
  Object.assign(hooks().flightRef.current, current); Object.assign(controls(), trim);
  Object.assign(hooks().getWeatherRef().current, { type: 'clear', wind: 0, turbulence: 0 });
  if (assisted) { key('keydown', 'b'); key('keyup', 'b'); }
  await frames();
  if (assisted) expect(latest.autopilot).toMatchObject({ hdg: true, alt: true, spd: true, tgtSpd: 100 });
  apUpdates.length = 0;
  return trim;
}

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); FS = window.__RR_TEST_EXPORTS__.flightSim;
  physicsSnapshot = Object.getOwnPropertyDescriptors(FS.Physics); apUpdates = [];
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const context = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
  }, { get: (target, property) => property in target ? target[property] : () => {},
    set: (target, property, value) => { target[property] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  wallTime = 1000; vi.spyOn(performance, 'now').mockImplementation(() => wallTime); frameCallback = null;
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => { if (callback.name === 'loop') frameCallback = callback; return 1; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null; cockpit = null;
  for (const name of Reflect.ownKeys(FS.Physics)) if (!Object.hasOwn(physicsSnapshot, name)) delete FS.Physics[name];
  Object.defineProperties(FS.Physics, physicsSnapshot);
  delete document.hidden; delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('unclaimed touches preserve assisted flight', () => {
  it.each(['start', 'jitter', 'end', 'cancel', 'blur', 'visibility', 'pause', 'help'])(
    'keeps actual balanced trim through a neutral touch %s', async lifecycle => {
      const trim = await mount(), point = stick();
      const before = { ...controls() }, clock = hooks().timeRef.current;
      touch('touchstart', [point]);
      if (lifecycle !== 'start') touch('touchmove', [finger(point.identifier, point.clientX + 0.5, point.clientY - 0.5)]);
      if (lifecycle === 'end') touch('touchend', [point], []);
      else if (lifecycle === 'cancel') touch('touchcancel', [point], []);
      else if (lifecycle === 'blur') window.dispatchEvent(new Event('blur'));
      else if (lifecycle === 'visibility') {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
      } else if (lifecycle === 'pause') {
        await act(async () => host.querySelector('button[aria-label="Pause flight"]').click());
      } else if (lifecycle === 'help') {
        await act(async () => host.querySelector('button[aria-label="Controls and help"]').click());
      }
      expect(controls()).toEqual(before);
      expect(apUpdates).toEqual([]);
      expect(latest.autopilot).toMatchObject({ hdg: true, alt: true, spd: true });
      await frames(30);
      if (lifecycle === 'pause' || lifecycle === 'help') {
        expect(hooks().timeRef.current).toBe(clock); expect(controls()).toEqual(before);
        await act(async () => (lifecycle === 'pause'
          ? host.querySelector('button[aria-label="Resume flight"]') : host.querySelector('#skyschool-close-help')).click());
        await frames(30);
      }
      expect(controls().pitch).toBeCloseTo(trim.pitch, 6);
      expect(controls().throttle).toBeCloseTo(trim.throttle, 6);
      expect(hooks().flightRef.current.altitude).toBeCloseTo(5000, 3);
      expect(hooks().flightRef.current.vsi).toBeCloseTo(0, 3);
      expect(apUpdates).toEqual([]);
    });

  it('lets SPD adjust under a resting power finger and rebases its first deliberate drag to the live lever', async () => {
    await mount(); const point = power(); touch('touchstart', [point]);
    const initialThrottle = controls().throttle;
    hooks().flightRef.current.speed = 90 / KTS_PER_FPS / indicatedFactor;
    for (let frame = 0; frame < 20; frame++) {
      const live = controls().throttle;
      touch('touchmove', [point]);
      touch('touchmove', [finger(point.identifier, point.clientX, point.clientY - 0.5)]);
      expect(controls().throttle).toBe(live);
      await frames();
    }
    expect(latest.autopilot.spd).toBe(true); expect(apUpdates).toEqual([]);
    const liveBase = controls().throttle;
    expect(liveBase).toBeGreaterThan(initialThrottle + 0.02);
    await act(async () => touch('touchmove', [finger(point.identifier, point.clientX, point.clientY - 20)]));
    expect(controls().throttle).toBeCloseTo(Math.min(1, liveBase + 0.1), 10);
    expect(latest.autopilot).toEqual({ hdg: false, alt: false, spd: false });
    touch('touchmove', [finger(point.identifier, point.clientX, point.clientY - 40)]);
    expect(controls().throttle).toBeCloseTo(Math.min(1, liveBase + 0.2), 10);
    touch('touchmove', [point]);
    expect(controls().throttle).toBeCloseTo(liveBase, 10);
    touch('touchend', [point], []);
    expect(controls().throttle).toBeCloseTo(liveBase, 10);
    expect(apUpdates).toEqual([{ hdg: false, alt: false, spd: false }]);
  });
});

describe('claimed touches retain intentional control', () => {
  it.each(['touchend', 'touchcancel'])('takes over once, stays owned through recentering, and neutralizes on %s', async ending => {
    await mount(); const point = stick(); touch('touchstart', [point]);
    await act(async () => touch('touchmove', [finger(point.identifier, point.clientX + 40, point.clientY - 40)]));
    expect(latest.autopilot).toEqual({ hdg: false, alt: false, spd: false });
    expect(controls()).toMatchObject({ pitch: 7.5, bank: 22.5 });
    touch('touchmove', [point]);
    expect(controls().pitch === 0).toBe(true); expect(controls().bank === 0).toBe(true);
    const small = finger(point.identifier, point.clientX + 0.5, point.clientY - 0.5);
    touch('touchmove', [small]);
    expect(controls().pitch).toBeCloseTo(0.5 / 80 * 15, 10);
    expect(controls().bank).toBeCloseTo(0.5 / 80 * 45, 10);
    await frames();
    expect(controls().pitch).toBeCloseTo(0.5 / 80 * 15, 10);
    expect(controls().bank).toBeCloseTo(0.5 / 80 * 45, 10);
    touch(ending, [small], []); expect(controls()).toMatchObject({ pitch: 0, bank: 0 });
    expect(apUpdates).toEqual([{ hdg: false, alt: false, spd: false }]);
  });

  it('does not let an unclaimed resting finger suppress ordinary manual auto-centering', async () => {
    await mount({ assisted: false }); Object.assign(controls(), { pitch: 6, bank: 20 });
    const point = stick(); touch('touchstart', [point]);
    touch('touchmove', [finger(point.identifier, point.clientX + 0.5, point.clientY - 0.5)]);
    expect(controls()).toMatchObject({ pitch: 6, bank: 20 });
    await frames();
    expect(controls().pitch).toBeCloseTo(6 * Math.pow(0.92, 0.5), 10);
    expect(controls().bank).toBeCloseTo(20 * Math.pow(0.95, 0.5), 10);
    touch('touchend', [point], []);
    expect(controls().pitch).toBeCloseTo(6 * Math.pow(0.92, 0.5), 10);
    expect(controls().bank).toBeCloseTo(20 * Math.pow(0.95, 0.5), 10);
  });
});
