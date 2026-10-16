import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const Three = vendor.THREE;
const HALF = 100000, PERIOD = HALF * 2;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, root, setData, callback, wallTime, renderer, errors, commands, hooks, viewportFlip, motionListeners;

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
  commands = []; let path = []; const saved = [];
  const context = new Proxy({
    globalAlpha: 1,
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    save() { saved.push({ fillStyle: context.fillStyle, strokeStyle: context.strokeStyle, globalAlpha: context.globalAlpha }); },
    restore() { Object.assign(context, saved.pop() || {}); },
    beginPath() { path = []; },
    moveTo(...args) { path.push({ method: 'moveTo', args }); },
    lineTo(...args) { path.push({ method: 'lineTo', args }); },
    arc(...args) { path.push({ method: 'arc', args }); },
    ellipse(...args) { path.push({ method: 'ellipse', args }); },
  }, {
    get: (target, key) => key in target ? target[key] : (...args) => commands.push({ method: key, args,
      fill: target.fillStyle, stroke: target.strokeStyle, alpha: target.globalAlpha, path: [...path] }),
    set: (target, key, value) => { target[key] = value; return true; },
  });
  return context;
}
function solarHour(hour, cycles = 1) {
  hooks.timeRef.current = ((hour - 12 - hooks.flightRef.current.lon / 15 + 48) % 24) * 100 + cycles * 2400;
}
async function mountFlight({ webgl = true, reducedMotion = false } = {}) {
  wallTime = 1000; callback = null; viewportFlip = false; motionListeners = new Set();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(captureCanvas());
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  errors = vi.spyOn(console, 'error').mockImplementation(() => {}); vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('AlloPostFXEnabled', false);
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
    const [data, updateData] = React.useState({ flightSim: { view: 'menu', cityOnline: false, thirdPerson: false,
      railCollapsed: true, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(item => [item.id, true])) } }); setData = updateData;
    return tool.render(makeCtx({ toolData: data, setToolData: updateData,
      update: (id, key, value) => updateData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => updateData(old => ({ ...old, [id]: { ...old[id], ...patch } })) }));
  }
  await React.act(async () => root.render(React.createElement(App)));
  await React.act(async () => host.querySelector('button[aria-label="Free Flight from Portland, ME"]').click());
  hooks = window.__testHooks.flightSim;
  Object.assign(hooks.flightRef.current, { lat: 43.646, lon: -70.309, altitude: 3000, fieldElev: 76,
    speed: 150, vsi: 0, heading: 90, bank: 0, onGround: false });
  Object.assign(hooks.controlsRef.current, { throttle: 0.5, pitch: 0, bank: 0, yawRate: 0 });
  Object.assign(hooks.getWeatherRef().current, { type: 'clear', wind: 0, turbulence: 0, visibility: 1 });
  solarHour(12); hooks.pausedRef.current = true;
}
async function frame({ quality = 0 } = {}) {
  Object.assign(hooks.qualityRef.current, { tier: quality, sum: 0, n: 0 });
  viewportFlip = !viewportFlip;
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { value: viewportFlip ? 1280 : 1282, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: 720, configurable: true });
  }
  commands.length = 0; wallTime += 16; expect(callback).toBeTypeOf('function');
  await React.act(async () => callback()); expect(errors).not.toHaveBeenCalled();
}
function rendered() {
  expect(renderer.render).toHaveBeenCalled();
  const [scene, camera] = renderer.render.mock.calls.at(-1);
  const jets = scene.children.filter(actor => actor.isGroup && actor.userData.dotMat && actor.userData.trailMat);
  const sprites = scene.children.filter(actor => actor.isSprite && Number.isFinite(actor.userData.baseY));
  const balloons = sprites.filter(actor => actor.material.map?.image?.width === 64 && actor.material.map?.image?.height === 96);
  const birds = sprites.filter(actor => actor.material.map?.image?.width === 96 && actor.material.map?.image?.height === 32);
  expect(jets).toHaveLength(3); expect(balloons).toHaveLength(4); expect(birds).toHaveLength(2);
  return { scene, camera, jets, balloons, birds };
}
function moveFrom(origin, east, south) {
  hooks.flightRef.current.lon = origin.lon + east / (364800 * Math.cos(origin.lat * Math.PI / 180));
  hooks.flightRef.current.lat = origin.lat - south / 364800;
}
const wrappedDifference = difference => ((difference + HALF) % PERIOD + PERIOD) % PERIOD - HALF;
const snapshot = actors => actors.map(actor => actor.position.clone());
function resourceSnapshot(jets) {
  return jets.map(jet => ({ jet, children: jet.children.map(mesh => ({ mesh, geometry: mesh.geometry,
    material: mesh.material, geometryDispose: vi.spyOn(mesh.geometry, 'dispose'), materialDispose: vi.spyOn(mesh.material, 'dispose') })) }));
}
function assertResources(jets, saved) {
  jets.forEach((jet, index) => {
    expect(jet).toBe(saved[index].jet); expect(jet.children).toHaveLength(saved[index].children.length);
    jet.children.forEach((mesh, childIndex) => {
      const old = saved[index].children[childIndex]; expect(mesh).toBe(old.mesh);
      expect(mesh.geometry).toBe(old.geometry); expect(mesh.material).toBe(old.material);
      expect(old.geometryDispose).not.toHaveBeenCalled(); expect(old.materialDispose).not.toHaveBeenCalled();
    });
  });
}
function assertSkyActivity({ balloons, birds, aircraft }) {
  const actual = rendered();
  expect(actual.balloons.some(actor => actor.visible)).toBe(balloons);
  expect(actual.birds.some(actor => actor.visible)).toBe(birds);
  expect(actual.jets.some(actor => actor.visible && actor.userData.dotMat.opacity > 0)).toBe(aircraft);
}
function canvasSkyActivity() {
  return {
    balloons: commands.some(command => command.method === 'fillRect' && command.fill === '#92400e'),
    birds: commands.some(command => command.method === 'stroke' && command.stroke === 'rgba(45,38,32,0.85)'
      && command.path.length === 3),
    aircraft: commands.some(command => command.method === 'fillRect' && typeof command.fill === 'string'
      && command.fill.startsWith('rgba(45,55,70,') && command.args[3] === 1.6),
  };
}

describe('ambient airliners in the production WebGL scene', () => {
  it('keeps world tracks fixed while the paused camera translates and switches views', async () => {
    await mountFlight(); await frame(); const before = rendered(), original = snapshot(before.jets);
    const origin = { ...hooks.flightRef.current }, camera = before.camera.position.clone(), time = hooks.timeRef.current;
    moveFrom(origin, 150, 100); await frame();
    expect(rendered().camera.position.distanceTo(camera)).toBeGreaterThan(150);
    for (const [index, jet] of rendered().jets.entries()) {
      expect(jet).toBe(before.jets[index]);
      expect(wrappedDifference(jet.position.x - original[index].x)).toBeCloseTo(0, 7);
      expect(wrappedDifference(jet.position.z - original[index].z)).toBeCloseTo(0, 7);
      expect(jet.position.y).toBe(original[index].y);
    }
    const moved = snapshot(rendered().jets);
    await React.act(async () => setData(old => ({ ...old, flightSim: { ...old.flightSim, thirdPerson: true } })));
    await frame();
    for (const [index, jet] of rendered().jets.entries()) {
      expect(wrappedDifference(jet.position.x - moved[index].x)).toBeCloseTo(0, 7);
      expect(wrappedDifference(jet.position.z - moved[index].z)).toBeCloseTo(0, 7);
    }
    expect(hooks.timeRef.current).toBe(time);
  });

  it('flies constant straight tracks with the nose forward and the rendered contrail behind', async () => {
    await mountFlight(); await frame(); const jets = rendered().jets, a = snapshot(jets), headings = jets.map(jet => jet.rotation.y);
    hooks.timeRef.current += 10; await frame(); const b = snapshot(jets);
    hooks.timeRef.current += 10; await frame(); const c = snapshot(jets);
    jets.forEach((jet, index) => {
      const first = new Three.Vector3(wrappedDifference(b[index].x - a[index].x), b[index].y - a[index].y,
        wrappedDifference(b[index].z - a[index].z));
      const second = new Three.Vector3(wrappedDifference(c[index].x - b[index].x), c[index].y - b[index].y,
        wrappedDifference(c[index].z - b[index].z));
      expect(first.length()).toBeGreaterThan(100); expect(first.distanceTo(second)).toBeLessThan(1e-7);
      expect(first.y).toBe(0); expect(jet.rotation.y).toBe(headings[index]);
      const forward = new Three.Vector3(0, 0, 1).applyQuaternion(jet.quaternion);
      expect(forward.dot(first.clone().normalize())).toBeCloseTo(1, 10);
      const dot = jet.children.find(mesh => mesh.material === jet.userData.dotMat);
      const trail = jet.children.find(mesh => mesh.material === jet.userData.trailMat);
      const behind = trail.getWorldPosition(new Three.Vector3()).sub(dot.getWorldPosition(new Three.Vector3()));
      expect(behind.dot(first)).toBeLessThan(0); expect(behind.clone().normalize().dot(forward)).toBeCloseTo(-1, 10);
      for (const material of [dot.material, trail.material]) {
        expect(material.fog).toBe(true); expect(material.transparent).toBe(true); expect(material.depthWrite).toBe(false);
      }
    });
  });

  it('recycles hidden tracks across multiple world spans and reuses resources on recovery', async () => {
    await mountFlight(); await frame(); const initial = rendered(), saved = resourceSnapshot(initial.jets), before = snapshot(initial.jets);
    const origin = { ...hooks.flightRef.current };
    for (const [east, south] of [[1300000, -700000], [-1900000, 1200000]]) {
      moveFrom(origin, east, south); await frame({ quality: 2 }); const { jets, camera } = rendered();
      jets.forEach((jet, index) => {
        expect(jet.visible).toBe(false);
        for (const axis of ['x', 'z']) {
          expect(Math.abs(jet.position[axis] - camera.position[axis])).toBeLessThanOrEqual(HALF + 1e-7);
          expect(wrappedDifference(jet.position[axis] - before[index][axis])).toBeCloseTo(0, 6);
        }
      });
      const held = snapshot(jets); await frame({ quality: 2 });
      jets.forEach((jet, index) => expect(jet.position.distanceTo(held[index])).toBeLessThan(1e-7));
      assertResources(jets, saved);
    }
    moveFrom(origin, 0, 0); await frame(); assertResources(rendered().jets, saved);
    expect(rendered().jets.some(jet => jet.visible && jet.userData.dotMat.opacity > 0)).toBe(true);
  });

  it('makes both ends of a wrapped track transparent before restoring its interior', async () => {
    await mountFlight(); await frame(); const { jets, camera } = rendered(), jet = jets[0];
    const saved = resourceSnapshot(jets), origin = { ...hooks.flightRef.current };
    const offsetX = jet.position.x - camera.position.x, offsetZ = jet.position.z - camera.position.z;
    for (const offset of [HALF - 0.1, HALF + 0.1]) {
      moveFrom(origin, offsetX - offset, offsetZ); await frame();
      expect(Math.abs(jet.position.x - rendered().camera.position.x)).toBeCloseTo(HALF - 0.1, 5);
      expect(jet.userData.dotMat.opacity).toBeLessThan(1e-8); expect(jet.userData.trailMat.opacity).toBeLessThan(1e-8);
    }
    moveFrom(origin, offsetX, offsetZ); await frame();
    expect(jet.visible).toBe(true); expect(jet.userData.dotMat.opacity).toBeCloseTo(1, 8);
    expect(jet.userData.trailMat.opacity).toBeGreaterThan(0.3); assertResources(rendered().jets, saved);
  });
});

describe('weather-aware decorative sky life', () => {
  it('banks balloon and bird textures with projected world-up, including hidden sprites and inverted flight', async () => {
    await mountFlight(); await frame();
    const actors = [...rendered().balloons, ...rendered().birds];
    const originals = actors.map(actor => ({ actor, material: actor.material, map: actor.material.map,
      position: actor.position.clone(), scale: actor.scale.toArray() }));
    for (const bank of [-30, 30, 180]) {
      hooks.flightRef.current.bank = bank; await frame(); const { camera } = rendered();
      // Project actual points to derive world-up independently of the roll helper.
      const base = camera.position.clone().addScaledVector(camera.getWorldDirection(new Three.Vector3()), 100);
      const top = base.clone().add(new Three.Vector3(0, 0.01, 0)); base.project(camera); top.project(camera);
      const up = new Three.Vector2((top.x - base.x) * camera.aspect, top.y - base.y).normalize();
      for (const [index, actor] of actors.entries()) {
        const textureUp = new Three.Vector2(-Math.sin(actor.material.rotation), Math.cos(actor.material.rotation));
        expect(textureUp.dot(up)).toBeCloseTo(1, 8); expect(Math.abs(actor.material.rotation)).toBeGreaterThan(0.4);
        expect(actor).toBe(originals[index].actor); expect(actor.material).toBe(originals[index].material);
        expect(actor.material.map).toBe(originals[index].map); expect(actor.scale.toArray()).toEqual(originals[index].scale);
        expect(actor.position.distanceTo(originals[index].position)).toBeLessThan(1e-7);
      }
    }
    hooks.getWeatherRef().current.type = 'stormy'; hooks.flightRef.current.bank = -30; await frame();
    expect(actors.every(actor => !actor.visible)).toBe(true);
    const { camera } = rendered(), direction = new Three.Vector3(0, 1, 0).applyQuaternion(camera.quaternion.clone().invert());
    const hiddenUp = new Three.Vector2(direction.x, direction.y).normalize();
    for (const actor of actors) {
      const textureUp = new Three.Vector2(-Math.sin(actor.material.rotation), Math.cos(actor.material.rotation));
      expect(textureUp.dot(hiddenUp)).toBeCloseTo(1, 8);
    }
  });

  it.each([true, false])('uses weather, wind and visibility gates in the actual renderer (WebGL %s)', async webgl => {
    await mountFlight({ webgl }); await frame();
    const assertActivity = webgl ? assertSkyActivity : expected => expect(canvasSkyActivity()).toEqual(expected);
    const weather = hooks.getWeatherRef().current;
    for (const [patch, expected] of [
      [{ type: 'clear', wind: 0, visibility: 1 }, { balloons: true, birds: true, aircraft: true }],
      [{ type: 'breezy', wind: 12, visibility: 0.75 }, { balloons: true, birds: true, aircraft: true }],
      [{ wind: 12.01 }, { balloons: false, birds: true, aircraft: true }],
      [{ type: 'gusty', wind: 25, visibility: 1 }, { balloons: false, birds: true, aircraft: true }],
      [{ wind: 25.01 }, { balloons: false, birds: false, aircraft: true }],
      [{ type: 'clear', wind: 0, visibility: 0.55 }, { balloons: false, birds: true, aircraft: true }],
      [{ visibility: 0.549 }, { balloons: false, birds: false, aircraft: false }],
      [{ type: 'stormy', visibility: 1 }, { balloons: false, birds: false, aircraft: false }],
      [{ type: 'foggy', visibility: 1 }, { balloons: false, birds: false, aircraft: false }],
      [{ type: 'clear' }, { balloons: true, birds: true, aircraft: true }],
    ]) { Object.assign(weather, patch); await frame(); assertActivity(expected); }
  });

  it.each([true, false])('honors live reduced-motion and quality changes without changing paused flight (WebGL %s)', async webgl => {
    await mountFlight({ webgl, reducedMotion: true }); await frame();
    const assertActivity = webgl ? assertSkyActivity : expected => expect(canvasSkyActivity()).toEqual(expected);
    const off = { balloons: false, birds: false, aircraft: false }, on = { balloons: true, birds: true, aircraft: true };
    const state = JSON.stringify(hooks.flightRef.current), controls = JSON.stringify(hooks.controlsRef.current);
    const time = hooks.timeRef.current, log = JSON.stringify(hooks.getLogRef().current);
    assertActivity(off);
    motionListeners.forEach(listener => listener({ matches: false })); await frame(); assertActivity(on);
    await frame({ quality: 2 }); assertActivity(off); await frame({ quality: 1 }); assertActivity(on);
    motionListeners.forEach(listener => listener({ matches: true })); await frame(); assertActivity(off);
    expect(JSON.stringify(hooks.flightRef.current)).toBe(state); expect(JSON.stringify(hooks.controlsRef.current)).toBe(controls);
    expect(hooks.timeRef.current).toBe(time); expect(JSON.stringify(hooks.getLogRef().current)).toBe(log);
  });

  it('keeps daylight, altitude and terrain occlusion independent of favorable weather', async () => {
    await mountFlight(); await frame();
    expect(rendered().balloons.every(actor => actor.visible)).toBe(true); expect(rendered().birds.every(actor => actor.visible)).toBe(true);
    solarHour(0); await frame();
    expect([...rendered().balloons, ...rendered().birds].every(actor => !actor.visible)).toBe(true);
    solarHour(12); hooks.flightRef.current.altitude = 7000; await frame();
    expect(rendered().balloons.some(actor => actor.visible)).toBe(true); expect(rendered().birds.every(actor => !actor.visible)).toBe(true);
    hooks.flightRef.current.altitude = 13000; await frame();
    expect([...rendered().balloons, ...rendered().birds].every(actor => !actor.visible)).toBe(true);
    Object.assign(hooks.flightRef.current, { lat: 39.7, lon: -105, altitude: 5900 }); solarHour(12); await frame();
    const actors = [...rendered().balloons, ...rendered().birds];
    for (const actor of actors) {
      const lat = 43.646 - actor.position.z / 364800;
      const lon = -70.309 + actor.position.x / (364800 * Math.cos(43.646 * Math.PI / 180));
      expect(api.getFlightGroundElevation(lat, lon)).toBeGreaterThan(actor.position.y); expect(actor.visible).toBe(false);
    }
  });
});
