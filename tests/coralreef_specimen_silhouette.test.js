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

async function chooseBackground(t,value){const select=q(t,'[data-specimen-background-select]');await React.act(async()=>{select.focus();select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}))})}
function illumination(){const s=lightState();delete s.background;return s}
function noBackground(s){const copy={...s};delete copy.specimenBackground;return copy}
async function chooseAppearance(t,value){const select=q(t,'[data-specimen-appearance-select]');await React.act(async()=>{select.focus();select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}))})}
function compile(material){const shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}};material.onBeforeCompile(shader,renderers[0]);return shader}
function richModel(){
 const c=controller(),root=models[0].root,texture=new THREE.Texture(),first=new THREE.MeshStandardMaterial({map:texture,alphaTest:.42,side:THREE.DoubleSide,transparent:true,opacity:.6,depthWrite:false,vertexColors:true}),second=new THREE.MeshBasicMaterial({color:0xff4422});first.clippingPlanes=[new THREE.Plane(new THREE.Vector3(1,0,0),.2)];const uniform={value:3};first.onBeforeCompile=vi.fn(function(s){s.vertexShader+='\n// keep original posed geometry';s.uniforms.originalPose=uniform});first.customProgramCacheKey=()=> 'posed-original';const array=[first,second],a=root.children[0];a.material=array;const b=new THREE.Mesh(a.geometry,first);root.add(b);return{c,root,a,b,array,first,second,texture,uniform};
}
describe('optional silhouette inspection appearance',()=>{
 it('allocates clones only on demand, caches shared materials and restores exact original material and array identities',()=>{
  const r=richModel(),firstClone=vi.spyOn(r.first,'clone'),secondClone=vi.spyOn(r.second,'clone'),cam=camState(),n=frames();expect(firstClone).not.toHaveBeenCalled();expect(r.c.getView().appearance).toBe('natural');r.c.setAppearance('silhouette');const copies=r.a.material;expect(copies).not.toBe(r.array);expect(copies[0]).toBe(r.b.material);expect(firstClone).toHaveBeenCalledTimes(1);expect(secondClone).toHaveBeenCalledTimes(1);expect(frames()).toBe(n+1);expect(camState()).toEqual(cam);expect(copies[0].map).toBe(r.texture);expect(copies[0]).toMatchObject({alphaTest:.42,side:THREE.DoubleSide,transparent:true,opacity:.6,depthWrite:false,vertexColors:true});expect(copies[0].clippingPlanes[0]).toEqual(r.first.clippingPlanes[0]);r.c.setAppearance('natural');expect(r.a.material).toBe(r.array);expect(r.b.material).toBe(r.first);r.c.setAppearance('silhouette');expect(r.a.material).toBe(copies);expect(firstClone).toHaveBeenCalledTimes(1);expect(api.create).toHaveBeenCalledTimes(1);expect(models[0].update).not.toHaveBeenCalled();r.c.dispose();
 });
 it('composes the original posed vertex hook, keeps alpha/clipping pipeline, and changes only output RGB with a distinct cached key',()=>{
  const r=richModel();r.c.setAppearance('silhouette');const material=r.a.material[0],s=compile(material);expect(r.first.onBeforeCompile).toHaveBeenCalledTimes(1);expect(r.first.onBeforeCompile.mock.instances[0]).toBe(material);expect(s.vertexShader).toBe(THREE.ShaderLib.standard.vertexShader+'\n// keep original posed geometry');expect(s.uniforms.originalPose).toBe(r.uniform);expect(s.fragmentShader).toContain('#include <alphatest_fragment>');expect(s.fragmentShader).toContain('#include <clipping_planes_fragment>');expect(s.fragmentShader).toContain('gl_FragColor = vec4( reefSpecimenSilhouette, diffuseColor.a );');expect(material.customProgramCacheKey()).toBe('posed-original|reef-specimen-silhouette-v1');expect(r.first.customProgramCacheKey()).toBe('posed-original');const natural={vertexShader:'base',fragmentShader:'unchanged',uniforms:{}};r.first.onBeforeCompile(natural);expect(natural.fragmentShader).toBe('unchanged');r.c.dispose();
 });
 it('uses a single contrast uniform across materials and retains color through lighting and camera changes',()=>{
  const r=richModel();r.c.setAppearance('silhouette');const a=compile(r.a.material[0]),b=compile(r.a.material[1]),u=a.uniforms.reefSpecimenSilhouette;expect(b.uniforms.reefSpecimenSilhouette).toBe(u);const pale=new THREE.Color(0xf0f5f4).convertSRGBToLinear(),dark=new THREE.Color(0x14252c).convertSRGBToLinear();expect(u.value).toEqual(pale);r.c.setBackground('light');expect(u.value).toEqual(dark);for(const light of ['reef','studio','detail']){r.c.setLighting(light);r.c.setAngle('below');expect(u.value).toEqual(dark)}r.c.setBackground('dark');expect(u.value).toEqual(pale);r.c.setBackground('match');expect(u.value).toEqual(pale);r.c.dispose();
 });
 it('disposes each cached clone once, restores references before model disposal, and never disposes shared textures',()=>{
  const r=richModel(),textureDispose=vi.spyOn(r.texture,'dispose');r.c.setAppearance('silhouette');const copied=r.a.material.map(m=>vi.spyOn(m,'dispose'));models[0].dispose.mockImplementation(()=>{expect(r.a.material).toBe(r.array);expect(r.b.material).toBe(r.first)});r.c.dispose();r.c.dispose();copied.forEach(s=>expect(s).toHaveBeenCalledTimes(1));expect(textureDispose).not.toHaveBeenCalled();expect(models[0].dispose).toHaveBeenCalledTimes(1);expect(renderers[0].dispose).toHaveBeenCalledTimes(1);
 });
 it('remains idle for invalid and repeated modes and keeps silhouette through fit, center, zoom, pan and reset',()=>{
  const c=controller(),n=frames();for(const name of ['natural','',null,undefined,{},1,'Silhouette'])c.setAppearance(name);expect(frames()).toBe(n);c.setAppearance('silhouette');const chosen=models[0].root.children[0].material;for(const angle of ['above','below','rear']){c.setAngle(angle);c.zoom(1);c.pan(.1,-.1);c.restoreView({...c.getView(),scale:1,panX:0,panY:0});c.reset();expect(c.getView().appearance).toBe('silhouette');expect(models[0].root.children[0].material).toBe(chosen)}const before=frames();c.setAppearance('silhouette');expect(frames()).toBe(before);c.dispose();c.setAppearance('natural');expect(frames()).toBe(before);
 });
 it('restores appearance atomically and accepts both earlier snapshot shapes without mutation',()=>{
  const c=controller();c.setAngle('rear');c.zoom(1);c.pan(.1,.1);c.setLighting('detail');c.setBackground('dark');c.setAppearance('silhouette');const saved=c.getView(),cam=camState();c.setAppearance('natural');const n=frames();expect(c.restoreView(saved)).toEqual(saved);expect(frames()).toBe(n+1);expect(camState()).toEqual(cam);c.restoreView(saved);expect(frames()).toBe(n+1);for(const backgroundMissing of [false,true]){const legacy={...saved};delete legacy.appearance;if(backgroundMissing)delete legacy.background;const copy={...legacy};expect(c.restoreView(legacy)).toEqual({...legacy,background:legacy.background||'match',appearance:'natural'});expect(legacy).toEqual(copy);c.setAppearance('silhouette')}c.dispose();
 });
 it('rejects accessors and invalid appearance values before any pose, material or frame change',()=>{
  const c=controller();c.setAppearance('silhouette');const saved=c.getView(),material=models[0].root.children[0].material,n=frames(),getter=vi.fn();for(const appearance of [null,undefined,{},1,'Natural'])expect(c.restoreView({...saved,turn:1,appearance})).toEqual(saved);const accessor={...saved};Object.defineProperty(accessor,'appearance',{get:getter});expect(c.restoreView(accessor)).toEqual(saved);expect(getter).not.toHaveBeenCalled();expect(models[0].root.children[0].material).toBe(material);expect(frames()).toBe(n);c.dispose();
 });
 it('cleans up partial clone construction and preserves original references when a later clone fails',()=>{
  const r=richModel(),clone=r.first.clone(),dispose=vi.spyOn(clone,'dispose');vi.spyOn(r.first,'clone').mockReturnValue(clone);vi.spyOn(r.second,'clone').mockImplementation(()=>{throw Error('clone failure')});r.c.setAppearance('silhouette');expect(r.a.material).toBe(r.array);expect(r.b.material).toBe(r.first);expect(dispose).toHaveBeenCalledTimes(1);expect(models[0].dispose).toHaveBeenCalledTimes(1);expect(renderers[0].dispose).toHaveBeenCalledTimes(1);
 });
 it('exposes a compact labeled select, unique accessible help and visible appearance instructions',async()=>{
  const t=await mount(),select=q(t,'[data-specimen-appearance-select]');expect(select.tagName).toBe('SELECT');expect([...select.options].map(o=>[o.value,o.textContent])).toEqual([['natural','Natural color'],['silhouette','Silhouette']]);expect(q(t,'label[for="'+select.id+'"]').textContent).toContain('Appearance');expect(description(select)).toContain('Silhouette hides color and pattern');expect(q(t,'[data-specimen-tips]').textContent).toContain('Silhouette hides color and pattern');expect(t.host.querySelectorAll('#'+select.getAttribute('aria-describedby'))).toHaveLength(1);expect(select.value).toBe('natural');expect(select.parentElement.parentElement).toBe(q(t,'[data-specimen-background-select]').parentElement.parentElement);expect(q(t,'[data-specimen-memory]').textContent).toContain('background, and appearance');
 });
 it('swaps appearance-only remembered views and keeps camera, Fine, input mode and records stable',async()=>{
  const t=await mount(),records=JSON.stringify(t.data);await magnify(t,4);await moveDetail(t);await click(q(t,'[data-specimen-fine]'));const cam=camState();await React.act(async()=>{q(t,'[data-specimen-memory]').open=true});await click(q(t,'[data-specimen-remember]'));await chooseAppearance(t,'silhouette');expect(q(t,'[data-specimen-swap]').getAttribute('aria-disabled')).toBeNull();for(let i=0;i<4;i++){const n=frames();await click(q(t,'[data-specimen-swap]'));expect(dataView(t).specimenAppearance).toBe(i%2?'silhouette':'natural');expect(q(t,'[data-specimen-appearance-select]').value).toBe(i%2?'silhouette':'natural');expect(camState()).toEqual(cam);expect(frames()).toBe(n+1);expect(dataView(t).specimenPrecision).toBe('fine')}expect(JSON.stringify(t.data)).toBe(records);const count=frames();await React.act(async()=>{await new Promise(r=>setTimeout(r,35))});expect(frames()).toBe(count);
 });
 it('normalizes legacy remembered appearance for equality and swapping',async()=>{
  const refs=[],original=React.useRef,spy=vi.spyOn(React,'useRef').mockImplementation(v=>{const ref=original(v);refs.push(ref);return ref}),t=await mount();spy.mockRestore();const ctl=refs.find(r=>r.current&&typeof r.current.setAppearance==='function').current,legacy=ctl.getView();delete legacy.appearance;const get=vi.spyOn(ctl,'getView').mockImplementation(()=>({...legacy}));await click(q(t,'[data-specimen-remember]'));get.mockRestore();expect(q(t,'[data-specimen-swap]').getAttribute('aria-disabled')).toBe('true');await chooseAppearance(t,'silhouette');await click(q(t,'[data-specimen-swap]'));expect(dataView(t).specimenAppearance).toBe('natural');await click(q(t,'[data-specimen-swap]'));expect(dataView(t).specimenAppearance).toBe('silhouette');
 });
 it('ends both active touches on appearance selection and ignores remaining motion until a fresh touch',async()=>{
  const t=await mount(),canvas=pointerCanvas(t);await start(t);await touch(t,'pointermove',32,250);await chooseAppearance(t,'silhouette');expect(canvas.releasePointerCapture.mock.calls.map(c=>c[0])).toEqual([31,32]);const before=dataView(t),n=frames();await shift(t,20,10);expect(dataView(t)).toEqual(before);expect(frames()).toBe(n);await end(t);await click(q(t,'[data-specimen-fit]'));await touch(t,'pointerdown',45,100);await touch(t,'pointermove',45,130);expect(dataView(t).specimenTurn).not.toBe('0');expect(dataView(t).specimenAppearance).toBe('silhouette');await touch(t,'pointerup',45,130);
 });
 it.each(['render','context'])('restores focus and disposes clone resources on a %s failure',async failure=>{
  const t=await mount();await chooseAppearance(t,'silhouette');const copy=models[0].root.children[0].material,dispose=vi.spyOn(copy,'dispose');if(failure==='render'){renderers[0].render.mockImplementationOnce(()=>{throw Error('failed')});await chooseAppearance(t,'natural')}else await React.act(async()=>q(t,'[data-specimen-canvas]').dispatchEvent(new Event('webglcontextlost',{cancelable:true})));expect(q(t,'[data-specimen-status="error"]')).toBeTruthy();expect(document.activeElement).toBe(q(t,'[data-study-specimen-toggle]'));expect(dispose).toHaveBeenCalledTimes(1);expect(models[0].dispose).toHaveBeenCalledTimes(1);
 });
 it('keeps mystery inspection anonymous and ungraded, and reopens with natural colors and no memory',async()=>{
  const t=await mount('mystery'),records=JSON.stringify(t.data);await chooseAppearance(t,'silhouette');await click(q(t,'[data-specimen-remember]'));expect(q(t,'[data-specimen-canvas]').getAttribute('aria-label')).toBe('Interactive 3D model of the mystery organism');expect(q(t,'[data-specimen-view]').textContent).not.toMatch(/clownfish|tang|Amphiprion|Paracanthurus/i);expect(JSON.stringify(t.data)).toBe(records);await click(q(t,'[data-practice-specimen-toggle]'));await click(q(t,'[data-practice-specimen-toggle]'));expect(dataView(t).specimenAppearance).toBe('natural');expect(q(t,'[data-specimen-restore]').getAttribute('aria-disabled')).toBe('true');expect(renderers).toHaveLength(2);
 });
});
