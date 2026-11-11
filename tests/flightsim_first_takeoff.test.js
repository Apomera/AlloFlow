// The first takeoff used to fight the student (review 2026-11-09, flown in Edge):
// the pitch keys moved the nose 15 degrees a second and sprang back to level on
// release, and nothing stopped the nose rising to the wing's critical angle with the
// wheels still on the runway. Holding W left the Cessna at 59 kt and 178 ft after
// 25 s; letting go put it back on the runway. These run the real physics step and the
// real control helpers the cockpit loop uses.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let FS;
const KEYS = ['WING_AREA', 'WEIGHT', 'MAX_THRUST', 'CL0', 'CL_PER_AOA', 'CD0', 'CD_INDUCED_K', 'IS_HELICOPTER', 'IS_DRONE',
  'MAX_SPEED_KTS', 'AGL_CEILING', 'ENGINE', 'POWER_HP', 'PROP_EFFICIENCY', 'WINDMILL_CD', 'THRUST_LAPSE', 'RAM_LINEAR', 'RAM_SQUARE',
  'MIL_FRACTION', 'IDLE_FRACTION', 'MCRIT', 'WAVE_DRAG', 'WAVE_DECAY', 'VNE_KIAS', 'MMO', 'SPRINT_MODE'];
let saved = {};
const KT = 0.5924838;

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = window.__RR_TEST_EXPORTS__ || {};
  loadTool(process.env.SKYSCHOOL_TAKEOFF_SOURCE || 'stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
  KEYS.forEach((k) => { saved[k] = FS.Physics[k]; });
});
afterEach(() => { KEYS.forEach((k) => { if (saved[k] === undefined) delete FS.Physics[k]; else FS.Physics[k] = saved[k]; }); });

const cessna = () => FS.AIRCRAFT.find((a) => a.id === 'cessna172');

// Flies the cockpit loop's own control rules at 30 steps a second.
// `keys(t, state, controls)` returns 1 (W held), -1 (S held) or 0.
function fly(seconds, keys, start) {
  const ac = cessna();
  FS.Physics.configureAircraft(ac);
  let state = Object.assign({ speed: 0, altitude: 0, vsi: 0, heading: 90, lat: 43.6, lon: -70.3, onGround: true, fieldElev: 0 }, start && start.state);
  const controls = Object.assign({ throttle: 1, pitch: 0, bank: 0 }, start && start.controls);
  const dt = 1 / 30, trace = [];
  for (let i = 0; i < seconds * 30; i++) {
    const t = i * dt;
    controls.pitch = FS.stepFlightKeyboardPitch(controls.pitch, keys(t, state, controls), 1, FS.getFlightControlLimits(ac).pitch);
    controls.pitch = FS.limitFlightGroundPitch(controls.pitch, state, ac);
    state = Object.assign({}, state, FS.Physics.step(state, dt, controls));
    trace.push({ t, kt: state.speed * KT, agl: state.altitude, fpm: state.vsi * 60, pitch: controls.pitch, aoa: state.aoa, onGround: state.onGround, stalling: state.stalling });
  }
  return trace;
}
const rotationKt = 54;

describe('the trainer takes off like a trainer', () => {
  it('lifts off between 55 and 65 kt when the nose is held up, and climbs 500 to 800 fpm once released near 10 degrees', () => {
    const trace = fly(90, (t, s, c) => (s.speed * KT >= rotationKt && c.pitch < 10 ? 1 : 0));
    const lift = trace.find((p) => !p.onGround);
    expect(lift, 'never left the runway').toBeTruthy();
    expect(lift.kt).toBeGreaterThan(55);
    expect(lift.kt).toBeLessThan(65);
    const steady = trace.filter((p) => p.t > lift.t + 20 && p.t < lift.t + 40);
    const mean = (k) => steady.reduce((n, p) => n + p[k], 0) / steady.length;
    expect(mean('fpm')).toBeGreaterThan(500);
    expect(mean('fpm')).toBeLessThan(800);
    expect(mean('kt')).toBeGreaterThan(65);
    expect(mean('kt')).toBeLessThan(85);
    expect(trace.some((p) => p.stalling)).toBe(false);
    expect(trace[trace.length - 1].agl).toBeGreaterThan(500);
  });

  it('keeps climbing after the key is released: the nose stays where it was left', () => {
    const trace = fly(60, (t, s, c) => (s.speed * KT >= rotationKt && c.pitch < 10 ? 1 : 0));
    const lift = trace.find((p) => !p.onGround);
    const later = trace.filter((p) => p.t > lift.t + 5);
    expect(Math.min(...later.map((p) => p.pitch))).toBeGreaterThan(9.9);
    expect(later.every((p) => !p.onGround), 'sank back to the runway').toBe(true);
    for (let i = 30; i < later.length; i += 30) expect(later[i].agl).toBeGreaterThan(later[i - 30].agl);
  });

  it('a student who simply holds W the whole time still climbs and does not stall', () => {
    const trace = fly(60, (t, s) => (s.speed * KT >= rotationKt ? 1 : 0));
    const end = trace[trace.length - 1];
    expect(trace.some((p) => p.stalling)).toBe(false);
    expect(end.agl).toBeGreaterThan(250);
    expect(end.fpm).toBeGreaterThan(400);
  });

  it('cannot raise the nose past the runway limit while the wheels are down, however long W is held', () => {
    const trace = fly(12, () => 1, { controls: { throttle: 0.3, pitch: 0, bank: 0 } });
    const ground = trace.filter((p) => p.onGround);
    expect(ground.length).toBeGreaterThan(200);
    expect(Math.max(...ground.map((p) => p.pitch))).toBe(FS.FLIGHT_GROUND_PITCH_LIMIT);
    expect(Math.max(...ground.map((p) => p.aoa))).toBeLessThan(FS.Physics.CRITICAL_AOA - 3);
  });
});

describe('control helpers', () => {
  it('holds attitude with no key, raises the nose 9 degrees a second and lowers it 15', () => {
    expect(FS.stepFlightKeyboardPitch(7.25, 0, 1, 15)).toBe(7.25);
    expect(FS.stepFlightKeyboardPitch(-4, 0, 3, 15)).toBe(-4);
    expect(FS.stepFlightKeyboardPitch(0, 1, 30, 15)).toBeCloseTo(9, 10);
    expect(FS.stepFlightKeyboardPitch(10, -1, 30, 15)).toBeCloseTo(-5, 10);
    expect(FS.stepFlightKeyboardPitch(14.9, 1, 30, 15)).toBe(15);
    expect(FS.stepFlightKeyboardPitch(-14.9, -1, 30, 15)).toBe(-15);
  });

  it('limits pitch only for a fixed-wing aircraft on the ground, and never raises a lower value', () => {
    const ground = { onGround: true }, air = { onGround: false };
    expect(FS.limitFlightGroundPitch(15, ground, {})).toBe(10);
    expect(FS.limitFlightGroundPitch(4, ground, {})).toBe(4);
    expect(FS.limitFlightGroundPitch(-6, ground, {})).toBe(-6);
    expect(FS.limitFlightGroundPitch(15, air, {})).toBe(15);
    expect(FS.limitFlightGroundPitch(15, ground, { isHelicopter: true })).toBe(15);
    expect(FS.limitFlightGroundPitch(15, ground, { isDrone: true })).toBe(15);
    expect(FS.limitFlightGroundPitch(NaN, ground, {})).toBe(0);
  });

  it('the stall still exists: nose held at the limit with the engine at idle reaches the critical angle', () => {
    const trace = fly(40, () => 1, { state: { speed: 130, altitude: 3000, vsi: 0, onGround: false }, controls: { throttle: 0, pitch: 5, bank: 0 } });
    expect(trace.some((p) => p.stalling)).toBe(true);
  });
});
