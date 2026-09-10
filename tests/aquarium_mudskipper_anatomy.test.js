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


describe('Mudskipper anatomy and paired pectoral motion',()=>{
 const fish={id:'mudskip',instanceId:'mudskip-1',name:'Goldfish',zone:'bottom',targetX:4.5,targetZ:2.25};const root=h=>h.root('residents').children[0];const parts=(g,p)=>{const a=[];g.traverse(n=>{if(n.userData.anatomyPart===p)a.push(n);});return a;};
 for(const quality of ['low','balanced','high'])it('preserves mudskipper identity and diagnostic anatomy at '+quality+' quality',()=>{
  const h=harness({fish:[fish],appearance:{quality},paused:true}),g=root(h);expect(g.userData.profileId).toBe('mudskip');expect(g.userData.locomotion).toBe('crawl');expect(parts(g,'body')[0].userData.bodyContour).toBe('mudskipper');
  for(const part of ['raised-eye-mound','raised-eye-iris','raised-eye-pupil','fleshy-pectoral-base','pectoral-fin','pectoral-rays','pelvic-fin','dorsal-fin','nostril','gill-cover'])expect(parts(g,part)).toHaveLength(2);expect(parts(g,'anal-fin')).toHaveLength(1);expect(parts(g,'mouth-line')).toHaveLength(1);
  expect(g.userData.mudskipperPectorals).toHaveLength(2);for(const paddle of g.userData.mudskipperPectorals){expect(parts(paddle,'fleshy-pectoral-base')).toHaveLength(1);expect(parts(paddle,'pectoral-rays')[0].userData.featureCount).toBe(9);}
  g.traverse(n=>{if(n.geometry)for(const key of ['position','normal'])if(n.geometry.attributes[key])expect(Array.from(n.geometry.attributes[key].array).every(Number.isFinite)).toBe(true);});
 });
 it('has a broader anterior body and narrows toward the tail while retaining the pigment map',()=>{
  const h=harness({fish:[fish],paused:true}),body=parts(root(h),'body')[0],p=body.geometry.attributes.position;let head=0,rear=0;for(let i=0;i<p.count;i++){const x=p.getX(i),z=Math.abs(p.getZ(i));if(x>.2&&x<.65)head=Math.max(head,z);if(x<-.4&&x>-.75)rear=Math.max(rear,z);}expect(head).toBeGreaterThan(rear*1.4);expect(body.material.map.userData.profileId).toBe('mudskip');
 });
 it('coordinates both pectoral strokes and respects pause and reduced motion',()=>{
  const h=harness({fish:[fish]}),g=root(h),paddles=g.userData.mudskipperPectorals,yaws=()=>paddles.map(p=>p.rotation.y);const start=yaws();for(let n=0;n<10;n++)h.flush(80);expect(yaws()).not.toEqual(start);expect(yaws()[0]+yaws()[1]).toBeCloseTo(0,8);
  h.update({paused:true});h.flush();const paused=yaws();h.flush(600);expect(yaws()).toEqual(paused);h.update({paused:false});h.flush(100);h.flush(100);expect(yaws()).not.toEqual(paused);h.reduce(true);h.flush();const reduced=yaws();h.flush(600);expect(yaws()).toEqual(reduced);
 });
 it('contains the complete stroking fins and body during tank resizing without stretching the fish',()=>{
  const h=harness({fish:[fish]}),g=root(h),body=parts(g,'body')[0],geometry=body.geometry,scale=g.scale.clone();for(const volumeGallons of [10,30,80]){h.update({dimensions:{volumeGallons,shape:'long'}});for(let n=0;n<45;n++){h.flush(80);const b=new realThree.Box3().setFromObject(g),v=h.root('vessel').userData;expect(b.min.x).toBeGreaterThan(-v.width/2-.01);expect(b.max.x).toBeLessThan(v.width/2+.01);expect(b.min.z).toBeGreaterThan(-v.depth/2-.01);expect(b.max.z).toBeLessThan(v.depth/2+.01);expect(b.min.y).toBeGreaterThan(-.01);expect(b.max.y).toBeLessThan(v.height+.01);}}expect(body.geometry).toBe(geometry);expect(g.scale.equals(scale)).toBe(true);
 });
 it('releases head and pectoral resources on resident removal',()=>{
  const h=harness({fish:[fish]}),resources=new Set();root(h).traverse(n=>{if(n.geometry)resources.add(n.geometry);for(const m of n.material?(Array.isArray(n.material)?n.material:[n.material]):[])resources.add(m);});const spies=Array.from(resources,r=>vi.spyOn(r,'dispose'));h.update({fish:[]});h.flush();for(const spy of spies)expect(spy).toHaveBeenCalled();expect(h.root('residents').children).toHaveLength(0);
 });
});
