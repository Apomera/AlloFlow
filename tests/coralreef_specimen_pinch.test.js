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
async function startPinch(t,a=100,b=200){await touch(t,'pointerdown',31,a);await touch(t,'pointerdown',32,b)}
async function endPinch(t){await touch(t,'pointerup',31,100);await touch(t,'pointerup',32,200)}
describe('two-finger specimen zoom',()=>{
 it('uses touch-distance ratio without turning or changing Fine, light or the selected angle',async()=>{
  const t=await mount(),canvas=pointerCanvas(t);await click(q(t,'[data-specimen-angle-button="rear"]'));await click(q(t,'[data-specimen-light-button="studio"]'));await click(q(t,'[data-specimen-fine]'));const before=dataView(t),records=JSON.stringify(t.data),count=frames();await startPinch(t);expect(frames()).toBe(count);await touch(t,'pointermove',32,300);expect(dataView(t)).toMatchObject({...before,specimenScale:'2',specimenPanX:expect.any(String)});expect(Number(dataView(t).specimenPanX)).toBeGreaterThan(0);expect(frames()).toBe(count+1);await touch(t,'pointermove',32,400);expect(dataView(t).specimenScale).toBe('3');const limit=frames();await touch(t,'pointermove',32,500);expect(frames()).toBe(limit+1);expect(dataView(t).specimenScale).toBe('3');await touch(t,'pointermove',32,150);expect(dataView(t)).toEqual(before);const min=frames();await touch(t,'pointermove',32,130);expect(frames()).toBe(min);await endPinch(t);expect(canvas.setPointerCapture.mock.calls.map(c=>c[0])).toEqual([31,32]);expect(JSON.stringify(t.data)).toBe(records);expect(renderers).toHaveLength(1);expect(models[0].update).not.toHaveBeenCalled();
 });
 it('retains Move and an off-center detail while zooming, clamps pan on the way out, and returns to Turn at100%',async()=>{
  const t=await mount();pointerCanvas(t);await magnify(t,4);await moveDetail(t);const before=dataView(t);await startPinch(t);await touch(t,'pointermove',32,225);expect(dataView(t)).toMatchObject({...before,specimenScale:'2.5',specimenPanX:expect.any(String)});expect(Number(dataView(t).specimenPanX)).toBeGreaterThan(Number(before.specimenPanX));await touch(t,'pointermove',32,105);expect(dataView(t)).toEqual({...before,specimenScale:'1',specimenPanX:'0',specimenPanY:'0',specimenMode:'turn'});await endPinch(t);
 });
 it.each(['pointerup','pointercancel','lostpointercapture'])('ends both captures on %s and ignores the remaining finger until a fresh down',async ending=>{
  const t=await mount(),canvas=pointerCanvas(t);await startPinch(t);await touch(t,'pointermove',32,250);await touch(t,ending,32,250);expect(canvas.releasePointerCapture.mock.calls.map(c=>c[0])).toEqual([31,32]);const before=dataView(t),count=frames();await touch(t,'pointermove',31,60,130);await touch(t,'pointerup',31,60,130);expect(dataView(t)).toEqual(before);expect(frames()).toBe(count);await touch(t,'pointerdown',41,100);await touch(t,'pointermove',41,130);expect(dataView(t).specimenTurn).not.toBe(before.specimenTurn);expect(dataView(t).specimenScale).toBe(before.specimenScale);await touch(t,'pointerup',41,130);
 });
 it('ignores duplicate and third touches and never mixes mouse or pen pointers into a pinch',async()=>{
  const t=await mount();pointerCanvas(t);await startPinch(t);const before=dataView(t),count=frames();await touch(t,'pointerdown',31,110);await touch(t,'pointerdown',33,300);await touch(t,'pointermove',33,350);await touch(t,'pointerup',33,350);expect(dataView(t)).toEqual(before);expect(frames()).toBe(count);await touch(t,'pointermove',32,250);expect(dataView(t).specimenScale).toBe('1.5');await endPinch(t);
  for(const pointerType of ['mouse','pen']){await pointer(t,'pointerdown',{pointerType,pointerId:51});await touch(t,'pointerdown',52,200);const state=dataView(t);await touch(t,'pointermove',52,300);expect(dataView(t)).toEqual(state);await pointer(t,'pointermove',{pointerType,pointerId:51,clientX:130});expect(dataView(t).specimenTurn).not.toBe(state.specimenTurn);await pointer(t,'pointerup',{pointerType,pointerId:51})}
 });
 it('waits for a stable separation when fingers begin together and rejects nonfinite pointer coordinates',async()=>{
  const t=await mount();pointerCanvas(t);const before=dataView(t),count=frames();await startPinch(t,100,100);await touch(t,'pointermove',32,104);expect(dataView(t)).toEqual(before);await touch(t,'pointermove',32,120);expect(frames()).toBe(count);await touch(t,'pointermove',32,140);expect(dataView(t).specimenScale).toBe('2');const stable=dataView(t);await touch(t,'pointermove',32,Infinity);await touch(t,'pointermove',31,NaN);expect(dataView(t)).toEqual(stable);await endPinch(t);
 });
 it('ends a pinch when controls change the view and retains exact remembered zoom without idle rendering',async()=>{
  const t=await mount(),canvas=pointerCanvas(t);await startPinch(t);await touch(t,'pointermove',32,275);await endPinch(t);await React.act(async()=>{q(t,'[data-specimen-memory]').open=true});await click(q(t,'[data-specimen-remember]'));const saved=dataView(t);await startPinch(t);await touch(t,'pointermove',32,250);await click(q(t,'[data-specimen-angle-button="below"]'));const fitted=dataView(t),count=frames();await touch(t,'pointermove',32,300);await touch(t,'pointermove',31,50);expect(dataView(t)).toEqual(fitted);expect(frames()).toBe(count);await endPinch(t);await click(q(t,'[data-specimen-restore]'));expect(dataView(t)).toEqual(saved);const idle=frames();await React.act(async()=>new Promise(r=>setTimeout(r,35)));expect(frames()).toBe(idle);expect(canvas.releasePointerCapture).toHaveBeenCalled();
 });
 it('keeps pinch guidance accessible with closed tips and remains anonymous and ungraded in practice',async()=>{
  const t=await mount('mystery'),canvas=pointerCanvas(t),records=JSON.stringify(t.data);expect(description(canvas)).toContain('spread two fingers');expect(q(t,'[data-specimen-tips]').open).toBe(false);await startPinch(t);await touch(t,'pointermove',32,260);await endPinch(t);expect(canvas.getAttribute('aria-label')).toBe('Interactive 3D model of the mystery organism');expect(JSON.stringify(t.data)).toBe(records);
  for(let i=0;i<2;i++){const id=q(t,'.cr-dxp-portrait img').getAttribute('src').split('/').pop().replace(/\.webp.*$/,'');await click(q(t,'[data-practice-choice="'+id+'"]'));await click(q(t,'[data-practice-next]'))}expect(t.data.speciesPractice).toMatchObject({answered:2,correct:2,last:{hinted:0,skipped:0}});expect(models[0].dispose).toHaveBeenCalledTimes(1);expect(renderers[0].dispose).toHaveBeenCalledTimes(1);
 });
 it('releases both pointers during unmount and starts a reopened model with an independent gesture',async()=>{
  const t=await mount(),canvas=pointerCanvas(t);await startPinch(t);await touch(t,'pointermove',32,250);await click(q(t,'[data-study-specimen-toggle]'));expect(canvas.releasePointerCapture.mock.calls.map(c=>c[0])).toEqual([31,32]);expect(renderers[0].dispose).toHaveBeenCalledTimes(1);await click(q(t,'[data-study-specimen-toggle]'));pointerCanvas(t);expect(dataView(t).specimenScale).toBe('1');await touch(t,'pointermove',32,300);expect(dataView(t).specimenScale).toBe('1');await startPinch(t);await touch(t,'pointermove',32,200);await endPinch(t);expect(dataView(t).specimenScale).toBe('1');
 });
});
