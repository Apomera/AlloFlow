// SkySchool accuracy corrections: the standard atmosphere above the tropopause,
// the low-altitude hint on a normal final, speed badges against what the tape
// shows, and the rescue briefing derived from where the survivor really is.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let FS;

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  window.__testHooks = {};
  loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
});

const sigma = alt => FS.Physics.airDensity(alt) / FS.Physics.RHO_SL;

describe('standard atmosphere', () => {
  it('keeps the long-standing troposphere fit exactly, so lower flight is unchanged', () => {
    for (const alt of [0, 5000, 10000, 25000, 36000]) {
      expect(sigma(alt)).toBe(Math.pow(1 - 0.0000068756 * alt, 4.2561));
    }
  });

  it('is continuous at the tropopause and isothermal above it', () => {
    expect(Math.abs(sigma(36089.3) / sigma(36089.2) - 1)).toBeLessThan(1e-4);
    // Isothermal at 216.65 K: density falls by exp(-dh / 6341.6 m). The
    // troposphere fit carried on upward gives 0.654 for this ratio instead.
    expect(sigma(50000) / sigma(40000)).toBeCloseTo(Math.exp(-10000 * 0.3048 / 6341.6), 4);
  });

  it('matches ICAO standard density at airliner and SR-71 heights', () => {
    // ICAO Doc 7488: about 0.235 at FL410 and 0.028 at 85,000 ft.
    expect(sigma(41000)).toBeGreaterThan(0.235 * 0.985);
    expect(sigma(41000)).toBeLessThan(0.235 * 1.015);
    expect(sigma(85000)).toBeGreaterThan(0.0283 * 0.97);
    expect(sigma(85000)).toBeLessThan(0.0283 * 1.03);
  });
});

describe('low-altitude hint', () => {
  const state = { onGround: false, altitude: 300, fieldElev: 0, vsi: -10, speed: 110, stalling: false };
  const controls = { throttle: 0.1, pitch: 0, brake: 0 };
  const hint = telemetry => FS.getFlightHintKind(state, controls, {}, 55, 0, 65, telemetry);

  it('stays quiet on a normal final, where reduced power and a descent are expected', () => {
    expect(hint({ approachActive: true, glideAngleDeg: 3 })).toBe(null);
  });

  it('still warns below the glide path, away from a runway, and without telemetry', () => {
    expect(hint({ approachActive: true, glideAngleDeg: 1.2 })).toBe('low');
    expect(hint({ approachActive: false, glideAngleDeg: 3 })).toBe('low');
    expect(hint(undefined)).toBe('low');
  });
});

describe('speed and height badges', () => {
  const badge = id => FS.ACHIEVEMENTS.find(item => item.id === id);

  it('awards Century Mark on indicated airspeed, which is what the tape shows', () => {
    // 180 ft/s is 107 kt true. At sea level that is also 107 kt indicated;
    // at 20,000 ft the thinner air makes it about 78 kt indicated.
    expect(badge('speed100').check({ speed: 180, altitude: 0 })).toBe(true);
    expect(badge('speed100').check({ speed: 180, altitude: 20000 })).toBe(false);
  });

  it('awards Sonic Boom at the local speed of sound', () => {
    // 1,000 ft/s is 592 kt true: subsonic at sea level (661 kt), supersonic in
    // the -56.5 C stratosphere (574 kt).
    expect(badge('speed_sound').check({ speed: 1000, altitude: 0 })).toBe(false);
    expect(badge('speed_sound').check({ speed: 1150, altitude: 0 })).toBe(true);
    expect(badge('speed_sound').check({ speed: 1000, altitude: 40000 })).toBe(true);
  });

  it('names the 5,280 ft badge for a school audience without changing its saved id', () => {
    expect(badge('mile_high').name).toBe('One Mile Up');
    expect(FS.ACHIEVEMENTS.some(item => /club/i.test(item.name))).toBe(false);
  });
});

describe('coastal rescue briefing', () => {
  let host, root, latest;
  afterEach(async () => {
    if (root) await act(async () => root.unmount());
    host?.remove();
    root = null; host = null;
    vi.restoreAllMocks(); vi.unstubAllGlobals();
  });

  it('gives the distance and heading to where the survivor actually is', async () => {
    const context = new Proxy({
      measureText: text => ({ width: String(text).length * 6 }),
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
    }, {
      get(target, property) { return property in target ? target[property] : () => {}; },
      set(target, property, value) { target[property] = value; return true; },
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', () => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const toasts = [];
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    function App() {
      const [data, setData] = React.useState({ flightSim: { view: 'menu', menuSections: { challenges: true },
        railCollapsed: true, takeoffTutorialDismissed: true, landingTutorialDismissed: true } });
      latest = data.flightSim;
      return window.StemLab._registry.flightSim.render(makeCtx({ toolData: data, setToolData: setData,
        addToast: message => toasts.push(String(message)),
        update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
        updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })),
      }));
    }
    await act(async () => root.render(React.createElement(App)));
    const card = host.querySelector('[data-flight-challenge-id="coastal_rescue"]');
    expect(card).toBeTruthy();
    expect(card.textContent).toContain('about 4 nm southeast of PWM');
    await act(async () => card.click());

    const pwm = FS.WAYPOINTS.find(item => item.id === 'kpwm');
    const { survivorLat, survivorLon } = latest.rescue;
    const rad = Math.PI / 180;
    const north = (survivorLat - pwm.lat) * 60;
    const east = (survivorLon - pwm.lon) * 60 * Math.cos(((survivorLat + pwm.lat) / 2) * rad);
    const distance = Math.hypot(north, east);
    const heading = (Math.atan2(east, north) / rad + 360) % 360;
    expect(distance).toBeGreaterThan(3.5);
    expect(distance).toBeLessThan(4.5);
    expect(heading).toBeGreaterThan(90);
    expect(heading).toBeLessThan(180);

    const toast = toasts.find(text => text.includes('Distress beacon'));
    expect(toast, toasts.join(' | ')).toBeTruthy();
    const said = /([\d.]+) nm away\. Lift off, fly heading (\d{3})°/.exec(toast);
    expect(said, toast).toBeTruthy();
    expect(Math.abs(Number(said[1]) - distance)).toBeLessThan(0.15);
    expect(Math.abs(Number(said[2]) - heading)).toBeLessThanOrEqual(2);
  });
});
