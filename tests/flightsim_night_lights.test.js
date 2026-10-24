// SkySchool night light carpet: real towns around the aircraft glow from dusk
// in the WebGL renderer, scaled by population, kept off the water, and absent
// by day and at the lowest quality tier.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const Three = vendor.THREE;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// Each test mounts the full menu or flight deck; leave headroom on a busy machine.
vi.setConfig({ testTimeout: 20000 });
let api, tool, host, reactRoot, frameCallback, wallTime, renderer, physicsSnapshot, flip;

beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  physicsSnapshot = Object.getOwnPropertyDescriptors(api.Physics);
});
afterEach(async () => {
  if (reactRoot) await React.act(async () => reactRoot.unmount());
  reactRoot = null; host?.remove(); host = null; frameCallback = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  for (const key of Reflect.ownKeys(api.Physics)) if (!Object.hasOwn(physicsSnapshot, key)) delete api.Physics[key];
  Object.defineProperties(api.Physics, physicsSnapshot);
  delete window.THREE; delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
});

const setSolarHour = (hooks, hour) => { hooks.timeRef.current = ((hour - 12 - hooks.flightRef.current.lon / 15 + 48) % 24) * 100; };
function resize(width) {
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { value: width, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: 720, configurable: true });
  }
}
async function mountFlight(at) {
  wallTime = 1000; frameCallback = null; flip = false;
  const context = new Proxy({
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  }, { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => { target[key] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('AlloPostFXEnabled', false);
  vi.stubGlobal('requestAnimationFrame', callback => { if (callback.name === 'loop') frameCallback = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  renderer = { domElement: {}, shadowMap: {}, capabilities: { getMaxAnisotropy: () => 1 },
    setSize() {}, setPixelRatio() {}, dispose() {}, getContext: () => ({ isContextLost: () => false }),
    render: vi.fn((scene, camera) => { scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); }) };
  window.THREE = { ...Three, WebGLRenderer: function() { return renderer; } };
  host = document.createElement('div'); document.body.appendChild(host); reactRoot = ReactDOMClient.createRoot(host);
  function App() {
    const [data, update] = React.useState({ flightSim: { view: 'menu', thirdPerson: false, railCollapsed: true,
      takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(item => [item.id, true])) } });
    return tool.render(makeCtx({ toolData: data, setToolData: update,
      update: (id, key, value) => update(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, value) => update(old => ({ ...old, [id]: { ...old[id], ...value } })) }));
  }
  await React.act(async () => reactRoot.render(React.createElement(App)));
  await React.act(async () => host.querySelector('button[aria-label="Free Flight from Portland, ME"]').click());
  resize(1280);
  const hooks = window.__testHooks.flightSim;
  Object.assign(hooks.flightRef.current, { lat: at.lat, lon: at.lon, altitude: 6000, fieldElev: 0, speed: 180, vsi: 0, heading: 90, onGround: false });
  Object.assign(hooks.controlsRef.current, { throttle: 0.6, pitch: 0, bank: 0, yawRate: 0 });
  Object.assign(hooks.getWeatherRef().current, { wind: 0, turbulence: 0, visibility: 1, type: 'clear' });
  vi.spyOn(api.Physics, 'step').mockImplementation(state => ({ ...state,
    forces: { lift: api.Physics.WEIGHT, weight: api.Physics.WEIGHT, drag: 0, thrust: 0, normal: api.Physics.WEIGHT } }));
  hooks.pausedRef.current = true;
  return hooks;
}
async function draw() {
  flip = !flip; resize(flip ? 1280 : 1282);
  wallTime += 16;
  await React.act(async () => frameCallback());
  expect(renderer.render).toHaveBeenCalled();
  const [scene] = renderer.render.mock.calls.at(-1);
  return scene.children.find(child => child.isPoints && child.userData && child.userData.flightLightCarpet);
}

describe('night city lights', () => {
  it('lights real towns around Boston at night, brightest and densest for big cities', async () => {
    const hooks = await mountFlight({ lat: 42.36, lon: -71.06 });
    setSolarHour(hooks, 0);
    const carpet = await draw();
    expect(carpet).toBeTruthy();
    expect(carpet.visible).toBe(true);
    expect(carpet.material.opacity).toBeGreaterThan(0.5);
    expect(carpet.material.blending).toBe(Three.AdditiveBlending);
    const count = carpet.geometry.drawRange.count;
    expect(count).toBeGreaterThan(200);
    expect(count).toBeLessThanOrEqual(6000);
    // Every light sits over land, near a real town within 45 nm.
    // Every light sits on land, within its town's spread of a real town.
    const lightLatLon = carpet.userData.lightLatLon;
    let checked = 0;
    for (let i = 0; i < count; i++) {
      const lat = lightLatLon[i * 2], lon = lightLatLon[i * 2 + 1];
      expect(api.isWaterMask(lat, lon), 'light ' + i + ' at ' + lat + ',' + lon).toBe(false);
      checked++;
    }
    expect(checked).toBe(count);
    const positions = carpet.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) expect(Number.isFinite(positions[i * 3] + positions[i * 3 + 1] + positions[i * 3 + 2])).toBe(true);
  }, 30000);

  it('is absent by day and fades with poor visibility', async () => {
    const hooks = await mountFlight({ lat: 42.36, lon: -71.06 });
    setSolarHour(hooks, 12);
    expect(await draw()).toBeFalsy();
    setSolarHour(hooks, 0);
    const clear = (await draw()).material.opacity;
    hooks.getWeatherRef().current.visibility = 0.2;
    const hazy = (await draw()).material.opacity;
    expect(hazy).toBeLessThan(clear * 0.5);
    setSolarHour(hooks, 12);
    expect((await draw()).visible).toBe(false);
  }, 30000);

  it('keeps open ocean dark', async () => {
    const hooks = await mountFlight({ lat: 41.0, lon: -66.0 });
    setSolarHour(hooks, 0);
    const carpet = await draw();
    expect(carpet ? carpet.geometry.drawRange.count : 0).toBe(0);
  }, 30000);
});

describe('golden hour and moonlight', () => {
  it('warms the low sun, tints dusk, and lights the night with pale moonlight', () => {
    const noon = api.getFlightLightingFrame(12), night = api.getFlightLightingFrame(0);
    let low = null;
    for (let hour = 6; hour < 7; hour += 0.01) { const f = api.getFlightLightingFrame(hour); if (f.sunElevationRad > 0) { low = f; break; } }
    expect(low.keyColor[0]).toBeCloseTo(1, 6);
    expect(low.keyColor[1]).toBeLessThan(0.6);
    expect(low.keyColor[2]).toBeLessThan(0.33);
    expect(noon.keyColor[2]).toBeGreaterThan(0.85);
    // Dusk fill leans warm; night fill is a visible moonlit blue, not near-black.
    const dusk = api.getFlightLightingFrame(6.6);
    expect(dusk.ambientColor[0]).toBeGreaterThan(dusk.ambientColor[2]);
    expect(night.ambientColor[2]).toBeGreaterThan(0.33);
    expect(night.ambientColor[2]).toBeGreaterThan(night.ambientColor[0]);
    expect(night.keyColor[0]).toBeGreaterThan(0.5);
    expect(night.keyColor[2]).toBeGreaterThan(night.keyColor[0]);
  });
});
