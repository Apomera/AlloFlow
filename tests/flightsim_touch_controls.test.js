import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host, root, cockpit, setData, latest, frameCallback, errors;
const hooks = () => window.__testHooks.flightSim;
const controls = () => hooks().controlsRef.current;
const finger = (identifier, clientX, clientY) => ({ identifier, clientX, clientY });
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent === text);
const flightButton = label => host.querySelector(`button[aria-label="${label}"]`);
const yawButton = direction => host.querySelector(`button[data-flight-yaw="${direction}"]`);
function focusCockpit() {
  cockpit = host.querySelector('canvas[role="application"]');
  vi.spyOn(cockpit, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 50, width: 1000, height: 600 });
  cockpit.focus();
}
async function launchAircraft(aircraft, railCollapsed) {
  const previousAttempt = latest.flightSim.flightPractice?.attemptId;
  if (!button('✕ Exit')) await act(async () => { flightButton('Expand the flight deck controls').click(); });
  await act(async () => { button('✕ Exit').click(); });
  expect(latest.flightSim.view).toBe('debrief');
  expect(latest.flightSim.flightPractice).toBeNull();
  const endedAttempt = latest.flightSim.lastDebrief.attemptId;
  if (previousAttempt) expect(endedAttempt).toBe(previousAttempt);
  await act(async () => { button('🏠 Back to Menu').click(); });
  expect(latest.flightSim.view).toBe('menu');
  await act(async () => {
    setData(previous => ({ ...previous, flightSim: { ...previous.flightSim,
      aircraft, railCollapsed, showHelp: false,
      autopilot: { hdg: false, alt: false, spd: false },
    } }));
  });
  await act(async () => { flightButton('Free Flight from Portland, ME').click(); });
  expect(latest.flightSim.view).toBe('flying');
  expect(latest.flightSim.flightPractice.attemptId).not.toBe(endedAttempt);
  expect(hooks().timeRef.current).toBe(0);
  expect(hooks().pausedRef.current).toBe(false);
  expect(controls()).toMatchObject({ throttle: 0, pitch: 0, bank: 0, brake: 0 });
  focusCockpit();
}
function airborne() {
  Object.assign(hooks().flightRef.current, { speed: 80 / 0.5924838, altitude: 3000,
    fieldElev: 72, vsi: 0, heading: 180, onGround: false });
  Object.assign(controls(), { pitch: 0, bank: 0, yawRate: 0, throttle: 0.5 });
  Object.assign(hooks().getWeatherRef().current, { type: 'clear', wind: 0, turbulence: 0 });
}
async function engageAutopilot() {
  await act(async () => {
    setData(previous => ({ ...previous, flightSim: { ...previous.flightSim,
      autopilot: { hdg: true, alt: true, spd: true, tgtHdg: 270, tgtAlt: 7000, tgtSpd: 160 },
    } }));
  });
}
function expectManualAutopilot() {
  expect(latest.flightSim.autopilot).toMatchObject({ hdg: false, alt: false, spd: false });
}
function touch(type, changedTouches, touches) {
  const event = new TouchEvent(type, { bubbles: true, cancelable: true, changedTouches, touches, targetTouches: touches });
  cockpit.dispatchEvent(event);
  return event;
}
async function frame() {
  expect(frameCallback).toBeTypeOf('function');
  await act(async () => { vi.advanceTimersByTime(34); frameCallback(); });
  expect(errors).not.toHaveBeenCalled();
}
function deflect() {
  const stick = finger(0, 300, 350), power = finger(9, 1030, 450);
  touch('touchstart', [stick, power], [stick, power]);
  const movedStick = finger(0, 340, 310), movedPower = finger(9, 1030, 390);
  touch('touchmove', [movedPower, movedStick], [movedPower, movedStick]);
  return { stick: movedStick, power: movedPower };
}

beforeEach(async () => {
  vi.useFakeTimers();
  resetStemLab();
  window.__testHooks = {};
  const tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const context = new Proxy({
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  }, {
    get(target, property) { return property in target ? target[property] : () => {}; },
    set(target, property, value) { target[property] = value; return true; },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  frameCallback = null;
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => {
    if (callback.name === 'loop') frameCallback = callback;
    return 1;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, updateData] = React.useState({ flightSim: { view: 'menu', railCollapsed: false,
      takeoffTutorialDismissed: true, landingTutorialDismissed: true } });
    latest = data;
    setData = updateData;
    return tool.render(makeCtx({ toolData: data, setToolData: updateData,
      update: (id, key, value) => updateData(previous => ({ ...previous, [id]: { ...previous[id], [key]: value } })),
      updateMulti: (id, patch) => updateData(previous => ({ ...previous, [id]: { ...previous[id], ...patch } })),
    }));
  }
  await act(async () => { root.render(React.createElement(App)); });
  const launch = host.querySelector('button[aria-label="Free Flight from Portland, ME"]');
  expect(launch).toBeTruthy();
  await act(async () => { launch.click(); });
  focusCockpit();
});

afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  host?.remove();
  root = null;
  delete window.__testHooks;
  delete document.hidden;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('SkySchool simultaneous touch controls', () => {
  it('tracks stick and power by identifier regardless of TouchList order', () => {
    const stick = finger(0, 300, 350), power = finger(9, 1030, 450);
    expect(touch('touchstart', [stick], [stick]).defaultPrevented).toBe(true);
    touch('touchstart', [power], [power, stick]);
    touch('touchmove', [finger(0, 340, 310)], [power, finger(0, 340, 310)]);
    expect(controls()).toMatchObject({ pitch: 7.5, bank: 22.5, throttle: 0 });
    touch('touchmove', [finger(9, 1030, 390)], [finger(9, 1030, 390), finger(0, 340, 310)]);
    expect(controls()).toMatchObject({ pitch: 7.5, bank: 22.5, throttle: 0.3 });
    expect(cockpit.style.touchAction).toBe('none');
  });

  it('releases only the stick while the power finger continues to operate', () => {
    const { stick, power } = deflect();
    touch('touchend', [stick], [power]);
    expect(controls()).toMatchObject({ pitch: 0, bank: 0, throttle: 0.3 });
    touch('touchmove', [finger(9, 1030, 350)], [finger(9, 1030, 350)]);
    expect(controls().throttle).toBe(0.5);
  });

  it('keeps a stationary stick held across frames after the power finger ends', async () => {
    const { stick, power } = deflect();
    touch('touchend', [power], [stick]);
    await frame();
    await frame();
    expect(controls()).toMatchObject({ pitch: 7.5, bank: 22.5, throttle: 0.3 });
    touch('touchmove', [finger(0, 260, 390)], [finger(0, 260, 390)]);
    expect(controls()).toMatchObject({ pitch: -7.5, bank: -22.5, throttle: 0.3 });
  });

  it('ignores spare fingers in an owned zone without adopting them on release', () => {
    const { stick, power } = deflect();
    const spare = finger(3, 600, 300);
    touch('touchstart', [spare], [spare, power, stick]);
    touch('touchmove', [finger(3, 200, 600)], [finger(3, 200, 600), power, stick]);
    expect(controls()).toMatchObject({ pitch: 7.5, bank: 22.5, throttle: 0.3 });
    touch('touchend', [spare], [power, stick]);
    expect(controls().pitch).toBe(7.5);
    touch('touchstart', [spare], [spare, power, stick]);
    touch('touchend', [stick], [power, spare]);
    touch('touchmove', [finger(3, 200, 600)], [finger(3, 200, 600), power]);
    expect(controls()).toMatchObject({ pitch: 0, bank: 0, throttle: 0.3 });
    touch('touchend', [spare], [power]);
    touch('touchstart', [finger(3, 400, 300)], [power, finger(3, 400, 300)]);
    touch('touchmove', [finger(3, 440, 260)], [power, finger(3, 440, 260)]);
    expect(controls()).toMatchObject({ pitch: 7.5, bank: 22.5, throttle: 0.3 });
  });

  it('keeps zone ownership after a finger crosses the zone boundary and clamps inputs', () => {
    const { power } = deflect();
    touch('touchmove', [finger(0, 1050, -500)], [power, finger(0, 1050, -500)]);
    expect(controls()).toMatchObject({ pitch: 15, bank: 45, throttle: 0.3 });
    touch('touchmove', [finger(9, 300, -500)], [finger(9, 300, -500), finger(0, 1050, -500)]);
    expect(controls()).toMatchObject({ pitch: 15, bank: 45, throttle: 1 });
    touch('touchmove', [finger(9, 300, 900)], [finger(9, 300, 900)]);
    expect(controls().throttle).toBe(0);
    touch('touchmove', [finger(0, NaN, Infinity)], [finger(0, NaN, Infinity)]);
    expect(controls()).toMatchObject({ pitch: 15, bank: 45, throttle: 0 });
  });

  it('cancels one owner without dropping the other and clears all owners on blur', async () => {
    const { stick, power } = deflect();
    touch('touchcancel', [power], [stick]);
    touch('touchmove', [finger(0, 380, 270)], [finger(0, 380, 270)]);
    expect(controls()).toMatchObject({ pitch: 15, bank: 45, throttle: 0.3 });
    await act(async () => { window.dispatchEvent(new Event('blur')); });
    expect(hooks().pausedRef.current).toBe(true);
    expect(controls()).toMatchObject({ pitch: 0, bank: 0, throttle: 0.3 });
    touch('touchmove', [finger(0, 340, 310)], [finger(0, 340, 310)]);
    expect(controls()).toMatchObject({ pitch: 0, bank: 0, throttle: 0.3 });
  });

  it('clears owners when the document is hidden and when the flight view unmounts', async () => {
    deflect();
    await act(async () => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(hooks().pausedRef.current).toBe(true);
    expect(controls()).toMatchObject({ pitch: 0, bank: 0, throttle: 0.3 });
    await act(async () => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(hooks().pausedRef.current).toBe(true);
    deflect();
    expect(controls()).toMatchObject({ pitch: 0, bank: 0, throttle: 0.3 });
    await act(async () => { flightButton('Resume flight').click(); });
    expect(hooks().pausedRef.current).toBe(false);
    deflect();
    expect(controls()).toMatchObject({ pitch: 7.5, bank: 22.5, throttle: 0.6 });
    const ref = hooks().controlsRef;
    await act(async () => { setData(previous => ({ ...previous, flightSim: { ...previous.flightSim, view: 'menu' } })); });
    expect(ref.current).toMatchObject({ pitch: 0, bank: 0, throttle: 0.6 });
    touch('touchmove', [finger(0, 500, 200)], [finger(0, 500, 200)]);
    expect(ref.current).toMatchObject({ pitch: 0, bank: 0, throttle: 0.6 });
  });

  it('blocks new and stale touch input while paused and does not advance the flight', async () => {
    deflect();
    await act(async () => { host.querySelector('button[aria-label="Pause flight"]').click(); });
    expect(controls()).toMatchObject({ pitch: 0, bank: 0, throttle: 0.3 });
    const saved = { ...controls() };
    touch('touchstart', [finger(11, 300, 300), finger(12, 1050, 400)], [finger(11, 300, 300), finger(12, 1050, 400)]);
    touch('touchmove', [finger(11, 400, 200), finger(12, 1050, 200)], [finger(11, 400, 200), finger(12, 1050, 200)]);
    expect(controls()).toEqual(saved);
    await frame();
    const time = hooks().timeRef.current, state = { ...hooks().flightRef.current };
    await frame();
    expect(hooks().timeRef.current).toBe(time);
    expect(hooks().flightRef.current).toEqual(state);
    await act(async () => { host.querySelector('button[aria-label="Resume flight"]').click(); });
    touch('touchmove', [finger(0, 400, 200), finger(9, 1030, 200)], [finger(0, 400, 200), finger(9, 1030, 200)]);
    expect(controls()).toMatchObject(saved);
  });

  it('opening help clears touch ownership and closing it requires a fresh gesture', async () => {
    deflect();
    await act(async () => { button('Controls and help').click(); });
    expect(controls()).toMatchObject({ pitch: 0, bank: 0, throttle: 0.3 });
    touch('touchstart', [finger(11, 300, 300)], [finger(11, 300, 300)]);
    touch('touchmove', [finger(11, 400, 200)], [finger(11, 400, 200)]);
    expect(controls()).toMatchObject({ pitch: 0, bank: 0, throttle: 0.3 });
    await act(async () => { button('Close help').click(); });
    touch('touchmove', [finger(11, 400, 200)], [finger(11, 400, 200)]);
    expect(controls()).toMatchObject({ pitch: 0, bank: 0, throttle: 0.3 });
    deflect();
    expect(controls()).toMatchObject({ pitch: 7.5, bank: 22.5, throttle: 0.6 });
  });

  it('retains keyboard overrides while a touch stick is held', async () => {
    deflect();
    cockpit.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    cockpit.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    cockpit.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', bubbles: true, cancelable: true }));
    await frame();
    expect(controls().pitch).toBeLessThan(7.5);
    expect(controls().bank).toBeLessThan(22.5);
    expect(controls().throttle).toBeGreaterThan(0.3);
    const held = { ...controls() };
    ['ArrowDown', 'ArrowLeft', 'Shift'].forEach(key => cockpit.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true })));
    // Moving only power must not reapply the stationary stick coordinates.
    touch('touchmove', [finger(9, 1030, 350)], [finger(9, 1030, 350), finger(0, 340, 310)]);
    await frame();
    expect(controls().pitch).toBe(held.pitch);
    expect(controls().bank).toBe(held.bank);
    expect(controls().throttle).toBe(0.5);
  });
});

describe('SkySchool manual takeover and rotor touch controls', () => {
  it.each([
    ['rescue_heli', 20, 30],
    ['drone', 25, 25],
  ])('uses the %s cyclic range for proportional drags and both extremes', async (aircraft, pitch, bank) => {
    await launchAircraft(aircraft, false);
    const origin = finger(0, 300, 350);
    touch('touchstart', [origin], [origin]);
    touch('touchmove', [finger(0, 340, 310)], [finger(0, 340, 310)]);
    expect(controls()).toMatchObject({ pitch: pitch / 2, bank: bank / 2 });
    touch('touchmove', [finger(0, 500, 150)], [finger(0, 500, 150)]);
    expect(controls()).toMatchObject({ pitch, bank });
    await frame();
    expect(controls()).toMatchObject({ pitch, bank });
    touch('touchmove', [finger(0, 100, 550)], [finger(0, 100, 550)]);
    expect(controls()).toMatchObject({ pitch: -pitch, bank: -bank });
    touch('touchend', [finger(0, 100, 550)], []);
    expect(controls()).toMatchObject({ pitch: 0, bank: 0 });
  });

  it('keeps intentional touch steering when autopilot disengages in the same frame', async () => {
    airborne();
    await engageAutopilot();
    const origin = finger(0, 300, 350);
    await act(async () => {
      touch('touchstart', [origin], [origin]);
      touch('touchmove', [finger(0, 340, 310)], [finger(0, 340, 310)]);
    });
    await frame();
    expectManualAutopilot();
    expect(controls()).toMatchObject({ pitch: 7.5, bank: 22.5, throttle: 0.5 });
  });

  it('keeps intentional touch power when autopilot disengages in the same frame', async () => {
    airborne();
    await engageAutopilot();
    const origin = finger(9, 1030, 450);
    await act(async () => {
      touch('touchstart', [origin], [origin]);
      touch('touchmove', [finger(9, 1030, 390)], [finger(9, 1030, 390)]);
    });
    await frame();
    expectManualAutopilot();
    expect(controls()).toMatchObject({ pitch: 0, bank: 0, throttle: 0.8 });
  });

  it('keeps autopilot engaged when fingers touch or report unchanged coordinates', async () => {
    airborne();
    await engageAutopilot();
    const stick = finger(0, 300, 350), power = finger(9, 1030, 450);
    touch('touchstart', [stick, power], [stick, power]);
    touch('touchmove', [stick, power], [stick, power]);
    await frame();
    expect(latest.flightSim.autopilot).toMatchObject({ hdg: true, alt: true, spd: true });
    expect(controls().bank).toBeCloseTo(30 / 60, 10);
    expect(controls().pitch).toBeGreaterThan(0);
    expect(controls().pitch).toBeLessThan(1);
    expect(controls().throttle).toBeGreaterThan(0.5);
  });

  it.each([
    ['pitch', 'w', 'cessna172', {}],
    ['bank', 'd', 'cessna172', {}],
    ['power increase', 'Shift', 'cessna172', { shiftKey: true }],
    ['power decrease', 'Control', 'cessna172', { ctrlKey: true }],
    ['yaw', 'q', 'drone', {}],
  ])('applies keyboard %s on the frame that releases autopilot', async (input, key, aircraft, modifiers) => {
    if (aircraft !== 'cessna172') await launchAircraft(aircraft, false);
    airborne();
    await engageAutopilot();
    cockpit.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers }));
    await frame();
    expectManualAutopilot();
    if (input === 'pitch') expect(controls().pitch).toBeGreaterThan(0);
    else expect(controls().pitch).toBe(0);
    if (input === 'bank') expect(controls().bank).toBeGreaterThan(0);
    else expect(controls().bank).toBe(0);
    // The initial manual step is small. An AP command would instead impose
    // 25 degrees bank or 8 degrees pitch on this same frame.
    expect(Math.abs(controls().pitch)).toBeLessThan(2);
    expect(Math.abs(controls().bank)).toBeLessThan(2);
    if (input === 'power increase') expect(controls().throttle).toBeGreaterThan(0.5);
    else if (input === 'power decrease') expect(controls().throttle).toBeLessThan(0.5);
    else expect(controls().throttle).toBe(0.5);
    if (input === 'yaw') expect(controls().yawRate).toBeLessThan(0);
    cockpit.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, ...modifiers }));
  });

  it.each(['rescue_heli', 'drone'])('turns the %s nose with accessible click controls and stops without drift', async aircraft => {
    await launchAircraft(aircraft, false);
    airborne();
    const left = yawButton(-1), stop = yawButton(0), right = yawButton(1);
    expect(left?.textContent).toBe('Turn nose left');
    expect(stop?.textContent).toBe('Stop turning');
    expect(right?.textContent).toBe('Turn nose right');
    for (const control of [left, stop, right]) {
      expect(control.disabled).toBe(false);
      expect(control.tabIndex).toBeGreaterThanOrEqual(0);
    }
    await engageAutopilot();
    await act(async () => { left.click(); });
    expect(yawButton(-1).getAttribute('aria-pressed')).toBe('true');
    expect(yawButton(1).getAttribute('aria-pressed')).toBe('false');
    await frame();
    expectManualAutopilot();
    const leftHeading = hooks().flightRef.current.heading;
    expect(leftHeading).toBeLessThan(180);
    expect(controls().yawRate).toBe(-15);
    await act(async () => { right.click(); });
    await frame();
    expect(hooks().flightRef.current.heading).toBeGreaterThan(leftHeading);
    expect(controls().yawRate).toBe(15);
    expect(yawButton(-1).getAttribute('aria-pressed')).toBe('false');
    expect(yawButton(1).getAttribute('aria-pressed')).toBe('true');
    await act(async () => { stop.click(); });
    expect(controls().yawRate).toBe(0);
    const stoppedHeading = hooks().flightRef.current.heading;
    await frame();
    await frame();
    expect(hooks().flightRef.current.heading).toBe(stoppedHeading);
    expect(yawButton(-1).getAttribute('aria-pressed')).toBe('false');
    expect(yawButton(1).getAttribute('aria-pressed')).toBe('false');
    expect(cockpit.getAttribute('aria-label')).toMatch(/Q\s*\/\s*E|Q\s*and\s*E|Q\s*·\s*E/i);
    expect(cockpit.getAttribute('aria-label')).not.toMatch(/Q quiz/i);
  });

  it.each(['pause', 'help', 'fold'])('clears latched yaw on %s and requires a new command afterward', async boundary => {
    await launchAircraft('drone', false);
    airborne();
    await act(async () => { yawButton(-1).click(); });
    await frame();
    const stoppedHeading = hooks().flightRef.current.heading;
    if (boundary === 'pause') {
      await act(async () => { flightButton('Pause flight').click(); });
      await act(async () => { yawButton(1).click(); });
      expect(controls().yawRate).toBe(0);
      await act(async () => { flightButton('Resume flight').click(); });
    } else if (boundary === 'help') {
      await act(async () => { button('Controls and help').click(); });
      expect(host.querySelector('[data-flight-yaw]')).toBeNull();
      expect(hooks().pausedRef.current).toBe(true);
      expect(controls().yawRate).toBe(0);
      await act(async () => { button('Close help').click(); });
    } else {
      await act(async () => { flightButton('Collapse the flight deck controls').click(); });
      expect(host.querySelector('[data-flight-yaw]')).toBeNull();
      await act(async () => { flightButton('Expand the flight deck controls').click(); });
    }
    expect(controls().yawRate).toBe(0);
    await frame();
    expect(hooks().flightRef.current.heading).toBe(stoppedHeading);
    expect(yawButton(-1).getAttribute('aria-pressed')).toBe('false');
    expect(yawButton(1).getAttribute('aria-pressed')).toBe('false');
    await act(async () => { yawButton(1).click(); });
    await frame();
    expect(hooks().flightRef.current.heading).toBeGreaterThan(stoppedHeading);
  });

  it.each(['blur', 'hidden'])('clears latched yaw when the window is %s', async boundary => {
    await launchAircraft('rescue_heli', false);
    airborne();
    await act(async () => { yawButton(1).click(); });
    await frame();
    const stoppedHeading = hooks().flightRef.current.heading;
    await act(async () => {
      if (boundary === 'blur') window.dispatchEvent(new Event('blur'));
      else {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      }
    });
    expect(controls().yawRate).toBe(0);
    await frame();
    expect(hooks().flightRef.current.heading).toBe(stoppedHeading);
    expect(yawButton(1).getAttribute('aria-pressed')).toBe('false');
  });

  it('clears latched yaw when the flight display unmounts', async () => {
    await launchAircraft('drone', false);
    airborne();
    await act(async () => { yawButton(1).click(); });
    await frame();
    const controlRef = hooks().controlsRef;
    await act(async () => { setData(previous => ({ ...previous, flightSim: { ...previous.flightSim, view: 'menu' } })); });
    expect(controlRef.current.yawRate).toBe(0);
    expect(host.querySelector('[data-flight-yaw]')).toBeNull();
  });

  it.each(['rescue_heli', 'drone'])('keeps %s yaw buttons inside the folded deck until expanded', async aircraft => {
    expect(host.querySelector('[data-flight-yaw]')).toBeNull(); // Fixed-wing has no yaw buttons.
    await launchAircraft(aircraft);
    expect(latest.flightSim.railCollapsed).toBe(true);
    expect(host.querySelector('[data-flight-yaw]')).toBeNull();
    await act(async () => { flightButton('Expand the flight deck controls').click(); });
    expect(host.querySelectorAll('button[data-flight-yaw]')).toHaveLength(3);
  });
});
