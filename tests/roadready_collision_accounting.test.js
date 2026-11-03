import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR, makeTrafficUpdate, makeCollisionCheck;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  const source = readFileSync('stem_lab/stem_tool_roadready.js', 'utf8');
  const trafficStart = source.indexOf('        var updateTraffic = function(dt) {');
  const trafficEnd = source.indexOf('        var updateWildlife = function(dt)', trafficStart);
  const collisionStart = source.indexOf('        var checkCollisions = function');
  const collisionEnd = source.indexOf('        var threeReady =', collisionStart);
  if ([trafficStart, trafficEnd, collisionStart, collisionEnd].some(index => index < 0)) {
    throw new Error('Cannot locate production traffic and collision handlers');
  }
  makeTrafficUpdate = new Function('scope', 'with(scope) {' + source.slice(trafficStart, trafficEnd) + '\nreturn updateTraffic;}');
  makeCollisionCheck = new Function('scope', 'with(scope) {' + source.slice(collisionStart, collisionEnd) + '\nreturn checkCollisions;}');
});

function collisionFixture(player, other, historySpeed = 0) {
  const stats = { crashes: 0, aiCausedCrashes: 0, safetyScore: 100, efficiencyScore: 100,
    distance: 1200, closeFollows: 0, driveEvents: [], _lastEvent: {} };
  const scope = { ...RR, currentVehicle: { id: 'sedan', mass: 1550 },
    currentScenario: { id: 'residential', speedLimit: 25, weather: 'clear' },
    trafficRef: { current: [other] }, carRef: { current: player },
    signalsRef: { current: [] }, pedsRef: { current: [] }, cyclistsRef: { current: [] },
    emergencyRef: { current: null }, infiniteWorldRef: { current: null },
    statsRef: { current: stats }, timeRef: { current: 6 },
    blackBoxRef: { current: [{ t: 5, speed: historySpeed }] },
    stopSignQueueRef: { current: {} }, intersectionReservationRef: { current: {} },
    eventToastRef: { current: null }, audioRef: { current: {} }, crashFxRef: { current: [] },
    addToast() {}, speak() {}, showDriveAlert() {},
  };
  expect(RR.vehicleRectsOverlap(player, RR.vehicleFootprint('sedan'), other, RR.vehicleFootprint(other.type))).toBe(true);
  return { player, other, stats, scope, update: makeTrafficUpdate(scope), check: makeCollisionCheck(scope) };
}

function rearEnd(historySpeed = 0, playerSpeed = 0) {
  return collisionFixture(
    { x: 49.5, y: 50, heading: -Math.PI / 2, speed: playerSpeed },
    { id: 'rear-car', type: 'car', x: 49.5, y: 51, heading: -Math.PI / 2, laneOffset: 1.5, speed: 5 },
    historySpeed);
}

describe('one physical collision produces one correctly attributed event', () => {
  it('counts one AI-caused rear-end and preserves a qualifying learner grade', () => {
    const run = rearEnd();
    run.update(1 / 60);
    run.check(0); // The generic detector sees the same contact in the live frame.
    expect(run.stats.crashes).toBe(1);
    expect(run.stats.aiCausedCrashes).toBe(1);
    expect(run.stats.safetyScore).toBe(98);
    const evidence = RR.rrSessionEvidence(run.stats, 180);
    const result = RR.rrDriveOutcome(run.stats, evidence);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(98);
    expect(RR.roadTestOutcome({ durationSec: 240, score: 95, startedAtSim: 0 }, run.stats, 300).passed).toBe(true);
  });

  it('counts one learner-attributed rear-end and keeps the critical grading result', () => {
    const run = rearEnd(10);
    run.update(1 / 60);
    run.check(0);
    expect(run.stats.crashes).toBe(1);
    expect(run.stats.aiCausedCrashes).toBe(0);
    expect(run.stats.safetyScore).toBe(85);
    expect(RR.roadTestOutcome({ durationSec: 240, score: 95, startedAtSim: 0 }, run.stats, 300)
      .criticalEvents.learnerFaultCrashes).toBe(1);
  });

  it.each([5, 8])('does not count existing rear overlap while the learner moves away at %i m/s', playerSpeed => {
    const run = rearEnd(0, playerSpeed);
    run.update(1 / 60);
    run.check(0);
    expect(run.stats.crashes).toBe(0);
    expect(run.stats.aiCausedCrashes).toBe(0);
  });
});

describe('traffic impact velocity follows the existing mass-weighted inelastic model', () => {
  it('shares velocity in the special rear-end path and counts subsequent contact frames only once', () => {
    const run = rearEnd(20, 20);
    run.other.speed = 21;
    const dt = 1 / 60;
    const expected = (20 + (21 - 8 * dt)) / 2; // AI applies emergency braking before contact.
    run.update(dt);
    expect(run.player.speed).toBeCloseTo(expected, 10);
    expect(run.other.speed).toBeCloseTo(expected, 10);
    expect(run.stats.crashes).toBe(1);
    expect(run.stats.aiCausedCrashes).toBe(1);
    // The cars still overlap following separation. Closing resumes before the
    // generic detector and next traffic frame, inside the shared cooldown.
    run.other.speed += 1;
    run.check(dt);
    run.scope.timeRef.current += dt;
    run.update(dt);
    run.check(dt);
    expect(run.stats.crashes).toBe(1);
    expect(run.stats.aiCausedCrashes).toBe(1);
  });

  it.each([0, Math.PI / 2])('retains common road speed after a small same-direction impact at heading %s', heading => {
    const run = collisionFixture({ x: 48, y: 48, heading, speed: 21 },
      { id: 'lead', type: 'car', x: 48 + Math.cos(heading) * 4,
        y: 48 + Math.sin(heading) * 4, heading, speed: 20 });
    run.check(0);
    expect(run.stats.crashes).toBe(1);
    expect(run.player.speed).toBeCloseTo(20.5, 10);
    expect(run.other.speed).toBeCloseTo(20.5, 10);
    expect(run.stats.safetyScore).toBe(90);
  });

  it('cancels equal and opposite momentum in a head-on contact', () => {
    const run = collisionFixture({ x: 48, y: 48, heading: 0, speed: 20 },
      { id: 'oncoming', type: 'car', x: 52, y: 48, heading: Math.PI, speed: 20 });
    run.check(0);
    expect(run.stats.crashes).toBe(1);
    expect(run.player.speed).toBeCloseTo(0, 10);
    expect(run.other.speed).toBeCloseTo(0, 10);
  });

  it('uses both masses and projects signed velocity after unequal opposing impacts', () => {
    const run = collisionFixture({ x: 48, y: 48, heading: 0, speed: 20 },
      { id: 'oncoming-truck', type: 'truck', x: 52, y: 48, heading: Math.PI, speed: 5 });
    const expected = (1550 * 20 - 2300 * 5) / (1550 + 2300);
    run.check(0);
    expect(run.stats.crashes).toBe(1);
    expect(run.player.speed).toBeCloseTo(expected, 10);
    expect(run.other.speed).toBeCloseTo(-expected, 10);
  });
});
