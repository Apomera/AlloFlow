import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const KTS_PER_FPS = 0.5924838;
let FS, tool, physicsSnapshot, host, reactRoot, latest, setData, frameCallback, errors, texts, wallTime;
const hooks = () => window.__testHooks.flightSim;
const state = (patch = {}) => ({ speed: 0, altitude: 76, fieldElev: 76, vsi: 0, heading: 0,
  lat: 43.646, lon: -70.309, onGround: true, ...patch });
const controls = (patch = {}) => ({ throttle: 0, pitch: 0, bank: 0, yawRate: 0, brake: 0, flaps: 0, ...patch });

beforeEach(() => {
  vi.useFakeTimers();
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
  physicsSnapshot = Object.getOwnPropertyDescriptors(FS.Physics);
  texts = []; wallTime = 1000;
});
afterEach(async () => {
  if (reactRoot) await act(async () => reactRoot.unmount());
  reactRoot = null;
  host?.remove(); host = null;
  frameCallback = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  for (const key of Reflect.ownKeys(FS.Physics)) if (!Object.hasOwn(physicsSnapshot, key)) delete FS.Physics[key];
  Object.defineProperties(FS.Physics, physicsSnapshot);
  delete window.__RR_TEST_EXPORTS__; delete window.__testHooks;
  vi.useRealTimers();
});
function aircraft(id) { return FS.AIRCRAFT.find(item => item.id === id); }
function configure(id = 'cessna172') {
  const ac = aircraft(id);
  Object.assign(FS.Physics, { WING_AREA: ac.wingArea, WEIGHT: ac.weight, MAX_THRUST: ac.maxThrust,
    CL0: ac.cl0, CL_PER_AOA: ac.clPerAoa, CD0: ac.cd0, CD_INDUCED_K: ac.cdK,
    IS_HELICOPTER: !!ac.isHelicopter, IS_DRONE: !!ac.isDrone,
    MAX_SPEED_KTS: ac.maxSpeed, AGL_CEILING: ac.isDrone ? 400 : null, SPRINT_MODE: false });
  return ac;
}

describe('wheel steering and grounded rotor controls', () => {
  it('cannot rotate a parked aircraft or consume invalid steering samples', () => {
    for (const [speed, bank] of [[0, 45], [-1, 45], [NaN, 45], [100, Infinity]]) {
      expect(FS.getFlightGroundTurnRate(speed, bank)).toBe(0);
    }
    configure();
    const parked = FS.Physics.step(state({ heading: 355 }), 1, controls({ bank: 45, brake: 1 }));
    expect(parked.heading).toBe(355);
    expect(parked.lat).toBe(43.646); expect(parked.lon).toBe(-70.309);
  });
  it('steers gently at crawl speed and reverses with the input', () => {
    expect(FS.getFlightGroundTurnRate(1, 45)).toBeCloseTo(1.2, 10);
    expect(FS.getFlightGroundTurnRate(1, -45)).toBeCloseTo(-1.2, 10);
    expect(FS.getFlightGroundTurnRate(1, 22.5)).toBeCloseTo(0.6, 10);
    expect(FS.getFlightGroundTurnRate(1, 90)).toBeCloseTo(1.2, 10);
  });
  it('limits fast rollout lateral acceleration and never exceeds 24 degrees per second', () => {
    for (const speed of [1, 5, 20, 50, 100, 250]) {
      const rate = FS.getFlightGroundTurnRate(speed, 45);
      expect(rate).toBeLessThanOrEqual(24);
      expect(speed * rate * Math.PI / 180).toBeLessThanOrEqual(FS.Physics.G * 0.12 + 1e-9);
    }
    expect(FS.getFlightGroundTurnRate(250, 45)).toBeLessThan(FS.getFlightGroundTurnRate(50, 45));
  });
  it('keeps steering and braking comparable across frame rates and stops rather than reversing', () => {
    configure();
    function rollout(hz) {
      let current = state({ speed: 15, heading: 350 });
      for (let i = 0; i < hz * 3; i++) current = FS.Physics.step(current, 1 / hz, controls({ bank: 45, brake: 1 }));
      return current;
    }
    const slow = rollout(30), fast = rollout(120);
    expect(slow.speed).toBe(0); expect(fast.speed).toBe(0);
    expect(Math.abs(slow.heading - fast.heading)).toBeLessThan(0.5);
    expect(slow.onGround).toBe(true); expect(fast.onGround).toBe(true);
    expect(FS.Physics.step(slow, 1, controls({ bank: -45, brake: 1 })).heading).toBe(slow.heading);
  });
  it.each(['rescue_heli', 'drone'])('keeps parked %s level and motionless despite cyclic, bank, and yaw', id => {
    configure(id);
    const next = FS.Physics.step(state({ heading: 270 }), 1, controls({ throttle: 0.25, pitch: 15, bank: 20, yawRate: 25 }));
    expect(next).toMatchObject({ altitude: 76, vsi: 0, heading: 270, speed: 0, lat: 43.646, lon: -70.309, onGround: true });
    expect(next.forces.forward).toBe(0);
    expect(next.forces.lift).toBeCloseTo(next.forces.thrust, 10);
  });
  it.each(['rescue_heli', 'drone'])('allows %s yaw after powered lift clears the surface', id => {
    configure(id);
    const input = controls({ throttle: 1, pitch: 15, bank: 20, yawRate: 15 });
    const lifted = FS.Physics.step(state(), 0.1, input);
    expect(lifted.onGround).toBe(false); expect(lifted.altitude).toBeGreaterThan(76);
    expect(lifted.heading).toBeGreaterThan(0);
    const airborne = FS.Physics.step(lifted, 0.1, input);
    expect(airborne.speed).toBeGreaterThan(0); expect(airborne.lon).not.toBe(lifted.lon);
  });
});

describe('physical contact retains impact evidence before clamps', () => {
  it.each(['cessna172', 'rescue_heli', 'drone'])('captures the fresh descending %s sample before floor and ground friction', id => {
    configure(id);
    const initial = state({ altitude: 76.01, speed: 80, vsi: -8, onGround: false });
    const next = FS.Physics.step(initial, 0.1, controls());
    expect(next).toMatchObject({ altitude: 76, onGround: true, vsi: 0 });
    expect(next.groundContact.vsi).toBeLessThan(-6);
    expect(next.groundContact.speed).toBeGreaterThan(next.speed);
    expect(FS.getFlightContactEvidence(next, controls(), {}, 0, aircraft(id)).descentFpm).toBeGreaterThan(360);
  });
  it.each(['cessna172', 'rescue_heli', 'drone'])('does not treat a %s 0.8 feet above the floor or a frozen frame as contact', id => {
    configure(id);
    const hovering = state({ altitude: 76.8, speed: 80, vsi: 0, onGround: false });
    const above = FS.Physics.step(hovering, 0.01, controls({ throttle: id === 'drone' ? 0.5 : 0 }));
    expect(above.onGround).toBe(false); expect(above.groundContact).toBeNull();
    const frozen = FS.Physics.step(state({ onGround: false, vsi: -8 }), 0, controls());
    expect(frozen.groundContact).toBeNull();
  });
  it('rejects absent, invalid, and non-descending impact samples', () => {
    for (const groundContact of [null, {}, { vsi: NaN, speed: 20 }, { vsi: -2, speed: Infinity },
      { vsi: -2, speed: -1 }, { vsi: 0, speed: 20 }, { vsi: 2, speed: 20 }]) {
      expect(FS.getFlightContactEvidence(state({ groundContact }), controls(), {}, 0, aircraft('cessna172'))).toBeNull();
    }
  });
  it.each([[0, 0], [0, -20], [180, 20], [90, 'cross']])('includes wind from %s degrees in the impact ground speed', (windDir, expectedDelta) => {
    const impact = state({ heading: 0, groundContact: { vsi: -6, speed: Math.hypot(100, 6) } });
    const wind = expectedDelta === 0 ? 0 : 20;
    const evidence = FS.getFlightContactEvidence(impact, controls(), { wind, windDir }, 0, aircraft('cessna172'));
    const expectedFps = expectedDelta === 'cross' ? Math.hypot(100, 20 * 1.68781) : 100 + expectedDelta * 1.68781;
    expect(evidence.descentFpm).toBe(360);
    expect(evidence.groundSpeedKts).toBeCloseTo(expectedFps * KTS_PER_FPS, 8);
  });
  it('includes rotor lateral motion in contact ground speed while using the preserved forward sample', () => {
    const impact = state({ speed: 0, groundContact: { vsi: -2, speed: 5 } });
    const input = controls({ bank: 30, throttle: 0.5 });
    const evidence = FS.getFlightContactEvidence(impact, input, {}, 0, aircraft('drone'));
    expect(evidence.groundSpeedKts).toBeCloseTo(Math.hypot(5, 12.5) * KTS_PER_FPS, 8);
  });
  it('captures incoming velocity at rising terrain and preserves an integrator contact sample', () => {
    const original = Object.freeze(state({ altitude: 100, fieldElev: 76, speed: 80, vsi: -5, onGround: false }));
    const terrain = FS.reconcileGroundContact(original, 120);
    expect(terrain).toMatchObject({ altitude: 120, fieldElev: 120, vsi: 0, onGround: true, groundContact: { vsi: -5, speed: 80 } });
    expect(original.altitude).toBe(100); expect(original.vsi).toBe(-5);
    const sample = Object.freeze({ vsi: -9, speed: 90 });
    const existing = FS.reconcileGroundContact(state({ altitude: 76, groundContact: sample }), 80);
    expect(existing.groundContact).toBe(sample);
    expect(FS.reconcileGroundContact(state({ altitude: 76.8, onGround: false }), 76).onGround).toBe(false);
  });
});

async function mountFlight(patch = {}) {
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const context = new Proxy({ fillText: text => texts.push(String(text)),
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
  }, { get(target, key) { return key in target ? target[key] : () => {}; }, set(target, key, value) { target[key] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => { if (callback.name === 'loop') frameCallback = callback; return 1; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  host = document.createElement('div'); document.body.appendChild(host);
  reactRoot = ReactDOMClient.createRoot(host);
  function App() {
    const [data, updateData] = React.useState({ flightSim: { view: 'menu', railCollapsed: true,
      takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(FS.ACHIEVEMENTS.map(item => [item.id, true])), ...patch } });
    latest = data.flightSim; setData = updateData;
    return tool.render(makeCtx({ toolData: data, setToolData: updateData,
      update: (id, key, value) => updateData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, value) => updateData(old => ({ ...old, [id]: { ...old[id], ...value } })),
    }));
  }
  await act(async () => reactRoot.render(React.createElement(App)));
  await act(async () => host.querySelector('button[aria-label="Free Flight from Portland, ME"]').click());
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 1280 });
    Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: 720 });
  }
  const dock = host.querySelector('[data-flightsim-hud-dock]');
  for (const [key, value] of Object.entries({ offsetLeft: 8, offsetTop: 62, offsetWidth: 215, offsetHeight: 64 })) {
    Object.defineProperty(dock, key, { configurable: true, value });
  }
  Object.assign(hooks().flightRef.current, state());
  Object.assign(hooks().controlsRef.current, controls());
  Object.assign(hooks().getWeatherRef().current, { wind: 0, turbulence: 0 });
  hooks().timeRef.current = 10;
}
async function frame() {
  texts.length = 0; wallTime += 100;
  expect(frameCallback).toBeTypeOf('function');
  await act(async () => frameCallback());
  expect(errors).not.toHaveBeenCalled();
}
function armedLanding(lastVSI = -60) {
  Object.assign(hooks().getLandingRef().current, { wasAirborne: true, peakAGL: 150, scored: false, lastVSI });
}
function touchdown() {
  Object.assign(hooks().flightRef.current, state({ altitude: 76.01, speed: 80, vsi: -8, onGround: false }));
}

describe('landing and rollout feedback in the production frame loop', () => {
  it('grades the fresh impact rather than the stale airborne readout', async () => {
    await mountFlight(); armedLanding(-60); touchdown();
    await frame();
    const landing = hooks().getLandingRef().current;
    expect(landing.scored).toBe(true); expect(landing.touchdownFPM).toBeGreaterThan(400);
    expect(landing.grade).not.toContain('BUTTER');
    expect(landing.touchdownFPM).toBeCloseTo(-hooks().flightRef.current.groundContact.vsi * 60, 8);
  });
  it('requires physical evidence and leaves an unconfirmed floor state unscored', async () => {
    await mountFlight(); armedLanding(-600);
    await frame();
    expect(hooks().getLandingRef().current.scored).toBe(false);
    expect(texts.some(text => text.startsWith('Ground contact ·'))).toBe(false);
  });
  it('scores once and repaints compact feedback while paused, then expires it after eight simulation seconds', async () => {
    await mountFlight(); armedLanding(); touchdown();
    window._alloHaptic = vi.fn();
    try {
      await frame();
      const landing = hooks().getLandingRef().current;
      const sample = { fpm: landing.touchdownFPM, time: landing.touchdownTime, speed: landing.touchdownSpeed };
      expect(texts.some(text => text.startsWith('Ground contact ·'))).toBe(true);
      await frame();
      expect(texts.some(text => text.startsWith('Ground contact ·'))).toBe(true);
      hooks().pausedRef.current = true;
      const pausedTime = hooks().timeRef.current;
      await frame();
      expect(texts.some(text => text.startsWith('Ground contact ·'))).toBe(true);
      await frame();
      expect(texts).toHaveLength(0); // A held pause frame retains the previous canvas.
      for (const canvas of host.querySelectorAll('canvas')) {
        Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 1260 });
      }
      await frame(); // Resizing must repaint the contact summary without advancing time.
      expect(hooks().timeRef.current).toBe(pausedTime);
      expect(texts.some(text => text.startsWith('Ground contact ·'))).toBe(true);
      expect(window._alloHaptic).toHaveBeenCalledTimes(1);
      expect(landing.touchdownFPM).toBe(sample.fpm); expect(landing.touchdownSpeed).toBe(sample.speed);
      expect(landing.touchdownTime).toBe(sample.time);
      hooks().pausedRef.current = false; hooks().timeRef.current = sample.time + 8.1;
      await frame();
      expect(texts.some(text => text.startsWith('Ground contact ·'))).toBe(false);
    } finally { delete window._alloHaptic; }
  });
  it('shows contact feedback after a short flight still displaying takeoff guidance', async () => {
    await mountFlight();
    await act(async () => setData(old => ({ ...old, flightSim: { ...old.flightSim, takeoffTutorialDismissed: false } })));
    armedLanding(); touchdown(); await frame(); await frame();
    expect(latest.takeoffTutorialDismissed).toBe(true);
    expect(texts.some(text => text.startsWith('Ground contact ·'))).toBe(true);
  });
  it('suppresses rotation coaching on idle or braked rollout and retains it for a powered takeoff', async () => {
    await mountFlight();
    const highSpeed = FS.Physics.stallSpeed(76) * 1.25;
    for (const input of [controls(), controls({ throttle: 1, brake: 1 })]) {
      Object.assign(hooks().flightRef.current, state({ speed: highSpeed, _callouts: { airspeed: 0, vr: 0, climb: 0 } }));
      Object.assign(hooks().controlsRef.current, input);
      if (input.brake) hooks().keysRef.current.x = true;
      await frame();
      expect(hooks().flightRef.current._callouts.vr).toBe(0);
      expect(texts.some(text => text.includes('ROTATE'))).toBe(false);
      delete hooks().keysRef.current.x;
    }
    Object.assign(hooks().flightRef.current, state({ speed: highSpeed, _callouts: { airspeed: 0, vr: 0, climb: 0 } }));
    Object.assign(hooks().controlsRef.current, controls({ throttle: 1 }));
    await frame();
    expect(hooks().flightRef.current._callouts.vr).toBeGreaterThan(0);
    expect(texts.some(text => text.includes('ROTATE'))).toBe(true);
    Object.assign(hooks().controlsRef.current, controls()); await frame();
    expect(texts.some(text => text.includes('ROTATE'))).toBe(false);
  });
});
