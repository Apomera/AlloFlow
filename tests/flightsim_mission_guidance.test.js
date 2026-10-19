import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let FS, portland;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
  portland = FS.WAYPOINTS.find(airport => airport.id === 'kpwm');
});

const state = (patch = {}) => ({ lat: portland.lat, lon: portland.lon,
  altitude: portland.alt + 50, fieldElev: portland.alt, heading: 0,
  vsi: 0, speed: 0, onGround: false, ...patch });
const rescue = (patch = {}) => ({ active: true, recovered: false, completed: false,
  survivorLat: portland.lat, survivorLon: portland.lon, hoistTime: 0, ...patch });
const photo = (patch = {}) => ({ name: 'North photo', lat: portland.lat,
  lon: portland.lon, captured: false, ...patch });
const survey = (patch = {}) => ({ active: true, completed: false, battery: 100,
  batteryExhausted: false, mode: 'aerial', launchLat: portland.lat,
  launchLon: portland.lon, photos: [photo()], capturedCount: 0,
  captureProgress: 0, ...patch });
const guide = (position, missions, telemetry = { gsKts: 0 }) =>
  FS.getFlightMissionGuidance(position, missions, telemetry);
const touchdown = (patch = {}) => state({ altitude: portland.alt, onGround: true,
  groundContact: { vsi: -2, speed: 0, rotorForwardFps: 0 }, ...patch });
const landingGuide = (position, missions) => guide(position, missions,
  FS.computeFlightTelemetry(position, { throttle: .5, pitch: 0, bank: 0 }, {}, 0, 0,
    null, null, FS.AIRCRAFT.find(aircraft => aircraft.id === (missions.rescue ? 'rescue_heli' : 'drone'))));
// A northward offset avoids longitude scaling, and leaves a margin around the
// strict distance boundary rather than relying on floating-point equality.
const northOf = (point, feet) => ({ lat: point.lat + feet / 6076.12 / 3440.065 * 180 / Math.PI,
  lon: point.lon });
const expectNoRoute = guidance => {
  expect(guidance.destination).toBeNull();
  expect(guidance.bearingDeg).toBeNull();
  expect(guidance.ready).toBe(false);
};

describe('mission guidance shares the actual target and capture conditions', () => {
  it('returns no guidance when no mission is active', () => {
    expect(guide(state(), {})).toBeNull();
    expect(guide(state(), { rescue: rescue({ active: false }), survey: survey({ active: false }) })).toBeNull();
  });

  it('reports the survivor, local AGL, complete rescue envelope, and bounded hold progress', () => {
    const current = rescue({ hoistTime: 2.5 });
    const result = guide(state(), { rescue: current });
    expect(result).toMatchObject({ kind: 'rescue', phase: 'target', aglFt: 50,
      groundSpeedKts: 0, verticalFpm: 0, ready: true, holdSeconds: 5,
      holdProgress: 2.5, destination: { name: 'Survivor', lat: portland.lat, lon: portland.lon } });
    expect(result.thresholds).toMatchObject({ radiusFt: 0.05 * 6076.12,
      minAglFt: 5, maxAglFt: 100, maxKts: 10, maxFpm: 200, holdSeconds: 5 });
    expect(result.gates).toMatchObject({ distance: true, height: true, speed: true, vertical: true });
    expect(result.distanceNm).toBeCloseTo(0, 8);
    expect(Number.isFinite(result.bearingDeg)).toBe(true);
    expect(guide(state(), { rescue: rescue({ hoistTime: 500 }) }).holdProgress).toBe(5);
    expect(guide(state(), { rescue: rescue({ hoistTime: -5 }) }).holdProgress).toBe(0);
    expect(Number.isFinite(guide(state(), { rescue: rescue({ hoistTime: NaN }) }).holdProgress)).toBe(true);
  });

  it.each([
    [{ altitude: 81 }, {}, 'height'], // 5 ft AGL, above a 76 ft field
    [{ altitude: 176 }, {}, 'height'],
    [{ vsi: 200 / 60 }, {}, 'vertical'],
    [{ vsi: -200 / 60 }, {}, 'vertical'],
    [{}, { gsKts: 10 }, 'speed'],
  ])('rejects a rescue boundary instead of promising capture: %j / %j', (patch, telemetry, gate) => {
    const result = guide(state(patch), { rescue: rescue() }, { gsKts: 0, ...telemetry });
    expect(result.ready).toBe(false);
    expect(result.gates[gate]).toBe(false);
  });

  it('uses the same rescue radius for distance guidance and readiness', () => {
    const inside = guide(state(northOf(portland, 0.049 * 6076.12)), { rescue: rescue() });
    const outside = guide(state(northOf(portland, 0.051 * 6076.12)), { rescue: rescue() });
    expect(inside.ready).toBe(true);
    expect(outside.ready).toBe(false);
    expect(outside.gates.distance).toBe(false);
    expect(outside.distanceFt).toBeCloseTo(outside.distanceNm * 6076.12, 8);
  });

  it('switches the recovered survivor route to PWM and requires a landing there', () => {
    const recovered = rescue({ recovered: true, survivorLat: portland.lat - 0.04, survivorLon: portland.lon + 0.07 });
    const enRoute = guide(state({ lat: portland.lat - 0.03 }), { rescue: recovered });
    expect(enRoute).toMatchObject({ phase: 'return', destination: { name: 'PWM', lat: portland.lat, lon: portland.lon },
      returnRadiusNm: 0.5, ready: false });
    expect(enRoute.bearingDeg).toBeCloseTo(0, 5);
    expect(guide(state(), { rescue: recovered }).ready).toBe(false);
    expect(landingGuide(touchdown(), { rescue: recovered }).ready).toBe(true);
    expect(landingGuide(touchdown(northOf(portland, 0.51 * 6076.12)), { rescue: recovered }).ready).toBe(false);
  });

  it.each([
    ['aerial', 50, 100, 8, 2],
    ['powerline', 30, 60, 5, 1.5],
  ])('uses the %s capture envelope for every readiness gate', (mode, radiusFt, maxAglFt, maxKts, holdSeconds) => {
    const mission = survey({ mode });
    const result = guide(state(), { survey: mission });
    expect(result).toMatchObject({ kind: mode, phase: 'target', targetIndex: 0,
      destination: { name: 'North photo' }, captured: 0, total: 1, ready: true, holdSeconds });
    expect(result.thresholds).toMatchObject({ radiusFt, minAglFt: 5, maxAglFt, maxKts, holdSeconds });
    expect(guide(state({ altitude: portland.alt + 5 }), { survey: mission }).ready).toBe(false);
    expect(guide(state({ altitude: portland.alt + maxAglFt }), { survey: mission }).ready).toBe(false);
    expect(guide(state(), { survey: mission }, { gsKts: maxKts }).ready).toBe(false);
    expect(guide(state(northOf(portland, radiusFt * 0.99)), { survey: mission }).ready).toBe(true);
    expect(guide(state(northOf(portland, radiusFt * 1.01)), { survey: mission }).ready).toBe(false);
    expect(guide(state(), { survey: survey({ mode, captureProgress: 100,
      captureTargetKey: mode + ':0:' + portland.lat + ':' + portland.lon }) }).holdProgress).toBe(holdSeconds);
    expect(guide(state(), { survey: survey({ mode, captureProgress: 100 }) }).holdProgress).toBe(0);
  });

  it('chooses the nearest uncaptured target, with stable ordering for an equal distance', () => {
    const photos = [photo({ captured: true, name: 'Already taken' }),
      photo({ name: 'Far target', ...northOf(portland, 300) }),
      photo({ name: 'Near target', ...northOf(portland, 20) }),
      photo({ name: 'Equal target', ...northOf(portland, 20) })];
    const result = guide(state(), { survey: survey({ photos }) });
    expect(result).toMatchObject({ targetIndex: 2, destination: { name: 'Near target' }, captured: 1, total: 4 });
  });

  it('derives progress and return phase from captured targets, ignoring a stale saved counter', () => {
    const unfinished = guide(state({ onGround: true }), { survey: survey({ capturedCount: 500 }) });
    expect(unfinished).toMatchObject({ phase: 'target', captured: 0, total: 1 });
    const finished = survey({ capturedCount: 0, photos: [photo({ captured: true })] });
    expect(guide(state(), { survey: finished })).toMatchObject({ phase: 'return', captured: 1,
      total: 1, returnRadiusNm: 0.2, ready: false,
      destination: { name: 'Launch point', lat: portland.lat, lon: portland.lon } });
    expect(landingGuide(touchdown(), { survey: finished }).ready).toBe(true);
    expect(landingGuide(touchdown(northOf(portland, 0.21 * 6076.12)), { survey: finished }).ready).toBe(false);
  });

  it.each([
    ['an empty list', () => []],
    ['a missing list', () => null],
    ['a null target', () => [null]],
    ['a nonfinite latitude', () => [photo({ lat: NaN })]],
    ['an invalid longitude', () => [photo({ lon: 181 })]],
    ['a malformed remaining target', () => [photo({ captured: true }), photo({ lat: undefined })]],
  ])('never treats %s as a completed survey', (_name, makePhotos) => {
    const photos = makePhotos();
    const result = guide(state({ onGround: true }), { survey: survey({ photos, capturedCount: 500 }) });
    expect(result.phase).toBe('unavailable');
    expectNoRoute(result);
  });

  it('clears route and readiness on complete or depleted missions even with stale target progress', () => {
    for (const mission of [
      { rescue: rescue({ completed: true, hoistTime: 5 }) },
      { survey: survey({ completed: true, captureProgress: 2 }) },
      { survey: survey({ batteryExhausted: true, captureProgress: 2 }) },
      { survey: survey({ battery: 0, captureProgress: 2 }) },
    ]) {
      const result = guide(state({ onGround: true }), mission);
      expect(['complete', 'depleted']).toContain(result.phase);
      expectNoRoute(result);
    }
  });

  it.each([{ lat: NaN }, { lat: 91 }, { lon: Infinity }, { lon: -181 }])('rejects corrupt aircraft coordinates: %j', patch => {
    for (const mission of [{ rescue: rescue() }, { survey: survey() }]) {
      const result = guide(state(patch), mission);
      expect(result.phase).toBe('unavailable');
      expectNoRoute(result);
    }
  });

  it('rejects corrupt rescue or return destinations', () => {
    const outbound = guide(state(), { rescue: rescue({ survivorLat: Infinity }) });
    expect(outbound.phase).toBe('unavailable');
    expectNoRoute(outbound);
    const returning = guide(state(), { survey: survey({ launchLon: undefined, photos: [photo({ captured: true })] }) });
    expect(returning.phase).toBe('unavailable');
    expectNoRoute(returning);
  });

  it('withholds capture when telemetry or local-height evidence is missing or nonfinite', () => {
    for (const patch of [{ altitude: undefined }, { altitude: NaN }, { fieldElev: undefined }, { fieldElev: Infinity }]) {
      expect(guide(state(patch), { rescue: rescue() }).ready).toBe(false);
      expect(guide(state(patch), { survey: survey() }).ready).toBe(false);
    }
    for (const gsKts of [undefined, NaN, Infinity, -1]) {
      expect(guide(state(), { rescue: rescue() }, { gsKts }).ready).toBe(false);
      expect(guide(state(), { survey: survey() }, { gsKts }).ready).toBe(false);
    }
    expect(guide(state({ vsi: undefined }), { rescue: rescue() }).ready).toBe(false);
    expect(guide(state({ vsi: Infinity }), { rescue: rescue() }).ready).toBe(false);
  });

  it('keeps route arithmetic finite across the dateline and does not mutate mission evidence', () => {
    const current = rescue({ survivorLat: 0, survivorLon: -179.99 });
    const before = structuredClone(current);
    const result = guide(state({ lat: 0, lon: 179.99 }), { rescue: current });
    expect(result.bearingDeg).toBeCloseTo(90, 6);
    expect(result.distanceNm).toBeGreaterThan(1);
    expect(result.distanceNm).toBeLessThan(1.3);
    expect(current).toEqual(before);
    const mission = survey({ photos: [photo({ captured: true }), photo({ name: 'Next' })], capturedCount: 500 });
    const surveyBefore = structuredClone(mission);
    guide(state(), { survey: mission });
    expect(mission).toEqual(surveyBefore);
  });
});
