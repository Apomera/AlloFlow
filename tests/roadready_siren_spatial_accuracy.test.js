import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { beforeAll, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
let RR, makeUpdater;
beforeAll(() => {
  RR = require('../dev-tools/roadready_model.cjs').loadRoadReady();
  const source = readFileSync('stem_lab/stem_tool_roadready.js', 'utf8');
  const start = source.indexOf('        var _nextDrillSpawn = 20;');
  const end = source.indexOf('        var updateCyclists = function(dt)', start);
  if (start < 0 || end < 0) throw new Error('Cannot locate production emergency updater');
  makeUpdater = new Function('scope', 'with(scope) {' + source.slice(start, end) + '\nreturn updateEmergency;}');
});

function encounter({ direction = -1, theta = 0, ahead = -80, right = 0,
  sourceSpeed = 20, listenerSpeed = 0 } = {}) {
  const profile = { lanes: 2, roadHalfWidth: 3.5 };
  const world = { profile, chunks: {}, getChunk: () => profile, spline: {
    centerAt: station => 48 + Math.tan(theta) * (station - 48), headingAt: () => theta,
  } };
  const heading = direction * Math.PI / 2 - theta, lane = -direction * 1.6;
  const car = { ...RR.mainRoadWorldPoint(world, 48, lane), heading, speed: listenerSpeed };
  const sourceLane = lane - direction * right;
  const responder = { ...RR.mainRoadWorldPoint(world, 48 + ahead * direction * Math.cos(theta), sourceLane),
    heading, speed: sourceSpeed, _cruiseSpeed: sourceSpeed, _laneOff: sourceLane,
    _homeLaneOff: sourceLane, _travelSign: direction, kind: 'ambulance', sirenFreq: 800,
    life: 1000, checked: true, responded: true };
  const calls = { frequency: [], pan: [], cutoff: [], gain: [] };
  const param = key => ({ setTargetAtTime(value, time, constant) { calls[key].push({ value, time, constant }); } });
  const state = { ...RR, MAP_SIZE: 96, d: {}, currentVehicle: { id: 'sedan' },
    currentScenario: { id: 'residential', speedLimit: 25, weather: 'clear' },
    carRef: { current: car }, emergencyRef: { current: responder }, infiniteWorldRef: { current: world },
    trafficRef: { current: [] }, pedsRef: { current: [] }, cyclistsRef: { current: [] },
    wildlifeRef: { current: null }, timeRef: { current: 0 },
    audioRef: { current: { ctx: { currentTime: 1 }, _sirenOsc: { frequency: param('frequency') },
      _sirenPan: { pan: param('pan') }, _sirenLPF: { frequency: param('cutoff') },
      _sirenGain: { gain: param('gain') } } },
    statsRef: { current: { safetyScore: 100, crashes: 0 } }, calmDriveRef: { current: true },
    eventToastRef: { current: null }, addToast() {}, speak() {}, showDriveAlert() {}, safeTimeout() {},
    unlockBadge() {}, upd() {},
  };
  const update = makeUpdater(state);
  return { car, responder, calls, state, step(dt = 0) { update(dt); } };
}

describe('live siren automation follows source and listener motion', () => {
  it.each([-1, 1])('raises approaching pitch and lowers receding pitch in travel direction %i', direction => {
    const approach = encounter({ direction });
    approach.step();
    expect(approach.calls.frequency.at(-1).value).toBeCloseTo(800 * 343 / (343 - 20), 8);
    const depart = encounter({ direction, ahead: 15 });
    depart.step();
    expect(depart.calls.frequency.at(-1).value).toBeCloseTo(800 * 343 / (343 + 20), 8);
  });

  it.each([-1, 1])('does not shift pitch when both vehicles travel together in direction %i', direction => {
    const run = encounter({ direction, listenerSpeed: 20, sourceSpeed: 20 });
    run.step();
    expect(run.calls.frequency.at(-1).value).toBeCloseTo(800, 8);
  });

  it.each([-1, 1])('accounts for listener motion past a stationary siren in direction %i', direction => {
    for (const [ahead, expected] of [[15, 800 * (343 + 20) / 343], [-80, 800 * (343 - 20) / 343]]) {
      const run = encounter({ direction, ahead, listenerSpeed: 20, sourceSpeed: 0 });
      run.step();
      expect(run.calls.frequency.at(-1).value).toBeCloseTo(expected, 8);
    }
  });

  it.each([-0.35, 0, 0.35])('pans by listener bearing on a road tilted %f radians', theta => {
    for (const direction of [-1, 1]) for (const right of [-6, 6]) {
      const run = encounter({ direction, theta, ahead: -8, right, sourceSpeed: 0 });
      run.step();
      expect(run.calls.pan.at(-1).value, JSON.stringify({ direction, right, theta })).toBeCloseTo(right / 10, 9);
      expect(run.calls.frequency.at(-1).value).toBeCloseTo(800, 9);
    }
  });

  it.each([30, 60, 144])('updates moving siren cues at %i Hz without duplicate pitch targets', hz => {
    for (const direction of [-1, 1]) {
      const run = encounter({ direction, right: 4, theta: 0.35 });
      run.step(1 / hz);
      expect(run.calls.frequency).toHaveLength(1);
      expect(run.calls.frequency[0].value).toBeGreaterThan(800);
      expect(run.calls.pan.at(-1).value).toBeGreaterThan(0);
      expect(run.calls.pan.at(-1).value).toBeLessThan(0.1);
      expect(run.state.statsRef.current).toEqual({ safetyScore: 100, crashes: 0 });
    }
  });

  it('retains distance filtering, pass fade, and a safe no-audio path', () => {
    const near = encounter({ ahead: 10, right: 6, sourceSpeed: 0 });
    near.step();
    expect(near.calls.cutoff.at(-1).value).toBeCloseTo(5000 - Math.hypot(10, 6) * 180, 8);
    expect(near.calls.gain.at(-1).value).toBe(0.01);
    const far = encounter();
    far.step();
    expect(far.calls.cutoff.at(-1).value).toBe(800);
    far.state.audioRef.current = {};
    expect(() => far.step(1 / 60)).not.toThrow();
  });
});

describe('siren spatial model', () => {
  it.each([
    { name: 'both vehicles approaching', listener: { x: 0, y: 0, heading: 0, speed: 10 },
      source: { x: 50, y: 0, heading: Math.PI, speed: 20 }, expected: 353 / 323 },
    { name: 'listener reversing toward a stationary source', listener: { x: 0, y: 0, heading: 0, speed: -20 },
      source: { x: -50, y: 0, heading: 0, speed: 0 }, expected: 363 / 343 },
    { name: 'source reversing away', listener: { x: 0, y: 0, heading: 0, speed: 0 },
      source: { x: -50, y: 0, heading: 0, speed: -20 }, expected: 343 / 363 },
    { name: 'transverse source motion', listener: { x: 0, y: 0, heading: 0, speed: 0 },
      source: { x: 0, y: 50, heading: 0, speed: 30 }, expected: 1 },
    { name: 'equal velocities with a lateral offset', listener: { x: 0, y: 0, heading: 0.7, speed: 18 },
      source: { x: 15, y: -45, heading: 0.7, speed: 18 }, expected: 1 },
  ])('handles $name using signed velocities', ({ listener, source, expected }) => {
    expect(RR.emergencySirenSpatialState(listener, source).dopplerScale).toBeCloseTo(expected, 12);
  });

  it.each([0, 0.35, -0.35, Math.PI / 2, Math.PI, 3 * Math.PI / 2, 6 * Math.PI, -7 * Math.PI])(
    'preserves the same cues when the complete encounter rotates %f radians', angle => {
      const listener = { x: 12, y: 6, heading: -0.4, speed: 8 };
      const source = { x: -17, y: 25, heading: 0.7, speed: 24 };
      const baseline = RR.emergencySirenSpatialState(listener, source);
      const rotate = actor => ({ ...actor,
        x: actor.x * Math.cos(angle) - actor.y * Math.sin(angle) + 123,
        y: actor.x * Math.sin(angle) + actor.y * Math.cos(angle) - 52,
        heading: actor.heading + angle });
      const actual = RR.emergencySirenSpatialState(rotate(listener), rotate(source));
      expect(actual.distance).toBeCloseTo(baseline.distance, 10);
      expect(actual.pan).toBeCloseTo(baseline.pan, 10);
      expect(actual.dopplerScale).toBeCloseTo(baseline.dopplerScale, 10);
    });

  it('centers sources directly ahead/behind and pans lateral sources consistently', () => {
    const listener = { x: 0, y: 0, heading: 0, speed: 0 };
    for (const [x, y, expected] of [[50, 0, 0], [-50, 0, 0], [0, 3, 1], [0, -3, -1], [300, 400, 0.8]]) {
      const cue = RR.emergencySirenSpatialState(listener, { x, y, heading: 0, speed: 0 });
      expect(cue.pan).toBeCloseTo(expected, 12);
      expect(cue.dopplerScale).toBe(1);
    }
  });

  it('keeps coincident, missing, and extreme telemetry finite and bounded', () => {
    const listener = { x: 0, y: 0, heading: 0, speed: 0 };
    expect(RR.emergencySirenSpatialState(listener, listener)).toEqual({ distance: 0, pan: 0, dopplerScale: 1 });
    expect(RR.emergencySirenSpatialState(null, null)).toEqual({ distance: 0, pan: 0, dopplerScale: 1 });
    for (const speed of [NaN, Infinity, -Infinity, -343, 343, -1e8, 1e8]) {
      const cue = RR.emergencySirenSpatialState({ ...listener, speed }, { x: 1, y: 0, heading: Math.PI, speed });
      expect(Number.isFinite(cue.dopplerScale)).toBe(true);
      expect(cue.dopplerScale).toBeGreaterThanOrEqual(0.5);
      expect(cue.dopplerScale).toBeLessThanOrEqual(2);
      expect(Math.abs(cue.pan)).toBeLessThanOrEqual(1);
    }
  });
});
