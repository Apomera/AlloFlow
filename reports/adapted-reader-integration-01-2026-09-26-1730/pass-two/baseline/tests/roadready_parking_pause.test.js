import { beforeAll, afterEach, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let R;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool('stem_lab/stem_tool_roadready.js', 'roadReady'); R = window.__RR_TEST_EXPORTS__.roadReady; });
afterEach(() => { delete window.StemInput; });
const car = () => ({ x: 200, y: 150, heading: -Math.PI / 2, speed: 8, steering: 0.4, driveGear: 'D' });
const scenario = { curb: { x: 300, side: 'right' }, obstacles: [] };
it('freezes pose and steering, discards Park and waits for held controls to release', () => {
  const c = car(), k = { _pausePractice: true, w: true, d: true };
  for (let i = 0; i < 60; i++) {
    k._securePark = true;
    expect(R.parkingDrillStep(c, k, 1 / 60, scenario).inactive).toBe(true);
    expect(k._securePark).toBe(false);
  }
  expect(c).toMatchObject({ x: 200, y: 150, heading: -Math.PI / 2, steering: 0.4, speed: 0 });
  k._pausePractice = true;
  expect(R.parkingDrillStep(c, k, 1 / 60, scenario).inactive).toBe(true);
  expect(c.practicePaused).toBe(false);
  expect(c.requireParkingNeutral).toBe(true);
  k.w = k.d = false;
  R.parkingDrillStep(c, k, 1 / 60, scenario);
  k.w = true;
  R.parkingDrillStep(c, k, 1 / 60, scenario);
  expect(c.speed).toBeGreaterThan(0);
});
it('opening settings freezes the maneuver and requires fresh controller actions afterwards', () => {
  const c = car(), k = { _securePark: true };
  let suspended = true, actions = { throttle: 1, reverse: 1, park: 1 };
  window.StemInput = { isSuspended: () => suspended, read: () => actions };
  expect(R.parkingDrillStep(c, k, 1 / 60, scenario).inactive).toBe(true);
  expect(k._securePark).toBe(false);
  suspended = false;
  for (let i = 0; i < 10; i++) R.parkingDrillStep(c, k, 1 / 60, scenario);
  expect(c).toMatchObject({ x: 200, y: 150, steering: 0.4, driveGear: 'D', speed: 0 });
  actions = {};
  R.parkingDrillStep(c, k, 1 / 60, scenario);
  actions = { reverse: 1 };
  R.parkingDrillStep(c, k, 1 / 60, scenario);
  expect(c.driveGear).toBe('R');
  expect(k._securePark).toBe(false);
});
it('shows the original gear throughout the assisted stop in both directions', () => {
  for (const reverse of [true, false]) for (const fps of [30, 60, 120]) {
    const c = car(); c.speed = reverse ? 12 : -5; c.driveGear = reverse ? 'D' : 'R';
    const keys = reverse ? { s: true } : { w: true };
    let frames = 0;
    while (c.speed !== 0 && frames++ < fps * 3) {
      R.parkingDrillMotion(c, keys, 1 / fps);
      expect(c.driveGear).toBe(reverse ? 'D' : 'R');
    }
    expect(c.speed).toBe(0);
    R.parkingDrillMotion(c, keys, 1 / fps);
    expect(c.driveGear).toBe(reverse ? 'R' : 'D');
    expect(reverse ? c.speed < 0 : c.speed > 0).toBe(true);
  }
});
