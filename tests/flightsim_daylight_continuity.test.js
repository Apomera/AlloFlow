import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const Three = vendor.THREE;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, reactRoot, frameCallback, wallTime, errors, commands, renderer;

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

const boundaries = [4, 5, 6, 7, 17, 18, 19, 20];
const solarHourAt = hooks => ((hooks.flightRef.current.lon / 15 + 12 + hooks.timeRef.current * 0.01) % 24 + 24) % 24;
function setSolarHour(hooks, hour) {
  // Set the production solar clock; do not replace getDayNight or rendering decisions.
  hooks.timeRef.current = ((hour - 12 - hooks.flightRef.current.lon / 15 + 48) % 24) * 100;
}
const rgb = color => [color.r, color.g, color.b];
const weightedKey = frame => frame.keyColor.map(value => value * frame.keyIntensity);
const distance = (a, b) => Math.max(...a.map((value, index) => Math.abs(value - b[index])));

describe('SkySchool continuous daylight exposure', () => {
  it.each(boundaries)('has no exposure step at solar hour %s', hour => {
    const before = api.getFlightLightingFrame(hour - 0.0001);
    const after = api.getFlightLightingFrame(hour + 0.0001);
    for (const key of ['brightness', 'daylight', 'ambientIntensity', 'keyIntensity', 'nightFactor', 'duskFactor']) {
      expect(Math.abs(after[key] - before[key])).toBeLessThan(0.001);
    }
    expect(distance(before.ambientColor, after.ambientColor)).toBeLessThan(0.001);
    // The sun/moon color and direction swap at the horizon must carry zero light.
    expect(distance(weightedKey(before), weightedKey(after))).toBeLessThan(0.001);
  });
  it.each([undefined, null, NaN, Infinity, -Infinity])('defaults nonfinite hour %s to a finite noon frame', input => {
    expect(api.getFlightLightingFrame(input)).toEqual(api.getFlightLightingFrame(12));
  });
  it.each([[-1, 23], [25, 1], [48, 0], [-48, 0]])('wraps hour %s to %s', (input, normalized) => {
    expect(api.getFlightLightingFrame(input)).toEqual(api.getFlightLightingFrame(normalized));
  });
  it('keeps all visual factors, intensities, and RGB channels finite and bounded across the clock', () => {
    for (let hour = 0; hour <= 24; hour += 0.25) {
      const frame = api.getFlightLightingFrame(hour);
      expect(frame.solarHour).toBeGreaterThanOrEqual(0); expect(frame.solarHour).toBeLessThan(24);
      expect(frame.sunElevationRad).toBeCloseTo(api.getFlightSolarFrame(hour).sun.elevationRad, 12);
      for (const key of ['daylight', 'brightness', 'warmth', 'nightFactor', 'duskFactor']) {
        expect(Number.isFinite(frame[key])).toBe(true); expect(frame[key]).toBeGreaterThanOrEqual(0); expect(frame[key]).toBeLessThanOrEqual(1);
      }
      expect(frame.brightness).toBeGreaterThanOrEqual(0.05);
      expect(frame.ambientIntensity).toBeGreaterThanOrEqual(0.15); expect(frame.ambientIntensity).toBeLessThanOrEqual(0.55);
      expect(frame.keyIntensity).toBeGreaterThanOrEqual(0); expect(frame.keyIntensity).toBeLessThanOrEqual(0.8);
      for (const channel of [...frame.ambientColor, ...frame.keyColor]) {
        expect(Number.isFinite(channel)).toBe(true); expect(channel).toBeGreaterThanOrEqual(0); expect(channel).toBeLessThanOrEqual(1);
      }
      expect(frame.daylight + frame.nightFactor).toBeCloseTo(1, 12);
      expect(frame.duskFactor).toBeLessThanOrEqual(frame.daylight);
    }
  });
  it('retains noon exposure, a navigable night floor, and zero directional energy at the horizon', () => {
    const noon = api.getFlightLightingFrame(12), night = api.getFlightLightingFrame(0);
    expect(noon.brightness).toBeCloseTo(1, 12); expect(noon.ambientIntensity).toBeCloseTo(0.55, 12); expect(noon.keyIntensity).toBeCloseTo(0.8, 12);
    expect(noon.nightFactor).toBe(0); expect(noon.duskFactor).toBe(0); expect(noon.ambientColor).toEqual([1, 1, 1]);
    expect(night.brightness).toBeCloseTo(0.05, 12); expect(night.keyIntensity).toBeCloseTo(0.05, 12);
    expect(night.nightFactor).toBe(1); expect(night.duskFactor).toBe(0);
    for (const hour of [6, 18]) expect(api.getFlightLightingFrame(hour).keyIntensity).toBeLessThan(1e-12);
  });
  it('brightens monotonically into the morning and treats dusk symmetrically', () => {
    const morning = [4, 5, 5.5, 6, 6.5, 7, 9, 12].map(hour => api.getFlightLightingFrame(hour));
    for (let index = 1; index < morning.length; index++) expect(morning[index].brightness).toBeGreaterThanOrEqual(morning[index - 1].brightness);
    expect(morning[5].ambientIntensity).toBeGreaterThan(0.3);
    for (const hour of [4, 5, 5.5, 6, 6.5, 7, 8]) {
      const a = api.getFlightLightingFrame(hour), b = api.getFlightLightingFrame(24 - hour);
      for (const key of ['brightness', 'ambientIntensity', 'keyIntensity', 'nightFactor', 'duskFactor']) expect(a[key]).toBeCloseTo(b[key], 10);
    }
  });
});

async function mountFlight(webgl = false, width = 1280, height = 720) {
  commands = []; wallTime = 1000; frameCallback = null;
  let path = [];
  const context = new Proxy({
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ kind: 'linear', stops: [], addColorStop(offset, color) { this.stops.push([offset, color]); } }),
    createRadialGradient: () => ({ kind: 'radial', stops: [], addColorStop(offset, color) { this.stops.push([offset, color]); } }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    beginPath() { path = []; },
    arc(...args) { path.push({ method: 'arc', args }); },
    ellipse(...args) { path.push({ method: 'ellipse', args }); },
    fill() { commands.push({ method: 'fill', path: [...path], fill: context.fillStyle }); },
  }, {
    get: (target, property) => property in target ? target[property] : (...args) => commands.push({ method: property, args, fill: context.fillStyle, alpha: context.globalAlpha ?? 1 }),
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
  if (webgl) window.THREE = { ...Three, WebGLRenderer: function() { return renderer; } };
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
    Object.defineProperty(canvas, 'clientWidth', { value: width, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: height, configurable: true });
  }
  const hooks = window.__testHooks.flightSim;
  Object.assign(hooks.getWeatherRef().current, { wind: 0, turbulence: 0, visibility: 1, type: 'clear' });
  // Hold the pose while production camera, lighting, world passes, and HUD run.
  // Physics behavior is covered separately; this checks actual painting decisions.
  vi.spyOn(api.Physics, 'step').mockImplementation(state => ({ ...state,
    forces: { lift: api.Physics.WEIGHT, weight: api.Physics.WEIGHT, drag: 0, thrust: 0 } }));
  return hooks;
}
async function draw() {
  commands.length = 0; wallTime += 16;
  expect(frameCallback).toBeTypeOf('function');
  await React.act(async () => frameCallback());
  expect(errors).not.toHaveBeenCalled();
}

function renderedLighting() {
  expect(renderer.render).toHaveBeenCalled();
  const [scene] = renderer.render.mock.calls.at(-1);
  const ambient = scene.children.find(item => item.isAmbientLight);
  const key = scene.children.find(item => item.isDirectionalLight);
  const sky = scene.children.find(item => item.isMesh && item.geometry?.type === 'SphereGeometry' && item.material?.side === Three.BackSide);
  expect(ambient).toBeTruthy(); expect(key).toBeTruthy(); expect(sky).toBeTruthy();
  return { ambientIntensity: ambient.intensity, ambientColor: rgb(ambient.color),
    keyIntensity: key.intensity, keyEnergy: rgb(key.color).map(channel => channel * key.intensity), sky: rgb(sky.material.color),
    zenith: rgb(sky.material.userData.flightSkyGradient.uniforms.zenith.value), fog: rgb(scene.fog.color), skyVersion: sky.material.version };
}
const nightPaint = () => commands.find(command => command.method === 'fillRect'
  && typeof command.fill === 'string' && command.fill.startsWith('rgba(5,5,25,'));
const rgbaAlpha = value => Number(value.slice(value.lastIndexOf(',') + 1, -1));
const duskPaint = () => commands.find(command => command.method === 'fillRect' && command.fill?.kind === 'linear'
  && command.fill.stops.some(([, color]) => color.startsWith('rgba(255,100,50,')));

describe('SkySchool production daylight rendering', () => {
  it.each(boundaries)('uses continuous WebGL exposure around former hour-%s band', async hour => {
    const hooks = await mountFlight(true);
    Object.assign(hooks.flightRef.current, { altitude: 76, onGround: true, speed: 0 });
    Object.assign(hooks.controlsRef.current, { throttle: 0, pitch: 0, bank: 0 });
    const samples = [];
    for (const requestedHour of [hour - 0.001, hour + 0.001]) {
      setSolarHour(hooks, requestedHour); await draw();
      const observed = renderedLighting(), frame = api.getFlightLightingFrame(solarHourAt(hooks));
      expect(observed.ambientIntensity).toBeCloseTo(frame.ambientIntensity, 10);
      expect(observed.keyIntensity).toBeCloseTo(frame.keyIntensity, 10);
      expect(distance(observed.ambientColor, frame.ambientColor)).toBeLessThan(1e-10);
      expect(distance(observed.keyEnergy, weightedKey(frame))).toBeLessThan(1e-10);
      expect(observed.fog).toEqual(observed.sky);
      expect(observed.zenith).not.toEqual(observed.sky);
      expect(nightPaint()).toBeUndefined(); // WebGL world exposure cannot darken Canvas cockpit instruments.
      samples.push(observed);
    }
    expect(Math.abs(samples[1].ambientIntensity - samples[0].ambientIntensity)).toBeLessThan(0.01);
    expect(Math.abs(samples[1].keyIntensity - samples[0].keyIntensity)).toBeLessThan(0.01);
    expect(distance(samples[0].ambientColor, samples[1].ambientColor)).toBeLessThan(0.01);
    expect(distance(samples[0].keyEnergy, samples[1].keyEnergy)).toBeLessThan(0.01);
    expect(distance(samples[0].sky, samples[1].sky)).toBeLessThan(0.01);
    expect(distance(samples[0].zenith, samples[1].zenith)).toBeLessThan(0.01);
    expect(samples[0].skyVersion).toBe(samples[1].skyVersion);
  });
  it.each(boundaries)('fades Canvas world dimming around hour %s before painting the cockpit', async hour => {
    const hooks = await mountFlight(false);
    Object.assign(hooks.flightRef.current, { altitude: 76, onGround: true, speed: 0 });
    Object.assign(hooks.controlsRef.current, { throttle: 0, pitch: 0, bank: 0 });
    const samples = [];
    for (const requestedHour of [hour - 0.001, hour + 0.001]) {
      setSolarHour(hooks, requestedHour); await draw();
      const frame = api.getFlightLightingFrame(solarHourAt(hooks));
      const night = nightPaint(), dusk = duskPaint();
      const nightAlpha = night ? rgbaAlpha(night.fill) : 0;
      const duskAlpha = dusk ? rgbaAlpha(dusk.fill.stops[0][1]) : 0;
      expect(nightAlpha).toBeCloseTo((0.7 - 76 / 40000 * 0.2) * frame.nightFactor, 10);
      expect(duskAlpha).toBeCloseTo(0.3 * frame.duskFactor, 10);
      const instrument = commands.findIndex(command => command.method === 'fillText' && command.args[0] === 'IAS');
      expect(instrument).toBeGreaterThan(0);
      for (const worldPaint of [night, dusk].filter(Boolean)) expect(commands.indexOf(worldPaint)).toBeLessThan(instrument);
      samples.push([nightAlpha, duskAlpha]);
    }
    expect(distance(samples[0], samples[1])).toBeLessThan(0.01);
  });
  it('hides Canvas stars once the sun crosses the horizon while retaining twilight stars', async () => {
    const hooks = await mountFlight(false);
    Object.assign(hooks.flightRef.current, { altitude: 76, onGround: true, speed: 0 });
    Object.assign(hooks.controlsRef.current, { throttle: 0, pitch: 0, bank: 0 });
    const stars = () => commands.filter(command => command.method === 'fillRect' && command.fill === 'rgba(255,255,255,0.8)'
      && [1, 2].includes(command.args[2]) && command.args[2] === command.args[3]);
    setSolarHour(hooks, 5.8); await draw();
    // The catalog is projected into this view: a viewport contains only part
    // of the shared 600-star sky, rather than a fixed screen-space census.
    expect(stars().length).toBeGreaterThan(0); expect(stars().length).toBeLessThan(600);
    expect(stars().every(command => command.alpha > 0 && command.alpha <= 1)).toBe(true);
    expect(stars().every(command => command.args[1] < 720 / 2)).toBe(true);
    const twilightAlpha = rgbaAlpha(nightPaint().fill);
    setSolarHour(hooks, 6.1); await draw();
    expect(stars()).toHaveLength(0);
    expect(rgbaAlpha(nightPaint().fill)).toBeLessThan(twilightAlpha);
  });
});


describe('SkySchool Canvas daylight consistency', () => {
  it.each([{ hour: 7, visible: false }, { hour: 12, visible: false }, { hour: 22, visible: true }])(
    'keeps high-altitude star visibility $visible at solar hour $hour', async ({ hour, visible }) => {
      const hooks = await mountFlight(false);
      Object.assign(hooks.flightRef.current, { altitude: 40000, fieldElev: 76, onGround: false, speed: 0, heading: 90 });
      Object.assign(hooks.controlsRef.current, { throttle: 0, pitch: 0, bank: 0 });
      setSolarHour(hooks, hour); await draw();
      const stars = commands.filter(command => command.method === 'fillRect'
        && [1, 2].includes(command.args[2]) && command.args[2] === command.args[3]
        && command.fill === 'rgba(255,255,255,0.8)');
      if (visible) {
        expect(stars.length).toBeGreaterThan(0); expect(stars.length).toBeLessThan(600);
        expect(stars.every(command => command.alpha > 0 && command.alpha <= 1)).toBe(true);
        expect(new Set(stars.map(command => command.args.slice(0, 2).join(','))).size).toBe(stars.length);
      } else expect(stars).toHaveLength(0);
    });
  it.each([{ hour: 6.75, icon: '🌅' }, { hour: 12, icon: '☀️' }, { hour: 22, icon: '🌙' }])(
    'matches the wide status icon to visible lighting at hour $hour', async ({ hour, icon }) => {
      const hooks = await mountFlight(false, 1280, 720);
      Object.assign(hooks.flightRef.current, { altitude: 76, onGround: true, speed: 0 });
      Object.assign(hooks.controlsRef.current, { throttle: 0, pitch: 0, bank: 0 });
      setSolarHour(hooks, hour); await draw();
      const status = commands.find(command => command.method === 'fillText'
        && typeof command.args[0] === 'string' && command.args[0].startsWith('HDG ')
        && command.args[1] === 10 && command.args[2] === 21);
      expect(status).toBeTruthy();
      expect(status.args[0]).toContain(icon);
      if (hour === 6.75) expect(status.args[0]).not.toContain('🌙');
    });
});
