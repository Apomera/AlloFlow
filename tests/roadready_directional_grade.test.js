import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

function straightHill(grade) {
  return {
    profile: { roadHalfWidth: 4 },
    spline: { centerAt: () => 48, headingAt: () => 0, heightAt: y => y * grade }
  };
}

describe('gravity follows the pavement beneath the vehicle', () => {
  it('reverses uphill/downhill force with the heading, independently of the gear', () => {
    const world = straightHill(0.04);
    expect(RR.drivingRoadGrade(world, { x: 46, y: 50, heading: Math.PI / 2, speed: 8 })).toBeCloseTo(0.04, 8);
    expect(RR.drivingRoadGrade(world, { x: 46, y: 50, heading: -Math.PI / 2, speed: 8 })).toBeCloseTo(-0.04, 8);
    expect(RR.drivingRoadGrade(world, { x: 46, y: 50, heading: Math.PI / 2, speed: -8 })).toBeCloseTo(0.04, 8);
  });

  it('projects a hill and the road crown along an angled vehicle heading', () => {
    const world = straightHill(0.04);
    // On the left half of this two-way road, the crown rises 0.02 m per
    // metre toward +X. Terrain rises 0.04 m per metre toward +Y.
    expect(RR.drivingRoadGrade(world, { x: 46, y: 50, heading: 0 })).toBeCloseTo(0.02, 8);
    expect(RR.drivingRoadGrade(world, { x: 46, y: 50, heading: Math.PI / 4 })).toBeCloseTo(0.06 / Math.sqrt(2), 8);
    expect(RR.drivingRoadGrade(world, { x: 46, y: 50, heading: 5 * Math.PI / 4 })).toBeCloseTo(-0.06 / Math.sqrt(2), 8);
  });

  it('has no longitudinal gravity along the level branch of a hilly intersection', () => {
    const world = RR.createScenarioWorld({ id: 'rural', speedLimit: 45 });
    const chunk = world.getChunk(0);
    const station = chunk.intersectionY;
    const pose = RR.crossStreetPose(world.spline.centerAt(station), station,
      world.spline.headingAt(station), 6.5, RR.CROSS_STREET_LENGTH);
    const point = RR.crossStreetWorldPoint(pose, 25, 1);
    const heading = RR.crossStreetTravelHeading(pose, 1);
    expect(RR.roadSurfacePoseAt(world, point.x, point.y).crossStreet).toBe(true);
    // The previous main-road sample applied a real hill to this level branch.
    expect(Math.abs(world.spline.heightAt(point.y + 1) - world.spline.heightAt(point.y))).toBeGreaterThan(0.001);
    expect(RR.drivingRoadGrade(world, { ...point, heading })).toBeCloseTo(0, 8);
    expect(RR.drivingRoadGrade(world, { ...point, heading: heading + Math.PI })).toBeCloseTo(0, 8);
  });

  it('returns flat grade for the bounded practice courses', () => {
    expect(RR.drivingRoadGrade(null, { x: 10, y: 10, heading: 0 })).toBe(0);
    expect(RR.drivingRoadGrade({}, { x: 10, y: 10, heading: 0 })).toBe(0);
  });

  it.each([
    { name: 'rural bank reversal', scenario: 'rural', station: 555.5, lateral: -2, direction: -1 },
    { name: 'free-explore biome boundary', seed: 12345, station: 256.25, lateral: 2, direction: 1 }
  ])('keeps the $name from becoming a gravity impulse', fixture => {
    const world = fixture.scenario
      ? RR.createScenarioWorld({ id: fixture.scenario, speedLimit: 45 })
      : RR.createInfiniteWorld(fixture.seed);
    const point = RR.mainRoadWorldPoint(world, fixture.station, fixture.lateral);
    const heading = Math.PI / 2 - point.heading;
    const dx = Math.cos(heading) * 0.5, dy = Math.sin(heading) * 0.5;
    const rawSlope = RR.roadSurfacePoseAt(world, point.x + dx, point.y + dy).height
      - RR.roadSurfacePoseAt(world, point.x - dx, point.y - dy).height;
    // These known procedural bank/biome transitions contain a steep visual
    // step. Preserve the useful direction without treating that mesh seam
    // as an unlimited force on an otherwise gentle educational road.
    expect(rawSlope * fixture.direction).toBeGreaterThan(0.2);
    const forward = RR.drivingRoadGrade(world, { ...point, heading });
    const backward = RR.drivingRoadGrade(world, { ...point, heading: heading + Math.PI });
    expect(forward).toBeCloseTo(fixture.direction * 0.10, 10);
    expect(backward).toBeCloseTo(-forward, 10);
  });

  it('uses the sampled grade for both the live force and body pitch', () => {
    const source = readFileSync('stem_lab/stem_tool_roadready.js', 'utf8');
    expect(source.includes('var slope = drivingRoadGrade(infiniteWorldRef.current, car);')).toBe(true);
    expect(source.includes('gradeForce = veh.mass * 9.81 * slope;')).toBe(true);
    expect(source.includes('var gradePitch = Math.atan(slope) * (-aheadDirP);')).toBe(true);
  });
});
