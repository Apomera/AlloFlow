import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

const laneOffset = 1.75;
const turn = Math.PI / 2;
const angleDifference = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const armLateral = (actor, angle) => -(actor.x - 48) * Math.sin(angle) + (actor.y - 48) * Math.cos(angle);

function inbound(entryIndex, exitNumber) {
  const pose = RR.roundaboutApproach(entryIndex);
  return { ...pose, id: 'route', type: 'car', speed: 6,
    _roundaboutState: 'approach', _roundaboutEntryIndex: entryIndex,
    _roundaboutEntryAngle: pose.angle, _roundaboutRadius: RR.ROUNDABOUT_LANE_RADIUS,
    _roundaboutExitChoices: exitNumber };
}

describe('Road Ready right-hand roundabout approach lanes', () => {
  it('queues behind another inbound vehicle and resumes when the lane clears', () => {
    const follower = { ...inbound(1, 2), x: 85, speed: 8 };
    const leader = { ...inbound(1, 2), x: 70, speed: 0 };
    // Missing IDs must not make two unrelated bodies count as the same actor.
    delete follower.id; delete leader.id;
    for (let tick = 0; tick < 60 * 10; tick++) {
      RR.updateRoundaboutTrafficVehicle(follower, 1 / 60, [follower, leader]);
      expect(RR.vehicleRectsOverlap(follower, RR.vehicleFootprint(follower.type),
        leader, RR.vehicleFootprint(leader.type))).toBe(false);
    }
    expect(follower.speed).toBeLessThan(0.1);
    const heldX = follower.x;
    for (let tick = 0; tick < 60 * 3; tick++) RR.updateRoundaboutTrafficVehicle(follower, 1 / 60, [follower]);
    expect(follower.x).toBeLessThan(heldX - 2);
  });

  it.each([30, 60, 144])('keeps two minutes of mixed flow moving without overlapping bodies at %i Hz', hz => {
    const traffic = RR.spawnRoundaboutTraffic({ traffic: 'medium' });
    const transitions = new Map(traffic.map(actor => [actor.id, 0]));
    let collisionCount = 0;
    for (let tick = 0; tick < hz * 120; tick++) {
      for (const actor of traffic) {
        const before = actor._roundaboutState;
        RR.updateRoundaboutTrafficVehicle(actor, 1 / hz, traffic);
        if (before !== actor._roundaboutState) transitions.set(actor.id, transitions.get(actor.id) + 1);
      }
      for (let first = 0; first < traffic.length; first++) {
        for (let second = first + 1; second < traffic.length; second++) {
          if (RR.vehicleRectsOverlap(traffic[first], RR.vehicleFootprint(traffic[first].type),
            traffic[second], RR.vehicleFootprint(traffic[second].type))) collisionCount++;
        }
      }
    }
    expect(collisionCount).toBe(0);
    for (const count of transitions.values()) expect(count).toBeGreaterThan(12);
  });

  it('places all inbound arms on the driver’s right side of their centerlines', () => {
    for (let entry = 0; entry < 4; entry++) {
      const actor = inbound(entry, 1);
      expect(armLateral(actor, actor._roundaboutEntryAngle)).toBeCloseTo(-laneOffset, 10);
      expect(angleDifference(actor.heading, actor._roundaboutEntryAngle + Math.PI)).toBeLessThan(1e-10);
    }
  });

  it.each([30, 60, 144])('connects every requested exit without centerline driving or sudden turns at %i Hz', hz => {
    const map = RR.buildMap('roundabout');
    for (let entry = 0; entry < 4; entry++) {
      for (const exitNumber of [1, 2, 3]) {
        const actor = inbound(entry, exitNumber);
        const outgoingArm = actor._roundaboutEntryAngle - exitNumber * turn;
        let sawExit = false, completed = false, incomingSamples = 0, outgoingSamples = 0;
        for (let tick = 0; tick < hz * 90; tick++) {
          const before = { x: actor.x, y: actor.y, heading: actor.heading, speed: actor.speed,
            state: actor._roundaboutState };
          RR.updateRoundaboutTrafficVehicle(actor, 1 / hz, [actor]);
          if (sawExit && actor._roundaboutState === 'approach' && before.state !== 'approach') {
            completed = true; break; // recycling is intentionally offscreen
          }
          if (actor._roundaboutState === 'exiting') sawExit = true;
          const distance = Math.hypot(actor.x - before.x, actor.y - before.y);
          expect(distance, 'joins do not teleport the vehicle').toBeLessThanOrEqual(
            Math.max(before.speed, actor.speed, 0) / hz * 1.35 + 0.02);
          expect(angleDifference(actor.heading, before.heading), 'steering stays continuous through both joins')
            .toBeLessThan(0.2);
          const radius = Math.hypot(actor.x - 48, actor.y - 48);
          if (radius > 14) {
            if (sawExit) {
              outgoingSamples++;
              expect(armLateral(actor, outgoingArm)).toBeCloseTo(laneOffset, 6);
              expect(angleDifference(actor.heading, outgoingArm)).toBeLessThan(1e-6);
            } else {
              incomingSamples++;
              expect(armLateral(actor, actor._roundaboutEntryAngle)).toBeCloseTo(-laneOffset, 6);
            }
          }
          expect([0, 3], 'the route remains on authored pavement')
            .toContain(map[Math.floor(actor.y)][Math.floor(actor.x)]);
        }
        expect(completed).toBe(true);
        expect(incomingSamples).toBeGreaterThan(0);
        expect(outgoingSamples).toBeGreaterThan(0);
      }
    }
  });
});
