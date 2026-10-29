import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

function actor(angle, speed = 0, type = 'car', radius = 8) {
  return { ...RR.roundaboutPose(angle, radius), id: 'obstacle', type, speed,
    _roundaboutState: 'circulating', _roundaboutAngle: angle, _roundaboutRadius: radius };
}

function observation(hz, angle = 0.9, pose = {}) {
  const car = { ...RR.roundaboutPose(angle), ...pose, speed: 0 };
  let state = { inCircle: true, lastAngle: Math.atan2(car.y - 48, car.x - 48) };
  return {
    car,
    hold(seconds, traffic = [], context = {}) {
      const events = [];
      for (let frame = 0; frame < Math.round(seconds * hz); frame++) {
        const result = RR.assessRoundaboutFrame(state, car, car, traffic, 1, 1 / hz,
          { vehicleId: 'sedan', ...context });
        state = result.state;
        events.push(...result.events);
      }
      return events;
    },
  };
}

describe('Road Ready roundabout stopping penalties distinguish obstructions from idle stops', () => {
  it.each(['cyclist', 'motorcycle'])('grades entering in front of a circulating %s as unsafe', (type) => {
    const result = RR.assessRoundaboutFrame({},
      { x: 60, y: 48, heading: Math.PI, speed: 4 },
      { x: 58, y: 48, heading: Math.PI, speed: 4 }, [], 1, 0.1,
      { vehicleId: 'sedan', cyclists: [actor(0.25, 4, type)] });
    expect(result.events).toContain('unsafe_entry');
  });

  it('does not report an unsafe entry when a circulating rider has already cleared it', () => {
    const result = RR.assessRoundaboutFrame({},
      { x: 60, y: 48, heading: Math.PI, speed: 4 },
      { x: 58, y: 48, heading: Math.PI, speed: 4 }, [], 1, 0.1,
      { vehicleId: 'sedan', cyclists: [actor(-0.7, 4, 'cyclist')] });
    expect(result.events).not.toContain('unsafe_entry');
  });

  it.each([30, 60, 144])('permits waiting safely behind a stopped queue at %i Hz', (hz) => {
    const run = observation(hz);
    const lead = actor(0);
    expect(RR.vehicleRectsOverlap(run.car, RR.vehicleFootprint('sedan'), lead, RR.vehicleFootprint('car'))).toBe(false);
    expect(run.hold(5, [lead])).not.toContain('stopped_inside');
  });

  it('recognizes the queue across the signed-angle wrap', () => {
    const run = observation(60, -Math.PI + 0.3);
    expect(run.hold(5, [actor(Math.PI - 0.6)])).not.toContain('stopped_inside');
  });

  it('uses whole bodies when a long learner waits behind another long vehicle', () => {
    const run = observation(60);
    const lead = actor(0.9 - 1.7, 0, 'schoolbus');
    expect(RR.vehicleRectsOverlap(run.car, RR.vehicleFootprint('schoolbus'), lead, RR.vehicleFootprint('schoolbus'))).toBe(false);
    expect(run.hold(5, [lead], { vehicleId: 'schoolbus' })).not.toContain('stopped_inside');
  });

  it('permits a stop behind a queue still creeping forward', () => {
    expect(observation(60).hold(3, [actor(0, 0.4)])).not.toContain('stopped_inside');
  });

  it('recognizes a stopped exit queue ahead while the learner still overlaps the circle', () => {
    const run = observation(60, 0, { x: 58, y: 49.75, heading: 0 });
    const lead = { x: 63, y: 49.75, heading: 0, speed: 0, type: 'car' };
    expect(RR.vehicleRectsOverlap(run.car, RR.vehicleFootprint('sedan'), lead, RR.vehicleFootprint('car'))).toBe(false);
    expect(run.hold(5, [lead])).not.toContain('stopped_inside');
  });

  it.each([
    ['behind the learner', { x: 53, y: 49.75, heading: 0, speed: 0 }],
    ['outside the exit lane', { x: 63, y: 54.25, heading: 0, speed: 0 }],
    ['on the circle instead of the selected exit', { x: 58, y: 44, heading: -Math.PI / 2, speed: 0 }],
    ['moving away along the exit', { x: 63, y: 49.75, heading: 0, speed: 6 }],
  ])('does not excuse an exit stop for traffic %s', (_label, lead) => {
    const run = observation(60, 0, { x: 58, y: 49.75, heading: 0 });
    expect(run.hold(2, [{ ...lead, type: 'car' }])).toContain('stopped_inside');
  });

  it.each(['cyclist', 'motorcycle'])('recognizes a stopped %s through the live rider context', (type) => {
    expect(observation(60).hold(3, [], { cyclists: [actor(0.25, 0, type)] })).not.toContain('stopped_inside');
  });

  it('permits avoiding a person already crossing the circulating path', () => {
    const pedestrian = { ...RR.roundaboutPose(0.35), id: 'crossing-person', kind: 'adult', crossing: true, speed: 1.2 };
    expect(observation(60).hold(3, [], { pedestrians: [pedestrian] })).not.toContain('stopped_inside');
  });

  it('permits stopping for active wildlife in the driving path', () => {
    const wildlife = { ...RR.roundaboutPose(0.25), kind: 'deer', vx: 0, vy: 0, life: 8, hit: false };
    expect(observation(60).hold(3, [], { wildlife })).not.toContain('stopped_inside');
  });

  it('does not excuse idling for wildlife behind the learner or outside the lane', () => {
    for (const wildlife of [
      { ...RR.roundaboutPose(1.8), kind: 'deer', life: 8 },
      { ...RR.roundaboutPose(0.25, 4), kind: 'deer', life: 8 },
    ]) {
      expect(observation(60).hold(2, [], { wildlife })).toContain('stopped_inside');
    }
  });

  it.each([30, 60, 144])('still penalizes an unnecessary clear-road stop at %i Hz', (hz) => {
    const run = observation(hz);
    expect(run.hold(1.4)).not.toContain('stopped_inside');
    expect(run.hold(0.2)).toContain('stopped_inside');
    expect(run.hold(3)).not.toContain('stopped_inside');
  });

  it.each([
    ['a vehicle moving away at traffic speed', () => [actor(0, 6)]],
    ['a stopped vehicle behind the learner', () => [actor(1.8)]],
    ['a vehicle on the distant side of the circle', () => [actor(0.9 - Math.PI)]],
    ['a fully clear vehicle inside the island', () => [actor(0, 0, 'car', 4)]],
    ['a fully clear vehicle beyond the outside edge', () => [actor(0, 0, 'car', 12)]],
  ])('does not excuse idling because of %s', (_label, traffic) => {
    expect(observation(60).hold(2, traffic())).toContain('stopped_inside');
  });

  it('does not excuse idling because a pedestrian is off the path or behind', () => {
    const pedestrians = [
      { ...RR.roundaboutPose(0.35, 4), crossing: true, speed: 1.2 },
      { ...RR.roundaboutPose(1.5), crossing: true, speed: 1.2 },
    ];
    expect(observation(60).hold(2, [], { pedestrians })).toContain('stopped_inside');
  });

  it.each([30, 60, 144])('requires a fresh 1.5 seconds of clear idling after a blocked stop at %i Hz', (hz) => {
    const run = observation(hz);
    expect(run.hold(1.2)).not.toContain('stopped_inside');
    expect(run.hold(5, [actor(0)])).not.toContain('stopped_inside');
    expect(run.hold(1.4)).not.toContain('stopped_inside');
    expect(run.hold(0.2)).toContain('stopped_inside');
  });
});
