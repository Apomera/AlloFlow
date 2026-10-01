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

const parts=(group,part)=>{const items=[];group.traverse(n=>{if(n.userData.anatomyPart===part)items.push(n);});return items;};
describe('aquarium echinoderm anatomy',()=>{
  it('gives both stars solid, correctly oriented upper and lower surfaces',()=>{
    const h=harness({paused:true,fish:['starfish','seastar'].map(resident)});h.renderer.scene.updateMatrixWorld(true);
    for(const group of h.root('residents').children){const body=parts(group,'sea-star-body')[0];expect(group.userData.armCount).toBe(group.userData.profileId==='seastar'?20:5);body.geometry.computeBoundingBox();const size=body.geometry.boundingBox.getSize(new realThree.Vector3());expect(size.y).toBeGreaterThan(.12);expect(body.material).toHaveLength(2);
      for(const side of [-1,1]){const origin=group.localToWorld(new realThree.Vector3(.075,side,0)),target=group.localToWorld(new realThree.Vector3(.075,0,0)),hit=new realThree.Raycaster(origin,target.sub(origin).normalize()).intersectObject(body)[0];expect(hit).toBeTruthy();expect(hit.face.materialIndex).toBe(side>0?0:1);}
      const normals=body.geometry.attributes.normal;for(let i=0;i<normals.count;i++)expect(new realThree.Vector3().fromBufferAttribute(normals,i).length()).toBeCloseTo(1,4);
    }
  });
  it('places representative tube feet below star bodies and batches dense anatomy',()=>{
    const h=harness({paused:true,fish:['starfish','seastar'].map(resident)});
    for(const group of h.root('residents').children){const feet=parts(group,'tube-feet')[0],pads=parts(group,'tube-foot-pads')[0];expect(parts(group,'tube-feet')).toHaveLength(1);expect(feet.userData.featureCount).toBe(group.userData.armCount*12);expect(pads.userData.featureCount).toBe(feet.userData.featureCount);expect(feet.geometry.boundingBox.max.y).toBeLessThan(0);expect(pads.geometry.boundingBox.max.y).toBeLessThan(-.075);expect(group.children.length).toBeLessThan(12);expect(group.userData.tail).toBeFalsy();expect(group.userData.locomotion).toBe('crawl');}
  });
  it('extends tapered urchin spines around its sides and groups tube feet into five bands',()=>{
    const h=harness({paused:true,fish:[resident('urchin')]}),group=h.root('residents').children[0],spines=parts(group,'urchin-spines')[0],test=parts(group,'urchin-test')[0];expect(group.userData.ambulacralBands).toBe(5);expect(spines.userData.featureCount).toBe(144);expect(parts(group,'tube-feet')[0].userData.featureCount).toBe(50);expect(spines.geometry.boundingBox.min.y).toBeLessThan(-.12);expect(spines.geometry.boundingBox.max.y).toBeGreaterThan(.4);expect(spines.geometry.boundingBox.max.x).toBeGreaterThan(.4);expect(test.material.vertexColors).toBe(true);expect(group.children.length).toBeLessThan(10);
    const color=test.geometry.attributes.color.array;expect(Array.from(color).every(x=>Number.isFinite(x)&&x>=0&&x<=1)).toBe(true);
  });
  it('keeps a visible ventral mouth on all three organisms without eyes or fins',()=>{
    const h=harness({paused:true,fish:['starfish','seastar','urchin'].map(resident)});h.renderer.scene.updateMatrixWorld(true);
    for(const group of h.root('residents').children){const mouth=parts(group,'ventral-mouth')[0],origin=group.localToWorld(new realThree.Vector3(.005,-1,0)),target=group.localToWorld(new realThree.Vector3(.005,0,0)),hit=new realThree.Raycaster(origin,target.sub(origin).normalize()).intersectObject(group,true)[0];expect(hit.object).toBe(mouth);expect(group.userData.fins).toHaveLength(0);expect(group.userData.tail).toBeFalsy();}
  });
  it('keeps arm count and display scale across detail levels while varying rendered feature density',()=>{
    const h=harness({paused:true,fish:['starfish','seastar','urchin'].map(resident),appearance:{quality:'low'}}),groups=h.root('residents').children,scales=groups.map(g=>g.scale.toArray()),lowVertices=parts(groups[1],'sea-star-body')[0].geometry.attributes.position.count;
    expect(groups[2].userData.spineCount).toBe(64);h.update({appearance:{quality:'high'}});h.flush();const high=h.root('residents').children;expect(high.map(g=>g.scale.toArray())).toEqual(scales);expect(high[0].userData.armCount).toBe(5);expect(high[1].userData.armCount).toBe(20);expect(high[2].userData.spineCount).toBe(240);expect(parts(high[1],'sea-star-body')[0].geometry.attributes.position.count).toBeGreaterThan(lowVertices*3);
  },90000);
  it('retains anatomical resources through model updates and disposes both star surface maps on removal',()=>{
    const fish=resident('seastar'),h=harness({paused:true,fish:[fish]}),group=h.root('residents').children[0],body=parts(group,'sea-star-body')[0],resources=new Set();group.traverse(n=>{if(n.geometry)resources.add(n.geometry);for(const mat of (Array.isArray(n.material)?n.material:[n.material]))if(mat){resources.add(mat);if(mat.map)resources.add(mat.map);}});const spies=[...resources].map(r=>{const spy=vi.fn();r.addEventListener('dispose',spy);return spy;});h.update({simHour:19,fish:[{...fish,health:30,hunger:90}]});h.flush();expect(parts(h.root('residents').children[0],'sea-star-body')[0]).toBe(body);spies.forEach(spy=>expect(spy).not.toHaveBeenCalled());h.update({fish:[]});h.flush();h.engine.dispose();spies.forEach(spy=>expect(spy).toHaveBeenCalledOnce());
  });
});
