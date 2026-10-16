import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const Three = vendor.THREE;
const DIAMETER = 0.53 * Math.PI / 180;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, root, hooks, callback, renderer, errors, commands, wallTime, width, height, motionListeners;

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

function captureCanvas() {
  commands = []; let path = [], matrix = [1, 0, 0, 1, 0, 0]; const saved = [];
  const multiply = ([g, h, i, j, k, l]) => {
    const [a, b, c, d, e, f] = matrix;
    matrix = [a*g+c*h, b*g+d*h, a*i+c*j, b*i+d*j, a*k+c*l+e, b*k+d*l+f];
  };
  const context = new Proxy({
    globalAlpha: 1,
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: (...args) => ({ kind: 'linear', args, stops: [], addColorStop(offset, color) { this.stops.push([offset, color]); } }),
    createRadialGradient: (...args) => ({ kind: 'radial', args, stops: [], addColorStop(offset, color) { this.stops.push([offset, color]); } }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    save() { saved.push({ matrix: [...matrix], fillStyle: context.fillStyle, strokeStyle: context.strokeStyle,
      globalAlpha: context.globalAlpha, lineWidth: context.lineWidth }); },
    restore() { const previous = saved.pop(); if (previous) { matrix = previous.matrix; Object.assign(context, previous); } },
    beginPath() { path = []; },
    moveTo(...args) { path.push({ method: 'moveTo', args }); },
    lineTo(...args) { path.push({ method: 'lineTo', args }); },
    arc(...args) { path.push({ method: 'arc', args }); },
    ellipse(...args) { path.push({ method: 'ellipse', args }); },
    translate(x, y) { multiply([1, 0, 0, 1, x, y]); },
    rotate(angle) { multiply([Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0]); },
    scale(x, y) { multiply([x, 0, 0, y, 0, 0]); },
    setTransform(...args) { matrix = args.length === 6 ? args : [1, 0, 0, 1, 0, 0]; },
    resetTransform() { matrix = [1, 0, 0, 1, 0, 0]; },
  }, {
    get: (target, key) => key in target ? target[key] : (...args) => commands.push({ method: key, args,
      fill: target.fillStyle, stroke: target.strokeStyle, alpha: target.globalAlpha, lineWidth: target.lineWidth,
      path: [...path], matrix: [...matrix] }),
    set: (target, key, value) => { target[key] = value; return true; },
  });
  return context;
}
async function mountFlight({ webgl = true, reducedMotion = false } = {}) {
  wallTime = 1000; callback = null; width = 1280; height = 720; motionListeners = new Set();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(captureCanvas());
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
    const [data, setData] = React.useState({ flightSim: { view: 'menu', cityOnline: false, thirdPerson: false,
      railCollapsed: true, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(item => [item.id, true])) } });
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })) }));
  }
  await React.act(async () => root.render(React.createElement(App)));
  await React.act(async () => host.querySelector('button[aria-label="Free Flight from Portland, ME"]').click());
  hooks = window.__testHooks.flightSim;
  Object.assign(hooks.flightRef.current, { lat: 43.646, lon: -70.309, altitude: 3000, fieldElev: 76,
    speed: 0, vsi: 0, heading: 0, bank: 0, onGround: false });
  Object.assign(hooks.controlsRef.current, { throttle: 0, pitch: 0, bank: 0, yawRate: 0 });
  Object.assign(hooks.getWeatherRef().current, { type: 'clear', visibility: 1, wind: 0, turbulence: 0 });
  hooks.pausedRef.current = true; solarHour(19);
}
function solarHour(hour) { hooks.timeRef.current = ((hour - 12 - hooks.flightRef.current.lon / 15 + 48) % 24) * 100; }
const bearing = direction => (Math.atan2(direction.x, -direction.z) * 180 / Math.PI + 360) % 360;
function faceBody(body, hour, offset = 0) {
  solarHour(hour); hooks.flightRef.current.heading = bearing(api.getFlightSolarFrame(hour)[body].direction) + offset;
}
async function frame(w = width, h = height) {
  width = w; height = h;
  // A tiny width alternation invalidates a paused viewport without advancing time.
  const paintWidth = width + (wallTime % 2 ? 0 : 0.001);
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { value: paintWidth, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: height, configurable: true });
  }
  wallTime += 17; commands.length = 0;
  expect(callback).toBeTypeOf('function'); await React.act(async () => callback()); expect(errors).not.toHaveBeenCalled();
}
function rendered() {
  expect(renderer.render).toHaveBeenCalled(); const [scene, camera] = renderer.render.mock.calls.at(-1);
  const object = name => { const result = scene.getObjectByName(name); expect(result).toBeTruthy(); return result; };
  return { scene, camera, stars: object('flight-stars'), sun: object('flight-sun-disc'), sunHalo: object('flight-sun-halo'),
    moon: object('flight-moon-disc'), moonHalo: object('flight-moon-halo') };
}
const alpha = color => Number(color.slice(color.lastIndexOf(',') + 1, -1));
const discs = body => commands.filter(command => command.method === 'fill' && typeof command.fill === 'string'
  && command.fill.startsWith(body === 'sun' ? 'rgba(255,244,205,' : 'rgba(224,233,255,')
  && command.path.some(part => part.method === 'arc'));
const stars = () => commands.filter(command => command.method === 'fillRect' && command.fill === 'rgba(255,255,255,0.8)'
  && [1, 2].includes(command.args[2]) && command.args[2] === command.args[3]);
const observedOpacity = (webgl, body) => webgl ? rendered()[body].material.opacity : discs(body).reduce((sum, disc) => sum + alpha(disc.fill), 0);
function starCenter(command) {
  const x = command.args[0] + command.args[2] / 2, y = command.args[1] + command.args[3] / 2;
  const [a, b, c, d, e, f] = command.matrix;
  return { x: a*x+c*y+e, y: b*x+d*y+f };
}
function resourceSnapshot(scene) {
  return ['sun', 'sunHalo', 'moon', 'moonHalo', 'stars'].map(name => {
    const item = scene[name]; return { name, item, material: item.material, geometry: item.geometry, map: item.material.map,
      materialDispose: vi.spyOn(item.material, 'dispose'), geometryDispose: vi.spyOn(item.geometry, 'dispose') };
  });
}
function assertResources(saved) {
  const current = rendered();
  for (const entry of saved) {
    const item = current[entry.name]; expect(item).toBe(entry.item); expect(item.material).toBe(entry.material);
    expect(item.geometry).toBe(entry.geometry); expect(item.material.map).toBe(entry.map);
    expect(entry.materialDispose).not.toHaveBeenCalled(); expect(entry.geometryDispose).not.toHaveBeenCalled();
  }
}

describe('production apparent celestial size and horizon exposure', () => {
  it.each([{ body: 'sun', hour: 7, halo: 12 }, { body: 'moon', hour: 19, halo: 5 }])(
    'keeps the $body disc half a degree wide across actual camera fields of view', async ({ body, hour, halo }) => {
      await mountFlight(); faceBody(body, hour); await frame(); const saved = resourceSnapshot(rendered());
      const sizes = [];
      for (const fov of [60, 30, 90]) {
        rendered().camera.fov = fov; rendered().camera.updateProjectionMatrix(); await frame();
        const scene = rendered(), disc = scene[body], glow = scene[body + 'Halo'], camera = scene.camera;
        const distance = disc.position.distanceTo(camera.position);
        expect(2 * Math.atan(disc.scale.x / (2 * distance))).toBeCloseTo(DIAMETER, 12);
        expect(disc.scale.x).toBe(disc.scale.y); expect(glow.scale.x / disc.scale.x).toBeCloseTo(halo, 10);
        expect(glow.position.distanceTo(disc.position)).toBeLessThan(1e-8);
        expect(glow.material.opacity).toBeLessThan(disc.material.opacity);
        expect(glow.material.map).not.toBe(disc.material.map);
        expect(scene.stars.renderOrder).toBeLessThan(glow.renderOrder); expect(glow.renderOrder).toBeLessThan(disc.renderOrder);
        expect(disc.renderOrder).toBeLessThan(0); expect(disc.material.depthTest).toBe(true); expect(glow.material.depthTest).toBe(true);
        const right = new Three.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const center = disc.position.clone().project(camera), edge = disc.position.clone().addScaledVector(right, disc.scale.x / 2).project(camera);
        const radius = Math.abs(edge.x - center.x) * camera.aspect * height / 2;
        expect(radius).toBeGreaterThan(1); expect(radius).toBeLessThan(10); sizes.push(radius);
        expect(disc.material.depthWrite).toBe(false); expect(glow.material.depthWrite).toBe(false);
      }
      expect(sizes[1] / sizes[0]).toBeCloseTo(Math.tan(Math.PI / 6) / Math.tan(Math.PI / 12), 8);
      expect(sizes[2] / sizes[0]).toBeCloseTo(Math.tan(Math.PI / 6), 8); assertResources(saved);
    });

  it.each([{ body: 'sun', hour: 7 }, { body: 'moon', hour: 19 }])(
    'projects the Canvas $body size with viewport focal length and off-axis depth', async ({ body, hour }) => {
      await mountFlight({ webgl: false });
      for (const [w, h, offset] of [[1280, 720, 0], [320, 763, 0], [1280, 720, 20], [640, 480, 0]]) {
        faceBody(body, hour, offset); await frame(w, h); expect(discs(body)).toHaveLength(1);
        const radius = discs(body)[0].path.find(part => part.method === 'arc').args[2];
        const direction = api.getFlightSolarFrame(hour)[body].direction;
        const camera = new Three.PerspectiveCamera(60, w / h, 10, 300000);
        camera.rotation.set(0, -hooks.flightRef.current.heading * Math.PI / 180, 0, 'YXZ'); camera.updateMatrixWorld(true);
        const depth = new Three.Vector3(direction.x, direction.y, direction.z).dot(camera.getWorldDirection(new Three.Vector3()));
        expect(radius).toBeCloseTo(h / (2 * Math.tan(Math.PI / 6)) * Math.tan(DIAMETER / 2) / depth, 8);
      }
    });

  it.each([true, false])('crosses former sun/moon visibility thresholds without a flash (WebGL %s)', async webgl => {
    await mountFlight({ webgl });
    for (const [body, rise, elevations] of [['sun', 6, [-0.06, 0, 0.5 * Math.PI / 180]],
      ['moon', 18, [-0.03, 0, 0.5 * Math.PI / 180]]]) {
      for (const elevation of elevations) {
        const hour = rise + Math.asin(elevation / 1.15) * 12 / Math.PI, values = [];
        for (const offset of [-0.00001, 0.00001]) {
          faceBody(body, hour + offset); await frame(); values.push(observedOpacity(webgl, body));
        }
        expect(Math.abs(values[1] - values[0])).toBeLessThan(0.001);
        if (elevation > 0) expect(values.every(value => value > 0 && value < 1)).toBe(true);
      }
    }
    if (!webgl) expect(commands.some(command => command.method === 'fill' && typeof command.fill === 'string'
      && command.fill.startsWith('rgba(12,20,47,'))).toBe(false);
  });
});

describe('production celestial weather and world orientation', () => {
  it.each([true, false])('suppresses obstructed celestial objects and restores clear skies (WebGL %s)', async webgl => {
    await mountFlight({ webgl }); faceBody('sun', 7); await frame();
    const saved = webgl ? resourceSnapshot(rendered()) : null, clearSun = observedOpacity(webgl, 'sun');
    expect(clearSun).toBeGreaterThan(0.5);
    hooks.getWeatherRef().current.type = 'overcast'; await frame();
    expect(observedOpacity(webgl, 'sun')).toBeCloseTo(clearSun * 0.08, 9);
    for (const type of ['stormy', 'foggy']) { hooks.getWeatherRef().current.type = type; await frame(); expect(observedOpacity(webgl, 'sun')).toBe(0); }
    hooks.getWeatherRef().current.type = 'clear'; faceBody('moon', 19); await frame();
    const clearMoon = observedOpacity(webgl, 'moon'); expect(clearMoon).toBeGreaterThan(0.5);
    if (webgl) expect(rendered().stars.visible).toBe(true); else expect(stars().length).toBeGreaterThan(0);
    for (const type of ['overcast', 'stormy', 'foggy']) {
      hooks.getWeatherRef().current.type = type; await frame(); expect(observedOpacity(webgl, 'moon')).toBe(0);
      if (webgl) { expect(rendered().stars.visible).toBe(false); expect(rendered().stars.material.opacity).toBe(0); }
      else expect(stars()).toHaveLength(0);
    }
    hooks.getWeatherRef().current.type = 'clear'; await frame(); expect(observedOpacity(webgl, 'moon')).toBeCloseTo(clearMoon, 10);
    if (webgl) { assertResources(saved); expect(rendered().stars.visible).toBe(true); }
    else expect(stars().length).toBeGreaterThan(0);
  });

  it('retains the shared world star directions and graded vertex brightness while turning and traveling', async () => {
    await mountFlight(); await frame(); const initial = rendered(), saved = resourceSnapshot(initial);
    const position = initial.stars.geometry.attributes.position, color = initial.stars.geometry.attributes.color;
    expect(position.count).toBe(600); expect(color.count).toBe(600); expect(initial.stars.material.vertexColors).toBe(true);
    expect(initial.stars.material.blending).toBe(Three.AdditiveBlending); expect(initial.stars.material.depthWrite).toBe(false);
    const positions = Array.from(position.array), colors = Array.from(color.array), projected = [];
    for (let index = 0; index < 600; index++) {
      const star = api.getFlightStar(index), observed = new Three.Vector3().fromBufferAttribute(position, index).normalize();
      expect(observed.distanceTo(new Three.Vector3(star.direction.x, star.direction.y, star.direction.z))).toBeLessThan(1e-6);
      for (const value of [color.getX(index), color.getY(index), color.getZ(index)]) expect(value).toBeCloseTo(star.brightness, 6);
    }
    expect(Math.max(...colors) - Math.min(...colors)).toBeGreaterThan(0.5);
    for (const heading of [0, 20]) {
      hooks.flightRef.current.heading = heading; hooks.flightRef.current.lon += 0.1; await frame();
      const { stars: field, camera } = rendered(); expect(field.position.distanceTo(camera.position)).toBeLessThan(1e-8);
      expect(Array.from(position.array)).toEqual(positions); expect(Array.from(color.array)).toEqual(colors);
      projected.push(new Three.Vector3().fromBufferAttribute(position, 10).add(field.position).project(camera)); assertResources(saved);
    }
    expect(projected[0].distanceTo(projected[1])).toBeGreaterThan(0.1);
  });

  it('projects one Canvas star catalog through heading and pitch and paints it before terrain', async () => {
    await mountFlight({ webgl: false }); solarHour(19);
    for (const [heading, pitch] of [[0, 0], [35, 0], [35, 20]]) {
      hooks.flightRef.current.heading = heading; hooks.controlsRef.current.pitch = pitch; await frame();
      const painted = stars(); expect(painted.length).toBeGreaterThan(10); expect(painted.length).toBeLessThan(600);
      const camera = new Three.PerspectiveCamera(60, width / height, 10, 300000);
      camera.quaternion.setFromEuler(new Three.Euler(pitch * Math.PI / 180, -heading * Math.PI / 180, 0, 'YXZ'));
      camera.updateMatrixWorld(true); const forward = camera.getWorldDirection(new Three.Vector3()), expected = [];
      for (let index = 0; index < 600; index++) {
        const star = api.getFlightStar(index), direction = new Three.Vector3(star.direction.x, star.direction.y, star.direction.z);
        if (star.brightness <= 0 || direction.dot(forward) <= 0) continue;
        const point = direction.project(camera), x = (point.x + 1) * width / 2, y = (1 - point.y) * height / 2;
        if (x >= 0 && x <= width && y >= 0 && y <= height) expected.push({ x, y, brightness: star.brightness });
      }
      expect(painted).toHaveLength(expected.length);
      for (const command of painted) {
        const { x, y } = starCenter(command);
        const nearest = expected.reduce((best, point) => Math.hypot(point.x - x, point.y - y) < Math.hypot(best.x - x, best.y - y) ? point : best);
        expect(Math.hypot(nearest.x - x, nearest.y - y)).toBeLessThan(0.01); expect(command.alpha).toBeCloseTo(nearest.brightness, 7);
      }
      const terrain = commands.findIndex(command => command.method === 'fillRect' && typeof command.fill === 'string'
        && command.fill.startsWith('rgb(') && command.args[0] === 0 && command.args[2] > width - 1 && command.args[3] < height / 4);
      expect(terrain).toBeGreaterThan(0); for (const command of painted) expect(commands.indexOf(command)).toBeLessThan(terrain);
    }
  });

  it.each([true, false])('keeps the static night sky stable with reduced motion and paused repaints (WebGL %s)', async webgl => {
    await mountFlight({ webgl, reducedMotion: true }); faceBody('moon', 19); await frame();
    const state = JSON.stringify(hooks.flightRef.current), time = hooks.timeRef.current;
    const saved = webgl ? resourceSnapshot(rendered()) : null;
    const paint = stars().map(command => ({ ...starCenter(command), alpha: command.alpha }));
    for (let index = 0; index < 3; index++) {
      await frame(); expect(observedOpacity(webgl, 'moon')).toBeGreaterThan(0.5);
      if (webgl) { assertResources(saved); expect(rendered().stars.material.opacity).toBe(1); }
      else {
        expect(stars().length).toBe(paint.length);
        stars().forEach((command, starIndex) => {
          expect(command.alpha).toBe(paint[starIndex].alpha);
          const point = starCenter(command);
          expect(Math.hypot(point.x - paint[starIndex].x, point.y - paint[starIndex].y)).toBeLessThan(0.01);
        });
      }
    }
    expect(JSON.stringify(hooks.flightRef.current)).toBe(state); expect(hooks.timeRef.current).toBe(time);
  });

  it.each([true, false])('limits the shared shooting-star paint to clear nights without reduced motion (WebGL %s)', async webgl => {
    await mountFlight({ webgl }); hooks.flightRef.current.altitude = 20000;
    // Both times are inside the same deterministic meteor cadence. At Portland
    // they differ by twelve solar hours, isolating exposure from the event seed.
    const shootingStars = () => commands.filter(command => command.method === 'stroke' && command.lineWidth === 1.5
      && command.stroke?.kind === 'linear' && command.path.length === 2
      && command.path[0].method === 'moveTo' && command.path[1].method === 'lineTo'
      && command.stroke.stops.some(([, color]) => color === 'rgba(255,255,255,0)')
      && Math.abs((command.path[1].args[1] - command.path[0].args[1]) /
        (command.path[1].args[0] - command.path[0].args[0]) - 0.4) < 1e-8);
    hooks.timeRef.current = 1200.4; await frame(); expect(shootingStars().length).toBeGreaterThan(0);
    hooks.timeRef.current = 0.4; await frame(); expect(shootingStars()).toHaveLength(0);
    hooks.timeRef.current = 1200.4; hooks.getWeatherRef().current.type = 'stormy'; await frame(); expect(shootingStars()).toHaveLength(0);
    hooks.getWeatherRef().current.type = 'clear'; motionListeners.forEach(listener => listener({ matches: true }));
    await frame(); expect(shootingStars()).toHaveLength(0);
    motionListeners.forEach(listener => listener({ matches: false })); await frame(); expect(shootingStars().length).toBeGreaterThan(0);
  });
});
