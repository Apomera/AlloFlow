import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [], owned = [];
let X, namespace, api, renderers, models, observers, frameQueue, nextFrame, modelLength;
beforeEach(() => {
  frameQueue = new Map(); nextFrame = 1; modelLength = 1;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { const id = nextFrame++; frameQueue.set(id, callback); return id; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frameQueue.delete(id));
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(1);
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; renderers = []; models = []; observers = [];
  class Renderer {
    constructor(options) { this.canvas = options.canvas; this.capabilities = { isWebGL2: true }; this.ratio = 1; this.info = { programs: [] }; this.getContext = () => ({ isContextLost: () => false }); this.render = vi.fn(); this.dispose = vi.fn(); this.forceContextLoss = vi.fn(); renderers.push(this); }
    setPixelRatio(n) { this.ratio = n; } getPixelRatio() { return this.ratio; }
    setSize(w, h) { this.canvas.width = Math.round(w * this.ratio); this.canvas.height = Math.round(h * this.ratio); }
  }
  namespace = { ...THREE, WebGLRenderer: Renderer };
  api = { version: '1.0.0', info: () => ({ group: 'fish', portrait: { dir: [.3, .5, 3.2], lookY: 0 } }), create: vi.fn(() => {
    const root = new THREE.Group(), mesh = new THREE.Mesh(new THREE.BoxGeometry(modelLength, modelLength * .16, modelLength * .12), new THREE.MeshBasicMaterial());
    root.position.set(.2, .1, -.1); root.add(mesh); const model = { root, radius: modelLength * .6, dispose: vi.fn(), update: vi.fn() }; models.push(model); return model;
  }) };
  window.THREE = namespace; window.Reef3DSpecies = api;
  vi.stubGlobal('ResizeObserver', class { constructor(callback) { this.callback = callback; this.disconnect = vi.fn(); observers.push(this); } observe() {} });
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addListener() {}, removeListener() {} })));
  loadTool('stem_lab/stem_tool_coralreef.js', 'coralReef'); X = window.__RR_TEST_EXPORTS__.coralReef;
});
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } while (owned.length) owned.pop().dispose(); delete window.THREE; delete window.Reef3DSpecies; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const q = (t, selector) => t.host.querySelector(selector);
function step(time) { const callbacks = [...frameQueue.values()]; frameQueue.clear(); for (const callback of callbacks) callback(time); }
function controller(width = 400, height = 400, changed = vi.fn(), failure = vi.fn()) {
  const canvas = document.createElement('canvas'); Object.defineProperties(canvas, { clientWidth: { configurable: true, value: width }, clientHeight: { configurable: true, value: height } });
  const c = X.createMarineSpecimenController(namespace, canvas, 'clownfish', failure, vi.fn(), changed); owned.push(c); return c;
}
const frames = () => renderers[0].render.mock.calls.length;
function projectionWidth(c, index = 0) {
  const camera = renderers[index].render.mock.calls.at(-1)[1]; camera.updateMatrixWorld(true);
  const center = new THREE.Box3().setFromObject(models[index].root).getCenter(new THREE.Vector3());
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const a = center.clone().addScaledVector(right, -c.getScaleGuide().metres / 2).project(camera);
  const b = center.clone().addScaledVector(right, c.getScaleGuide().metres / 2).project(camera);
  return (b.x - a.x) * renderers[index].canvas.clientWidth / 2;
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

describe('optional physical model scale guide', () => {
  it.each([[240, 480], [320, 360], [400, 400], [800, 400]])('represents a real projected world distance in CSS pixels at %i by %i', (width, height) => {
    const changed = vi.fn(), c = controller(width, height, changed), measure = c.getScaleGuide();
    expect(measure.pixels).toBeCloseTo(projectionWidth(c), 8); expect(measure.pixels).toBeGreaterThan(0); expect(measure.pixels).toBeLessThanOrEqual(Math.min(120, width * .28));
    const magnitude = 10 ** Math.floor(Math.log10(measure.metres)); expect([1, 2, 5]).toContain(Number((measure.metres / magnitude).toPrecision(10)));
    expect(Number(measure.value) * ({ mm: .001, cm: .01, m: 1 }[measure.unit])).toBeCloseTo(measure.metres, 12); expect(changed).toHaveBeenCalledTimes(1); expect(changed.mock.calls[0][0]).toEqual(measure);
    const original = c.getScaleGuide(); measure.pixels = 999; changed.mock.calls[0][0].metres = 999; expect(c.getScaleGuide()).toEqual(original); expect(frames()).toBe(1); expect(frameQueue.size).toBe(0);
  });

  it.each([[.005, 'mm'], [1, 'cm'], [20, 'm']])('formats a %s metre model in readable %s units', (length, unit) => {
    modelLength = length; const c = controller(); expect(c.getScaleGuide().unit).toBe(unit); expect(c.getScaleGuide().value).not.toMatch(/e|000000/); expect(c.getScaleGuide().pixels).toBeCloseTo(projectionWidth(c), 8);
  });

  it('does not confuse high-density drawing buffers with CSS display distances', () => {
    const standard = controller(320, 360).getScaleGuide(); vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(3); const dense = controller(320, 360);
    expect(renderers[1].canvas.width).toBe(480); expect(renderers[1].canvas.height).toBe(540); expect(dense.getScaleGuide()).toEqual(standard); expect(dense.getScaleGuide().pixels).toBeCloseTo(projectionWidth(dense, 1), 8);
  });

  it('updates after zoom, resize, framing and recalled views while preserving the pose and materials', () => {
    const changed = vi.fn(), c = controller(400, 400, changed), initial = c.getScaleGuide(), original = c.getView(), mesh = models[0].root.children[0], geometry = mesh.geometry, material = mesh.material;
    c.zoom(.25); const zoomed = c.getScaleGuide(), zoomedView = c.getView(); expect(zoomed.pixels / zoomed.metres).toBeCloseTo(initial.pixels / initial.metres * 1.25, 9); expect(zoomed.pixels).toBeCloseTo(projectionWidth(c), 8);
    c.restoreView(original); expect(c.getScaleGuide()).toEqual(initial); c.restoreView(zoomedView); expect(c.getScaleGuide()).toEqual(zoomed);
    Object.defineProperty(renderers[0].canvas, 'clientWidth', { configurable: true, value: 240 }); observers[0].callback(); expect(c.getView()).toEqual(zoomedView); expect(c.getScaleGuide().pixels).toBeCloseTo(projectionWidth(c), 8); expect(c.getScaleGuide()).not.toEqual(zoomed);
    c.setAngle('front'); const wider = c.getScaleGuide(); c.frameView(); expect(c.getView().scale).toBeGreaterThan(1); expect(c.getScaleGuide().pixels / c.getScaleGuide().metres).toBeGreaterThan(wider.pixels / wider.metres); expect(c.getScaleGuide().pixels).toBeCloseTo(projectionWidth(c), 8);
    expect(mesh.geometry).toBe(geometry); expect(mesh.material).toBe(material); expect(models[0].update).not.toHaveBeenCalled(); expect(changed.mock.calls.length).toBeGreaterThan(4);
  });

  it('does not notify on unchanged resizes, lighting, panning, turns or turntable frames', () => {
    const changed = vi.fn(), c = controller(400, 400, changed); c.zoom(.5); changed.mockClear(); const initial = c.getScaleGuide();
    c.pan(.04, -.02); c.turn(.2, -.1); c.setLighting('detail'); c.setBackground('dark'); c.setAppearance('silhouette'); observers[0].callback(); c.setTurntable(true); step(0); step(40); step(80); step(120);
    expect(c.getScaleGuide()).toEqual(initial); expect(changed).not.toHaveBeenCalled(); expect(c.isTurntableRunning()).toBe(true); expect(frameQueue.size).toBe(1); c.setTurntable(false);
  });

  it('clears the cached ruler after context failure and never notifies after disposal', () => {
    const changed = vi.fn(), failed = vi.fn(), c = controller(400, 400, changed, failed); c.setTurntable(true); step(0); changed.mockClear(); renderers[0].render.mockImplementationOnce(() => { throw Error('render failed'); }); c.zoom(.25);
    expect(failed).toHaveBeenCalledTimes(1); expect(c.getScaleGuide()).toBeNull(); expect(frameQueue.size).toBe(0); c.dispose(); c.zoom(.25); observers[0].callback(); expect(changed).not.toHaveBeenCalled();
    expect(models[0].dispose).toHaveBeenCalledTimes(1); expect(renderers[0].dispose).toHaveBeenCalledTimes(1); expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
  });

  it('starts hidden, uses a focused native disclosure, and keeps measurements quiet and below the canvas', async () => {
    const t = await mount(), records = JSON.stringify(t.data), button = q(t, '[data-specimen-scale-toggle]'), region = q(t, '[data-specimen-scale-guide]'), canvas = q(t, '[data-specimen-canvas]');
    expect(button.tagName).toBe('BUTTON'); expect(button.type).toBe('button'); expect(button.textContent).toBe('Show scale guide'); expect(button.getAttribute('aria-expanded')).toBe('false'); expect(region.hidden).toBe(true); expect(document.getElementById(button.getAttribute('aria-controls'))).toBe(region);
    await click(button); expect(document.activeElement).toBe(button); expect(button.textContent).toBe('Hide scale guide'); expect(region.hidden).toBe(false); expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(canvas.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); expect(region.querySelector('[role="status"],[aria-live]')).toBeNull(); expect(region.closest('[role="status"],[aria-live]')).toBeNull(); expect(region.textContent).toContain('Approximate model scale'); expect(region.textContent).toContain('individuals vary'); expect(region.textContent).not.toMatch(/actual size|screen size/i);
    const ruler = q(t, '[data-specimen-scale-ruler]'); expect(ruler.getAttribute('aria-hidden')).toBe('true'); expect(parseFloat(ruler.style.width)).toBe(Number(ruler.dataset.scalePixels));
    await click(q(t, '[data-specimen-turntable-toggle]')); const previous = region.textContent; await React.act(async () => { step(0); step(40); step(80); }); expect(region.textContent).toBe(previous); expect(q(t, '[data-specimen-view]').dataset.specimenTurntable).toBe('running'); await click(button); expect(q(t, '[data-specimen-view]').dataset.specimenTurntable).toBe('running'); expect(region.hidden).toBe(true); expect(JSON.stringify(t.data)).toBe(records);
    await click(q(t, '[data-study-specimen-toggle]')); expect(models[0].dispose).toHaveBeenCalledTimes(1); await click(q(t, '[data-study-specimen-toggle]')); expect(q(t, '[data-specimen-scale-guide]').hidden).toBe(true); expect(q(t, '[data-specimen-scale-toggle]').textContent).toBe('Show scale guide');
  });

  it('preserves scale visibility through Remember, Swap and Fit without persisting learning records', async () => {
    const t = await mount(), records = JSON.stringify(t.data); await click(q(t, '[data-specimen-scale-toggle]')); await click(q(t, '[data-specimen-zoom="in"]'));
    const zoomed = q(t, '[data-specimen-scale-ruler]').dataset.scalePixels, metres = q(t, '[data-specimen-scale-ruler]').dataset.scaleMetres; await click(q(t, '[data-specimen-remember]')); await click(q(t, '[data-specimen-fit]'));
    expect(q(t, '[data-specimen-scale-guide]').hidden).toBe(false); await click(q(t, '[data-specimen-restore]')); expect(q(t, '[data-specimen-scale-ruler]').dataset.scalePixels).toBe(zoomed); expect(q(t, '[data-specimen-scale-ruler]').dataset.scaleMetres).toBe(metres);
    await click(q(t, '[data-specimen-zoom="in"]')); await click(q(t, '[data-specimen-swap]')); expect(q(t, '[data-specimen-scale-ruler]').dataset.scalePixels).toBe(zoomed); expect(q(t, '[data-specimen-scale-guide]').hidden).toBe(false); expect(JSON.stringify(t.data)).toBe(records);
  });

  it('keeps an anonymous identification model unnamed and leaves locked feedback untouched', async () => {
    const t = await mount('mystery'), records = JSON.stringify(t.data); await click(q(t, '[data-specimen-scale-toggle]')); const region = q(t, '[data-specimen-scale-guide]');
    const names = X.speciesText((k, v) => v); for (const id of ['clownfish', 'blue_tang']) expect(region.textContent).not.toContain(names[id].name); expect(q(t, '[data-specimen-canvas]').getAttribute('aria-label')).toBe('Interactive 3D model of the mystery organism'); expect(JSON.stringify(t.data)).toBe(records);
    const id = q(t, '.cr-dxp-portrait img').getAttribute('src').split('/').pop().replace(/\.webp.*$/, ''); await click(q(t, '[data-practice-choice="' + id + '"]')); const feedback = q(t, '[data-practice-feedback]').textContent;
    await click(q(t, '[data-specimen-zoom="in"]')); expect(q(t, '[data-practice-feedback]').textContent).toBe(feedback); await click(q(t, '[data-practice-next]')); expect(q(t, '[data-specimen-canvas]')).toBeNull(); expect(models[0].dispose).toHaveBeenCalledTimes(1);
  });
});
