import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let P;
beforeAll(() => {
  resetStemLab();
  loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
});
const clock = () => ({ last: null, acc: 0, held: false });
const start = () => ({ alt: 300, vVel: -9, hVel: 4, fuel: 110, thrust: 0, tilt: 0, x: 0, elapsed: 0 });
function fly(timestamps) {
  const timer = clock(), state = start(); let total = 0;
  for (const now of timestamps) {
    const steps = P.descentFrame(timer, now, false); total += steps;
    expect(Number.isInteger(steps)).toBe(true);
    for (let i = 0; i < steps; i++) P.descentStep(state, { throttle: 0.45, left: true }, 1 / 60);
  }
  return { timer, state, total };
}

describe('manual landing elapsed-time clock', () => {
  it('flies the same four physical seconds and state at 60 frames/s and two frames/s', () => {
    const fast = fly(Array.from({ length: 241 }, (_, i) => i * 1000 / 60));
    const slow = fly(Array.from({ length: 9 }, (_, i) => i * 500));
    expect(fast.total).toBe(240); expect(slow.total).toBe(240);
    expect(fast.state.elapsed).toBeCloseTo(4, 10);
    expect(slow.state).toEqual(fast.state);
    expect(fast.state.fuel).toBeLessThan(110);
    expect(fast.state.hVel).toBeLessThan(4);
  });

  it('integrates a half-second rendering interval as 30 fixed physics steps', () => {
    const timer = clock(); expect(P.descentFrame(timer, 0, false)).toBe(0);
    expect(P.descentFrame(timer, 500, false)).toBe(30);
    expect(P.descentFrame(timer, 1000, false)).toBe(30);
    expect(timer.acc).toBeCloseTo(0, 8);
  });

  it('retains fractional milliseconds across short and uneven rendering intervals', () => {
    const timer = clock(); let total = 0;
    for (const now of [0, 4, 11, 17, 21, 45, 100]) total += P.descentFrame(timer, now, false);
    expect(total).toBe(6); expect(timer.acc).toBeCloseTo(0, 8);
    expect(P.descentFrame(timer, 104, false)).toBe(0);
    expect(timer.acc).toBeCloseTo(4, 8);
    expect(P.descentFrame(timer, 117, false)).toBe(1);
    expect(timer.acc).toBeCloseTo(1 / 3, 8);
  });

  it('caps a long stall at one physical second and discards the excess wall time', () => {
    const timer = clock(); P.descentFrame(timer, 0, false);
    expect(P.descentFrame(timer, 5000, false)).toBe(60);
    expect(P.descentFrame(timer, 5000 + 1000 / 60, false)).toBe(1);
    expect(timer.acc).toBeCloseTo(0, 8);
    expect(P.descentFrame(timer, 10000, false)).toBe(60);
    expect(P.descentFrame(timer, 10000, false)).toBe(0);
  });

  it('clears carry while paused or hidden and starts a fresh timestamp when resumed', () => {
    const timer = clock(); P.descentFrame(timer, 0, false);
    expect(P.descentFrame(timer, 10, false)).toBe(0);
    expect(timer.acc).toBeCloseTo(10, 8);
    expect(P.descentFrame(timer, 100, true)).toBe(0);
    expect(timer.acc).toBe(0);
    expect(P.descentFrame(timer, 10000, true)).toBe(0);
    expect(P.descentFrame(timer, 20000, false)).toBe(0);
    expect(P.descentFrame(timer, 20500, false)).toBe(30);
  });

  it('resets invalid timestamps without emitting steps or carrying a stale interval into recovery', () => {
    for (const invalid of [NaN, Infinity, -Infinity, undefined, null, '1000']) {
      const timer = clock(); P.descentFrame(timer, 0, false); P.descentFrame(timer, 10, false);
      expect(P.descentFrame(timer, invalid, false), String(invalid)).toBe(0);
      expect(timer.acc, String(invalid)).toBe(0);
      expect(P.descentFrame(timer, 5000, false), String(invalid)).toBe(0);
      expect(P.descentFrame(timer, 5500, false), String(invalid)).toBe(30);
    }
  });

  it('resets a backwards wall clock and gives repeated timestamps no extra steps', () => {
    const timer = clock(); P.descentFrame(timer, 1000, false);
    expect(P.descentFrame(timer, 1000, false)).toBe(0);
    P.descentFrame(timer, 1010, false);
    expect(P.descentFrame(timer, 900, false)).toBe(0);
    expect(timer.acc).toBe(0);
    expect(P.descentFrame(timer, 1100, false)).toBe(0);
    expect(P.descentFrame(timer, 1600, false)).toBe(30);
  });
});
