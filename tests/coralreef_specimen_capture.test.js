import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [], owned = [];
let X, namespace, renderers, models, frameQueue, nextFrame, callbacks, captureCalls, downloads, createURL, revokeURL;
beforeEach(() => {
  frameQueue = new Map(); nextFrame = 1; callbacks = []; captureCalls = []; downloads = [];
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { const id = nextFrame++; frameQueue.set(id, callback); return id; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frameQueue.delete(id));
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(1);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (callback, type) { callbacks.push(callback); captureCalls.push({ canvas: this, type, renders: renderers.at(-1).render.mock.calls.length }); });
  const NativeURL = window.URL; let nextURL = 1;
  createURL = vi.fn(() => 'blob:specimen-test-' + nextURL++); revokeURL = vi.fn();
  vi.stubGlobal('URL', class extends NativeURL { static createObjectURL = createURL; static revokeObjectURL = revokeURL; });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { downloads.push({ href: this.href, filename: this.download, attached: document.body.contains(this) }); });
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; renderers = []; models = [];
  class Renderer {
    constructor(options) { this.canvas = options.canvas; this.options = options; this.capabilities = { isWebGL2: true }; this.ratio = 1; this.info = { programs: [] }; this.getContext = () => ({ isContextLost: () => false }); this.render = vi.fn(); this.dispose = vi.fn(); this.forceContextLoss = vi.fn(); renderers.push(this); }
    setPixelRatio(n) { this.ratio = n; } getPixelRatio() { return this.ratio; }
    setSize(w, h) { this.canvas.width = Math.round(w * this.ratio); this.canvas.height = Math.round(h * this.ratio); }
  }
  namespace = { ...THREE, WebGLRenderer: Renderer };
  window.THREE = namespace; window.Reef3DSpecies = { version: '1.0.0', info: () => ({ group: 'fish', portrait: { dir: [.3, .5, 3.2], lookY: 0 } }), create: vi.fn(() => {
    const root = new THREE.Group(), mesh = new THREE.Mesh(new THREE.BoxGeometry(1, .16, .12), new THREE.MeshBasicMaterial()); root.add(mesh);
    const model = { root, radius: .6, dispose: vi.fn(), update: vi.fn() }; models.push(model); return model;
  }) };
  vi.stubGlobal('ResizeObserver', class { constructor(callback) { this.callback = callback; } disconnect() {} observe() {} });
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addListener() {}, removeListener() {} })));
  loadTool('stem_lab/stem_tool_coralreef.js', 'coralReef'); X = window.__RR_TEST_EXPORTS__.coralReef;
});
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } while (owned.length) owned.pop().dispose(); delete window.THREE; delete window.Reef3DSpecies; vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const q = (t, selector) => t.host.querySelector(selector);
const png = () => new Blob(['test-png'], { type: 'image/png' });
function step(time) { const frames = [...frameQueue.values()]; frameQueue.clear(); for (const callback of frames) callback(time); }
function controller(failure = vi.fn()) { const canvas = document.createElement('canvas'); Object.defineProperties(canvas, { clientWidth: { value: 400 }, clientHeight: { value: 360 } }); const c = X.createMarineSpecimenController(namespace, canvas, 'clownfish', failure); owned.push(c); return c; }
async function click(el) { expect(el).toBeTruthy(); await React.act(async () => { el.focus(); el.click(); await new Promise(resolve => setTimeout(resolve, 0)); }); }
async function finish(blob = png()) { await React.act(async () => { callbacks.shift()(blob); await Promise.resolve(); }); }
async function mount(kind = 'study') {
  let data = { coralReef: { section: 'guide', guideSpeciesId: kind === 'study' ? 'clownfish' : null, speciesBookmarks: { clownfish: true, blue_tang: true }, speciesFieldNotes: { clownfish: 'Keep this note' }, speciesLog: { green_turtle: { firstSeen: 1 } } } };
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() { const [value, setValue] = React.useState(data); data = value; return cfg.render({ React, toolData: value, setToolData: setValue, t: (k, v) => v || k, reduceMotion: true }); }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t); await React.act(async () => root.render(React.createElement(Shell)));
  if (kind === 'study') { await click(q(t, '[data-open-study]')); await click(q(t, '[data-study-specimen-toggle]')); }
  else { await click(q(t, '[data-start-practice]')); await React.act(async () => { const select = q(t, '[data-practice-collection-select]'); select.value = 'saved'; select.dispatchEvent(new Event('change', { bubbles: true })); }); await click(q(t, '[data-practice-start]')); await click(q(t, '[data-practice-specimen-toggle]')); }
  await React.act(async () => step(0)); return t;
}

describe('demand-rendered specimen image capture', () => {
  it('renders immediately before PNG encoding with the current pose and appearance, using the existing renderer', async () => {
    const c = controller(); c.turn(.4, -.2); c.zoom(.5); c.pan(.04, .02); c.setLighting('detail'); c.setBackground('light'); c.setAppearance('silhouette');
    const view = c.getView(), count = renderers[0].render.mock.calls.length, mesh = models[0].root.children[0], material = mesh.material, geometry = mesh.geometry, blob = png();
    const result = c.captureImage(); expect(captureCalls).toHaveLength(1); expect(captureCalls[0]).toEqual({ canvas: renderers[0].canvas, type: 'image/png', renders: count + 1 });
    callbacks.shift()(blob); expect(await result).toBe(blob); expect(c.getView()).toEqual(view); expect(mesh.material).toBe(material); expect(mesh.geometry).toBe(geometry); expect(models[0].update).not.toHaveBeenCalled();
    expect(renderers).toHaveLength(1); expect(renderers[0].options.preserveDrawingBuffer).toBeUndefined(); expect(frameQueue.size).toBe(0);
  });
  it('pauses an active turntable at its live angle before capture and leaves it paused', async () => {
    const c = controller(); c.setTurntable(true); step(0); step(40); step(80); const view = c.getView(), count = renderers[0].render.mock.calls.length;
    const result = c.captureImage(); expect(c.isTurntableRunning()).toBe(false); expect(frameQueue.size).toBe(0); expect(c.getView()).toEqual(view); callbacks.shift()(png()); await result; step(160);
    expect(c.getView()).toEqual(view); expect(renderers[0].render).toHaveBeenCalledTimes(count + 1);
  });
  it('coalesces rapid capture attempts while encoding without an extra render', async () => {
    const c = controller(), first = c.captureImage(), count = renderers[0].render.mock.calls.length; expect(await c.captureImage()).toBeNull(); expect(captureCalls).toHaveLength(1); expect(renderers[0].render).toHaveBeenCalledTimes(count);
    const blob = png(); callbacks.shift()(blob); expect(await first).toBe(blob); const next = c.captureImage(); expect(captureCalls).toHaveLength(2); callbacks.shift()(blob); expect(await next).toBe(blob);
  });
  it.each(['missing', 'empty', 'wrong type'])('rejects invalid encoded images without breaking the inspector (%s)', async kind => {
    const blob = kind === 'missing' ? null : new Blob(kind === 'empty' ? [] : ['x'], { type: kind === 'wrong type' ? 'image/jpeg' : 'image/png' });
    const failed = vi.fn(), c = controller(failed), result = c.captureImage(); callbacks.shift()(blob); expect(await result).toBeNull(); expect(failed).not.toHaveBeenCalled(); expect(c.zoom(.25).scale).toBe(1.25); expect(renderers[0].dispose).not.toHaveBeenCalled();
  });
  it('handles a capture security exception and permits a subsequent retry', async () => {
    const failed = vi.fn(), c = controller(failed); HTMLCanvasElement.prototype.toBlob.mockImplementationOnce(() => { throw new DOMException('Tainted canvas', 'SecurityError'); });
    expect(await c.captureImage()).toBeNull(); expect(failed).not.toHaveBeenCalled(); const retry = c.captureImage(), blob = png(); callbacks.shift()(blob); expect(await retry).toBe(blob); expect(renderers[0].dispose).not.toHaveBeenCalled();
  });
  it('reports unsupported canvas encoding without allocating another renderer', async () => {
    const c = controller(); renderers[0].canvas.toBlob = undefined; const count = renderers[0].render.mock.calls.length; expect(await c.captureImage()).toBeNull(); expect(renderers).toHaveLength(1); expect(renderers[0].render).toHaveBeenCalledTimes(count); expect(c.turn(.2, 0).turn).toBeCloseTo(.2);
  });
  it('cancels a pending result immediately on disposal and ignores its late callback', async () => {
    const c = controller(), result = c.captureImage(), late = callbacks.shift(); c.dispose(); expect(await result).toBeNull(); const count = renderers[0].render.mock.calls.length; late(png()); expect(await c.captureImage()).toBeNull(); c.dispose();
    expect(renderers[0].render).toHaveBeenCalledTimes(count); expect(renderers[0].dispose).toHaveBeenCalledTimes(1); expect(models[0].dispose).toHaveBeenCalledTimes(1); expect(createURL).not.toHaveBeenCalled();
  });
  it('cancels encoding on context loss and avoids calling the fallback twice', async () => {
    const failed = vi.fn(), c = controller(failed), result = c.captureImage(), late = callbacks.shift(); renderers[0].canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })); expect(await result).toBeNull(); late(png()); c.dispose(); expect(failed).toHaveBeenCalledTimes(1); expect(renderers[0].dispose).toHaveBeenCalledTimes(1);
  });
  it('uses the existing renderer failure path if the pre-capture render fails', async () => {
    const failed = vi.fn(), c = controller(failed); renderers[0].render.mockImplementationOnce(() => { throw Error('GPU unavailable'); }); expect(await c.captureImage()).toBeNull(); expect(captureCalls).toHaveLength(0); expect(failed).toHaveBeenCalledTimes(1); expect(renderers[0].dispose).toHaveBeenCalledTimes(1);
  });
});

describe('accessible specimen PNG download', () => {
  it('keeps a native button focused, announces progress, preserves learning data and downloads only a generic model image', async () => {
    const t = await mount(), records = JSON.stringify(t.data), button = q(t, '[data-specimen-capture]'); expect(button.tagName).toBe('BUTTON'); expect(button.type).toBe('button'); expect(button.textContent).toBe('Save view image');
    expect(document.getElementById(button.getAttribute('aria-describedby')).textContent).toContain('model view only'); await click(q(t, '[data-specimen-turntable-toggle]')); await React.act(async () => { step(0); step(40); });
    await click(button); expect(document.activeElement).toBe(button); expect(button.getAttribute('aria-disabled')).toBe('true'); expect(q(t, '[data-specimen-capture-status]').textContent).toBe('Preparing the image…'); expect(q(t, '[data-specimen-view]').dataset.specimenTurntable).toBe('paused');
    await click(button); expect(captureCalls).toHaveLength(1); const blob = png(); await finish(blob); expect(createURL).toHaveBeenCalledWith(blob); expect(downloads).toEqual([{ href: 'blob:specimen-test-1', filename: 'marine-specimen.png', attached: true }]);
    expect(document.activeElement).toBe(button); expect(button.getAttribute('aria-disabled')).toBeNull(); const status = q(t, '[data-specimen-capture-status]'); expect(status.getAttribute('role')).toBe('status'); expect(status.getAttribute('aria-atomic')).toBe('true'); expect(status.textContent).toContain('download started'); expect(document.querySelector('a[download]')).toBeNull();
    expect(JSON.stringify(t.data)).toBe(records); expect(frameQueue.size).toBe(0); expect(models[0].update).not.toHaveBeenCalled();
  });
  it('revokes completed download URLs after their handoff and removes scheduled cleanup on close', async () => {
    const t = await mount(); await click(q(t, '[data-specimen-capture]')); vi.useFakeTimers(); await finish(); expect(revokeURL).not.toHaveBeenCalled();
    await React.act(async () => vi.advanceTimersByTime(1000)); expect(revokeURL).toHaveBeenCalledExactlyOnceWith('blob:specimen-test-1');
    await React.act(async () => q(t, '[data-specimen-capture]').click()); await finish(); await React.act(async () => q(t, '[data-study-specimen-toggle]').click()); expect(revokeURL).toHaveBeenCalledTimes(2); expect(revokeURL).toHaveBeenLastCalledWith('blob:specimen-test-2');
    await React.act(async () => vi.advanceTimersByTime(1000)); expect(revokeURL).toHaveBeenCalledTimes(2);
  });
  it('keeps the inspector operable after an encoding failure, with a clear retry message', async () => {
    const t = await mount(), button = q(t, '[data-specimen-capture]'); await click(button); await finish(null); expect(q(t, '[data-specimen-capture-status]').dataset.specimenCaptureStatus).toBe('error'); expect(q(t, '[data-specimen-capture-status]').textContent).toContain('Try again'); expect(document.activeElement).toBe(button); expect(downloads).toHaveLength(0);
    await click(q(t, '[data-specimen-zoom="in"]')); expect(q(t, '[data-specimen-view]').dataset.specimenScale).toBe('1.25'); await click(button); await finish(); expect(downloads).toHaveLength(1); expect(q(t, '[data-specimen-view]').dataset.specimenStatus).toBe('ready');
  });
  it('cleans up a failed download without disabling the model controls', async () => {
    const t = await mount(); HTMLAnchorElement.prototype.click.mockImplementationOnce(() => { throw Error('download blocked'); }); await click(q(t, '[data-specimen-capture]')); await finish();
    expect(revokeURL).toHaveBeenCalledExactlyOnceWith('blob:specimen-test-1'); expect(document.querySelector('a[download]')).toBeNull(); expect(q(t, '[data-specimen-capture-status]').dataset.specimenCaptureStatus).toBe('error'); await click(q(t, '[data-specimen-angle-button="front"]')); expect(q(t, '[data-specimen-view]').dataset.specimenAngle).toBe('front');
  });
  it('does not download or update a replacement inspector after a delayed encoding callback', async () => {
    const t = await mount(); await click(q(t, '[data-specimen-capture]')); const late = callbacks.shift(); await click(q(t, '[data-study-specimen-toggle]')); await click(q(t, '[data-study-specimen-toggle]'));
    await React.act(async () => { late(png()); await Promise.resolve(); }); expect(downloads).toHaveLength(0); expect(createURL).not.toHaveBeenCalled(); expect(q(t, '[data-specimen-capture-status]').dataset.specimenCaptureStatus).toBe('idle'); expect(models[0].dispose).toHaveBeenCalledTimes(1); expect(q(t, '[data-specimen-view]').dataset.specimenStatus).toBe('ready');
  });
  it('does not leak the anonymous identification answer in the download or change locked feedback', async () => {
    const t = await mount('mystery'), records = JSON.stringify(t.data); await click(q(t, '[data-specimen-capture]')); await finish(); const capture = q(t, '[data-specimen-capture-controls]'), names = X.speciesText((k, v) => v);
    for (const id of ['clownfish', 'blue_tang']) { expect(capture.textContent).not.toContain(names[id].name); expect(downloads[0].filename).not.toContain(id); }
    expect(downloads[0].filename).toBe('marine-specimen.png'); expect(q(t, '[data-specimen-canvas]').getAttribute('aria-label')).toBe('Interactive 3D model of the mystery organism'); expect(JSON.stringify(t.data)).toBe(records);
    const id = q(t, '.cr-dxp-portrait img').getAttribute('src').split('/').pop().replace(/\.webp.*$/, ''); await click(q(t, '[data-practice-choice="' + id + '"]')); const feedback = q(t, '[data-practice-feedback]').textContent; await click(q(t, '[data-specimen-capture]')); await finish(); expect(q(t, '[data-practice-feedback]').textContent).toBe(feedback); await click(q(t, '[data-practice-next]')); expect(models[0].dispose).toHaveBeenCalledTimes(1);
  });
});
