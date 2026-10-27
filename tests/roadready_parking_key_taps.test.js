import { beforeAll, afterEach, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let R, detach;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool('stem_lab/stem_tool_roadready.js', 'roadReady'); R = window.__RR_TEST_EXPORTS__.roadReady; });
afterEach(() => { if (detach) detach(); delete window.StemInput; });
const car = () => ({ x: 200, y: 150, heading: -Math.PI / 2, speed: 0, steering: 0, driveGear: 'D' });
function input() { const ref = { current: {} }; detach = R.attachDrillKeys(ref, () => {}); return ref; }
// WCAG 2.1.4: drill letter/Space keys act only while focus is inside a drill root.
function drillRoot() { let r = document.querySelector('[data-rr-drill]'); if (!r) { r = document.createElement('div'); r.setAttribute('data-rr-drill', 'true'); document.body.appendChild(r); } return r; }
function tap(key) { for (const type of ['keydown', 'keyup']) drillRoot().dispatchEvent(new window.KeyboardEvent(type, { key, bubbles: true })); }
it('accepts quick gear and Park taps occurring entirely between frames', () => {
  const ref = input(), c = car();
  tap('g'); expect(ref.current.g).toBe(false);
  R.parkingControllerKeys(c, ref.current, {}); expect(c.driveGear).toBe('R');
  tap('f'); R.parkingControllerKeys(c, ref.current, {}); expect(c.driveGear).toBe('D');
  tap('p'); R.parkingControllerKeys(c, ref.current, {}); expect(ref.current._securePark).toBe(true);
  ref.current._securePark = false; R.parkingControllerKeys(c, ref.current, {}); expect(ref.current._securePark).toBe(false);
});
it('uses the latest gear tap and rejects gear changes while moving', () => {
  const ref = input(), c = car();
  tap('g'); tap('f'); R.parkingControllerKeys(c, ref.current, {}); expect(c.driveGear).toBe('D');
  c.speed = 4; tap('g'); R.parkingControllerKeys(c, ref.current, {});
  expect(c.driveGear).toBe('D'); expect(c.controlNotice).toContain('Stop before changing gear');
  c.speed = 0; R.parkingControllerKeys(c, ref.current, {}); expect(c.driveGear).toBe('D');
});
it('discards brief requests during pause and settings rather than replaying them', () => {
  const ref = input(), c = { ...car(), practicePaused: true };
  tap('g'); tap('p'); R.parkingControllerKeys(c, ref.current, {});
  expect(c.driveGear).toBe('D'); expect(ref.current._securePark).toBe(false);
  c.practicePaused = false;
  window.StemInput = { isSuspended: () => true };
  tap('g'); tap('p'); R.parkingDrillStep(c, ref.current, 1 / 60, { curb: { x: 300 }, obstacles: [] });
  delete window.StemInput;
  R.parkingControllerKeys(c, ref.current, {}); R.parkingControllerKeys(c, ref.current, {});
  expect(c.driveGear).toBe('D'); expect(ref.current._securePark).toBe(false);
});
