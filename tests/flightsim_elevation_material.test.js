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

describe('real-elevation biome texture coverage', () => {
  it('keeps the binary land mask and adds field coverage only to the farmland shader', () => {
    const base = new Three.MeshLambertMaterial(), fine = new Three.MeshBasicMaterial();
    api.attachFlightTerrainTextureMask(base, Three, true);
    api.attachFlightTerrainTextureMask(fine, Three);
    const baseShader = assertTerrainMask(base, 'lambert');
    const fineShader = assertTerrainMask(fine, 'basic');
    expect(baseShader.vertex).toMatch(/attribute\s+float\s+fieldCoverage\s*;/);
    expect(baseShader.vertex).toMatch(/vFlightLandCoverage\s*\*=\s*fieldCoverage\s*;/);
    expect(fineShader.vertex).not.toContain('fieldCoverage');
    expect(base.customProgramCacheKey()).not.toBe(fine.customProgramCacheKey());
    expect(base.userData.flightTerrainFieldCoverage).toBe(true);
    expect(fine.userData.flightTerrainFieldCoverage).toBe(false);
    const callback = base.onBeforeCompile;
    api.attachFlightTerrainTextureMask(base, Three, true);
    expect(base.onBeforeCompile).toBe(callback);
    expect(Three.ShaderChunk.map_fragment).toBe(mapChunk);
    base.dispose(); fine.dispose();
  });

  it('removes farmland from alpine Himalayan slopes while retaining the appropriate lower-valley cover', async () => {
    const origin = { lat: 27.9881, lon: 86.925 };
    await mountFlight({ position: { ...origin, altitude: 32000, fieldElev: 26000 } });
    const { terrain, detail } = terrainScene();
    const land = assertCoverage(terrain, detail), field = terrain.geometry.getAttribute('fieldCoverage');
    expect(field).toBeTruthy(); expect(field.itemSize).toBe(1); expect(field.count).toBe(land.count);
    expect([...land.array].filter(value => value === 1).length).toBeGreaterThan(3000);
    // This40nm scene includes real valleys below the alpine snow line: the
    // native NOAA nodes in its southern edge fall to about2,300m. Classify
    // each rendered vertex instead of assuming the entire scene is alpine.
    const position = terrain.geometry.getAttribute('position'), point = new Three.Vector3();
    let alpine = 0, lowerValley = 0;
    for (let index = 0; index < position.count; index++) {
      point.fromBufferAttribute(position, index).applyMatrix4(terrain.matrixWorld);
      const lat = origin.lat - point.z / 364800;
      const lon = origin.lon + point.x / (364800 * Math.cos(origin.lat * Math.PI / 180));
      const wet = land.getX(index) === 0;
      const environment = api.getWorldEnvironment(lat, lon, point.y, wet);
      if (wet || environment.id === 'alpine' || environment.id === 'polar') {
        expect(field.getX(index)).toBe(0);
        if (!wet && environment.id === 'alpine') alpine++;
      } else {
        const expected = Math.max(0, Math.min(1, environment.fieldDensity / .55));
        expect(field.getX(index)).toBeCloseTo(expected, 6);
        if (expected > 0) lowerValley++;
      }
    }
    expect(alpine).toBeGreaterThan(2000);
    expect(lowerValley).toBeGreaterThan(0);
    expect(terrain.material.userData.flightTerrainFieldCoverage).toBe(true);
    expect(detail.material.userData.flightTerrainFieldCoverage).toBe(false);
    expect(detail.geometry).toBe(terrain.geometry);
    expect(detail.material.map).toBeTruthy(); expect(detail.material.fog).toBe(false);
    assertTerrainMask(terrain.material, 'lambert'); assertTerrainMask(detail.material, 'basic');
  });

  it('matches actual lowland biome field density at each rendered vertex without changing water coverage', async () => {
    const origin = { lat: 43.646, lon: -70.309 };
    await mountFlight(); const { terrain, detail } = terrainScene();
    const land = assertCoverage(terrain, detail), field = terrain.geometry.getAttribute('fieldCoverage');
    const position = terrain.geometry.getAttribute('position'), point = new Three.Vector3();
    let farmland = 0, water = 0, partial = 0;
    for (let index = 0; index < position.count; index++) {
      point.fromBufferAttribute(position, index).applyMatrix4(terrain.matrixWorld);
      const lat = origin.lat - point.z / 364800;
      const lon = origin.lon + point.x / (364800 * Math.cos(origin.lat * Math.PI / 180));
      const wet = land.getX(index) === 0;
      const environment = api.getWorldEnvironment(lat, lon, point.y, wet);
      const expected = wet ? 0 : Math.max(0, Math.min(1, environment.fieldDensity / .55));
      expect(field.getX(index)).toBeCloseTo(expected, 6);
      if (wet) { water++; expect(field.getX(index)).toBe(0); }
      else if (field.getX(index) > 0) farmland++;
      if (field.getX(index) > 0 && field.getX(index) < 1) partial++;
    }
    expect(farmland).toBeGreaterThan(200); expect(water).toBeGreaterThan(200); expect(partial).toBeGreaterThan(200);
  });

  it('updates the existing field buffer when scenery moves from lowlands to polar terrain', async () => {
    const hooks = await mountFlight(); const before = terrainScene();
    const field = before.terrain.geometry.getAttribute('fieldCoverage'), version = field.version;
    expect([...field.array].some(value => value > 0)).toBe(true);
    Object.assign(hooks.flightRef.current, { lat: 80, lon: -40, altitude: 16000, fieldElev: 7000 });
    await frame(); const after = terrainScene();
    expect(after.terrain).toBe(before.terrain); expect(after.detail).toBe(before.detail);
    expect(after.terrain.geometry.getAttribute('fieldCoverage')).toBe(field);
    expect(field.version).toBeGreaterThan(version);
    expect([...field.array].every(value => value === 0)).toBe(true);
    const land = assertCoverage(after.terrain, after.detail);
    expect([...land.array].some(value => value === 1)).toBe(true);
  });
});
