import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

function leaving(entryIndex = 0, type = 'car') {
  return { id: 'leaving', type, x: 48, y: 80, speed: 5, heading: Math.PI / 2,
    _roundaboutState: 'exiting', _roundaboutExitAngle: Math.PI / 2,
    _roundaboutEntryIndex: entryIndex };
}

function safeCenterGap(a, b) {
  const first = RR.vehicleFootprint(a), second = RR.vehicleFootprint(b);
  return Math.hypot(first.length, first.width) / 2 +
    Math.hypot(second.length, second.width) / 2 + 1.5;
}

describe('Road Ready roundabout recycle clearance', () => {
  it('holds off the circle until the intended approach has room for both complete bodies', () => {
    for (const type of ['car', 'schoolbus']) {
      for (const otherType of ['car', 'schoolbus']) {
        for (let entryIndex = 0; entryIndex < 4; entryIndex++) {
          const vehicle = leaving(entryIndex, type);
          const next = RR.roundaboutApproach((entryIndex + 1) % 4);
          const gap = safeCenterGap(type, otherType);
          const blocker = { id: 'blocker', type: otherType,
            x: next.x + Math.cos(next.heading) * (gap - 0.1),
            y: next.y + Math.sin(next.heading) * (gap - 0.1),
            heading: next.heading + Math.PI / 4, speed: 0,
            _roundaboutState: 'approach' };
          RR.updateRoundaboutTrafficVehicle(vehicle, 1 / 60, [vehicle, blocker]);
          expect(vehicle._roundaboutState).toBe('exiting');
          expect(vehicle.speed).toBe(0);
          expect(vehicle._roundaboutEntryIndex).toBe(entryIndex);
          const held = { x: vehicle.x, y: vehicle.y };
          for (let tick = 0; tick < 90; tick++) {
            RR.updateRoundaboutTrafficVehicle(vehicle, 1 / 60, [vehicle, blocker]);
            expect(vehicle.x).toBe(held.x);
            expect(vehicle.y).toBe(held.y);
            expect(vehicle._roundaboutState).toBe('exiting');
          }
          RR.updateRoundaboutTrafficVehicle(vehicle, 1 / 60, [vehicle]);
          expect(vehicle._roundaboutState).toBe('approach');
          expect(vehicle._roundaboutEntryIndex).toBe(next.entryIndex);
          expect(vehicle.x).toBe(next.x);
          expect(vehicle.y).toBe(next.y);
          expect(vehicle.speed).toBeGreaterThan(0);
        }
      }
    }
  });

  it('includes an unflagged learner outside the circulating lane using the selected vehicle size', () => {
    const vehicle = leaving(0, 'car');
    const next = RR.roundaboutApproach(1);
    const gap = safeCenterGap('car', 'schoolbus');
    const player = { x: next.x - gap + 0.1, y: next.y, heading: Math.PI, speed: 0 };
    RR.updateRoundaboutTrafficVehicle(vehicle, 1 / 60, [vehicle], player, 'schoolbus');
    expect(vehicle._roundaboutState).toBe('exiting');
    expect(vehicle.speed).toBe(0);
    player.x = next.x - gap - 0.1;
    RR.updateRoundaboutTrafficVehicle(vehicle, 1 / 60, [vehicle], player, 'schoolbus');
    expect(vehicle._roundaboutState).toBe('approach');
    expect(vehicle._roundaboutEntryIndex).toBe(1);
  });

  it('allows a clear approach and preserves the assigned next route', () => {
    const vehicle = leaving(2, 'schoolbus');
    const next = RR.roundaboutApproach(3);
    const other = { id: 'far', type: 'schoolbus', x: next.x + safeCenterGap('schoolbus', 'schoolbus') + 0.1,
      y: next.y, speed: 0, heading: 0, _roundaboutState: 'approach' };
    RR.updateRoundaboutTrafficVehicle(vehicle, 1 / 60, [vehicle, other]);
    expect(vehicle._roundaboutState).toBe('approach');
    expect(vehicle._roundaboutEntryIndex).toBe(3);
    expect(vehicle.x).toBe(next.x);
    expect(vehicle.y).toBe(next.y);
    expect(RR.vehicleRectsOverlap(vehicle, RR.vehicleFootprint(vehicle.type),
      other, RR.vehicleFootprint(other.type))).toBe(false);
  });
});
