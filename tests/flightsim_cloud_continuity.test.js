import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const Three = vendor.THREE;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, reactRoot, frameCallback, wallTime, errors, commands, renderer, textureCommands;

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
const colorDistance = (a, b) => Math.max(...a.map((value, index) => Math.abs(value - b[index])));
const parseRGBA = text => /^rgba\(([^)]+)\)$/.exec(text)?.[1].split(',').map(Number);
const legacyDawn = 12 - Math.acos(0.2) * 12 / Math.PI;
const boundaries = [5, 6, legacyDawn, 24 - legacyDawn, 18, 19];

async function mountFlight(webgl = false, weather = 'clear') {
  commands = []; textureCommands = []; wallTime = 1000; frameCallback = null;
  const contexts = new WeakMap();
  function drawingContext(canvas) {
    let path = [];
    const composites = [];
    const context = new Proxy({
    globalCompositeOperation: 'source-over',
    save() { composites.push(context.globalCompositeOperation); },
    restore() { context.globalCompositeOperation = composites.pop() ?? 'source-over'; },
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: (...args) => ({ kind: 'linear', args, stops: [], addColorStop(offset, color) { this.stops.push([offset, color]); } }),
    createRadialGradient: (...args) => ({ kind: 'radial', args, stops: [], addColorStop(offset, color) { this.stops.push([offset, color]); } }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    beginPath() { path = []; },
    arc(...args) { path.push({ method: 'arc', args }); },
    ellipse(...args) { path.push({ method: 'ellipse', args }); },
    fill() { commands.push({ method: 'fill', path: [...path], fill: context.fillStyle, canvas, composite: context.globalCompositeOperation }); },
  }, {
    get: (target, property) => property in target ? target[property] : (...args) => commands.push({ method: property, args, fill: context.fillStyle, alpha: context.globalAlpha ?? 1, canvas, composite: context.globalCompositeOperation }),
    set: (target, property, value) => { target[property] = value; return true; },
  });
    return context;
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function() {
    if (!contexts.has(this)) contexts.set(this, drawingContext(this));
    return contexts.get(this);
  });
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
    Object.defineProperty(canvas, 'clientWidth', { value: 1280, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: 720, configurable: true });
  }
  const hooks = window.__testHooks.flightSim;
  Object.assign(hooks.getWeatherRef().current, { wind: 0, turbulence: 0, visibility: 1, type: weather });
  Object.assign(hooks.flightRef.current, { altitude: 76, fieldElev: 76, onGround: true, speed: 0 });
  Object.assign(hooks.controlsRef.current, { throttle: 0, pitch: 0, bank: 0 });
  // Hold the pose while actual production RAF, painting, and Three scene updates run.
  vi.spyOn(api.Physics, 'step').mockImplementation(state => ({ ...state,
    forces: { lift: api.Physics.WEIGHT, weight: api.Physics.WEIGHT, drag: 0, thrust: 0 } }));
  textureCommands = commands.slice();
  return hooks;
}
async function draw() {
  commands.length = 0; wallTime += 16;
  expect(frameCallback).toBeTypeOf('function');
  await React.act(async () => frameCallback());
  // Three initializes lazily during its first production RAF.
  textureCommands.push(...commands);
  expect(errors).not.toHaveBeenCalled();
}
// The loop advances the sim clock by one frame step before painting, which is far
// larger than the boundary offsets. Measure that step, start one step early, and
// confirm the painted frame is at the requested hour so samples straddle it.
async function drawAtSolarHour(hooks, hour) {
  await draw();
  setSolarHour(hooks, hour); const target = hooks.timeRef.current;
  await draw(); const step = hooks.timeRef.current - target;
  expect(step).toBeGreaterThan(0);
  hooks.timeRef.current = target - step; await draw();
  expect(Math.abs(hooks.timeRef.current - target)).toBeLessThan(1e-9);
}

function canvasCloudPaint() {
  // Each volume pass paints an underside, a body and two lobes in one tint, then a
  // white top highlight. Exposure scales every color, so find passes by that paint
  // sequence and read the real paint calls rather than extracting source formulas.
  const result = [];
  const ellipseFill = command => command?.method === 'fill' && typeof command.fill === 'string'
    && command.path.length === 1 && command.path[0].method === 'ellipse';
  for (let index = 0; index + 4 < commands.length; index++) {
    const pass = commands.slice(index, index + 5);
    if (!pass.every(ellipseFill)) continue;
    const [underside, top, lobeA, lobeB, highlight] = pass;
    if (lobeA.fill !== top.fill || lobeB.fill !== top.fill || underside.fill === top.fill
      || !highlight.fill.startsWith('rgba(255,255,255,')) continue;
    const [undersideRGBA, topRGBA, highlightRGBA] = [underside, top, highlight].map(command => parseRGBA(command.fill));
    expect(undersideRGBA).toHaveLength(4); expect(topRGBA).toHaveLength(4); expect(highlightRGBA).toHaveLength(4);
    result.push({ underside: undersideRGBA, top: topRGBA, highlight: highlightRGBA });
    index += 4;
  }
  expect(result).toHaveLength(11);
  return result;
}
function webglCloudGroup() {
  expect(renderer.render).toHaveBeenCalled();
  const [scene] = renderer.render.mock.calls.at(-1);
  const group = scene.children.find(item => item.isGroup && item.children.length === 24
    && item.children.every(child => child.isSprite && child.material.map?.image?.width === 128
      && child.material.map?.image?.height === 64));
  expect(group).toBeTruthy();
  return group;
}
function webglClouds() {
  const group = webglCloudGroup();
  const clouds = group.children.filter(child => child.visible);
  expect(clouds.length).toBeGreaterThan(0);
  return clouds.map(cloud => ({ color: [cloud.material.color.r, cloud.material.color.g, cloud.material.color.b], opacity: cloud.material.opacity }));
}

describe('SkySchool continuous cloud appearance', () => {
  it('keeps every generated WebGL cloud lobe inside a transparent texture border', async () => {
    await mountFlight(true); await draw();
    const image = webglCloudGroup().children[0].material.map.image;
    const lobes = textureCommands.filter(command => command.canvas === image
      && command.method === 'fillRect' && command.fill?.kind === 'radial');
    expect(lobes).toHaveLength(4);
    for (const lobe of lobes) {
      const [x, y, innerRadius, outerX, outerY, radius] = lobe.fill.args;
      expect(outerX).toBe(x); expect(outerY).toBe(y);
      expect(innerRadius).toBeGreaterThan(0); expect(radius).toBeGreaterThan(innerRadius);
      // A full transparent border is necessary even before texture filtering.
      expect(x - radius).toBeGreaterThanOrEqual(1); expect(y - radius).toBeGreaterThanOrEqual(1);
      expect(x + radius).toBeLessThanOrEqual(image.width - 1);
      expect(y + radius).toBeLessThanOrEqual(image.height - 1);
      // Retain the bright center and soft, fully transparent outer edge.
      expect(lobe.fill.stops).toEqual([[0, 'rgba(255,255,255,0.85)'], [1, 'rgba(255,255,255,0)']]);
      expect(lobe.composite).toBe('source-over');
    }
  });
  it('shades the generated cloud underside without adding alpha outside its lobes', async () => {
    await mountFlight(true); await draw();
    const image = webglCloudGroup().children[0].material.map.image;
    const volumePass = textureCommands.filter(command => command.canvas === image
      && command.method === 'fillRect' && command.fill?.kind === 'linear'
      && command.fill.stops.some(([, color]) => color === 'rgba(45,58,82,0.34)'));
    expect(volumePass).toHaveLength(1);
    // Canvas source-atop preserves destination alpha, unlike source-over's rectangle.
    expect(volumePass[0].composite).toBe('source-atop');
    expect(volumePass[0].args).toEqual([0, 18, 128, 46]);
    expect(volumePass[0].fill.stops).toEqual([[0, 'rgba(75,94,120,0)'], [0.62, 'rgba(75,94,120,0.12)'], [1, 'rgba(45,58,82,0.34)']]);
  });
  it.each(boundaries)('has no Canvas cloud step around solar hour %s', async hour => {
    const hooks = await mountFlight();
    const samples = [];
    for (const requested of [hour - 0.00001, hour + 0.00001]) {
      await drawAtSolarHour(hooks, requested); samples.push(canvasCloudPaint());
    }
    for (let index = 0; index < samples[0].length; index++) {
      const a = samples[0][index], b = samples[1][index];
      for (const pass of ['underside', 'top', 'highlight']) {
        expect(colorDistance(a[pass].slice(0, 3), b[pass].slice(0, 3))).toBeLessThan(0.1);
        expect(Math.abs(a[pass][3] - b[pass][3])).toBeLessThan(0.002);
      }
    }
  });
  // Clear clouds are white at noon; at midnight exposure dims them to a dark neutral
  // gray (the WebGL midnight limit) with no sunlit highlight, rather than a moonlit tint.
  it.each([{ hour: 12, tintMin: 255, tintMax: 255, undersideRatio: 0.25, alphaMin: 0.37, alphaMax: 0.47, sunlit: true },
    { hour: 0, tintMin: 1, tintMax: 0.4 * 255, undersideRatio: 0.34, alphaMin: 0.17, alphaMax: 0.27, sunlit: false }])(
    'retains readable Canvas cloud limits at hour $hour', async ({ hour, tintMin, tintMax, undersideRatio, alphaMin, alphaMax, sunlit }) => {
      const hooks = await mountFlight(); setSolarHour(hooks, hour); await draw();
      const clouds = canvasCloudPaint();
      for (const cloud of clouds) {
        const [red, green, blue] = cloud.top;
        expect(green).toBe(red); expect(blue).toBe(red);
        expect(red).toBeGreaterThanOrEqual(tintMin); expect(red).toBeLessThanOrEqual(tintMax);
        cloud.underside.slice(0, 3).forEach(channel => expect(channel).toBeLessThan(red));
        expect(cloud.underside[3] / cloud.top[3]).toBeCloseTo(undersideRatio, 10);
        expect(cloud.top[3]).toBeGreaterThan(0); expect(cloud.top[3]).toBeLessThanOrEqual(alphaMax);
        if (sunlit) { expect(cloud.highlight[3]).toBeGreaterThan(0); expect(cloud.highlight[3]).toBeLessThan(cloud.top[3]); }
        else expect(cloud.highlight[3]).toBe(0);
      }
      expect(clouds[0].top[3]).toBeGreaterThanOrEqual(alphaMin);
    });
  it.each(boundaries)('has no WebGL cloud step around solar hour %s', async hour => {
    const hooks = await mountFlight(true);
    const samples = [];
    for (const requested of [hour - 0.00001, hour + 0.00001]) {
      await drawAtSolarHour(hooks, requested); samples.push(webglClouds());
    }
    expect(samples[0]).toHaveLength(samples[1].length);
    for (let index = 0; index < samples[0].length; index++) {
      expect(colorDistance(samples[0][index].color, samples[1][index].color)).toBeLessThan(0.002);
      expect(Math.abs(samples[0][index].opacity - samples[1][index].opacity)).toBeLessThan(0.002);
    }
  });
  it.each(['clear', 'stormy'])('removes golden tint at midnight while preserving dark %s clouds', async weather => {
    const hooks = await mountFlight(true, weather); setSolarHour(hooks, 0); await draw();
    for (const cloud of webglClouds()) {
      expect(cloud.color[0]).toBeCloseTo(cloud.color[1], 12);
      // Existing storm tint deliberately retains a slightly blue underside.
      expect(cloud.color[2]).toBeCloseTo(cloud.color[0] * (weather === 'stormy' ? 1.05 : 1), 12);
      expect(cloud.color[0]).toBeLessThan(0.4);
      expect(cloud.opacity).toBeGreaterThan(0); expect(cloud.opacity).toBeLessThan(0.2);
    }
  });
  it('warms golden-hour WebGL clouds without tinting noon or exceeding valid colors', async () => {
    const hooks = await mountFlight(true);
    setSolarHour(hooks, 6.5); await draw();
    const dawn = webglClouds();
    expect(dawn.some(cloud => cloud.color[0] > cloud.color[1] && cloud.color[1] > cloud.color[2])).toBe(true);
    for (const cloud of dawn) for (const channel of cloud.color) {
      expect(Number.isFinite(channel)).toBe(true); expect(channel).toBeGreaterThanOrEqual(0); expect(channel).toBeLessThanOrEqual(1);
    }
    setSolarHour(hooks, 12); await draw();
    expect(webglClouds().some(cloud => cloud.opacity > 0.4)).toBe(true);
    for (const cloud of webglClouds()) {
      expect(colorDistance(cloud.color, [1, 1, 1])).toBeLessThan(1e-6);
      expect(cloud.opacity).toBeGreaterThan(0); expect(cloud.opacity).toBeLessThanOrEqual(0.75);
    }
  });
});
