import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const Three = vendor.THREE;
const source = readFileSync('stem_lab/stem_tool_flightsim.js', 'utf8');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, reactRoot, frameCallback, wallTime, errors, renderer;

beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  api = window.__RR_TEST_EXPORTS__.flightSim;
});
afterEach(async () => {
  if (reactRoot) await React.act(async () => reactRoot.unmount());
  reactRoot = null; host?.remove(); host = null; frameCallback = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  delete window.THREE; delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
});

// Isolate the unchanged projection closure with an explicit origin. No new
// production export is needed to verify that target aliases do not wrap the
// continuous aircraft/terrain world or mutate the origin.
function worldProjection(origin) {
  const declaration = source.match(/var geodeticToLocal = function\(lat, lon, alt[^)]*\) \{[\s\S]*?\n      \};/);
  expect(declaration).toBeTruthy();
  return runInNewContext(declaration[0] + '; geodeticToLocal', { originRef: { current: origin } });
}
const localX = (longitude, origin) => (longitude - origin.lon) * 364800 * Math.cos(origin.lat * Math.PI / 180);

const aliasCases = [
  { name: 'eastward date-line crossing', lat: -13.836, liveLon: 188.21, targetLon: -171.769, branchLon: 188.231, city: 'Apia' },
  { name: 'westward date-line crossing', lat: -18.133, liveLon: -181.58, targetLon: 178.442, branchLon: -181.558, city: 'Suva' },
  { name: 'multiple eastward circuits', lat: -13.836, liveLon: 908.21, targetLon: -171.769, branchLon: 908.231, city: 'Apia' },
  { name: 'multiple westward circuits', lat: -18.133, liveLon: -901.58, targetLon: 178.442, branchLon: -901.558, city: 'Suva' },
  { name: 'ordinary nearby geography', lat: 35.687, liveLon: 139.72, targetLon: 139.749, branchLon: 139.749, city: 'Tokyo' },
];

describe('SkySchool longitude branches for geographic world targets', () => {
  it.each(aliasCases)('projects targets near the aircraft after $name', ({ lat, liveLon, targetLon, branchLon }) => {
    const origin = { lat, lon: liveLon - 2, alt: 0 };
    const snapshot = { ...origin };
    const project = worldProjection(origin);
    const target = project(lat + 0.01, targetLon, 76, liveLon);
    expect(target.x).toBeCloseTo(localX(branchLon, origin), 6);
    expect(target.y).toBe(76); expect(target.z).toBeCloseTo(-3648, 6);
    const aircraft = project(lat, liveLon, 2000);
    const terrain = project(lat + 0.1, liveLon + 0.2, 0);
    expect(aircraft.x).toBeCloseTo(localX(liveLon, origin), 6);
    expect(terrain.x).toBeCloseTo(localX(liveLon + 0.2, origin), 6);
    expect(origin).toEqual(snapshot);
  });
  it('keeps raw player and terrain coordinates continuous across the date line', () => {
    const origin = { lat: -12, lon: 179.9, alt: 0 };
    const project = worldProjection(origin);
    const before = project(-12, 179.99, 2000);
    const after = project(-12, 180.01, 2000);
    expect(after.x - before.x).toBeCloseTo(0.02 * 364800 * Math.cos(-12 * Math.PI / 180), 6);
    expect(project(-12, 539.99, 0).x).toBeCloseTo(localX(539.99, origin), 6);
    expect(project(-12, 540.01, 0).x).toBeCloseTo(localX(540.01, origin), 6);
  });
});

async function mountFlight() {
  wallTime = 1000; frameCallback = null;
  const context = new Proxy({
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  }, {
    get: (target, property) => property in target ? target[property] : () => {},
    set: (target, property, value) => { target[property] = value; return true; },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
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
    const [data, setData] = React.useState({ flightSim: { view: 'menu', thirdPerson: false, flightDetails: false,
      railCollapsed: true, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(item => [item.id, true])) } });
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })) }));
  }
  await React.act(async () => reactRoot.render(React.createElement(App)));
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
  return hooks;
}
async function draw(hooks, lat, lon) {
  Object.assign(hooks.flightRef.current, { lat, lon, altitude: 2000, fieldElev: 0, heading: 90, speed: 0, vsi: 0, onGround: false });
  wallTime += 16;
  expect(frameCallback).toBeTypeOf('function');
  await React.act(async () => frameCallback());
  expect(errors).not.toHaveBeenCalled();
  expect(renderer.render).toHaveBeenCalled();
  const [scene] = renderer.render.mock.calls.at(-1);
  return scene;
}
function sceneObjects(scene, code, cityName) {
  const player = scene.children.find(item => item.userData?.type === 'cessna172');
  const runway = scene.children.find(item => item.userData?.runwayModel?.airport?.code === code);
  const city = scene.children.find(item => item.userData?.geo && item.userData?.mats && item.userData?.lat != null
    && (!cityName || item.userData.lon === api.REAL_CITIES.find(row => row[0] === cityName)?.[2]));
  const terrain = scene.children.find(item => item.isMesh && item.geometry?.type === 'PlaneGeometry' && item.geometry.parameters?.width === 240000);   // the near terrain patch
  expect(player).toBeTruthy(); expect(runway).toBeTruthy(); expect(city).toBeTruthy(); expect(terrain).toBeTruthy();
  return { player, runway, city, terrain };
}

describe('SkySchool production WebGL geographic longitude placement', () => {
  it.each(aliasCases)('keeps actual cities and runways near the player after $name', async ({ lat, liveLon, targetLon, branchLon, city }) => {
    api.WAYPOINTS.push({ id: 'dateline_test', code: 'DAT', name: 'Test field', lat, lon: targetLon, alt: 76 });
    const hooks = await mountFlight();
    const scene = await draw(hooks, lat, liveLon);
    const objects = sceneObjects(scene, 'DAT', city);
    const eastFt = (branchLon - liveLon) * 364800 * Math.cos(lat * Math.PI / 180);
    expect(objects.runway.position.x - objects.player.position.x).toBeCloseTo(eastFt, 5);
    expect(objects.city.position.x - objects.player.position.x).toBeCloseTo(eastFt, 5);
    expect(objects.runway.position.z - objects.player.position.z).toBeCloseTo(0, 5);
    expect(objects.city.position.z - objects.player.position.z).toBeCloseTo(0, 5);
    expect(objects.terrain.position.x).toBeCloseTo(Math.round(objects.player.position.x / 4000) * 4000, 5);
    expect(Math.abs(objects.terrain.position.x - objects.player.position.x)).toBeLessThanOrEqual(2000);
    expect(hooks.flightRef.current.lon).toBe(liveLon);
  });
  it.each([1, -1])('retains cached city/runway objects and continuous terrain when crossing in direction %s', async direction => {
    const canonicalLon = -direction * 179.99;
    api.WAYPOINTS.push({ id: 'dateline_test', code: 'DAT', name: 'Test field', lat: -12, lon: canonicalLon, alt: 76 });
    api.REAL_CITIES.push(['Dateline test town', -12, canonicalLon, 80, 0]);
    const hooks = await mountFlight();
    const beforeLon = direction * 179.98, afterLon = direction * 180.02;
    const before = sceneObjects(await draw(hooks, -12, beforeLon), 'DAT', 'Dateline test town');
    const targetPosition = before.runway.position.clone();
    const cityPosition = before.city.position.clone();
    const playerX = before.player.position.x;
    const after = sceneObjects(await draw(hooks, -12, afterLon), 'DAT', 'Dateline test town');
    expect(after.runway).toBe(before.runway); expect(after.city).toBe(before.city);
    expect(after.runway.position.distanceTo(targetPosition)).toBe(0);
    expect(after.city.position.distanceTo(cityPosition)).toBe(0);
    const factor = 364800 * Math.cos(-12 * Math.PI / 180);
    expect(after.player.position.x - playerX).toBeCloseTo((afterLon - beforeLon) * factor, 5);
    expect(after.runway.position.x - after.player.position.x).toBeCloseTo(-direction * 0.01 * factor, 5);
    // Recenter onto the same world lattice without jumping longitude branches.
    expect(after.terrain.position.x).toBeCloseTo(Math.round(after.player.position.x / 4000) * 4000, 5);
    expect(Math.abs(after.terrain.position.x - after.player.position.x)).toBeLessThanOrEqual(2000);
    expect(hooks.flightRef.current.lon).toBe(afterLon);
  });
});
