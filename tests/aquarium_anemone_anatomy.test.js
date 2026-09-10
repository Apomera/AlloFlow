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


describe('Anemone anatomy and current response',()=>{
 const fish={id:'anemone',instanceId:'anemone-1',zone:'bottom',targetX:4.5,targetZ:2.25};
 const filter=output=>({filter:{installed:true,on:output>0,output}});
 const root=h=>h.root('residents').children[0];const parts=(g,name)=>{const a=[];g.traverse(n=>{if(n.userData.anatomyPart===name)a.push(n);});return a;};
 const positions=g=>Array.from(g.anemoneTissue.mesh.geometry.attributes.position.array);
 for(const [quality,count] of [['low',24],['balanced',42],['high',60]])it('retains recognizable attached anatomy and valid surfaces at '+quality+' quality',()=>{
  const h=harness({paused:true,appearance:{quality},fish:[fish]}),g=root(h);expect(g.userData.stationary).toBe(true);expect(g.userData.profileId).toBe('anemone');
  for(const part of ['pedal-disc','body-column','oral-disc','central-mouth','mouth-rim','tentacle-crown'])expect(parts(g,part)).toHaveLength(1);
  expect(parts(g,'tentacle-crown')[0].userData.featureCount).toBe(count);expect(g.userData.variation).toContain('vary by species');
  const normals=parts(g,'oral-disc')[0].geometry.attributes.normal;for(let i=0;i<normals.count;i++)expect(normals.getY(i)).toBeGreaterThan(.5);
  const crown=parts(g,'tentacle-crown')[0];expect(crown.geometry.attributes.color).toBeTruthy();expect(crown.material.transparent).not.toBe(true);
  g.traverse(n=>{if(n.geometry)for(const key of ['position','normal'])if(n.geometry.attributes[key])expect(Array.from(n.geometry.attributes[key].array).every(Number.isFinite)).toBe(true);});
 });
 it('scales only tentacle deflection with effective filter output and restores the rest shape when off',()=>{
  const full=harness({fish:[fish],equipment:filter(1)}),half=harness({fish:[fish],equipment:filter(.5)}),g=root(full),base=g.anemoneTissue.rest,anchor=g.position.clone(),pedal=parts(g,'pedal-disc')[0].position.clone(),crown=g.anemoneTissue.mesh.geometry;
  for(let frame=0;frame<12;frame++){full.flush(40);half.flush(40);}const a=positions(g),b=positions(root(half));let max=0;
  for(let i=0;i<a.length;i++){expect(b[i]-base[i]).toBeCloseTo((a[i]-base[i])*.5,6);max=Math.max(max,Math.abs(a[i]-base[i]));}expect(max).toBeGreaterThan(.005);
  expect(g.position.equals(anchor)).toBe(true);expect(parts(g,'pedal-disc')[0].position.equals(pedal)).toBe(true);expect(g.anemoneTissue.mesh.geometry).toBe(crown);
  full.update({equipment:filter(0)});full.flush();expect(positions(g)).toEqual(Array.from(base));expect(g.userData.tissueFlowOutput).toBe(0);
 });
 it('freezes deformed tentacles while paused or reduced motion is active and resumes afterward',()=>{
  const h=harness({fish:[fish],equipment:filter(1)}),g=root(h);h.flush(200);h.update({paused:true});h.flush();const paused=positions(g);h.flush(500);expect(positions(g)).toEqual(paused);
  h.update({paused:false});h.flush(80);h.flush(80);expect(positions(g)).not.toEqual(paused);h.reduce(true);h.flush();const reduced=positions(g);h.flush(500);expect(positions(g)).toEqual(reduced);h.reduce(false);h.flush(80);h.flush(80);expect(positions(g)).not.toEqual(reduced);
 });
 it('contains the full moving crown through tank resizing',()=>{
  const h=harness({fish:[fish],equipment:filter(1)}),g=root(h);
  for(const volumeGallons of [20,40,80]){h.update({dimensions:{volumeGallons,shape:'long'}});for(let n=0;n<45;n++){h.flush(80);const box=new realThree.Box3().setFromObject(g),v=h.root('vessel').userData;expect(box.min.x).toBeGreaterThan(-v.width/2-.01);expect(box.max.x).toBeLessThan(v.width/2+.01);expect(box.min.z).toBeGreaterThan(-v.depth/2-.01);expect(box.max.z).toBeLessThan(v.depth/2+.01);expect(box.min.y).toBeGreaterThan(-.01);expect(box.max.y).toBeLessThan(v.height+.01);}}
 });
 it('disposes all new tissue resources on stock removal',()=>{
  const h=harness({fish:[fish],equipment:filter(1)}),resources=new Set();root(h).traverse(n=>{if(n.geometry)resources.add(n.geometry);for(const m of n.material?(Array.isArray(n.material)?n.material:[n.material]):[])resources.add(m);});const spies=Array.from(resources,r=>vi.spyOn(r,'dispose'));h.update({fish:[]});h.flush();for(const spy of spies)expect(spy).toHaveBeenCalled();expect(h.root('residents').children).toHaveLength(0);
 });
});
