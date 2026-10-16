import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const Three = vendor.THREE;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, reactRoot, setData, frameCallback, wallTime, renderer, errors, viewport;
const mapChunk = Three.ShaderChunk.map_fragment;
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
});
afterEach(async () => {
  if (reactRoot) await React.act(async () => reactRoot.unmount());
  reactRoot = null; host?.remove(); host = null; frameCallback = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  delete window.THREE; delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
});
function shaderFor(kind) { const original = Three.ShaderLib[kind];
  return { vertexShader: original.vertexShader, fragmentShader: original.fragmentShader, uniforms: Three.UniformsUtils.clone(original.uniforms) }; }
function expandChunks(shader) {
  return shader.replace(/#include\s+<([\w\d_]+)>/g, (_, name) => {
    if (!(name in Three.ShaderChunk)) throw new Error('Unknown bundled shader chunk: ' + name);
    return expandChunks(Three.ShaderChunk[name]);
  });
}
function assertTerrainMask(material, kind) {
  const shader = shaderFor(kind); material.onBeforeCompile(shader, renderer);
  const vertex = expandChunks(shader.vertexShader), fragment = expandChunks(shader.fragmentShader);
  const varying = /varying\s+float\s+(\w+)\s*;/.exec(shader.vertexShader)?.[1];
  expect(varying).toBeTruthy();
  expect(vertex.match(/attribute\s+float\s+landCoverage\s*;/g)).toHaveLength(1);
  expect(vertex.match(new RegExp('varying\\s+float\\s+' + varying + '\\s*;', 'g'))).toHaveLength(1);
  expect(fragment.match(new RegExp('varying\\s+float\\s+' + varying + '\\s*;', 'g'))).toHaveLength(1);
  expect(vertex).toMatch(new RegExp(varying + '\\s*=\\s*landCoverage\\s*;'));
  const compact = fragment.replace(/\s+/g, '');
  const mapMultiply = compact.indexOf('diffuseColor*=texelColor;');
  expect(mapMultiply).toBeGreaterThan(0);
  expect(compact).toContain('texelColor=mapTexelToLinear(texelColor);');
  expect(compact.slice(0, mapMultiply)).toMatch(new RegExp('texelColor\\.rgb=mix\\(vec3\\(1(?:\\.0)?\\),texelColor\\.rgb,clamp\\(' + varying + ',0(?:\\.0)?,1(?:\\.0)?\\)\\);'));
  expect(fragment).not.toMatch(/texelColor\.a\s*=/);
  expect(fragment).toContain('diffuseColor.rgb *= vColor');
  expect(fragment).toContain('gl_FragColor'); expect(fragment).toContain('fogColor');
  return { shader, vertex, fragment, varying };
}
async function mountFlight({ width = 1280, height = 720, position = {} } = {}) {
  wallTime = 1000; viewport = { width, height }; frameCallback = null;
  const graphics = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, {
      get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => { target[key] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(graphics);
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  errors = vi.spyOn(console, 'error').mockImplementation(() => {}); vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('AlloPostFXEnabled', false); vi.stubGlobal('devicePixelRatio', 1);
  vi.stubGlobal('requestAnimationFrame', callback => { if (callback.name === 'loop') frameCallback = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  renderer = { domElement: {}, shadowMap: {}, capabilities: { getMaxAnisotropy: () => 1 },
    setSize() {}, setPixelRatio() {}, dispose: vi.fn(), getContext: () => ({ isContextLost: () => false }),
    render: vi.fn((scene, camera) => { scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); }) };
  window.THREE = { ...Three, WebGLRenderer: function() { return renderer; } };
  host = document.createElement('div'); document.body.appendChild(host); reactRoot = ReactDOMClient.createRoot(host);
  function App() {
    const [data, updateData] = React.useState({ flightSim: { view: 'menu', aircraft: 'cessna172', thirdPerson: true,
      railCollapsed: true, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(item => [item.id, true])) } }); setData = updateData;
    return tool.render(makeCtx({ toolData: data, setToolData: updateData,
      update: (id, key, value) => updateData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => updateData(old => ({ ...old, [id]: { ...old[id], ...patch } })) }));
  }
  await React.act(async () => reactRoot.render(React.createElement(App)));
  await React.act(async () => host.querySelector('button[aria-label="Free Flight from Portland, ME"]').click());
  const hooks = window.__testHooks.flightSim;
  Object.assign(hooks.flightRef.current, { lat: 43.646, lon: -70.309, altitude: 5000, fieldElev: 76,
    speed: 150, vsi: 0, heading: 90, onGround: false, ...position });
  Object.assign(hooks.controlsRef.current, { throttle: 0.5, pitch: 0, bank: 0, yawRate: 0 });
  Object.assign(hooks.getWeatherRef().current, { wind: 0, turbulence: 0, visibility: 1, type: 'clear' });
  hooks.timeRef.current = 10; hooks.pausedRef.current = true;
  await frame(); return hooks;
}
let flip = false;
async function frame() {
  flip = !flip;
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { value: viewport.width + (flip ? 0 : 2), configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: viewport.height, configurable: true });
  }
  wallTime += 16; expect(frameCallback).toBeTypeOf('function');
  await React.act(async () => frameCallback()); expect(errors).not.toHaveBeenCalled(); expect(renderer.render).toHaveBeenCalled();
}
function terrainScene() {
  const [scene] = renderer.render.mock.calls.at(-1);
  const terrain = scene.children.find(item => item.isMesh && item.geometry?.type === 'PlaneGeometry' && item.material?.vertexColors);
  expect(terrain).toBeTruthy();
  const detail = terrain.children.find(item => item.isMesh && item.material?.blending === Three.MultiplyBlending);
  expect(detail).toBeTruthy(); return { scene, terrain, detail };
}
function assertCoverage(terrain, detail) {
  const geometry = terrain.geometry, coverage = geometry.getAttribute('landCoverage');
  expect(detail.geometry).toBe(geometry); expect(coverage).toBeTruthy();
  expect(coverage.itemSize).toBe(1); expect(coverage.count).toBe(geometry.getAttribute('position').count);
  expect(Object.prototype.toString.call(coverage.array)).toBe('[object Float32Array]');
  const water = new Set(terrain.userData.waterIdx.map(vertex => vertex.i));
  for (let index = 0; index < coverage.count; index++) {
    expect(coverage.getX(index)).toBe(water.has(index) ? 0 : 1);
    expect(Number.isFinite(geometry.getAttribute('color').getX(index))).toBe(true);
  }
  return coverage;
}

describe('bundled r128 terrain map masking', () => {
  it.each(['lambert', 'basic'])('patches the actual%s shaders without dropping map encoding, vertex color, alpha, or fog', kind => {
    window.THREE = Three;
    const material = kind === 'lambert' ? new Three.MeshLambertMaterial() : new Three.MeshBasicMaterial();
    api.attachFlightTerrainTextureMask(material, Three); assertTerrainMask(material, kind);
    expect(Three.ShaderChunk.map_fragment).toBe(mapChunk); material.dispose();
  });
  it('retains an existing shader hook and program key, and attaches only once per material', () => {
    window.THREE = Three; const material = new Three.MeshLambertMaterial();
    const previous = vi.fn(function(shader) { shader.uniforms.preexisting = { value: 17 }; shader.vertexShader = '// existing hook\n' + shader.vertexShader; });
    material.onBeforeCompile = previous; material.customProgramCacheKey = () => 'existing-key';
    api.attachFlightTerrainTextureMask(material, Three);
    const callback = material.onBeforeCompile, key = material.customProgramCacheKey();
    expect(key).toBe('existing-key|skyschool-land-coverage-v1');
    expect(material.userData.flightTerrainTextureMask).toBe(1);
    api.attachFlightTerrainTextureMask(material, Three);
    expect(material.onBeforeCompile).toBe(callback); expect(material.customProgramCacheKey()).toBe(key);
    const shader = assertTerrainMask(material, 'lambert').shader;
    expect(previous).toHaveBeenCalledTimes(1); expect(previous.mock.instances[0]).toBe(material);
    expect(shader.uniforms.preexisting.value).toBe(17); expect(shader.vertexShader).toContain('// existing hook\n');
    material.dispose();
  });
  it('masks both actual terrain passes with one shared geographic coverage attribute', async () => {
    await mountFlight(); const { terrain, detail } = terrainScene(), coverage = assertCoverage(terrain, detail);
    expect([...coverage.array].some(value => value === 0)).toBe(true); expect([...coverage.array].some(value => value === 1)).toBe(true);
    expect(terrain.material.isMeshLambertMaterial).toBe(true); expect(terrain.material.fog).toBe(true);
    expect(detail.material.isMeshBasicMaterial).toBe(true); expect(detail.material.blending).toBe(Three.MultiplyBlending);
    expect(detail.material.fog).toBe(false); expect(detail.material.toneMapped).toBe(false);
    expect(detail.material.depthWrite).toBe(false); expect(detail.material.polygonOffset).toBe(true);
    expect(terrain.material.userData.flightTerrainTextureMask).toBe(1);
    expect(detail.material.userData.flightTerrainTextureMask).toBe(1);
    assertTerrainMask(terrain.material, 'lambert'); assertTerrainMask(detail.material, 'basic');
  });
  it('refreshes classification in the same geometry and buffer after actual geographic recentering', async () => {
    const hooks = await mountFlight(); const first = terrainScene();
    const coverage = assertCoverage(first.terrain, first.detail), before = [...coverage.array], version = coverage.version;
    const materials = [first.terrain.material, first.detail.material], maps = materials.map(material => material.map);
    Object.assign(hooks.flightRef.current, { lat: 43.65, lon: -69.9 }); await frame();
    const after = terrainScene(); expect(after.terrain).toBe(first.terrain); expect(after.detail).toBe(first.detail);
    expect(after.terrain.geometry).toBe(first.terrain.geometry); expect(assertCoverage(after.terrain, after.detail)).toBe(coverage);
    expect(coverage.version).toBeGreaterThan(version); expect([...coverage.array]).not.toEqual(before);
    expect([after.terrain.material, after.detail.material]).toEqual(materials);
    expect(materials.map(material => material.map)).toEqual(maps);
  });
  it('keeps geographic coverage aligned with the scene origin after a latitude change along the coast', async () => {
    const origin = { lat: 43.646, lon: -70.309 }, hooks = await mountFlight();
    const initial = terrainScene(); expect(initial.terrain.position.x).toBeCloseTo(0, 8); expect(initial.terrain.position.z).toBeCloseTo(0, 8);
    // Travel about74nm: the shared scene projection retains the original latitude.
    // This coastal fixture has thirteen source-cell classifications that differed
    // when terrain sampling wrongly used the aircraft's new latitude instead.
    Object.assign(hooks.flightRef.current, { lat: 44.646, lon: -69.309 }); await frame();
    const { terrain, detail } = terrainScene(), coverage = assertCoverage(terrain, detail);
    expect(terrain.geometry).toBe(initial.terrain.geometry);
    const position = terrain.geometry.getAttribute('position'), point = new Three.Vector3();
    const longitudeScale = 364800 * Math.cos(origin.lat * Math.PI / 180);
    const oldWrongScale = 364800 * Math.cos(hooks.flightRef.current.lat * Math.PI / 180);
    let checked = 0, water = 0, land = 0, previousProjectionDisagreements = 0;
    for (let index = 0; index < position.count; index++) {
      point.fromBufferAttribute(position, index).applyMatrix4(terrain.matrixWorld);
      const lat = origin.lat - point.z / 364800, lon = origin.lon + point.x / longitudeScale;
      if (Math.abs(lat) > 90 || lon < -180 || lon > 180 ||
          api.WAYPOINTS.some(airport => api.haversineNm(lat, lon, airport.lat, airport.lon) <= 3)) continue;
      const expectedWater = api.isWaterMask(lat, lon);
      expect(coverage.getX(index)).toBe(expectedWater ? 0 : 1);
      const oldWrongLon = hooks.flightRef.current.lon + position.getX(index) / oldWrongScale;
      if (api.isWaterMask(lat, oldWrongLon) !== expectedWater) previousProjectionDisagreements++;
      checked++; if (expectedWater) water++; else land++;
    }
    expect(checked).toBeGreaterThan(3000); expect(water).toBeGreaterThan(0); expect(land).toBeGreaterThan(0);
    expect(previousProjectionDisagreements).toBeGreaterThan(0);
  });
  it.each([179.99, -179.99])('keeps shared mask values and shoreline indices finite while crossing from longitude%s', async lon => {
    const hooks = await mountFlight({ position: { lat: -16, lon } }); const first = terrainScene();
    const coverage = assertCoverage(first.terrain, first.detail);
    hooks.flightRef.current.lon = lon + (lon > 0 ? 0.1 : -0.1); await frame();
    const after = terrainScene(); expect(after.terrain.geometry).toBe(first.terrain.geometry);
    expect(assertCoverage(after.terrain, after.detail)).toBe(coverage);
    expect([...coverage.array].every(value => value === 0 || value === 1)).toBe(true);
    assertTerrainMask(after.terrain.material, 'lambert'); assertTerrainMask(after.detail.material, 'basic');
  });
  it('keeps masks and hooks stable while paused through phone resizing, daylight changes and airframe switching', async () => {
    const hooks = await mountFlight({ width: 320, height: 568 }); const first = terrainScene();
    const coverage = assertCoverage(first.terrain, first.detail), values = [...coverage.array];
    const callbacks = [first.terrain.material.onBeforeCompile, first.detail.material.onBeforeCompile];
    const keys = [first.terrain.material.customProgramCacheKey(), first.detail.material.customProgramCacheKey()];
    for (const hour of [0, 6, 12, 18]) {
      hooks.timeRef.current = ((hour - 12 - hooks.flightRef.current.lon / 15 + 48) % 24) * 100;
      await frame(); expect(assertCoverage(terrainScene().terrain, terrainScene().detail)).toBe(coverage);
      expect([...coverage.array]).toEqual(values);
    }
    await React.act(async () => setData(old => ({ ...old, flightSim: { ...old.flightSim, aircraft: 'drone' } })));
    await frame(); const after = terrainScene();
    expect(after.terrain).toBe(first.terrain); expect(after.detail).toBe(first.detail);
    expect([after.terrain.material.onBeforeCompile, after.detail.material.onBeforeCompile]).toEqual(callbacks);
    expect([after.terrain.material.customProgramCacheKey(), after.detail.material.customProgramCacheKey()]).toEqual(keys);
    viewport = { width: 568, height: 320 }; await frame();
    expect(assertCoverage(terrainScene().terrain, terrainScene().detail)).toBe(coverage);
    expect([...coverage.array]).toEqual(values);
  });
  it('leaves aircraft, runway and cloud materials outside the geographic map shader', async () => {
    await mountFlight(); const { scene, terrain, detail } = terrainScene(), attached = new Set();
    scene.traverse(object => { for (const material of [object.material].flat().filter(Boolean)) {
      if (material.userData.flightTerrainTextureMask) attached.add(material);
    } });
    expect(attached).toEqual(new Set([terrain.material, detail.material]));
    expect(Three.ShaderChunk.map_fragment).toBe(mapChunk);
  });
  it('disposes the masked materials and their separate maps with the shared terrain geometry on unmount', async () => {
    await mountFlight(); const { terrain, detail } = terrainScene();
    const resources = [terrain.geometry, terrain.material, detail.material, terrain.material.map, detail.material.map];
    expect(new Set(resources).size).toBe(resources.length);
    const spies = resources.map(resource => vi.spyOn(resource, 'dispose'));
    await React.act(async () => reactRoot.unmount()); reactRoot = null;
    for (const spy of spies) expect(spy).toHaveBeenCalled();
    expect(renderer.dispose).toHaveBeenCalled(); expect(errors).not.toHaveBeenCalled();
  });

});
