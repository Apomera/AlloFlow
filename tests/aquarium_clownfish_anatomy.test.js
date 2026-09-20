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


describe('Representative ocellaris clownfish anatomy',()=>{
 const fish={id:'clown',instanceId:'clown-1',name:'Clownfish',zone:'mid',targetX:4.5,targetZ:2.25},root=h=>h.root('residents').children[0];
 const parts=(g,p)=>{const a=[];g.traverse(n=>{if(n.userData.anatomyPart===p)a.push(n);});return a;};
 function hitAt(mesh,x,y,side=1){mesh.updateWorldMatrix(true,false);const point=mesh.localToWorld(new realThree.Vector3(x,y,side)),direction=new realThree.Vector3(0,0,-side).transformDirection(mesh.matrixWorld);return new realThree.Raycaster(point,direction).intersectObject(mesh)[0];}
 function pigmentAt(mesh,x,y,side=1){const hit=hitAt(mesh,x,y,side);expect(hit).toBeTruthy();const {width,height,data}=mesh.material.map.image,u=Math.max(0,Math.min(width-1,Math.floor(hit.uv.x*width))),v=Math.max(0,Math.min(height-1,Math.floor(hit.uv.y*height))),offset=(v*width+u)*4;return Array.from(data.slice(offset,offset+4));}
 for(const quality of ['low','balanced','high'])it('retains complete fins and a connected notched dorsal at '+quality+' quality',()=>{
  const h=harness({fish:[fish],paused:true,appearance:{quality}}),g=root(h);expect(g.userData.clownfishForm).toBe('representative-orange-ocellaris');
  for(const [part,count] of [['body',1],['caudal-fin',1],['dorsal-fin',1],['anal-fin',1],['pectoral-fin',2],['pelvic-fin',2],['gill-cover',2],['terminal-mouth-opening',1]])expect(parts(g,part)).toHaveLength(count);
  const dorsal=parts(g,'dorsal-fin')[0];expect(hitAt(dorsal,-.09,.24)).toBeTruthy();expect(hitAt(dorsal,-.09,.285)).toBeUndefined();expect(hitAt(dorsal,.04,.28)).toBeTruthy();expect(hitAt(dorsal,-.20,.30)).toBeTruthy();
  g.traverse(n=>{if(n.geometry)for(const key of ['position','normal'])if(n.geometry.attributes[key])expect(Array.from(n.geometry.attributes[key].array).every(Number.isFinite)).toBe(true);});
 });
 it('rounds the tail and applies dark fin margins on both faces',()=>{
  const h=harness({fish:[fish],paused:true}),g=root(h),tail=parts(g,'caudal-fin')[0],sum=c=>c[0]+c[1]+c[2];expect(g.userData.caudalOutline).toBe('rounded');expect(hitAt(tail,-.35,0)).toBeTruthy();expect(hitAt(tail,-.35,.12)).toBeUndefined();
  for(const side of [-1,1]){const orange=pigmentAt(tail,-.22,0,side),edge=pigmentAt(tail,-.351,0,side);expect(orange[0]).toBeGreaterThan(200);expect(orange[0]).toBeGreaterThan(orange[1]*1.4);expect(sum(edge)).toBeLessThan(sum(orange)*.6);const dorsal=parts(g,'dorsal-fin')[0],white=pigmentAt(dorsal,.015,.27,side);expect(white.slice(0,3).every(c=>c>205)).toBe(true);}
 });
 it('retains three white bands and curves the middle band toward the head on both sides',()=>{
  const h=harness({fish:[fish],paused:true}),body=parts(root(h),'body')[0],pixel=(x,y,side)=>pigmentAt(body,x/.43,y/.245,side);
  for(const side of [-1,1]){for(const x of [-.335,.065,.205])expect(pixel(x,0,side).slice(0,3).every(c=>c>220)).toBe(true);const orange=pixel(.085,.18,side);expect(orange[0]).toBeGreaterThan(orange[1]*1.4);const edge=pixel(.245,0,side);expect(edge[0]+edge[1]+edge[2]).toBeLessThan(250);}
 });
 it('moves mirrored pectorals with a restrained tail and holds pause and reduced motion',()=>{
  const h=harness({fish:[fish]}),g=root(h),fins=g.userData.fins,initial=fins.map(f=>f.rotation.y),geo=fins.map(f=>f.geometry);expect(fins).toHaveLength(2);for(let i=0;i<20;i++){h.flush(80);expect(fins[0].rotation.y+fins[1].rotation.y).toBeCloseTo(0,8);expect(Math.abs(g.userData.tail.rotation.y)).toBeLessThanOrEqual(.140001);}expect(fins.every((f,i)=>Math.abs(f.rotation.y-initial[i])>1e-5)).toBe(true);
  h.update({paused:true});h.flush();const paused=fins.map(f=>f.rotation.y);h.flush(600);expect(fins.map(f=>f.rotation.y)).toEqual(paused);h.update({paused:false});h.flush(100);h.flush(200);expect(fins.map(f=>f.rotation.y)).not.toEqual(paused);h.reduce(true);h.flush();const reduced=fins.map(f=>f.rotation.y);h.flush(600);expect(fins.map(f=>f.rotation.y)).toEqual(reduced);expect(fins.every((f,i)=>f.geometry===geo[i])).toBe(true);
 });
 it('keeps all fins inside resized vessels without changing body size',()=>{
  const h=harness({fish:[fish]}),g=root(h),scale=g.scale.clone(),geometry=parts(g,'body')[0].geometry;
  for(const volumeGallons of [10,30,80])for(const shape of ['long','tall','cube']){h.update({dimensions:{volumeGallons,shape}});for(let i=0;i<16;i++){h.flush(80);const b=new realThree.Box3().setFromObject(g),v=h.root('vessel').userData;expect(b.min.x).toBeGreaterThan(-v.width/2-.01);expect(b.max.x).toBeLessThan(v.width/2+.01);expect(b.min.z).toBeGreaterThan(-v.depth/2-.01);expect(b.max.z).toBeLessThan(v.depth/2+.01);expect(b.min.y).toBeGreaterThan(-.01);expect(b.max.y).toBeLessThan(v.height+.01);}}
  expect(g.scale.equals(scale)).toBe(true);expect(parts(g,'body')[0].geometry).toBe(geometry);
 });
 it('disposes fin membranes and pigment textures on removal',()=>{
  const h=harness({fish:[fish]}),resources=new Set();root(h).traverse(n=>{if(n.geometry)resources.add(n.geometry);for(const m of n.material?(Array.isArray(n.material)?n.material:[n.material]):[]){resources.add(m);if(m.map)resources.add(m.map);}});const spies=Array.from(resources,r=>vi.spyOn(r,'dispose'));h.update({fish:[]});h.flush();for(const spy of spies)expect(spy).toHaveBeenCalled();expect(h.root('residents').children).toHaveLength(0);
 });
});
