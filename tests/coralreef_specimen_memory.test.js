import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
let X, namespace, api, renderers, models, observers;
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; renderers = []; models = []; observers = [];
  class Renderer {
    constructor(options) { this.canvas = options.canvas; this.capabilities = { isWebGL2: true }; this.ratio = 1; this.info = { programs: [] }; this.getContext = () => ({ isContextLost: () => false }); this.render = vi.fn(); this.dispose = vi.fn(); this.forceContextLoss = vi.fn(); renderers.push(this); }
    setPixelRatio(n) { this.ratio = n; } getPixelRatio() { return this.ratio; }
    setSize(w, h) { this.canvas.width = Math.round(w * this.ratio); this.canvas.height = Math.round(h * this.ratio); }
  }
  namespace = { ...THREE, WebGLRenderer: Renderer };
  api = { version: '1.0.0', info: () => ({ group: 'fish', portrait: { dir: [.3, .5, 3.2], lookY: 0 } }), create: vi.fn(() => { const root = new THREE.Group(), mesh = new THREE.Mesh(new THREE.BoxGeometry(.4, .2, .1), new THREE.MeshBasicMaterial()); mesh.position.y = .1; root.add(mesh); const model = { root, radius: .25, dispose: vi.fn(), update: vi.fn() }; models.push(model); return model; }) };
  window.THREE = namespace; window.Reef3DSpecies = api;
  vi.stubGlobal('ResizeObserver', class { constructor(callback) { this.callback = callback; this.disconnect = vi.fn(); observers.push(this); } observe() {} });
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addListener() {}, removeListener() {} })));
  loadTool('stem_lab/stem_tool_coralreef.js', 'coralReef'); X = window.__RR_TEST_EXPORTS__.coralReef;
});
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } delete window.THREE; delete window.Reef3DSpecies; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function controller() {
  const canvas = document.createElement('canvas'); let width = 390, height = 260;
  Object.defineProperty(canvas, 'clientWidth', { get: () => width }); Object.defineProperty(canvas, 'clientHeight', { get: () => height });
  const c = X.createMarineSpecimenController(namespace, canvas, 'clownfish', vi.fn()), r = renderers.at(-1), model = models.at(-1);
  const camera = () => r.render.mock.calls.at(-1)[1], scene = () => r.render.mock.calls.at(-1)[0];
  return { c, r, model, camera, scene, resize(w, h) { width = w; height = h; observers.at(-1).callback(); } };
}
function lights(t) { const scene = t.scene(), hemi = scene.children.find(n => n.isHemisphereLight), sun = scene.children.find(n => n.isDirectionalLight); return { background: scene.background.getHex(), sky: hemi.color.getHex(), ground: hemi.groundColor.getHex(), fill: hemi.intensity, key: sun.intensity }; }
function cameraState(t) { const camera = t.camera(); return [...camera.position.toArray(), ...camera.quaternion.toArray(), ...camera.projectionMatrix.elements]; }
const q = (t, s) => t.host.querySelector(s), dataView = t => ({ ...q(t, '[data-specimen-view]').dataset });
async function click(el) { expect(el, 'control exists').toBeTruthy(); await React.act(async () => { el.focus(); el.click(); await new Promise(resolve => setTimeout(resolve, 0)); }); }
async function mount(kind = 'study') {
  let data = { coralReef: { section: 'guide', guideSpeciesId: kind === 'study' ? 'clownfish' : null, speciesBookmarks: { clownfish: true, blue_tang: true }, speciesFieldNotes: { clownfish: 'Keep this note' }, speciesLog: { green_turtle: { firstSeen: 1 } } } };
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() { const [state, setState] = React.useState(data); data = state; return cfg.render({ React, toolData: state, setToolData: setState, t: (k, v) => v || k, reduceMotion: true }); }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t); await React.act(async () => root.render(React.createElement(Shell)));
  if (kind === 'study') { await click(q(t, '[data-open-study]')); await click(q(t, '[data-study-specimen-toggle]')); }
  else { await click(q(t, '[data-start-practice]')); await React.act(async () => { const select = q(t, '[data-practice-collection-select]'); select.value = 'saved'; select.dispatchEvent(new Event('change', { bubbles: true })); }); await click(q(t, '[data-practice-start]')); await click(q(t, '[data-practice-specimen-toggle]')); }
  return t;
}

describe('one local remembered inspection view', () => {
  it('restores pose, bounded pan and lighting atomically in one frame without mutating the saved snapshot or model resources', () => {
    const t = controller(), geometry = t.model.root.children[0].geometry, material = t.model.root.children[0].material;
    t.c.turn(.43, -.27); t.c.zoom(1.25); t.c.pan(.12, -.1); t.c.setLighting('studio'); const saved = t.c.getView(), original = { ...saved }, rememberedCamera = cameraState(t), rememberedLights = lights(t);
    t.c.setAngle('below'); t.c.setLighting('reef'); const frames = t.r.render.mock.calls.length;
    expect(t.c.restoreView(saved)).toEqual(original); expect(t.r.render).toHaveBeenCalledTimes(frames + 1); cameraState(t).forEach((n, i) => expect(n).toBeCloseTo(rememberedCamera[i], 12)); expect(lights(t)).toEqual(rememberedLights); expect(saved).toEqual(original);
    expect(t.model.root.children[0].geometry).toBe(geometry); expect(t.model.root.children[0].material).toBe(material); expect(api.create).toHaveBeenCalledTimes(1); expect(models[0].update).not.toHaveBeenCalled();
    const beforeNoop = t.r.render.mock.calls.length; expect(t.c.restoreView(saved)).toEqual(original); expect(t.r.render).toHaveBeenCalledTimes(beforeNoop);
    t.c.dispose(); expect(t.c.restoreView(saved)).toEqual(original); expect(t.r.render).toHaveBeenCalledTimes(beforeNoop); expect(t.model.dispose).toHaveBeenCalledTimes(1);
  });

  it('recomputes restoration against the current aspect and actual model bounds after resizing', () => {
    const t = controller(); t.c.setAngle('opposite'); const fitted = t.c.getView(); const original = cameraState(t); t.c.zoom(2); t.c.pan(.1, .1); const detail = t.c.getView(); t.c.reset(); t.resize(900, 380);
    const frames = t.r.render.mock.calls.length; expect(t.c.restoreView(detail)).toEqual(detail); expect(t.r.render).toHaveBeenCalledTimes(frames + 1); expect(t.camera().aspect).toBe(900 / 380); expect(cameraState(t)).not.toEqual(original);
    const bounds = X.marineSpecimenBounds(namespace, t.model); expect(t.camera().position.distanceTo(bounds.center) - bounds.radius).toBeGreaterThan(t.camera().near);
    t.c.restoreView(fitted); const camera = t.camera(); camera.updateMatrixWorld(true); const mesh = t.model.root.children[0], position = mesh.geometry.attributes.position; t.model.root.updateMatrixWorld(true);
    for (let i = 0; i < position.count; i++) { const p = new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).project(camera); expect(Math.abs(p.x)).toBeLessThan(.9); expect(Math.abs(p.y)).toBeLessThan(.9); expect(Math.abs(p.z)).toBeLessThan(1); }
    t.c.dispose();
  });

  it('rejects malformed, nonfinite, out-of-bounds and accessor snapshots without a partial pose, light or frame change', () => {
    const t = controller(); t.c.zoom(1); t.c.pan(.1, -.1); t.c.setLighting('studio'); const saved = t.c.getView(), state = cameraState(t), light = lights(t), frames = t.r.render.mock.calls.length; let reads = 0;
    const getter = { ...saved }; Object.defineProperty(getter, 'turn', { get() { reads++; throw Error('must not read'); } });
    const inherited = Object.create(saved), custom = Object.assign(Object.create({ custom: true }), saved), throwing = new Proxy({}, { getPrototypeOf() { throw Error('invalid proxy'); } });
    const invalid = [null, undefined, false, 0, 'view', [], new Date(), inherited, custom, getter, throwing, { ...saved, scale: '2' }, { ...saved, scale: .9 }, { ...saved, scale: 3.1 }, { ...saved, scale: NaN }, { ...saved, turn: Infinity }, { ...saved, tilt: -Infinity }, { ...saved, panX: NaN }, { ...saved, panY: Infinity }, { ...saved, panX: .51 }, { ...saved, panY: -.51 }, { ...saved, tilt: saved.tilt + Math.PI }, { ...saved, tilt: saved.tilt - Math.PI }, { ...saved, angle: 'backwards' }, { ...saved, lighting: 'fluorescence' }, { ...saved, lighting: null }, { scale: 2 }];
    for (const bad of invalid) { expect(t.c.restoreView(bad)).toEqual(saved); expect(cameraState(t)).toEqual(state); expect(lights(t)).toEqual(light); expect(t.r.render).toHaveBeenCalledTimes(frames); }
    expect(reads).toBe(0); t.c.dispose(); expect(t.c.restoreView(throwing)).toEqual(saved); expect(t.r.render).toHaveBeenCalledTimes(frames);
  });

  it.each(['fish', 'coral'])('round-trips genuine %s snapshots at both safe pole limits and maximum pan/zoom', group => {
    api.info = () => ({ group, habit: group === 'coral' ? 'sessile' : 'pair', portrait: { dir: [1.6, 1, 3.2] } }); const t = controller();
    for (const tilt of [-100, 100]) { t.c.reset(); t.c.turn(.3, tilt); t.c.zoom(2); t.c.pan(100, -100); const saved = t.c.getView(); t.c.reset(); const returned = t.c.restoreView(saved); expect(returned.scale).toBe(3); expect(returned.panX).toBeCloseTo(2 / 3); expect(returned.panY).toBeCloseTo(-2 / 3); expect(returned.tilt).toBeCloseTo(saved.tilt, 12); expect(returned.turn).toBeCloseTo(saved.turn, 12); const frames = t.r.render.mock.calls.length; t.c.restoreView(saved); expect(t.r.render).toHaveBeenCalledTimes(frames); }
    t.c.dispose();
  });

  it('keeps remembering optional, replaces one view, restores across presets/reset, and forgets on close while retaining study records', async () => {
    const t = await mount(), records = JSON.stringify(t.data), disclosure = q(t, '[data-specimen-memory]'); expect(disclosure.open).toBe(false); expect(q(t, '[data-specimen-restore]').getAttribute('aria-disabled')).toBe('true'); await React.act(async () => { disclosure.open = true; });
    let frames = renderers[0].render.mock.calls.length; await click(q(t, '[data-specimen-restore]')); expect(renderers[0].render).toHaveBeenCalledTimes(frames); await click(q(t, '[data-specimen-remember]')); expect(renderers[0].render).toHaveBeenCalledTimes(frames);
    await click(q(t, '[data-specimen-zoom="in"]')); await click(q(t, '[data-specimen-turn-button="right"]')); await click(q(t, '[data-specimen-light-button="studio"]')); await click(q(t, '[data-specimen-mode-button="move"]')); await click(q(t, '[data-specimen-pan-button="up"]')); const saved = dataView(t);
    frames = renderers[0].render.mock.calls.length; await click(q(t, '[data-specimen-remember]')); expect(renderers[0].render).toHaveBeenCalledTimes(frames); expect(q(t, '[data-specimen-memory-status]').textContent).toContain('View remembered'); expect(document.activeElement).toBe(q(t, '[data-specimen-remember]'));
    await click(q(t, '[data-specimen-angle-button="below"]')); await click(q(t, '[data-specimen-light-button="reef"]')); await click(q(t, '[data-specimen-reset]')); frames = renderers[0].render.mock.calls.length; await click(q(t, '[data-specimen-restore]')); expect(renderers[0].render).toHaveBeenCalledTimes(frames + 1); expect(dataView(t)).toEqual({ ...saved, specimenMode: 'turn' }); expect(document.activeElement).toBe(q(t, '[data-specimen-restore]'));
    frames = renderers[0].render.mock.calls.length; await click(q(t, '[data-specimen-restore]')); expect(renderers[0].render).toHaveBeenCalledTimes(frames); expect(JSON.stringify(t.data)).toBe(records);
    await click(q(t, '[data-study-specimen-toggle]')); await click(q(t, '[data-study-specimen-toggle]')); expect(q(t, '[data-specimen-memory]').open).toBe(false); expect(q(t, '[data-specimen-restore]').getAttribute('aria-disabled')).toBe('true'); expect(models[0].dispose).toHaveBeenCalledTimes(1);
  });

  it('keeps remembered mystery views anonymous and local to one question without changing identification help or discoveries', async () => {
    const t = await mount('mystery'), records = JSON.stringify(t.data); await React.act(async () => { q(t, '[data-specimen-memory]').open = true; }); await click(q(t, '[data-specimen-remember]')); await click(q(t, '[data-specimen-angle-button="opposite"]')); await click(q(t, '[data-specimen-restore]'));
    expect(q(t, '[data-specimen-canvas]').getAttribute('aria-label')).toBe('Interactive 3D model of the mystery organism'); expect(q(t, '[data-specimen-memory]').textContent).not.toMatch(/clownfish|tang|Amphiprion|Paracanthurus/i); expect(JSON.stringify(t.data)).toBe(records);
    const id = q(t, '.cr-dxp-portrait img').getAttribute('src').split('/').pop().replace(/\.webp.*$/, ''); await click(q(t, '[data-practice-choice="' + id + '"]')); await click(q(t, '[data-practice-next]')); expect(q(t, '[data-specimen-canvas]')).toBeNull(); await click(q(t, '[data-practice-specimen-toggle]')); expect(q(t, '[data-specimen-restore]').getAttribute('aria-disabled')).toBe('true'); expect(q(t, '[data-specimen-memory]').open).toBe(false); expect(t.data.speciesPractice).toBeUndefined(); expect(t.data.speciesLog).toEqual({ green_turtle: { firstSeen: 1 } }); expect(models[0].dispose).toHaveBeenCalledTimes(1);
  });

  it('never moves external focus when restoring, and failure from the remembered-view control recovers only owned focus', async () => {
    const t = await mount(); await React.act(async () => { q(t, '[data-specimen-memory]').open = true; }); await click(q(t, '[data-specimen-remember]')); await click(q(t, '[data-specimen-angle-button="below"]')); const notes = q(t, '[data-species-field-notes]'); notes.focus(); await React.act(async () => q(t, '[data-specimen-restore]').click()); expect(document.activeElement).toBe(notes);
    await click(q(t, '[data-specimen-restore]')); await React.act(async () => q(t, '[data-specimen-canvas]').dispatchEvent(new Event('webglcontextlost', { cancelable: true }))); expect(q(t, '[data-specimen-status="error"]')).toBeTruthy(); expect(document.activeElement).toBe(q(t, '[data-study-specimen-toggle]')); expect(q(t, '[data-study-static]').hidden).toBe(false); expect(models[0].dispose).toHaveBeenCalledTimes(1); expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
  });
});
