// pd38: a walker facing WALK starts to cross unless a driver can no longer stop short of the crossing
// (29-A section 2057(6)(A): "A pedestrian facing a 'walk' signal may proceed across the way ... and must be given
// the right-of-way"; section 2056(6)(C): a pedestrian may not "suddenly leave a curb ... into the path of a vehicle
// that is so close that it is impossible for the operator to yield"). Base waited for any driver within the whole
// crossing time (13 s on a four-lane road), also drivers stopping for their red, and those drivers waited for it.
// The live updatePeds is cut from the tool and run as written.
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
let RR, makeUpdater;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(SRC, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  const source = readFileSync(SRC, 'utf8');
  const start = source.indexOf('        var updatePeds = function(dt) {');
  const end = source.indexOf('        // scanSpatialHazards:', start);
  if (start < 0 || end < 0) throw new Error('Cannot locate live pedestrian updater');
  makeUpdater = new Function('scope', 'with (scope) { ' + source.slice(start, end) + '\nreturn updatePeds; }');
});

// A walker at the left kerb of a 9 m crossing at station 40; a vehicle in the right lane coming up the road (+station).
function scene({ walk = true, signal = 'light', gap = 60, speed = 13.4, learner = false, turning = false, kind = 'adult' } = {}) {
  const pedestrian = { x: -4.5, y: 40, homeX: -4.5, homeY: 40, vx: 0, vy: 0, kind, crossing: false,
    waitingAtCrosswalk: true, crosswalkY: 40, _chunk: 0, crossDirection: -1, sidewalkLeft: -4.5, sidewalkRight: 4.5,
    crossDwell: 0, dartCooldown: 99 };
  const vehicle = { id: 'ai', type: 'car', x: 1.5, y: 40 - gap, heading: Math.PI / 2, speed, _turning: turning };
  const car = learner ? { x: 1.5, y: 40 - gap, heading: Math.PI / 2, speed } : { x: 80, y: 80, heading: 0, speed: 0 };
  const scope = { ...RR, currentScenario: { id: 'residential', weather: 'clear', speedLimit: 30 }, currentVehicle: { id: 'sedan' },
    signalsRef: { current: signal ? [{ type: signal, y: 40, x: 0, _chunk: 0 }] : [] },
    trafficRef: { current: learner ? [] : [vehicle] }, cyclistsRef: { current: [] }, carRef: { current: car },
    pedsRef: { current: [pedestrian] }, infiniteWorldRef: { current: null }, timeRef: { current: 0 }, addToast: () => {},
    pedestrianSignalState: () => ({ walk }) };
  return { pedestrian, update: makeUpdater(scope) };
}
const bumper = (gap) => gap - RR.vehicleFootprint('car').length / 2 - 0.28;
const aiStop = (v) => v * 0.75 + v * v / (2 * 3.5); // trafficPedestrianControl: 3.5 m/s2 and 0.75 s

describe('Road Ready pd38: a walker on WALK is not held by drivers who can stop', () => {
  it('starts on WALK with an AI driver 60 m away at 30 mph, who can stop in 35.7 m (base: waited)', () => {
    expect(bumper(60)).toBeGreaterThan(aiStop(13.4));
    const s = scene({ gap: 60 });
    s.update(1 / 30);
    expect(s.pedestrian.crossing).toBe(true);
  });

  it('starts on WALK when the learner can still stop by the tool stopping model (base: waited)', () => {
    const need = RR.stoppingDistance(13.4 * RR.MS_TO_MPH, 'clear').total_ft / RR.FT_PER_M;
    const gap = need + RR.vehicleFootprint('car').length / 2 + 0.28 + 3;
    expect(gap / 13.4).toBeLessThan(9 / 1.2 + 0.5); // inside the old crossing-time window
    const s = scene({ learner: true, gap });
    s.update(1 / 30);
    expect(s.pedestrian.crossing).toBe(true);
  });

  it('still waits for a driver who can no longer stop short of the crossing (AI and learner)', () => {
    expect(bumper(30)).toBeLessThan(aiStop(13.4));
    const ai = scene({ gap: 30 }); ai.update(1 / 30); expect(ai.pedestrian.crossing).toBe(false);
    const need = RR.stoppingDistance(13.4 * RR.MS_TO_MPH, 'clear').total_ft / RR.FT_PER_M;
    const me = scene({ learner: true, gap: need + RR.vehicleFootprint('car').length / 2 + 0.28 - 3 });
    me.update(1 / 30); expect(me.pedestrian.crossing).toBe(false);
  });

  it('still waits for a turning driver within the crossing time (vehicles lawfully in the junction, MUTCD 4A.06 B)', () => {
    const s = scene({ gap: 60, turning: true }); s.update(1 / 30); expect(s.pedestrian.crossing).toBe(false);
  });

  it("does not start on DON'T WALK, even with the road empty", () => {
    const s = scene({ walk: false, gap: 500, speed: 0 });
    for (let i = 0; i < 90; i++) s.update(1 / 30);
    expect(s.pedestrian.crossing).toBe(false);
  });

  it('keeps the gap rule where there is no signal (a driver 60 m away at 30 mph holds the walker)', () => {
    const s = scene({ signal: null, gap: 60 }); s.update(1 / 30); expect(s.pedestrian.crossing).toBe(false);
    const far = scene({ signal: null, gap: 200 }); far.update(1 / 30); expect(far.pedestrian.crossing).toBe(true);
  });

  it('rrCrosswalkStopMeters: the AI yield rate, and the learner stopping model', () => {
    expect(RR.rrCrosswalkStopMeters(13.4, false, 'clear')).toBeCloseTo(aiStop(13.4), 10);
    expect(RR.rrCrosswalkStopMeters(13.4, true, 'rain')).toBeCloseTo(RR.stoppingDistance(13.4 * RR.MS_TO_MPH, 'rain').total_ft / RR.FT_PER_M, 10);
    expect(RR.rrCrosswalkStopMeters(0, false, 'clear')).toBe(0);
  });
});
