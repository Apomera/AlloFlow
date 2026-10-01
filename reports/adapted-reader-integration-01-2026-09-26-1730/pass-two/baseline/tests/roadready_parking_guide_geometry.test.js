import { beforeAll, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let R;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool('stem_lab/stem_tool_roadready.js', 'roadReady'); R = window.__RR_TEST_EXPORTS__.roadReady; });
it('anchors the front and rear dimensions to the actual bumpers and obstacles', () => {
  const scn = R.PARKING_SCENARIOS.tightParallel;
  const c = { x: scn.slot.x, y: scn.slot.y, heading: -Math.PI / 2, speed: 0, steering: 0 };
  const g = R.parkingClearanceGuideGeometry(c, scn);
  expect(g.front.from).toBe(130); expect(g.front.to).toBe(138.5);
  expect(g.rear.from).toBe(188.5); expect(g.rear.to).toBe(197);
  expect(g.curb.from).toBe(297); expect(g.curb.to).toBe(300);
  expect(g.front.inches).toBeCloseTo(30.6); expect(g.curb.inches).toBeCloseTo(10.8);
});
it('uses the rotated body extent and withholds guides while outside the gap', () => {
  const scn = R.PARKING_SCENARIOS.tightParallel;
  const c = { x: scn.slot.x, y: scn.slot.y, heading: -Math.PI / 2 + 0.1, speed: 0, steering: 0 };
  const g = R.parkingClearanceGuideGeometry(c, scn);
  expect(g.front.to).toBeCloseTo(c.y - (25 * Math.cos(0.1) + 12 * Math.sin(0.1)));
  expect(g.curb.from).toBeCloseTo(c.x + 25 * Math.sin(0.1) + 12 * Math.cos(0.1));
  expect(R.parkingClearanceGuideGeometry({ ...scn.startCar, speed: 0 }, scn)).toBeNull();
  expect(R.parkingClearanceGuideGeometry({ ...c, heading: 0 }, scn)).toBeNull();
});
