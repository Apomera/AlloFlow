import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const Three = vendor.THREE;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const HALF = 60000;
let api, tool, host, root, callback, wallTime, renderer, errors, resize;

beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  api = window.__RR_TEST_EXPORTS__.flightSim;
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null; host?.remove(); host = null; callback = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  delete window.THREE; delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
});

async function mountFlight({ weather = 'clear', reducedMotion = false } = {}) {
  wallTime = 1000; callback = null; resize = false;
  const context = new Proxy({
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  }, { get: (target, key) => key in target ? target[key] : () => {},
    set: (target, key, value) => { target[key] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('AlloPostFXEnabled', false);
  vi.stubGlobal('matchMedia', query => ({ media: query, matches: reducedMotion && query.includes('prefers-reduced-motion'),
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  vi.stubGlobal('requestAnimationFrame', next => { if (next.name === 'loop') callback = next; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  renderer = { domElement: {}, shadowMap: {}, capabilities: { getMaxAnisotropy: () => 1 },
    setSize() {}, setPixelRatio() {}, dispose() {}, getContext: () => ({ isContextLost: () => false }),
    render: vi.fn((scene, camera) => { scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); }) };
  window.THREE = { ...Three, WebGLRenderer: function() { return renderer; } };
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', cityOnline: false,
      thirdPerson: false, flightDetails: false, railCollapsed: true, takeoffTutorialDismissed: true,
      landingTutorialDismissed: true, earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(item => [item.id, true])) } });
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })) }));
  }
  await React.act(async () => root.render(React.createElement(App)));
  await React.act(async () => window.__testHooks.flightSim.startFlightChallenge('first_flight'));
  const hooks = window.__testHooks.flightSim;
  // An offshore stationary pose isolates scenery movement from terrain contacts
  // and city loading. Actual production RAF, camera, and cloud updates run.
  Object.assign(hooks.flightRef.current, { lat: 0, lon: 0, altitude: 5000, fieldElev: 0,
    onGround: false, speed: 0, vsi: 0, heading: 0, bank: 0 });
  Object.assign(hooks.controlsRef.current, { throttle: 0, pitch: 0, bank: 0 });
  Object.assign(hooks.getWeatherRef().current, { wind: 0, turbulence: 0, visibility: 1, type: weather });
  hooks.timeRef.current = 0;
  vi.spyOn(api.Physics, 'step').mockImplementation(state => ({ ...state,
    forces: { lift: api.Physics.WEIGHT, weight: api.Physics.WEIGHT, drag: 0, thrust: 0 } }));
  return hooks;
}
async function frame(hooks, { milliseconds = 100, quality = 0 } = {}) {
  // Test each requested quality budget independently of the FPS governor.
  Object.assign(hooks.qualityRef.current, { tier: quality, sum: 0, n: 0 });
  resize = !resize;
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { value: resize ? 1280 : 1282, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: 720, configurable: true });
  }
  wallTime += milliseconds;
  const previous = renderer.render.mock.calls.length;
  expect(callback).toBeTypeOf('function');
  await React.act(async () => callback());
  expect(errors).not.toHaveBeenCalled();
  expect(renderer.render.mock.calls.length).toBeGreaterThan(previous);
  const [scene, camera] = renderer.render.mock.calls.at(-1);
  const group = scene.children.find(item => item.isGroup && item.children.length === 24 &&
    item.children.every(child => child.isSprite && child.material.map?.image?.width === 128 && child.material.map?.image?.height === 64));
  expect(group).toBeTruthy();
  return { scene, camera, group, clouds: group.children };
}
const presence = clouds => clouds.map(cloud => cloud.userData.flightCloudPresence);
const targetPresence = count => Array.from({ length: 24 }, (_, index) => index < count ? 1 : 0);
function resourceSnapshot(clouds) {
  const map = clouds[0].material.map;
  return { entries: clouds.map(cloud => ({ cloud, material: cloud.material, geometry: cloud.geometry,
    scale: cloud.scale.toArray(), height: cloud.position.y })), map, mapDisposal: vi.spyOn(map, 'dispose'),
    materialDisposals: clouds.map(cloud => vi.spyOn(cloud.material, 'dispose')) };
}
function assertResources(clouds, original) {
  expect(clouds).toHaveLength(24);
  clouds.forEach((cloud, index) => {
    const entry = original.entries[index];
    expect(cloud).toBe(entry.cloud); expect(cloud.material).toBe(entry.material); expect(cloud.geometry).toBe(entry.geometry);
    expect(cloud.material.map).toBe(original.map); expect(cloud.scale.toArray()).toEqual(entry.scale);
    expect(cloud.position.y).toBe(entry.height); expect(cloud.material.depthWrite).toBe(false);
  });
  expect(original.mapDisposal).not.toHaveBeenCalled();
  original.materialDisposals.forEach(dispose => expect(dispose).not.toHaveBeenCalled());
}

describe('production cloud field recycling', () => {
  it('wraps all 24 clouds including hidden reserves after travel across multiple field widths without recreating resources', async () => {
    const hooks = await mountFlight(), initial = await frame(hooks);
    expect(presence(initial.clouds)).toEqual(targetPresence(8));
    expect(initial.clouds.slice(8).every(cloud => !cloud.visible && cloud.material.opacity === 0)).toBe(true);
    const original = resourceSnapshot(initial.clouds), before = initial.clouds.map(cloud => cloud.position.clone());
    const oldCamera = initial.camera.position.clone();
    Object.assign(hooks.flightRef.current, { lat: 3, lon: 4, bank: 35 });
    const moved = await frame(hooks);
    expect(moved.group).toBe(initial.group);
    expect(Math.abs(moved.camera.position.x - oldCamera.x)).toBeGreaterThan(HALF * 6);
    expect(Math.abs(moved.camera.position.z - oldCamera.z)).toBeGreaterThan(HALF * 6);
    moved.clouds.forEach((cloud, index) => {
      for (const axis of ['x', 'z']) {
        const offset = cloud.position[axis] - moved.camera.position[axis];
        expect(offset).toBeGreaterThanOrEqual(-HALF - 1e-8); expect(offset).toBeLessThanOrEqual(HALF + 1e-8);
        const cycles = (cloud.position[axis] - before[index][axis]) / (HALF * 2);
        expect(cycles).toBeCloseTo(Math.round(cycles), 8);
        expect(Math.abs(cycles)).toBeGreaterThan(1);
      }
      expect(Math.abs(cloud.material.rotation)).toBeGreaterThan(0.4); // Hidden reserves also receive the current orientation.
    });
    expect(presence(moved.clouds)).toEqual(targetPresence(8));
    assertResources(moved.clouds, original);
    const wrapped = moved.clouds.map(cloud => cloud.position.toArray());
    for (let i = 0; i < 3; i++) {
      const stationary = await frame(hooks);
      expect(stationary.clouds.map(cloud => cloud.position.toArray())).toEqual(wrapped);
      assertResources(stationary.clouds, original);
    }
  });

  it('has zero opacity at the wrap seam and keeps the radial corner fade after wrapping', async () => {
    const hooks = await mountFlight(); hooks.pausedRef.current = true;
    const initial = await frame(hooks), cloud = initial.clouds[0], camera = initial.camera;
    const paintAt = async (x, z) => {
      cloud.position.x = camera.position.x + x; cloud.position.z = camera.position.z + z;
      await frame(hooks);
      return { x: cloud.position.x - camera.position.x, z: cloud.position.z - camera.position.z,
        alpha: cloud.material.opacity, visible: cloud.visible };
    };
    const interior = await paintAt(20000, 0);
    expect(interior.alpha).toBeGreaterThan(0.4); expect(interior.visible).toBe(true);
    const before = await paintAt(HALF - 1, 0), boundary = await paintAt(HALF, 0), after = await paintAt(HALF + 1, 0);
    expect(before.alpha).toBeLessThan(1e-7); expect(after.alpha).toBeLessThan(1e-7);
    expect(before.alpha).toBeCloseTo(after.alpha, 10);
    expect(boundary.alpha).toBe(0); expect(boundary.visible).toBe(false);
    expect(after.x).toBeCloseTo(-HALF + 1, 8);
    const recovered = await paintAt(HALF * 8 + 20000, HALF * -6);
    expect(recovered.x).toBeCloseTo(20000, 8); expect(recovered.z).toBeCloseTo(0, 8);
    expect(recovered.alpha).toBeCloseTo(interior.alpha, 10); // Fade must use the new, wrapped offsets.
    const corner = await paintAt(50000, 50000);
    expect(corner.alpha).toBe(0); expect(corner.visible).toBe(false);
    expect(cloud.userData.flightCloudPresence).toBe(1);
  });
});

describe('production weather and quality cloud transitions', () => {
  it('gradually changes clear/storm coverage and quality budgets without sprite churn', async () => {
    const hooks = await mountFlight(), initial = await frame(hooks);
    const original = resourceSnapshot(initial.clouds);
    expect(presence(initial.clouds)).toEqual(targetPresence(8));
    const transition = async (weather, quality, targetCount) => {
      hooks.getWeatherRef().current.type = weather;
      const before = presence(initial.clouds), target = targetPresence(targetCount);
      let current = await frame(hooks, { quality });
      const first = presence(current.clouds);
      let changed = 0;
      first.forEach((value, index) => {
        expect(value).toBeGreaterThanOrEqual(0); expect(value).toBeLessThanOrEqual(1);
        expect(Math.abs(value - before[index])).toBeLessThanOrEqual(0.06000001);
        if (before[index] !== target[index]) {
          changed++;
          expect(Math.abs(target[index] - value)).toBeLessThan(Math.abs(target[index] - before[index]));
          expect(value).not.toBe(target[index]);
        }
      });
      expect(changed).toBeGreaterThan(0);
      let previous = first;
      for (let step = 0; step < 17; step++) {
        current = await frame(hooks, { quality });
        const next = presence(current.clouds);
        next.forEach((value, index) => {
          expect(Math.abs(value - target[index])).toBeLessThanOrEqual(Math.abs(previous[index] - target[index]));
          expect(Math.abs(value - previous[index])).toBeLessThanOrEqual(0.06000001);
        });
        previous = next;
      }
      expect(presence(current.clouds)).toEqual(target);
      current.clouds.forEach((cloud, index) => {
        if (index >= targetCount) { expect(cloud.visible).toBe(false); expect(cloud.material.opacity).toBe(0); }
      });
      assertResources(current.clouds, original);
    };
    await transition('stormy', 0, 22);
    await transition('clear', 0, 8);
    await transition('clear', 2, 6);
    await transition('clear', 0, 8);
  });

  it('freezes a partial transition while paused and resumes with a bounded step', async () => {
    const hooks = await mountFlight(), initial = await frame(hooks);
    hooks.getWeatherRef().current.type = 'stormy';
    await frame(hooks);
    const partial = presence(initial.clouds);
    expect(partial[10]).toBeGreaterThan(0); expect(partial[10]).toBeLessThan(1);
    hooks.pausedRef.current = true;
    const heldTime = hooks.timeRef.current;
    for (let i = 0; i < 3; i++) {
      await frame(hooks, { milliseconds: 5000 });
      expect(presence(initial.clouds)).toEqual(partial);
      expect(hooks.timeRef.current).toBe(heldTime);
    }
    hooks.pausedRef.current = false;
    await frame(hooks, { milliseconds: 5000 });
    expect(initial.clouds[10].userData.flightCloudPresence).toBeGreaterThan(partial[10]);
    expect(initial.clouds[10].userData.flightCloudPresence - partial[10]).toBeLessThanOrEqual(0.06000001);
  });

  it('seeds initial storm coverage and snaps reduced-motion changes while retaining spatial fading', async () => {
    const hooks = await mountFlight({ weather: 'stormy', reducedMotion: true });
    hooks.pausedRef.current = true;
    const initial = await frame(hooks);
    expect(presence(initial.clouds)).toEqual(targetPresence(22));
    const original = resourceSnapshot(initial.clouds);
    hooks.getWeatherRef().current.type = 'clear';
    await frame(hooks);
    expect(presence(initial.clouds)).toEqual(targetPresence(8));
    await frame(hooks, { quality: 2 });
    expect(presence(initial.clouds)).toEqual(targetPresence(6));
    hooks.getWeatherRef().current.type = 'stormy';
    await frame(hooks);
    expect(presence(initial.clouds)).toEqual(targetPresence(22));
    initial.clouds[0].position.x = initial.camera.position.x + HALF;
    initial.clouds[0].position.z = initial.camera.position.z;
    await frame(hooks);
    expect(initial.clouds[0].material.opacity).toBe(0); expect(initial.clouds[0].visible).toBe(false);
    expect(initial.clouds[0].userData.flightCloudPresence).toBe(1);
    assertResources(initial.clouds, original);
  });
});
