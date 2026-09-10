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

const shrimpIds=['shrimp','cleaner','pederson','pistol'];
const parts=(group,part)=>{const items=[];group.traverse(n=>{if(n.userData.anatomyPart===part)items.push(n);});return items;};
const pixel=(map,u,v)=>{const {width,height,data}=map.image;const i=(Math.floor(v*height)*width+Math.floor(u*width))*4;return Array.from(data.slice(i,i+4));};
describe('aquarium caridean shrimp anatomy',()=>{
  it('builds six abdomen segments, five leg pairs and a horizontal tail fan for each catalog profile',()=>{
    const h=harness({paused:true,fish:shrimpIds.map(resident)});
    for(const group of h.root('residents').children){
      expect(parts(group,'carapace')).toHaveLength(1);expect(parts(group,'abdomen-segment')).toHaveLength(6);expect(parts(group,'pereiopod')).toHaveLength(10);expect(parts(group,'pleopod')).toHaveLength(10);expect(parts(group,'uropod')).toHaveLength(4);expect(parts(group,'telson')).toHaveLength(1);expect(parts(group,'antenna')).toHaveLength(2);expect(parts(group,'antennule')).toHaveLength(2);expect(parts(group,'compound-eye')).toHaveLength(2);
      expect(parts(group,'pereiopod').map(n=>n.userData.pairIndex).sort()).toEqual([0,0,1,1,2,2,3,3,4,4]);
      for(const fan of parts(group,'uropod')){const box=new realThree.Box3().setFromObject(fan),size=box.getSize(new realThree.Vector3());expect(size.y).toBeLessThan(.001);}
      expect(group.userData.tail).toBeFalsy();expect(group.userData.locomotion).toBe('crawl');
      group.traverse(n=>{if(n.geometry){expect(Array.from(n.geometry.attributes.position.array).every(Number.isFinite)).toBe(true);}});
    }
  });
  it('paints cleaner dorsal white and red on the shell while keeping the flanks amber',()=>{
    const h=harness({paused:true,fish:[resident('cleaner')]}),group=h.root('residents').children[0],shell=parts(group,'carapace')[0],map=shell.material.map;
    const white=pixel(map,.5,.005),red=pixel(map,.5,.06),side=pixel(map,.5,.25);expect(white[0]).toBeGreaterThan(220);expect(white[1]).toBeGreaterThan(220);expect(red[0]).toBeGreaterThan(red[1]*2);expect(side[1]).toBeGreaterThan(red[1]*1.5);expect(side[0]).toBeGreaterThan(side[2]*1.5);expect(parts(group,'tail-spot')).toHaveLength(4);
    for(const segment of parts(group,'abdomen-segment'))expect(segment.material).toBe(shell.material);expect(map.encoding).toBe(realThree.sRGBEncoding);
  });
  it('keeps Pederson tissue translucent with opaque violet markings and cherry shrimp predominantly red',()=>{
    const h=harness({paused:true,fish:['pederson','shrimp'].map(resident)}),[pederson,cherry]=h.root('residents').children;
    const data=parts(pederson,'carapace')[0].material.map.image.data;let transparent=0,violet=0;
    for(let i=0;i<data.length;i+=4){if(data[i+3]<80)transparent++;if(data[i+2]>data[i]*1.25&&data[i+3]>180)violet++;}expect(transparent).toBeGreaterThan(data.length/4*.6);expect(violet).toBeGreaterThan(20);
    const color=pixel(parts(cherry,'carapace')[0].material.map,.5,.25);expect(color[0]).toBeGreaterThan(color[1]*1.8);expect(color[3]).toBeGreaterThan(180);
  });
  it('gives the pistol shrimp one major and one minor chela within its first leg pair',()=>{
    const h=harness({paused:true,fish:[resident('pistol')]}),group=h.root('residents').children[0],major=parts(group,'major-chela'),minor=parts(group,'minor-chela');expect(major).toHaveLength(1);expect(minor).toHaveLength(1);expect(major[0].parent.userData.pairIndex).toBe(0);expect(minor[0].parent.userData.pairIndex).toBe(0);expect(major[0].scale.x).toBeGreaterThan(minor[0].scale.x*2);expect(parts(major[0],'fixed-finger')).toHaveLength(1);expect(parts(major[0],'movable-finger')).toHaveLength(1);expect(parts(group,'pereiopod')).toHaveLength(10);
  });
  it('keeps both stalked eyes visible outside the carapace',()=>{
    const h=harness({paused:true,fish:shrimpIds.map(resident)});h.renderer.scene.updateMatrixWorld(true);
    for(const group of h.root('residents').children)for(const eye of parts(group,'compound-eye')){const p=eye.position.clone(),side=Math.sign(p.z),origin=group.localToWorld(new realThree.Vector3(p.x,p.y+.002,side)),target=group.localToWorld(p.clone().add(new realThree.Vector3(0,.002,0)));const hit=new realThree.Raycaster(origin,target.sub(origin).normalize()).intersectObject(group,true)[0];expect(hit.object).toBe(eye);}
  });
  it('animates only appendage joints and freezes them with pause or reduced motion',()=>{
    const fish=shrimpIds.map(resident),snapshot=JSON.stringify(fish),h=harness({fish}),group=h.root('residents').children[0],joints=group.userData.crustaceanLegs.concat(group.userData.crustaceanAntennae),angles=()=>joints.map(n=>n.rotation.y);
    const initial=angles();for(let i=0;i<10;i++)h.flush(50);expect(angles()).not.toEqual(initial);const moving=angles();h.update({paused:true});h.flush();for(let i=0;i<5;i++)h.flush(50);expect(angles()).toEqual(moving);
    h.update({paused:false});h.reduce(true);h.flush();const reduced=angles();for(let i=0;i<5;i++)h.flush(50);expect(angles()).toEqual(reduced);expect(JSON.stringify(fish)).toBe(snapshot);
    h.reduce(false);for(let i=0;i<4;i++)h.flush(50);expect(angles()).not.toEqual(reduced);
  });
  it('keeps scale across quality changes and disposes each shared exoskeleton map once',()=>{
    const h=harness({paused:true,fish:[resident('pederson')],appearance:{quality:'low'}}),group=h.root('residents').children[0],scale=group.scale.toArray(),shell=parts(group,'carapace')[0],dispose=vi.fn();shell.material.map.addEventListener('dispose',dispose);expect(shell.material.map.image.width).toBe(128);
    h.update({appearance:{quality:'high'}});h.flush();const next=h.root('residents').children[0];expect(next.scale.toArray()).toEqual(scale);expect(dispose).toHaveBeenCalledOnce();const map=parts(next,'carapace')[0].material.map,nextDispose=vi.fn();map.addEventListener('dispose',nextDispose);expect(map.image.width).toBe(512);h.update({fish:[]});h.flush();h.engine.dispose();expect(nextDispose).toHaveBeenCalledOnce();expect(dispose).toHaveBeenCalledOnce();
  },90000);
});
