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


const recall=t=>q(t,'[data-practice-recall]');
const inspect=t=>q(t,'[data-practice-recall-inspect]');
const reveal=t=>q(t,'[data-practice-recall-reveal]');
const staticPicture=t=>q(t,'[data-practice-recall-static]');
async function complete(t) {
  while(q(t,'[data-marine-practice="active"]')){await click(q(t,'[data-practice-choice="'+target(t)+'"]'));await click(q(t,'[data-practice-next]'));}
  await React.act(async()=>{recall(t).open=true;recall(t).dispatchEvent(new Event('toggle'));});
}
async function opened(t){await click(reveal(t));await click(inspect(t));expect(q(t,'[data-specimen-status="ready"]')).toBeTruthy();}
describe('revealed recall card specimen inspection',()=>{
  it('loads only on request after reveal and preserves notes, checks and saved learning records',async()=>{
    const t=await mount();await complete(t);const data=JSON.stringify(t.data);
    expect(renderers).toHaveLength(0);expect(inspect(t)).toBeNull();
    const input=q(t,'[data-practice-recall-note-input]');await write(input,'Look for a broad pale band.');
    await click(reveal(t));expect(renderers).toHaveLength(0);const id=q(t,'[data-practice-recall-card]').dataset.practiceRecallCard;
    await click(q(t,'[data-practice-recall-rate="practice"]'));await click(inspect(t));
    expect(q(t,'[data-specimen-status="ready"]')).toBeTruthy();expect(staticPicture(t).hidden).toBe(true);
    expect(q(t,'[data-specimen-canvas]').getAttribute('aria-label')).toBe('Interactive 3D model of '+TX[id].name);
    expect(q(t,'[data-practice-recall-note-review]').textContent).toContain('Look for a broad pale band.');
    await click(q(t,'[data-specimen-angle-button="below"]'));await click(q(t,'[data-specimen-light-button="detail"]'));await click(q(t,'[data-specimen-zoom="in"]'));
    expect(q(t,'[data-specimen-view]').dataset.specimenAngle).toBe('below');
    const frames=renderers[0].render.mock.calls.length;await React.act(async()=>{await new Promise(r=>setTimeout(r,35));});expect(renderers[0].render).toHaveBeenCalledTimes(frames);
    await click(inspect(t));expect(staticPicture(t).hidden).toBe(false);expect(live).toBe(0);expect(renderers[0].dispose).toHaveBeenCalledTimes(1);
    expect(q(t,'[data-practice-recall-rate="practice"]').getAttribute('aria-pressed')).toBe('true');expect(JSON.stringify(t.data)).toBe(data);
    await click(reveal(t));expect(q(t,'[data-practice-recall-note-input]').value).toBe('Look for a broad pale band.');expect(inspect(t)).toBeNull();
  });
  it.each(['hide','next','mix','prompt','collapse','profile'])('disposes on %s and returns without a silently active renderer',async action=>{
    const t=await mount({saved:{clownfish:true,blue_tang:true}});await complete(t);await opened(t);const data=JSON.stringify(t.data);
    if(action==='hide')await click(reveal(t));
    if(action==='next')await click(q(t,'[data-practice-recall-next]'));
    if(action==='mix')await click(q(t,'[data-practice-recall-order-toggle]'));
    if(action==='prompt')await change(q(t,'[data-practice-recall-prompt-select]'),'marks');
    if(action==='collapse')await React.act(async()=>{recall(t).open=false;recall(t).dispatchEvent(new Event('toggle'));});
    if(action==='profile'){await click(q(t,'[data-practice-recall-study]'));expect(q(t,'[data-marine-profile]')).toBeTruthy();await click(q(t,'[data-close-profile]'));}
    expect(q(t,'[data-specimen-canvas]')).toBeNull();expect(live).toBe(0);expect(renderers[0].dispose).toHaveBeenCalledTimes(1);expect(JSON.stringify(t.data)).toBe(data);
    if(action==='collapse')await React.act(async()=>{recall(t).open=true;recall(t).dispatchEvent(new Event('toggle'));});
    expect(q(t,'[data-specimen-canvas]')).toBeNull();expect(maxLive).toBe(1);
  });
  it.each(['canvas','notes'])('recovers context loss focus from %s without discarding the portrait',async where=>{
    const t=await mount();await complete(t);await opened(t);
    const focus=where==='canvas'?q(t,'[data-specimen-canvas]'):q(t,'[data-practice-recall-rate="remembered"]');focus.focus();scroll.mockClear();
    await React.act(async()=>q(t,'[data-specimen-canvas]').dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
    expect(q(t,'[data-specimen-status="error"]')).toBeTruthy();expect(staticPicture(t).hidden).toBe(false);expect(document.activeElement).toBe(where==='canvas'?inspect(t):focus);
    expect(renderers[0].dispose).toHaveBeenCalledTimes(1);expect(live).toBe(0);await click(inspect(t));await click(inspect(t));expect(q(t,'[data-specimen-status="ready"]')).toBeTruthy();expect(maxLive).toBe(1);
  });
  it('keeps a usable portrait and answer if model loading fails',async()=>{
    const t=await mount();await complete(t);await click(reveal(t));delete window.THREE;delete window.Reef3DSpecies;window.StemLab.ensureThree=vi.fn(()=>Promise.reject(Error('unavailable')));await click(inspect(t));
    expect(q(t,'[data-specimen-status="error"]')).toBeTruthy();expect(staticPicture(t).hidden).toBe(false);expect(q(t,'[data-practice-recall-answer]').hidden).toBe(false);expect(renderers).toHaveLength(0);
  });
  it.each(['close','profile','collapse','next'])('cancels deferred loading on %s without a late context',async action=>{
    const t=await mount({saved:{clownfish:true,blue_tang:true}});await complete(t);await click(reveal(t));const resolve=deferLoader();await click(inspect(t));
    expect(q(t,'[data-specimen-status="loading"]')).toBeTruthy();
    if(action==='close')await click(inspect(t));
    if(action==='profile')await click(q(t,'[data-practice-recall-study]'));
    if(action==='collapse')await React.act(async()=>{recall(t).open=false;recall(t).dispatchEvent(new Event('toggle'));});
    if(action==='next')await click(q(t,'[data-practice-recall-next]'));
    await resolve();expect(renderers).toHaveLength(0);expect(api.create).not.toHaveBeenCalled();expect(q(t,'[data-specimen-canvas]')).toBeNull();
  });
});
