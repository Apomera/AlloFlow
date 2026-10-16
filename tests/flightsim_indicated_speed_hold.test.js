import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const KTS_PER_FPS = 0.5924838;
const factor = altitude => Math.sqrt(Math.pow(Math.max(0, 1 - 0.0000068756 * altitude), 4.2561));
const state = patch => ({ speed: 100 / KTS_PER_FPS, altitude: 5000, vsi: 0, heading: 180,
  lat: 43.646, lon: -70.309, fieldElev: 0, onGround: false, stalling: false, lowAirspeed: false, ...patch });
const controls = patch => ({ throttle: 0.55, pitch: 2, bank: 0, yawRate: 0, flaps: 0, brake: 0, ...patch });
let FS, tool, host, root, latest, frameCallback, wallTime, context, errors;
const hooks = () => window.__testHooks.flightSim;
const aircraft = id => FS.AIRCRAFT.find(item => item.id === id);
const telemetry = (current, input = controls(), weather = {}) =>
  FS.computeFlightTelemetry(current, input, weather, 0, 0, null, null, aircraft('cessna172'));

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); FS = window.__RR_TEST_EXPORTS__.flightSim;
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  context = new Proxy({ fillText: vi.fn(), measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
  }, { get: (target, property) => property in target ? target[property] : () => {},
    set: (target, property, value) => { target[property] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  wallTime = 1000; vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  frameCallback = null;
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => { if (callback.name === 'loop') frameCallback = callback; return 1; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

async function mount(saved = {}) {
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', aircraft: 'cessna172', thirdPerson: false,
      railCollapsed: true, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(FS.ACHIEVEMENTS.map(item => [item.id, true])), ...saved } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
async function launch() {
  const button = host.querySelector('button[aria-label="Free Flight from Portland, ME"]');
  expect(button).toBeTruthy(); await act(async () => button.click());
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 1280 });
    Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: 640 });
  }
  // Hold dynamics only for the input, announcement and painted-value checks;
  // the altitude-hold suite integrates the real physics through climb/descent.
  vi.spyOn(FS.Physics, 'step').mockImplementation(current => ({ ...current,
    forces: { lift: FS.Physics.WEIGHT, weight: FS.Physics.WEIGHT, thrust: 0, drag: 0 } }));
}
async function frame() {
  context.fillText.mockClear(); wallTime += 100;
  expect(frameCallback).toBeTypeOf('function'); await act(async () => frameCallback());
  expect(errors).not.toHaveBeenCalled();
}

// Independent atmosphere values check that the controller follows the speed
// actually displayed, rather than merely sharing a target with its own helper.
describe('fixed-wing speed assistance follows indicated airspeed', () => {
  it.each([0, 5000, 10000])('leaves balanced throttle unchanged at 100 IAS and %i feet', altitude => {
    const current = Object.freeze(state({ altitude, speed: 100 / factor(altitude) / KTS_PER_FPS }));
    const input = Object.freeze(controls());
    expect(telemetry(current, input).iasKts).toBeCloseTo(100, 10);
    const next = FS.getAutopilotFlightControls(current, input, { spd: true, tgtSpd: 100 }, aircraft('cessna172'), 1 / 60);
    expect(next).not.toBe(input); expect(next).toEqual(input);
  });

  it.each([{ altitude: 0, indicated: 95 }, { altitude: 0, indicated: 105 },
    { altitude: 10000, indicated: 95 }, { altitude: 10000, indicated: 105 }])(
    'corrects $indicated IAS at $altitude feet with the same signed throttle response', ({ altitude, indicated }) => {
      const current = state({ altitude, speed: indicated / factor(altitude) / KTS_PER_FPS });
      const input = controls();
      const next = FS.getAutopilotFlightControls(current, input, { spd: true, tgtSpd: 100 }, aircraft('cessna172'), 1 / 60);
      expect(telemetry(current).iasKts).toBeCloseTo(indicated, 10);
      expect(next.throttle - input.throttle).toBeCloseTo((100 - indicated) * 0.0005, 10);
      expect(Math.sign(next.throttle - input.throttle)).toBe(Math.sign(100 - indicated));
      expect(next.pitch).toBe(input.pitch); expect(next.bank).toBe(input.bank);
    });

  it.each([5000, 10000])('captures and announces the painted 100 IAS target at %i feet', async altitude => {
    await mount(); await launch();
    const current = state({ altitude, speed: 100 / factor(altitude) / KTS_PER_FPS });
    Object.assign(hooks().flightRef.current, current);
    Object.assign(hooks().controlsRef.current, controls());
    Object.assign(hooks().getWeatherRef().current, { type: 'clear', wind: 25, windDir: 180, turbulence: 0 });
    await frame(); // Let one-shot city and flight notices settle before B.
    const cockpit = host.querySelector('canvas[role="application"]'); cockpit.focus();
    cockpit.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', bubbles: true, cancelable: true }));
    cockpit.dispatchEvent(new KeyboardEvent('keyup', { key: 'b', bubbles: true, cancelable: true }));
    await frame();
    expect(latest.autopilot.tgtSpd).toBe(100);
    expect(hooks().getTelemetry().iasKts).toBeCloseTo(100, 10);
    expect(Math.round(hooks().getTelemetry().tasKts)).not.toBe(100);
    expect(Math.round(hooks().getTelemetry().gsKts)).not.toBe(100);
    const tape = FS.getFlightInstrumentLayout(1280, 640, false).speed;
    const paintedSpeed = context.fillText.mock.calls.find(([, x, y]) =>
      x === tape.x + tape.w / 2 && y === tape.y + tape.h / 2 + 4)?.[0];
    expect(paintedSpeed).toBe(100);
    const footer = context.fillText.mock.calls.find(([text, , y]) => String(text).startsWith('AP: ') && y === 632)?.[0];
    expect(footer).toContain('SPD 100kt');
    await act(async () => vi.advanceTimersByTime(70));
    expect(document.getElementById('skyschool-a11y-live').textContent).toContain('speed 100 knots.');
  });

  it('does not resume saved TAS-era targets when a saved cockpit is reopened', async () => {
    await mount({ view: 'flying', autopilot: { hdg: true, alt: true, spd: true,
      tgtHdg: 180, tgtAlt: 5000, tgtSpd: 140 } });
    expect(latest.view).toBe('menu');
    expect(hooks().flyingRef.current).toBe(false);
    await launch();
    expect(latest.autopilot).toEqual({ hdg: false, alt: false, spd: false });
    expect(latest.autopilot.tgtSpd).toBeUndefined();
  });

  it.each(['rescue_heli', 'drone'])('preserves signed forward knots for %s speed assistance', id => {
    const current = Object.freeze(state({ altitude: 200, speed: 6 / KTS_PER_FPS, rotorForwardFps: -6 / KTS_PER_FPS }));
    const input = Object.freeze(controls({ pitch: 3 }));
    const hold = FS.getAutopilotFlightControls(current, input, { spd: true, tgtSpd: -6 }, aircraft(id), 1 / 60);
    expect(hold.pitch).toBeCloseTo(0, 10);
    expect(hold.throttle).toBe(input.throttle);
    const forward = FS.getAutopilotFlightControls(current, input, { spd: true, tgtSpd: 6 }, aircraft(id), 1 / 60);
    expect(forward.pitch).toBeCloseTo(7.2, 10);
    expect(input.pitch).toBe(3); expect(current.rotorForwardFps).toBeLessThan(0);
  });
});
