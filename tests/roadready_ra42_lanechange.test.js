import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 42, lane ra42: the AI lane-change cut-in of round 41 (highway s1, F4).
// An AI driver in the inner lane, 50 m ahead of Ride-Along and a little faster, moved back to the outer lane in front
// of it: a 1.8 s gap against the 4 s rule. The learner's follow check took 6 points a second while the gap was under
// half of safeFollowingFeet (-3 in round 41). The AI's lane-change check looked only at AI cars level with it (within
// 5 m) and never at the learner. Now the move waits until it keeps the gap the tool teaches and scores
// (safeFollowingFeet, the same seconds) to the vehicle it moves in behind, and leaves that gap, at that vehicle's own
// speed, to the vehicle it moves in front of, the learner included (rrLaneChangeGapClear).
// Maine Driver's License Manual: keep at least 4 seconds behind the vehicle ahead (more in bad weather).
// The REAL Ride-Along block, updateTraffic and updateCyclists are stepped (tests/roadready_ra42_sim.cjs).

const require = createRequire(import.meta.url);
const { makeSim } = require('./roadready_ra42_sim.cjs');
const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const src = readFileSync(TOOL, 'utf8');
let RR;

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

// round 41 highway s1 at t 27.5 (its recorder frames). kind: 's1' | 'far' | 'aiFollower' | 'aiLeader' | 'level'
const run = (kind, dt, learner) => {
  const S = makeSim(RR, src, { scenario: 'highway', learner: learner || 'ridealong' });
  S.t = 27.5;
  const lanes = RR.authoredTrafficLaneOffsets(RR.getContinuousScenarioProfile('highway'), -1);
  const inner = lanes[0], outer = lanes[lanes.length - 1];
  S.placeCar(-217.17, kind === 'aiFollower' ? inner : outer, 26.84);
  const ahead = kind === 'far' ? 140 : kind === 'level' ? 0 : 50.46;
  const changer = S.vehicle('changer', 'car', -217.17 - ahead, inner, -1, 27.86,
    { _pendingLaneOffset: outer, _pendingLaneTimer: 1.0, blinker: 1, _laneChangeCooldown: 0 }); // the tool's return-to-outer signal
  if (kind === 'aiFollower') S.vehicle('follower', 'car', -217.17 - ahead + 40, outer, -1, 26.8);
  if (kind === 'aiLeader') S.vehicle('leader', 'car', -217.17 - ahead - 30, outer, -1, 26.8);
  const size = RR.vehicleFootprint('sedan');
  let changedAt = null, points = 0, minGapSec = Infinity;
  for (let i = 0; i < 12 / dt; i++) {
    S.step(dt);
    if (changedAt == null && Math.abs(changer.laneOffset - outer) < 0.01) changedAt = S.t;
    // the drive loop's follow check (checkCollisions): same lane at 1.0 m, bumper gap under half of safeFollowingFeet = 6 points/s
    const st = RR.followingVehicleRoadState(S.world, S.car, changer, 1.0), v = Math.abs(S.car.speed);
    if (st.eligible && st.sameLane && st.ahead > 0 && v > 5) {
      const gap = RR.followingBumperGap(S.world, S.car, changer, size, RR.vehicleFootprint('car'), st);
      minGapSec = Math.min(minGapSec, gap / v);
      if (gap * RR.FT_PER_M < RR.safeFollowingFeet(v * RR.MS_TO_MPH, S.scn.weather) * 0.5) points += 6 * dt;
    }
  }
  return { S, changedAt, points, minGapSec };
};

describe('Road Ready ra42: an AI lane change keeps the following gap (round 41 highway s1)', () => {
  it.each([0.1, 1 / 30])('dt %s: the driver 50 m ahead does not move in front of Ride-Along, and the learner loses no points', (dt) => {
    const r = run('s1', dt);
    expect(r.changedAt, 'no move into a 1.8 s gap').toBeNull();
    expect(r.points).toBe(0);
    expect(r.S.hardBrakes).toBe(0);
  });

  it('the same move 140 m ahead (over 4 s at 26.8 m/s) still happens', () => {
    const r = run('far', 0.1);
    expect(r.changedAt).not.toBeNull();
    expect(r.minGapSec).toBeGreaterThan(4);
    expect(r.points).toBe(0);
  });

  it('not in front of an AI driver 40 m behind in that lane (it needs 4 s at its own speed)', () => {
    expect(run('aiFollower', 0.1, 'scripted').changedAt).toBeNull();
  });

  it('not in behind an AI driver 30 m ahead in that lane', () => {
    expect(run('aiLeader', 0.1, 'scripted').changedAt).toBeNull();
  });

  it('not into the lane beside a learner level with it', () => {
    expect(run('level', 0.1, 'scripted').changedAt).toBeNull();
  });
});

describe('Road Ready ra42: rrLaneChangeGapClear uses the tool\'s own following seconds', () => {
  const at = (world, station, lateral, speed, type) => { const p = RR.mainRoadWorldPoint(world, station, lateral); return { x: p.x, y: p.y, heading: -Math.PI / 2 - p.heading, speed, type: type || 'car' }; };
  it.each(['clear', 'rain', 'snow'])('%s: the follower\'s gap must be safeFollowingFeet at the follower\'s speed', (weather) => {
    const world = RR.createScenarioWorld(RR.SCENARIOS.find((s) => s.id === 'highway'));
    const lanes = RR.authoredTrafficLaneOffsets(RR.getContinuousScenarioProfile('highway'), -1);
    const outer = lanes[lanes.length - 1], size = RR.vehicleFootprint('car');
    const v = 25, need = RR.safeFollowingFeet(v * RR.MS_TO_MPH, weather) / RR.FT_PER_M;
    expect(need).toBeCloseTo(v * ({ clear: 4, rain: 5, snow: 6 })[weather], 1); // the seconds the tailgate check scores
    const mover = at(world, -300, lanes[0], 28);
    for (const [extra, ok] of [[1, true], [-1, false]]) {
      const follower = at(world, -300 + size.length + need + extra, outer, v); // behind the mover's spot (learner's direction is -station)
      expect(RR.rrLaneChangeGapClear(world, mover, size, outer, [{ actor: follower, length: size.length, width: size.width }], weather)).toBe(ok);
      const leader = at(world, -300 - size.length - RR.safeFollowingFeet(28 * RR.MS_TO_MPH, weather) / RR.FT_PER_M - extra, outer, 10);
      expect(RR.rrLaneChangeGapClear(world, mover, size, outer, [{ actor: leader, length: size.length, width: size.width }], weather)).toBe(ok);
    }
    // a vehicle in the other lane, or going the other way, does not count
    expect(RR.rrLaneChangeGapClear(world, mover, size, outer, [{ actor: at(world, -295, lanes[0], v), length: 4.5, width: 1.8 }], weather)).toBe(true);
    const oncoming = at(world, -310, -outer, v); oncoming.heading = Math.PI / 2 - RR.mainRoadWorldPoint(world, -310, -outer).heading;
    expect(RR.rrLaneChangeGapClear(world, mover, size, outer, [{ actor: oncoming, length: 4.5, width: 1.8 }], weather)).toBe(true);
  });
});
