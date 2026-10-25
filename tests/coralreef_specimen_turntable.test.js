import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
let X, namespace, api, renderers, models, observers, frameQueue, nextFrame, hidden;
beforeEach(() => {
  frameQueue = new Map(); nextFrame = 1; hidden = false;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { const id=nextFrame++; frameQueue.set(id, callback); return id; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frameQueue.delete(id));
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
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
const q = (t, selector) => t.host.querySelector(selector);
const frames = () => renderers[0].render.mock.calls.length;
function step(time) { const callbacks = [...frameQueue.values()]; frameQueue.clear(); for (const callback of callbacks) callback(time); }
function controller(callback=vi.fn(), failure=vi.fn()) { const canvas=document.createElement('canvas'); return X.createMarineSpecimenController(namespace, canvas, 'clownfish', failure, callback); }
async function click(el) { expect(el).toBeTruthy(); await React.act(async () => { el.focus(); el.click(); await new Promise(resolve => setTimeout(resolve, 0)); }); }
async function mount(reduced=true) {
 let data={coralReef:{section:'guide',guideSpeciesId:'clownfish',speciesBookmarks:{clownfish:true},speciesFieldNotes:{clownfish:'Keep my note'}}};
 const host=document.createElement('div');document.body.appendChild(host);const root=ReactDOMClient.createRoot(host), cfg=window.StemLab._registry.coralReef;
 const t={host,root,get data(){return data.coralReef;}};mounted.push(t);
 function Shell(){const [state,setState]=React.useState(data),[reduce,setReduce]=React.useState(reduced);data=state;t.setReduced=setReduce;return cfg.render({React,toolData:state,setToolData:setState,t:(key,fallback)=>fallback||key,reduceMotion:reduce});}
 await React.act(async()=>root.render(React.createElement(Shell)));
 await click(q(t,'[data-open-study]'));await click(q(t,'[data-study-specimen-toggle]'));
 await React.act(async()=>step(0));return t;
}
async function tick(time){await React.act(async()=>step(time));}
const state=t=>q(t,'[data-specimen-view]').dataset;
const toggle=t=>q(t,'[data-specimen-turntable-toggle]');

describe('optional specimen turntable',()=>{
 it('starts idle, rotates slowly on explicit start at a capped cadence, and updates React only on transitions',()=>{
  const changed=vi.fn(),c=controller(changed),n=frames(),original=c.getView();expect(frameQueue.size).toBe(0);expect(c.isTurntableRunning()).toBe(false);
  expect(c.setTurntable(true)).toBe(true);expect(changed).toHaveBeenCalledTimes(1);step(0);step(10);step(20);expect(frames()).toBe(n);step(40);
  expect(frames()).toBe(n+1);expect(c.getView().turn).toBeCloseTo(.0072,12);expect({...c.getView(),turn:original.turn}).toEqual({...original,angle:'custom'});expect(changed).toHaveBeenCalledTimes(1);
  step(80);expect(c.getView().turn).toBeCloseTo(.0144,12);expect(models[0].update).not.toHaveBeenCalled();expect(api.create).toHaveBeenCalledTimes(1);
  c.setTurntable(false);expect(changed).toHaveBeenCalledTimes(2);expect(changed.mock.calls[1]).toEqual([false,c.getView()]);expect(frameQueue.size).toBe(0);const stopped=frames();step(200);expect(frames()).toBe(stopped);c.dispose();
 });
 it('clamps a delayed frame and restarts timing without a catch-up jump',()=>{
  const c=controller();c.setTurntable(true);step(0);step(10000);expect(c.getView().turn).toBeCloseTo(.018);c.setTurntable(false);const before=c.getView().turn;c.setTurntable(true);step(100000);expect(c.getView().turn).toBe(before);step(100040);expect(c.getView().turn-before).toBeCloseTo(.0072);c.dispose();
 });
 it.each([
  ['turn',c=>c.turn(.2,0)],['pan',c=>c.pan(.1,0)],['pinch',c=>c.zoomPan(1.2,0,0,0,0)],['zoom',c=>c.zoom(.25)],['angle',c=>c.setAngle('front')],['light',c=>c.setLighting('detail')],['background',c=>c.setBackground('dark')],['appearance',c=>c.setAppearance('silhouette')],['restore',c=>c.restoreView(c.getView())],['reset',c=>c.reset()]
 ])('pauses on manual %s and leaves no scheduled animation',(_,command)=>{
  const c=controller();c.setTurntable(true);step(0);step(40);command(c);expect(c.isTurntableRunning()).toBe(false);expect(frameQueue.size).toBe(0);const before=c.getView(),n=frames();step(100);expect(c.getView()).toEqual(before);expect(frames()).toBe(n);c.dispose();
 });
 it('pauses when hidden, does not resume on return, and removes the visibility listener on dispose',()=>{
  const callback=vi.fn(),c=controller(callback);c.setTurntable(true);step(0);step(40);const current=c.getView();hidden=true;document.dispatchEvent(new Event('visibilitychange'));expect(c.isTurntableRunning()).toBe(false);expect(callback.mock.calls.at(-1)).toEqual([false,current]);expect(frameQueue.size).toBe(0);expect(c.setTurntable(true)).toBe(false);
  hidden=false;document.dispatchEvent(new Event('visibilitychange'));expect(c.isTurntableRunning()).toBe(false);c.setTurntable(true);const remove=vi.spyOn(document,'removeEventListener');c.dispose();expect(remove).toHaveBeenCalledWith('visibilitychange',expect.any(Function));expect(frameQueue.size).toBe(0);expect(c.setTurntable(true)).toBe(false);expect(models[0].dispose).toHaveBeenCalledTimes(1);
 });
 it('cancels the loop and disposes resources exactly once when a frame fails',()=>{
  const failed=vi.fn(),c=controller(vi.fn(),failed);c.setTurntable(true);step(0);renderers[0].render.mockImplementationOnce(()=>{throw Error('render failed')});step(40);expect(failed).toHaveBeenCalledTimes(1);expect(c.isTurntableRunning()).toBe(false);expect(frameQueue.size).toBe(0);c.dispose();expect(models[0].dispose).toHaveBeenCalledTimes(1);expect(renderers[0].dispose).toHaveBeenCalledTimes(1);
 });
 it('offers explicit keyboard-operable Start/Pause/Resume under reduced motion, preserving focus and saved records',async()=>{
  const t=await mount(),records=JSON.stringify(t.data),button=toggle(t);expect(button.textContent).toBe('Start turntable');expect(state(t).specimenTurntable).toBe('paused');expect(q(t,'[data-specimen-turntable-status]').textContent).toBe('');expect(document.getElementById(button.getAttribute('aria-describedby')).textContent).toContain('reduced motion');expect(document.getElementById(button.getAttribute('aria-controls'))).toBe(q(t,'[data-specimen-canvas]'));
  await click(button);expect(button.textContent).toBe('Pause turntable');expect(document.activeElement).toBe(button);await tick(0);await tick(40);expect(state(t).specimenTurn).toBe('0');await click(button);expect(Number(state(t).specimenTurn)).toBeCloseTo(.0072);expect(button.textContent).toBe('Resume turntable');expect(q(t,'[data-specimen-turntable-status]').textContent).toBe('Turntable paused.');expect(document.activeElement).toBe(button);expect(JSON.stringify(t.data)).toBe(records);
 });
 it('pauses on enabling reduced motion and never resumes when the preference is removed',async()=>{
  const t=await mount(false);await click(toggle(t));await tick(0);await tick(40);await React.act(async()=>t.setReduced(true));expect(state(t).specimenTurntable).toBe('paused');expect(Number(state(t).specimenTurn)).toBeCloseTo(.0072);await React.act(async()=>t.setReduced(false));expect(state(t).specimenTurntable).toBe('paused');expect(frameQueue.size).toBe(0);await click(toggle(t));expect(state(t).specimenTurntable).toBe('running');
 });
 it.each(['event','legacy'])('pauses on an OS reduced-motion change through the %s API, permits explicit restart, and removes the listener',apiKind=>{
  const listeners=new Set(),query={matches:false},add=vi.fn(callback=>listeners.add(callback)),remove=vi.fn(callback=>listeners.delete(callback));
  if(apiKind==='event'){query.addEventListener=vi.fn((name,callback)=>{expect(name).toBe('change');add(callback)});query.removeEventListener=vi.fn((name,callback)=>{expect(name).toBe('change');remove(callback)})}
  else{query.addListener=add;query.removeListener=remove}
  window.matchMedia.mockImplementation(name=>{expect(name).toBe('(prefers-reduced-motion: reduce)');return query});
  const changed=vi.fn(),c=controller(changed),fire=matches=>{query.matches=matches;for(const callback of listeners)callback(query)};
  expect(listeners.size).toBe(1);c.setTurntable(true);step(0);step(40);const before=c.getView();fire(true);
  expect(c.isTurntableRunning()).toBe(false);expect(frameQueue.size).toBe(0);expect(c.getView()).toEqual(before);expect(changed.mock.calls.at(-1)).toEqual([false,before]);
  fire(false);expect(c.isTurntableRunning()).toBe(false);fire(true);expect(c.setTurntable(true)).toBe(true);step(100);step(140);expect(c.getView().turn).toBeGreaterThan(before.turn);
  const callback=[...listeners][0];c.dispose();expect(remove).toHaveBeenCalledTimes(1);expect(remove).toHaveBeenCalledWith(callback);expect(listeners.size).toBe(0);expect(frameQueue.size).toBe(0);callback({matches:true});c.dispose();expect(remove).toHaveBeenCalledTimes(1);expect(models[0].dispose).toHaveBeenCalledTimes(1);
 });
 it.each(['event','legacy'])('removes the %s OS motion listener after renderer failure',apiKind=>{
  const listeners=new Set(),remove=vi.fn(callback=>listeners.delete(callback)),query={matches:false};
  if(apiKind==='event'){query.addEventListener=(_,callback)=>listeners.add(callback);query.removeEventListener=(_,callback)=>remove(callback)}else{query.addListener=callback=>listeners.add(callback);query.removeListener=remove}
  window.matchMedia.mockReturnValue(query);const failed=vi.fn(),c=controller(vi.fn(),failed);expect(listeners.size).toBe(1);c.setTurntable(true);step(0);renderers[0].render.mockImplementationOnce(()=>{throw Error('render failed')});step(40);
  expect(failed).toHaveBeenCalledTimes(1);expect(listeners.size).toBe(0);expect(remove).toHaveBeenCalledTimes(1);expect(frameQueue.size).toBe(0);c.dispose();expect(remove).toHaveBeenCalledTimes(1);
 });
 it.each(['missing','throws'])('keeps explicit turntable control available when matchMedia is %s',kind=>{
  if(kind==='missing')window.matchMedia=undefined;else window.matchMedia.mockImplementation(()=>{throw Error('Media queries unavailable')});
  const c=controller();expect(c.setTurntable(true)).toBe(true);step(0);step(40);expect(c.getView().turn).toBeGreaterThan(0);c.dispose();expect(frameQueue.size).toBe(0);
 });
 it.each(['out','in','fit','center'])('does not activate an aria-disabled %s button or pause a running turntable',async action=>{
  const t=await mount(),records=JSON.stringify(t.data);
  if(action==='in')for(let i=0;i<8;i++)await click(q(t,'[data-specimen-zoom="in"]'));
  if(action==='center'){await click(q(t,'[data-specimen-zoom="in"]'));await click(q(t,'[data-specimen-mode-button="move"]'))}
  const button=q(t,action==='in'||action==='out'?'[data-specimen-zoom="'+action+'"]':'[data-specimen-'+action+']');
  expect(button.getAttribute('aria-disabled')).toBe('true');await click(toggle(t));await tick(0);await tick(40);const n=frames();await click(button);
  expect(document.activeElement).toBe(button);expect(button.getAttribute('aria-disabled')).toBe('true');expect(state(t).specimenTurntable).toBe('running');expect(frames()).toBe(n);expect(JSON.stringify(t.data)).toBe(records);await tick(80);expect(frames()).toBe(n+1);
 });
 it('Remember freezes the current pose and Swap uses the live rotating view even when React still shows the remembered angle',async()=>{
  const t=await mount();await click(toggle(t));await tick(0);await tick(40);await click(q(t,'[data-specimen-remember]'));const remembered=Number(state(t).specimenTurn);expect(remembered).toBeCloseTo(.0072);expect(state(t).specimenTurntable).toBe('paused');expect(q(t,'[data-specimen-swap]').getAttribute('aria-disabled')).toBe('true');
  await click(toggle(t));await tick(100);await tick(140);expect(Number(state(t).specimenTurn)).toBe(remembered);expect(q(t,'[data-specimen-swap]').getAttribute('aria-disabled')).toBeNull();await click(q(t,'[data-specimen-swap]'));expect(state(t).specimenTurntable).toBe('paused');expect(Number(state(t).specimenTurn)).toBe(remembered);await click(q(t,'[data-specimen-swap]'));expect(Number(state(t).specimenTurn)).toBeCloseTo(remembered+.0072);expect(frameQueue.size).toBe(0);
 });
 it('pauses immediately at pointer-down and restores the static inspector when closed',async()=>{
  const t=await mount(),canvas=q(t,'[data-specimen-canvas]');canvas.getBoundingClientRect=()=>({width:400,height:240});await click(toggle(t));await tick(0);await tick(40);
  await React.act(async()=>{const event=new Event('pointerdown',{bubbles:true});Object.assign(event,{pointerId:3,button:0,clientX:20,clientY:20,pointerType:'mouse'});canvas.dispatchEvent(event);});expect(state(t).specimenTurntable).toBe('paused');expect(Number(state(t).specimenTurn)).toBeCloseTo(.0072);
  await click(toggle(t));await click(q(t,'[data-study-specimen-toggle]'));expect(frameQueue.size).toBe(0);expect(models[0].dispose).toHaveBeenCalledTimes(1);await click(q(t,'[data-study-specimen-toggle]'));expect(toggle(t).textContent).toBe('Start turntable');expect(state(t).specimenTurntable).toBe('paused');
 });
});
