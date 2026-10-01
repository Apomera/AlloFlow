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


describe('Long-fin betta anatomy and rooted membranes',()=>{
 const fish={id:'betta',instanceId:'betta-1',name:'Betta',zone:'mid',targetX:4.5,targetZ:2.25};const root=h=>h.root('residents').children[0];
 const parts=(g,p)=>{const a=[];g.traverse(n=>{if(n.userData.anatomyPart===p)a.push(n);});return a;};
 const pose=g=>g.bettaMembranes.map(t=>Array.from(t.mesh.geometry.attributes.position.array));
 for(const quality of ['low','balanced','high'])it('retains the complete fin arrangement at '+quality+' quality',()=>{
  const h=harness({fish:[fish],paused:true,appearance:{quality}}),g=root(h);
  expect(g.userData.profileId).toBe('betta');expect(g.userData.bettaForm).toBe('representative-long-fin-male');
  for(const [part,count] of [['body',1],['caudal-fin',1],['dorsal-fin',1],['anal-fin',1],['pectoral-fin',2],['pelvic-fin',2],['gill-cover',2],['mouth-lip',1],['mouth-opening',1]])expect(parts(g,part)).toHaveLength(count);
  expect(parts(g,'pelvic-fin').every(p=>p.position.y<parts(g,'pectoral-fin')[0].position.y)).toBe(true);
  const anal=parts(g,'anal-fin')[0].geometry;anal.computeBoundingBox();expect(anal.boundingBox.max.x-anal.boundingBox.min.x).toBeGreaterThan(.7);
  expect(g.bettaMembranes).toHaveLength(3);for(const t of g.bettaMembranes){expect(t.weights.some(w=>w===0)).toBe(true);expect(t.weights.some(w=>w>.8)).toBe(true);}
  g.traverse(n=>{if(n.geometry)for(const key of ['position','normal'])if(n.geometry.attributes[key])expect(Array.from(n.geometry.attributes[key].array).every(Number.isFinite)).toBe(true);});
 });
 it('ripples all three membranes with fixed roots and bounded displacement without replacing geometry',()=>{
  const h=harness({fish:[fish]}),g=root(h),before=pose(g),geometries=g.bettaMembranes.map(t=>t.mesh.geometry),arrays=g.bettaMembranes.map(t=>t.mesh.geometry.attributes.position.array);
  for(let frame=0;frame<28;frame++){h.flush(80);for(const t of g.bettaMembranes){const p=t.mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){expect(p.getX(i)).toBe(t.rest[i*3]);expect(p.getY(i)).toBe(t.rest[i*3+1]);expect(Math.abs(p.getZ(i)-t.rest[i*3+2])).toBeLessThanOrEqual(.026001);if(t.weights[i]===0)expect(p.getZ(i)).toBe(t.rest[i*3+2]);}}expect(Math.abs(g.userData.tail.rotation.y)).toBeLessThanOrEqual(.100001);}
  expect(pose(g).every((p,i)=>p.some((v,j)=>v!==before[i][j]))).toBe(true);
  for(let i=0;i<3;i++){expect(g.bettaMembranes[i].mesh.geometry).toBe(geometries[i]);expect(g.bettaMembranes[i].mesh.geometry.attributes.position.array).toBe(arrays[i]);}
  const pair=parts(g,'pectoral-fin');expect(pair[0].rotation.y+pair[1].rotation.y).toBeCloseTo(0,8);
 });
 it('freezes the full fin pose on pause and reduced motion, then resumes deformation',()=>{
  const h=harness({fish:[fish]}),g=root(h);h.flush(100);h.update({paused:true});h.flush();const paused=pose(g);h.flush(700);expect(pose(g)).toEqual(paused);
  h.update({paused:false});h.flush(100);h.flush(200);expect(pose(g)).not.toEqual(paused);h.reduce(true);h.flush();const reduced=pose(g);h.flush(700);expect(pose(g)).toEqual(reduced);
  const still=harness({fish:[fish]},true),staticGroup=root(still),initial=pose(staticGroup);still.flush(600);expect(pose(staticGroup)).toEqual(initial);
 });
 it('contains the full moving membranes through volume and shape changes without stretching the fish',()=>{
  const h=harness({fish:[fish]}),g=root(h),geometry=parts(g,'body')[0].geometry,scale=g.scale.clone();
  for(const volumeGallons of [10,30,80])for(const shape of ['long','tall','cube']){h.update({dimensions:{volumeGallons,shape}});for(let n=0;n<16;n++){h.flush(80);const b=new realThree.Box3().setFromObject(g),v=h.root('vessel').userData;expect(b.min.x).toBeGreaterThan(-v.width/2-.01);expect(b.max.x).toBeLessThan(v.width/2+.01);expect(b.min.z).toBeGreaterThan(-v.depth/2-.01);expect(b.max.z).toBeLessThan(v.depth/2+.01);expect(b.min.y).toBeGreaterThan(-.01);expect(b.max.y).toBeLessThan(v.height+.01);}}
  expect(parts(g,'body')[0].geometry).toBe(geometry);expect(g.scale.equals(scale)).toBe(true);
 });
 it('releases membrane geometry, materials and textures on stock removal',()=>{
  const h=harness({fish:[fish]}),resources=new Set();root(h).traverse(n=>{if(n.geometry)resources.add(n.geometry);for(const m of n.material?(Array.isArray(n.material)?n.material:[n.material]):[]){resources.add(m);if(m.map)resources.add(m.map);}});
  const spies=Array.from(resources,r=>vi.spyOn(r,'dispose'));h.update({fish:[]});h.flush();for(const spy of spies)expect(spy).toHaveBeenCalled();expect(h.root('residents').children).toHaveLength(0);
 });
 it('keeps non-betta membrane geometry static during swimming',()=>{
  const h=harness({fish:[{...fish,id:'guppy'}]}),g=root(h),tail=parts(g,'caudal-fin')[0],before=Array.from(tail.geometry.attributes.position.array);expect(g.bettaMembranes).toBeUndefined();for(let i=0;i<20;i++)h.flush(80);expect(Array.from(tail.geometry.attributes.position.array)).toEqual(before);
 });
});
