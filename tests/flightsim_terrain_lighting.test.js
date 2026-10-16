import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const Three = vendor.THREE;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, reactRoot, patchData, frameCallback, wallTime, renderer, errors, resize;
const portland = { lat: 43.656, lon: -70.265, altitude: 5000 };

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

function setSolarHour(hooks, hour) {
  hooks.timeRef.current = ((hour - 12 - hooks.flightRef.current.lon / 15 + 48) % 24) * 100;
}
async function startAtHour(hour, position) {
  await React.act(async () => window.__testHooks.flightSim.startFlightChallenge('first_flight'));
  const hooks = window.__testHooks.flightSim;
  Object.assign(hooks.flightRef.current, { fieldElev: api.getFlightGroundElevation(position.lat, position.lon),
    speed: 0, vsi: 0, heading: 0, onGround: false, ...position });
  Object.assign(hooks.controlsRef.current, { throttle: 0, pitch: 0, bank: 0, yawRate: 0 });
  Object.assign(hooks.getWeatherRef().current, { wind: 0, turbulence: 0, visibility: 1, type: 'clear' });
  hooks.pausedRef.current = true;
  setSolarHour(hooks, hour);
  return hooks;
}
async function mountFlight(hour = 9, position = portland) {
  wallTime = 1000; frameCallback = null; resize = false;
  const graphics = new Proxy({
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  }, { get: (target, key) => key in target ? target[key] : () => {},
    set: (target, key, value) => { target[key] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(graphics);
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('AlloPostFXEnabled', false); vi.stubGlobal('devicePixelRatio', 1);
  vi.stubGlobal('requestAnimationFrame', callback => { if (callback.name === 'loop') frameCallback = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  renderer = { domElement: {}, shadowMap: {}, capabilities: { getMaxAnisotropy: () => 1 },
    setSize() {}, setPixelRatio() {}, dispose: vi.fn(), getContext: () => ({ isContextLost: () => false }),
    render: vi.fn((scene, camera) => { scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); }) };
  window.THREE = { ...Three, WebGLRenderer: function() { return renderer; } };
  host = document.createElement('div'); document.body.appendChild(host); reactRoot = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', aircraft: 'cessna172', cityOnline: false,
      thirdPerson: true, railCollapsed: true, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(item => [item.id, true])) } });
    patchData = patch => setData(old => ({ ...old, flightSim: { ...old.flightSim, ...patch } }));
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })) }));
  }
  await React.act(async () => reactRoot.render(React.createElement(App)));
  return startAtHour(hour, position);
}
async function frame() {
  // A resize intentionally repaints the paused scene. No physics or terrain
  // functions are replaced: scene vertices and materials are production data.
  resize = !resize;
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { value: resize ? 1280 : 1282, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: 720, configurable: true });
  }
  const renders = renderer.render.mock.calls.length;
  wallTime += 16; expect(frameCallback).toBeTypeOf('function');
  await React.act(async () => frameCallback());
  expect(errors).not.toHaveBeenCalled(); expect(renderer.render.mock.calls.length).toBeGreaterThan(renders);
  const [scene] = renderer.render.mock.calls.at(-1);
  const terrain = scene.children.find(item => item.isMesh && item.geometry?.type === 'PlaneGeometry' && item.material?.vertexColors);
  const key = scene.children.find(item => item.isDirectionalLight);
  const ambient = scene.children.find(item => item.isAmbientLight);
  expect(terrain).toBeTruthy(); expect(key).toBeTruthy(); expect(ambient).toBeTruthy();
  expect(terrain.material.isMeshLambertMaterial).toBe(true);
  return { scene, terrain, key, ambient };
}
function surfaceSnapshot(terrain) {
  const geometry = terrain.geometry;
  const color = geometry.getAttribute('color'), land = geometry.getAttribute('landCoverage');
  const colors = [], landIndices = [];
  for (let index = 0; index < land.count; index++) {
    if (land.getX(index) !== 1) continue; // Animated water deliberately has a separate appearance.
    landIndices.push(index); colors.push(color.getX(index), color.getY(index), color.getZ(index));
  }
  expect(landIndices.length).toBeGreaterThan(1000);
  return { colors, landIndices, positions: Array.from(geometry.getAttribute('position').array),
    normals: Array.from(geometry.getAttribute('normal').array),
    coverage: Array.from(land.array), fields: Array.from(geometry.getAttribute('fieldCoverage').array) };
}
function lightSnapshot({ key, ambient }) {
  return { direction: key.position.clone().sub(key.target.position).normalize().toArray(),
    direct: [key.color.r, key.color.g, key.color.b].map(channel => channel * key.intensity),
    ambient: [ambient.color.r, ambient.color.g, ambient.color.b].map(channel => channel * ambient.intensity) };
}

describe('terrain surface color and live solar lighting', () => {
  it('constructs the same land colors and elevations at dawn, noon, dusk, and night', async () => {
    await mountFlight(6);
    let initial, previous;
    for (const hour of [6, 12, 18, 22]) {
      if (previous) {
        await React.act(async () => patchData({ view: 'menu' }));
        await startAtHour(hour, portland);
      }
      const current = await frame();
      const surface = surfaceSnapshot(current.terrain);
      if (!initial) initial = surface;
      else {
        expect(current.terrain).not.toBe(previous.terrain); // A genuinely fresh terrain construction.
        expect(surface).toEqual(initial);
      }
      previous = current;
    }
  });

  it('updates ambient and directional lighting without rebuilding stationary terrain or mapped city geometry', async () => {
    const hooks = await mountFlight(9), initial = await frame();
    const terrain = initial.terrain, geometry = terrain.geometry, surface = surfaceSnapshot(terrain);
    const position = geometry.getAttribute('position'), normals = geometry.getAttribute('normal');
    const versions = { surface: terrain.userData.surfaceVersion, position: position.version, normal: normals.version };
    const district = initial.scene.children.find(item => item.userData?.flightCityDistrict);
    expect(district).toBeTruthy(); expect(district.userData.stats.buildings).toBeGreaterThan(1000);
    const cityGeometry = district.children.map(mesh => mesh.geometry);
    const cityDisposals = cityGeometry.map(item => vi.spyOn(item, 'dispose'));
    const observations = [lightSnapshot(initial)];
    for (const hour of [15, 18, 22]) {
      setSolarHour(hooks, hour);
      const heldTime = hooks.timeRef.current, current = await frame();
      expect(hooks.timeRef.current).toBe(heldTime);
      expect(current.terrain).toBe(terrain); expect(current.terrain.geometry).toBe(geometry);
      expect(surfaceSnapshot(terrain)).toEqual(surface);
      expect(geometry.getAttribute('position')).toBe(position); expect(geometry.getAttribute('normal')).toBe(normals);
      expect({ surface: terrain.userData.surfaceVersion, position: position.version, normal: normals.version }).toEqual(versions);
      expect(current.scene.children.find(item => item.userData?.flightCityDistrict)).toBe(district);
      district.children.forEach((mesh, index) => expect(mesh.geometry).toBe(cityGeometry[index]));
      cityDisposals.forEach(dispose => expect(dispose).not.toHaveBeenCalled());
      observations.push(lightSnapshot(current));
    }
    expect(observations[0].direction).not.toEqual(observations[1].direction);
    expect(observations[0].direct).not.toEqual(observations[2].direct);
    expect(observations[0].ambient).not.toEqual(observations[3].ambient);
  });

  it('changes mountain-slope illumination through the actual world-space normals and live sun direction', async () => {
    const position = { lat: 39.7, lon: -105.25, altitude: 15000 };
    const hooks = await mountFlight(8, position), morning = await frame();
    const original = surfaceSnapshot(morning.terrain), version = morning.terrain.userData.surfaceVersion;
    const morningDirection = morning.key.position.clone().sub(morning.key.target.position).normalize();
    setSolarHour(hooks, 16);
    const afternoon = await frame();
    const afternoonDirection = afternoon.key.position.clone().sub(afternoon.key.target.position).normalize();
    expect(afternoon.terrain.userData.surfaceVersion).toBe(version);
    expect(surfaceSnapshot(afternoon.terrain)).toEqual(original);
    const normalMatrix = new Three.Matrix3().getNormalMatrix(afternoon.terrain.matrixWorld);
    const normal = new Three.Vector3(), normals = afternoon.terrain.geometry.getAttribute('normal');
    let variedSlopes = 0;
    for (const index of original.landIndices) {
      normal.fromBufferAttribute(normals, index).applyMatrix3(normalMatrix).normalize();
      if (Math.abs(normal.x) < 0.05) continue;
      const morningCosine = Math.max(0, normal.dot(morningDirection));
      const afternoonCosine = Math.max(0, normal.dot(afternoonDirection));
      if (Math.abs(morningCosine - afternoonCosine) > 0.03) variedSlopes++;
    }
    // This is the Lambert normal/light dot product evaluated on actual
    // rendered slopes, not a second implementation of terrain coloring.
    expect(variedSlopes).toBeGreaterThan(20);
  });

  it('returns to the same surface colors after a terrain recenter at a different solar hour', async () => {
    const hooks = await mountFlight(6), first = await frame();
    const initial = surfaceSnapshot(first.terrain), version = first.terrain.userData.surfaceVersion;
    Object.assign(hooks.flightRef.current, { lat: portland.lat + 0.06, lon: portland.lon });
    setSolarHour(hooks, 12);
    const moved = await frame();
    expect(moved.terrain).toBe(first.terrain);
    expect(moved.terrain.userData.surfaceVersion).toBeGreaterThan(version);
    const movedVersion = moved.terrain.userData.surfaceVersion;
    Object.assign(hooks.flightRef.current, portland);
    setSolarHour(hooks, 18);
    const returned = await frame();
    expect(returned.terrain.userData.surfaceVersion).toBeGreaterThan(movedVersion);
    expect(surfaceSnapshot(returned.terrain)).toEqual(initial);
  });
});
