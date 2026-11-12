import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR, makeUpdater;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  const source = readFileSync('stem_lab/stem_tool_roadready.js', 'utf8');
  const start = source.indexOf('        var updateTraffic = function(dt) {');
  const end = source.indexOf('        var updateWildlife = function(dt)', start);
  if (start < 0 || end < 0) throw new Error('Cannot locate production traffic update');
  makeUpdater = new Function('scope', 'with(scope) {' + source.slice(start, end) + '\nreturn updateTraffic;}');
});

function queue({ direction = -1, theta = 0, reversed = false, control = 'rail' } = {}) {
  const profile = { roadHalfWidth: 3.5, lanes: 2 };
  const world = { profile, chunks: {}, getChunk: () => profile, spline: {
    centerAt: station => 48 + Math.tan(theta) * (station - 50),
    headingAt: () => theta,
  } };
  const crossing = { centerX: 48, centerY: 50, heading: theta, halfWidth: 3.2,
    activeControl: true, chunkIdx: 1, cycleOffset: 0 };
  const light = { x: 48, y: 50, type: control === 'stop' ? 'stop' : 'light',
    state: control === 'stop' ? 'stop' : 'red', _chunk: 1 };
  if (control === 'rail') world._railroadCrossings = [crossing];
  const lane = -direction * 1.6;
  const heading = (direction > 0 ? Math.PI / 2 : -Math.PI / 2) - theta;
  const stopStation = control === 'rail' ? 50 : 50 - direction * 4.1;
  const leadDistance = control === 'rail' ? 0.77 + 5 + 5.3 : 5 + 0.7;
  const actors = ['schoolbus', 'car', 'schoolbus'].map((type, index) => {
    const station = stopStation - direction * (leadDistance + index * 12) * Math.cos(theta);
    return { ...RR.mainRoadWorldPoint(world, station, lane), heading, type, id: 'control-queue-' + index,
      laneOffset: lane, speed: index === 0 ? 0 : 8, _busCycleTimer: 1000,
      personality: { followMult: 1, speedBias: 1, aggro: 0, rollsStops: 0 } };
  });
  const scope = { ...RR, RR_CURB_YIELD_HOLD_MAX: 4,
    trafficRef: { current: reversed ? actors.slice().reverse() : actors },
    infiniteWorldRef: { current: world }, currentScenario: { id: 'rural', speedLimit: 35, weather: 'clear' },
    currentVehicle: { id: 'sedan' }, carRef: { current: { x: 100, y: 50, heading: 0, speed: 0 } },
    pedsRef: { current: [] }, signalsRef: { current: control === 'rail' ? [] : [light] },
    cyclistsRef: { current: [] }, emergencyRef: { current: null },
    statsRef: { current: { safetyScore: 100, crashes: 0 } }, timeRef: { current: 21 },
    stopSignQueueRef: { current: {} }, intersectionReservationRef: { current: {} },
    addToast() {}, speak() {}, audioRef: { current: {} }, eventToastRef: { current: null },
  };
  const update = makeUpdater(scope);
  const frontGap = actor => {
    const size = RR.vehicleFootprint(actor.type);
    const reach = (Math.abs(Math.sin(actor.heading + theta)) * size.length +
      Math.abs(Math.cos(actor.heading + theta)) * size.width) / 2;
    const centerGap = -direction * ((actor.x - crossing.centerX) * Math.sin(theta) +
      (actor.y - crossing.centerY) * Math.cos(theta));
    if (control === 'rail') return centerGap - reach - 0.77;
    const front = RR.mainRoadLocalPoint(world,
      actor.x + Math.cos(actor.heading) * size.length / 2,
      actor.y + Math.sin(actor.heading) * size.length / 2);
    return (stopStation - front.longitudinal) * direction / Math.cos(theta);
  };
  const contact = () => actors.some((actor, index) => actors.slice(index + 1).some(other =>
    RR.vehicleRectsOverlap(actor, RR.vehicleFootprint(actor.type), other, RR.vehicleFootprint(other.type))));
  return { scope, actors, light, world, stopStation, frontGap, contact, step: dt => update(dt) };
}

describe('traffic queues protect complete vehicle bodies at stop controls', () => {
  it.each([30, 60, 144])('holds a mixed bus/car queue clear at %i Hz, then releases it', hz => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      for (const control of ['rail', 'light']) for (const direction of [-1, 1]) {
        for (const theta of [0, 0.35, -0.35]) for (const reversed of [false, true]) {
          const run = queue({ direction, theta, reversed, control });
          const description = JSON.stringify({ hz, control, direction, theta, reversed });
          let contacts = 0, closest = Infinity;
          for (let frame = 0; frame < hz * 6; frame++) {
            run.step(1 / hz);
            closest = Math.min(closest, run.frontGap(run.actors[0]));
            if (run.contact()) contacts++;
          }
          expect(contacts, description).toBe(0);
          expect(closest, description).toBeGreaterThanOrEqual(control === 'rail' ? 15 * 0.3048 : -1e-6);
          expect(run.actors.every(actor => actor.speed < 0.15), description).toBe(true);
          run.scope.timeRef.current = 35;
          run.light.state = 'green';
          const passed = run.actors.map(() => false);
          for (let frame = 0; frame < hz * 12 && !passed.every(Boolean); frame++) {
            run.step(1 / hz);
            for (let index = 0; index < passed.length; index++) {
              passed[index] ||= run.frontGap(run.actors[index]) < -12;
            }
            if (run.contact()) contacts++;
          }
          expect(contacts, description).toBe(0);
          expect(passed, description).toEqual([true, true, true]);
        }
      }
    } finally { random.mockRestore(); }
  });

  it('uses the stronger defensive headway tier below a safety score of 50', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      for (const [score, gap, expected] of [[49, 62, 1], [50, 62, 0],
        [50, 50, 1], [69, 50, 1], [70, 50, 0]]) {
        const run = queue();
        run.scope.infiniteWorldRef.current._railroadCrossings = [];
        run.scope.statsRef.current.safetyScore = score;
        const [follower, leader] = run.actors;
        Object.assign(follower, { type: 'car', x: 49.6, y: 73, speed: 10 });
        Object.assign(leader, { x: 49.6, y: 73 - gap, speed: 10 });
        run.scope.trafficRef.current = [follower, leader];
        run.step(1 / 60);
        expect(follower._slowFor, 'safety score ' + score).toBe(expected);
      }
    } finally { random.mockRestore(); }
  });

  it.each([30, 60, 144])('keeps moving vehicles short of the red stop bar, including a late warning at %i Hz', hz => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      for (const type of ['car', 'schoolbus']) for (const direction of [-1, 1]) {
        for (const theta of [0, 0.35, -0.35]) for (const gap of [0.5, 18, 38]) {
          const run = queue({ direction, theta, control: 'light' });
          const actor = run.actors[0];
          const station = run.stopStation - direction * (gap + RR.vehicleFootprint(type).length / 2) * Math.cos(theta);
          Object.assign(actor, RR.mainRoadWorldPoint(run.world, station, -direction * 1.6),
            { type, speed: 13.4, heading: direction * Math.PI / 2 - theta });
          run.scope.trafficRef.current = [actor];
          let closest = Infinity;
          for (let frame = 0; frame < hz * 7; frame++) {
            run.step(1 / hz);
            closest = Math.min(closest, run.frontGap(actor));
          }
          const description = JSON.stringify({ hz, type, direction, theta, gap });
          expect(closest, description).toBeGreaterThanOrEqual(0.24);
          expect(actor.speed, description).toBeLessThan(0.1);
        }
      }
    } finally { random.mockRestore(); }
  });

  it.each([30, 60, 144])('requires every queued driver to stop at its own painted line at %i Hz', hz => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      for (const direction of [-1, 1]) for (const theta of [0, 0.35, -0.35]) {
        const run = queue({ direction, theta, control: 'stop' });
        const dt = 1 / hz, stoppedSeconds = [0, 0, 0], passed = [false, false, false];
        const description = JSON.stringify({ hz, direction, theta });
        for (let frame = 0; frame < hz * 18 && !passed.every(Boolean); frame++) {
          run.step(dt);
          for (let index = 0; index < run.actors.length; index++) {
            const actor = run.actors[index], gap = run.frontGap(actor);
            if (!passed[index] && gap >= 0 && gap < 1.5 && actor.speed < 0.4) stoppedSeconds[index] += dt;
            if (gap < -0.1 && !passed[index]) {
              passed[index] = true;
              expect(stoppedSeconds[index], description + ' actor ' + index).toBeGreaterThanOrEqual(1.2);
            }
            if (frame === Math.floor(hz * 0.3) && index > 0) {
              expect(actor._stopArrivedAt || 0, description).toBe(0);
            }
          }
          expect(run.contact(), description).toBe(false);
          run.scope.timeRef.current += dt;
        }
        expect(passed, description + JSON.stringify(run.actors.map(actor => ({
          gap: run.frontGap(actor), speed: actor.speed, arrived: actor._stopArrivedAt,
          released: actor._stopReleasedAt, wait: actor._stopWaitTarget,
        })))).toEqual([true, true, true]);
      }
    } finally { random.mockRestore(); }
  });

  it.each([-1, 1])('clears arrival priority when a stopped bus moves back into the queue in direction %i', direction => {
    const run = queue({ direction, control: 'stop' });
    const actor = run.actors[0];
    run.scope.trafficRef.current = [actor];
    run.step(1 / 60);
    expect(actor._stopArrivedAt).toBe(21);
    Object.assign(actor, RR.mainRoadWorldPoint(run.world,
      run.stopStation - direction * (5 + 3), -direction * 1.6),
    { heading: direction * Math.PI / 2, speed: 0 });
    run.scope.timeRef.current = 22;
    run.step(1 / 60);
    expect(actor._stopArrivedAt).toBe(0);
    expect(actor._stopWaitTarget).toBeNull();
  });
});
