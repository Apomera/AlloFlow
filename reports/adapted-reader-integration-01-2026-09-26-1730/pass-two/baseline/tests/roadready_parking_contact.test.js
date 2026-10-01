import { beforeAll, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let RR;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool('stem_lab/stem_tool_roadready.js', 'roadReady'); RR = window.__RR_TEST_EXPORTS__.roadReady; });
const scenario = { curb: { x: 300, side: 'right' }, obstacles: [{ x: 273, y: 70, w: 24, h: 50 }] };
it('stops at a parked car without bouncing or penetrating while forward remains held', () => {
  const car = { x: 285, y: 150, heading: -Math.PI / 2, speed: 0, steering: 0 };
  let contacts = 0;
  for (let i = 0; i < 240; i++) {
    const hit = RR.parkingDrillStep(car, { w: true }, 1 / 60, scenario);
    if (hit.isNew) contacts++;
    expect(car.speed).toBeGreaterThanOrEqual(0);
    expect(RR.parkingCarHitsObstacle(car, scenario.obstacles[0])).toBe(false);
    expect(car.y).toBeGreaterThanOrEqual(145);
  }
  expect(contacts).toBe(1); expect(car.speed).toBe(0);
});
it('clears the warning after moving away and recognizes a later separate contact', () => {
  const car = { x: 285, y: 150, heading: -Math.PI / 2, speed: 0, steering: 0 };
  for (let i = 0; i < 180; i++) RR.parkingDrillStep(car, { w: true }, 1 / 60, scenario);
  let recovered = 0;
  for (let i = 0; i < 120; i++) if (RR.parkingDrillStep(car, { s: true }, 1 / 60, scenario).recovered) recovered++;
  expect(recovered).toBe(1); expect(car.contactState).toBeNull();
  let contacts = 0;
  for (let i = 0; i < 180; i++) if (RR.parkingDrillStep(car, { w: true }, 1 / 60, scenario).isNew) contacts++;
  expect(contacts).toBe(1);
});
it('stops at the curb with the oriented body clear at different frame rates', () => {
  for (const fps of [30, 60, 120]) {
    const car = { x: 270, y: 165, heading: 0, speed: 0, steering: 0 };
    let contacts = 0;
    for (let i = 0; i < fps * 3; i++) {
      const hit = RR.parkingDrillStep(car, { w: true }, 1 / fps, { ...scenario, obstacles: [] });
      if (hit.isNew) { expect(hit.kind).toBe('curb'); contacts++; }
      expect(RR.parkingCurbGapInches(car, 300, 'right')).toBeGreaterThanOrEqual(-0.01);
    }
    expect(contacts).toBe(1); expect(car.speed).toBe(0);
  }
});
