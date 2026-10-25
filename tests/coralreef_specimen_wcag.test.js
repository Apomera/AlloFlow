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
  const queuedFrames = []; vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { queuedFrames.push(callback); return queuedFrames.length; });
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() { const [state, setState] = React.useState(data); data = state; return cfg.render({ React, toolData: state, setToolData: setState, t: (key, fallback) => fallback || key, reduceMotion: true }); }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell)));
  await React.act(async () => { queuedFrames.splice(0).forEach(callback => callback(0)); });
  await click(q(t, '[data-open-study]'));
  t.flushStudyFrames = async () => React.act(async () => { queuedFrames.splice(0).forEach(callback => callback(0)); }); return t;
}
function deferLoader() {
  delete window.THREE; delete window.Reef3DSpecies;
  let resolve; const promise = new Promise(done => { resolve = done; });
  window.StemLab.ensureThree = vi.fn(() => promise);
  return async () => { await React.act(async () => { window.THREE = namespace; window.Reef3DSpecies = api; resolve(namespace); await new Promise(done => setTimeout(done, 0)); }); };
}
const staticState = t => ['studyScale', 'studyPanX', 'studyPanY'].map(key => q(t, '[data-species-study]').dataset[key]);

function region(t){return q(t,'[data-study-specimen-region]')}
function afterInDOM(before,after){return !!(before.compareDocumentPosition(after)&Node.DOCUMENT_POSITION_FOLLOWING)}
function focusableAfter(t,element){const controls=[...t.host.querySelectorAll('button,select,input,textarea,summary,[tabindex="0"]')].filter(el=>!el.closest('[hidden]')&&!el.disabled);return controls[controls.indexOf(element)+1]}
describe('3D inspection access and narrow layout structure',()=>{
 it('provides one stable controlled region after the Study opener before, during and after inspection',async()=>{
  const t=await mount(),button=q(t,'[data-study-specimen-toggle]'),target=region(t),id=button.getAttribute('aria-controls'),records=JSON.stringify(t.data);expect(id).toBeTruthy();expect(target.id).toBe(id);expect(t.host.querySelectorAll('[id="'+id+'"]')).toHaveLength(1);expect(afterInDOM(button,target)).toBe(true);expect(target.children).toHaveLength(0);expect(button.getAttribute('aria-expanded')).toBe('false');
  await click(button);await t.flushStudyFrames();expect(region(t)).toBe(target);expect(button.getAttribute('aria-expanded')).toBe('true');expect(target.contains(q(t,'[data-specimen-view]'))).toBe(true);expect(document.activeElement).toBe(button);expect(focusableAfter(t,button)).toBe(q(t,'[data-specimen-angle-button="side"]'));
  await click(button);expect(region(t)).toBe(target);expect(target.children).toHaveLength(0);expect(document.activeElement).toBe(button);expect(button.getAttribute('aria-expanded')).toBe('false');expect(JSON.stringify(t.data)).toBe(records);expect(renderers[0].dispose).toHaveBeenCalledTimes(1);
 });
 it('keeps the opener and region stable while the async model loads without creating hidden keyboard targets',async()=>{
  const t=await mount(),button=q(t,'[data-study-specimen-toggle]'),target=region(t),resolve=deferLoader();await click(button);await t.flushStudyFrames();expect(q(t,'[data-specimen-status="loading"]')).toBeTruthy();expect(region(t)).toBe(target);expect(document.activeElement).toBe(button);expect(focusableAfter(t,button)).not.toBe(q(t,'[data-specimen-angle-button="side"]'));await resolve();expect(region(t)).toBe(target);expect(document.activeElement).toBe(button);expect(focusableAfter(t,button)).toBe(q(t,'[data-specimen-angle-button="side"]'));expect(renderers).toHaveLength(1);
 });
 it('does not move focus from external notes on readiness and recovers focus from a failed inspector to the earlier opener',async()=>{
  const t=await mount(),button=q(t,'[data-study-specimen-toggle]'),resolve=deferLoader();await click(button);const notes=q(t,'[data-species-field-notes]');notes.focus();await t.flushStudyFrames();await resolve();expect(document.activeElement).toBe(notes);const select=q(t,'[data-specimen-background-select]');select.focus();await React.act(async()=>q(t,'[data-specimen-canvas]').dispatchEvent(new Event('webglcontextlost',{cancelable:true})));expect(document.activeElement).toBe(button);expect(q(t,'[data-study-static]').hidden).toBe(false);expect(region(t).id).toBe(button.getAttribute('aria-controls'));expect(q(t,'[data-specimen-status="error"]')).toBeTruthy();
 });
 it('preserves unique label/help associations and independent selection after moving appearance options to adaptive layout',async()=>{
  const t=await mount();await click(q(t,'[data-study-specimen-toggle]'));const grid=q(t,'[data-specimen-display-options]'),bg=q(t,'[data-specimen-background-select]'),appearance=q(t,'[data-specimen-appearance-select]');expect(grid.className).toBe('crsv-display-options');expect(bg.closest('[data-specimen-display-options]')).toBe(grid);expect(appearance.closest('[data-specimen-display-options]')).toBe(grid);
  for(const select of [bg,appearance]){expect(q(t,'label[for="'+select.id+'"]').textContent).toBeTruthy();const ids=select.getAttribute('aria-describedby').split(' ');for(const id of ids)expect(t.host.querySelectorAll('[id="'+id+'"]')).toHaveLength(1)}
  await React.act(async()=>{bg.value='light';bg.dispatchEvent(new Event('change',{bubbles:true}));appearance.value='silhouette';appearance.dispatchEvent(new Event('change',{bubbles:true}))});expect(q(t,'[data-specimen-view]').dataset).toMatchObject({specimenBackground:'light',specimenAppearance:'silhouette'});expect(grid.style.gridTemplateColumns).toBe('');expect(renderers).toHaveLength(1);expect(models[0].update).not.toHaveBeenCalled();
 });
 it('keeps the region stable through expanded and compact layouts without rerendering on unrelated focus movement',async()=>{
  const t=await mount(),button=q(t,'[data-study-specimen-toggle]'),target=region(t);await click(button);const canvas=q(t,'[data-specimen-canvas]');await click(q(t,'[data-specimen-expand]'));expect(region(t)).toBe(target);expect(target.contains(canvas)).toBe(true);expect(afterInDOM(button,target)).toBe(true);await click(q(t,'[data-specimen-expand]'));const frames=renderers[0].render.mock.calls.length;q(t,'[data-species-field-notes]').focus();await React.act(async()=>{await new Promise(r=>setTimeout(r,35))});expect(renderers[0].render.mock.calls.length).toBe(frames);expect(region(t)).toBe(target);expect(renderers).toHaveLength(1);
 });
});
