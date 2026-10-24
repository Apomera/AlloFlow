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

async function mountFlight({ webgl = true, hour = 12, reducedMotion = false, altitude = 6000 } = {}) {
  wallTime = 1000; resize = false; callback = null; commands = []; motionListeners = new Set();
  let matrix = [1, 0, 0, 1, 0, 0], path = [];
  const stack = [];
  const record = (method, args = []) => commands.push({ method, args, fill: graphics.fillStyle,
    stroke: graphics.strokeStyle, lineWidth: graphics.lineWidth, alpha: graphics.globalAlpha ?? 1, composite: graphics.globalCompositeOperation,
    matrix: [...matrix], path: path.map(item => ({ ...item, args: [...item.args] })) });
  const multiply = (a, b, c, d, e, f) => {
    const [m0, m1, m2, m3, m4, m5] = matrix;
    matrix = [m0 * a + m2 * b, m1 * a + m3 * b, m0 * c + m2 * d, m1 * c + m3 * d,
      m0 * e + m2 * f + m4, m1 * e + m3 * f + m5];
  };
  const graphics = new Proxy({
    globalAlpha: 1, globalCompositeOperation: 'source-over', lineWidth: 1,
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: (...args) => ({ kind: 'linear', args, matrix: [...matrix], stops: [], addColorStop(offset, color) { this.stops.push([offset, color]); } }),
    createRadialGradient: (...args) => ({ kind: 'radial', args, matrix: [...matrix], stops: [], addColorStop(offset, color) { this.stops.push([offset, color]); } }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    save() { stack.push({ matrix: [...matrix], fill: graphics.fillStyle, stroke: graphics.strokeStyle,
      alpha: graphics.globalAlpha, composite: graphics.globalCompositeOperation, lineWidth: graphics.lineWidth }); },
    restore() { const saved = stack.pop(); if (saved) { matrix = saved.matrix; graphics.fillStyle = saved.fill;
      graphics.strokeStyle = saved.stroke; graphics.lineWidth = saved.lineWidth;
      graphics.globalAlpha = saved.alpha; graphics.globalCompositeOperation = saved.composite; } },
    setTransform(a, b, c, d, e, f) { matrix = [a, b, c, d, e, f]; },
    resetTransform() { matrix = [1, 0, 0, 1, 0, 0]; },
    transform: multiply, translate: (x, y) => multiply(1, 0, 0, 1, x, y),
    rotate: angle => multiply(Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0),
    scale: (x, y) => multiply(x, 0, 0, y, 0, 0),
    beginPath() { path = []; },
    moveTo: (...args) => path.push({ method: 'moveTo', args }), lineTo: (...args) => path.push({ method: 'lineTo', args }),
    rect: (...args) => path.push({ method: 'rect', args }), arc: (...args) => path.push({ method: 'arc', args }),
    ellipse: (...args) => path.push({ method: 'ellipse', args }),
    fill: (...args) => record('fill', args), stroke: (...args) => record('stroke', args),
  }, {
    get: (target, key) => key in target ? target[key] : (...args) => record(key, args),
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
  renderer = { domElement: {}, shadowMap: {}, capabilities: { getMaxAnisotropy: () => 1 }, setSize() {}, setPixelRatio() {}, dispose() {},
    getContext: () => ({ isContextLost: () => false }),
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
  weather('clear', 1); hooks.pausedRef.current = true; solarHour(hour);
}
function solarHour(hour) { hooks.timeRef.current = ((hour - 12 - hooks.flightRef.current.lon / 15 + 48) % 24) * 100; }
function weather(type, visibility) { Object.assign(hooks.getWeatherRef().current, { type, visibility, wind: 0, turbulence: 0 }); }
async function frame({ width = 1280, height = 720, quality = 0 } = {}) {
  Object.assign(hooks.qualityRef.current, { tier: quality, sum: 0, n: 0 }); resize = !resize;
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { value: width + (resize ? 0 : 2), configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: height, configurable: true });
  }
  commands.length = 0; wallTime += 16; expect(callback).toBeTypeOf('function');
  await React.act(async () => callback()); expect(errors).not.toHaveBeenCalled();
  if (!window.THREE) return null;
  expect(renderer.render).toHaveBeenCalled(); const [scene, camera] = renderer.render.mock.calls.at(-1);
  const terrain = scene.children.find(item => item.isMesh && item.geometry?.type === 'PlaneGeometry' && item.material?.vertexColors);
  const sky = scene.children.find(item => item.isMesh && item.geometry?.type === 'SphereGeometry' && item.material?.side === Three.BackSide);
  const ambient = scene.children.find(item => item.isAmbientLight), key = scene.children.find(item => item.isDirectionalLight);
  expect(terrain).toBeTruthy(); expect(sky).toBeTruthy(); expect(ambient).toBeTruthy(); expect(key).toBeTruthy();
  return { scene, camera, terrain, sky, ambient, key };
}
const rgb = color => [color.r, color.g, color.b];
const channelDistance = (a, b) => Math.max(...a.map((value, index) => Math.abs(value - b[index])));
function resources({ scene, camera, terrain, sky, ambient, key }) {
  const names = ['position', 'normal', 'landCoverage', 'fieldCoverage'];
  return { scene, camera, terrain, sky, ambient, key, geometry: terrain.geometry, material: terrain.material,
    skyMaterial: sky.material, skyGeometry: sky.geometry, skyVersion: sky.material.version,
    surfaceVersion: terrain.userData.surfaceVersion, colors: terrain.geometry.getAttribute('color'),
    buffers: names.filter(name => terrain.geometry.getAttribute(name)).map(name => {
      const buffer = terrain.geometry.getAttribute(name); return { name, buffer, version: buffer.version, values: Array.from(buffer.array) };
    }), disposals: [terrain.geometry, terrain.material, sky.geometry, sky.material].map(resource => vi.spyOn(resource, 'dispose')) };
}
function assertResources(current, saved) {
  for (const name of ['scene', 'camera', 'terrain', 'sky', 'ambient', 'key']) expect(current[name]).toBe(saved[name]);
  expect(current.terrain.geometry).toBe(saved.geometry); expect(current.terrain.material).toBe(saved.material);
  expect(current.sky.geometry).toBe(saved.skyGeometry); expect(current.sky.material).toBe(saved.skyMaterial);
  expect(current.sky.material.version).toBe(saved.skyVersion); expect(current.terrain.userData.surfaceVersion).toBe(saved.surfaceVersion);
  expect(current.terrain.geometry.getAttribute('color')).toBe(saved.colors);
  for (const { name, buffer, version, values } of saved.buffers) {
    expect(current.terrain.geometry.getAttribute(name)).toBe(buffer); expect(buffer.version).toBe(version); expect(Array.from(buffer.array)).toEqual(values);
  }
  saved.disposals.forEach(dispose => expect(dispose).not.toHaveBeenCalled());
}

const skyPaint = () => commands.find(command => command.method === 'fillRect' && command.fill?.kind === 'linear'
  && command.fill.stops.length === 17 && command.fill.stops.every(([, color]) => /^rgb\(/.test(color)));
const parseRgb = color => {
  const channels = /\(([^)]*)\)/.exec(color);
  if (!channels) throw new Error('Not an rgb() colour: ' + color);
  return channels[1].split(',').map(Number);
};
const skyColors = () => {
  const paint = skyPaint(); expect(paint).toBeTruthy();
  const colors = paint.fill.stops.map(([, color]) => parseRgb(color));
  expect(colors.every(color => color.length === 3 && color.every(value => Number.isFinite(value) && value >= 0 && value <= 255))).toBe(true);
  return colors;
};
const chroma = color => Math.max(...color) - Math.min(...color);
const luminance = color => color[0] * 0.2126 + color[1] * 0.7152 + color[2] * 0.0722;
const rays = () => commands.filter(command => command.method === 'fill' && command.composite === 'lighter'
  && command.fill?.kind === 'linear' && command.fill.stops.some(([, color]) => color.startsWith('rgba(255,240,200,'))
  && command.path.filter(item => item.method === 'lineTo').length === 2);
function assertNoLegacySunRays() {
  // The old screen-space overlay ran after both world renderers. It painted
  // broad gold strokes even when the real solar disc was obscured by weather.
  expect(commands.filter(command => command.method === 'stroke'
    && command.stroke === '#ffe4a0' && command.lineWidth === 12)).toHaveLength(0);
}

describe('production weather exposure and atmosphere', () => {
  it('reduces live light and visibility in storm and fog, then restores clear weather without rebuilding scenery', async () => {
    await mountFlight(); const clear = await frame(), saved = resources(clear);
    const clearLight = [clear.ambient.intensity, clear.key.intensity], clearFog = [clear.scene.fog.near, clear.scene.fog.far];
    const position = clear.camera.position.clone(), rotation = clear.camera.quaternion.clone();
    const flight = JSON.stringify(hooks.flightRef.current), time = hooks.timeRef.current;
    expect(clearLight[0]).toBeCloseTo(0.55, 10); expect(clearLight[1]).toBeCloseTo(0.8, 10);
    expect(clearFog).toEqual([112500, 450000]); assertNoLegacySunRays();
    weather('stormy', 0.4); const storm = await frame();
    expect(storm.ambient.intensity).toBeGreaterThan(0); expect(storm.ambient.intensity).toBeLessThan(clearLight[0]);
    expect(storm.key.intensity).toBe(0); expect(storm.scene.fog.far).toBe(38000); expect(storm.scene.fog.near).toBe(9500);
    assertResources(storm, saved); assertNoLegacySunRays();
    weather('foggy', 0.25); const fog = await frame();
    expect(fog.key.intensity).toBe(0); expect(fog.ambient.intensity).toBeGreaterThan(0);
    expect(fog.scene.fog.far).toBe(23750); expect(fog.scene.fog.near).toBe(5937.5); assertResources(fog, saved); assertNoLegacySunRays();
    weather('overcast', 0.7); const overcast = await frame();
    expect(overcast.key.intensity).toBeLessThan(clearLight[1]); assertResources(overcast, saved); assertNoLegacySunRays();
    weather('clear', 1); const restored = await frame();
    expect([restored.ambient.intensity, restored.key.intensity]).toEqual(clearLight);
    expect([restored.scene.fog.near, restored.scene.fog.far]).toEqual(clearFog); assertResources(restored, saved); assertNoLegacySunRays();
    expect(restored.camera.position.equals(position)).toBe(true); expect(restored.camera.quaternion.equals(rotation)).toBe(true);
    expect(JSON.stringify(hooks.flightRef.current)).toBe(flight); expect(hooks.timeRef.current).toBe(time);
  });

  it('uses a grayer storm sky and a flatter fog sky while keeping fog exactly at the live horizon color', async () => {
    await mountFlight({ hour: 7 }); const clear = await frame(), saved = resources(clear);
    const colors = current => ({ horizon: rgb(current.sky.material.color), zenith: rgb(current.sky.material.userData.flightSkyGradient.uniforms.zenith.value) });
    const original = colors(clear); expect(original.zenith[2]).toBeGreaterThan(original.zenith[0]);
    weather('stormy', 0.4); const storm = await frame(), stormColors = colors(storm);
    expect(chroma(stormColors.zenith)).toBeLessThan(chroma(original.zenith));
    expect(luminance(stormColors.zenith)).toBeLessThan(luminance(original.zenith));
    expect(rgb(storm.scene.fog.color)).toEqual(stormColors.horizon); assertResources(storm, saved);
    weather('foggy', 0.25); const fog = await frame(), fogColors = colors(fog);
    expect(channelDistance(fogColors.horizon, fogColors.zenith)).toBeLessThan(channelDistance(original.horizon, original.zenith));
    expect(rgb(fog.scene.fog.color)).toEqual(fogColors.horizon); assertResources(fog, saved);
    weather('clear', 1); const restored = await frame(); expect(colors(restored)).toEqual(original); assertResources(restored, saved);
  });

  it('keeps physical visibility and weather exposure through quality and reduced-motion changes, including moonlight', async () => {
    await mountFlight({ hour: 22 }); weather('stormy', 0.4); const initial = await frame(), saved = resources(initial);
    const exposure = current => [current.ambient.intensity, current.key.intensity, current.scene.fog.near, current.scene.fog.far,
      ...rgb(current.sky.material.color), ...rgb(current.sky.material.userData.flightSkyGradient.uniforms.zenith.value)];
    const storm = exposure(initial), stormFar = initial.scene.fog.far; expect(initial.key.intensity).toBe(0);
    motionListeners.forEach(listener => listener({ matches: true }));
    for (const quality of [2, 1, 0]) { const current = await frame({ quality }); expect(exposure(current)).toEqual(storm); assertResources(current, saved); }
    weather('clear', 1); const moonlit = await frame(); expect(moonlit.key.intensity).toBeGreaterThan(0);
    expect(moonlit.scene.fog.far).toBeGreaterThan(stormFar);
    expect(Math.max(...rgb(moonlit.sky.material.color))).toBeLessThan(0.1); assertResources(moonlit, saved);
  });

  it('paints a blue seven-AM Canvas sky from the shared gradient without the former purple horizon overlays', async () => {
    await mountFlight({ webgl: false, hour: 7 }); await frame(); const colors = skyColors(), paint = skyPaint();
    expect(colors[0][2]).toBeGreaterThan(colors[0][0]); expect(colors[0][1]).toBeGreaterThan(60);
    expect(colors[0][2]).toBeGreaterThan(100); expect(colors[0][0]).toBeLessThan(colors[0][1]);
    const legacyWash = commands.filter(command => command.fill?.stops?.some(([, color]) => /rgba\((255,175,90|180,90,140|120,70,130),/.test(color)));
    expect(legacyWash).toHaveLength(0);
    const instrument = commands.findIndex(command => command.method === 'fillText' && command.args[0] === 'IAS');
    expect(instrument).toBeGreaterThan(commands.indexOf(paint));
    const groundDimming = commands.filter(command => command.method === 'fillRect' && (
      (typeof command.fill === 'string' && command.fill.startsWith('rgba(5,5,25,'))
      || command.fill?.stops?.some(([, color]) => color.startsWith('rgba(255,100,50,'))));
    expect(groundDimming.length).toBeGreaterThan(0);
    groundDimming.forEach(command => { expect(command.args[1]).toBeGreaterThanOrEqual(360); expect(command.args[3]).toBeLessThanOrEqual(360); });
  });

  it('changes the actual Canvas sky with weather and recovers it exactly, while night stays dark before ground exposure', async () => {
    await mountFlight({ webgl: false, hour: 12 }); await frame(); const clear = skyColors(); assertNoLegacySunRays();
    weather('stormy', 0.4); await frame(); const storm = skyColors(); assertNoLegacySunRays();
    expect(chroma(storm[0])).toBeLessThan(chroma(clear[0])); expect(luminance(storm[0])).toBeLessThan(luminance(clear[0]));
    weather('foggy', 0.25); await frame(); const fog = skyColors(); assertNoLegacySunRays();
    expect(channelDistance(fog[0], fog.at(-1))).toBeLessThan(channelDistance(clear[0], clear.at(-1)));
    weather('overcast', 0.7); await frame(); skyColors(); assertNoLegacySunRays();
    weather('clear', 1); await frame(); expect(skyColors()).toEqual(clear); assertNoLegacySunRays();
    solarHour(22); await frame(); expect(Math.max(...skyColors().flat())).toBeLessThan(30);
    const night = commands.find(command => command.method === 'fillRect' && typeof command.fill === 'string' && command.fill.startsWith('rgba(5,5,25,'));
    expect(night).toBeTruthy(); expect(night.args[1]).toBe(360); expect(night.args[3]).toBe(360);
    expect(commands.indexOf(night)).toBeGreaterThan(commands.indexOf(skyPaint()));
  });

  it('covers every viewport corner with the rotated sky in portrait and landscape banks without changing its projection scale', async () => {
    await mountFlight({ webgl: false, hour: 7 });
    for (const { width, height, bank } of [{ width: 1280, height: 720, bank: 30 }, { width: 1280, height: 720, bank: -30 },
      { width: 400, height: 900, bank: -35 }, { width: 400, height: 900, bank: 90 }]) {
      hooks.controlsRef.current.bank = bank; hooks.flightRef.current.bank = bank; await frame({ width, height });
      const paint = skyPaint(); skyColors(); const [x, y, w, h] = paint.args, [a, b, c, d, e, f] = paint.matrix;
      expect(Math.abs(b)).toBeGreaterThan(0.4);
      expect(a * a + b * b).toBeCloseTo(1, 10); expect(c * c + d * d).toBeCloseTo(1, 10);
      const determinant = a * d - b * c, actualWidth = width + (resize ? 0 : 2);
      for (const [px, py] of [[0, 0], [actualWidth, 0], [0, height], [actualWidth, height]]) {
        const localX = (d * (px - e) - c * (py - f)) / determinant, localY = (-b * (px - e) + a * (py - f)) / determinant;
        expect(localX).toBeGreaterThanOrEqual(x - 1e-7); expect(localX).toBeLessThanOrEqual(x + w + 1e-7);
        expect(localY).toBeGreaterThanOrEqual(y - 1e-7); expect(localY).toBeLessThanOrEqual(y + h + 1e-7);
      }
      expect(paint.fill.stops[0][0]).toBe(0); expect(paint.fill.stops.at(-1)[0]).toBe(1);
      expect(paint.fill.args).toEqual([0, 0, 0, h]);
    }
  });

  it('limits sunlight shafts to cloud gaps and holds their shape still under reduced motion', async () => {
    await mountFlight({ webgl: false, hour: 7 });
    for (const type of ['clear', 'stormy', 'foggy']) {
      weather(type, type === 'clear' ? 1 : 0.4); await frame(); expect(rays()).toHaveLength(0); assertNoLegacySunRays();
    }
    weather('partly_cloudy', 1); await frame(); expect(rays()).toHaveLength(5);
    const relativePaths = () => rays().map(command => {
      const origin = command.path.find(item => item.method === 'moveTo').args;
      return command.path.filter(item => item.method === 'lineTo').flatMap(item => [item.args[0] - origin[0], item.args[1] - origin[1]]);
    });
    const moving = relativePaths(); hooks.timeRef.current += 2400; await frame();
    expect(channelDistance(relativePaths().flat(), moving.flat())).toBeGreaterThan(1);
    motionListeners.forEach(listener => listener({ matches: true })); await frame(); const still = relativePaths(); expect(still).toHaveLength(5);
    hooks.timeRef.current += 2400; await frame();
    expect(channelDistance(relativePaths().flat(), still.flat())).toBeLessThan(1e-8);
  });
});
