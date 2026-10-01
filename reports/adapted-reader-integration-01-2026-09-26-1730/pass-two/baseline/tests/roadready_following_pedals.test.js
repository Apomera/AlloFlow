import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

describe('Road Ready pedal response', () => {
  function overlap(hz) {
    let pedals = { throttle: 0.8, brake: 0 };
    for (let i = 0; i < hz / 10; i++) {
      pedals = RR.drivingPedalResponse(pedals.throttle, pedals.brake, 1, 0.4, 1 / hz, 'D');
    }
    return pedals;
  }
  it('gives overlapping pedals the same response at different frame rates', () => {
    const low = overlap(30), high = overlap(120);
    expect(low.throttle).toBeCloseTo(high.throttle, 10);
    expect(low.brake).toBeCloseTo(high.brake, 10);
    expect(low.throttle).toBeLessThan(0.12);
    expect(low.brake).toBeGreaterThan(0.3);
  });
  it('prioritizes the brake and returns gas progressively after release', () => {
    let pedals = { throttle: 1, brake: 0 };
    for (let i = 0; i < 60; i++) {
      pedals = RR.drivingPedalResponse(pedals.throttle, pedals.brake, 1, 1, 1 / 60, 'D');
    }
    expect(pedals.throttle).toBe(0);
    const released = RR.drivingPedalResponse(0, pedals.brake, 1, 0, 1 / 60, 'D');
    expect(released.throttle).toBeGreaterThan(0);
    expect(released.throttle).toBeLessThan(0.1);
    expect(released.brake).toBeGreaterThan(0.7);
    expect(RR.drivingPedalResponse(1, 0, 1, 0, 1 / 60, 'P').throttle).toBe(0);
  });
});

describe('Road Ready following-space guidance', () => {
  it('uses the same weather target and warning color as the live rule cue', () => {
    for (const weather of ['clear', 'rain', 'snow', 'fog', 'ice']) {
      for (const seconds of [0, 1.5, 2.5, 3.5, 5.5]) {
        const display = RR.drivingFollowingDisplay(seconds * 20, 20, weather);
        const cue = RR.rrRuleCueFor({ gapSeconds: display.seconds, requiredGapSeconds: display.target });
        if (seconds < display.target) {
          expect(cue.title).toBe('ADD FOLLOWING SPACE');
          expect(display.color).toBe(cue.color);
          expect(display.action).toBe('Increase gap');
        } else {
          expect(display.action).toBe('Keep scanning');
        }
      }
    }
  });
  it('keeps highway gaps measurable beyond the old 30-metre display range', () => {
    const speed = 65 * RR.MPH_TO_MS;
    const display = RR.drivingFollowingDisplay(speed * 4, speed, 'rain');
    expect(display.seconds).toBeCloseTo(4);
    expect(display.target).toBe(4);
    expect(display.fraction).toBeCloseTo(2 / 3);
    expect(display.distanceFeet).toBeGreaterThan(300);
    expect(display.action).toBe('Keep scanning');
  });
  it('does not show an invented time gap without a moving vehicle to follow', () => {
    for (const gap of [null, undefined, NaN, Infinity, -1]) {
      expect(RR.drivingFollowingDisplay(gap, 15, 'clear').seconds).toBeNull();
    }
    expect(RR.drivingFollowingDisplay(5, 0, 'clear').seconds).toBeNull();
    expect(RR.drivingFollowingDisplay(0, 15, 'clear').seconds).toBe(0);
  });
});
