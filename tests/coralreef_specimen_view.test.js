import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
let X, renderers, models, observers, namespace, api, throwRender, badPrograms, lostContext, scroll, oldScroll;
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; renderers = []; models = []; observers = []; throwRender = false; badPrograms = false; lostContext = false;
  class Renderer {
    constructor(options) { this.canvas = options.canvas; this.capabilities = { isWebGL2: true }; this.ratio = 1; this.info = { programs: badPrograms ? [{ diagnostics: { runnable: false } }] : [] }; this.getContext = () => ({ isContextLost: () => lostContext }); this.render = vi.fn(() => { if (throwRender) throw Error('render failed'); }); this.dispose = vi.fn(); this.forceContextLoss = vi.fn(); renderers.push(this); }
    setPixelRatio(n) { this.ratio = n; } getPixelRatio() { return this.ratio; }
    setSize(w, h) { this.canvas.width = Math.round(w * this.ratio); this.canvas.height = Math.round(h * this.ratio); }
  }
  namespace = { ...THREE, WebGLRenderer: Renderer };
  api = { version: '1.0.0', info: () => ({ group: 'fish', portrait: { dir: [0, .3, 3.2], lookY: 0 } }), create: vi.fn(() => {
    const root = new THREE.Group(); root.add(new THREE.Mesh(new THREE.BoxGeometry(.4, .2, .1), new THREE.MeshBasicMaterial()));
    const model = { root, radius: .25, dispose: vi.fn(), update: vi.fn() }; models.push(model); return model;
  }) };
  window.THREE = namespace; window.Reef3DSpecies = api;
  vi.stubGlobal('ResizeObserver', class { constructor(callback) { this.callback = callback; this.disconnect = vi.fn(); observers.push(this); } observe() {} });
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addListener() {}, removeListener() {} })));
  scroll = vi.fn(); oldScroll = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: scroll });
  loadTool('stem_lab/stem_tool_coralreef.js', 'coralReef'); X = window.__RR_TEST_EXPORTS__.coralReef;
});
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); }
  delete window.THREE; delete window.Reef3DSpecies;
  if (oldScroll) Object.defineProperty(Element.prototype, 'scrollIntoView', oldScroll); else delete Element.prototype.scrollIntoView;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});
const q = (t, selector) => t.host.querySelector(selector);
async function click(el) { expect(el, 'control exists').toBeTruthy(); await React.act(async () => { el.focus(); el.click(); await new Promise(resolve => setTimeout(resolve, 0)); }); }
async function mount() {
  let data = { coralReef: { section: 'guide', guideSpeciesId: 'clownfish', speciesBookmarks: { clownfish: true }, speciesFieldNotes: { clownfish: 'Keep this note' }, speciesLog: { green_turtle: { firstSeen: 1 } } } };
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() { const [state, setState] = React.useState(data); data = state; return cfg.render({ React, toolData: state, setToolData: setState, t: (key, fallback) => fallback || key, reduceMotion: true }); }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell))); await click(q(t, '[data-open-study]')); return t;
}
function deferLoader() {
  delete window.THREE; delete window.Reef3DSpecies;
  let resolve; const promise = new Promise(done => { resolve = done; });
  window.StemLab.ensureThree = vi.fn(() => promise);
  return async () => { await React.act(async () => { window.THREE = namespace; window.Reef3DSpecies = api; resolve(namespace); await new Promise(done => setTimeout(done, 0)); }); };
}
const staticState = t => ['studyScale', 'studyPanX', 'studyPanY'].map(key => q(t, '[data-species-study]').dataset[key]);

describe('optional guide specimen inspection', () => {
  it('allocates only on opt-in, renders only on commands/resize, and retains exact portrait, marks and notes on return', async () => {
    const t = await mount(); expect(renderers).toHaveLength(0);
    await click(q(t, '[data-study-zoom="in"]')); await click(q(t, '[data-study-pan="right"]')); await click(q(t, '[data-study-mark="next"]'));
    const before = staticState(t), mark = q(t, '[data-study-mark-text]').textContent, records = JSON.stringify(t.data);
    await click(q(t, '[data-study-specimen-toggle]')); expect(renderers).toHaveLength(1); expect(q(t, '[data-specimen-status="ready"]')).toBeTruthy();
    expect(q(t, '[data-study-static]').hidden).toBe(true); expect(document.activeElement).toBe(q(t, '[data-study-specimen-toggle]'));
    expect(api.create.mock.calls[0][2]).toMatchObject({ seed: 7, quality: 'high', reducedMotion: true, health: 'healthy' });
    const frames = renderers[0].render.mock.calls.length; await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 35)); });
    expect(renderers[0].render).toHaveBeenCalledTimes(frames); expect(models[0].update).not.toHaveBeenCalled();
    await click(q(t, '[data-specimen-turn-button="right"]')); expect(Number(q(t, '[data-specimen-view]').dataset.specimenTurn)).toBeCloseTo(.25);
    const canvas = q(t, '[data-specimen-canvas]'); canvas.focus();
    await React.act(async () => canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true })));
    expect(Number(q(t, '[data-specimen-view]').dataset.specimenTilt)).toBeCloseTo(-.18);
    expect(staticState(t)).toEqual(before); await click(q(t, '[data-specimen-zoom="in"]')); expect(q(t, '[data-specimen-view]').dataset.specimenScale).toBe('1.25');
    await click(q(t, '[data-specimen-reset]')); expect(q(t, '[data-specimen-view]').dataset.specimenTurn).toBe('0');
    const beforeResize = renderers[0].render.mock.calls.length; observers[0].callback(); expect(renderers[0].render).toHaveBeenCalledTimes(beforeResize + 1);
    await click(q(t, '[data-study-specimen-toggle]')); expect(q(t, '[data-study-static]').hidden).toBe(false); expect(staticState(t)).toEqual(before);
    expect(q(t, '[data-study-mark-text]').textContent).toBe(mark); expect(JSON.stringify(t.data)).toBe(records);
    expect(models[0].dispose).toHaveBeenCalledTimes(1); expect(renderers[0].dispose).toHaveBeenCalledTimes(1); expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
    await click(q(t, '[data-close-study]')); expect(models[0].dispose).toHaveBeenCalledTimes(1);
  });

  it.each(['return', 'close'])('never allocates after %s cancels an unfinished loader', async action => {
    const t = await mount(), resolve = deferLoader(); await click(q(t, '[data-study-specimen-toggle]'));
    expect(q(t, '[data-specimen-status="loading"]')).toBeTruthy(); expect(q(t, '[data-study-static]').hidden).toBe(false);
    await click(q(t, action === 'return' ? '[data-study-specimen-toggle]' : '[data-close-study]')); await resolve();
    expect(renderers).toHaveLength(0); expect(api.create).not.toHaveBeenCalled();
  });

  it.each(['static', 'notes'])('handles asynchronous readiness without hiding %s focus or stealing external focus', async focus => {
    const t = await mount(), resolve = deferLoader(); await click(q(t, '[data-study-specimen-toggle]'));
    const focused = q(t, focus === 'static' ? '[data-study-zoom="in"]' : '[data-species-field-notes]'); focused.focus(); scroll.mockClear();
    // A late hero image failure must not begin a competing thumbnail renderer.
    await React.act(async () => q(t, '.crdx-art img').dispatchEvent(new Event('error')));
    expect(window.StemLab.ensureThree).toHaveBeenCalledTimes(1); await resolve();
    expect(renderers).toHaveLength(1);
    expect(document.activeElement).toBe(focus === 'static' ? q(t, '[data-study-specimen-toggle]') : focused);
    expect(scroll.mock.contexts).toEqual(focus === 'static' ? [q(t, '[data-study-specimen-toggle]')] : []);
  });

  it.each(['canvas', 'control'])('context loss disposes once and reveals a visible fallback from focused %s', async where => {
    const t = await mount(); await click(q(t, '[data-study-specimen-toggle]'));
    q(t, where === 'canvas' ? '[data-specimen-canvas]' : '[data-specimen-turn-button="right"]').focus(); scroll.mockClear();
    await React.act(async () => q(t, '[data-specimen-canvas]').dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
    expect(q(t, '[data-specimen-status="error"]')).toBeTruthy(); expect(q(t, '[data-study-static]').hidden).toBe(false);
    expect(document.activeElement).toBe(q(t, '[data-study-specimen-toggle]')); expect(scroll.mock.contexts).toEqual([q(t, '[data-study-specimen-toggle]')]);
    expect(models[0].dispose).toHaveBeenCalledTimes(1); expect(renderers[0].dispose).toHaveBeenCalledTimes(1);
    await click(q(t, '[data-study-specimen-toggle]')); expect(models[0].dispose).toHaveBeenCalledTimes(1);
  });

  it('keeps the portrait and field marks after a first-render failure and disposes partial setup once', async () => {
    const t = await mount(); throwRender = true; await click(q(t, '[data-study-specimen-toggle]'));
    expect(q(t, '[data-specimen-status="error"]')).toBeTruthy(); expect(q(t, '[data-study-static]').hidden).toBe(false);
    expect(q(t, '[data-study-mark-text]').textContent.length).toBeGreaterThan(10);
    expect(models[0].dispose).toHaveBeenCalledTimes(1); expect(renderers[0].dispose).toHaveBeenCalledTimes(1);
    await click(q(t, '[data-close-study]')); expect(models[0].dispose).toHaveBeenCalledTimes(1);
  });

  it.each(['shader', 'context'])('retains the portrait when initial %s readiness fails without a render exception', async failure => {
    const t = await mount(); badPrograms = failure === 'shader'; lostContext = failure === 'context';
    await click(q(t, '[data-study-specimen-toggle]'));
    expect(q(t, '[data-specimen-status="error"]')).toBeTruthy(); expect(q(t, '[data-study-static]').hidden).toBe(false);
    expect(models[0].dispose).toHaveBeenCalledTimes(1); expect(renderers[0].dispose).toHaveBeenCalledTimes(1);
    await click(q(t, '[data-close-study]')); expect(models[0].dispose).toHaveBeenCalledTimes(1);
  });

  it('fits valid tiny and base-origin models to centered bounds and reserves radius fallback for empty bounds', () => {
    const root = new THREE.Group(), mesh = new THREE.Mesh(new THREE.BoxGeometry(.02, .04, .01), new THREE.MeshBasicMaterial());
    mesh.position.y = .02; root.add(mesh);
    const valid = X.marineSpecimenBounds(THREE, { root, radius: 2 });
    expect(valid.center.y).toBeCloseTo(.02); expect(valid.radius).toBeCloseTo(Math.sqrt(.02*.02 + .04*.04 + .01*.01)/2);
    expect(X.marineSpecimenBounds(THREE, { root: new THREE.Group(), radius: .003 }).radius).toBe(.003);
  });

  it('exposes no interactive model from a practice-origin profile', async () => {
    const t = await mount(); await click(q(t, '[data-close-study]')); await click(q(t, '[data-close-profile]')); await click(q(t, '[data-start-practice]'));
    const select = q(t, '[data-practice-collection-select]'); await React.act(async () => { select.value = 'saved'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    await click(q(t, '[data-practice-start]')); expect(q(t, '[data-study-specimen-toggle]')).toBeNull();
    await click(q(t, '[data-practice-skip]')); await click([...t.host.querySelectorAll('button')].find(el => el.textContent === 'Study profile')); await click(q(t, '[data-open-study]'));
    expect(q(t, '[data-study-specimen-toggle]')).toBeNull(); expect(renderers).toHaveLength(0); expect(t.data.speciesPractice).toBeUndefined();
  });

  it('includes transformed instance vertices and respects published posed batch boxes', () => {
    const root = new THREE.Group(), geometry = new THREE.BoxGeometry(1, 1, 1), instances = new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial(), 2);
    instances.setMatrixAt(0, new THREE.Matrix4().makeTranslation(-4, 0, 0)); instances.setMatrixAt(1, new THREE.Matrix4().makeTranslation(8, 0, 0)); root.add(instances);
    const batch = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()); batch.geometry.boundingBox = new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 5, 1)); batch.position.y = 3; root.add(batch);
    const result = X.marineSpecimenBounds(THREE, { root, radius: .01 });
    expect(result.center.x).toBeCloseTo(2); expect(result.center.y).toBeCloseTo(3.75);
    for (const point of [new THREE.Vector3(-4.5, -.5, -.5), new THREE.Vector3(8.5, .5, .5), new THREE.Vector3(1, 8, 1)]) expect(point.distanceTo(result.center)).toBeLessThanOrEqual(result.radius + 1e-6);
  });
  it('offers fitted front, side and above views while reset restores the exact authored camera', () => {
    const canvas = document.createElement('canvas'); Object.defineProperty(canvas, 'clientWidth', { value: 390 }); Object.defineProperty(canvas, 'clientHeight', { value: 260 });
    document.body.appendChild(canvas);
    const controller = X.createMarineSpecimenController(namespace, canvas, 'clownfish', vi.fn());
    const camera = () => renderers[0].render.mock.calls.at(-1)[1];
    const snapshot = () => ({ position: camera().position.toArray(), rotation: camera().quaternion.toArray(), projection: [...camera().projectionMatrix.elements] });
    const initial = snapshot();
    for (const name of ['front', 'side', 'above']) {
      controller.zoom(1); controller.pan(.2, -.2); controller.turn(.2, .2);
      expect(controller.setAngle(name)).toMatchObject({ scale: 1, panX: 0, panY: 0, angle: name });
      const direction = camera().position.clone().normalize();
      if (name === 'front') expect(direction.x).toBeCloseTo(1); else if (name === 'side') expect(direction.z).toBeCloseTo(1); else expect(direction.y).toBeGreaterThan(.99);
      const position = models[0].root.children[0].geometry.attributes.position;
      camera().updateMatrixWorld(true);
      for (let i = 0; i < position.count; i++) {
        const p = new THREE.Vector3().fromBufferAttribute(position, i).project(camera());
        expect(Math.abs(p.x)).toBeLessThan(.9); expect(Math.abs(p.y)).toBeLessThan(.9);
      }
    }
    expect(controller.reset()).toMatchObject({ scale: 1, panX: 0, panY: 0, turn: 0, tilt: 0, angle: 'portrait' }); expect(snapshot()).toEqual(initial);
    controller.dispose(); canvas.remove();
  });

  it('pans only when zoomed, clamps movement, and brings it back inside bounds when zooming out', () => {
    const canvas = document.createElement('canvas'); Object.defineProperty(canvas, 'clientWidth', { value: 390 }); Object.defineProperty(canvas, 'clientHeight', { value: 260 });
    const controller = X.createMarineSpecimenController(namespace, canvas, 'clownfish', vi.fn());
    const frames = () => renderers[0].render.mock.calls.length, initialFrames = frames();
    expect(controller.pan(1, 1)).toMatchObject({ panX: 0, panY: 0 }); expect(frames()).toBe(initialFrames);
    controller.zoom(1); expect(controller.pan(100, -100)).toMatchObject({ panX: .5, panY: -.5, scale: 2 });
    const boundedFrames = frames(); controller.pan(100, -100); expect(frames()).toBe(boundedFrames);
    expect(controller.zoom(-.75)).toMatchObject({ scale: 1.25, panX: .2, panY: -.2 });
    expect(controller.zoom(-.25)).toMatchObject({ scale: 1, panX: 0, panY: 0 });
    const beforeInvalid = frames(); controller.setAngle('unknown'); expect(frames()).toBe(beforeInvalid);
    controller.dispose(); const beforeDisposed = frames(); controller.pan(1, 1); controller.setAngle('front'); controller.reset(); expect(frames()).toBe(beforeDisposed);
  });

  it('uses sessile front and side axes without changing the authored reset view', () => {
    api.info = () => ({ group: 'coral', habit: 'sessile', portrait: { dir: [1.6, 1, 3.2] } });
    const canvas = document.createElement('canvas'), controller = X.createMarineSpecimenController(namespace, canvas, 'staghorn_coral', vi.fn());
    const camera = renderers[0].render.mock.calls[0][1], initial = camera.position.toArray();
    controller.setAngle('front'); expect(camera.position.clone().normalize().z).toBeCloseTo(1);
    controller.setAngle('side'); expect(camera.position.clone().normalize().x).toBeCloseTo(1);
    controller.reset(); expect(camera.position.toArray()).toEqual(initial); controller.dispose();
  });

  it('makes zoomed detail movement available through mode buttons, keyboard and drag without changing the portrait or records', async () => {
    const t = await mount(), before = staticState(t), records = JSON.stringify(t.data);
    await click(q(t, '[data-study-specimen-toggle]'));
    expect(q(t, '[data-specimen-mode-button="move"]').getAttribute('aria-disabled')).toBe('true');
    await click(q(t, '[data-specimen-mode-button="move"]')); expect(q(t, '[data-specimen-view]').dataset.specimenMode).toBe('turn');
    await click(q(t, '[data-specimen-zoom="in"]')); const canvas = q(t, '[data-specimen-canvas]'); canvas.focus();
    await React.act(async () => canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true, cancelable: true })));
    expect(Number(q(t, '[data-specimen-view]').dataset.specimenPanX)).toBeGreaterThan(0); expect(Number(q(t, '[data-specimen-view]').dataset.specimenTurn)).toBe(0);
    await click(q(t, '[data-specimen-mode-button="move"]')); expect(q(t, '[data-specimen-mode-button="move"]').getAttribute('aria-pressed')).toBe('true');
    await click(q(t, '[data-specimen-pan-button="up"]')); expect(Number(q(t, '[data-specimen-view]').dataset.specimenPanY)).toBeGreaterThan(0);
    canvas.getBoundingClientRect = () => ({ width: 390, height: 260 });
    const pointer = (type, x, y) => { const e = new Event(type, { bubbles: true }); Object.assign(e, { pointerId: 3, button: 0, clientX: x, clientY: y }); canvas.dispatchEvent(e); };
    await React.act(async () => { pointer('pointerdown', 150, 100); pointer('pointermove', 50, 170); pointer('pointerup', 50, 170); });
    expect(Number(q(t, '[data-specimen-view]').dataset.specimenPanX)).toBeLessThan(0); expect(Number(q(t, '[data-specimen-view]').dataset.specimenPanY)).toBeLessThan(0);
    await click(q(t, '[data-specimen-angle-button="front"]')); expect(q(t, '[data-specimen-view]').dataset).toMatchObject({ specimenScale: '1', specimenPanX: '0', specimenPanY: '0', specimenMode: 'turn', specimenAngle: 'front' });
    expect(q(t, '[data-specimen-angle-button="front"]').getAttribute('aria-pressed')).toBe('true');
    await click(q(t, '[data-specimen-reset]')); expect(q(t, '[data-specimen-view]').dataset).toMatchObject({ specimenScale: '1', specimenTurn: '0', specimenTilt: '0', specimenPanX: '0', specimenPanY: '0', specimenAngle: 'portrait' });
    expect(staticState(t)).toEqual(before); expect(JSON.stringify(t.data)).toBe(records);
  });

});
