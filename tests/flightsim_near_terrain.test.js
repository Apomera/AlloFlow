import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// The near terrain patch is sampled in 2,000 ft cells, and recentring reuses
// the samples the new patch shares with the old one. A reused vertex must be
// exactly what a fresh resample would give, or the ground would shift as the
// aircraft flies. Mounted with the real three.js; rendering is stubbed.
const vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const Three = vendor.THREE;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, root, hooks, callback, renderer, errors, wallTime, resize;

beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null; host?.remove(); host = null; callback = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  delete window.THREE; delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
});

async function mountFlight(start) {
  wallTime = 1000; callback = null;
  const graphics = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, {
    get: (target, key) => key in target ? target[key] : () => {},
    set: (target, key, value) => { target[key] = value; return true; },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(graphics);
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  errors = vi.spyOn(console, 'error').mockImplementation(() => {}); vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('AlloPostFXEnabled', false); vi.stubGlobal('devicePixelRatio', 1);
  vi.stubGlobal('matchMedia', query => ({ media: query, matches: query.includes('prefers-reduced-motion'), addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('requestAnimationFrame', next => { if (next.name === 'loop') callback = next; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  renderer = { domElement: {}, shadowMap: {}, capabilities: { getMaxAnisotropy: () => 1 },
    setSize() {}, setPixelRatio() {}, dispose() {}, getContext: () => ({ isContextLost: () => false }),
    render: vi.fn((scene, camera) => { scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); }) };
  window.THREE = { ...Three, WebGLRenderer: function() { return renderer; } };
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', aircraft: 'cessna172', cityOnline: false, thirdPerson: false,
      railCollapsed: true, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(item => [item.id, true])) } });
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })) }));
  }
  await React.act(async () => root.render(React.createElement(App)));
  await React.act(async () => host.querySelector('button[aria-label="Free Flight from Portland, ME"]').click());
  hooks = window.__testHooks.flightSim;
  Object.assign(hooks.flightRef.current, { speed: 0, vsi: 0, heading: 90, bank: 0, onGround: false, ...start });
  Object.assign(hooks.controlsRef.current, { throttle: 0, pitch: 0, bank: 0, yawRate: 0 });
  Object.assign(hooks.getWeatherRef().current, { type: 'clear', visibility: 1, wind: 0, turbulence: 0 });
  hooks.pausedRef.current = true;
}
async function frame() {
  // A paused flight repaints only when its canvas resizes: alternate the width.
  resize = !resize;
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { value: resize ? 1280 : 1282, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: 720, configurable: true });
  }
  wallTime += 16; expect(callback).toBeTypeOf('function');
  await React.act(async () => callback()); expect(errors).not.toHaveBeenCalled();
  const [scene] = renderer.render.mock.calls.at(-1);
  const terrain = scene.children.find(item => item.isMesh && item.geometry?.type === 'PlaneGeometry' && item.material?.vertexColors);
  expect(terrain).toBeTruthy();
  return terrain;
}
const surface = (terrain) => {
  const g = terrain.geometry;
  return { position: Array.from(g.getAttribute('position').array), color: Array.from(g.getAttribute('color').array),
    land: Array.from(g.getAttribute('landCoverage').array), field: Array.from(g.getAttribute('fieldCoverage').array),
    water: terrain.userData.waterIdx.map(r => [r.i, r.x, r.y, r.height, r.r, r.g, r.b].join(',')) };
};

describe('SkySchool near terrain patch', () => {
  it('samples a 240,000 ft patch in 2,000 ft cells', async () => {
    await mountFlight({ lat: 39.74, lon: -104.6, altitude: 13500, fieldElev: 5400 });
    const terrain = await frame(), params = terrain.geometry.parameters;
    expect([params.width, params.height, params.widthSegments, params.heightSegments]).toEqual([240000, 240000, 120, 120]);
    expect(params.width / params.widthSegments).toBe(2000);
    expect(terrain.geometry.getAttribute('position').count).toBe(121 * 121);
    // The first build has nothing to reuse.
    expect(terrain.userData.terrainSamplesReused).toBe(0);
  });

  // The Front Range (steep relief, so a misplaced sample would show) and
  // Puget Sound (sea and shore, so the water records are exercised too).
  it.each([['the Front Range', 39.95, -105.3, 5400, false], ['Puget Sound', 47.6, -122.45, 0, true]])('reuses only shared ground when it recentres over %s, and the result equals a full resample', async (_place, lat, lon, fieldElev, wet) => {
    await mountFlight({ lat, lon, altitude: 14000, fieldElev });
    const first = await frame(), cosLat = Math.cos(lat * Math.PI / 180);
    const before = first.position.x;
    // East by ~12,000 ft and south by ~8,000 ft: past the 8,000 ft recentre threshold.
    hooks.flightRef.current.lon += 12000 / (364800 * cosLat);
    hooks.flightRef.current.lat -= 8000 / 364800;
    const moved = await frame();
    expect(moved).toBe(first);
    expect(moved.position.x).not.toBe(before);
    const shiftI = Math.round((moved.position.x - before) / 2000);
    expect(Math.abs(shiftI)).toBeGreaterThan(0);
    const reused = moved.userData.terrainSamplesReused;
    expect(reused).toBeGreaterThan(121 * 121 * 0.8);
    expect(reused).toBeLessThan(121 * 121);
    const incremental = surface(moved);
    // Drop the cache and rebuild at the same centre: every vertex resampled.
    moved.userData.terrainSamples = null;
    const centre = { lat: hooks.flightRef.current.lat, lon: hooks.flightRef.current.lon };
    hooks.flightRef.current.lat += 9000 / 364800;   // force a recentre away...
    await frame();
    moved.userData.terrainSamples = null;
    Object.assign(hooks.flightRef.current, centre);  // ...and back, from scratch
    const fresh = await frame();
    expect(fresh.userData.terrainSamplesReused).toBe(0);
    const full = surface(fresh);
    expect(full.position).toEqual(incremental.position);
    expect(full.land).toEqual(incremental.land);
    expect(full.field).toEqual(incremental.field);
    expect(full.water).toEqual(incremental.water);
    if (wet) expect(full.water.length).toBeGreaterThan(500);
    // Albedo within float noise: the relief-shade hash (sin x 43758) turns the
    // 1e-13 deg jitter of a recomputed centre into ~1e-6 of colour, so even two
    // fresh samples of one spot differ by that much. Water has no hash: exact.
    expect(Math.max(...full.color.map((v, i) => Math.abs(v - incremental.color[i])))).toBeLessThan(1e-5);
  }, 60000);

  it('starts afresh when the scene origin moves or the jump is wider than the patch', async () => {
    await mountFlight({ lat: 39.95, lon: -105.3, altitude: 14000, fieldElev: 5400 });
    const terrain = await frame();
    hooks.flightRef.current.lon += 2.5;   // ~640,000 ft: no overlap
    await frame();
    expect(terrain.userData.terrainSamplesReused).toBe(0);
    const samples = terrain.userData.terrainSamples;
    expect(samples.size).toBe(120);
    expect(samples.height.length).toBe(121 * 121);
    // A different origin means different mesh-local axes: nothing carries over.
    samples.originLat += 1;
    hooks.flightRef.current.lat += 9000 / 364800;
    await frame();
    expect(terrain.userData.terrainSamplesReused).toBe(0);
  }, 60000);
});
