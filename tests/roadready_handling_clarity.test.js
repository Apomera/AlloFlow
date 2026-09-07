import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

describe('consistent driving response and road-rule preview', () => {
  it('runs maneuver drills at 60 ticks per second on different displays', () => {
    for (const hz of [30, 60, 144]) {
      const clock = { last: 0, remainder: 0 };
      let ticks = 0;
      for (let i = 1; i <= hz; i++) ticks += RR.drivingDrillTicks(clock, i * 1000 / hz);
      expect(ticks).toBe(60);
      expect(RR.drivingDrillTicks(clock, 60000)).toBeLessThanOrEqual(6);
    }
  });
  it('settles steering identically across refresh rates without overshoot', () => {
    const settle = (hz) => {
      let steering = 0;
      for (let i = 0; i < hz; i++) steering = RR.drivingResponse(steering, 0.6, 7, 1 / hz);
      return steering;
    };
    expect(settle(30)).toBeCloseTo(settle(144), 10);
    expect(settle(60)).toBeGreaterThan(0.59);
    expect(RR.drivingResponse(0, 0.6, 8, 0.5)).toBeLessThan(0.6);
  });

  it('brakes to rest without flipping direction or depending on a frame multiplier', () => {
    for (const hz of [30, 60, 144]) {
      let forward = 1.4, reverse = -1.4;
      for (let i = 0; i < hz; i++) {
        forward = RR.integrateDrivingSpeed(forward, -2, 1 / hz, 'D');
        reverse = RR.integrateDrivingSpeed(reverse, 2, 1 / hz, 'R');
      }
      expect(forward).toBe(0);
      expect(Math.abs(reverse)).toBe(0);
    }
    expect(RR.integrateDrivingSpeed(0, 4, 1, 'P')).toBe(0);
  });

  it('turns naturally in reverse and has no stationary yaw', () => {
    const forward = RR.drivingSteeringGeometry(3, 0.6, 'sedan');
    const reverse = RR.drivingSteeringGeometry(-3, 0.6, 'sedan');
    expect(reverse.yawRate).toBeCloseTo(-forward.yawRate, 10);
    expect(RR.drivingSteeringGeometry(0, 0.6, 'sedan').yawRate).toBe(0);
    expect(3 / forward.yawRate).toBeGreaterThan(4);
    expect(3 / forward.yawRate).toBeLessThan(9);
    expect(RR.drivingSteeringGeometry(25, 0.6, 'sedan').wheelAngle).toBeLessThan(forward.wheelAngle / 4);
  });

  it('uses actual curvature for tire demand and gives larger vehicles wider turns', () => {
    const car = RR.drivingSteeringGeometry(12, 0.3, 'sedan');
    const bus = RR.drivingSteeringGeometry(12, 0.3, 'bus');
    expect(car.lateralAcceleration).toBeCloseTo(Math.abs(12 * car.yawRate), 10);
    expect(bus.yawRate).toBeLessThan(car.yawRate);
  });

  it('previews high-speed signals early enough for perception and braking', () => {
    const town = RR.drivingSignalPreviewMeters(25 * RR.MPH_TO_MS, 'clear');
    const highway = RR.drivingSignalPreviewMeters(65 * RR.MPH_TO_MS, 'clear');
    const rain = RR.drivingSignalPreviewMeters(65 * RR.MPH_TO_MS, 'rain');
    expect(town).toBeGreaterThanOrEqual(40);
    expect(highway).toBeGreaterThan(100);
    expect(rain).toBeGreaterThan(highway);
    expect(rain).toBeLessThanOrEqual(240);
  });

  it('distinguishes a permissive flashing arrow from a steady yellow signal', () => {
    const flashing = RR.rrRuleCueFor({ signalState: 'flashing_yellow' });
    const steady = RR.rrRuleCueFor({ signalState: 'yellow' });
    expect(flashing.title).toBe('YIELD BEFORE TURNING');
    expect(flashing.detail).toContain('oncoming traffic');
    expect(steady.title).toBe('PREPARE TO STOP');
  });
});
