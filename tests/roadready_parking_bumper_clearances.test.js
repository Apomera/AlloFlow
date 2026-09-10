import { beforeAll, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let R;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool('stem_lab/stem_tool_roadready.js', 'roadReady'); R = window.__RR_TEST_EXPORTS__.roadReady; });
it('identifies the closer end and updates both distances when the learner adjusts', () => {
  const scn = R.PARKING_SCENARIOS.tightParallel;
  const c = { x: scn.slot.x, y: scn.slot.y - 3, heading: -Math.PI / 2, speed: 0, steering: 0 };
  const ahead = R.parkingPracticeMetrics(c, scn);
  expect(ahead.frontBumperInches).toBeCloseTo(19.8);
  expect(ahead.rearBumperInches).toBeCloseTo(41.4);
  expect(ahead.bumperInches).toBe(ahead.frontBumperInches);
  expect(ahead.ready).toBe(false);
  const behind = R.parkingPracticeMetrics({ ...c, y: scn.slot.y + 3 }, scn);
  expect(behind.frontBumperInches).toBeCloseTo(41.4);
  expect(behind.rearBumperInches).toBeCloseTo(19.8);
  expect(behind.bumperInches).toBe(behind.rearBumperInches);
  expect(R.parkingPracticeMetrics({ ...c, y: scn.slot.y }, scn).ready).toBe(true);
});
it('withholds bumper distances while alongside or angled across the space', () => {
  const scn = R.PARKING_SCENARIOS.tightParallel;
  for (const c of [{ ...scn.startCar, speed: 0 }, { x: scn.slot.x, y: scn.slot.y, heading: -Math.PI / 4, speed: 0 }]) {
    const m = R.parkingPracticeMetrics(c, scn);
    expect(m.frontBumperInches).toBeNull(); expect(m.rearBumperInches).toBeNull();
  }
});
