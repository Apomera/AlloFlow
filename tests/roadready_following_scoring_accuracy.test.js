import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR, makeChecker;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  const source = readFileSync('stem_lab/stem_tool_roadready.js', 'utf8');
  const start = source.indexOf('        var checkCollisions = function');
  const end = source.indexOf('        var threeReady =', start);
  if (start < 0 || end < 0) throw new Error('Cannot locate live collision/following assessor');
  makeChecker = new Function('scope', 'with (scope) { ' + source.slice(start, end) + '\nreturn checkCollisions; }');
});

function fixture({ gap = 10, playerType = 'sedan', leadType = 'car', theta = 0, lateral = 0 } = {}) {
  const world = theta ? { profile: { lanes: 2 }, spline: {
    centerAt: station => Math.tan(theta) * station, headingAt: () => theta,
  } } : null;
  const heading = Math.PI / 2 - theta;
  const car = { x: 0, y: 0, heading, speed: 10 };
  const lead = { x: Math.sin(theta) * gap + Math.cos(theta) * lateral,
    y: Math.cos(theta) * gap - Math.sin(theta) * lateral, heading,
    speed: 10, type: leadType, id: 'lead' };
  const stats = { safetyScore: 100, closeFollows: 0, crashes: 0,
    simTime: 0, driveEvents: [], _lastEvent: {} };
  const scope = { ...RR, currentVehicle: { id: playerType, mass: 1500 },
    currentScenario: { id: 'residential', weather: 'clear', speedLimit: 25 },
    carRef: { current: car }, trafficRef: { current: [lead] },
    pedsRef: { current: [] }, emergencyRef: { current: null },
    infiniteWorldRef: { current: world }, statsRef: { current: stats },
    timeRef: { current: 10 }, crashFxRef: { current: [] },
    addToast: () => {}, showDriveAlert: () => {} };
  const check = makeChecker(scope);
  return { car, lead, stats, scope, check,
    run(seconds, hz) {
      for (let tick = 0; tick < Math.round(seconds * hz); tick++) {
        scope.timeRef.current += 1 / hz;
        stats.simTime += 1 / hz;
        check(1 / hz);
      }
      return stats;
    } };
}

describe('live following-distance scoring uses time and physical clearance', () => {
  it('deducts the same score for the same two-second following episode at 30/60/144 Hz', () => {
    const results = [30, 60, 144].map(hz => fixture().run(2, hz));
    expect(results[0].safetyScore).toBeCloseTo(results[1].safetyScore, 8);
    expect(results[2].safetyScore).toBeCloseTo(results[1].safetyScore, 8);
    expect(results[1].safetyScore).toBeLessThan(100);
    for (const result of results) {
      expect(result.closeFollows).toBe(1);
      expect(result.driveEvents.filter(event => event.type === 'tailgate')).toHaveLength(1);
      expect(result.crashes).toBe(0);
    }
  });

  it.each([
    { playerType: 'sedan', leadType: 'schoolbus' },
    { playerType: 'schoolbus', leadType: 'car' },
  ])('uses both bodies for a $playerType learner behind a $leadType', ({ playerType, leadType }) => {
    const run = fixture({ gap: 20, playerType, leadType });
    run.run(0.1, 60);
    expect(run.stats.closeFollows).toBe(1);
    expect(run.stats.safetyScore).toBeLessThan(100);
  });

  it('does not apply the severe penalty to a sedan at 15.5 m clear space and 10 m/s', () => {
    const run = fixture({ gap: 20 });
    run.run(1, 60);
    expect(run.stats.safetyScore).toBe(100);
    expect(run.stats.closeFollows).toBe(0);
  });

  it('records bumper clearance in the tailgating event instead of center spacing', () => {
    const run = fixture({ gap: 10 });
    run.check(1 / 60);
    const event = run.stats.driveEvents.find(entry => entry.type === 'tailgate');
    expect(event).toBeDefined();
    expect(event.leadDistanceFt).toBe(18); // 5.5m clear space between two sedan bodies.
  });

  it.each([0.35, -0.35])('keeps the same physical safe gap on a road rotated by %s radians', theta => {
    const run = fixture({ gap: 20, theta });
    run.run(1, 60);
    expect(run.stats.safetyScore).toBe(100);
    expect(run.stats.closeFollows).toBe(0);
  });

  it('measures following space along a short bend rather than its chord or station difference', () => {
    const run = fixture();
    // x = 0.03*y² has 20.001 m of road between these stations, while the
    // endpoint chord is only 19.460 m. The two sedans retain 15.501 m of space.
    const station = 17.277;
    run.scope.infiniteWorldRef.current = { profile: { lanes: 2 }, spline: {
      centerAt: s => 0.03 * s * s,
      headingAt: s => Math.atan(0.06 * s),
    } };
    Object.assign(run.lead, { x: 0.03 * station * station, y: station,
      heading: Math.PI / 2 - Math.atan(0.06 * station) });
    run.run(1, 60);
    expect(run.stats.safetyScore).toBe(100);
    expect(run.stats.closeFollows).toBe(0);
  });

  it('selects the nearest rear bumper when a longer vehicle has a farther center', () => {
    const run = fixture({ gap: 20 });
    run.scope.trafficRef.current.push({ ...run.lead, id: 'long-lead', type: 'schoolbus', y: 21 });
    run.check(1 / 60);
    expect(run.stats.closeFollows).toBe(1);
    expect(run.stats.driveEvents.find(event => event.type === 'tailgate')?.leadDistanceFt).toBe(45);
  });

  it('does not deduct score without elapsed simulation time', () => {
    const run = fixture();
    run.check(0);
    run.check();
    expect(run.stats.safetyScore).toBe(100);
  });

  it('does not score an adjacent-lane vehicle as a lead vehicle', () => {
    const run = fixture({ gap: 10, lateral: 3.5 });
    run.run(2, 60);
    expect(run.stats.safetyScore).toBe(100);
    expect(run.stats.closeFollows).toBe(0);
  });

  it('does not score oncoming traffic as following too closely', () => {
    const run = fixture({ gap: 10 });
    run.lead.heading += Math.PI;
    run.run(0.5, 60);
    expect(run.stats.safetyScore).toBe(100);
    expect(run.stats.closeFollows).toBe(0);
  });
});
