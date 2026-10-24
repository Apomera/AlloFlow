import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
let namespace, api, renderers, models, observers, scroll, oldScroll, live, maxLive, TX;
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; renderers = []; models = []; observers = []; live = 0; maxLive = 0;
  vi.spyOn(Date, 'now').mockReturnValue(1720000000000);
  class Renderer {
    constructor(options) { this.canvas = options.canvas; this.capabilities = { isWebGL2: true }; this.ratio = 1; this.info = { programs: [] }; this.getContext = () => ({ isContextLost: () => false }); this.render = vi.fn(); this.dispose = vi.fn(() => { live--; }); this.forceContextLoss = vi.fn(); renderers.push(this); live++; maxLive = Math.max(maxLive, live); }
    setPixelRatio(n) { this.ratio = n; } getPixelRatio() { return this.ratio; }
    setSize(w, h) { this.canvas.width = Math.round(w * this.ratio); this.canvas.height = Math.round(h * this.ratio); }
  }
  namespace = { ...THREE, WebGLRenderer: Renderer };
  api = { version: '1.0.0', info: () => ({ group: 'fish', portrait: { dir: [0, .3, 3.2], lookY: 0 } }), create: vi.fn(() => { const root = new THREE.Group(); root.add(new THREE.Mesh(new THREE.BoxGeometry(.4, .2, .1), new THREE.MeshBasicMaterial())); const model = { root, radius: .25, dispose: vi.fn(), update: vi.fn() }; models.push(model); return model; }) };
  window.THREE = namespace; window.Reef3DSpecies = api;
  vi.stubGlobal('ResizeObserver', class { constructor(callback) { this.callback = callback; this.disconnect = vi.fn(); observers.push(this); } observe() {} });
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addListener() {}, removeListener() {} })));
  scroll = vi.fn(); oldScroll = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView'); Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: scroll });
  loadTool('stem_lab/stem_tool_coralreef.js', 'coralReef'); TX = window.__RR_TEST_EXPORTS__.coralReef.speciesText((k, v) => v);
});
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } delete window.THREE; delete window.Reef3DSpecies; if (oldScroll) Object.defineProperty(Element.prototype, 'scrollIntoView', oldScroll); else delete Element.prototype.scrollIntoView; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const q = (t, s) => t.host.querySelector(s), named = (t, s) => [...t.host.querySelectorAll('button')].find(b => b.textContent === s);
const target = t => q(t, '.cr-dxp-portrait img').getAttribute('src').split('/').pop().replace(/\.webp.*$/, '');
const choices = t => [...t.host.querySelectorAll('[data-practice-choice]')].map(b => b.dataset.practiceChoice);
const portrait = t => ({ ...q(t, '[data-practice-picture-view]').dataset });
async function click(el) { expect(el, 'control exists').toBeTruthy(); await React.act(async () => { el.focus(); el.click(); await new Promise(resolve => setTimeout(resolve, 0)); }); }
async function change(el, value) { await React.act(async () => { el.value = value; el.dispatchEvent(new Event('change', { bubbles: true })); }); }
async function write(el, value) { await React.act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); }); }
async function mount({ mode = 'picture', pair = false, saved = { clownfish: true } } = {}) {
  let data = { coralReef: { section: 'guide', guideSpeciesId: pair ? 'green_turtle' : null, speciesBookmarks: saved, speciesFieldNotes: { clownfish: 'Keep this field note' }, speciesLog: { green_turtle: { firstSeen: 1 } } } };
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() { const [state, setState] = React.useState(data); data = state; return cfg.render({ React, toolData: state, setToolData: setState, t: (k, v) => v || k, reduceMotion: true }); }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t); await React.act(async () => root.render(React.createElement(Shell)));
  if (pair) { await click(q(t, '[data-start-comparison]')); await click(q(t, '[data-practice-comparison-pair]')); }
  else { await click(q(t, '[data-start-practice]')); await change(q(t, '[data-practice-collection-select]'), 'saved'); }
  if (mode === 'marks') await click(q(t, '[data-practice-mode="marks"]')); await click(q(t, '[data-practice-start]')); return t;
}
function deferLoader() { delete window.THREE; delete window.Reef3DSpecies; let resolve; const promise = new Promise(done => { resolve = done; }); window.StemLab.ensureThree = vi.fn(() => promise); return async () => { await React.act(async () => { window.THREE = namespace; window.Reef3DSpecies = api; resolve(namespace); await new Promise(done => setTimeout(done, 0)); }); }; }

describe('optional mystery specimen in identification practice', () => {
  it('keeps the portrait mounted, uses a generic name, and preserves notes, confidence, locked answer and ungraded detail without adding help', async () => {
    const t = await mount(), id = target(t), records = JSON.stringify(t.data); expect(renderers).toHaveLength(0);
    await click(q(t, '[data-practice-zoom="in"]')); await click(q(t, '[data-practice-pan="right"]')); const original = portrait(t), picture = q(t, '.cr-dxp-portrait img');
    await React.act(async () => { q(t, '[data-practice-observation]').open = true; }); await write(q(t, '[data-practice-observation-input]'), 'I notice bands around the body.'); await click(q(t, '[data-confidence-choice="hunch"]'));
    await click(q(t, '[data-practice-specimen-toggle]')); expect(q(t, '[data-specimen-status="ready"]')).toBeTruthy(); expect(q(t, '[data-specimen-expand]')).toBeNull(); expect(q(t, '[data-practice-specimen-static]').hidden).toBe(true);
    expect(q(t, '.cr-dxp-portrait img')).toBe(picture); expect(q(t, '[data-specimen-canvas]').getAttribute('aria-label')).toBe('Interactive 3D model of the mystery organism'); expect(q(t, '[data-practice-specimen]').textContent).not.toContain(TX[id].name);
    expect([...t.host.querySelectorAll('[data-specimen-angle-button]')].map(b => b.textContent)).toEqual(['Side', 'Other side', 'Front', 'Above', 'Below']);
    await click(q(t, '[data-specimen-angle-button="opposite"]')); await click(q(t, '[data-specimen-light-button="studio"]')); await click(q(t, '[data-specimen-zoom="in"]')); await click(q(t, '[data-specimen-mode-button="move"]')); await click(q(t, '[data-specimen-pan-button="right"]'));
    const frames = renderers[0].render.mock.calls.length; await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 35)); }); expect(renderers[0].render).toHaveBeenCalledTimes(frames); expect(models[0].update).not.toHaveBeenCalled(); expect(maxLive).toBe(1);
    await click(q(t, '[data-practice-specimen-toggle]')); expect(q(t, '[data-practice-specimen-static]').hidden).toBe(false); expect(portrait(t)).toEqual(original); expect(q(t, '[data-practice-observation-input]').value).toBe('I notice bands around the body.'); expect(q(t, '[data-confidence-choice="hunch"]').getAttribute('aria-pressed')).toBe('true'); expect(JSON.stringify(t.data)).toBe(records);
    await click(q(t, '[data-practice-choice="' + id + '"]')); const feedback = q(t, '[data-practice-feedback]').textContent; await click(q(t, '[data-practice-detail="2"]')); await click(q(t, '[data-practice-specimen-toggle]')); await click(q(t, '[data-practice-specimen-toggle]'));
    await click(q(t, '[data-practice-choice="' + choices(t).find(c => c !== id) + '"]')); expect(q(t, '[data-practice-feedback]').textContent).toBe(feedback); expect(q(t, '[data-practice-detail="2"]').getAttribute('aria-pressed')).toBe('true');
    await click(q(t, '[data-practice-next]')); expect(t.data.speciesPractice).toMatchObject({ rounds: 1, answered: 1, correct: 1, last: { hinted: 0, skipped: 0 } }); expect(q(t, '[data-practice-review-observation]').textContent).toBe('I notice bands around the body.'); expect(q(t, '[data-practice-confidence-review]').textContent).toContain('Have a hunch'); expect(t.data.speciesLog).toEqual({ green_turtle: { firstSeen: 1 } }); expect(t.data.speciesFieldNotes).toEqual({ clownfish: 'Keep this field note' }); expect(live).toBe(0);
  });

  it.each(['portrait', 'notes'])('recovers readiness focus only when it hides the focused %s subtree', async where => {
    const t = await mount(), resolve = deferLoader(); await click(q(t, '[data-practice-specimen-toggle]')); const focused = q(t, where === 'portrait' ? '[data-practice-zoom="in"]' : '[data-practice-observation-input]'); focused.focus(); scroll.mockClear(); await resolve();
    expect(q(t, '[data-specimen-status="ready"]')).toBeTruthy(); expect(document.activeElement).toBe(where === 'portrait' ? q(t, '[data-practice-specimen-toggle]') : focused); expect(scroll.mock.contexts).toEqual(where === 'portrait' ? [q(t, '[data-practice-specimen-toggle]')] : []);
  });

  it('retains a usable static portrait when Three cannot load', async () => {
    const t = await mount(), before = portrait(t); delete window.THREE; delete window.Reef3DSpecies; window.StemLab.ensureThree = vi.fn(() => Promise.reject(Error('Three unavailable'))); await click(q(t, '[data-practice-specimen-toggle]'));
    expect(q(t, '[data-specimen-status="error"]')).toBeTruthy(); expect(q(t, '[data-practice-specimen-static]').hidden).toBe(false); expect(portrait(t)).toEqual(before); expect(renderers).toHaveLength(0); expect(q(t, '[data-practice-choice]')).toBeTruthy(); expect(t.data.speciesPractice).toBeUndefined();
  });

  it.each(['canvas', 'notes'])('disposes context loss exactly once and recovers focus only from %s', async where => {
    const t = await mount(); await click(q(t, '[data-practice-specimen-toggle]')); const focused = q(t, where === 'canvas' ? '[data-specimen-canvas]' : '[data-practice-observation-input]'); focused.focus(); scroll.mockClear(); await React.act(async () => q(t, '[data-specimen-canvas]').dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
    expect(q(t, '[data-specimen-status="error"]')).toBeTruthy(); expect(q(t, '[data-practice-specimen-static]').hidden).toBe(false); expect(document.activeElement).toBe(where === 'canvas' ? q(t, '[data-practice-specimen-toggle]') : focused); expect(scroll.mock.contexts).toEqual(where === 'canvas' ? [q(t, '[data-practice-specimen-toggle]')] : []); expect(models[0].dispose).toHaveBeenCalledTimes(1); expect(renderers[0].dispose).toHaveBeenCalledTimes(1); expect(observers[0].disconnect).toHaveBeenCalledTimes(1); await click(q(t, '[data-practice-specimen-toggle]')); expect(renderers[0].dispose).toHaveBeenCalledTimes(1); expect(live).toBe(0);
  });

  it('cannot load or reveal a model in written-clue mode before the picture is uncovered, and disposes when it is hidden again', async () => {
    const t = await mount({ mode: 'marks' }); expect(q(t, '[data-practice-specimen]')).toBeNull(); expect(q(t, '[data-specimen-canvas]')).toBeNull(); expect(renderers).toHaveLength(0);
    await click(q(t, '[data-practice-picture-toggle]')); const id = target(t); expect(q(t, '[data-practice-specimen-toggle]')).toBeTruthy(); expect(renderers).toHaveLength(0); await click(q(t, '[data-practice-specimen-toggle]')); expect(q(t, '[data-specimen-status="ready"]')).toBeTruthy(); await click(q(t, '[data-practice-picture-toggle]')); expect(q(t, '[data-practice-specimen]')).toBeNull(); expect(live).toBe(0); expect(renderers[0].dispose).toHaveBeenCalledTimes(1);
    await click(q(t, '[data-practice-picture-toggle]')); expect(q(t, '[data-specimen-canvas]')).toBeNull(); await click(q(t, '[data-practice-choice="' + id + '"]')); await click(q(t, '[data-practice-next]')); expect(t.data.speciesPractice.last).toMatchObject({ hinted: 1, correct: 1 });
  });

  it('unmounts the model for a profile/comparison visit, returns to the same static zoom and locked feedback, then resets on next question', async () => {
    const t = await mount({ saved: { clownfish: true, blue_tang: true } }), id = target(t); await click(q(t, '[data-practice-zoom="in"]')); const before = portrait(t); await click(q(t, '[data-practice-specimen-toggle]')); await click(q(t, '[data-practice-choice="' + id + '"]')); await click(q(t, '[data-practice-detail="1"]')); const feedback = q(t, '[data-practice-feedback]').textContent;
    await click(named(t, 'Study profile')); expect(q(t, '[data-marine-profile]')).toBeTruthy(); expect(q(t, '[data-specimen-canvas]')).toBeNull(); expect(live).toBe(0); expect(renderers[0].dispose).toHaveBeenCalledTimes(1); await click(q(t, '[data-start-comparison]')); expect(q(t, '[data-specimen-canvas]')).toBeNull(); await click(q(t, '[data-close-comparison]')); await click(q(t, '[data-close-profile]'));
    expect(target(t)).toBe(id); expect(portrait(t)).toEqual(before); expect(q(t, '[data-practice-feedback]').textContent).toBe(feedback); expect(q(t, '[data-practice-detail="1"]').getAttribute('aria-pressed')).toBe('true'); expect(q(t, '[data-practice-specimen-toggle]').getAttribute('aria-expanded')).toBe('false'); expect(q(t, '[data-specimen-canvas]')).toBeNull();
    await click(q(t, '[data-practice-specimen-toggle]')); expect(live).toBe(1); await click(q(t, '[data-practice-next]')); expect(q(t, '[data-specimen-canvas]')).toBeNull(); expect(portrait(t)).toMatchObject({ practiceScale: '1', practicePanX: '0', practicePanY: '0' }); expect(renderers[1].dispose).toHaveBeenCalledTimes(1); expect(maxLive).toBe(1);
  });

  it.each(['return', 'profile', 'next'])('cancels unfinished model loading on %s without allocating a late renderer', async action => {
    const t = await mount({ saved: { clownfish: true, blue_tang: true } }), id = target(t); if (action !== 'return') await click(q(t, '[data-practice-choice="' + id + '"]')); const resolve = deferLoader(); await click(q(t, '[data-practice-specimen-toggle]')); expect(q(t, '[data-specimen-status="loading"]')).toBeTruthy();
    if (action === 'return') await click(q(t, '[data-practice-specimen-toggle]')); else if (action === 'profile') await click(named(t, 'Study profile')); else await click(q(t, '[data-practice-next]'));
    await resolve(); expect(renderers).toHaveLength(0); expect(api.create).not.toHaveBeenCalled(); expect(q(t, '[data-specimen-canvas]')).toBeNull();
  });

  it('works through both questions of a two-choice comparison pair without recording 3D viewing as extra help or discoveries', async () => {
    const t = await mount({ pair: true }), asked = [];
    for (let i = 0; i < 2; i++) { const id = target(t); asked.push(id); expect(choices(t).sort()).toEqual(['green_turtle', 'hawksbill_turtle']); await click(q(t, '[data-practice-specimen-toggle]')); expect(q(t, '[data-specimen-canvas]').getAttribute('aria-label')).toBe('Interactive 3D model of the mystery organism'); await click(q(t, '[data-practice-choice="' + id + '"]')); await click(q(t, '[data-practice-next]')); expect(live).toBe(0); }
    expect(asked.sort()).toEqual(['green_turtle', 'hawksbill_turtle']); expect(t.data.speciesPractice).toMatchObject({ rounds: 1, answered: 2, correct: 2, last: { total: 2, hinted: 0 } }); expect(t.data.speciesLog).toEqual({ green_turtle: { firstSeen: 1 } }); expect(maxLive).toBe(1); expect(renderers.every(r => r.dispose.mock.calls.length === 1)).toBe(true);
  });
});
