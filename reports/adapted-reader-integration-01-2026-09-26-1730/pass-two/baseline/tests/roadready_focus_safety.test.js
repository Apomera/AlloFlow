import { beforeAll, afterEach, it, expect } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let R;
const cleanups = [];
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  R = window.__RR_TEST_EXPORTS__.roadReady;
});
afterEach(() => { while (cleanups.length) cleanups.pop()(); });

it('reserves activation keys for focused controls, including nested button content', () => {
  const keys = { current: {} };
  cleanups.push(R.attachDrillKeys(keys, () => {}));
  const button = document.createElement('button'), span = document.createElement('span');
  button.appendChild(span); document.body.appendChild(button);
  cleanups.push(() => button.remove());
  for (const key of [' ', 'Enter']) {
    const event = new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    span.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  }
  expect(keys.current).toEqual({});
  const brake = new window.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
  document.body.dispatchEvent(brake);
  expect(brake.defaultPrevented).toBe(true); expect(keys.current[' ']).toBe(true);
});

it('honors keys already handled by a component', () => {
  const keys = { current: {} };
  cleanups.push(R.attachDrillKeys(keys, () => {}));
  const event = new window.KeyboardEvent('keydown', { key: 'w', bubbles: true, cancelable: true });
  event.preventDefault(); document.body.dispatchEvent(event);
  expect(keys.current).toEqual({});
});

function parking() {
  const car = { current: { x: 254, y: 95, speed: 8, steering: 0.3 } };
  const keys = { current: { w: true, _securePark: true, _pausePractice: true, _parkingGear: 'R' } };
  const done = { current: false };
  const detach = R.attachParkingInterruption(car, keys, done);
  cleanups.push(detach);
  return { car, keys, done, detach };
}

it('pauses on window blur, clears queued actions, and waits for neutral after resume', () => {
  const { car, keys } = parking();
  window.dispatchEvent(new window.Event('blur'));
  expect(keys.current).toEqual({});
  expect(car.current).toMatchObject({ speed: 0, practicePaused: true, requireParkingNeutral: true, x: 254, y: 95 });
  window.dispatchEvent(new window.Event('focus'));
  expect(car.current.practicePaused).toBe(true);
  keys.current._pausePractice = true;
  expect(R.parkingControllerKeys(car.current, keys.current, { throttle: 1 })._practiceInactive).toBe(true);
  expect(car.current.practicePaused).toBe(false); expect(car.current.requireParkingNeutral).toBe(true);
  R.parkingControllerKeys(car.current, keys.current, {});
  expect(car.current.requireParkingNeutral).toBe(false);
  expect(R.parkingControllerKeys(car.current, keys.current, { throttle: 1 })._gpThrottle).toBe(1);
});

it('pauses on hidden tabs but does not auto-resume when visible', () => {
  const { car } = parking();
  const original = Object.getOwnPropertyDescriptor(document, 'hidden');
  cleanups.push(() => { if (original) Object.defineProperty(document, 'hidden', original); else delete document.hidden; });
  Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  document.dispatchEvent(new window.Event('visibilitychange'));
  expect(car.current.practicePaused).toBe(true);
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  document.dispatchEvent(new window.Event('visibilitychange'));
  expect(car.current.practicePaused).toBe(true);
});

it('leaves completed parking intact and removes interruption listeners on cleanup', () => {
  const { car, done, detach } = parking();
  done.current = true; car.current.parkingBrake = true;
  window.dispatchEvent(new window.Event('blur'));
  expect(car.current.practicePaused).toBeUndefined(); expect(car.current.parkingBrake).toBe(true);
  done.current = false; detach();
  window.dispatchEvent(new window.Event('blur'));
  expect(car.current.practicePaused).toBeUndefined();
});
