import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { act } = React;
let api, tool, root, host, latest, updateSaved, frameCallback, wallTime, errors, awardXP, canvasText;
const hooks = () => window.__testHooks.flightSim;

beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  api = window.__RR_TEST_EXPORTS__.flightSim;
  canvasText = vi.fn();
  const context = new Proxy({
    fillText: canvasText,
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  }, { get: (target, key) => key in target ? target[key] : () => {},
    set: (target, key, value) => { target[key] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  wallTime = 1000;
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  vi.stubGlobal('requestAnimationFrame', callback => { if (callback.name === 'loop') frameCallback = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  awardXP = vi.fn();
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  expect(errors).not.toHaveBeenCalled();
  host?.remove(); root = host = frameCallback = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
  delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
});

async function mount() {
  function App() {
    const [data, update] = React.useState({ flightSim: { view: 'menu', aircraft: 'drone', railCollapsed: true,
      takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(a => [a.id, true])) } });
    latest = data.flightSim;
    updateSaved = patch => update(old => ({ ...old, flightSim: { ...old.flightSim, ...patch } }));
    return tool.render(makeCtx({ toolData: data, setToolData: update, awardXP,
      update: (id, key, value) => update(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => update(old => ({ ...old, [id]: { ...old[id], ...patch } })) }));
  }
  await act(async () => root.render(React.createElement(App)));
  vi.spyOn(api.Physics, 'step').mockImplementation(state => ({ ...state,
    forces: { lift: api.Physics.WEIGHT, weight: api.Physics.WEIGHT, thrust: 0, drag: 0 } }));
}

async function start(battery = 100) {
  await act(async () => host.querySelector('button[aria-label="Free Flight from Portland, ME"]').click());
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 1280 });
    Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: 720 });
  }
  Object.assign(hooks().getWeatherRef().current, { wind: 0, turbulence: 0, type: 'clear' });
  Object.assign(hooks().controlsRef.current, { throttle: 1, pitch: 0, bank: 0 });
  const airport = api.WAYPOINTS.find(w => w.id === 'kpwm');
  Object.assign(hooks().flightRef.current, { lat: airport.lat, lon: airport.lon,
    altitude: airport.alt + 50, fieldElev: airport.alt, speed: 0, vsi: 0, onGround: false,
    stalling: false, lowAirspeed: false, groundContact: null });
  await act(async () => updateSaved({ survey: { active: true, completed: false, mode: 'aerial', battery,
    capturedCount: 0, captureProgress: 0, launchLat: airport.lat, launchLon: airport.lon,
    photos: [{ name: 'Distant target', lat: airport.lat + 0.01, lon: airport.lon + 0.01, captured: false }] } }));
}

async function frames(count = 1) {
  for (let i = 0; i < count; i++) {
    wallTime += 100;
    await act(async () => frameCallback());
  }
}

async function finish() {
  hooks().keysRef.current.escape = true;
  await frames();
  expect(latest.view).toBe('debrief');
}

describe('drone mission battery follows active simulation time', () => {
  it.each(['aerial', 'powerline'])('keeps %s hold time with its own target when the nearest target changes', async mode => {
    await mount(); await start();
    const initial = { ...hooks().flightRef.current };
    const secondLat = initial.lat + 0.0001;
    await act(async () => updateSaved({ survey: { ...latest.survey, mode,
      photos: [{ name: 'First target', lat: initial.lat, lon: initial.lon, captured: false },
        { name: 'Second target', lat: secondLat, lon: initial.lon, captured: false }] } }));
    // Both targets are within the capture envelope, but each requires its
    // own full hold. A change in the nearest target cannot transfer time.
    await frames(10);
    expect(latest.survey.captureProgress).toBeGreaterThan(0.8);
    expect(latest.survey.photos.map(photo => photo.captured)).toEqual([false, false]);
    const firstKey = latest.survey.captureTargetKey;
    hooks().flightRef.current.lat = secondLat;
    expect(api.getFlightMissionGuidance(hooks().flightRef.current, { survey: latest.survey }, { gsKts: 0 }).holdProgress).toBe(0);
    await frames(8);
    expect(latest.survey.captureTargetKey).not.toBe(firstKey);
    expect(latest.survey.captureProgress).toBeLessThan(0.9);
    expect(latest.survey.photos.map(photo => photo.captured)).toEqual([false, false]);
    await frames(mode === 'powerline' ? 8 : 13);
    expect(latest.survey.photos.map(photo => photo.captured)).toEqual([false, true]);
    expect(latest.survey.capturedCount).toBe(1);
    expect(awardXP).not.toHaveBeenCalled();
  });

  it('clears hold progress if the target coordinates change in place', async () => {
    await mount(); await start();
    const state = hooks().flightRef.current;
    await act(async () => updateSaved({ survey: { ...latest.survey,
      photos: [{ name: 'Target', lat: state.lat, lon: state.lon, captured: false }] } }));
    await frames(13);
    expect(latest.survey.captureProgress).toBeGreaterThan(1.1);
    const movedLat = state.lat + 0.0001;
    await act(async () => updateSaved({ survey: { ...latest.survey,
      photos: [{ ...latest.survey.photos[0], lat: movedLat }] } }));
    hooks().flightRef.current.lat = movedLat;
    expect(api.getFlightMissionGuidance(hooks().flightRef.current, { survey: latest.survey }, { gsKts: 0 }).holdProgress).toBe(0);
    await frames(10);
    expect(latest.survey.photos[0].captured).toBe(false);
    expect(latest.survey.captureProgress).toBeLessThan(1.1);
    await frames(11);
    expect(latest.survey.photos[0].captured).toBe(true);
  });

  it('ignores nonboolean mission activation without crashing the simulation tick', async () => {
    await mount(); await start();
    await act(async () => updateSaved({ survey: { ...latest.survey, active: 1 },
      rescue: { active: 'true', survivorLat: 43.6, survivorLon: -70.3 } }));
    await frames(3);
    expect(hooks().getMissionGuidance()).toBeNull();
    expect(awardXP).not.toHaveBeenCalled();
  });

  it.each([NaN, Infinity, '75', 101])('does not recharge invalid saved battery evidence: %j', async battery => {
    await mount(); await start(battery); await frames(3);
    expect(hooks().getMissionGuidance().phase).toBe('unavailable');
    expect(latest.survey.battery).toBe(battery);
    expect(awardXP).not.toHaveBeenCalled();
  });

  it('pauses a negative saved charge as depleted instead of recharging it', async () => {
    await mount(); await start(-1); await frames(3);
    expect(latest.survey).toMatchObject({ battery: 0, batteryExhausted: true });
    expect(hooks().pausedRef.current).toBe(true);
    expect(awardXP).not.toHaveBeenCalled();
  });

  it.each([{ mode: 'unknown', photos: [null] }, { mode: 'aerial', photos: [null] }])('safely renders malformed completed mission data: %j', async patch => {
    await mount(); await start();
    await act(async () => updateSaved({ survey: { ...latest.survey, completed: true, ...patch } }));
    await frames(3);
    expect(awardXP).not.toHaveBeenCalled();
  });

  it('makes target and return directions readable and available through the status button and I key', async () => {
    await mount(); await start(); await frames(3);
    const card = host.querySelector('[data-flight-mission-guidance]');
    expect(card).toBeTruthy();
    expect(card.getAttribute('aria-live')).toBe('off');
    expect(card.querySelector('[data-mission-route]').textContent).toContain('Distant target');
    expect(card.querySelector('[data-mission-criterion]').textContent).toContain('above 5 and below 100 ft AGL');
    expect(card.querySelector('[data-mission-criterion]').textContent).toContain('ground speed below 8 kt');
    expect(hooks().getMissionGuidance().targetIndex).toBe(0);
    const before = card.querySelector('[data-mission-route]').textContent;
    hooks().flightRef.current.lat -= 0.01;
    await frames(4);
    expect(card.querySelector('[data-mission-route]').textContent).not.toBe(before);
    await act(async () => updateSaved({ survey: { ...latest.survey, capturedCount: 999,
      photos: latest.survey.photos.map(photo => ({ ...photo, captured: true })) } }));
    await frames(3);
    expect(hooks().getMissionGuidance().phase).toBe('return');
    expect(card.querySelector('[data-mission-route]').textContent).toContain('Launch point');
    expect(card.querySelector('[data-mission-action]').textContent).toBe('Return to launch and land.');
    expect(card.querySelector('[data-mission-criterion]').textContent).toContain('0.2 nm');
    expect(latest.survey.capturedCount).toBe(1);
    expect(latest.survey.completed).toBe(false);
    await act(async () => card.querySelector('button').click());
    await new Promise(resolve => setTimeout(resolve, 70));
    expect(document.getElementById('skyschool-a11y-live').textContent).toContain('Launch point');
    hooks().keysRef.current.i = true;
    await frames();
    await new Promise(resolve => setTimeout(resolve, 70));
    expect(document.getElementById('skyschool-a11y-live').textContent).toContain('Return to launch and land.');
    expect(document.getElementById('skyschool-a11y-live').textContent).not.toContain('Next discovery:');
  });

  it.each([[], [null], [{ name: 'Broken', captured: false, lat: NaN, lon: 1 }]])('cannot award completion for empty or corrupt target evidence: %j', async photos => {
    await mount(); await start();
    Object.assign(hooks().flightRef.current, { onGround: true, altitude: 76, fieldElev: 76 });
    await act(async () => updateSaved({ survey: { ...latest.survey, capturedCount: 999, photos } }));
    await frames(3);
    expect(latest.survey.completed).toBe(false);
    expect(latest.surveysCompleted || 0).toBe(0);
    expect(awardXP).not.toHaveBeenCalled();
    expect(host.querySelector('[data-mission-action]').textContent).toContain('Mission target data is unavailable');
    expect(hooks().getNavigation()).toBeNull();
    expect(hooks().getMissionGuidance().destination).toBeNull();
  });

  it('does not trust an inflated captured count and completes once only after all target flags and return landing', async () => {
    await mount(); await start();
    Object.assign(hooks().flightRef.current, { onGround: true, altitude: 76, fieldElev: 76 });
    await act(async () => updateSaved({ survey: { ...latest.survey, capturedCount: 999 } }));
    await frames(3);
    expect(latest.survey.completed).toBe(false);
    expect(latest.survey.capturedCount).toBe(0);
    expect(awardXP).not.toHaveBeenCalled();
    Object.assign(hooks().flightRef.current, { speed: 0, rotorForwardFps: 0,
      groundContact: { vsi: -2, speed: 0, rotorForwardFps: 0 } });
    await act(async () => updateSaved({ survey: { ...latest.survey,
      photos: latest.survey.photos.map(photo => ({ ...photo, captured: true })) } }));
    await frames(3);
    expect(latest.survey).toMatchObject({ completed: true, returnedToLaunch: true });
    expect(latest.surveysCompleted).toBe(1);
    expect(awardXP).toHaveBeenCalledTimes(1);
    expect(hooks().getMissionGuidance().phase).toBe('complete');
    expect(hooks().getMissionGuidance().destination).toBeNull();
    await frames(6);
    expect(awardXP).toHaveBeenCalledTimes(1);
  });

  it('switches rescue guidance from the survivor to PWM after recovery', async () => {
    await mount(); await start();
    const state = hooks().flightRef.current;
    await act(async () => updateSaved({ aircraft: 'rescue_heli', survey: null,
      rescue: { active: true, completed: false, recovered: false,
        survivorLat: state.lat + 0.1, survivorLon: state.lon + 0.1, hoistTime: 0, startedAt: 0.1 } }));
    await frames(3);
    expect(host.querySelector('[data-mission-route]').textContent).toContain('SURVIVOR');
    expect(hooks().getMissionGuidance().destination.code).toBe('SOS');
    await act(async () => updateSaved({ rescue: { ...latest.rescue, recovered: true, recoveredAt: 1 } }));
    await frames(3);
    expect(host.querySelector('[data-mission-route]').textContent).toContain('PWM');
    expect(host.querySelector('[data-mission-criterion]').textContent).toContain('0.5 nm');
    expect(hooks().getMissionGuidance().destination.code).toBe('PWM');
    expect(latest.rescue.completed).toBe(false);
  });

  it('accumulates travel drain across frames and flushes the last fraction on End Flight', async () => {
    await mount(); await start(); await frames(60);
    const expected = 100 - 0.17 * hooks().timeRef.current;
    expect(latest.survey.battery).toBeLessThan(99.5);
    expect(latest.survey.battery).toBeGreaterThanOrEqual(expected);
    expect(latest.survey.battery - expected).toBeLessThanOrEqual(0.5);
    await finish();
    expect(latest.survey.battery).toBeCloseTo(expected, 8);
    expect(latest.survey.capturedCount).toBe(0);
  });

  it('holds the battery while paused and resumes drain with flight time', async () => {
    await mount(); await start(); await frames(40);
    hooks().keysRef.current[' '] = true;
    await frames();
    expect(hooks().pausedRef.current).toBe(true);
    const heldTime = hooks().timeRef.current, heldBattery = latest.survey.battery;
    await frames(20);
    expect(hooks().timeRef.current).toBe(heldTime);
    expect(latest.survey.battery).toBe(heldBattery);
    hooks().keysRef.current[' '] = true;
    await frames(); await frames(20); await finish();
    expect(latest.survey.battery).toBeCloseTo(100 - 0.17 * hooks().timeRef.current, 8);
    expect(hooks().timeRef.current).toBeGreaterThan(heldTime);
  });

  it('starts each mission from its new battery and never drains below zero', async () => {
    await mount(); await start(0.05); await frames(10);
    expect(latest.survey.battery).toBe(0);
    await finish();
    expect(latest.survey.battery).toBe(0);
    await act(async () => updateSaved({ view: 'menu' }));
    await start(); await frames(); await finish();
    expect(latest.survey.battery).toBeGreaterThan(99.9);
    expect(latest.survey.battery).toBeCloseTo(100 - 0.17 * hooks().timeRef.current, 8);
  });

  it('announces low battery once when crossing the return threshold', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    await mount(); await start(15.01);
    const speech = vi.spyOn(document.getElementById('skyschool-a11y-live'), 'textContent', 'set');
    await frames(3); await act(async () => vi.advanceTimersByTime(60));
    expect(latest.survey.batteryLowWarned).toBe(true);
    expect(speech.mock.calls.filter(([value]) => value.startsWith('Low battery:'))).toHaveLength(1);
    await frames(10); await act(async () => vi.advanceTimersByTime(60));
    expect(speech.mock.calls.filter(([value]) => value.startsWith('Low battery:'))).toHaveLength(1);
    expect(hooks().pausedRef.current).toBe(false);
  });

  it('ends a depleted attempt without further captures, blocks resume, and preserves its photos and flight evidence', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    await mount(); await start(0.2);
    const state = hooks().flightRef.current;
    const photos = [{ name: 'Already captured', lat: state.lat, lon: state.lon, captured: true },
      { name: 'Unfinished target', lat: state.lat, lon: state.lon, captured: false }];
    await act(async () => updateSaved({ survey: { ...latest.survey, photos, capturedCount: 1 } }));
    const speech = vi.spyOn(document.getElementById('skyschool-a11y-live'), 'textContent', 'set');
    for (let frame = 0; frame < 25 && !latest.survey.batteryExhausted; frame++) {
      canvasText.mockClear();
      await frames();
    }
    await act(async () => vi.advanceTimersByTime(60));
    expect(latest.survey).toMatchObject({ battery: 0, batteryExhausted: true, capturedCount: 1, completed: false, captureProgress: 0 });
    expect(latest.survey.photos.map(photo => photo.captured)).toEqual([true, false]);
    expect(latest.surveysCompleted || 0).toBe(0);
    expect(awardXP).not.toHaveBeenCalled();
    expect(hooks().pausedRef.current).toBe(true);
    const heldTime = hooks().timeRef.current;
    const card = host.querySelector('[data-flight-battery-exhausted]');
    expect(card).toBeTruthy();
    expect(document.getElementById(card.getAttribute('aria-labelledby')).textContent).toBe('Drone battery depleted');
    expect(canvasText.mock.calls.some(([text]) => /^Survey ·|^Hold position ·|^Return to launch and land\./.test(text))).toBe(false);
    expect(speech.mock.calls.filter(([value]) => value.startsWith('Drone battery depleted.'))).toHaveLength(1);
    await frames(20); await act(async () => vi.advanceTimersByTime(60));
    expect(hooks().timeRef.current).toBe(heldTime);
    expect(speech.mock.calls.filter(([value]) => value.startsWith('Drone battery depleted.'))).toHaveLength(1);
    const cockpit = host.querySelector('canvas[role="application"]');
    await act(async () => {
      cockpit.focus();
      cockpit.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
      cockpit.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true, cancelable: true }));
    });
    await frames();
    await act(async () => host.querySelector('button[aria-label="Resume flight"]').click());
    await frames();
    expect(hooks().pausedRef.current).toBe(true);
    expect(hooks().timeRef.current).toBe(heldTime);
    await act(async () => card.querySelector('button').click());
    expect(latest.view).toBe('debrief');
    expect(latest.survey.batteryExhausted).toBe(true);
    expect(latest.survey.photos.map(photo => photo.captured)).toEqual([true, false]);
    expect(latest.lastDebrief.samples.length).toBeGreaterThan(0);
    expect(latest.lastDebrief.sessionTime).toBe(Math.round(heldTime));
    expect(awardXP).not.toHaveBeenCalled();
  });

  it('cannot award mission completion after landing with an already empty battery', async () => {
    await mount(); await start(0);
    const state = hooks().flightRef.current;
    Object.assign(state, { onGround: true, altitude: state.fieldElev });
    await act(async () => updateSaved({ survey: { ...latest.survey, capturedCount: 1,
      photos: latest.survey.photos.map(photo => ({ ...photo, captured: true })) } }));
    await frames();
    expect(latest.survey).toMatchObject({ battery: 0, batteryExhausted: true, completed: false });
    expect(latest.surveysCompleted || 0).toBe(0);
    expect(awardXP).not.toHaveBeenCalled();
  });
});
