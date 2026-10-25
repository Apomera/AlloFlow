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

const frames = () => renderers[0].render.mock.calls.length;
const centered = state => ({ ...state, specimenPanX: '0', specimenPanY: '0' });
const logical = state => { const next = { ...state }; delete next.specimenMode; return next; };
const description = el => (el.getAttribute('aria-describedby') || '').split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ');
async function magnify(t, count = 8) { for (let i = 0; i < count; i++) await click(q(t, '[data-specimen-zoom="in"]')); }
async function pointer(t, type, values = {}) { let event; await React.act(async () => { event = new Event(type, { bubbles: true, cancelable: true }); Object.assign(event, { pointerId: 7, button: 0, clientX: 100, clientY: 100, shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, ...values }); q(t, '[data-specimen-canvas]').dispatchEvent(event); }); return event; }
function pointerCanvas(t) { const canvas = q(t, '[data-specimen-canvas]'); canvas.getBoundingClientRect = () => ({ width: 400, height: 240, left: 0, top: 0 }); canvas.setPointerCapture = vi.fn(); canvas.hasPointerCapture = vi.fn(() => true); canvas.releasePointerCapture = vi.fn(); return canvas; }
async function key(target, values) { const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...values }); await React.act(async () => target.dispatchEvent(event)); return event; }
async function moveDetail(t) { await click(q(t, '[data-specimen-mode-button="move"]')); await click(q(t, '[data-specimen-pan-button="right"]')); await click(q(t, '[data-specimen-pan-button="up"]')); }


describe('rear specimen inspection', () => {
  it.each([{group:'fish'}, {group:'coral'}, {group:'structure'}, {group:'invertebrate',habit:'sessile'}])('opposes Front for $group / $habit and preserves a rear memory pose', meta => {
    api.info=()=>({...meta,portrait:{dir:[.3,.5,3.2],lookY:0}});
    const canvas=document.createElement('canvas'),controller=X.createMarineSpecimenController(namespace,canvas,'clownfish',vi.fn());
    const camera=renderers[0].render.mock.calls[0][1],bounds=X.marineSpecimenBounds(namespace,models[0]);
    controller.setAngle('front');const front=camera.position.clone().sub(bounds.center).normalize();
    controller.setLighting('studio');controller.zoom(2);controller.pan(.2,.1);const before=frames();
    const rear=controller.setAngle('rear'),back=camera.position.clone().sub(bounds.center).normalize();
    expect(rear).toMatchObject({angle:'rear',scale:1,panX:0,panY:0,lighting:'studio'});expect(frames()).toBe(before+1);
    expect(front.dot(back)).toBeCloseTo(-1,10);expect(back.y).toBeCloseTo(0,10);
    controller.zoom(1.25);controller.pan(.1,-.1);const saved=controller.getView();
    controller.setAngle('above');expect(controller.restoreView(saved)).toEqual(saved);
    const stable=frames();expect(controller.restoreView(saved)).toEqual(saved);expect(frames()).toBe(stable);
    const bad={...saved,angle:'rearward'};expect(controller.restoreView(bad)).toEqual(saved);expect(frames()).toBe(stable);
    controller.dispose();expect(controller.setAngle('rear')).toEqual(saved);expect(frames()).toBe(stable);
    expect(models[0].dispose).toHaveBeenCalledTimes(1);expect(renderers[0].dispose).toHaveBeenCalledTimes(1);
  });

  it('fits Rear from a zoomed detail, keeps lighting and Fine, supports Fit/Swap, and returns Home to the portrait', async()=>{
    const t=await mount(),records=JSON.stringify(t.data),button=q(t,'[data-specimen-angle-button="rear"]');
    expect(button.textContent).toBe('Rear');expect(button.getAttribute('aria-pressed')).toBe('false');
    await click(q(t,'[data-specimen-light-button="studio"]'));await click(q(t,'[data-specimen-fine]'));await magnify(t);await moveDetail(t);
    const count=frames();await click(button);expect(frames()).toBe(count+1);expect(document.activeElement).toBe(button);
    expect(button.getAttribute('aria-pressed')).toBe('true');expect(dataView(t)).toMatchObject({specimenAngle:'rear',specimenScale:'1',specimenPanX:'0',specimenPanY:'0',specimenMode:'turn',specimenPrecision:'fine',specimenLighting:'studio'});
    await magnify(t,4);await moveDetail(t);await React.act(async()=>{q(t,'[data-specimen-memory]').open=true});await click(q(t,'[data-specimen-remember]'));const saved=logical(dataView(t));
    await click(q(t,'[data-specimen-fit]'));const fit=logical(dataView(t));expect(fit).toEqual({...saved,specimenScale:'1',specimenPanX:'0',specimenPanY:'0'});
    await click(q(t,'[data-specimen-swap]'));expect(logical(dataView(t))).toEqual(saved);await click(q(t,'[data-specimen-swap]'));expect(logical(dataView(t))).toEqual(fit);
    const canvas=q(t,'[data-specimen-canvas]');canvas.focus();await key(canvas,{key:'ArrowRight'});expect(dataView(t).specimenAngle).toBe('custom');await key(canvas,{key:'Home'});
    expect(dataView(t)).toMatchObject({specimenAngle:'portrait',specimenTurn:'0',specimenTilt:'0',specimenScale:'1',specimenLighting:'studio',specimenPrecision:'fine'});
    expect(JSON.stringify(t.data)).toBe(records);expect(renderers).toHaveLength(1);expect(models[0].update).not.toHaveBeenCalled();
    await click(q(t,'[data-study-specimen-toggle]'));expect(models[0].dispose).toHaveBeenCalledTimes(1);expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
  });

  it('keeps Rear anonymous and ungraded in identification and releases the renderer at the next organism',async()=>{
    const t=await mount('mystery'),records=JSON.stringify(t.data),text=X.speciesText((k,v)=>v),canvas=q(t,'[data-specimen-canvas]');
    await click(q(t,'[data-specimen-angle-button="rear"]'));await magnify(t,4);await moveDetail(t);await key(canvas,{key:'Home',shiftKey:true});
    expect(dataView(t)).toMatchObject({specimenAngle:'rear',specimenScale:'2',specimenPanX:'0',specimenPanY:'0'});
    expect(canvas.getAttribute('aria-label')).toBe('Interactive 3D model of the mystery organism');for(const id of ['clownfish','blue_tang'])expect(q(t,'[data-practice-specimen]').textContent).not.toContain(text[id].name);
    expect(JSON.stringify(t.data)).toBe(records);const id=q(t,'.cr-dxp-portrait img').getAttribute('src').split('/').pop().replace(/\.webp.*$/,'');await click(q(t,'[data-practice-choice="'+id+'"]'));
    const feedback=q(t,'[data-practice-feedback]').textContent;await click(q(t,'[data-specimen-angle-button="front"]'));await click(q(t,'[data-specimen-angle-button="rear"]'));expect(q(t,'[data-practice-feedback]').textContent).toBe(feedback);
    await click(q(t,'[data-practice-next]'));expect(q(t,'[data-specimen-canvas]')).toBeNull();expect(models[0].dispose).toHaveBeenCalledTimes(1);expect(renderers[0].dispose).toHaveBeenCalledTimes(1);
    expect(t.data.speciesPractice).toBeUndefined();const nextId=q(t,'.cr-dxp-portrait img').getAttribute('src').split('/').pop().replace(/\.webp.*$/,'');await click(q(t,'[data-practice-choice="'+nextId+'"]'));await click(q(t,'[data-practice-next]'));
    expect(t.data.speciesPractice).toMatchObject({answered:2,correct:2,last:{hinted:0,skipped:0}});
  });
});
