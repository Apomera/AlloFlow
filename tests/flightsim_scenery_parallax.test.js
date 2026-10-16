import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const Three = vendor.THREE;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, reactRoot, setData, frameCallback, wallTime, renderer, errors, texts, physicsSnapshot, viewportFlip;
const layers = [{ kind: 'balloons', half: 22000, count: 4 }, { kind: 'birds', half: 9000, count: 2 }];

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
function setSolarHour(hooks, hour) {
  hooks.timeRef.current = ((hour - 12 - hooks.flightRef.current.lon / 15 + 48) % 24) * 100;
}
function resize(width = 1280, height = 720) {
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { value: width, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: height, configurable: true });
  }
}
async function mountFlight() {
  wallTime = 1000; frameCallback = null; texts = []; viewportFlip = false;
  const context = new Proxy({
    fillText(text) { texts.push(String(text)); },
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
  vi.stubGlobal('requestAnimationFrame', callback => { if (callback.name === 'loop') frameCallback = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  renderer = { domElement: {}, shadowMap: {}, capabilities: { getMaxAnisotropy: () => 1 },
    setSize() {}, setPixelRatio() {}, dispose() {}, getContext: () => ({ isContextLost: () => false }),
    render: vi.fn((scene, camera) => { scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); }) };
  window.THREE = { ...Three, WebGLRenderer: function() { return renderer; } };
  host = document.createElement('div'); document.body.appendChild(host); reactRoot = ReactDOMClient.createRoot(host);
  function App() {
    const [data, updateData] = React.useState({ flightSim: { view: 'menu', thirdPerson: false,
      railCollapsed: true, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(item => [item.id, true])) } });
    setData = updateData;
    return tool.render(makeCtx({ toolData: data, setToolData: updateData,
      update: (id, key, value) => updateData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, value) => updateData(old => ({ ...old, [id]: { ...old[id], ...value } })) }));
  }
  await React.act(async () => reactRoot.render(React.createElement(App)));
  await React.act(async () => host.querySelector('button[aria-label="Free Flight from Portland, ME"]').click());
  resize();
  const hooks = window.__testHooks.flightSim;
  Object.assign(hooks.flightRef.current, { lat: 43.646, lon: -70.309, altitude: 3000, fieldElev: 76,
    speed: 150, vsi: 0, heading: 90, onGround: false });
  Object.assign(hooks.controlsRef.current, { throttle: 0.5, pitch: 0, bank: 0, yawRate: 0 });
  Object.assign(hooks.getWeatherRef().current, { wind: 0, turbulence: 0, visibility: 1, type: 'clear' });
  // Hold physics pose, but leave the actual production loop, camera, quality
  // governor and scene objects running. There are no new production test hooks.
  vi.spyOn(api.Physics, 'step').mockImplementation(state => ({ ...state,
    forces: { lift: api.Physics.WEIGHT, weight: api.Physics.WEIGHT, drag: 0, thrust: 0 } }));
  setSolarHour(hooks, 12); hooks.pausedRef.current = true;
  return hooks;
}
async function draw(ms = 16, forceRepaint = true) {
  if (forceRepaint) { viewportFlip = !viewportFlip; resize(viewportFlip ? 1280 : 1282); }
  wallTime += ms; texts.length = 0; expect(frameCallback).toBeTypeOf('function');
  await React.act(async () => frameCallback()); expect(errors).not.toHaveBeenCalled();
  expect(renderer.render).toHaveBeenCalled();
}
function rendered() {
  const [scene, camera] = renderer.render.mock.calls.at(-1);
  const sprites = scene.children.filter(item => item.isSprite && Number.isFinite(item.userData.ox)
    && Number.isFinite(item.userData.oz) && Number.isFinite(item.userData.baseY));
  const balloons = sprites.filter(item => item.material.map?.image?.width === 64 && item.material.map?.image?.height === 96);
  const birds = sprites.filter(item => item.material.map?.image?.width === 96 && item.material.map?.image?.height === 32);
  expect(balloons).toHaveLength(4); expect(birds).toHaveLength(2);
  return { scene, camera, balloons, birds };
}
function moveFromOrigin(hooks, origin, eastFt, southFt) {
  hooks.flightRef.current.lon = origin.lon + eastFt / (364800 * Math.cos(origin.lat * Math.PI / 180));
  hooks.flightRef.current.lat = origin.lat - southFt / 364800;
}
const positions = actors => actors.map(actor => actor.position.clone());
const moduloDistance = (a, b, period) => Math.abs((a - b) / period - Math.round((a - b) / period));

describe('WebGL ambient scenery has world-relative parallax', () => {
  it.each(layers)('holds $kind in world space while the camera translates inside a tile', async ({ kind }) => {
    const hooks = await mountFlight(); await draw(); const initial = rendered(); const initialCamera = initial.camera.position.clone();
    const actors = initial[kind], before = positions(actors), origin = { ...hooks.flightRef.current };
    const time = hooks.timeRef.current;
    moveFromOrigin(hooks, origin, 150, 100); await draw(); const after = rendered();
    expect(hooks.timeRef.current).toBe(time); expect(after.camera.position.distanceTo(initialCamera)).toBeGreaterThan(150);
    for (const [index, actor] of after[kind].entries()) {
      expect(actor).toBe(actors[index]); expect(actor.visible).toBe(true);
      expect(actor.position.distanceTo(before[index])).toBeLessThan(1e-8);
      const oldRelative = before[index].clone().sub(initialCamera), newRelative = actor.position.clone().sub(after.camera.position);
      expect(newRelative.distanceTo(oldRelative)).toBeGreaterThan(150);
    }
  });
  it.each(layers)('leaves $kind world positions stable when switching cockpit and chase cameras', async ({ kind }) => {
    const hooks = await mountFlight(); await draw(); const before = rendered(), initial = positions(before[kind]);
    const cockpitCamera = before.camera.position.clone(), time = hooks.timeRef.current;
    await React.act(async () => setData(old => ({ ...old, flightSim: { ...old.flightSim, thirdPerson: true } })));
    await draw(); const chase = rendered(); expect(chase.camera.position.distanceTo(cockpitCamera)).toBeGreaterThan(10);
    for (const [index, actor] of chase[kind].entries()) expect(actor.position.distanceTo(initial[index])).toBeLessThan(1e-8);
    await React.act(async () => setData(old => ({ ...old, flightSim: { ...old.flightSim, thirdPerson: false } })));
    await draw(); expect(hooks.timeRef.current).toBe(time);
    for (const [index, actor] of rendered()[kind].entries()) expect(actor.position.distanceTo(initial[index])).toBeLessThan(1e-8);
  });
  it.each(layers)('keeps $kind bounded across positive, negative and multi-tile travel without altering world lattice', async ({ kind, half }) => {
    const hooks = await mountFlight(); await draw(); const baseline = positions(rendered()[kind]), origin = { ...hooks.flightRef.current };
    const period = half * 2, time = hooks.timeRef.current;
    for (const [east, south] of [[half * 2.4, 0], [-half * 2.7, 0], [0, half * 3.2], [0, -half * 4.1], [10000000, -7000000], [-10000000, 7000000]]) {
      moveFromOrigin(hooks, origin, east, south); await draw(); const { camera, [kind]: actors } = rendered();
      expect(hooks.timeRef.current).toBe(time);
      for (const [index, actor] of actors.entries()) {
        expect(Number.isFinite(actor.position.x)).toBe(true); expect(Number.isFinite(actor.position.z)).toBe(true);
        expect(Math.abs(actor.position.x - camera.position.x)).toBeLessThanOrEqual(half + 1e-7);
        expect(Math.abs(actor.position.z - camera.position.z)).toBeLessThanOrEqual(half + 1e-7);
        // Only selecting an equivalent tile may move a held-time world anchor.
        expect(moduloDistance(actor.position.x, baseline[index].x, period)).toBeLessThan(1e-7);
        expect(moduloDistance(actor.position.z, baseline[index].z, period)).toBeLessThan(1e-7);
        expect(actor.position.y).toBeCloseTo(baseline[index].y, 10);
      }
    }
  });
  it.each(layers)('retains gentle $kind animation at a fixed camera instead of freezing the world anchors', async ({ kind, half }) => {
    const hooks = await mountFlight(); await draw(); const before = rendered(), baseline = positions(before[kind]);
    const camera = before.camera.position.clone(); hooks.timeRef.current += 0.5; await draw(); const after = rendered();
    expect(after.camera.position.distanceTo(camera)).toBeLessThan(1e-8);
    for (const [index, actor] of after[kind].entries()) {
      const horizontal = Math.hypot(actor.position.x - baseline[index].x, actor.position.z - baseline[index].z);
      expect(horizontal).toBeGreaterThan(0); expect(horizontal).toBeLessThan(half / 10);
      expect(Number.isFinite(actor.position.y)).toBe(true);
    }
  });
  it('preserves paused scenery, flight state, and evidence during viewport repaint', async () => {
    const hooks = await mountFlight(); await draw(); const actors = [...rendered().balloons, ...rendered().birds], baseline = positions(actors);
    const time = hooks.timeRef.current, state = JSON.stringify(hooks.flightRef.current), controls = JSON.stringify(hooks.controlsRef.current);
    const evidence = JSON.stringify(hooks.getLogRef().current); const renderCount = renderer.render.mock.calls.length;
    resize(320, 763); await draw(16, false);
    expect(renderer.render.mock.calls.length).toBeGreaterThan(renderCount); expect(hooks.timeRef.current).toBe(time);
    expect(JSON.stringify(hooks.flightRef.current)).toBe(state); expect(JSON.stringify(hooks.controlsRef.current)).toBe(controls);
    expect(JSON.stringify(hooks.getLogRef().current)).toBe(evidence);
    for (const [index, actor] of actors.entries()) expect(actor.position.distanceTo(baseline[index])).toBeLessThan(1e-8);
    const heldCount = renderer.render.mock.calls.length; await draw(16, false);
    expect(renderer.render.mock.calls.length).toBe(heldCount);
  });
  it('keeps the existing daylight and altitude visibility gates', async () => {
    const hooks = await mountFlight(); await draw();
    expect([...rendered().balloons, ...rendered().birds].every(actor => actor.visible)).toBe(true);
    setSolarHour(hooks, 0); await draw();
    expect([...rendered().balloons, ...rendered().birds].every(actor => !actor.visible)).toBe(true);
    setSolarHour(hooks, 12); hooks.flightRef.current.altitude = 7000; await draw();
    expect(rendered().balloons.every(actor => actor.visible)).toBe(true); expect(rendered().birds.every(actor => !actor.visible)).toBe(true);
    hooks.flightRef.current.altitude = 13000; await draw();
    expect([...rendered().balloons, ...rendered().birds].every(actor => !actor.visible)).toBe(true);
    hooks.flightRef.current.altitude = 3000; await draw();
    expect([...rendered().balloons, ...rendered().birds].every(actor => actor.visible)).toBe(true);
  });
  it('still sheds all ambient sprites through the production slow-frame quality governor', async () => {
    const hooks = await mountFlight(); hooks.pausedRef.current = false;
    await draw(); expect([...rendered().balloons, ...rendered().birds].every(actor => actor.visible)).toBe(true);
    for (let index = 0; index < 84; index++) await draw(100, false);
    expect(texts).toContain('ECO+');
    expect([...rendered().balloons, ...rendered().birds].every(actor => !actor.visible)).toBe(true);
  });
});
