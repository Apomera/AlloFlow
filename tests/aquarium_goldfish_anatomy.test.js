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


describe('Common goldfish anatomy and paired fin motion',()=>{
 const fish={id:'goldfish',instanceId:'goldfish-1',name:'Goldfish',zone:'mid',targetX:4.5,targetZ:2.25};
 const root=h=>h.root('residents').children[0];
 const parts=(g,p)=>{const out=[];g.traverse(n=>{if(n.userData.anatomyPart===p)out.push(n);});return out;};
 for(const quality of ['low','balanced','high'])it('keeps a complete single-tail body plan at '+quality+' quality',()=>{
  const h=harness({fish:[fish],paused:true,appearance:{quality}}),g=root(h);
  expect(g.userData.profileId).toBe('goldfish');expect(g.userData.goldfishForm).toBe('common-single-tail');
  for(const [part,count] of [['body',1],['caudal-fin',1],['dorsal-fin',1],['anal-fin',1],['pectoral-fin',2],['pelvic-fin',2],['gill-cover',2],['terminal-mouth-lip',1],['terminal-mouth-opening',1]])expect(parts(g,part)).toHaveLength(count);
  const bounds=p=>{const b=parts(g,p)[0].geometry;b.computeBoundingBox();return b.boundingBox;};
  expect(bounds('dorsal-fin').max.x-bounds('dorsal-fin').min.x).toBeGreaterThan(.5);
  expect(bounds('dorsal-fin').max.y).toBeGreaterThan(.4);expect(bounds('anal-fin').max.x).toBeLessThan(0);
  expect(parts(g,'pelvic-fin').every(n=>n.position.x<parts(g,'pectoral-fin')[0].position.x&&n.position.y<-.15)).toBe(true);
  expect(g.userData.barbelCount).toBe(0);expect(parts(g,'barbel')).toHaveLength(0);
  g.traverse(n=>{if(n.geometry)for(const key of ['position','normal'])if(n.geometry.attributes[key])expect(Array.from(n.geometry.attributes[key].array).every(Number.isFinite)).toBe(true);});
 });
 it('tapers the rear body and renders forked lobes with an open central notch',()=>{
  const h=harness({fish:[fish],paused:true}),g=root(h),body=parts(g,'body')[0],p=body.geometry.attributes.position;let front=0,rear=0;
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=Math.abs(p.getZ(i));if(x>.1&&x<.5)front=Math.max(front,z);if(x<-.5&&x>-.85)rear=Math.max(rear,z);}
  expect(front).toBeGreaterThan(rear*1.3);expect(body.userData.scaleSurface).toBe('flush-overlapping-arcs');expect(body.material.map.userData.profileId).toBe('goldfish');
  const tail=parts(g,'caudal-fin')[0];tail.updateWorldMatrix(true,false);
  const hits=(x,y)=>{const point=tail.localToWorld(new realThree.Vector3(x,y,0)),normal=new realThree.Vector3(0,0,1).transformDirection(tail.matrixWorld);return new realThree.Raycaster(point.clone().add(normal),normal.negate()).intersectObject(tail);};
  expect(hits(-.34,0)).toHaveLength(0);expect(hits(-.30,.12).length).toBeGreaterThan(0);expect(hits(-.30,-.12).length).toBeGreaterThan(0);
 });
 it('moves paired fins symmetrically without rebuilding them and freezes on pause and reduced motion',()=>{
  const h=harness({fish:[fish]}),g=root(h),fins=g.userData.fins.filter(f=>f.userData.goldfishPaddle),geo=fins.map(f=>f.geometry),read=()=>fins.map(f=>f.rotation.y),start=read();expect(fins).toHaveLength(4);
  for(let n=0;n<20;n++)h.flush(80);expect(read().every((v,i)=>Math.abs(v-start[i])>1e-5)).toBe(true);
  for(const type of ['pectoral-fin','pelvic-fin']){const pair=parts(g,type);expect(pair[0].rotation.y+pair[1].rotation.y).toBeCloseTo(0,8);}
  h.update({paused:true});h.flush();const paused=read();h.flush(600);expect(read()).toEqual(paused);h.update({paused:false});h.flush(100);h.flush(100);expect(read()).not.toEqual(paused);h.reduce(true);h.flush();const reduced=read();h.flush(600);expect(read()).toEqual(reduced);expect(fins.every((f,i)=>f.geometry===geo[i])).toBe(true);
 });
 it('contains the complete moving fish while changing tank dimensions without stretching it',()=>{
  const h=harness({fish:[fish]}),g=root(h),geometry=parts(g,'body')[0].geometry,scale=g.scale.clone();
  for(const volumeGallons of [10,30,80])for(const shape of ['long','tall','cube']){h.update({dimensions:{volumeGallons,shape}});for(let n=0;n<16;n++){h.flush(80);const b=new realThree.Box3().setFromObject(g),v=h.root('vessel').userData;expect(b.min.x).toBeGreaterThan(-v.width/2-.01);expect(b.max.x).toBeLessThan(v.width/2+.01);expect(b.min.z).toBeGreaterThan(-v.depth/2-.01);expect(b.max.z).toBeLessThan(v.depth/2+.01);expect(b.min.y).toBeGreaterThan(-.01);expect(b.max.y).toBeLessThan(v.height+.01);}}
  expect(parts(g,'body')[0].geometry).toBe(geometry);expect(g.scale.equals(scale)).toBe(true);
 });
 it('releases added mesh, material and texture resources when a resident is removed',()=>{
  const h=harness({fish:[fish]}),resources=new Set();root(h).traverse(n=>{if(n.geometry)resources.add(n.geometry);for(const m of n.material?(Array.isArray(n.material)?n.material:[n.material]):[]){resources.add(m);if(m.map)resources.add(m.map);}});
  const spies=Array.from(resources,r=>vi.spyOn(r,'dispose'));h.update({fish:[]});h.flush();for(const spy of spies)expect(spy).toHaveBeenCalled();expect(h.root('residents').children).toHaveLength(0);
 });
});
