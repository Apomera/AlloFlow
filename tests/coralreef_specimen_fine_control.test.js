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


const pose = t => { const v = dataView(t); delete v.specimenPrecision; delete v.specimenMode; return v; };
async function key(t, name, modifiers = {}) { const e = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...modifiers }); await React.act(async () => q(t, '[data-specimen-canvas]').dispatchEvent(e)); return e.defaultPrevented; }
async function zoomTwice(t) { await click(q(t, '[data-specimen-zoom="in"]')); await click(q(t, '[data-specimen-zoom="in"]')); }
async function drag(t, dx, dy, leaveDown = false) { const canvas = q(t, '[data-specimen-canvas]'); canvas.getBoundingClientRect = () => ({ width: 400, height: 240 }); await React.act(async () => { for (const [type, x, y] of [['pointerdown', 100, 100], ['pointermove', 100 + dx, 100 + dy], ...(leaveDown ? [] : [['pointerup', 100 + dx, 100 + dy]])]) { const e = new Event(type, { bubbles: true }); Object.assign(e, { pointerId: 3, button: 0, clientX: x, clientY: y }); canvas.dispatchEvent(e); } }); }

describe('optional fine specimen movement', () => {
  it('keeps default steps and zoom unchanged while quartering turn buttons, arrow keys and Shift-arrow movement', async () => {
    const t = await mount(), fine = q(t, '[data-specimen-fine]'); expect(dataView(t).specimenPrecision).toBe('standard'); expect(fine.getAttribute('aria-pressed')).toBe('false'); expect(q(t, '#' + fine.getAttribute('aria-describedby')).textContent).toContain('smaller turns and moves');
    await click(q(t, '[data-specimen-turn-button="right"]')); expect(Number(dataView(t).specimenTurn)).toBeCloseTo(.25); const before = pose(t), frames = renderers[0].render.mock.calls.length; await click(fine); expect(pose(t)).toEqual(before); expect(renderers[0].render).toHaveBeenCalledTimes(frames); expect(fine.getAttribute('aria-pressed')).toBe('true'); expect(document.activeElement).toBe(fine);
    await click(q(t, '[data-specimen-turn-button="right"]')); expect(Number(dataView(t).specimenTurn)).toBeCloseTo(.3125); await click(q(t, '[data-specimen-turn-button="up"]')); expect(Number(dataView(t).specimenTilt)).toBeCloseTo(-.045);
    expect(await key(t, 'ArrowLeft')).toBe(true); expect(Number(dataView(t).specimenTurn)).toBeCloseTo(.25); expect(await key(t, 'ArrowDown')).toBe(true); expect(Number(dataView(t).specimenTilt)).toBeCloseTo(0);
    await key(t, '+'); expect(dataView(t).specimenScale).toBe('1.25'); await click(q(t, '[data-specimen-zoom="in"]')); expect(dataView(t).specimenScale).toBe('1.5'); await key(t, '-'); expect(dataView(t).specimenScale).toBe('1.25');
    await click(q(t, '[data-specimen-reset]')); const fittedFrames = renderers[0].render.mock.calls.length; expect(await key(t, 'ArrowRight', { shiftKey: true })).toBe(false); expect(renderers[0].render).toHaveBeenCalledTimes(fittedFrames); await zoomTwice(t); await key(t, 'ArrowRight', { shiftKey: true }); const finePan = Number(dataView(t).specimenPanX); expect(finePan).toBeGreaterThan(0);
    await click(q(t, '[data-specimen-reset]')); await zoomTwice(t); await click(fine); await key(t, 'ArrowRight', { shiftKey: true }); const normalPan = Number(dataView(t).specimenPanX); expect(finePan).toBeCloseTo(normalPan / 4, 12);
    await click(q(t, '[data-specimen-reset]')); await zoomTwice(t); await click(q(t, '[data-specimen-mode-button="move"]')); await click(fine); await click(q(t, '[data-specimen-pan-button="right"]')); expect(Number(dataView(t).specimenPanX)).toBeCloseTo(finePan, 12); await key(t, 'ArrowRight'); expect(Number(dataView(t).specimenPanX)).toBeCloseTo(finePan * 2, 12); expect(renderers).toHaveLength(1); expect(models[0].update).not.toHaveBeenCalled();
  });

  it('quarters pointer turning and moving, and cancels a live drag without changing the pose when precision is toggled', async () => {
    const t = await mount(), fine = q(t, '[data-specimen-fine]'); await drag(t, 24, 12); const coarse = dataView(t); await click(q(t, '[data-specimen-reset]')); await click(fine); await drag(t, 24, 12); expect(Number(dataView(t).specimenTurn)).toBeCloseTo(Number(coarse.specimenTurn) / 4, 12); expect(Number(dataView(t).specimenTilt)).toBeCloseTo(Number(coarse.specimenTilt) / 4, 12);
    await click(q(t, '[data-specimen-reset]')); await zoomTwice(t); await click(q(t, '[data-specimen-mode-button="move"]')); await drag(t, 12, -8); const finePan = dataView(t); await click(q(t, '[data-specimen-reset]')); await zoomTwice(t); await click(q(t, '[data-specimen-mode-button="move"]')); await click(fine); await drag(t, 12, -8); expect(Number(finePan.specimenPanX)).toBeCloseTo(Number(dataView(t).specimenPanX) / 4, 12); expect(Number(finePan.specimenPanY)).toBeCloseTo(Number(dataView(t).specimenPanY) / 4, 12);
    await drag(t, 4, 2, true); const before = pose(t), frames = renderers[0].render.mock.calls.length; await click(fine); expect(pose(t)).toEqual(before); expect(renderers[0].render).toHaveBeenCalledTimes(frames);
    await React.act(async () => { const e = new Event('pointermove', { bubbles: true }); Object.assign(e, { pointerId: 3, clientX: 160, clientY: 130 }); q(t, '[data-specimen-canvas]').dispatchEvent(e); }); expect(pose(t)).toEqual(before); expect(renderers[0].render).toHaveBeenCalledTimes(frames);
  });

  it('preserves remembered poses, lighting and records through precision changes and resize, then resets precision only on close', async () => {
    const t = await mount(), records = JSON.stringify(t.data), fine = q(t, '[data-specimen-fine]'); await React.act(async () => { q(t, '[data-specimen-memory]').open = true; }); await click(q(t, '[data-specimen-turn-button="right"]')); await zoomTwice(t); await click(q(t, '[data-specimen-light-button="studio"]')); const saved = pose(t); await click(q(t, '[data-specimen-remember]'));
    const frames = renderers[0].render.mock.calls.length; await click(fine); expect(renderers[0].render).toHaveBeenCalledTimes(frames); expect(pose(t)).toEqual(saved); expect(q(t, '[data-specimen-restore]').getAttribute('aria-disabled')).toBeNull(); await click(q(t, '[data-specimen-angle-button="below"]')); await click(q(t, '[data-specimen-reset]')); expect(dataView(t).specimenPrecision).toBe('fine'); await click(q(t, '[data-specimen-restore]')); expect(pose(t)).toEqual(saved); expect(dataView(t).specimenPrecision).toBe('fine');
    const beforeResize = renderers[0].render.mock.calls.length; observers[0].callback(); expect(renderers[0].render).toHaveBeenCalledTimes(beforeResize + 1); expect(pose(t)).toEqual(saved); expect(dataView(t).specimenPrecision).toBe('fine'); const idleFrames = renderers[0].render.mock.calls.length; await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 35)); }); expect(renderers[0].render).toHaveBeenCalledTimes(idleFrames); expect(JSON.stringify(t.data)).toBe(records);
    await click(q(t, '[data-study-specimen-toggle]')); await click(q(t, '[data-study-specimen-toggle]')); expect(dataView(t).specimenPrecision).toBe('standard'); expect(q(t, '[data-specimen-fine]').getAttribute('aria-pressed')).toBe('false'); expect(q(t, '[data-specimen-restore]').getAttribute('aria-disabled')).toBe('true'); expect(models[0].dispose).toHaveBeenCalledTimes(1); expect(renderers).toHaveLength(2);
  });

  it('keeps fine mystery control anonymous and ungraded, and starts the next organism with ordinary movement', async () => {
    const t = await mount('mystery'), records = JSON.stringify(t.data), TX = X.speciesText((k, v) => v), names = [TX.clownfish.name, TX.blue_tang.name]; await click(q(t, '[data-specimen-fine]')); expect(dataView(t).specimenPrecision).toBe('fine'); expect(q(t, '[data-specimen-canvas]').getAttribute('aria-label')).toBe('Interactive 3D model of the mystery organism'); for (const name of names) expect(q(t, '[data-practice-specimen]').textContent).not.toContain(name); await click(q(t, '[data-specimen-turn-button="right"]')); expect(Number(dataView(t).specimenTurn)).toBeCloseTo(.0625); expect(JSON.stringify(t.data)).toBe(records);
    for (let i = 0; i < 2; i++) { const id = q(t, '.cr-dxp-portrait img').getAttribute('src').split('/').pop().replace(/\.webp.*$/, ''); if (i) { await click(q(t, '[data-practice-specimen-toggle]')); expect(dataView(t).specimenPrecision).toBe('standard'); } await click(q(t, '[data-practice-choice="' + id + '"]')); await click(q(t, '[data-practice-next]')); expect(q(t, '[data-specimen-canvas]')).toBeNull(); }
    expect(t.data.speciesPractice).toMatchObject({ rounds: 1, answered: 2, correct: 2, last: { total: 2, hinted: 0 } }); expect(t.data.speciesLog).toEqual({ green_turtle: { firstSeen: 1 } }); expect(t.data.speciesFieldNotes).toEqual({ clownfish: 'Keep this note' }); expect(renderers.every(r => r.dispose.mock.calls.length === 1)).toBe(true);
  });
});
