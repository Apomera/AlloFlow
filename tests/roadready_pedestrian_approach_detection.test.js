import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR, makeUpdater;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  const source = readFileSync('stem_lab/stem_tool_roadready.js', 'utf8');
  const start = source.indexOf('        var updatePeds = function(dt) {');
  const end = source.indexOf('        // scanSpatialHazards:', start);
  if (start < 0 || end < 0) throw new Error('Cannot locate live pedestrian updater');
  makeUpdater = new Function('scope', 'with (scope) { ' + source.slice(start, end) + '\nreturn updatePeds; }');
});

function approach({ theta = 0, direction = -1, turns = 0, reverse = false, ambient = false, sideways = false, away = false, rider = null, oppositeCurb = false }) {
  const world = theta ? { profile: { lanes: 2 }, spline: {
    centerAt: station => 48 + Math.tan(theta) * (station - 40), headingAt: () => theta,
  } } : null;
  const point = (station, lateral) => world ? RR.mainRoadWorldPoint(world, station, lateral)
    : { x: 48 + lateral, y: station };
  const side = direction < 0 ? 1 : -1;
  const pedestrianSide = oppositeCurb ? -side : side;
  const home = point(40, pedestrianSide * 4.5);
  const pedestrian = { ...home, homeX: home.x, homeY: home.y,
    vx: 0, vy: 0, kind: 'adult', crossing: false, waitingAtCrosswalk: true,
    crosswalkY: 40, crossDirection: pedestrianSide, sidewalkLeft: 43.5, sidewalkRight: 52.5,
    crossDwell: 0, _chunk: 0, _curvedRoadFrame: !!world, _roadStation: 40,
    _sidewalkLateral: pedestrianSide * 4.5, _sidewalkOffset: 4.5 };
  const travelDirection = away ? -direction : direction;
  const heading = sideways ? -theta : (travelDirection > 0 ? Math.PI / 2 : -Math.PI / 2) - theta;
  const vehicle = { ...point(40 - direction * 5, side * 1.75),
    heading: heading + turns * Math.PI * 2 + (reverse ? Math.PI : 0),
    speed: reverse ? -6 : 6, type: rider || 'car' };
  const scope = { ...RR, currentScenario: { id: 'residential' }, currentVehicle: { id: 'sedan' },
    signalsRef: { current: [{ type: 'stop', y: 40, _chunk: 0 }] }, trafficRef: { current: ambient ? [vehicle] : [] },
    cyclistsRef: { current: rider ? [vehicle] : [] }, carRef: { current: ambient || rider ? { x: 90, y: 90, heading: 0, speed: 0 } : vehicle },
    pedsRef: { current: [pedestrian] }, infiniteWorldRef: { current: world },
    timeRef: { current: 0 }, addToast: () => {} };
  return { pedestrian, vehicle, update: makeUpdater(scope) };
}

describe('live pedestrian look-both-ways detection uses actual signed road motion', () => {
  it('waits for ordinary forward approaches in either direction', () => {
    for (const direction of [-1, 1]) {
      const run = approach({ direction });
      run.update(1 / 60);
      expect(run.pedestrian.crossing).toBe(false);
    }
  });

  it.each([30, 60, 144])('leaves enough crossing time to avoid an adult stepping into a 6m/s vehicle at %i Hz', hz => {
    const run = approach({});
    run.vehicle.y = 50;
    let startedAt = null;
    for (let tick = 0; tick < hz * 3; tick++) {
      run.vehicle.y -= 6 / hz;
      run.update(1 / hz);
      if (run.pedestrian.crossing && startedAt === null) startedAt = (tick + 1) / hz;
      expect(RR.pointOverlapsVehicle(run.vehicle, RR.vehicleFootprint('sedan'), run.pedestrian, 0.28),
        `contact at ${(tick + 1) / hz}s`).toBe(false);
    }
    expect(startedAt).toBeGreaterThan(2);
    expect(startedAt).toBeLessThan(3);
  });

  it('looks across the full authored crossing span when traffic approaches the far lane', () => {
    for (const direction of [-1, 1]) {
      const run = approach({ direction, oppositeCurb: true });
      run.update(1 / 60);
      expect(run.pedestrian.crossing).toBe(false);
    }
  });

  it('allows the crossing when approaching traffic is far enough away to finish safely', () => {
    const run = approach({});
    run.vehicle.y = 100;
    run.update(1 / 60);
    expect(run.pedestrian.crossing).toBe(true);
  });

  it('uses the approaching front bumper when a long vehicle needs more clearance', () => {
    const car = approach({ ambient: true });
    const bus = approach({ ambient: true });
    car.vehicle.y = bus.vehicle.y = 91;
    bus.vehicle.type = 'schoolbus';
    car.update(1 / 60);
    bus.update(1 / 60);
    expect(car.pedestrian.crossing).toBe(true);
    expect(bus.pedestrian.crossing).toBe(false);
  });

  it.each(['cyclist', 'motorcycle'])('waits for an approaching %s in the same crossing corridor', rider => {
    for (const theta of [0, 0.35, -0.35]) for (const turns of [-1, 0, 1]) {
      const run = approach({ rider, theta, turns });
      run.update(1 / 60);
      expect(run.pedestrian.crossing).toBe(false);
    }
  });

  it.each(['cyclist', 'motorcycle'])('does not wait for a receding or already hit %s', rider => {
    const receding = approach({ rider, away: true, turns: -1 });
    receding.update(1 / 60);
    expect(receding.pedestrian.crossing).toBe(true);
    const hit = approach({ rider });
    hit.vehicle._hit = true;
    hit.update(1 / 60);
    expect(hit.pedestrian.crossing).toBe(true);
  });

  it.each([0, 0.35, -0.35])('waits for approaching traffic with equivalent headings on road tangent %s', theta => {
    for (const direction of [-1, 1]) for (const turns of [-2, -1, 0, 1, 2]) {
      for (const ambient of [false, true]) {
        const run = approach({ theta, direction, turns, ambient });
        run.update(1 / 60);
        expect(run.pedestrian.crossing, JSON.stringify({ direction, turns, ambient })).toBe(false);
      }
    }
  });

  it.each([0, 0.35, -0.35])('recognizes reversing approaches on road tangent %s', theta => {
    for (const direction of [-1, 1]) for (const turns of [-1, 0, 1]) {
      for (const ambient of [false, true]) {
        const run = approach({ theta, direction, turns, reverse: true, ambient });
        run.update(1 / 60);
        expect(run.pedestrian.crossing, JSON.stringify({ direction, turns, ambient })).toBe(false);
      }
    }
  });

  it.each([0, 0.35, -0.35])('does not wait for a vehicle travelling parallel to the crossing on tangent %s', theta => {
    for (const ambient of [false, true]) {
      const run = approach({ theta, sideways: true, ambient });
      run.update(1 / 60);
      expect(run.pedestrian.crossing).toBe(true);
    }
  });

  it.each([0, 0.35, -0.35])('does not wait for receding traffic despite angle wraps on tangent %s', theta => {
    for (const direction of [-1, 1]) for (const turns of [-1, 0, 1]) {
      const run = approach({ theta, direction, turns, away: true });
      run.update(1 / 60);
      expect(run.pedestrian.crossing, JSON.stringify({ direction, turns })).toBe(true);
    }
  });
});
