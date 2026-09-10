// The geometry and raycaster are real Three r128; only GPU drawing is replaced.
// Real WebGL appearance and browser interactions are covered by the visual QA harness.
import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const realThree = require('../vendor/three-r128/three.min.js');
const source = fs.readFileSync(path.resolve('stem_lab/stem_tool_aquarium.js'), 'utf8');
const start = source.indexOf('  function getAquariumPlantVisualProfile(id) {');
const end = source.indexOf('  function AquariumHabitat3DViewport(props) {', start);
const sceneSource = source.slice(start, end);
const cleanups = [];

function harness(initial = {}, preference = false) {
  const frames = new Map(), canvasListeners = new Map(), documentListeners = new Map();
  let frameId = 0, now = 0, renderer, mediaListener;
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({ createLinearGradient: () => gradient, createRadialGradient: () => gradient }, { get(target, key) { return key in target ? target[key] : () => {}; } });
  const canvas = {
    clientWidth: 760, clientHeight: 420,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 760, height: 420 }),
    addEventListener: (name, fn) => canvasListeners.set(name, fn),
    removeEventListener: (name, fn) => { if (canvasListeners.get(name) === fn) canvasListeners.delete(name); }
  };
  class Renderer {
    constructor() { renderer = this; this.render = vi.fn((scene, camera) => { this.scene = scene; this.camera = camera; scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); }); this.dispose = vi.fn(); this.renderLists = { dispose: vi.fn() }; }
    setPixelRatio(value) { this.pixelRatio = value; } setSize() {}
  }
  const media = { matches: preference, addEventListener: (_, fn) => { mediaListener = fn; }, removeEventListener: (_, fn) => { if (mediaListener === fn) mediaListener = null; } };
  const context = {
    window: { THREE: { ...realThree, WebGLRenderer: Renderer }, devicePixelRatio: 2, matchMedia: () => media, addEventListener() {}, removeEventListener() {} },
    document: { hidden: false, createElement: () => ({ width: 0, height: 0, getContext: () => ctx }), addEventListener: (name, fn) => documentListeners.set(name, fn), removeEventListener: name => documentListeners.delete(name) },
    requestAnimationFrame: fn => { frames.set(++frameId, fn); return frameId; },
    cancelAnimationFrame: id => frames.delete(id),
    AquariumEcosystemCore: { getPlantHabitatPosition: (_, index) => ({ x: -3 + index * 2, y: 0.15, z: -1 }) }
  };
  const create = vm.runInNewContext(sceneSource + '; createAquariumHabitatScene', context);
  let options = { fish: [], plants: [], layout: [], catalog: [], overlay: 'none', ...initial };
  const engine = create(canvas, options);
  const flush = (ms = 40) => { now += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now)); };
  flush();
  const result = {
    engine, renderer, frames, canvasListeners, documentListeners, flush,
    root: name => renderer.scene.getObjectByName('aquarium-' + name),
    update(patch) { options = { ...options, ...patch }; engine.update(options); },
    reduce(value) { media.matches = value; mediaListener({ matches: value }); },
    event(name, data = {}) { canvasListeners.get(name)?.({ button: 0, pointerId: 1, clientX: 380, clientY: 210, ...data }); },
    point(object) { renderer.scene.updateMatrixWorld(true); renderer.camera.updateMatrixWorld(true); let center = new realThree.Vector3(); if (object.geometry) { object.geometry.computeBoundingBox(); object.geometry.boundingBox.getCenter(center); object.localToWorld(center); } else object.getWorldPosition(center); const p = center.project(renderer.camera); return { clientX: (p.x + 1) * 380, clientY: (1 - p.y) * 210 }; }
  };
  cleanups.push(() => engine.dispose());
  return result;
}
const resident = (id, index = 0) => ({ id, instanceId: id + '-' + index, name: id, zone: 'mid', targetX: -2 + index * .3, targetZ: 0, fitScore: 80, stress: 0 });
afterEach(() => { cleanups.splice(0).forEach(cleanup => cleanup()); });


describe('Puffer uninflated anatomy and sculling',()=>{
 const fish={id:'puffer',instanceId:'puffer-1',name:'Tetra',zone:'mid',targetX:4.5,targetZ:2.25};const root=h=>h.root('residents').children[0];const parts=(g,p)=>{const a=[];g.traverse(n=>{if(n.userData.anatomyPart===p)a.push(n);});return a;};
 for(const quality of ['low','balanced','high'])it('retains posterior soft fins and diagnostic mouth anatomy at '+quality+' quality',()=>{
  const h=harness({fish:[fish],paused:true,appearance:{quality}}),g=root(h);expect(g.userData.profileId).toBe('puffer');expect(g.userData.inflationState).toBe('normal-uninflated');expect(parts(g,'body')[0].userData.bodyContour).toBe('uninflated-puffer');
  expect(parts(g,'dorsal-fin')).toHaveLength(1);expect(parts(g,'anal-fin')).toHaveLength(1);expect(parts(g,'pectoral-fin')).toHaveLength(2);expect(parts(g,'pelvic-fin')).toHaveLength(0);
  expect(parts(g,'dorsal-fin')[0].parent.position.x).toBeLessThan(-.2);expect(parts(g,'anal-fin')[0].parent.position.x).toBeLessThan(-.2);
  for(const part of ['gill-slit','upper-beak-plate','lower-beak-plate','nasal-papilla'])expect(parts(g,part)).toHaveLength(2);expect(parts(g,'beak-opening')).toHaveLength(1);expect(parts(g,'beak-lip')).toHaveLength(1);
  for(const slit of parts(g,'gill-slit'))expect(slit.position.x).toBeGreaterThan(parts(g,'pectoral-fin')[0].position.x);
  expect(g.userData.fins.filter(f=>f.userData.pufferScull)).toHaveLength(4);g.traverse(n=>{if(n.geometry)for(const key of ['position','normal'])if(n.geometry.attributes[key])expect(Array.from(n.geometry.attributes[key].array).every(Number.isFinite)).toBe(true);});
 });
 it('narrows the caudal peduncle and retains the established dorsal pigment loops',()=>{
  const h=harness({fish:[fish],paused:true}),g=root(h),body=parts(g,'body')[0],p=body.geometry.attributes.position;let front=0,rear=0;for(let i=0;i<p.count;i++){const x=p.getX(i),z=Math.abs(p.getZ(i));if(x>.1&&x<.5)front=Math.max(front,z);if(x<-.5&&x>-.85)rear=Math.max(rear,z);}expect(front).toBeGreaterThan(rear*1.4);expect(body.material.map.userData.profileId).toBe('puffer');expect(g.userData.dorsalOcellusCount).toBe(3);const tail=parts(g,'caudal-fin')[0];tail.geometry.computeBoundingBox();expect(tail.geometry.boundingBox.min.x).toBeGreaterThan(-.27);
 });
 it('sculls with all four fins, limits tail sweep, and freezes with pause or reduced motion',()=>{
  const h=harness({fish:[fish]}),g=root(h),poses=()=>g.userData.fins.map(f=>f.rotation.y),initial=poses();for(let n=0;n<20;n++){h.flush(80);expect(Math.abs(g.userData.tail.rotation.y)).toBeLessThanOrEqual(.07501);}expect(poses().every((x,i)=>Math.abs(x-initial[i])>1e-5)).toBe(true);
  h.update({paused:true});h.flush();const paused=poses();h.flush(600);expect(poses()).toEqual(paused);h.update({paused:false});h.flush(100);h.flush(100);expect(poses()).not.toEqual(paused);h.reduce(true);h.flush();const reduced=poses();h.flush(600);expect(poses()).toEqual(reduced);
 });
 it('keeps the full moving body and fins inside resized tanks without changing mesh scale',()=>{
  const h=harness({fish:[fish]}),g=root(h),body=parts(g,'body')[0],geometry=body.geometry,scale=g.scale.clone();for(const volumeGallons of [10,30,80]){h.update({dimensions:{volumeGallons,shape:'long'}});for(let n=0;n<45;n++){h.flush(80);const b=new realThree.Box3().setFromObject(g),v=h.root('vessel').userData;expect(b.min.x).toBeGreaterThan(-v.width/2-.01);expect(b.max.x).toBeLessThan(v.width/2+.01);expect(b.min.z).toBeGreaterThan(-v.depth/2-.01);expect(b.max.z).toBeLessThan(v.depth/2+.01);expect(b.min.y).toBeGreaterThan(-.01);expect(b.max.y).toBeLessThan(v.height+.01);}}expect(body.geometry).toBe(geometry);expect(g.scale.equals(scale)).toBe(true);
 });
 it('disposes the fin and facial resources on stock removal',()=>{
  const h=harness({fish:[fish]}),resources=new Set();root(h).traverse(n=>{if(n.geometry)resources.add(n.geometry);for(const m of n.material?(Array.isArray(n.material)?n.material:[n.material]):[])resources.add(m);});const spies=Array.from(resources,r=>vi.spyOn(r,'dispose'));h.update({fish:[]});h.flush();for(const spy of spies)expect(spy).toHaveBeenCalled();expect(h.root('residents').children).toHaveLength(0);
 });
});
