import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

describe('Road Ready opposing approach gaps', () => {
  function junction() {
    const world = RR.createScenarioWorld(RR.SCENARIOS.find(s => s.id === 'suburban'));
    const chunk = world.getChunk(0);
    const y = chunk.intersectionY;
    const signal = { x: world.spline.centerAt(y), y, _chunk: 0, type: 'light' };
    const pose = RR.crossStreetPose(signal.x, y, world.spline.headingAt(y), 6.5, RR.CROSS_STREET_LENGTH);
    const main = (distance, direction, speed, lateral = -direction * 1.5) => {
      const point = RR.mainRoadWorldPoint(world, y - direction * distance, lateral);
      return { x: point.x, y: point.y,
        heading: direction * Math.PI / 2 - point.heading, speed };
    };
    const cross = (distance, direction, speed, flagged = true) => ({
      ...RR.crossStreetWorldPoint(pose, -direction * distance, direction * 1.5),
      heading: RR.crossStreetTravelHeading(pose, direction), speed,
      ...(flagged ? { crossStreet: true, _crossPose: pose, _crossDirection: direction, _chunk: 0 } : {})
    });
    return { world, signal, main, cross };
  }

  it('yields to fast opposing traffic beyond the old 20-metre cutoff in both directions', () => {
    const { world, signal, main } = junction();
    for (const direction of [-1, 1]) {
      const self = { ...main(6, direction, 0), id: 'self' };
      const other = { ...main(35, -direction, 15), id: 'other' };
      const gap = RR.leftTurnGapState([self, other], self, signal, null, world);
      expect(gap.clear).toBe(false);
      expect(gap.blockerId).toBe('other');
      expect(gap.minTimeToConflict).toBeGreaterThan(0);
      expect(gap.minTimeToConflict).toBeLessThan(4);
      expect(RR.leftTurnGapState([{ ...other, speed: 1 }], self, signal, null, world).clear).toBe(true);
    }
  });

  it('checks an unflagged player approaching on the same rotated cross street', () => {
    const { world, signal, cross } = junction();
    for (const direction of [-1, 1]) {
      const self = { ...cross(6, direction, 0), id: 'self' };
      const player = cross(10, -direction, 5, false);
      expect(RR.playerControlApproach(world, signal, player, 4).approachGroup).toBe('cross');
      expect(RR.opposingApproachClear(world, [], self, signal, player)).toBe(false);
      expect(RR.opposingApproachClear(world, [], self, signal,
        cross(35, -direction, 15, false))).toBe(false);
      expect(RR.opposingApproachClear(world, [], self, signal,
        cross(35, -direction, 1, false))).toBe(true);
    }
  });

  it('ignores vehicles moving away, past the conflict, or outside the road', () => {
    const { world, signal, main, cross } = junction();
    for (const direction of [-1, 1]) {
      const self = { ...main(6, direction, 0), id: 'self' };
      for (const harmless of [main(-12, -direction, 15), main(20, -direction, -5),
        main(10, direction, 5), main(10, -direction, 10, 12)]) {
        expect(RR.leftTurnGapState([harmless], self, signal, null, world).clear).toBe(true);
      }
      const crossSelf = { ...cross(6, direction, 0), id: 'crossSelf' };
      expect(RR.opposingApproachClear(world, [], crossSelf, signal,
        cross(-12, -direction, 10, false))).toBe(true);
      expect(RR.opposingApproachClear(world, [], crossSelf, signal,
        cross(10, -direction, -5, false))).toBe(true);
    }
  });

  it('continues yielding until the body of opposing traffic clears the junction', () => {
    const { world, signal, main } = junction();
    const self = { ...main(6, 1, 0), id: 'self' };
    const bus = { ...main(-3, -1, 5), type: 'schoolbus', id: 'bus' };
    expect(RR.leftTurnGapState([bus], self, signal, null, world).clear).toBe(false);
  });
});
