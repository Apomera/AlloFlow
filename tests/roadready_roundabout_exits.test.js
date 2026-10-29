import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

const quarterTurn = Math.PI / 2;
const normalized = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
const angleError = (a, b) => Math.abs(normalized(a - b));

function advanceUntil(vehicle, predicate, hz, seconds = 90) {
  for (let tick = 0; tick < hz * seconds && !predicate(vehicle); tick++) {
    RR.updateRoundaboutTrafficVehicle(vehicle, 1 / hz, [vehicle]);
  }
  expect(predicate(vehicle), 'vehicle reaches the expected route stage').toBe(true);
}

function assertCardinalExit(vehicle, map, hz) {
  const angle = vehicle._roundaboutExitAngle;
  expect(angleError(angle, Math.round(angle / quarterTurn) * quarterTurn)).toBeLessThan(1e-10);
  const expectedPose = RR.roundaboutPose(angle + Math.PI / 4);
  expect(vehicle.x).toBeCloseTo(expectedPose.x, 9);
  expect(vehicle.y).toBeCloseTo(expectedPose.y, 9);
  expect(angleError(vehicle.heading, expectedPose.heading)).toBeLessThan(1e-10);
  for (let tick = 0; tick < hz * 15 && vehicle._roundaboutState === 'exiting'; tick++) {
    // These are the same road/centerline cells used by the scenario physics.
    expect([0, 3]).toContain(map[Math.floor(vehicle.y)][Math.floor(vehicle.x)]);
    if (Math.hypot(vehicle.x - 48, vehicle.y - 48) > 14) {
      expect(-(vehicle.x - 48) * Math.sin(angle) + (vehicle.y - 48) * Math.cos(angle)).toBeCloseTo(1.75, 8);
      expect(angleError(vehicle.heading, angle)).toBeLessThan(1e-10);
    }
    RR.updateRoundaboutTrafficVehicle(vehicle, 1 / hz, [vehicle]);
  }
  expect(vehicle._roundaboutState).toBe('approach');
}

describe('Road Ready roundabout exits match authored approach roads', () => {
  it.each([30, 60, 144])('keeps initial traffic evenly spaced and exits on pavement at %i Hz', hz => {
    for (const density of ['light', 'medium']) {
      const actors = RR.spawnRoundaboutTraffic({ traffic: density })
        .filter(actor => actor._roundaboutState === 'circulating');
      const map = RR.buildMap('roundabout');
      for (let index = 0; index < actors.length; index++) {
        const actor = actors[index];
        const startAngle = -quarterTurn - index * Math.PI * 2 / actors.length;
        expect(angleError(actor._roundaboutAngle, startAngle)).toBeLessThan(1e-10);
        const minimumTravel = (2 + index % 2) * quarterTurn;
        const expectedExitAngle = Math.floor((startAngle - minimumTravel - Math.PI / 4 + 1e-10) / quarterTurn) * quarterTurn;
        advanceUntil(actor, current => current._roundaboutState === 'exiting', hz);
        expect(angleError(actor._roundaboutExitAngle, expectedExitAngle)).toBeLessThan(1e-10);
        assertCardinalExit(actor, map, hz);
      }
    }
  });

  it.each([30, 60, 144])('honors every requested exit and repeated recycled routes at %i Hz', hz => {
    const map = RR.buildMap('roundabout');
    for (let entryIndex = 0; entryIndex < 4; entryIndex++) {
      for (const requestedExit of [1, 2, 3]) {
        const approach = RR.roundaboutApproach(entryIndex);
        const actor = {
          ...approach, id: 'route', type: 'car', speed: 6,
          _roundaboutState: 'approach', _roundaboutEntryIndex: entryIndex,
          _roundaboutEntryAngle: approach.angle, _roundaboutRadius: RR.ROUNDABOUT_LANE_RADIUS,
          _roundaboutExitChoices: requestedExit,
        };
        // Repeated recycling exercises each cardinal approach without relying
        // on other AI traffic to determine whether this route can proceed.
        for (let lap = 0; lap < 4; lap++) {
          const expectedExit = actor._roundaboutEntryAngle - actor._roundaboutExitChoices * quarterTurn;
          advanceUntil(actor, current => current._roundaboutState === 'exiting', hz);
          expect(angleError(actor._roundaboutExitAngle, expectedExit)).toBeLessThan(1e-10);
          expect(actor._roundaboutTravel).toBeCloseTo(actor._roundaboutExitAfter, 10);
          assertCardinalExit(actor, map, hz);
        }
      }
    }
  });
});
