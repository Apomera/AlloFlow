import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const Three = vendor.THREE;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, root, hooks, callback, renderer, errors, wallTime, resize, motionListeners, commands;

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

async function mountFlight({ reducedMotion = false, altitude = 6000, hour = 7, webgl = true } = {}) {
  wallTime = 1000; callback = null; resize = false; motionListeners = new Set(); commands = [];
  const graphics = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: (...args) => ({ kind: 'linear', args, stops: [], addColorStop(offset, color) { this.stops.push([offset, color]); } }),
    createRadialGradient: (...args) => ({ kind: 'radial', args, stops: [], addColorStop(offset, color) { this.stops.push([offset, color]); } }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, {
    get: (target, key) => key in target ? target[key] : (...args) => commands.push({ method: key, args,
      fill: target.fillStyle, stroke: target.strokeStyle, alpha: target.globalAlpha ?? 1 }),
    set: (target, key, value) => { target[key] = value; return true; },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(graphics);
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  errors = vi.spyOn(console, 'error').mockImplementation(() => {}); vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('AlloPostFXEnabled', false); vi.stubGlobal('devicePixelRatio', 1);
  vi.stubGlobal('matchMedia', query => ({ media: query, matches: reducedMotion && query.includes('prefers-reduced-motion'),
    addEventListener(type, listener) { if (type === 'change' && query.includes('prefers-reduced-motion')) motionListeners.add(listener); },
    removeEventListener(type, listener) { motionListeners.delete(listener); } }));
  vi.stubGlobal('requestAnimationFrame', next => { if (next.name === 'loop') callback = next; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  renderer = { domElement: {}, shadowMap: {}, capabilities: { getMaxAnisotropy: () => 1 },
    setSize() {}, setPixelRatio() {}, dispose() {}, getContext: () => ({ isContextLost: () => false }),
    render: vi.fn((scene, camera) => { scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); }) };
  if (webgl) window.THREE = { ...Three, WebGLRenderer: function() { return renderer; } }; else delete window.THREE;
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
  Object.assign(hooks.flightRef.current, { lat: 43.646, lon: -70.309, altitude, fieldElev: 76,
    speed: 0, vsi: 0, heading: 90, bank: 0, onGround: false });
  Object.assign(hooks.controlsRef.current, { throttle: 0, pitch: 0, bank: 0, yawRate: 0 });
  Object.assign(hooks.getWeatherRef().current, { type: 'clear', visibility: 1, wind: 0, turbulence: 0 });
  hooks.pausedRef.current = true; solarHour(hour);
}
function solarHour(hour) { hooks.timeRef.current = ((hour - 12 - hooks.flightRef.current.lon / 15 + 48) % 24) * 100; }
async function frame({ quality = 0, repaint = true, milliseconds = 16 } = {}) {
  Object.assign(hooks.qualityRef.current, { tier: quality, sum: 0, n: 0 });
  if (repaint) {
    resize = !resize;
    for (const canvas of host.querySelectorAll('canvas')) {
      Object.defineProperty(canvas, 'clientWidth', { value: resize ? 1280 : 1282, configurable: true });
      Object.defineProperty(canvas, 'clientHeight', { value: 720, configurable: true });
    }
  }
  wallTime += milliseconds; commands.length = 0; expect(callback).toBeTypeOf('function');
  await React.act(async () => callback()); expect(errors).not.toHaveBeenCalled();
  if (!window.THREE) return null;
  expect(renderer.render).toHaveBeenCalled(); const [scene, camera] = renderer.render.mock.calls.at(-1);
  const terrain = scene.children.find(item => item.isMesh && item.geometry?.type === 'PlaneGeometry' && item.material?.vertexColors);
  expect(terrain).toBeTruthy(); expect(terrain.userData.waterIdx.length).toBeGreaterThan(100);
  const detail = terrain.children.find(item => item.isMesh && item.material?.blending === Three.MultiplyBlending);
  expect(detail).toBeTruthy(); return { scene, camera, terrain, detail };
}
const waterColors = terrain => {
  const colors = terrain.geometry.getAttribute('color');
  return terrain.userData.waterIdx.flatMap(record => [colors.getX(record.i), colors.getY(record.i), colors.getZ(record.i)]);
};
const baseColors = terrain => terrain.userData.waterIdx.flatMap(record => [Math.fround(record.r), Math.fround(record.g), Math.fround(record.b)]);
function landColors(terrain) {
  const coverage = terrain.geometry.getAttribute('landCoverage'), colors = terrain.geometry.getAttribute('color'), result = [];
  for (let index = 0; index < coverage.count; index++) if (coverage.getX(index) === 1) result.push(colors.getX(index), colors.getY(index), colors.getZ(index));
  expect(result.length).toBeGreaterThan(1000); return result;
}
const maxDifference = (a, b) => Math.max(...a.map((value, index) => Math.abs(value - b[index])));
const redExcess = terrain => {
  const colors = terrain.geometry.getAttribute('color');
  return terrain.userData.waterIdx.map(record => colors.getX(record.i) - Math.fround(record.r));
};
function surfaceSnapshot({ terrain, detail }) {
  const geometry = terrain.geometry;
  return { terrain, detail, geometry, color: geometry.getAttribute('color'), water: terrain.userData.waterIdx,
    land: landColors(terrain), position: geometry.getAttribute('position'), normal: geometry.getAttribute('normal'),
    coverage: geometry.getAttribute('landCoverage'), coverageValues: Array.from(geometry.getAttribute('landCoverage').array),
    positions: Array.from(geometry.getAttribute('position').array), normals: Array.from(geometry.getAttribute('normal').array),
    surfaceVersion: terrain.userData.surfaceVersion, positionVersion: geometry.getAttribute('position').version,
    normalVersion: geometry.getAttribute('normal').version,
    materials: [terrain.material, detail.material], maps: [terrain.material.map, detail.material.map],
    disposals: [geometry, terrain.material, detail.material, terrain.material.map, detail.material.map].map(resource => vi.spyOn(resource, 'dispose')) };
}
function assertSurface(current, original) {
  const { terrain, detail } = current, geometry = terrain.geometry;
  expect(terrain).toBe(original.terrain); expect(detail).toBe(original.detail); expect(geometry).toBe(original.geometry);
  expect(geometry.getAttribute('color')).toBe(original.color); expect(terrain.userData.waterIdx).toBe(original.water);
  expect(landColors(terrain)).toEqual(original.land);
  expect(geometry.getAttribute('position')).toBe(original.position); expect(geometry.getAttribute('normal')).toBe(original.normal);
  expect(geometry.getAttribute('landCoverage')).toBe(original.coverage);
  expect(Array.from(original.coverage.array)).toEqual(original.coverageValues); expect(Array.from(original.position.array)).toEqual(original.positions);
  expect(Array.from(original.normal.array)).toEqual(original.normals); expect(terrain.userData.surfaceVersion).toBe(original.surfaceVersion);
  expect(original.position.version).toBe(original.positionVersion); expect(original.normal.version).toBe(original.normalVersion);
  expect([terrain.material, detail.material]).toEqual(original.materials); expect([terrain.material.map, detail.material.map]).toEqual(original.maps);
  original.disposals.forEach(dispose => expect(dispose).not.toHaveBeenCalled());
}

describe('production water reflection buffer lifecycle', () => {
  it('restores exact base water once when quality disables effects, then avoids further color uploads', async () => {
    await mountFlight(); const initial = await frame(), saved = surfaceSnapshot(initial);
    expect(Math.max(...redExcess(initial.terrain))).toBeGreaterThan(0.01);
    expect(initial.terrain.userData.flightWaterEffectsActive).toBe(true);
    const activeVersion = saved.color.version;
    const disabled = await frame({ quality: 2 }); expect(waterColors(disabled.terrain)).toEqual(baseColors(disabled.terrain));
    expect(saved.color.version).toBeGreaterThan(activeVersion); expect(disabled.terrain.userData.flightWaterEffectsActive).toBe(false);
    const restoredVersion = saved.color.version;
    for (let index = 0; index < 3; index++) {
      const current = await frame({ quality: 2 }); expect(waterColors(current.terrain)).toEqual(baseColors(current.terrain));
      expect(saved.color.version).toBe(restoredVersion); assertSurface(current, saved);
    }
  });

  it('retains shimmer without glint in reduced quality and recovers the same full-quality appearance', async () => {
    await mountFlight(); const initial = await frame(), saved = surfaceSnapshot(initial), original = waterColors(initial.terrain);
    const reduced = await frame({ quality: 1 }), colors = waterColors(reduced.terrain), base = baseColors(reduced.terrain);
    expect(redExcess(reduced.terrain).every(value => value === 0)).toBe(true);
    expect(colors.some((value, index) => index % 3 !== 0 && value > base[index] + 0.001)).toBe(true);
    await frame({ quality: 2 }); const restored = await frame({ quality: 0 });
    expect(waterColors(restored.terrain)).toEqual(original); assertSurface(restored, saved);
  });

  it('removes storm and fog sun reflections while preserving surface resources and clear-sky recovery', async () => {
    await mountFlight(); const initial = await frame(), saved = surfaceSnapshot(initial), clear = waterColors(initial.terrain);
    for (const type of ['stormy', 'foggy']) {
      Object.assign(hooks.getWeatherRef().current, { type, visibility: 0.4 }); const current = await frame();
      expect(redExcess(current.terrain).every(value => value === 0)).toBe(true); assertSurface(current, saved);
    }
    Object.assign(hooks.getWeatherRef().current, { type: 'clear', visibility: 1 }); const restored = await frame();
    expect(waterColors(restored.terrain)).toEqual(clear); assertSurface(restored, saved);
  });

  it('moves the brightest reflected sample along the geometric reflection as viewing height increases', async () => {
    await mountFlight({ reducedMotion: true, altitude: 6000 }); const low = await frame(), saved = surfaceSnapshot(low);
    function footprint({ terrain, camera }) {
      const position = terrain.geometry.getAttribute('position'), color = terrain.geometry.getAttribute('color');
      const solar = api.getFlightSolarFrame(7).sun.direction;
      const reflected = new Three.Vector3(-solar.x, solar.y, -solar.z);
      let best = null, mostAligned = null;
      for (const record of terrain.userData.waterIdx) {
        const strength = Math.max(0, color.getX(record.i) - Math.fround(record.r));
        const point = new Three.Vector3().fromBufferAttribute(position, record.i).applyMatrix4(terrain.matrixWorld);
        expect(Math.fround(record.height)).toBeCloseTo(point.y, 6);
        // Compare the rendered peak with the physical reflection direction,
        // without duplicating the production lobe's exponent or color formula.
        const alignment = camera.position.clone().sub(point).normalize().dot(reflected);
        if (!mostAligned || alignment > mostAligned.alignment) mostAligned = { alignment, point, index: record.i };
        if (!best || strength > best.strength) best = { strength, alignment, point, index: record.i };
      }
      expect(best.strength).toBeGreaterThan(0.01); expect(best.alignment).toBeGreaterThan(0.95);
      expect(best.alignment).toBeCloseTo(mostAligned.alignment, 6);
      return { best, mostAligned };
    }
    const near = footprint(low); hooks.flightRef.current.altitude = 16000;
    const high = await frame(), far = footprint(high);
    expect(far.mostAligned.index).not.toBe(near.mostAligned.index);
    expect(far.best.index).not.toBe(near.best.index);
    const solar = api.getFlightSolarFrame(7).sun.direction, towardSun = new Three.Vector3(solar.x, 0, solar.z).normalize();
    expect(far.best.point.clone().sub(near.best.point).dot(towardSun)).toBeGreaterThan(0);
    assertSurface(high, saved);
  });

  it('changes smoothly through the old sunrise glint cutoff without changing the geographic surface', async () => {
    await mountFlight({ reducedMotion: true }); const initial = await frame(), saved = surfaceSnapshot(initial);
    const formerBoundary = 6 + Math.asin(0.01 / 1.15) * 12 / Math.PI;
    for (const boundary of [6, formerBoundary, 6.2, 18]) {
      solarHour(boundary - 0.00001); const before = waterColors((await frame()).terrain);
      solarHour(boundary + 0.00001); const afterScene = await frame(), after = waterColors(afterScene.terrain);
      expect(maxDifference(before, after)).toBeLessThan(0.001); expect(after.every(Number.isFinite)).toBe(true); assertSurface(afterScene, saved);
    }
  });

  it('keeps static reflections under reduced motion while time cannot animate the water', async () => {
    await mountFlight({ reducedMotion: true }); const initial = await frame(), saved = surfaceSnapshot(initial), before = waterColors(initial.terrain);
    expect(Math.max(...redExcess(initial.terrain))).toBeGreaterThan(0.01);
    hooks.timeRef.current += 2400; const later = await frame();
    expect(maxDifference(waterColors(later.terrain), before)).toBeLessThan(1e-6); assertSurface(later, saved);
    motionListeners.forEach(listener => listener({ matches: false })); const animated = waterColors((await frame()).terrain);
    expect(maxDifference(animated, before)).toBeGreaterThan(0.001);
    hooks.timeRef.current += 2400; const changed = waterColors((await frame()).terrain);
    expect(maxDifference(changed, animated)).toBeGreaterThan(0.001);
    motionListeners.forEach(listener => listener({ matches: true })); const still = await frame();
    expect(maxDifference(waterColors(still.terrain), before)).toBeLessThan(1e-6); assertSurface(still, saved);
  });

  it('repaints paused water deterministically and leaves the held frame untouched between resizes', async () => {
    await mountFlight(); const initial = await frame(), before = waterColors(initial.terrain), time = hooks.timeRef.current;
    const state = JSON.stringify(hooks.flightRef.current), log = JSON.stringify(hooks.getLogRef().current);
    for (let index = 0; index < 3; index++) expect(waterColors((await frame({ milliseconds: 1000 })).terrain)).toEqual(before);
    const renders = renderer.render.mock.calls.length, version = initial.terrain.geometry.getAttribute('color').version;
    await frame({ repaint: false, milliseconds: 1000 }); expect(renderer.render.mock.calls.length).toBe(renders);
    expect(initial.terrain.geometry.getAttribute('color').version).toBe(version); expect(hooks.timeRef.current).toBe(time);
    expect(JSON.stringify(hooks.flightRef.current)).toBe(state); expect(JSON.stringify(hooks.getLogRef().current)).toBe(log);
  });

  it('rebuilds inactive terrain water at base colors without replacing its color buffer or leaving stale active state', async () => {
    await mountFlight(); const initial = await frame(), geometry = initial.terrain.geometry, color = geometry.getAttribute('color');
    await frame({ quality: 2 }); const previousSurface = initial.terrain.userData.surfaceVersion;
    hooks.flightRef.current.lon += 0.15; const moved = await frame({ quality: 2 });
    expect(moved.terrain).toBe(initial.terrain); expect(moved.terrain.geometry).toBe(geometry); expect(geometry.getAttribute('color')).toBe(color);
    expect(moved.terrain.userData.surfaceVersion).toBeGreaterThan(previousSurface);
    expect(moved.terrain.userData.flightWaterEffectsActive).toBe(false); expect(waterColors(moved.terrain)).toEqual(baseColors(moved.terrain));
    const version = color.version; await frame({ quality: 2 }); expect(color.version).toBe(version);
  });

  it('keeps the Canvas reflection wash under reduced motion while weather and quality suppress unsupported effects', async () => {
    await mountFlight({ webgl: false });
    const wash = () => commands.filter(command => command.method === 'fillRect' && command.fill?.stops
      && command.fill.stops.some(([, color]) => color.startsWith('rgba(255,235,180,')));
    const facets = () => commands.filter(command => command.method === 'fillRect' && command.args[2] === 1.8 && command.args[3] === 1
      && typeof command.fill === 'string' && command.fill.startsWith('rgba(255,240,190,'));
    await frame(); expect(wash().length).toBeGreaterThan(0); expect(facets().length).toBeGreaterThan(0);
    const washes = wash().length;
    hooks.getWeatherRef().current.type = 'stormy'; await frame(); expect(wash()).toHaveLength(0); expect(facets()).toHaveLength(0);
    hooks.getWeatherRef().current.type = 'clear'; await frame({ quality: 1 }); expect(wash()).toHaveLength(0); expect(facets()).toHaveLength(0);
    motionListeners.forEach(listener => listener({ matches: true })); await frame();
    expect(wash()).toHaveLength(washes); expect(facets()).toHaveLength(0);
    const still = commands.filter(command => command.method === 'fillRect' && typeof command.fill === 'string'
      && command.fill.startsWith('rgb(')).map(command => command.fill);
    expect(still.length).toBeGreaterThan(0); hooks.timeRef.current += 2400; await frame();
    expect(commands.filter(command => command.method === 'fillRect' && typeof command.fill === 'string'
      && command.fill.startsWith('rgb(')).map(command => command.fill)).toEqual(still);
    expect(wash()).toHaveLength(washes); expect(facets()).toHaveLength(0);
    await frame({ quality: 2 }); expect(wash()).toHaveLength(0); expect(facets()).toHaveLength(0);
  });
});
