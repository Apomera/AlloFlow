import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let api, tool, host, root, frame, commands;
const vendorContext = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendorContext);
const Three = vendorContext.THREE;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  api = window.__RR_TEST_EXPORTS__.flightSim;
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null; host?.remove(); host = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  delete window.THREE; delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
});
const heightForAngle = (angle, distance) => Math.tan(angle * Math.PI / 180) * distance * 6076.12;

describe('SkySchool standard PAPI indications', () => {
  it.each([[1, 4], [2.7, 3], [3, 2], [3.3, 1], [4, 0]])('shows %i degrees with %i red lights', (angle, redCount) => {
    const signal = api.computePapiIndication(5431 + heightForAngle(angle, 2), 5431, 2);
    expect(signal.angleDeg).toBeCloseTo(angle, 10);
    expect(signal.redCount).toBe(redCount);
  });
  it.each([2.5, 3 - 1 / 6, 3 + 1 / 6, 3.5])('changes one light at the FAA transition of %f degrees', transition => {
    const below = api.computePapiIndication(heightForAngle(transition - 0.001, 1), 0, 1);
    const above = api.computePapiIndication(heightForAngle(transition + 0.001, 1), 0, 1);
    expect(below.redCount - above.redCount).toBe(1);
  });
  it('shows the same glide path at every airport regardless of field elevation', () => {
    for (const airport of api.WAYPOINTS) {
      for (const [angle, expected] of [[1, 4], [2.7, 3], [3, 2], [3.3, 1], [4, 0]]) {
        const signal = api.computePapiIndication(airport.alt + heightForAngle(angle, 1.5), airport.alt, 1.5);
        expect(signal.redCount, airport.code + ' at ' + angle + ' degrees').toBe(expected);
      }
      expect(api.computePapiIndication(airport.alt, airport.alt, 0).redCount, airport.code + ' parked').toBe(4);
    }
  });
  it('keeps ground, below-field, and zero-distance signals finite', () => {
    expect(api.computePapiIndication(5431, 5431, 0)).toEqual({ angleDeg: 0, redCount: 4 });
    expect(api.computePapiIndication(5300, 5431, 1)).toEqual({ angleDeg: 0, redCount: 4 });
    expect(api.computePapiIndication(5531, 5431, 0)).toEqual({ angleDeg: 90, redCount: 0 });
    expect(api.computePapiIndication(undefined, undefined, undefined)).toEqual({ angleDeg: 0, redCount: 4 });
  });
});

async function mountFlight(airportCode, three) {
  window.THREE = three;
  commands = [];
  const context = new Proxy({
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  }, { get: (target, property) => property in target ? target[property] : (...args) => commands.push({ method: property, args, fill: context.fillStyle }),
    set: (target, property, value) => { target[property] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.spyOn(performance, 'now').mockReturnValue(1000);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('AlloPostFXEnabled', false);
  vi.stubGlobal('requestAnimationFrame', callback => { if (callback.name === 'loop') frame = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', takeoffTutorialDismissed: true, railCollapsed: true } });
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await React.act(async () => root.render(React.createElement(App)));
  await React.act(async () => window.__testHooks.flightSim.startFlightChallenge('energy_management'));
  const canvas = host.querySelector('canvas[role="application"]');
  Object.defineProperty(canvas, 'clientWidth', { value: 800, configurable: true });
  Object.defineProperty(canvas, 'clientHeight', { value: 500, configurable: true });
  const airport = api.WAYPOINTS.find(wp => wp.code === airportCode);
  const hooks = window.__testHooks.flightSim;
  Object.assign(hooks.controlsRef.current, { throttle: 0.4, pitch: 0, bank: 0, flaps: 0, brake: 0 });
  function position(angle, distanceNm = 1.5) {
    const lat = airport.lat - distanceNm / 60;
    const distance = api.haversineNm(lat, airport.lon, airport.lat, airport.lon);
    Object.assign(hooks.flightRef.current, { lat, lon: airport.lon, altitude: airport.alt + heightForAngle(angle, distance),
      fieldElev: airport.alt, speed: distanceNm ? 140 : 0, heading: 0, vsi: 0, onGround: distanceNm === 0 });
    return distance;
  }
  async function draw() {
    commands.length = 0;
    expect(frame).toBeTypeOf('function');
    await React.act(async () => frame());
  }
  return { airport, position, draw };
}

describe('SkySchool painted approach lighting', () => {
  it.each(['DEN', 'JNB'])('shows the runway and balanced PAPI above the high-elevation %s field', async code => {
    const flight = await mountFlight(code);
    flight.position(3);
    await flight.draw();
    expect(commands.some(c => c.method === 'fillText' && c.args[0] === code + ' RWY')).toBe(true);
    // The first RAF advances a real simulation step; derive the painted
    // runway position from that frame instead of assuming the aircraft froze.
    const state = window.__testHooks.flightSim.flightRef.current;
    const paintedDistance = api.haversineNm(state.lat, state.lon, flight.airport.lat, flight.airport.lon);
    const relativeBearing = ((api.bearing(state.lat, state.lon, flight.airport.lat, flight.airport.lon) - state.heading + 540) % 360) - 180;
    const screenX = 400 + relativeBearing / 60 * 400;
    const runwayWidth = 8 + (1 - paintedDistance / 10) * 30;
    const papiStartX = screenX - runwayWidth / 2 - 26;
    const lights = commands.filter(c => c.method === 'arc' && c.args[2] === 3 &&
      c.args[0] >= papiStartX - 0.0001 && c.args[0] <= papiStartX + 18.0001 && ['#fff', '#ef4444'].includes(c.fill));
    expect(lights).toHaveLength(4);
    expect(lights.map(light => light.fill)).toEqual(['#fff', '#fff', '#ef4444', '#ef4444']);
    expect(new Set(lights.map(light => light.args[1])).size).toBe(1);
  });
  it('paints four red close-up lights when parked instead of a false high-path cue', async () => {
    const flight = await mountFlight('DEN');
    flight.position(0, 0); await flight.draw();
    const lights = commands.filter(c => c.method === 'fillRect' && c.fill === 'rgba(239,68,68,0.95)' && c.args[2] === 5 && c.args[3] === 5);
    expect(lights).toHaveLength(4);
    expect(new Set(lights.map(light => light.args[1])).size).toBe(1);
  });
  it('uses the same red-count sequence in WebGL and places the four lights in a lateral row', async () => {
    const renderer = { domElement: {}, shadowMap: {}, capabilities: { getMaxAnisotropy: () => 1 },
      setSize() {}, setPixelRatio() {}, render: vi.fn(), dispose() {}, getContext: () => ({ isContextLost: () => false }) };
    const flight = await mountFlight('DEN', { ...Three, WebGLRenderer: function() { return renderer; } });
    for (const [angle, expected] of [[1, 4], [2.7, 3], [3, 2], [3.3, 1], [4, 0]]) {
      flight.position(angle); await flight.draw();
      expect(renderer.render).toHaveBeenCalled();
      const scene = renderer.render.mock.calls.at(-1)[0];
      const lights = scene.children.filter(item => item.geometry?.type === 'SphereGeometry' && item.geometry.parameters.radius === 3 && item.material.fog === false);
      expect(lights).toHaveLength(4);
      expect(lights.filter(light => light.material.color.getHex() === 0xef4444)).toHaveLength(expected);
      const firstGap = lights[1].position.clone().sub(lights[0].position);
      expect(firstGap.length()).toBeCloseTo(20, 8);
      for (let index = 2; index < lights.length; index++) {
        expect(lights[index].position.clone().sub(lights[index - 1].position).distanceTo(firstGap)).toBeLessThan(0.000001);
      }
      const runway = scene.children.find(item => item.userData.runwayLights);
      expect(runway).toBeTruthy();
      const localFirst = lights[0].position.clone().sub(runway.position).applyEuler(new Three.Euler(0, -runway.rotation.y, 0));
      const localLast = lights[3].position.clone().sub(runway.position).applyEuler(new Three.Euler(0, -runway.rotation.y, 0));
      expect(localFirst.z).toBeCloseTo(localLast.z, 8);
      expect(localLast.x - localFirst.x).toBeCloseTo(60, 8);
    }
  });
});
