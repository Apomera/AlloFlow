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


async function touch(t,type,id,x,y=100,extra={}){return pointer(t,type,{pointerType:'touch',pointerId:id,clientX:x,clientY:y,...extra})}
async function start(t){await touch(t,'pointerdown',31,100);await touch(t,'pointerdown',32,200)}
async function end(t){await touch(t,'pointerup',31,100);await touch(t,'pointerup',32,200)}
async function shift(t,dx,dy=0){await touch(t,'pointermove',31,100+dx,100+dy);await touch(t,'pointermove',32,200+dx,100+dy)}
function pose(t){const s=dataView(t);delete s.specimenScale;delete s.specimenPanX;delete s.specimenPanY;return s}
describe('two-finger specimen translation',()=>{
 it('applies zoom and normalized pan atomically using the ordinary pan conversion, then stays idle for repeated or invalid inputs',()=>{
  const canvas=document.createElement('canvas'),ctl=X.createMarineSpecimenController(namespace,canvas,'clownfish',vi.fn());ctl.setAngle('rear');ctl.setLighting('studio');const before=ctl.getView(),count=frames();const combined=ctl.zoomPan(2,.07,-.04,.03,.02);expect(frames()).toBe(count+1);expect(combined).toMatchObject({scale:2,angle:'rear',lighting:'studio'});
  ctl.restoreView({...before,scale:2,panX:.03,panY:.02});expect(ctl.pan(.07,-.04)).toEqual(combined);const stable=frames();expect(ctl.zoomPan(2,.07,-.04,.03,.02)).toEqual(combined);expect(frames()).toBe(stable);
  for(const bad of [NaN,Infinity,-Infinity,'2',null,undefined])for(let i=0;i<5;i++){const args=[2,.07,-.04,.03,.02];args[i]=bad;expect(ctl.zoomPan(...args)).toEqual(combined)}expect(frames()).toBe(stable);ctl.dispose();expect(ctl.zoomPan(3,1,1,0,0)).toEqual(combined);expect(frames()).toBe(stable);
 });
 it('clamps combined zoom and pan, restores100%centering and does not render at an unchanged bound',()=>{
  const ctl=X.createMarineSpecimenController(namespace,document.createElement('canvas'),'clownfish',vi.fn());const count=frames(),max=ctl.zoomPan(50,100,-100,0,0);expect(max).toMatchObject({scale:3,panX:2/3,panY:-2/3});expect(frames()).toBe(count+1);ctl.zoomPan(100,200,-200,0,0);expect(frames()).toBe(count+1);expect(ctl.zoomPan(-2,100,100,200,200)).toMatchObject({scale:1,panX:0,panY:0});const min=frames();ctl.zoomPan(0,1,1,0,0);expect(frames()).toBe(min);ctl.dispose();
 });
 it('moves the midpoint in Turn mode and returns exactly to its baseline despite sequential scale changes',async()=>{
  const t=await mount();pointerCanvas(t);await magnify(t,4);await click(q(t,'[data-specimen-angle-button="rear"]'));await magnify(t,4);const before=dataView(t),fixed=pose(t);await start(t);await shift(t,24,12);const moved=dataView(t);expect(moved.specimenScale).toBe('2');expect(Number(moved.specimenPanX)).toBeGreaterThan(0);expect(Number(moved.specimenPanY)).toBeLessThan(0);expect(pose(t)).toEqual(fixed);await shift(t,0,0);expect(dataView(t)).toEqual(before);const n=frames();await shift(t,0,0);expect(frames()).toBe(n);await end(t);
 });
 it('quarters translation with first-finger-latched Fine control while preserving natural pinch gain',async()=>{
  const t=await mount();pointerCanvas(t);await magnify(t,4);await start(t);await shift(t,20,10);const coarse=dataView(t);await end(t);await click(q(t,'[data-specimen-fit]'));await magnify(t,4);await click(q(t,'[data-specimen-fine]'));await start(t);await shift(t,20,10);const fine=dataView(t);expect(Number(fine.specimenPanX)).toBeCloseTo(Number(coarse.specimenPanX)*.25,12);expect(Number(fine.specimenPanY)).toBeCloseTo(Number(coarse.specimenPanY)*.25,12);await touch(t,'pointermove',31,95,110);await touch(t,'pointermove',32,245,110);expect(dataView(t).specimenScale).toBe('3');await end(t);
 });
 it('keeps an off-center baseline, selected angle, light and Move preference through combined zoom/pan, and returns via memory',async()=>{
  const t=await mount();pointerCanvas(t);await click(q(t,'[data-specimen-light-button="studio"]'));await magnify(t,4);await moveDetail(t);const before=dataView(t),fixed=pose(t);await start(t);await touch(t,'pointermove',31,95,115);await touch(t,'pointermove',32,245,115);expect(dataView(t).specimenScale).toBe('3');expect(pose(t)).toEqual(fixed);expect(Number(dataView(t).specimenPanX)).toBeGreaterThan(Number(before.specimenPanX));await end(t);await React.act(async()=>{q(t,'[data-specimen-memory]').open=true});await click(q(t,'[data-specimen-remember]'));const saved=logical(dataView(t));await click(q(t,'[data-specimen-fit]'));await click(q(t,'[data-specimen-restore]'));expect(logical(dataView(t))).toEqual(saved);
 });
 it('ends translation on pointer release or reset, ignores a third pointer, and never transfers a remaining finger into a turn',async()=>{
  const t=await mount(),canvas=pointerCanvas(t);await magnify(t,4);await start(t);await shift(t,15,10);const moved=dataView(t);await touch(t,'pointerdown',33,300);await touch(t,'pointermove',33,330);await touch(t,'pointerup',33,330);expect(dataView(t)).toEqual(moved);await shift(t,25,15);await touch(t,'pointerup',32,225,115);const ended=dataView(t),count=frames();await touch(t,'pointermove',31,80,70);expect(dataView(t)).toEqual(ended);expect(frames()).toBe(count);await touch(t,'pointerup',31,80,70);await start(t);await shift(t,10);await key(canvas,{key:'Home'});const reset=dataView(t);await shift(t,30);expect(dataView(t)).toEqual(reset);await end(t);expect(canvas.releasePointerCapture.mock.calls.map(c=>c[0])).toEqual([31,32,31,32]);
 });
 it('establishes a fresh midpoint at the short-distance threshold and keeps100%pan centered',async()=>{
  const t=await mount();pointerCanvas(t);await magnify(t,4);await touch(t,'pointerdown',31,100);await touch(t,'pointerdown',32,100);const before=dataView(t);await touch(t,'pointermove',31,103);await touch(t,'pointermove',32,105);expect(dataView(t)).toEqual(before);await touch(t,'pointermove',32,123);expect(dataView(t)).toEqual(before);await touch(t,'pointermove',31,108);await touch(t,'pointermove',32,128);expect(dataView(t).specimenScale).toBe('2');expect(Number(dataView(t).specimenPanX)).toBeGreaterThan(0);await end(t);await click(q(t,'[data-specimen-fit]'));await start(t);await shift(t,10);expect(dataView(t)).toMatchObject({specimenScale:'1',specimenPanX:'0',specimenPanY:'0'});await end(t);
 });
 it('keeps combined gestures anonymous and ungraded with visible, accessible guidance, and cleans up on close',async()=>{
  const t=await mount('mystery'),canvas=pointerCanvas(t),records=JSON.stringify(t.data);expect(description(canvas)).toContain('Slide both fingers to move a zoomed detail');await magnify(t,4);await start(t);await shift(t,20,10);expect(canvas.getAttribute('aria-label')).toBe('Interactive 3D model of the mystery organism');expect(JSON.stringify(t.data)).toBe(records);await click(q(t,'[data-practice-specimen-toggle]'));expect(canvas.releasePointerCapture.mock.calls.map(c=>c[0])).toEqual([31,32]);expect(renderers[0].dispose).toHaveBeenCalledTimes(1);expect(models[0].update).not.toHaveBeenCalled();
 });
});
