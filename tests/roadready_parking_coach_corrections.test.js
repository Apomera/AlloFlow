import { beforeAll, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let R;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool('stem_lab/stem_tool_roadready.js', 'roadReady'); R = window.__RR_TEST_EXPORTS__.roadReady; });
const scenario = { curb: { x: 300, side: 'right' }, obstacles: [{ x: 273, y: 70, w: 24, h: 50 }, { x: 273, y: 205, w: 24, h: 50 }], slot: { x: 285, y: 167.5 }, stepCheck: c => Math.abs(c.x - 285) < 15 && Math.abs(c.y - 167.5) < 37.5 && Math.abs(c.heading + Math.PI / 2) < 0.17 };
const parked = { x: 285, y: 167.5, heading: -Math.PI / 2, speed: 0, steering: 0 };
it('recognizes a valid stopped pose reached from any earlier lesson step', () => {
  for (const phase of [0, 1, 2, 3, 4]) {
    const c = { ...parked };
    expect(R.parallelParkingPhase(c, phase, scenario)).toBe(4);
    expect(c.parkingBrake).toBeUndefined();
  }
});
it('does not skip the maneuver merely because the car crosses the space or stops in an invalid position', () => {
  for (const c of [{ ...parked, speed: 1 }, { ...parked, x: 279 }, { ...parked, y: 150 }, { ...parked, heading: Math.PI / 2 }]) {
    expect(R.parallelParkingPhase(c, 1, scenario)).not.toBe(4);
  }
});
