import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const Three = vendor.THREE;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, reactRoot, setData, frameCallback, wallTime, errors, renderer, physicsSnapshot;

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

const rgb = color => [color.r, color.g, color.b];
const delta = (a, b) => Math.max(...a.map((value, index) => Math.abs(value - b[index])));
const solarHourAt = hooks => ((hooks.flightRef.current.lon / 15 + 12 + hooks.timeRef.current * 0.01) % 24 + 24) % 24;
function setSolarHour(hooks, hour) {
  hooks.timeRef.current = ((hour - 12 - hooks.flightRef.current.lon / 15 + 48) % 24) * 100;
}

async function mountFlight({ aircraft = 'cessna172', postFX = true, width = 1280, height = 720 } = {}) {
  wallTime = 1000; frameCallback = null;
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
  vi.stubGlobal('AlloPostFXEnabled', postFX);
  vi.stubGlobal('requestAnimationFrame', callback => { if (callback.name === 'loop') frameCallback = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  renderer = { domElement: {}, shadowMap: {}, capabilities: { getMaxAnisotropy: () => 1 },
    setSize() {}, setPixelRatio() {}, dispose() {}, getContext: () => ({ isContextLost: () => false }),
    render: vi.fn((scene, camera) => { scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); }) };
  class RenderPass { constructor(scene, camera) { this.scene = scene; this.camera = camera; } dispose() {} }
  class UnrealBloomPass {
    constructor(size, strength, radius, threshold) { Object.assign(this, { size, strength, radius, threshold }); }
    dispose() {}
  }
  class EffectComposer {
    constructor(target) { this.renderer = target; this.passes = []; }
    addPass(pass) { this.passes.push(pass); }
    setPixelRatio() {} setSize() {} dispose() {}
    render() { const pass = this.passes.find(value => value.scene); this.renderer.render(pass.scene, pass.camera); }
  }
  window.THREE = { ...Three, WebGLRenderer: function() { return renderer; }, RenderPass, UnrealBloomPass, EffectComposer };
  host = document.createElement('div'); document.body.appendChild(host); reactRoot = ReactDOMClient.createRoot(host);
  function App() {
    const [data, updateData] = React.useState({ flightSim: { view: 'menu', aircraft,
      thirdPerson: true, railCollapsed: true, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(item => [item.id, true])) } });
    setData = updateData;
    return tool.render(makeCtx({ toolData: data, setToolData: updateData,
      update: (id, key, value) => updateData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, value) => updateData(old => ({ ...old, [id]: { ...old[id], ...value } })) }));
  }
  await React.act(async () => reactRoot.render(React.createElement(App)));
  await React.act(async () => host.querySelector('button[aria-label="Free Flight from Portland, ME"]').click());
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { value: width, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: height, configurable: true });
  }
  const hooks = window.__testHooks.flightSim;
  Object.assign(hooks.flightRef.current, { lat: 43.646, lon: -70.309, altitude: 5000, fieldElev: 76,
    speed: 150, vsi: 0, heading: 90, onGround: false });
  Object.assign(hooks.controlsRef.current, { throttle: 0.5, pitch: 0, bank: 0, yawRate: 0 });
  Object.assign(hooks.getWeatherRef().current, { wind: 0, turbulence: 0, visibility: 1, type: 'clear' });
  // Hold a repeatable pose while production RAF runs the actual model, lighting,
  // paint adjustment, composer and HUD. No renderer helper is replaced.
  vi.spyOn(api.Physics, 'step').mockImplementation(state => ({ ...state,
    forces: { lift: api.Physics.WEIGHT, weight: api.Physics.WEIGHT, drag: 0, thrust: 0 } }));
  return hooks;
}
async function draw() {
  wallTime += 16; expect(frameCallback).toBeTypeOf('function');
  await React.act(async () => frameCallback()); expect(errors).not.toHaveBeenCalled();
  expect(renderer.render).toHaveBeenCalled();
}
function rendered() {
  const [scene] = renderer.render.mock.calls.at(-1);
  const aircraft = scene.children.find(item => item.isGroup && Array.isArray(item.userData.props) && typeof item.userData.type === 'string');
  const ambient = scene.children.find(item => item.isAmbientLight), key = scene.children.find(item => item.isDirectionalLight);
  expect(aircraft).toBeTruthy(); expect(ambient).toBeTruthy(); expect(key).toBeTruthy();
  return { scene, aircraft, ambient, key };
}
function materialsOf(group, predicate) {
  const set = new Set();
  group.traverse(object => { for (const material of [object.material].flat().filter(Boolean)) if (predicate(material)) set.add(material); });
  return [...set];
}
function paintsOf(group) { return materialsOf(group, material => material.isMeshLambertMaterial); }
function basicsOf(group) { return materialsOf(group, material => material.isMeshBasicMaterial); }

// Audited against bundled r128 ShaderChunk, not a new SkySchool helper:
// lights_lambert_vertex adds PI*keyColor*clamp(N dot L,0,1), ambient irradiation
// adds PI*ambientColor in the default non-physical mode, and meshlambert_frag
// applies BRDF_Diffuse_Lambert = paintColor/PI to both. No paint envmap/emission
// or additional light sources exist here. The factors cancel, yielding this
// worst-case channel bound at a face normal directly toward the key source.
function maximumDiffuse(material, ambient, key) {
  return rgb(material.color).map((paint, index) => paint
    * (rgb(ambient.color)[index] * ambient.intensity + rgb(key.color)[index] * key.intensity));
}
function bloomThreshold() {
  const bloom = renderer._alloComposer?.passes.find(pass => typeof pass.threshold === 'number');
  expect(bloom).toBeTruthy(); return bloom.threshold;
}

describe('aircraft diffuse highlight headroom in production rendering', () => {
  it.each(['cessna172', 'boeing737', 'glider', 'f16', 'sr71', 'rescue_heli', 'drone'])(
    'keeps %s diffuse paint below clipping and daylight bloom', async id => {
      const hooks = await mountFlight({ aircraft: id }); setSolarHour(hooks, 12); await draw();
      const { scene, aircraft, ambient, key } = rendered(); expect(aircraft.userData.type).toBe(id);
      const paints = paintsOf(aircraft); expect(paints.length).toBeGreaterThan(0);
      expect(scene.children.filter(item => item.isLight)).toHaveLength(2);
      for (const material of paints) {
        expect(material.emissive.getHex()).toBe(0); expect(material.envMap).toBeNull();
        for (const channel of maximumDiffuse(material, ambient, key)) {
          expect(Number.isFinite(channel)).toBe(true); expect(channel).toBeGreaterThanOrEqual(0);
          expect(channel).toBeLessThanOrEqual(0.82 + 1e-10); expect(channel).toBeLessThan(bloomThreshold());
        }
      }
    });
  it('records every unique painted material, including cloned prop paint, with an independent base color', async () => {
    const hooks = await mountFlight(); setSolarHour(hooks, 0); await draw(); const { aircraft } = rendered();
    const paints = paintsOf(aircraft), cache = aircraft.userData.paintMaterials;
    expect(cache).toHaveLength(paints.length); expect(new Set(cache.map(entry => entry.material)).size).toBe(cache.length);
    expect(new Set(cache.map(entry => entry.material))).toEqual(new Set(paints));
    for (const entry of cache) {
      expect(entry.material.isMeshLambertMaterial).toBe(true); expect(entry.baseColor.isColor).toBe(true);
      expect(entry.baseColor).not.toBe(entry.material.color); expect(rgb(entry.material.color)).toEqual(rgb(entry.baseColor));
    }
    const propPaints = aircraft.userData.props.flatMap(prop => materialsOf(prop.obj, material => material.isMeshLambertMaterial));
    expect(propPaints.length).toBeGreaterThan(0);
    for (const material of propPaints) expect(cache.some(entry => entry.material === material)).toBe(true);
    expect(cache.every(entry => !entry.material.isMeshBasicMaterial)).toBe(true);
  });
  it('returns to the same daylight color after many frames and restores base paint at night without cumulative dimming', async () => {
    const hooks = await mountFlight(); setSolarHour(hooks, 12); await draw(); const { aircraft } = rendered();
    const cache = aircraft.userData.paintMaterials, originalBases = cache.map(entry => rgb(entry.baseColor));
    const noonColors = cache.map(entry => rgb(entry.material.color));
    for (let index = 0; index < 20; index++) { setSolarHour(hooks, 12); await draw(); }
    for (const [index, entry] of cache.entries()) expect(delta(rgb(entry.material.color), noonColors[index])).toBeLessThan(1e-10);
    setSolarHour(hooks, 0); await draw();
    for (const [index, entry] of cache.entries()) expect(delta(rgb(entry.material.color), originalBases[index])).toBeLessThan(1e-10);
    setSolarHour(hooks, 12); await draw();
    expect(rendered().aircraft).toBe(aircraft);
    for (const [index, entry] of cache.entries()) {
      expect(delta(rgb(entry.material.color), noonColors[index])).toBeLessThan(1e-10);
      expect(rgb(entry.baseColor)).toEqual(originalBases[index]);
    }
  });
  it.each(['cessna172', 'f16', 'drone'])('preserves %s Basic glass, nav lights, flame and rotor-disc colors', async id => {
    const hooks = await mountFlight({ aircraft: id }); setSolarHour(hooks, 0); await draw();
    const { aircraft } = rendered(), basics = basicsOf(aircraft); expect(basics.length).toBeGreaterThan(0);
    const initial = basics.map(material => rgb(material.color));
    expect(aircraft.userData.navLights.length).toBeGreaterThan(0);
    for (const hour of [6, 6.5, 12, 17.5, 18, 22]) {
      setSolarHour(hooks, hour); await draw();
      for (const [index, material] of basics.entries()) expect(rgb(material.color)).toEqual(initial[index]);
    }
  });
  it('leaves the terrain material color outside the aircraft paint adjustment', async () => {
    const hooks = await mountFlight(); setSolarHour(hooks, 0); await draw(); const { scene, aircraft } = rendered();
    const terrain = scene.children.find(item => item.isMesh && item.geometry?.type === 'PlaneGeometry' && item.material?.vertexColors);
    expect(terrain).toBeTruthy(); const terrainColor = rgb(terrain.material.color);
    expect(aircraft.userData.paintMaterials.some(entry => entry.material === terrain.material)).toBe(false);
    setSolarHour(hooks, 12); await draw(); expect(rgb(terrain.material.color)).toEqual(terrainColor);
  });
  it('builds fresh undimmed bases when changing airframes in daylight and switching back', async () => {
    const hooks = await mountFlight(); setSolarHour(hooks, 12); await draw();
    const initial = rendered().aircraft.userData.paintMaterials.map(entry => ({ base: rgb(entry.baseColor), paint: rgb(entry.material.color) }));
    await React.act(async () => setData(old => ({ ...old, flightSim: { ...old.flightSim, aircraft: 'boeing737' } })));
    setSolarHour(hooks, 12); await draw(); expect(rendered().aircraft.userData.type).toBe('boeing737');
    await React.act(async () => setData(old => ({ ...old, flightSim: { ...old.flightSim, aircraft: 'cessna172' } })));
    setSolarHour(hooks, 12); await draw();
    const cache = rendered().aircraft.userData.paintMaterials; expect(cache).toHaveLength(initial.length);
    for (const [index, entry] of cache.entries()) {
      expect(rgb(entry.baseColor)).toEqual(initial[index].base); expect(delta(rgb(entry.material.color), initial[index].paint)).toBeLessThan(1e-10);
    }
  });
  it('retains safe aircraft highlights when postprocessing is disabled', async () => {
    const hooks = await mountFlight({ postFX: false }); setSolarHour(hooks, 12); await draw();
    const { aircraft, ambient, key } = rendered(); expect(renderer._alloComposer).toBeNull();
    for (const material of paintsOf(aircraft)) expect(Math.max(...maximumDiffuse(material, ambient, key))).toBeLessThanOrEqual(0.82 + 1e-10);
  });
});

describe('continuous bloom threshold and paint response', () => {
  it('keeps the documented night/day bloom endpoints and monotonic twilight transition', async () => {
    const hooks = await mountFlight(); const thresholds = [];
    for (const hour of [0, 5.5, 5.8, 6, 6.2, 6.5, 12]) {
      setSolarHour(hooks, hour); await draw(); thresholds.push(bloomThreshold());
    }
    expect(thresholds[0]).toBeCloseTo(0.55, 8); expect(thresholds.at(-1)).toBeCloseTo(0.86, 8);
    for (let index = 1; index < thresholds.length; index++) expect(thresholds[index]).toBeGreaterThanOrEqual(thresholds[index - 1]);
    expect(thresholds[3]).toBeGreaterThan(0.55); expect(thresholds[3]).toBeLessThan(0.86);
  });
  it('has no paint or bloom jumps across the former categorical dusk/night bands', async () => {
    const hooks = await mountFlight();
    for (const hour of [4, 5, 6, 7, 17, 18, 19, 20]) {
      const samples = [];
      for (const requested of [hour - 0.0001, hour + 0.0001]) {
        setSolarHour(hooks, requested); await draw(); const { aircraft } = rendered();
        samples.push({ threshold: bloomThreshold(), colors: paintsOf(aircraft).map(material => rgb(material.color)) });
      }
      expect(Math.abs(samples[1].threshold - samples[0].threshold)).toBeLessThan(0.001);
      for (let index = 0; index < samples[0].colors.length; index++) expect(delta(samples[0].colors[index], samples[1].colors[index])).toBeLessThan(0.001);
    }
  });
  it('stays below the actual composer threshold throughout dawn, daylight and dusk', async () => {
    const hooks = await mountFlight();
    for (const hour of [0, 5.5, 5.8, 6, 6.2, 6.5, 7, 9, 12, 15, 17, 17.5, 17.8, 18, 18.2, 18.5, 22]) {
      setSolarHour(hooks, hour); await draw(); const { aircraft, ambient, key } = rendered();
      expect(Number.isFinite(solarHourAt(hooks))).toBe(true);
      for (const material of paintsOf(aircraft)) expect(Math.max(...maximumDiffuse(material, ambient, key))).toBeLessThan(bloomThreshold());
    }
  });
  it.each([[320, 763], [1280, 720]])('repaints safe material exposure while paused and resized to %s by %s', async (width, height) => {
    const hooks = await mountFlight(); setSolarHour(hooks, 12); await draw(); hooks.pausedRef.current = true;
    const before = rendered().aircraft.userData.paintMaterials.map(entry => rgb(entry.material.color)); const pausedTime = hooks.timeRef.current;
    for (const canvas of host.querySelectorAll('canvas')) {
      Object.defineProperty(canvas, 'clientWidth', { value: width, configurable: true });
      Object.defineProperty(canvas, 'clientHeight', { value: height, configurable: true });
    }
    await draw(); expect(hooks.timeRef.current).toBe(pausedTime);
    const { aircraft, ambient, key } = rendered();
    for (const [index, entry] of aircraft.userData.paintMaterials.entries()) {
      expect(delta(rgb(entry.material.color), before[index])).toBeLessThan(1e-10);
      expect(Math.max(...maximumDiffuse(entry.material, ambient, key))).toBeLessThan(bloomThreshold());
    }
  });
});
