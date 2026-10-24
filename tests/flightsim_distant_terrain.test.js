// SkySchool distant terrain: a coarse ring carries real elevation past 100 nm,
// the scene is deep enough to show it, a clear day reaches about 49 nm, and
// 15 arc-second mountain patches put famous summits at their real heights.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const Three = vendor.THREE;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// Each test mounts the WebGL flight deck and draws enough frames to build the ring.
vi.setConfig({ testTimeout: 30000 });
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
  Object.assign(hooks.flightRef.current, { lat: at.lat, lon: at.lon, altitude: at.altitude || 12000, fieldElev: 0, speed: 200, vsi: 0, heading: 270, onGround: false });
  Object.assign(hooks.controlsRef.current, { throttle: 0.6, pitch: 0, bank: 0, yawRate: 0 });
  Object.assign(hooks.getWeatherRef().current, { wind: 0, turbulence: 0, visibility: 1, type: 'clear' });
  vi.spyOn(api.Physics, 'step').mockImplementation(state => ({ ...state,
    forces: { lift: api.Physics.WEIGHT, weight: api.Physics.WEIGHT, drag: 0, thrust: 0, normal: api.Physics.WEIGHT } }));
  hooks.pausedRef.current = true;
  setSolarHour(hooks, 12);
  return hooks;
}
async function draw() {
  flip = !flip; resize(flip ? 1280 : 1282);
  wallTime += 16;
  await React.act(async () => frameCallback());
  const [scene, camera] = renderer.render.mock.calls.at(-1);
  return { scene, camera, ring: scene.children.find(child => child.userData && child.userData.flightFarTerrain) };
}
async function drawUntilBuilt(builds) {
  let frame = null;
  for (let index = 0; index < 40; index++) {
    frame = await draw();
    if (frame.ring && frame.ring.userData.builds >= builds) return frame;
  }
  return frame;
}
const terrainOf = scene => scene.children.find(child => child.isMesh && child.geometry.type === 'PlaneGeometry' && child.material.vertexColors);

describe('distant terrain ring', () => {
  it('carries real elevation from inside the detailed patch out past 100 nm, curving with the Earth', async () => {
    await mountFlight({ lat: 39.86, lon: -104.67 }); // Denver, looking toward the Front Range
    const { scene, camera, ring } = await drawUntilBuilt(1);
    expect(ring).toBeTruthy();
    expect(ring.visible).toBe(true);
    const radii = ring.userData.radii;
    expect(radii[0]).toBeLessThanOrEqual(120000 - 24000 - 10000); // still under the patch after a full drift
    expect(radii[radii.length - 1] / 6076.12).toBeGreaterThan(100);
    expect(ring.position.x).toBe(ring.userData.center.x); expect(ring.position.z).toBe(ring.userData.center.z);
    expect(ring.userData.center.lat).toBeCloseTo(39.86, 4); expect(ring.userData.center.lon).toBeCloseTo(-104.67, 4);
    // Every vertex is the shared elevation model at its own coordinate, lowered
    // by the Earth's curvature beyond the patch (about 9,600 ft at the rim).
    const positions = ring.geometry.attributes.position.array, offsets = ring.userData.offsets, center = ring.userData.center;
    let rimDrop = 0;
    for (let vertex = 0; vertex < offsets.length / 2; vertex += 37) {
      const ox = offsets[vertex * 2], oz = offsets[vertex * 2 + 1], radius = Math.hypot(ox, oz);
      expect(positions[vertex * 3]).toBeCloseTo(ox, 3); expect(positions[vertex * 3 + 2]).toBeCloseTo(oz, 3);
      const drop = radius > 120000 ? (radius * radius - 120000 * 120000) / (2 * 20902231) : 0;
      const lat = center.lat - oz / 364800, lon = center.lon + ox / center.lonScale;
      expect(positions[vertex * 3 + 1], 'vertex ' + vertex).toBeCloseTo(api.getFlightTerrainHeight(lat, lon) - drop, 0);
      rimDrop = Math.max(rimDrop, drop);
    }
    expect(rimDrop).toBeGreaterThan(9000);
    expect(camera.far).toBeGreaterThan(radii[radii.length - 1]);
  });

  it('matches the elevation model at its vertices and leaves picking to the detailed patch', async () => {
    const hooks = await mountFlight({ lat: 46.6, lon: -121.2 }); // east of Mount Rainier
    const { scene, ring } = await drawUntilBuilt(1);
    const terrain = terrainOf(scene);
    expect(terrain).toBeTruthy();
    // The cut-out follows the patch so the two never draw over each other.
    expect(ring.userData.cutCenter.value.x).toBe(terrain.position.x);
    expect(ring.userData.cutCenter.value.y).toBe(terrain.position.z);
    expect(ring.userData.cutHalf.value).toBeGreaterThan(119000);
    expect(ring.userData.cutHalf.value).toBeLessThanOrEqual(120000);
    const ray = new Three.Raycaster(new Three.Vector3(ring.position.x + 150000, 100000, ring.position.z), new Three.Vector3(0, -1, 0), 0, 400000);
    expect(ray.intersectObject(ring)).toHaveLength(0);
    // The ring reaches the mountain from 20 nm away with its real height.
    const positions = ring.geometry.attributes.position.array, offsets = ring.userData.offsets;
    expect(hooks.flightRef.current.lat).toBe(46.6);
    let maxHeight = -Infinity;
    for (let vertex = 0; vertex < offsets.length / 2; vertex++) {
      const radius = Math.hypot(offsets[vertex * 2], offsets[vertex * 2 + 1]);
      const drop = radius > 120000 ? (radius * radius - 120000 * 120000) / (2 * 20902231) : 0;
      maxHeight = Math.max(maxHeight, positions[vertex * 3 + 1] + drop);
    }
    // Rainier (14,411 ft) lies about 20 nm west, inside the ring's reach.
    expect(maxHeight).toBeGreaterThan(12000);
  });

  it('rebuilds after travel a few hundred vertices per frame, keeping the old ring until the new one is ready', async () => {
    const hooks = await mountFlight({ lat: 43.6, lon: -70.5 });
    const first = await drawUntilBuilt(1);
    const oldCenter = { ...first.ring.userData.center };
    hooks.flightRef.current.lon += 40000 / (364800 * Math.cos(43.6 * Math.PI / 180));
    const moving = await draw();
    expect(moving.ring.userData.build).toBeTruthy();
    expect(moving.ring.userData.build.next).toBeLessThanOrEqual(240);
    expect(moving.ring.userData.center.x).toBe(oldCenter.x);
    expect(moving.ring.visible).toBe(true);
    const rebuilt = await drawUntilBuilt(2);
    expect(rebuilt.ring.userData.builds).toBe(2);
    expect(rebuilt.ring.userData.center.x - oldCenter.x).toBeGreaterThan(30000);
    // Small moves inside the rebuild distance cost nothing.
    hooks.flightRef.current.lon += 8000 / (364800 * Math.cos(43.6 * Math.PI / 180));
    const still = await draw();
    expect(still.ring.userData.build).toBeNull();
  });

  it('sets the scene deep enough for the ring and fogs a clear day at about 74 nm', async () => {
    await mountFlight({ lat: 36.1, lon: -112.1, altitude: 9000 });
    const { scene, camera, ring } = await drawUntilBuilt(1);
    const outer = ring.userData.radii[ring.userData.radii.length - 1];
    expect(camera.far).toBeGreaterThan(outer + 24000 + 100000);
    const sky = scene.children.find(child => child.isMesh && child.geometry.type === 'SphereGeometry' && child.material.side === Three.BackSide);
    expect(sky.geometry.parameters.radius).toBeGreaterThan(outer + 24000);
    const stars = scene.children.find(child => child.name === 'flight-stars');
    const starPositions = stars.geometry.attributes.position.array;
    expect(Math.hypot(starPositions[0], starPositions[1], starPositions[2])).toBeGreaterThan(outer + 24000);
    expect(scene.fog.far).toBe(450000);
    expect(scene.fog.near).toBe(112500);
    expect(scene.fog.far).toBeLessThan(outer - 24000);
  });
});

describe('15 arc-second mountain detail', () => {
  const heights = [
    // name, lat, lon, surveyed summit (ft); 15" samples sit within a few percent
    ['Mount Everest', 27.9881, 86.925, 29032], ['Mont Blanc', 45.8326, 6.8652, 15774],
    ['Mount Rainier', 46.8523, -121.7603, 14411], ['Denali', 63.0695, -151.0074, 20310],
    ['Kilimanjaro', -3.0674, 37.3556, 19341], ['Mount Fuji', 35.3606, 138.7274, 12388],
    ['Aconcagua', -32.6532, -70.0109, 22838], ['Mauna Kea', 19.8207, -155.4681, 13803],
  ];
  it.each(heights)('puts %s within 7%% of its surveyed height', (name, lat, lon, surveyed) => {
    const height = api.getFlightTerrainHeight(lat, lon);
    expect(Math.abs(height - surveyed) / surveyed, name + ' ' + Math.round(height)).toBeLessThan(0.07);
  });

  it('carves the Grand Canyon about a mile below its rims', () => {
    const southRim = api.getFlightTerrainHeight(36.0544, -112.1401);
    const river = api.getFlightTerrainHeight(36.1055, -112.0956); // Phantom Ranch, about 2,460 ft
    const northRim = api.getFlightTerrainHeight(36.2003, -112.0572);
    expect(river).toBeLessThan(3500);
    expect(southRim - river).toBeGreaterThan(3500);
    expect(northRim - river).toBeGreaterThan(4500);
  });

  it('layers the mountain patch over the Everest airport region instead of picking one', () => {
    const info = api.getFlightElevationInfo();
    expect(info.finestResolutionDegrees).toBeCloseTo(1 / 240, 12);
    expect(info.mountainCount).toBeGreaterThanOrEqual(12);
    // The summit is inside both the 1' region and the 15" patch; the finer one wins.
    expect(api.getFlightTerrainHeight(27.9881, 86.925)).toBeGreaterThan(27500);
  });
});
