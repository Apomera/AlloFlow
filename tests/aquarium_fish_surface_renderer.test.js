// The geometry and raycaster are real Three r128; only GPU drawing is replaced.
// Real WebGL appearance and browser interactions are covered by the visual QA harness.
import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { Buffer } from 'node:buffer';
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

const pixelBuffer=data=>Buffer.from(data.buffer,data.byteOffset,data.byteLength);
const fishBody=group=>group.children.find(node=>node.userData.anatomyPart==='body');
const mapPixel=(map,u,v)=>{const {width,height,data}=map.image,x=Math.max(0,Math.min(width-1,Math.floor(u*width))),y=Math.max(0,Math.min(height-1,Math.floor(v*height))),offset=(y*width+x)*4;return Array.from(data.slice(offset,offset+4));};
function bodyPixel(group,x,y,side=1){const body=fishBody(group),theta=Math.acos(Math.max(-1,Math.min(1,y/body.scale.y))),longitude=Math.acos(Math.max(-1,Math.min(1,-x/body.scale.x/Math.max(.000001,Math.sin(theta)))));return mapPixel(body.material.map,(side>0?longitude:Math.PI*2-longitude)/(Math.PI*2),1-theta/Math.PI);}
const red=p=>p[0]>p[1]*1.8&&p[0]>p[2]*1.8;
const blue=p=>p[2]>p[0]*2&&p[1]>p[0]*2;
const byProfile=h=>Object.fromEntries(h.root('residents').children.map(group=>[group.userData.profileId,group]));

describe('Aquarium continuous fish surfaces',()=>{
  it('keeps neon/cardinal red extents and rummy head pigment on both sides of one continuous body',()=>{
    const h=harness({paused:true,fish:['neon','cardinal','rummy'].map(resident)}),fish=byProfile(h);
    for(const side of [-1,1]){
      expect(blue(bodyPixel(fish.neon,.12,.035,side))).toBe(true);expect(red(bodyPixel(fish.neon,-.22,-.055,side))).toBe(true);expect(red(bodyPixel(fish.neon,.2,-.055,side))).toBe(false);
      expect(red(bodyPixel(fish.cardinal,-.22,-.055,side))).toBe(true);expect(red(bodyPixel(fish.cardinal,.2,-.055,side))).toBe(true);
      expect(red(bodyPixel(fish.rummy,.3,.03,side))).toBe(true);expect(red(bodyPixel(fish.rummy,-.22,.03,side))).toBe(false);
    }
    Object.values(fish).forEach(group=>{expect(group.userData.surfaceModel).toBe('continuous-pigment');expect(group.children.filter(node=>node.userData.anatomyPart==='body')).toHaveLength(1);expect(group.children.some(node=>['lateral-marking','body-marking'].includes(node.userData.anatomyPart))).toBe(false);expect(fishBody(group).material.map.encoding).toBe(realThree.sRGBEncoding);});
  });
  it('preserves clown bands, tang palette and all three puffer dorsal ocelli as surface pigment',()=>{
    const h=harness({paused:true,fish:['clown','tang','puffer'].map(resident)}),fish=byProfile(h);
    const band=bodyPixel(fish.clown,.04,.04),orange=bodyPixel(fish.clown,.16,.04);expect(band.slice(0,3).every(c=>c>225)).toBe(true);expect(orange[0]).toBeGreaterThan(orange[1]*1.4);expect(orange[1]).toBeGreaterThan(orange[2]*1.7);
    const palette=bodyPixel(fish.tang,-.26,.04),coat=bodyPixel(fish.tang,.12,.03);expect(palette[0]+palette[1]+palette[2]).toBeLessThan(180);expect(coat[2]).toBeGreaterThan(coat[0]*2);
    expect(fish.puffer.userData.dorsalOcellusCount).toBe(3);
    for(const x of [0,.25,-.24]){const body=fishBody(fish.puffer),y=body.scale.y*Math.sqrt(1-x*x/(body.scale.x*body.scale.x)),center=bodyPixel(fish.puffer,x,y);expect(center[0]+center[1]+center[2]).toBeLessThan(230);}
    expect(fish.puffer.children.some(node=>node.userData.dorsalOcellus)).toBe(false);
  });
  it('shows rummy tail bars from both membrane faces without raised stripe meshes',()=>{
    const h=harness({paused:true,fish:[resident('rummy')]}),fish=h.root('residents').children[0],tail=fish.userData.tail;
    expect(tail.children).toHaveLength(1);expect(fish.userData.tailPattern).toBe('black-white-bars');h.renderer.scene.updateMatrixWorld(true);
    for(const face of [-1,1]){
      const origin=tail.localToWorld(new realThree.Vector3(-.266,.12,face)),target=tail.localToWorld(new realThree.Vector3(-.266,.12,0)),ray=new realThree.Raycaster(origin,target.sub(origin).normalize()),hit=ray.intersectObject(tail,true)[0];
      expect(hit.object.userData.anatomyPart).toBe('caudal-fin');expect(hit.object.material.side).toBe(realThree.DoubleSide);const color=mapPixel(hit.object.material.map,hit.uv.x,hit.uv.y);expect(color[0]+color[1]+color[2]).toBeLessThan(150);expect(color[3]).toBeGreaterThan(200);
    }
    const white=mapPixel(tail.children[0].material.map,.25/.38,(.065/.21+1)/2);expect(white.slice(0,3).every(c=>c>210)).toBe(true);
  });
  it('uses curved translucent fins with flat guppy pattern pigment and fine ray detail',()=>{
    const h=harness({paused:true,fish:['neon','guppy','betta'].map(resident)}),fish=byProfile(h);
    for(const group of Object.values(fish)){
      const caudal=group.userData.tail.children[0];expect(group.userData.tail.children).toHaveLength(1);expect(caudal.userData.surfaceModel).toBe('curved-membrane');expect(caudal.material.depthWrite).toBe(false);expect(caudal.material.transparent).toBe(true);
      const p=caudal.geometry.attributes.position,n=caudal.geometry.attributes.normal;let minZ=Infinity,maxZ=-Infinity;
      for(let i=0;i<p.count;i++){minZ=Math.min(minZ,p.getZ(i));maxZ=Math.max(maxZ,p.getZ(i));expect(new realThree.Vector3().fromBufferAttribute(n,i).length()).toBeCloseTo(1,4);}expect(maxZ-minZ).toBeGreaterThan(.005);
    }
    const tailMap=fish.neon.userData.tail.children[0].material.map;let largest=0;for(let i=3;i<tailMap.image.data.length;i+=4)largest=Math.max(largest,tailMap.image.data[i]);expect(largest).toBeLessThan(130);
    const spotted=mapPixel(fish.guppy.userData.tail.children[0].material.map,.42/.6,(0/.33+1)/2);expect(spotted[0]+spotted[1]+spotted[2]).toBeLessThan(190);
  });
  it('scales surface resolution and body smoothness by quality without changing profile size',()=>{
    const h=harness({paused:true,fish:[resident('neon')],appearance:{quality:'low'}}),sizes=[],vertices=[],widths=[];
    for(const quality of ['low','balanced','high']){h.update({appearance:{quality}});h.flush();const group=h.root('residents').children[0],body=fishBody(group);sizes.push(group.scale.toArray().concat(body.scale.toArray()));vertices.push(body.geometry.attributes.position.count);widths.push(body.material.map.image.width);}
    expect(sizes[1]).toEqual(sizes[0]);expect(sizes[2]).toEqual(sizes[0]);expect(widths).toEqual([128,256,512]);expect(vertices[1]).toBeGreaterThan(vertices[0]*3);expect(vertices[2]).toBeGreaterThan(vertices[1]);
  });
  it('keeps pigment resources stable through chemistry/time updates and disposes maps once on rebuild/removal',()=>{
    const fish=resident('neon'),h=harness({paused:true,fish:[fish]}),body=fishBody(h.root('residents').children[0]),map=body.material.map;
    const resources=new Set();h.root('residents').traverse(node=>{if(node.geometry)resources.add(node.geometry);if(node.material){resources.add(node.material);if(node.material.map)resources.add(node.material.map);}});
    const spies=[...resources].map(resource=>{const spy=vi.fn();resource.addEventListener('dispose',spy);return spy;});
    h.update({simHour:14,lighting:'blue',fish:[{...fish,health:30,hunger:80,stress:70}]});h.flush();expect(fishBody(h.root('residents').children[0])).toBe(body);expect(body.material.map).toBe(map);spies.forEach(spy=>expect(spy).not.toHaveBeenCalled());
    h.update({appearance:{quality:'low'}});h.flush();spies.forEach(spy=>expect(spy).toHaveBeenCalledOnce());
    const currentMaps=new Set();h.root('residents').traverse(node=>{if(node.material?.map)currentMaps.add(node.material.map);});expect(currentMaps.size).toBe(3);const disposed=[...currentMaps].map(map=>{const spy=vi.fn();map.addEventListener('dispose',spy);return spy;});
    h.update({fish:[]});h.flush();h.engine.dispose();disposed.forEach(spy=>expect(spy).toHaveBeenCalledOnce());spies.forEach(spy=>expect(spy).toHaveBeenCalledOnce());
  });

  it('reuses bounded immutable CPU pixels while keeping independent mesh-owned textures',()=>{
    const fish=[resident('neon',0),resident('neon',1)],h=harness({paused:true,fish}),groups=h.root('residents').children,maps=groups.map(group=>fishBody(group).material.map);
    expect(maps[0]).not.toBe(maps[1]);expect(maps[0].image.data).toBe(maps[1].image.data);expect(maps[1].userData.cachedPixels).toBe(true);
    const firstDisposed=vi.fn(),secondDisposed=vi.fn();maps[0].addEventListener('dispose',firstDisposed);maps[1].addEventListener('dispose',secondDisposed);
    h.update({fish:[fish[1]]});h.flush();expect(firstDisposed).toHaveBeenCalledOnce();expect(secondDisposed).not.toHaveBeenCalled();expect(fishBody(h.root('residents').children[0]).material.map).toBe(maps[1]);
    for(const quality of ['low','balanced','high'])for(const fitScore of [20,50,70,90]){h.update({fish:[{...fish[1],fitScore}],appearance:{quality},overlay:'organisms'});h.flush();expect(h.renderer.scene.userData.fishPigmentCacheEntries).toBeLessThanOrEqual(32);expect(h.renderer.scene.userData.fishPigmentCacheBytes).toBeLessThanOrEqual(8*1024*1024);}
    h.engine.dispose();expect(h.renderer.scene.userData.fishPigmentCacheEntries).toBe(0);expect(h.renderer.scene.userData.fishPigmentCacheBytes).toBe(0);expect(firstDisposed).toHaveBeenCalledOnce();expect(secondDisposed).toHaveBeenCalledOnce();
  },90000);
  it('keeps individual mottling deterministic under renaming while preserving Oscar eyespots',()=>{
    const fish=[resident('oscar',0),resident('oscar',1)],h=harness({paused:true,fish}),groups=h.root('residents').children,first=fishBody(groups[0]).material.map,second=fishBody(groups[1]).material.map;
    expect(pixelBuffer(first.image.data).equals(pixelBuffer(second.image.data))).toBe(false);const snapshot=first.image.data.slice();
    h.update({fish:[{...fish[0],name:'Neon coral shrimp'},{...fish[1],name:'Different display label'}]});h.flush();expect(pixelBuffer(fishBody(h.root('residents').children[0]).material.map.image.data).equals(pixelBuffer(snapshot))).toBe(true);
    for(const group of h.root('residents').children)for(const side of [-1,1]){const center=bodyPixel(group,-.6*.71,.005,side);expect(center[0]+center[1]+center[2]).toBeLessThan(210);}
  });

  it('keeps both mudskipper pupils visible outside their raised eye mounds',()=>{
    const h=harness({paused:true,fish:[resident('mudskip')]}),fish=h.root('residents').children[0];h.renderer.scene.updateMatrixWorld(true);
    const pupils=[];fish.traverse(node=>{if(node.userData.anatomyPart==='raised-eye-pupil')pupils.push(node);});expect(pupils).toHaveLength(2);
    for(const pupil of pupils){
      const side=Math.sign(pupil.position.z),target=pupil.getWorldPosition(new realThree.Vector3()),outward=new realThree.Vector3(0,0,side).applyQuaternion(pupil.getWorldQuaternion(new realThree.Quaternion())).normalize(),origin=target.clone().addScaledVector(outward,2);
      const ray=new realThree.Raycaster(origin,outward.clone().negate()),hit=ray.intersectObject(fish,true)[0];expect(hit).toBeTruthy();expect(hit.object).toBe(pupil);
    }
  });
});
