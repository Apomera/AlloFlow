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


describe('Hermit crab and dwarf frog representative anatomy', () => {
  function parts(group,name){const found=[];group.traverse(n=>{if(n.userData.anatomyPart===name)found.push(n);});return found;}
  for(const quality of ['low','balanced','high']){
    it('retains diagnostic anatomy and finite geometry at '+quality+' detail', () => {
      const h=harness({paused:true,appearance:{quality},fish:[{id:'crab',instanceId:'hermit-1',zone:'bottom'},{id:'dwarffrog',instanceId:'frog-1',zone:'bottom'}]});
      const [hermit,frog]=h.root('residents').children;
      expect(hermit.userData.shape).toBe('hermitcrab');expect(hermit.userData.exposedWalkingLegPairs).toBe(2);
      expect(parts(hermit,'walking-leg-segments')[0].userData.featureCount).toBe(12);
      expect(parts(hermit,'eyestalk')).toHaveLength(2);expect(parts(hermit,'antenna')).toHaveLength(2);expect(parts(hermit,'antennule')).toHaveLength(2);
      expect(parts(hermit,'fixed-claw-finger')).toHaveLength(2);expect(parts(hermit,'movable-claw-finger')).toHaveLength(2);
      expect(parts(hermit,'carried-shell')).toHaveLength(1);expect(parts(hermit,'shell-aperture')).toHaveLength(1);expect(parts(hermit,'shell-lip')).toHaveLength(1);
      expect(frog.userData.shape).toBe('frog');expect(parts(frog,'forefoot-webbing')).toHaveLength(2);expect(parts(frog,'hindfoot-webbing')).toHaveLength(2);
      expect(parts(frog,'digits')[0].userData.featureCount).toBe(18);expect(parts(frog,'hind-toe-claws')[0].userData.featureCount).toBe(6);
      expect(parts(frog,'lateral-eye')).toHaveLength(2);expect(parts(frog,'nostril')).toHaveLength(2);expect(parts(frog,'body')[0].geometry.attributes.color).toBeTruthy();
      for(const group of [hermit,frog])group.traverse(n=>{if(n.geometry){expect(Array.from(n.geometry.attributes.position.array).every(Number.isFinite)).toBe(true);if(n.geometry.attributes.normal)expect(Array.from(n.geometry.attributes.normal.array).every(Number.isFinite)).toBe(true);}});
    });
  }
  it('keeps the larger shell and spread feet inside resized vessels while moving', () => {
    const h=harness({fish:[{id:'crab',instanceId:'hermit',zone:'bottom',targetX:5.6,targetZ:2.7},{id:'dwarffrog',instanceId:'frog',zone:'bottom',targetX:-5.6,targetZ:-2.7}]});
    for(const volume of [5,20,80]){h.update({dimensions:{volumeGallons:volume}});h.flush();const tank=h.root('vessel').userData;
      for(let frame=0;frame<45;frame++){h.flush(50);for(const group of h.root('residents').children){const box=new realThree.Box3().setFromObject(group);expect(box.min.x).toBeGreaterThan(-tank.width/2-.01);expect(box.max.x).toBeLessThan(tank.width/2+.01);expect(box.min.z).toBeGreaterThan(-tank.depth/2-.01);expect(box.max.z).toBeLessThan(tank.depth/2+.01);expect(box.min.y).toBeGreaterThan(-.01);expect(box.max.y).toBeLessThan(tank.height+.01);}}
    }
  });
  it('preserves identity despite a misleading nickname and exposes honest group-level scope', () => {
    const h=harness({paused:true,fish:[{id:'crab',instanceId:'h',name:'Goldfish'},{id:'dwarffrog',instanceId:'f',name:'Shark'}]});const [hermit,frog]=h.root('residents').children;
    expect(hermit.userData.shape).toBe('hermitcrab');expect(hermit.userData.variation).toContain('marine hermit');
    expect(frog.userData.shape).toBe('frog');expect(frog.userData.variation).toContain('Hymenochirus');
  });
  it('releases refined geometry and materials on stock removal', () => {
    const h=harness({paused:true,fish:[{id:'crab',instanceId:'h'},{id:'dwarffrog',instanceId:'f'}]});
    const resources=new Set();h.root('residents').traverse(n=>{if(n.geometry)resources.add(n.geometry);if(n.material)resources.add(n.material);});
    const spies=Array.from(resources,x=>vi.spyOn(x,'dispose'));h.update({fish:[]});h.flush();expect(h.root('residents').children).toHaveLength(0);for(const spy of spies)expect(spy).toHaveBeenCalled();
  });
});
