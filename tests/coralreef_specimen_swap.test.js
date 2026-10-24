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
  function Shell() { const [state, setState] = React.useState(data); data = state; t.setData = setState; return cfg.render({ React, toolData: state, setToolData: setState, t: (k, v) => v || k, reduceMotion: true }); }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t); await React.act(async () => root.render(React.createElement(Shell)));
  if (kind === 'study') { await click(q(t, '[data-open-study]')); await click(q(t, '[data-study-specimen-toggle]')); }
  else { await click(q(t, '[data-start-practice]')); await React.act(async () => { const select = q(t, '[data-practice-collection-select]'); select.value = 'saved'; select.dispatchEvent(new Event('change', { bubbles: true })); }); await click(q(t, '[data-practice-start]')); await click(q(t, '[data-practice-specimen-toggle]')); }
  return t;
}

const logical = v => { const out = { ...v }; delete out.specimenMode; delete out.specimenPrecision; return out; };
const snapshot = t => logical(dataView(t));
const frame = () => renderers[0].render.mock.calls.length;
function cameraState() { const c = renderers[0].render.mock.calls.at(-1)[1]; return [...c.position.toArray(), ...c.quaternion.toArray(), ...c.projectionMatrix.elements]; }
function lightingState() { const s = renderers[0].render.mock.calls.at(-1)[0], hemi = s.children.find(n => n.isHemisphereLight), sun = s.children.find(n => n.isDirectionalLight); return [s.background.getHex(), hemi.color.getHex(), hemi.groundColor.getHex(), hemi.intensity, sun.intensity]; }
function expectCamera(expected) { cameraState().forEach((n, i) => expect(n).toBeCloseTo(expected[i], 10)); }
async function openMemory(t) { await React.act(async () => { q(t, '[data-specimen-memory]').open = true; }); }
async function magnify(t, steps = 2) { for (let i = 0; i < steps; i++) await click(q(t, '[data-specimen-zoom="in"]')); }
async function offset(t, direction = 'right') { await click(q(t, '[data-specimen-mode-button="move"]')); await click(q(t, '[data-specimen-pan-button="' + direction + '"]')); await click(q(t, '[data-specimen-pan-button="up"]')); }

describe('swap current and remembered specimen views', () => {
  it('exchanges both complete viewing poses in one frame per swap without changing Fine, scene resources or records', async () => {
    const t = await mount(), records = JSON.stringify(t.data); await openMemory(t); await click(q(t, '[data-specimen-angle-button="opposite"]')); await magnify(t); await offset(t, 'left'); await click(q(t, '[data-specimen-light-button="studio"]')); await click(q(t, '[data-specimen-fine]')); await click(q(t, '[data-specimen-remember]')); const a = snapshot(t), cameraA = cameraState(), lightA = lightingState();
    await click(q(t, '[data-specimen-angle-button="below"]')); await magnify(t, 8); await offset(t); await click(q(t, '[data-specimen-light-button="reef"]')); const b = snapshot(t), cameraB = cameraState(), lightB = lightingState(), firstFrames = frame(); expect(a).not.toEqual(b); expect(q(t, '[data-specimen-swap]').getAttribute('aria-disabled')).toBeNull();
    for (let i = 0; i < 4; i++) { await click(q(t, '[data-specimen-swap]')); expect(snapshot(t)).toEqual(i % 2 ? b : a); expectCamera(i % 2 ? cameraB : cameraA); expect(lightingState()).toEqual(i % 2 ? lightB : lightA); expect(frame()).toBe(firstFrames + i + 1); expect(dataView(t)).toMatchObject({ specimenMode: 'turn', specimenPrecision: 'fine' }); expect(document.activeElement).toBe(q(t, '[data-specimen-swap]')); }
    expect(q(t, '[data-specimen-memory-status]').textContent).toBe('Views swapped. Swap again to compare the other view.'); expect(JSON.stringify(t.data)).toBe(records); expect(renderers).toHaveLength(1); expect(api.create).toHaveBeenCalledTimes(1); expect(models[0].update).not.toHaveBeenCalled();
  });

  it('keeps empty and identical swaps as stable no-ops and leaves Remember and Return semantics unchanged', async () => {
    const t = await mount(); await openMemory(t); const swap = q(t, '[data-specimen-swap]'), initial = snapshot(t), first = frame(); expect(swap.getAttribute('aria-disabled')).toBe('true'); await click(swap); expect(frame()).toBe(first); expect(snapshot(t)).toEqual(initial); expect(q(t, '[data-specimen-memory-status]').dataset.specimenMemoryStatus).toBe('empty');
    await click(q(t, '[data-specimen-remember]')); const savedFrames = frame(); expect(swap.getAttribute('aria-disabled')).toBe('true'); await click(swap); expect(frame()).toBe(savedFrames); expect(q(t, '[data-specimen-memory-status]').dataset.specimenMemoryStatus).toBe('saved');
    await click(q(t, '[data-specimen-turn-button="right"]')); const b = snapshot(t); await click(q(t, '[data-specimen-restore]')); expect(snapshot(t)).toEqual(initial); expect(swap.getAttribute('aria-disabled')).toBe('true'); await click(q(t, '[data-specimen-turn-button="right"]')); expect(snapshot(t)).toEqual(b); await click(swap); expect(snapshot(t)).toEqual(initial); await click(q(t, '[data-specimen-restore]')); expect(snapshot(t)).toEqual(b); const atB = frame(); await click(q(t, '[data-specimen-restore]')); expect(frame()).toBe(atB); expect(snapshot(t)).toEqual(b);
    await click(q(t, '[data-specimen-remember]')); expect(swap.getAttribute('aria-disabled')).toBe('true'); await click(swap); expect(frame()).toBe(atB); expect(renderers).toHaveLength(1);
  });

  it('retains the remembered view when restoration rejects, throws, returns invalid data or claims success without changing the controller', async () => {
    const refs = [], original = React.useRef, refSpy = vi.spyOn(React, 'useRef').mockImplementation(value => { const ref = original(value); refs.push(ref); return ref; }); const t = await mount(); refSpy.mockRestore(); const ctl = refs.find(ref => ref.current && typeof ref.current.restoreView === 'function')?.current; expect(ctl).toBeTruthy(); await openMemory(t); await click(q(t, '[data-specimen-remember]')); const a = snapshot(t), saved = ctl.getView(); await click(q(t, '[data-specimen-turn-button="right"]')); await magnify(t); const b = snapshot(t), before = frame(), getter = vi.fn(() => 1), accessor = { ...saved }; Object.defineProperty(accessor, 'scale', { get: getter });
    const badRestores = [() => null, () => 'invalid', () => ({ ...saved, scale: NaN }), () => ctl.getView(), () => ({ ...saved }), () => accessor, () => { throw Error('rejected restore'); }];
    const restore = vi.spyOn(ctl, 'restoreView'); for (const failure of badRestores) { restore.mockImplementation(failure); await click(q(t, '[data-specimen-swap]')); expect(snapshot(t)).toEqual(b); expect(frame()).toBe(before); expect(q(t, '[data-specimen-memory-status]').dataset.specimenMemoryStatus).toBe('saved'); } expect(getter).not.toHaveBeenCalled(); restore.mockRestore(); await click(q(t, '[data-specimen-restore]')); expect(snapshot(t)).toEqual(a); expect(renderers).toHaveLength(1);
  });

  it('preserves tips, Fine, lighting and external focus through Fit/reset/resize and forgets both poses on close or species change', async () => {
    const t = await mount(); await openMemory(t); await React.act(async () => { q(t, '[data-specimen-tips]').open = true; }); await click(q(t, '[data-specimen-light-button="studio"]')); await click(q(t, '[data-specimen-fine]')); await click(q(t, '[data-specimen-angle-button="front"]')); await click(q(t, '[data-specimen-remember]')); const a = snapshot(t); await click(q(t, '[data-specimen-turn-button="right"]')); await magnify(t); await offset(t); await click(q(t, '[data-specimen-fit]')); const b = snapshot(t), notes = q(t, '[data-species-field-notes]'); notes.focus(); await React.act(async () => q(t, '[data-specimen-swap]').click()); expect(document.activeElement).toBe(notes); expect(snapshot(t)).toEqual(a); expect(q(t, '[data-specimen-tips]').open).toBe(true); expect(dataView(t).specimenPrecision).toBe('fine');
    await React.act(async () => observers[0].callback()); await click(q(t, '[data-specimen-swap]')); expect(snapshot(t)).toEqual(b); await click(q(t, '[data-specimen-reset]')); expect(dataView(t)).toMatchObject({ specimenAngle: 'portrait', specimenScale: '1', specimenPanX: '0', specimenPanY: '0', specimenLighting: 'studio', specimenPrecision: 'fine' }); await click(q(t, '[data-specimen-restore]')); expect(snapshot(t)).toEqual(a);
    await click(q(t, '[data-study-specimen-toggle]')); expect(renderers[0].dispose).toHaveBeenCalledTimes(1); await click(q(t, '[data-study-specimen-toggle]')); expect(q(t, '[data-specimen-swap]').getAttribute('aria-disabled')).toBe('true'); expect(q(t, '[data-specimen-restore]').getAttribute('aria-disabled')).toBe('true'); expect(q(t, '[data-specimen-tips]').open).toBe(false); expect(dataView(t).specimenPrecision).toBe('standard');
    await openMemory(t); await click(q(t, '[data-specimen-remember]')); await click(q(t, '[data-specimen-turn-button="right"]')); await React.act(async () => { t.setData(previous => ({ ...previous, coralReef: { ...previous.coralReef, guideSpeciesId: 'blue_tang' } })); await new Promise(resolve => setTimeout(resolve, 0)); }); if (!q(t, '[data-specimen-view]')) { if (!q(t, '[data-study-specimen-toggle]')) await click(q(t, '[data-open-study]')); await click(q(t, '[data-study-specimen-toggle]')); } expect(q(t, '[data-specimen-view]').dataset.specimenView).toBe('blue_tang'); expect(q(t, '[data-specimen-swap]').getAttribute('aria-disabled')).toBe('true'); expect(renderers[1].dispose).toHaveBeenCalledTimes(1); expect(renderers).toHaveLength(3);
  });

  it('keeps mystery swaps anonymous and ungraded while retaining locked feedback and resetting on the next question', async () => {
    const t = await mount('mystery'), records = JSON.stringify(t.data), TX = X.speciesText((k, v) => v); await openMemory(t); await click(q(t, '[data-specimen-remember]')); await click(q(t, '[data-specimen-turn-button="right"]')); await click(q(t, '[data-specimen-swap]')); await click(q(t, '[data-specimen-swap]')); expect(JSON.stringify(t.data)).toBe(records); for (const id of ['clownfish', 'blue_tang']) expect(q(t, '[data-practice-specimen]').textContent).not.toContain(TX[id].name); expect(q(t, '[data-specimen-canvas]').getAttribute('aria-label')).toBe('Interactive 3D model of the mystery organism');
    for (let i = 0; i < 2; i++) { const id = q(t, '.cr-dxp-portrait img').getAttribute('src').split('/').pop().replace(/\.webp.*$/, ''); if (i) { await click(q(t, '[data-practice-specimen-toggle]')); expect(q(t, '[data-specimen-swap]').getAttribute('aria-disabled')).toBe('true'); await openMemory(t); await click(q(t, '[data-specimen-remember]')); await click(q(t, '[data-specimen-turn-button="right"]')); } await click(q(t, '[data-practice-choice="' + id + '"]')); const feedback = q(t, '[data-practice-feedback]').textContent; await click(q(t, '[data-specimen-swap]')); expect(q(t, '[data-practice-feedback]').textContent).toBe(feedback); await click(q(t, '[data-practice-next]')); expect(q(t, '[data-specimen-view]')).toBeNull(); }
    expect(t.data.speciesPractice).toMatchObject({ rounds: 1, answered: 2, correct: 2, last: { total: 2, hinted: 0 } }); expect(t.data.speciesFieldNotes).toEqual({ clownfish: 'Keep this note' }); expect(t.data.speciesLog).toEqual({ green_turtle: { firstSeen: 1 } }); expect(renderers.every(r => r.dispose.mock.calls.length === 1)).toBe(true);
  });
});
