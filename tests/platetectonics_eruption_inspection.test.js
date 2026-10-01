import fs from 'node:fs';
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

let React, ReactDOM, act, now = 0, frameId = 0, scene, camera, renderCount = 0;
const frames = new Map(), hosts = [];
const read = file => fs.readFileSync(file, 'utf8');
beforeAll(() => {
  window.HTMLCanvasElement.prototype.getContext = () => new Proxy({ measureText: t => ({ width: String(t).length * 6 }), createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) }, { get: (target, key) => key in target ? target[key] : () => ({ addColorStop() {} }), set: (target, key, value) => { target[key] = value; return true; } });
  for (const [key, value] of [['offsetWidth', 720], ['clientWidth', 720], ['offsetHeight', 470], ['clientHeight', 470]]) Object.defineProperty(window.HTMLElement.prototype, key, { configurable: true, get: () => value });
  window.HTMLElement.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, bottom: 470, right: 720, width: 720, height: 470 });
  window.requestAnimationFrame = globalThis.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
  window.cancelAnimationFrame = globalThis.cancelAnimationFrame = id => frames.delete(id);
  window.ResizeObserver = globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', 'vendor/three-r128/three.min.js', 'stem_lab/stem_lab_module.js']) (0, eval)(read(file));
  window.THREE.WebGLRenderer = class {
    setClearColor() {} setPixelRatio() {} setSize() {} dispose() {} getContext() { return { isContextLost: () => false }; }
    render(nextScene, nextCamera) { renderCount++; scene = nextScene; camera = nextCamera; scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); }
  };
  window.StemLab.ensureThree = () => Promise.resolve(window.THREE);
  window.StemLab.loadScriptResilient = () => new Promise(() => {});
  // Expose the real painter only to inspect the particle data supplied to it.
  const source = read(process.env.PT_TEST_SOURCE || 'stem_lab/stem_tool_platetectonics.js').replace('window.__alloVentGL = VentGL;', 'window.__alloVentGL = VentGL; window.__testEruptPainter = PtErupt2D;');
  (0, eval)(source);
  React = window.React; ReactDOM = window.ReactDOM; act = React.act || React.unstable_act;
});
beforeEach(() => { frames.clear(); now = 0; renderCount = 0; vi.spyOn(performance, 'now').mockImplementation(() => now); vi.spyOn(Math, 'random').mockReturnValue(0.5); });
afterEach(async () => {
  window.__alloVentGL.unmount();
  while (hosts.length) { const host = hosts.pop(); act(() => ReactDOM.unmountComponentAtNode(host)); host.remove(); }
  await new Promise(resolve => setTimeout(resolve, 10));
  frames.clear(); vi.restoreAllMocks(); scene = camera = null;
});
function frame(ms = 1000 / 60) {
  now += ms;
  act(() => { for (const [id, callback] of [...frames]) if (frames.delete(id)) callback(now); });
}
function run(seconds, hz) { for (let i = 0; i < Math.round(seconds * hz); i++) frame(1000 / hz); }
function mountTool(extra = {}) {
  const host = document.createElement('div'); document.body.appendChild(host); hosts.push(host);
  let data = { plateTectonics: { _ptPicked: true, simTab: 'sim', ptDrift: false, ptVent3D: false, speed: 1, ...extra } };
  const xp = vi.fn(), writes = [];
  const noop = () => {};
  const ctx = { React, toolData: data, setToolData: fn => { data = typeof fn === 'function' ? fn(data) : fn; ctx.toolData = data; writes.push(data); },
    setStemLabTool: noop, setStemLabTab: noop, setToolSnapshots: noop, toolSnapshots: [], props: {}, srOnly: {}, icons: new Proxy({}, { get: () => () => null }),
    addToast: noop, announceToSR: noop, awardXP: xp, getXP: () => 0, beep: noop, celebrate: noop, canvasNarrate: noop, canvasA11yDesc: noop,
    a11yClick: fn => ({ onClick: fn }), isDark: true, isContrast: false, gradeLevel: '7th', t: (_, fallback) => fallback };
  act(() => ReactDOM.render(React.createElement(() => window.StemLab._registry.plateTectonics.render(ctx)), host));
  const canvas = host.querySelector('[data-pt-main-canvas]'); expect(canvas).toBeTruthy();
  function start() { canvas._ptLive.d = data.plateTectonics; canvas._ptBoundaryKind = { 0: 'subduction' }; act(() => canvas.dispatchEvent(new CustomEvent('triggerEruption'))); }
  return { canvas, start, xp, writes, state: () => data.plateTectonics };
}
function snapshotPoints() {
  const result = [];
  scene.traverse(object => { if (object.isPoints) result.push({ count: object.geometry.drawRange.count, position: Array.from(object.geometry.attributes.position.array) }); });
  return result;
}
async function mountVent(magma = 'basalt') {
  const canvas = document.createElement('canvas'); document.body.appendChild(canvas); hosts.push(canvas);
  const gl = window.__alloVentGL;
  let model = { active: false, paused: false, tick: 0, motionClock: 0, dark: true, labels: true, magma };
  gl.submit(model); gl.mount(canvas); await Promise.resolve(); await Promise.resolve(); frame();
  expect(gl.debug().state).toBe('ready');
  return { gl, update(patch, ms = 1000 / 60) { model = { ...model, ...patch }; gl.submit(model); frame(ms); } };
}

describe('Volcano eruption timing and inspection', () => {
  it.each([30, 60, 144])('preserves two seconds of eruption time at %i Hz', hz => {
    const app = mountTool(); app.start(); run(2, hz);
    expect(app.canvas._ptEruption.getState()).toMatchObject({ active: true, paused: false, tick: 120, magma: 'andesite' });
    expect(app.state().ptEruptPhase).toBe('blast');
    expect(app.state().ptMadeEruptions).toBe(1);
    expect(app.xp).not.toHaveBeenCalled();
  });
  it('freezes 2D particles and ticks while paused, then resumes without a catch-up or another reward', () => {
    const app = mountTool({ ptVentMagma: 'basalt' }); app.start(); run(2, 60);
    const painted = [];
    vi.spyOn(window.__testEruptPainter, 'drawParticle').mockImplementation((_, p) => painted.push({ ...p }));
    app.canvas._ptEruption.setPaused(true); frame();
    const before = painted.splice(0), state = app.canvas._ptEruption.getState(), earned = app.state().ptMadeEruptions;
    expect(before.length).toBeGreaterThan(0);
    frame(5000); expect(painted.splice(0)).toEqual(before);
    expect(app.canvas._ptEruption.getState()).toEqual(state);
    expect(app.state().ptMadeEruptions).toBe(earned); expect(app.xp).not.toHaveBeenCalled();
    state.tick = -1; expect(app.canvas._ptEruption.getState().tick).toBe(120);
    app.canvas._ptEruption.setPaused(false); frame();
    expect(app.canvas._ptEruption.getState().tick).toBe(121);
    expect(painted).not.toEqual(before);
  });
  it('bounds background catch-up and honors playback speed without changing the plate clock', () => {
    const app = mountTool({ speed: 2 }); app.start(); run(1, 144);
    expect(app.canvas._ptEruption.getState().tick).toBe(120);
    frame(5000); expect(app.canvas._ptEruption.getState().tick).toBe(132);
    const initial = app.canvas._ptEruption.getState();
    app.canvas._ptEruption.setPaused(true); run(1, 30);
    expect(app.canvas._ptEruption.getState().tick).toBe(initial.tick);
  });
  it('clears transient pause at completion and starts the next deliberate eruption from zero', () => {
    const app = mountTool({ speed: 4 }); app.start(); run(4, 60);
    expect(app.canvas._ptEruption.getState()).toMatchObject({ active: false, paused: false, tick: 0 });
    expect(app.canvas._ptEruption.setPaused(true).paused).toBe(false);
    const earned = app.state().ptMadeEruptions;
    run(1, 60); expect(app.state().ptMadeEruptions).toBe(earned);
    app.start(); expect(app.canvas._ptEruption.getState()).toMatchObject({ active: true, paused: false, tick: 0 });
    frame(); expect(app.canvas._ptEruption.getState().tick).toBe(4);
    expect(app.state().ptMadeEruptions).toBe(earned + 1);
    expect(app.state()).not.toHaveProperty('paused'); expect(app.state()).not.toHaveProperty('motionClock');
  });
  it('pins both renderers to the launched composition even if stored selection changes', () => {
    const submitted = vi.spyOn(window.__alloVentGL, 'submit');
    const app = mountTool({ ptVentMagma: 'basalt' }); app.start(); frame();
    app.canvas._ptLive.ptVentMagma = 'rhyolite'; frame();
    expect(submitted.mock.calls.at(-1)[0].magma).toBe('basalt');
    expect(app.canvas._ptEruptProfile.id).toBe('basalt');
  });
  it('freezes actual Three particle geometry and cooling while allowing camera movement', async () => {
    const model = await mountVent();
    for (let tick = 1; tick <= 130; tick++) model.update({ active: true, tick, motionClock: tick });
    const before = snapshotPoints(), debug = model.gl.debug();
    expect(debug.lava + debug.glow + debug.ash).toBeGreaterThan(0);
    model.update({ paused: true }); const cameraBefore = camera.position.clone();
    model.gl.nudge(20, 0); frame(5000);
    expect(camera.position.distanceTo(cameraBefore)).toBeGreaterThan(0);
    expect(snapshotPoints()).toEqual(before);
    expect(model.gl.debug()).toMatchObject({ fill: debug.fill, summit: debug.summit, lava: debug.lava, glow: debug.glow, ash: debug.ash, ashCover: debug.ashCover });
    model.update({ paused: false, tick: 131, motionClock: 131 });
    expect(snapshotPoints()).not.toEqual(before);
  });
  it('does not evolve a repeated source snapshot just because the GPU renders more often', async () => {
    const model = await mountVent('rhyolite');
    for (let tick = 1; tick <= 130; tick++) model.update({ active: true, tick, motionClock: tick });
    const before = snapshotPoints();
    for (let i = 0; i < 20; i++) frame(1000 / 144);
    expect(snapshotPoints()).toEqual(before);
    model.update({ tick: 132, motionClock: 132 }); expect(snapshotPoints()).not.toEqual(before);
  });
  it('retains the exact paused scene through a hidden 2D visit without GPU painting', async () => {
    const model = await mountVent();
    for (let tick = 1; tick <= 130; tick++) model.update({ active: true, tick, motionClock: tick });
    model.update({ paused: true });
    const before = snapshotPoints(), retainedScene = scene, rendered = renderCount;
    model.gl.setVisible(false);
    for (let i = 0; i < 10; i++) frame(1000);
    expect(renderCount).toBe(rendered);
    expect(snapshotPoints()).toEqual(before);
    expect(model.gl.debug().state).toBe('ready');
    model.gl.setVisible(true); frame();
    expect(renderCount).toBeGreaterThan(rendered);
    expect(scene).toBe(retainedScene);
    expect(snapshotPoints()).toEqual(before);
    expect(model.gl.debug()).toMatchObject({ active: true, tick: 130 });
  });
  it('consumes hidden source time without replaying particle steps on return', async () => {
    const model = await mountVent();
    for (let tick = 1; tick <= 130; tick++) model.update({ active: true, tick, motionClock: tick });
    const before = snapshotPoints(), rendered = renderCount;
    model.gl.setVisible(false);
    for (let tick = 131; tick <= 170; tick++) model.update({ tick, motionClock: tick }, 1000);
    expect(renderCount).toBe(rendered);
    expect(snapshotPoints()).toEqual(before);
    model.gl.setVisible(true); frame();
    expect(snapshotPoints()).toEqual(before);
    model.update({ tick: 171, motionClock: 171 });
    expect(snapshotPoints()).not.toEqual(before);
  });
});
