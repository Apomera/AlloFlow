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
const start = source.indexOf('  function createAquariumHabitatScene(canvas, initialOptions) {');
const end = source.indexOf('  function AquariumHabitat3DViewport(props) {', start);
const helperStart = source.indexOf('  function getAquariumPlantVisualProfile(id) {');
const sceneSource = source.slice(helperStart, end);
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

const catalogIds = ['neon','guppy','cory','angel','platy','molly','nerite','dwarffrog','cardinal','rummy','oto','shrimp','betta','clown','tang','goby','anemone','stonycoral','copepods','pistol','pederson','oscar','pike','pleco','slider','goldfish','cleaner','urchin','crab','starfish','rockfish','seastar','kelp','archer','puffer','mudskip'];
const dimensions = (volume,shape='standard') => {
  const ratios=shape==='long'?[1.35,.82,1/(1.35*.82)]:shape==='tall'?[.86,1.35,1/(.86*1.35)]:[1,1,1];
  const base=shape==='cube'?Array(3).fill(Math.cbrt(12*5.2*6.4)):[12,5.2,6.4].map((value,index)=>value*ratios[index]);
  const scale=Math.cbrt(volume/20);
  return {width:base[0]*scale,height:base[1]*scale,depth:base[2]*scale,volumeGallons:volume,shape,baselineGallons:20};
};
function bodyBox(group){const box=new realThree.Box3();group.updateWorldMatrix(true,true);group.traverse(node=>{if(node.geometry&&!node.userData.ignorePick){node.geometry.computeBoundingBox();box.union(node.geometry.boundingBox.clone().applyMatrix4(node.matrixWorld));}});return box;}

describe('Catalog geometry and simulation-sized aquarium',()=>{
  it('uses explicit active identities for all 36 species, including nonfish',()=>{
    const h=harness({paused:true,dimensions:dimensions(200),fish:catalogIds.map((id,index)=>({...resident(id,index),name:'Coral shrimp goldfish',bodyPlan:'cichlid'}))});
    const groups=h.root('residents').children;
    expect(groups).toHaveLength(36);
    groups.forEach((group,index)=>{expect(group.userData.profileId).toBe(catalogIds[index]);expect(group.userData.identification.length).toBeGreaterThan(20);group.traverse(node=>{if(node.geometry?.attributes?.position)expect(Array.from(node.geometry.attributes.position.array).every(Number.isFinite)).toBe(true);});});
    const byId=Object.fromEntries(groups.map(group=>[group.userData.profileId,group]));
    expect(byId.nerite.userData.shape).toBe('snail');expect(byId.kelp.userData.shape).toBe('kelp');expect(byId.kelp.userData.stationary).toBe(true);expect(byId.kelp.userData.tail).toBeNull();
    expect(byId.crab.userData.shape).toBe('hermitcrab');expect(byId.crab.children.some(node=>node.userData.carriedShell)).toBe(true);
    expect(byId.seastar.userData.armCount).toBe(20);expect(byId.starfish.userData.armCount).toBe(5);
    expect(byId.pistol.children.some(node=>node.userData.snappingClaw)).toBe(true);
    expect(byId.oto.children.some(node=>node.userData.suckerMouth)).toBe(true);expect(byId.pleco.children.some(node=>node.userData.suckerMouth)).toBe(true);expect(byId.cory.children.some(node=>node.userData.suckerMouth)).toBe(false);
  });
  it('distinguishes diagnostic tetra markings and meaningful fish silhouettes',()=>{
    const ids=['neon','cardinal','rummy','oto','cory','pleco','pike','oscar','goby','mudskip','platy','molly','goldfish','puffer'];
    const h=harness({paused:true,fish:ids.map(resident)}),byId=Object.fromEntries(h.root('residents').children.map(group=>[group.userData.profileId,group]));
    expect([byId.neon.userData.redExtent,byId.cardinal.userData.redExtent,byId.rummy.userData.redExtent]).toEqual(['rear-half','full-lower-body','head-only']);expect(byId.rummy.userData.tailPattern).toBe('black-white-bars');
    expect(new Set(['oto','cory','pleco'].map(id=>byId[id].userData.shape)).size).toBe(3);
    const body=id=>byId[id].children.find(node=>node.userData.anatomyPart==='body').scale;
    expect(body('pike').x/body('pike').y).toBeGreaterThan(body('oscar').x/body('oscar').y*2);
    expect(body('molly').x/body('molly').y).toBeGreaterThan(body('platy').x/body('platy').y);
    expect(byId.goby.userData.dorsalFinCount).toBe(2);expect(byId.mudskip.userData.dorsalFinCount).toBe(2);
    expect(byId.puffer.userData.dorsalOcellusCount).toBe(3);
  });
  it('changes vessel volume and shape without stretching or replacing resident and plant bodies',()=>{
    const fish={...resident('guppy'),targetX:3,targetY:2,targetZ:1};
    const h=harness({paused:true,dimensions:dimensions(20),fish:[fish],plants:[{id:'fern',morphology:'fern',biomassRatio:.5},{id:'duckweed',zone:'surface',biomassRatio:.5}]});
    const group=h.root('residents').children[0],plant=h.root('plants').children[0],float=h.root('plants').children[1];
    const bodyScale=group.scale.clone(),plantScale=plant.scale.clone(),bodyGeometry=group.children[0].geometry;
    let previousDims=dimensions(20),previousPosition=group.position.clone();
    for(const shape of ['standard','long','tall','cube']){
      const dims=dimensions(160,shape);h.update({dimensions:dims});h.flush();
      expect(group.position.x).toBeCloseTo(previousPosition.x*dims.width/previousDims.width);expect(group.position.y).toBeCloseTo(previousPosition.y*dims.height/previousDims.height);expect(group.position.z).toBeCloseTo(previousPosition.z*dims.depth/previousDims.depth);
      previousDims=dims;previousPosition=group.position.clone();
      expect(h.root('residents').children[0]).toBe(group);expect(group.children[0].geometry).toBe(bodyGeometry);expect(group.scale.equals(bodyScale)).toBe(true);
      expect(h.root('plants').children[0]).toBe(plant);expect(plant.scale.equals(plantScale)).toBe(true);
      expect(group.userData.baseX).toBeCloseTo(3*dims.width/12);expect(group.userData.baseY).toBeCloseTo(2*dims.height/5.2);expect(group.userData.baseZ).toBeCloseTo(dims.depth/6.4);
      expect(float.position.y).toBeCloseTo(dims.height+.03*dims.height/5.2-.025);
      expect(h.root('vessel').userData.volumeGallons).toBe(160);expect(h.root('vessel').userData.shape).toBe(shape);
      expect(h.root('vessel').scale.x*h.root('vessel').scale.y*h.root('vessel').scale.z).toBeCloseTo(8);
    }
  });
  it('keeps compatible full bodies inside resized glass while swimming',()=>{
    for(const [volume,shape,ids] of [[5,'long',['neon','guppy','nerite']],[20,'tall',['angel','cory','platy']],[200,'long',['pike','oscar','slider','kelp','seastar']]]){
      const dims=dimensions(volume,shape),h=harness({dimensions:dims,fish:ids.map((id,index)=>({...resident(id,index),targetX:5.3,targetZ:2.8,pathSpan:2.7}))});
      for(let frame=0;frame<48;frame++){h.flush(40);h.root('residents').children.forEach(group=>{
        expect(group.userData.fitsTank).toBe(true);const box=bodyBox(group);
        expect(box.min.x).toBeGreaterThan(-dims.width/2);expect(box.max.x).toBeLessThan(dims.width/2);
        expect(box.min.z).toBeGreaterThan(-dims.depth/2);expect(box.max.z).toBeLessThan(dims.depth/2);
        expect(box.min.y).toBeGreaterThan(0);expect(box.max.y).toBeLessThan(dims.height);
      });}
    }
  });
  it('uses two-sided pigment maps for fish markings while retaining slider ear anatomy',()=>{
    const h=harness({paused:true,fish:['rummy','puffer','clown','slider'].map(resident)}),byId=Object.fromEntries(h.root('residents').children.map(group=>[group.userData.profileId,group]));
    const tail=byId.rummy.userData.tail;expect(tail.children).toHaveLength(1);expect(tail.children[0].material.side).toBe(realThree.DoubleSide);expect(tail.children[0].material.map.userData.role).toBe('caudal-membrane');
    expect(byId.rummy.userData.tailPattern).toBe('black-white-bars');expect(byId.puffer.userData.dorsalOcellusCount).toBe(3);
    const body=byId.clown.children.find(node=>node.userData.anatomyPart==='body');expect(body.userData.surfaceModel).toBe('continuous-pigment');expect(body.material.map.encoding).toBe(realThree.sRGBEncoding);
    const ears=byId.slider.children.filter(node=>node.userData.anatomyPart==='red-ear-patch');expect(ears).toHaveLength(2);ears.forEach(ear=>expect(ear.position.x).toBeGreaterThan(.44));
  });
  it('fits all physical vessel corners in every preset across long, tall and large tanks',()=>{
    const h=harness({paused:true});
    expect(h.root('vessel').children.some(node=>node.name==='aquarium-ground-shadow')).toBe(false);
    for(const aspect of [1022/480,350/270])for(const [volume,shape] of [[20,'standard'],[40,'long'],[15,'tall'],[200,'long']]){
      h.renderer.camera.aspect=aspect;h.renderer.camera.updateProjectionMatrix();h.update({dimensions:dimensions(volume,shape)});
      for(const view of ['front','angle','top','left']){
        h.engine.setView(view);h.flush();const box=new realThree.Box3().setFromObject(h.root('vessel'));
        for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
          const point=new realThree.Vector3(x,y,z).project(h.renderer.camera);
          expect(Math.abs(point.x),JSON.stringify({axis:'x',aspect,volume,shape,view,box,camera:h.renderer.camera.position})).toBeLessThan(.995);expect(Math.abs(point.y),JSON.stringify({axis:'y',aspect,volume,shape,view,box,camera:h.renderer.camera.position})).toBeLessThan(.995);
        }
      }
    }
  });
  it('keeps camera orientation and zoom intent through dimension changes and exact pose through appearance changes',()=>{
    const h=harness({paused:true,dimensions:dimensions(20)});h.engine.setView('front');h.engine.nudgeCamera('left');h.engine.nudgeCamera('in');h.flush();
    const before=h.renderer.camera.position.clone(),target=new realThree.Vector3(0,5.2*.452,0),direction=before.clone().sub(target).normalize();
    h.update({appearance:{substrate:'dark',quality:'low'}});h.flush();expect(h.renderer.camera.position.equals(before)).toBe(true);
    const dims=dimensions(100,'long');h.update({dimensions:dims});h.flush();
    expect(h.renderer.camera.position.clone().sub(new realThree.Vector3(0,dims.height*.452,0)).normalize().distanceTo(direction)).toBeLessThan(.000001);
    h.engine.nudgeCamera('reset');h.flush();expect(h.renderer.camera.position.x).toBe(0);
  });
  it('reports an impossible legacy fit without shrinking an animal to disguise it',()=>{
    const h=harness({paused:true,fish:[{...resident('angel'),displaySize:{w:90}}]});const group=h.root('residents').children[0],scale=group.scale.clone();
    h.update({dimensions:{width:1,height:1,depth:1,volumeGallons:5,shape:'legacy'}});h.flush();
    expect(group.scale.equals(scale)).toBe(true);expect(group.userData.fitsTank).toBe(false);expect(group.userData.fitWarning).toContain('increase tank size');expect(Number.isFinite(group.position.y)).toBe(true);
  });
  it('keeps bubbles spherical and body equipment unscaled when the vessel changes',()=>{
    const equipment={aerator:{installed:true,on:true,intensity:1},heater:{installed:true,on:true},light:{installed:true,on:true}};
    const h=harness({paused:true,equipment,dimensions:dimensions(20)}),bubble=h.renderer.scene.getObjectByName('aeration-bubbles').children[0];const scale=bubble.getWorldScale(new realThree.Vector3());
    const dims=dimensions(100,'tall');h.update({dimensions:dims});h.flush();expect(bubble.getWorldScale(new realThree.Vector3()).equals(scale)).toBe(true);
    const pump=h.renderer.scene.getObjectByName('equipment-airPump'),light=h.renderer.scene.getObjectByName('equipment-light');expect(pump.position.x).toBeCloseTo(-dims.width/2+.95);expect(light.position.y).toBeCloseTo(dims.height+.64);expect(pump.scale.x).toBe(1);
  });
});
