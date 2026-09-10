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


describe('Branching stony coral colony anatomy',()=>{
 const fish={id:'stonycoral',instanceId:'coral-1',name:'Goldfish',zone:'bottom',targetX:4.5,targetZ:2.25};
 const root=h=>h.root('residents').children[0];const parts=(g,p)=>{const a=[];g.traverse(n=>{if(n.userData.anatomyPart===p)a.push(n);});return a;};
 for(const [quality,cups] of [['low',105],['balanced',168],['high',252]])it('keeps colony structure and outward polyp detail at '+quality+' quality',()=>{
  const h=harness({paused:true,fish:[fish],appearance:{quality}}),g=root(h);expect(g.userData.profileId).toBe('stonycoral');expect(g.userData.stationary).toBe(true);expect(g.userData.colonyModel).toBe(true);expect(g.userData.variation).toContain('not a colony census');
  for(const part of ['encrusting-base','branching-skeleton','branch-tips','corallite-cups','polyp-discs','polyp-mouths','polyp-tentacles'])expect(parts(g,part)).toHaveLength(1);
  expect(parts(g,'branching-skeleton')[0].userData.featureCount).toBe(21);expect(parts(g,'corallite-cups')[0].userData.featureCount).toBe(cups);expect(parts(g,'polyp-mouths')[0].userData.featureCount).toBe(cups);expect(parts(g,'polyp-tentacles')[0].userData.featureCount).toBe(g.userData.extendedPolypCount*12);
  let meshes=0;g.traverse(n=>{if(n.isMesh){meshes++;for(const key of ['position','normal'])expect(Array.from(n.geometry.attributes[key].array).every(Number.isFinite)).toBe(true);}});expect(meshes).toBeLessThanOrEqual(7);
  const cup=parts(g,'corallite-cups')[0].geometry,normals=cup.attributes.normal;let lateral=0;for(let i=0;i<normals.count;i++)if(Math.abs(normals.getY(i))<.4)lateral++;expect(lateral).toBeGreaterThan(normals.count*.1);
 });
 it('keeps the rigid colony fixed while filter output and visual time change',()=>{
  const h=harness({fish:[fish],equipment:{filter:{installed:true,on:true,output:1}}}),g=root(h),pose=g.matrixWorld.clone(),skeleton=parts(g,'branching-skeleton')[0],positions=Array.from(skeleton.geometry.attributes.position.array),geo=skeleton.geometry;
  for(let n=0;n<30;n++)h.flush(80);h.update({equipment:{filter:{installed:true,on:false,output:0}}});h.flush();expect(g.matrixWorld.equals(pose)).toBe(true);expect(skeleton.geometry).toBe(geo);expect(Array.from(geo.attributes.position.array)).toEqual(positions);expect(g.anemoneTissue).toBeUndefined();
 });
 it('retains branch scale and complete containment through tank resizing',()=>{
  const h=harness({fish:[fish]}),g=root(h),skeleton=parts(g,'branching-skeleton')[0],geometry=skeleton.geometry,scale=g.scale.clone();
  for(const dimensions of [{volumeGallons:20,shape:'long'},{volumeGallons:40,shape:'tall'},{volumeGallons:80,shape:'cube'}]){h.update({dimensions});h.flush();const box=new realThree.Box3().setFromObject(g),v=h.root('vessel').userData;expect(box.min.x).toBeGreaterThan(-v.width/2-.01);expect(box.max.x).toBeLessThan(v.width/2+.01);expect(box.min.z).toBeGreaterThan(-v.depth/2-.01);expect(box.max.z).toBeLessThan(v.depth/2+.01);expect(box.min.y).toBeGreaterThan(-.01);expect(box.max.y).toBeLessThan(v.height+.01);expect(skeleton.geometry).toBe(geometry);expect(g.scale.equals(scale)).toBe(true);}
 });
 it('disposes all batched colony resources on removal',()=>{
  const h=harness({fish:[fish]}),resources=new Set();root(h).traverse(n=>{if(n.geometry)resources.add(n.geometry);for(const m of n.material?(Array.isArray(n.material)?n.material:[n.material]):[])resources.add(m);});const spies=Array.from(resources,r=>vi.spyOn(r,'dispose'));h.update({fish:[]});h.flush();expect(h.root('residents').children).toHaveLength(0);for(const spy of spies)expect(spy).toHaveBeenCalled();
 });
});
