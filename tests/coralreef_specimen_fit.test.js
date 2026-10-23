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


const fittedPose = v => ({ ...v, specimenScale: '1', specimenPanX: '0', specimenPanY: '0', specimenMode: 'turn' });
async function zoomToDetail(t) { for (let i = 0; i < 8; i++) await click(q(t, '[data-specimen-zoom="in"]')); await click(q(t, '[data-specimen-mode-button="move"]')); await click(q(t, '[data-specimen-pan-button="right"]')); await click(q(t, '[data-specimen-pan-button="up"]')); }
function assertWholeModel() { const camera = renderers[0].render.mock.calls.at(-1)[1], mesh = models[0].root.children[0], positions = mesh.geometry.attributes.position; camera.updateMatrixWorld(true); models[0].root.updateMatrixWorld(true); for (let i = 0; i < positions.count; i++) { const point = new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld).project(camera); expect(Math.abs(point.x)).toBeLessThan(.9); expect(Math.abs(point.y)).toBeLessThan(.9); expect(Math.abs(point.z)).toBeLessThan(1); } }

describe('fit the whole specimen without resetting its angle', () => {
  it('recovers a custom 300% view in one frame while preserving angle, light, Fine and memory; already-fitted recovery is a no-op', async () => {
    const t = await mount(), records = JSON.stringify(t.data), fit = q(t, '[data-specimen-fit]'); expect(fit.textContent).toBe('Fit specimen'); expect(fit.getAttribute('aria-disabled')).toBe('true'); expect(q(t, '#' + fit.getAttribute('aria-describedby')).textContent).toContain('keeps the current angle and lighting');
    let frames = renderers[0].render.mock.calls.length; await click(fit); expect(renderers[0].render).toHaveBeenCalledTimes(frames); await click(q(t, '[data-specimen-turn-button="right"]')); await click(q(t, '[data-specimen-turn-button="up"]')); await zoomToDetail(t); await click(q(t, '[data-specimen-light-button="studio"]')); await click(q(t, '[data-specimen-fine]')); await React.act(async () => { q(t, '[data-specimen-memory]').open = true; }); await click(q(t, '[data-specimen-remember]')); const detail = dataView(t), rotation = renderers[0].render.mock.calls.at(-1)[1].quaternion.toArray(); expect(fit.getAttribute('aria-disabled')).toBeNull();
    frames = renderers[0].render.mock.calls.length; await click(fit); expect(dataView(t)).toEqual(fittedPose(detail)); expect(renderers[0].render).toHaveBeenCalledTimes(frames + 1); expect(document.activeElement).toBe(fit); expect(fit.getAttribute('aria-disabled')).toBe('true'); renderers[0].render.mock.calls.at(-1)[1].quaternion.toArray().forEach((n, i) => expect(n).toBeCloseTo(rotation[i], 12)); assertWholeModel(); expect(q(t, '[data-specimen-restore]').getAttribute('aria-disabled')).toBeNull();
    frames = renderers[0].render.mock.calls.length; await click(fit); expect(renderers[0].render).toHaveBeenCalledTimes(frames); await click(q(t, '[data-specimen-restore]')); expect(dataView(t)).toEqual({ ...detail, specimenMode: 'turn' }); expect(JSON.stringify(t.data)).toBe(records); expect(api.create).toHaveBeenCalledTimes(1); expect(models[0].update).not.toHaveBeenCalled();
    await click(fit); const canvas = q(t, '[data-specimen-canvas]'); await React.act(async () => canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }))); expect(dataView(t)).toMatchObject({ specimenTurn: '0', specimenTilt: '0', specimenAngle: 'portrait', specimenLighting: 'studio', specimenPrecision: 'fine' }); await click(q(t, '[data-specimen-turn-button="right"]')); await click(q(t, '[data-specimen-reset]')); expect(dataView(t)).toMatchObject({ specimenTurn: '0', specimenTilt: '0', specimenAngle: 'portrait', specimenLighting: 'studio', specimenPrecision: 'fine' });
  });

  it('preserves all five selected view names and orientations when fitting a zoomed, panned specimen', async () => {
    const t = await mount(); await click(q(t, '[data-specimen-light-button="studio"]'));
    for (const name of ['side', 'opposite', 'front', 'above', 'below']) { await click(q(t, '[data-specimen-angle-button="' + name + '"]')); await zoomToDetail(t); const before = dataView(t); await click(q(t, '[data-specimen-fit]')); expect(dataView(t)).toEqual(fittedPose(before)); expect(q(t, '[data-specimen-angle-button="' + name + '"]').getAttribute('aria-pressed')).toBe('true'); assertWholeModel(); }
    expect(renderers).toHaveLength(1);
  });

  it('clears an in-progress drag, retains external focus on programmatic fitting and does not schedule idle frames', async () => {
    const t = await mount(); await zoomToDetail(t); const canvas = q(t, '[data-specimen-canvas]'); canvas.getBoundingClientRect = () => ({ width: 400, height: 240 }); await React.act(async () => { const event = new Event('pointerdown', { bubbles: true }); Object.assign(event, { pointerId: 4, button: 0, clientX: 150, clientY: 100 }); canvas.dispatchEvent(event); }); const notes = q(t, '[data-species-field-notes]'); notes.focus(); await React.act(async () => q(t, '[data-specimen-fit]').click()); expect(document.activeElement).toBe(notes); const fit = dataView(t), frames = renderers[0].render.mock.calls.length;
    await React.act(async () => { const event = new Event('pointermove', { bubbles: true }); Object.assign(event, { pointerId: 4, clientX: 220, clientY: 140 }); canvas.dispatchEvent(event); }); expect(dataView(t)).toEqual(fit); expect(renderers[0].render).toHaveBeenCalledTimes(frames); await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 35)); }); expect(renderers[0].render).toHaveBeenCalledTimes(frames);
  });

  it('keeps Fit anonymous and ungraded in a mystery round, retains locked feedback and starts the next model fitted', async () => {
    const t = await mount('mystery'), records = JSON.stringify(t.data), TX = X.speciesText((k, v) => v); await click(q(t, '[data-specimen-turn-button="right"]')); await zoomToDetail(t); await click(q(t, '[data-specimen-fine]')); const before = dataView(t); await click(q(t, '[data-specimen-fit]')); expect(dataView(t)).toEqual(fittedPose(before)); expect(q(t, '[data-specimen-canvas]').getAttribute('aria-label')).toBe('Interactive 3D model of the mystery organism'); for (const id of ['clownfish', 'blue_tang']) expect(q(t, '[data-practice-specimen]').textContent).not.toContain(TX[id].name); expect(JSON.stringify(t.data)).toBe(records);
    for (let i = 0; i < 2; i++) { const id = q(t, '.cr-dxp-portrait img').getAttribute('src').split('/').pop().replace(/\.webp.*$/, ''); if (i) { await click(q(t, '[data-practice-specimen-toggle]')); expect(q(t, '[data-specimen-fit]').getAttribute('aria-disabled')).toBe('true'); } await click(q(t, '[data-practice-choice="' + id + '"]')); const feedback = q(t, '[data-practice-feedback]').textContent; await click(q(t, '[data-specimen-zoom="in"]')); await click(q(t, '[data-specimen-fit]')); expect(q(t, '[data-practice-feedback]').textContent).toBe(feedback); await click(q(t, '[data-practice-next]')); expect(q(t, '[data-specimen-canvas]')).toBeNull(); }
    expect(t.data.speciesPractice).toMatchObject({ rounds: 1, answered: 2, correct: 2, last: { total: 2, hinted: 0 } }); expect(t.data.speciesLog).toEqual({ green_turtle: { firstSeen: 1 } }); expect(t.data.speciesFieldNotes).toEqual({ clownfish: 'Keep this note' }); expect(renderers.every(r => r.dispose.mock.calls.length === 1)).toBe(true);
  });
});
