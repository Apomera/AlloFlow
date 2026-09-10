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

const fishBody=group=>group.children.find(node=>node.userData.anatomyPart==='body');
const byProfile=h=>Object.fromEntries(h.root('residents').children.map(group=>[group.userData.profileId,group]));

describe('bottom-dweller anatomy',()=>{
  it('gives each catfish a tapered tail, broad head and flattened ventral contour',()=>{
    const h=harness({paused:true,fish:['cory','oto','pleco'].map(resident)});
    const profiles=byProfile(h),widths={};
    for(const [id,group] of Object.entries(profiles)){
      const body=fishBody(group),positions=body.geometry.attributes.position,normals=body.geometry.attributes.normal;let front=0,rear=0,minY=0,maxY=0;
      for(let i=0;i<positions.count;i++){
        const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
        expect(Number.isFinite(x+y+z)).toBe(true);expect(Math.abs(x)).toBeLessThanOrEqual(1.001);expect(Math.abs(z)).toBeLessThanOrEqual(1.03);
        minY=Math.min(minY,y);maxY=Math.max(maxY,y);
        if(x>.5&&x<.75)front=Math.max(front,Math.abs(z));if(x<-.5&&x>-.75)rear=Math.max(rear,Math.abs(z));
        expect(new realThree.Vector3().fromBufferAttribute(normals,i).length()).toBeCloseTo(1,4);
      }
      expect(front).toBeGreaterThan(rear*1.08);expect(-minY).toBeLessThan(maxY*.84);widths[id]=front/rear;
      expect(group.children.filter(n=>n.userData.anatomyPart==='pelvic-fin')).toHaveLength(2);
      expect(group.children.filter(n=>n.geometry?.type==='CylinderGeometry')).toHaveLength(0);
    }
    expect(widths.pleco).toBeGreaterThan(widths.cory);
  });
  it('keeps both catfish pupils exposed after reshaping the head',()=>{
    const h=harness({paused:true,fish:['cory','oto','pleco'].map(resident)});h.renderer.scene.updateMatrixWorld(true);
    const pupilColor=new realThree.Color(0x080f12).convertSRGBToLinear();
    for(const group of h.root('residents').children){
      const pupils=group.children.filter(n=>n.material?.color.equals(pupilColor)&&n.position.y>0);
      expect(pupils).toHaveLength(2);
      for(const pupil of pupils){const side=Math.sign(pupil.position.z),p=pupil.position.clone();const origin=group.localToWorld(new realThree.Vector3(p.x,p.y,side)),target=group.localToWorld(p);const hit=new realThree.Raycaster(origin,target.sub(origin).normalize()).intersectObject(group,true)[0];expect(hit.object).toBe(pupil);}
    }
  });
  it('exposes the sucker opening below the head on both loricariid models',()=>{
    const h=harness({paused:true,fish:['oto','pleco'].map(resident)});h.renderer.scene.updateMatrixWorld(true);
    for(const group of h.root('residents').children){const opening=group.children.find(n=>n.userData.anatomyPart==='sucker-opening'),lip=group.children.find(n=>n.userData.suckerMouth);expect(lip).toBeTruthy();const p=opening.position.clone().add(new realThree.Vector3(.005,0,0)),origin=group.localToWorld(new realThree.Vector3(p.x,-1,0)),target=group.localToWorld(p);const hit=new realThree.Raycaster(origin,target.sub(origin).normalize()).intersectObject(group,true)[0];expect(hit.object.userData.anatomyPart,JSON.stringify({id:group.userData.profileId,hit:hit.object.userData,position:hit.object.position.toArray(),opening:opening.position.toArray()})).toBe('sucker-opening');}
  });
  it('builds a low nerite shell above a broad foot with eyes beside the tentacle bases',()=>{
    const h=harness({paused:true,fish:[resident('nerite')]}),group=h.root('residents').children[0],parts=part=>group.children.filter(n=>n.userData.anatomyPart===part),shell=parts('shell')[0],foot=parts('foot')[0];
    const bounds=new realThree.Box3().setFromBufferAttribute(shell.geometry.attributes.position),size=bounds.getSize(new realThree.Vector3());expect(size.y).toBeLessThan(size.x*.65);expect(size.z).toBeGreaterThan(size.y*1.3);expect(foot.scale.z).toBeGreaterThan(.2);expect(shell.material.map.encoding).toBe(realThree.sRGBEncoding);
    expect(parts('tentacle')).toHaveLength(2);expect(parts('eye-stalk')).toHaveLength(2);expect(parts('snail-eye')).toHaveLength(2);
    for(const eye of parts('snail-eye')){expect(eye.position.x).toBeLessThan(.4);expect(eye.position.y).toBeLessThan(.04);}
    expect(group.userData.locomotion).toBe('crawl');expect(group.userData.tail).toBeFalsy();
    const pixel=shell.material.map.image.data;let low=255,high=0;for(let i=0;i<pixel.length;i+=4){low=Math.min(low,pixel[i]);high=Math.max(high,pixel[i]);}expect(high-low).toBeGreaterThan(60);
  });
  it('preserves species scale and disposes the new shell resources on quality changes',()=>{
    const fish=['cory','oto','pleco','nerite'].map(resident),h=harness({paused:true,fish,appearance:{quality:'low'}}),original=h.root('residents').children.map(g=>g.scale.toArray()),shell=h.root('residents').children[3].children.find(n=>n.userData.anatomyPart==='shell');
    const disposed=[shell.geometry,shell.material,shell.material.map].map(r=>{const spy=vi.fn();r.addEventListener('dispose',spy);return spy;});
    h.update({appearance:{quality:'high'}});h.flush();expect(h.root('residents').children.map(g=>g.scale.toArray())).toEqual(original);disposed.forEach(spy=>expect(spy).toHaveBeenCalledOnce());
    expect(h.root('residents').children[3].children.find(n=>n.userData.anatomyPart==='shell').material.map.image.width).toBe(512);
    h.update({fish:[]});h.flush();expect(h.root('residents').children).toHaveLength(0);disposed.forEach(spy=>expect(spy).toHaveBeenCalledOnce());
  },90000);
});
