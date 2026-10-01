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


describe('Red-eared slider anatomy',()=>{
 const stock={id:'slider',instanceId:'slider-1',name:'Custom turtle',zone:'top',targetX:5.8,targetZ:2.8};
 const parts=(g,part)=>{const found=[];g.traverse(n=>{if(n.userData.anatomyPart===part)found.push(n);});return found;};
 for(const quality of ['low','balanced','high'])it('preserves anatomical landmarks and valid surfaces at '+quality+' detail',()=>{
  const h=harness({paused:true,appearance:{quality},fish:[stock]}),g=h.root('residents').children[0];
  expect(g.userData.profileId).toBe('slider');expect(g.userData.surfaceModel).toBe('scuted-slider');
  for(const part of ['carapace','plastron','striped-neck','striped-head','shell-rim','tapered-tail'])expect(parts(g,part)).toHaveLength(1);
  expect(parts(g,'red-ear-patch')).toHaveLength(2);expect(parts(g,'nostril')).toHaveLength(2);
  expect(parts(g,'forefoot-webbing')).toHaveLength(2);expect(parts(g,'hindfoot-webbing')).toHaveLength(2);
  expect(parts(g,'digits')[0].userData.featureCount).toBe(20);expect(parts(g,'claws')[0].userData.featureCount).toBe(18);
  expect(parts(g,'vertebral-seam')).toHaveLength(8);expect(parts(g,'costal-seam')).toHaveLength(6);
  for(const part of ['carapace','plastron','striped-head']){const a=parts(g,part)[0].geometry.attributes.color.array;expect(Math.max(...a)-Math.min(...a)).toBeGreaterThan(.1);}
  g.traverse(n=>{if(n.geometry)for(const key of ['position','normal'])if(n.geometry.attributes[key])expect(Array.from(n.geometry.attributes[key].array).every(Number.isFinite)).toBe(true);});
 });
 it('keeps feet, neck and tail within resized tanks without stretching resident geometry',()=>{
  const h=harness({dimensions:{volumeGallons:40},fish:[stock]}),g=h.root('residents').children[0],body=parts(g,'carapace')[0],geometry=body.geometry,scale=body.scale.clone();
  for(const dimensions of [{volumeGallons:40,shape:'standard'},{volumeGallons:80,shape:'long'},{volumeGallons:120,shape:'tall'}]){h.update({dimensions});for(let n=0;n<40;n++){h.flush(50);const box=new realThree.Box3().setFromObject(g),v=h.root('vessel').userData;expect(box.min.x).toBeGreaterThan(-v.width/2-.01);expect(box.max.x).toBeLessThan(v.width/2+.01);expect(box.min.z).toBeGreaterThan(-v.depth/2-.01);expect(box.max.z).toBeLessThan(v.depth/2+.01);expect(box.min.y).toBeGreaterThan(-.01);expect(box.max.y).toBeLessThan(v.height+.01);}}
  expect(body.geometry).toBe(geometry);expect(body.scale.equals(scale)).toBe(true);
 });
 it('releases shell surfaces and appendage resources when removed',()=>{
  const h=harness({fish:[stock],paused:true}),resources=new Set();h.root('residents').traverse(n=>{if(n.geometry)resources.add(n.geometry);for(const m of n.material?(Array.isArray(n.material)?n.material:[n.material]):[])resources.add(m);});const spies=Array.from(resources,r=>vi.spyOn(r,'dispose'));h.update({fish:[]});h.flush();for(const spy of spies)expect(spy).toHaveBeenCalled();expect(h.root('residents').children).toHaveLength(0);
 });
});
