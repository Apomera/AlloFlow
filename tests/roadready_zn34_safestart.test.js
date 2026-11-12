import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 34, zone lane (zn34): the Free Explore night crash (round 33, 1 of 5 seeds) and two Free Explore
// crashes in this round's sweep had one cause. At the start, the SAFE-START pass moves every driver near
// the learner to a random point 30 to 60 m out, without looking at who is already there. In the recorder
// a school bus and a car were left 1.4 m apart in one lane; when the drive began the overlap pass pushed
// the bus sideways over the centre line (lateral -0.4 instead of -1.6) and the learner met it at the first
// light. rrClearSpawnStation moves the target on until it is clear of every driver going the same way.

const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const src = readFileSync(TOOL, 'utf8');
let RR;
const pose = (world, station, lateral, dir) => { const p = RR.mainRoadWorldPoint(world, station, lateral); return { x: p.x, y: p.y, heading: (dir > 0 ? Math.PI / 2 : -Math.PI / 2) - p.heading }; };

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

describe('Road Ready zn34: drivers moved away from the learner at the start are not put on top of another', () => {
  it('the recorded case: a car sent to 1.4 m behind a school bus in the same lane goes on past it', () => {
    const world = RR.createScenarioWorld(RR.SCENARIOS.find((s) => s.id === 'suburban'));
    const lane = RR.scenarioRoadLayout('suburban').laneCenters[0];
    const bus = Object.assign(pose(world, 39.21, -lane, 1), { type: 'schoolbus', _roadStation: 39.21 });
    const car = Object.assign(pose(world, 37.82, -lane, 1), { type: 'car', _roadStation: 37.82 });
    const oncoming = Object.assign(pose(world, 30, lane, -1), { type: 'car', _roadStation: 30 }); // the other way: not in the way
    const need = (RR.vehicleFootprint('schoolbus').length + RR.vehicleFootprint('car').length) / 2 + 3;
    // the learner is at station 97 travelling -1, so "farther out" for an oncoming driver is toward -station
    const st = RR.rrClearSpawnStation(world, [bus, car, oncoming], car, 37.82, -1);
    expect(st).toBeLessThanOrEqual(39.21 - need);
    // already clear: unchanged
    expect(RR.rrClearSpawnStation(world, [bus, car], car, 39.21 - need - 0.5, -1)).toBe(39.21 - need - 0.5);
    // the safe-start pass uses it for both the same-direction and the oncoming move
    expect(src.includes('pushedStation = rrClearSpawnStation(infiniteWorldRef.current, trafficRef.current, t, pushedStation, stationDelta >= 0 ? 1 : -1);')).toBe(true);
    expect(src.includes('opposingStation = rrClearSpawnStation(infiniteWorldRef.current, trafficRef.current, t, opposingStation, safeStartPlayerDirection);')).toBe(true);
  });
});
