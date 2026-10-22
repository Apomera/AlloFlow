import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
vi.setConfig({ testTimeout: 20000 });
let FS, tool, root, host, latest, frameCallback, wallTime, errors, autopilotWrites, canvasPaints;
const hooks = () => window.__testHooks.flightSim;
const canvas = () => host.querySelector('canvas[role="application"]');
const assistance = () => host.querySelector('[data-flight-assistance]');
const brakes = () => host.querySelector('[aria-label="Set wheel brakes"], [aria-label="Release wheel brakes"]');
const live = () => document.getElementById('skyschool-a11y-live').textContent;
const active = () => !!(latest.autopilot?.hdg || latest.autopilot?.alt || latest.autopilot?.spd);
const manualLabel = 'Autopilot disengaged by manual input.';

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
  window.SkySchoolCityServices = { enabled: false };
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); FS = window.__RR_TEST_EXPORTS__.flightSim;
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  canvasPaints = [];
  const gfx = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    fillText: text => canvasPaints.push(String(text)),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
  }, { get: (target, name) => name in target ? target[name] : () => {},
    set: (target, name, value) => { target[name] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(gfx);
  // Keep the actual integrator, assistance, input events and flight loop. This
  // regression begins in a descent and touches the modeled ground naturally.
  wallTime = 1000; autopilotWrites = [];
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => { if (callback.name === 'loop') frameCallback = callback; return 1; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null; frameCallback = null;
  delete window.__testHooks; delete window.__RR_TEST_EXPORTS__; delete window.SkySchoolCityServices;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

async function mount(seed = {}, labels = {}) {
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', aircraft: 'cessna172', railCollapsed: false,
      cityOnline: false, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(FS.ACHIEVEMENTS.map(item => [item.id, true])), ...seed } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData, t: (key, fallback) => labels[key] ?? fallback,
      update: (id, key, value) => {
        if (key === 'autopilot') autopilotWrites.push(value);
        setData(old => ({ ...old, [id]: { ...old[id], [key]: value } }));
      },
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })) }));
  }
  await act(async () => root.render(React.createElement(App)));
  await click(host.querySelector('[aria-label="Free Flight from Portland, ME"]'));
  Object.assign(hooks().getWeatherRef().current, { type: 'clear', wind: 0, turbulence: 0 });
  await frame();
}
async function click(node) { expect(node).toBeTruthy(); await act(async () => { node.focus(); node.click(); }); }
async function frame() {
  expect(frameCallback).toBeTypeOf('function'); wallTime += 100;
  await act(async () => { frameCallback(); vi.advanceTimersByTime(100); });
  expect(errors).not.toHaveBeenCalled();
}
async function down(key, repeat = false) {
  await act(async () => { canvas().focus(); canvas().dispatchEvent(new KeyboardEvent('keydown',
    { key, repeat, bubbles: true, cancelable: true })); });
}
async function up(key) {
  await act(async () => canvas().dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true })));
}
async function pause() { await down(' '); await up(' '); await frame(); await frame(); expect(hooks().pausedRef.current).toBe(true); }
function expectManual() {
  expect(active()).toBe(false); expect(latest.autopilot).toMatchObject({ hdg: false, alt: false, spd: false });
  expect(assistance().getAttribute('aria-pressed')).toBe('false');
}
async function prepareAirborne() {
  const aircraft = FS.AIRCRAFT.find(item => item.id === latest.aircraft);
  const rotor = aircraft.isHelicopter || aircraft.isDrone;
  Object.assign(hooks().flightRef.current, { altitude: 176, fieldElev: 76, lat: 43.646, lon: -70.309,
    onGround: false, speed: rotor ? 0 : 80 / .5924838, rotorForwardFps: 0, vsi: 0, heading: 110, stalling: false });
  Object.assign(hooks().controlsRef.current, { throttle: rotor ? aircraft.weight / aircraft.maxThrust : .3,
    pitch: rotor ? 0 : 3, bank: 0, flaps: 0, brake: 0 });
  await frame(); expect(assistance().disabled).toBe(false);
}
async function heldApproachTouchdown() {
  await prepareAirborne();
  Object.assign(hooks().flightRef.current, { altitude: 77, fieldElev: 76, lat: 43.646, lon: -70.309,
    onGround: false, speed: 65 / .5924838, vsi: -5, heading: 110, stalling: false });
  Object.assign(hooks().controlsRef.current, { throttle: .3, pitch: -3, bank: 0, flaps: 30, brake: 0 });
  await click(assistance()); expect(active()).toBe(true);
  let frames = 0;
  while (!hooks().flightRef.current.onGround && frames++ < 20) await frame();
  expect(hooks().flightRef.current.onGround).toBe(true);
  expect(hooks().flightRef.current.altitude).toBe(76);
  expect(frames).toBeLessThan(20); expect(active()).toBe(true);
  return { throttle: hooks().controlsRef.current.throttle, speed: hooks().flightRef.current.speed };
}

describe('wheel braking takes ownership from flight assistance', () => {
  it.each(['keyboard', 'native'])('hands a real held approach and touchdown to %s braking before speed hold adds power', async input => {
    await mount(); const touchdown = await heldApproachTouchdown();
    if (input === 'keyboard') await down('x'); else await click(brakes());
    await frame(); expectManual(); expect(live()).toContain(manualLabel);
    expect(hooks().controlsRef.current.brake).toBe(1);
    expect(hooks().controlsRef.current.throttle).toBe(touchdown.throttle);
    for (let i = 0; i < 10; i++) await frame();
    expect(hooks().flightRef.current.speed).toBeLessThan(touchdown.speed);
    expect(hooks().controlsRef.current.throttle).toBe(touchdown.throttle);
    if (input === 'keyboard') await up('x'); else await click(brakes());
    await frame(); expectManual(); expect(hooks().controlsRef.current.brake).toBe(0);
    expect(hooks().controlsRef.current.throttle).toBe(touchdown.throttle);
  });

  it('hands over native brakes immediately during a held pause without advancing the flight', async () => {
    await mount(); const touchdown = await heldApproachTouchdown(); await pause();
    const time = hooks().timeRef.current, state = { ...hooks().flightRef.current };
    await click(brakes()); expectManual();
    expect(hooks().controlsRef.current.brake).toBe(1);
    expect(hooks().controlsRef.current.throttle).toBe(touchdown.throttle);
    expect(hooks().timeRef.current).toBe(time); expect(hooks().flightRef.current).toEqual(state);
    await frame(); expect(hooks().pausedRef.current).toBe(true); expect(hooks().timeRef.current).toBe(time);
    expect(hooks().flightRef.current).toEqual(state);
    expect(live()).toContain(manualLabel); expect(live()).toContain('Wheel brakes set');
    await click(brakes()); await frame(); expectManual();
    expect(hooks().timeRef.current).toBe(time); expect(hooks().controlsRef.current.brake).toBe(0);
    expect(live()).toBe('Wheel brakes released');
  });

  it('clears the AP footer with one frozen repaint after natural touchdown and paused native braking', async () => {
    await mount(); await heldApproachTouchdown(); canvasPaints.length = 0; await pause();
    expect(canvasPaints.some(text => /^AP[: ]/.test(text))).toBe(true);
    const time = hooks().timeRef.current, state = { ...hooks().flightRef.current };
    const resetCanvas = vi.spyOn(canvas(), 'width', 'set'); canvasPaints.length = 0;
    await click(brakes()); expectManual(); expect(resetCanvas).not.toHaveBeenCalled();
    await frame();
    expect(resetCanvas).toHaveBeenCalledTimes(1);
    expect(canvasPaints).toContain('⏸ PAUSED');
    expect(canvasPaints.some(text => /^AP[: ]/.test(text))).toBe(false);
    expect(hooks().pausedRef.current).toBe(true); expect(hooks().timeRef.current).toBe(time);
    expect(hooks().flightRef.current).toEqual(state);
    const paintCount = canvasPaints.length;
    for (let i = 0; i < 3; i++) await frame();
    expect(resetCanvas).toHaveBeenCalledTimes(1); expect(canvasPaints).toHaveLength(paintCount);
    expect(hooks().timeRef.current).toBe(time); expect(hooks().flightRef.current).toEqual(state);
  });

  it('consumes held X handover before the paused early return and does not queue assistance for Resume', async () => {
    await mount(); const touchdown = await heldApproachTouchdown(); await pause();
    const time = hooks().timeRef.current, position = { ...hooks().flightRef.current };
    await down('x'); await frame(); expectManual(); expect(live()).toContain(manualLabel);
    expect(hooks().timeRef.current).toBe(time); expect(hooks().flightRef.current).toEqual(position);
    expect(hooks().controlsRef.current.throttle).toBe(touchdown.throttle);
    await down(' '); await up(' '); await frame(); expect(hooks().pausedRef.current).toBe(false);
    expectManual(); expect(hooks().controlsRef.current.brake).toBe(1);
    expect(hooks().controlsRef.current.throttle).toBe(touchdown.throttle);
    await up('x'); await frame(); expect(hooks().controlsRef.current.brake).toBe(0); expectManual();
  });

  it('yields only once while X is held through repeated key events and frames', async () => {
    await mount(); await heldApproachTouchdown(); const before = autopilotWrites.length;
    await down('x'); await frame(); expectManual();
    for (let i = 0; i < 4; i++) { await down('x', true); await frame(); }
    expect(autopilotWrites.slice(before)).toEqual([{ hdg: false, alt: false, spd: false }]);
    expect(live()).toContain(manualLabel);
    await up('x'); await frame(); expect(autopilotWrites).toHaveLength(before + 1);
  });

  it('does not disengage a newly chosen airborne hold when releasing an earlier brake latch or rerendering', async () => {
    await mount(); await prepareAirborne(); await click(brakes());
    expect(hooks().controlsRef.current.brake).toBe(1); await click(assistance()); expect(active()).toBe(true);
    const writes = autopilotWrites.length;
    await click(brakes()); expect(active()).toBe(true); await frame(); expect(active()).toBe(true);
    expect(hooks().controlsRef.current.brake).toBe(0); expect(autopilotWrites).toHaveLength(writes);
    expect(live()).toBe('Wheel brakes released');
  });

  it.each(['keyboard', 'native'])('preserves manual lever and braking behavior with no assistance for %s', async input => {
    await mount(); Object.assign(hooks().controlsRef.current, { throttle: .27, pitch: 0 });
    const writes = autopilotWrites.length;
    if (input === 'keyboard') await down('x'); else await click(brakes());
    await frame(); expect(hooks().controlsRef.current.brake).toBe(1);
    expect(hooks().controlsRef.current.throttle).toBe(.27); expect(autopilotWrites).toHaveLength(writes);
    expect(live()).not.toContain(manualLabel);
    if (input === 'keyboard') await up('x'); else await click(brakes());
    await frame(); expect(hooks().controlsRef.current.brake).toBe(0);
    expect(hooks().controlsRef.current.throttle).toBe(.27); expect(autopilotWrites).toHaveLength(writes);
  });

  it('reuses translated handover and brake labels without allowing the brake notice to replace the handover', async () => {
    await mount({}, { 'stem.flightsim.announce_autopilot_off_manual': 'Manuelle Steuerung übernommen.',
      'stem.flightsim.announce_brakes_set': 'Radbremsen gesetzt.' });
    await heldApproachTouchdown(); await click(brakes()); await frame();
    expectManual(); expect(live()).toBe('Manuelle Steuerung übernommen. Radbremsen gesetzt.');
  });

  it('announces the brake handover after requested flight status without losing the control action', async () => {
    await mount(); await heldApproachTouchdown(); await down('i'); await up('i'); await frame();
    expect(live()).toContain('Altitude');
    await click(brakes()); await frame(); expectManual();
    expect(live()).toBe(manualLabel + ' Wheel brakes set');
  });

  it.each(['drone', 'rescue_heli'])('does not treat X as a wheel-brake handover for %s', async aircraft => {
    await mount({ aircraft }); await prepareAirborne(); await click(assistance()); expect(active()).toBe(true);
    const writes = autopilotWrites.length;
    expect(brakes()).toBeNull(); await down('x'); await frame();
    expect(active()).toBe(true); expect(hooks().controlsRef.current.brake).toBe(0);
    expect(autopilotWrites).toHaveLength(writes); await up('x');
  });
});
