import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, root;
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  api = window.__RR_TEST_EXPORTS__.flightSim;
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null; host?.remove(); host = null;
  delete window.__RR_TEST_EXPORTS__; delete window.__testHooks;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

const positions = [
  { lat: 43.646, lon: -70.309, text: '43.65°N 70.31°W' },
  { lat: -13.836, lon: 188.21, text: '13.84°S 171.79°W' },
  { lat: -18.133, lon: -181.58, text: '18.13°S 178.42°E' },
  { lat: -13.836, lon: 908.21, text: '13.84°S 171.79°W' },
  { lat: -18.133, lon: -901.58, text: '18.13°S 178.42°E' },
  { lat: 0, lon: 360, text: '0.00°N 0.00°E' },
  { lat: -0, lon: -360, text: '0.00°N 0.00°E' },
  { lat: 90, lon: 180, text: '90.00°N 180.00°W' },
  { lat: -90, lon: -180, text: '90.00°S 180.00°W' },
];

describe('SkySchool canonical GPS readout', () => {
  it.each(positions)('displays $lat, $lon as $text', ({ lat, lon, text }) => {
    expect(api.formatFlightCoordinates(lat, lon)).toBe(text);
  });
  it.each([[NaN, 0], [0, NaN], [Infinity, 0], [0, -Infinity], [90.01, 0], [-90.01, 0], [null, 0], [0, '180']])(
    'does not invent a valid coordinate for invalid input %s, %s', (lat, lon) => {
      expect(api.formatFlightCoordinates(lat, lon)).toBe('—');
    });
  it('keeps equivalent longitudes identical around both sides of the date line', () => {
    for (const lon of [-180, -179.999, -.001, 0, .001, 179.999]) {
      const expected = api.formatFlightCoordinates(-12, lon);
      for (const turns of [-8, -2, -1, 1, 2, 8]) {
        expect(api.formatFlightCoordinates(-12, lon + 360 * turns)).toBe(expected);
      }
    }
  });
  it('uses the canonical readout in actual HUD frames while retaining continuous simulation longitude', async () => {
    let frameCallback, wallTime = 1000;
    const fillText = vi.fn();
    const context = new Proxy({ fillText,
      measureText: text => ({ width: String(text).length * 6 }),
      createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
    }, { get: (target, property) => property in target ? target[property] : () => {},
      set: (target, property, value) => { target[property] = value; return true; } });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
    vi.stubGlobal('requestAnimationFrame', callback => { if (callback.name === 'loop') frameCallback = callback; return 1; });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
    function App() {
      const [data, setData] = React.useState({ flightSim: { view: 'menu', thirdPerson: false, flightDetails: false,
        railCollapsed: true, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
        earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(item => [item.id, true])) } });
      return tool.render(makeCtx({ toolData: data, setToolData: setData,
        update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
        updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })) }));
    }
    await React.act(async () => root.render(React.createElement(App)));
    await React.act(async () => window.__testHooks.flightSim.startFlightChallenge('first_flight'));
    for (const canvas of host.querySelectorAll('canvas')) {
      Object.defineProperty(canvas, 'clientWidth', { value: 1280, configurable: true });
      Object.defineProperty(canvas, 'clientHeight', { value: 720, configurable: true });
    }
    const hooks = window.__testHooks.flightSim;
    Object.assign(hooks.getWeatherRef().current, { wind: 0, turbulence: 0, visibility: 1, type: 'clear' });
    vi.spyOn(api.Physics, 'step').mockImplementation(state => ({ ...state,
      forces: { lift: api.Physics.WEIGHT, weight: api.Physics.WEIGHT, drag: 0, thrust: 0 } }));
    Object.assign(hooks.controlsRef.current, { throttle: 0, pitch: 0, bank: 0 });
    for (const position of positions.slice(0, 7)) {
      Object.assign(hooks.flightRef.current, { lat: position.lat, lon: position.lon, altitude: 2000,
        fieldElev: 0, heading: 90, speed: 0, vsi: 0, onGround: false });
      fillText.mockClear(); wallTime += 16;
      expect(frameCallback).toBeTypeOf('function');
      await React.act(async () => frameCallback());
      expect(fillText.mock.calls.map(call => call[0])).toContain(position.text);
      expect(hooks.flightRef.current.lon).toBe(position.lon);
    }
    expect(errors).not.toHaveBeenCalled();
  });
});
