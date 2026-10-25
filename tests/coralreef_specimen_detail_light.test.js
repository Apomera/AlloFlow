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

function controller(){const canvas=document.createElement('canvas');Object.defineProperty(canvas,'clientWidth',{value:390});Object.defineProperty(canvas,'clientHeight',{value:260});return X.createMarineSpecimenController(namespace,canvas,'clownfish',vi.fn())}
function scene(){return renderers[0].render.mock.calls.at(-1)[0]}
function camera(){return renderers[0].render.mock.calls.at(-1)[1]}
function light(){return scene().children.find(n=>n.isDirectionalLight)}
function camState(){return [...camera().position.toArray(),...camera().quaternion.toArray(),...camera().projectionMatrix.elements]}
function lightState(){const s=scene(),h=s.children.find(n=>n.isHemisphereLight),l=light();return{background:s.background.uuid||s.background.getHex(),sky:h.color.getHex(),ground:h.groundColor.getHex(),fill:h.intensity,key:l.intensity,position:l.position.toArray(),target:l.target.position.toArray()}}
function localLight(){return light().position.clone().sub(light().target.position).normalize().applyQuaternion(camera().quaternion.clone().invert()).toArray()}
function sameVector(a,b){a.forEach((n,i)=>expect(n).toBeCloseTo(b[i],12))}
describe('surface detail inspection light',()=>{
 it('reuses both lights and model resources, keeps the exact pose, and restores existing Reef/Studio appearances after Detail',()=>{
  const c=controller(),s=scene(),children=[...s.children],r=renderers[0],reef=lightState();c.setLighting('studio');const studio=lightState();c.turn(.31,-.24);c.zoom(1.25);c.pan(.09,-.06);const before=c.getView(),cam=camState(),count=frames(),geometry=models[0].root.children[0].geometry;
  expect(c.setLighting('detail')).toEqual({...before,lighting:'detail'});expect(camState()).toEqual(cam);expect(frames()).toBe(count+1);expect(scene()).toBe(s);expect(s.children).toEqual(children);expect(s.children.filter(n=>n.isLight)).toHaveLength(2);expect(light().castShadow).toBe(false);expect(renderers).toHaveLength(1);expect(models[0].root.children[0].geometry).toBe(geometry);expect(api.create).toHaveBeenCalledTimes(1);expect(models[0].update).not.toHaveBeenCalled();expect(lightState().fill).toBeLessThan(studio.fill);expect(lightState().key).toBeGreaterThan(studio.key);
  const fixed=frames();for(const invalid of ['detail','DETAIL','fluorescence','',null,undefined,{},1])c.setLighting(invalid);expect(frames()).toBe(fixed);expect(camState()).toEqual(cam);
  c.setLighting('reef');expect(lightState()).toEqual(reef);c.setLighting('detail');c.setLighting('studio');expect(lightState()).toEqual(studio);expect(camState()).toEqual(cam);c.dispose();const dead=frames();c.setLighting('detail');expect(frames()).toBe(dead);expect(r.dispose).toHaveBeenCalledTimes(1);
 });
 it.each(['side','rear','above','below'])('keeps an oblique light beside the viewer for %s and through turn, pan and zoom',angle=>{
  const c=controller();c.setLighting('detail');const initial=localLight();expect(initial[0]).toBeLessThan(-.3);expect(initial[1]).toBeGreaterThan(.2);expect(initial[2]).toBeGreaterThan(.5);c.setAngle(angle);sameVector(localLight(),initial);const oldPosition=light().position.toArray();c.turn(.47,.13);sameVector(localLight(),initial);expect(light().position.toArray()).not.toEqual(oldPosition);c.zoom(1);c.pan(.1,-.08);sameVector(localLight(),initial);c.zoomPan(2.5,.05,-.04,.02,.03);sameVector(localLight(),initial);observers[0].callback();sameVector(localLight(),initial);expect(light().position.toArray().every(Number.isFinite)).toBe(true);const b=X.marineSpecimenBounds(namespace,models[0]);expect(light().target.position.toArray()).toEqual(b.center.toArray());c.dispose();
 });
 it('restores Detail, pose and oblique light together in one frame and fits without losing light or orientation',()=>{
  const c=controller();c.setAngle('below');c.turn(.3,-.2);c.zoom(1.5);c.pan(.1,-.1);c.setLighting('detail');const saved=c.getView(),cam=camState(),lighting=lightState();c.setAngle('front');c.setLighting('reef');const n=frames();expect(c.restoreView(saved)).toEqual(saved);expect(frames()).toBe(n+1);sameVector(camState(),cam);expect(lightState()).toEqual(lighting);c.restoreView(saved);expect(frames()).toBe(n+1);const rot=camera().quaternion.toArray();c.restoreView({...saved,scale:1,panX:0,panY:0});expect(c.getView().lighting).toBe('detail');sameVector(camera().quaternion.toArray(),rot);expect(lightState()).toEqual(lighting);c.reset();expect(c.getView().lighting).toBe('detail');c.dispose();
 });
 it('exposes accessible Detail help and swaps it with a Studio view while keeping Fine, records and idle rendering',async()=>{
  const t=await mount(),records=JSON.stringify(t.data),b=q(t,'[data-specimen-light-button="detail"]');expect(b.textContent).toBe('Detail light');expect(b.getAttribute('aria-pressed')).toBe('false');expect(description(b.parentElement)).toContain('reveal ridges, folds and fine textures');await click(q(t,'[data-specimen-fine]'));await magnify(t,4);await moveDetail(t);const before=dataView(t);await click(b);expect(dataView(t)).toEqual({...before,specimenLighting:'detail'});expect(b.getAttribute('aria-pressed')).toBe('true');await React.act(async()=>{q(t,'[data-specimen-memory]').open=true});await click(q(t,'[data-specimen-remember]'));const a=logical(dataView(t)),ca=camState(),la=lightState();await click(q(t,'[data-specimen-angle-button="above"]'));await click(q(t,'[data-specimen-light-button="studio"]'));const second=logical(dataView(t)),cb=camState(),lb=lightState();
  for(let i=0;i<4;i++){await click(q(t,'[data-specimen-swap]'));expect(logical(dataView(t))).toEqual(i%2?second:a);sameVector(camState(),i%2?cb:ca);expect(lightState()).toEqual(i%2?lb:la)}await click(q(t,'[data-specimen-restore]'));expect(logical(dataView(t))).toEqual(a);const n=frames();await React.act(async()=>{await new Promise(resolve=>setTimeout(resolve,40))});expect(frames()).toBe(n);expect(JSON.stringify(t.data)).toBe(records);
 });
 it('ends both captured touches when Detail is chosen, ignores stale movement and retains the light through Fit/reset',async()=>{
  const t=await mount(),canvas=pointerCanvas(t);await start(t);await touch(t,'pointermove',32,250);await click(q(t,'[data-specimen-light-button="detail"]'));expect(canvas.releasePointerCapture.mock.calls.map(c=>c[0])).toEqual([31,32]);const saved=dataView(t),n=frames();await shift(t,50,20);expect(dataView(t)).toEqual(saved);expect(frames()).toBe(n);await end(t);await click(q(t,'[data-specimen-fit]'));await click(q(t,'[data-specimen-reset]'));expect(dataView(t).specimenLighting).toBe('detail');await touch(t,'pointerdown',44,100);await touch(t,'pointermove',44,125);expect(dataView(t).specimenTurn).not.toBe('0');await touch(t,'pointerup',44,125);
 });
 it.each(['render','context'])('recovers owned focus when the new light encounters a %s failure',async failure=>{
  const t=await mount(),b=q(t,'[data-specimen-light-button="detail"]');if(failure==='render'){renderers[0].render.mockImplementationOnce(()=>{throw Error('render failed')});await click(b)}else{await click(b);await React.act(async()=>q(t,'[data-specimen-canvas]').dispatchEvent(new Event('webglcontextlost',{cancelable:true})))}expect(q(t,'[data-specimen-status="error"]')).toBeTruthy();expect(document.activeElement).toBe(q(t,'[data-study-specimen-toggle]'));expect(models[0].dispose).toHaveBeenCalledTimes(1);expect(renderers[0].dispose).toHaveBeenCalledTimes(1);
 });
 it('keeps mystery inspection anonymous and does not add identification help or discoveries',async()=>{
  const t=await mount('mystery'),records=JSON.stringify(t.data);await click(q(t,'[data-specimen-light-button="detail"]'));expect(q(t,'[data-specimen-canvas]').getAttribute('aria-label')).toBe('Interactive 3D model of the mystery organism');expect(q(t,'[data-specimen-view]').textContent).not.toMatch(/clownfish|tang|Amphiprion|Paracanthurus/i);expect(JSON.stringify(t.data)).toBe(records);await click(q(t,'[data-practice-specimen-toggle]'));await click(q(t,'[data-practice-specimen-toggle]'));expect(dataView(t).specimenLighting).toBe('reef');expect(renderers).toHaveLength(2);
 });
});
