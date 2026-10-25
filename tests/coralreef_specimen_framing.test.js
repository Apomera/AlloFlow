import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [], owned = [];
let X, namespace, api, renderers, models, observers, frameQueue, nextFrame;
beforeEach(() => {
  frameQueue = new Map(); nextFrame = 1;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { const id = nextFrame++; frameQueue.set(id, callback); return id; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frameQueue.delete(id));
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; renderers = []; models = []; observers = [];
  class Renderer {
    constructor(options) { this.canvas = options.canvas; this.capabilities = { isWebGL2: true }; this.ratio = 1; this.info = { programs: [] }; this.getContext = () => ({ isContextLost: () => false }); this.render = vi.fn(); this.dispose = vi.fn(); this.forceContextLoss = vi.fn(); renderers.push(this); }
    setPixelRatio(n) { this.ratio = n; } getPixelRatio() { return this.ratio; }
    setSize(w, h) { this.canvas.width = Math.round(w * this.ratio); this.canvas.height = Math.round(h * this.ratio); }
  }
  namespace = { ...THREE, WebGLRenderer: Renderer };
  api = { version: '1.0.0', info: () => ({ group: 'fish', portrait: { dir: [.3, .5, 3.2], lookY: 0 } }), create: vi.fn(() => {
    const root = new THREE.Group(), mesh = new THREE.Mesh(new THREE.BoxGeometry(1, .16, .12), new THREE.MeshBasicMaterial());
    mesh.position.y = .1; root.add(mesh); const model = { root, radius: .6, dispose: vi.fn(), update: vi.fn() }; models.push(model); return model;
  }) };
  window.THREE = namespace; window.Reef3DSpecies = api;
  vi.stubGlobal('ResizeObserver', class { constructor(callback) { this.callback = callback; this.disconnect = vi.fn(); observers.push(this); } observe() {} });
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addListener() {}, removeListener() {} })));
  loadTool('stem_lab/stem_tool_coralreef.js', 'coralReef'); X = window.__RR_TEST_EXPORTS__.coralReef;
});
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } while (owned.length) owned.pop().dispose(); delete window.THREE; delete window.Reef3DSpecies; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const q = (t, selector) => t.host.querySelector(selector);
const state = t => ({ ...q(t, '[data-specimen-view]').dataset });
function step(time) { const callbacks = [...frameQueue.values()]; frameQueue.clear(); for (const callback of callbacks) callback(time); }
function controller(width = 400, height = 400, failure = vi.fn()) {
  const canvas = document.createElement('canvas'); Object.defineProperties(canvas, { clientWidth: { configurable: true, value: width }, clientHeight: { configurable: true, value: height } });
  const c = X.createMarineSpecimenController(namespace, canvas, 'clownfish', failure); owned.push(c); return c;
}
const frames = () => renderers[0].render.mock.calls.length;
function pointsOf(root) {
  const points = [], instance = new THREE.Matrix4(); root.updateMatrixWorld(true);
  root.traverseVisible(node => {
    const pos = node.geometry?.attributes?.position; if (!node.isMesh || !pos) return;
    for (let j = 0; j < (node.isInstancedMesh ? node.count : 1); j++) {
      const matrix = node.matrixWorld.clone(); if (node.isInstancedMesh) { node.getMatrixAt(j, instance); matrix.multiply(instance); }
      for (let i = 0; i < pos.count; i++) { const p = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(matrix); if ([p.x, p.y, p.z].every(Number.isFinite)) points.push(p); }
    }
  }); return points;
}
function projection() {
  const camera = renderers[0].render.mock.calls.at(-1)[1]; camera.updateMatrixWorld(true);
  return pointsOf(models[0].root).map(p => p.project(camera));
}
function snapshot() {
  const values = []; models[0].root.traverse(node => values.push({ position: node.position.toArray(), rotation: node.quaternion.toArray(), scale: node.scale.toArray(), matrix: node.matrixWorld.toArray(), vertices: node.geometry?.attributes?.position ? Array.from(node.geometry.attributes.position.array) : null, instances: node.instanceMatrix ? Array.from(node.instanceMatrix.array) : null })); return values;
}
async function click(el) { expect(el).toBeTruthy(); await React.act(async () => { el.focus(); el.click(); await new Promise(resolve => setTimeout(resolve, 0)); }); }
async function mount(kind = 'study') {
  let data = { coralReef: { section: 'guide', guideSpeciesId: kind === 'study' ? 'clownfish' : null, speciesBookmarks: { clownfish: true, blue_tang: true }, speciesFieldNotes: { clownfish: 'Keep this note' }, speciesLog: { green_turtle: { firstSeen: 1 } } } };
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() { const [value, setValue] = React.useState(data); data = value; return cfg.render({ React, toolData: value, setToolData: setValue, t: (k, v) => v || k, reduceMotion: true }); }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t); await React.act(async () => root.render(React.createElement(Shell)));
  if (kind === 'study') { await click(q(t, '[data-open-study]')); await click(q(t, '[data-study-specimen-toggle]')); }
  else { await click(q(t, '[data-start-practice]')); await React.act(async () => { const select = q(t, '[data-practice-collection-select]'); select.value = 'saved'; select.dispatchEvent(new Event('change', { bubbles: true })); }); await click(q(t, '[data-practice-start]')); await click(q(t, '[data-practice-specimen-toggle]')); }
  await React.act(async () => step(0)); return t;
}

describe('optional angle-specific specimen framing', () => {
  it.each([[240, 480], [320, 360], [400, 400], [800, 400]])('fits all actual projected vertices with 10%% edge margins at %i by %i, without changing pose or geometry', (width, height) => {
    const c = controller(width, height); c.setAngle('front'); c.setLighting('detail'); c.setBackground('dark'); c.setAppearance('silhouette'); c.zoom(.5); c.pan(.1, -.1);
    const before = c.getView(), geometry = snapshot(), count = frames(); const after = c.frameView();
    expect(after.scale).toBeGreaterThan(1); expect(after.scale).toBeLessThanOrEqual(3); expect({ ...after, scale: before.scale, panX: before.panX, panY: before.panY }).toEqual(before); expect(after.panX).toBe(0); expect(after.panY).toBe(0);
    for (const p of projection()) { expect(Math.abs(p.x)).toBeLessThanOrEqual(.800001); expect(Math.abs(p.y)).toBeLessThanOrEqual(.800001); expect(Math.abs(p.z)).toBeLessThan(1); }
    expect(snapshot()).toEqual(geometry); expect(frames()).toBe(count + 1); c.frameView(); expect(frames()).toBe(count + 1); expect(frameQueue.size).toBe(0); expect(models[0].update).not.toHaveBeenCalled(); expect(api.create).toHaveBeenCalledTimes(1);
  });

  it('uses parent, mesh and instance transforms, including a translated specimen center', () => {
    api.create.mockImplementation(() => {
      const root = new THREE.Group(), parent = new THREE.Group(); root.position.set(2, -.4, .7); root.rotation.z = .03; parent.position.set(.1, .2, -.1); root.add(parent);
      const geometry = new THREE.BoxGeometry(.6, .07, .06), mesh = new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial(), 2); mesh.position.x = .11; mesh.scale.set(1, .9, 1.2);
      mesh.setMatrixAt(0, new THREE.Matrix4().compose(new THREE.Vector3(-.13, -.06, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(.04, 0, 0)), new THREE.Vector3(1, 1, 1)));
      mesh.setMatrixAt(1, new THREE.Matrix4().makeTranslation(.1, .06, .02)); parent.add(mesh);
      const model = { root, radius: .6, dispose: vi.fn(), update: vi.fn() }; models.push(model); return model;
    });
    const c = controller(320, 420); c.setAngle('front'); const before = snapshot(); expect(c.frameView().scale).toBeGreaterThan(1);
    for (const p of projection()) { expect(Math.abs(p.x)).toBeLessThanOrEqual(.800001); expect(Math.abs(p.y)).toBeLessThanOrEqual(.800001); expect(Math.abs(p.z)).toBeLessThan(1); } expect(snapshot()).toEqual(before);
  });

  it('keeps the 300% ceiling, ignores nonfinite vertices and never zooms below the original fit', () => {
    const c = controller(); c.setAngle('front');
    // The original bounds stay fixed while a tiny static specimen exercises the maximum zoom.
    const p = models[0].root.children[0].geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * .01, p.getY(i) * .01, p.getZ(i) * .01);
    p.setXYZ(0, NaN, Infinity, 0); const before = Array.from(p.array); expect(c.frameView().scale).toBe(3); expect(Array.from(p.array)).toEqual(before);
    c.reset(); for (let i = 0; i < p.count; i++) if (Number.isFinite(p.getX(i))) p.setXYZ(i, p.getX(i) * 10000, p.getY(i) * 10000, p.getZ(i) * 10000);
    expect(c.frameView().scale).toBe(1); expect(frameQueue.size).toBe(0);
  });

  it('uses the new viewport aspect after a resize and does not frame automatically', () => {
    const c = controller(700, 360); c.setAngle('front'); c.frameView(); const first = c.getView(), canvas = renderers[0].canvas;
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 240 }); observers[0].callback(); expect(c.getView()).toEqual(first);
    const next = c.frameView(); expect(next.scale).not.toBe(first.scale); for (const p of projection()) { expect(Math.abs(p.x)).toBeLessThanOrEqual(.800001); expect(Math.abs(p.y)).toBeLessThanOrEqual(.800001); }
  });

  it('leaves a usable view intact for missing geometry and disposes safely after framing or context loss', () => {
    const failure = vi.fn(), c = controller(400, 400, failure); c.setAngle('front'); c.frameView(); c.pan(.1, .1); const before = c.getView(), n = frames();
    models[0].root.children[0].geometry.deleteAttribute('position'); expect(c.frameView()).toEqual(before); expect(frames()).toBe(n); expect(failure).not.toHaveBeenCalled();
    renderers[0].canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })); expect(failure).toHaveBeenCalledTimes(1); expect(c.frameView()).toEqual(before); c.dispose();
    expect(models[0].dispose).toHaveBeenCalledTimes(1); expect(renderers[0].dispose).toHaveBeenCalledTimes(1); expect(observers[0].disconnect).toHaveBeenCalledTimes(1); expect(frameQueue.size).toBe(0);
  });

  it('pauses the turntable at its live angle, with no queued frames or later automatic movement', () => {
    const c = controller(); c.setAngle('front'); c.setTurntable(true); step(0); step(40); const live = c.getView(); const framed = c.frameView();
    expect(framed.turn).toBe(live.turn); expect(framed.tilt).toBe(live.tilt); expect(framed.angle).toBe('custom'); expect(c.isTurntableRunning()).toBe(false); expect(frameQueue.size).toBe(0);
    const n = frames(); step(200); expect(c.getView()).toEqual(framed); expect(frames()).toBe(n); c.dispose(); c.dispose(); expect(models[0].dispose).toHaveBeenCalledTimes(1);
  });

  it('offers a stable native button under reduced motion, cancels gestures, and preserves Fit, remembered views and records', async () => {
    const t = await mount(), records = JSON.stringify(t.data), button = q(t, '[data-specimen-frame]'); expect(button.tagName).toBe('BUTTON'); expect(button.type).toBe('button'); expect(button.textContent).toBe('Frame this angle'); expect(document.getElementById(button.getAttribute('aria-describedby')).textContent).toContain('whole specimen'); expect(document.getElementById(button.getAttribute('aria-controls'))).toBe(q(t, '[data-specimen-canvas]'));
    await click(q(t, '[data-specimen-angle-button="front"]')); await click(q(t, '[data-specimen-light-button="studio"]')); await click(q(t, '[data-specimen-fine]')); await click(button);
    expect(Number(state(t).specimenScale)).toBeGreaterThan(1); expect(document.activeElement).toBe(button); expect(state(t)).toMatchObject({ specimenAngle: 'front', specimenLighting: 'studio', specimenMode: 'turn', specimenPrecision: 'fine', specimenTurntable: 'paused' });
    await click(q(t, '[data-specimen-remember]')); const remembered = state(t); await click(q(t, '[data-specimen-fit]')); expect(state(t).specimenScale).toBe('1'); expect(state(t).specimenAngle).toBe('front'); await click(q(t, '[data-specimen-restore]')); expect(state(t)).toEqual(remembered);
    const canvas = q(t, '[data-specimen-canvas]'); canvas.getBoundingClientRect = () => ({ width: 400, height: 240 }); await React.act(async () => { const event = new Event('pointerdown', { bubbles: true }); Object.assign(event, { pointerId: 4, button: 0, clientX: 120, clientY: 100 }); canvas.dispatchEvent(event); });
    const notes = q(t, '[data-species-field-notes]'); notes.focus(); await React.act(async () => button.click()); expect(document.activeElement).toBe(notes); const framed = state(t), n = frames();
    await React.act(async () => { const event = new Event('pointermove', { bubbles: true }); Object.assign(event, { pointerId: 4, clientX: 240, clientY: 160 }); canvas.dispatchEvent(event); }); expect(state(t)).toEqual(framed); expect(frames()).toBe(n); expect(frameQueue.size).toBe(0); expect(JSON.stringify(t.data)).toBe(records);
    await click(q(t, '[data-specimen-turntable-toggle]')); await React.act(async () => { step(0); step(40); }); await click(button); expect(state(t).specimenTurntable).toBe('paused'); expect(Number(state(t).specimenTurn)).not.toBe(Number(framed.specimenTurn)); expect(document.activeElement).toBe(button); expect(frameQueue.size).toBe(0);
  });

  it('keeps framing anonymous and ungraded in an identification activity and retains locked feedback', async () => {
    const t = await mount('mystery'), records = JSON.stringify(t.data); await click(q(t, '[data-specimen-angle-button="front"]')); await click(q(t, '[data-specimen-frame]')); expect(Number(state(t).specimenScale)).toBeGreaterThan(1); expect(JSON.stringify(t.data)).toBe(records);
    const names = X.speciesText((k, v) => v); for (const id of ['clownfish', 'blue_tang']) expect(q(t, '[data-practice-specimen]').textContent).not.toContain(names[id].name); expect(q(t, '[data-specimen-canvas]').getAttribute('aria-label')).toBe('Interactive 3D model of the mystery organism');
    const id = q(t, '.cr-dxp-portrait img').getAttribute('src').split('/').pop().replace(/\.webp.*$/, ''); await click(q(t, '[data-practice-choice="' + id + '"]')); const feedback = q(t, '[data-practice-feedback]').textContent;
    await click(q(t, '[data-specimen-zoom="in"]')); await click(q(t, '[data-specimen-frame]')); expect(q(t, '[data-practice-feedback]').textContent).toBe(feedback); await click(q(t, '[data-practice-next]')); expect(q(t, '[data-specimen-canvas]')).toBeNull(); expect(models[0].dispose).toHaveBeenCalledTimes(1);
  });
});
