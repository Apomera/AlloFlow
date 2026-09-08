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
const plantPositionSource=source.slice(source.indexOf('    function getPlantHabitatPosition(zone, index) {'),source.indexOf('    function buildSpatialInteractionNetwork(organisms, plants) {'));
const actualPlantPosition=vm.runInNewContext(plantPositionSource+';getPlantHabitatPosition',{clamp:(value,min,max)=>Math.max(min,Math.min(max,value))});
const cleanups = [];

function harness(initial = {}, preference = false) {
  const frames = new Map(), canvasListeners = new Map(), documentListeners = new Map();
  let frameId = 0, now = 0, renderer, mediaListener;
  const createdMaterials=[];
  class TrackedStandardMaterial extends realThree.MeshStandardMaterial { constructor(...args){super(...args);this.dispose=vi.fn(this.dispose.bind(this));createdMaterials.push(this);} }
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
    window: { THREE: { ...realThree, WebGLRenderer: Renderer, MeshStandardMaterial: TrackedStandardMaterial }, devicePixelRatio: 2, matchMedia: () => media, addEventListener() {}, removeEventListener() {} },
    document: { hidden: false, createElement: () => ({ width: 0, height: 0, getContext: () => ctx }), addEventListener: (name, fn) => documentListeners.set(name, fn), removeEventListener: name => documentListeners.delete(name) },
    requestAnimationFrame: fn => { frames.set(++frameId, fn); return frameId; },
    cancelAnimationFrame: id => frames.delete(id),
    AquariumEcosystemCore: { getPlantHabitatPosition: actualPlantPosition }
  };
  const create = vm.runInNewContext(sceneSource + '; createAquariumHabitatScene', context);
  let options = { fish: [], plants: [], layout: [], catalog: [], overlay: 'none', ...initial };
  const engine = create(canvas, options);
  const flush = (ms = 40) => { now += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now)); };
  flush();
  const result = {
    engine, renderer, frames, canvasListeners, documentListeners, flush, createdMaterials,
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

const plantIds=['java_fern','amazon_sword','java_moss','hornwort','anubias','water_wisteria','duckweed','dwarf_hairgrass','red_root_floater','rotala','monte_carlo','chaeto','mangrove','caulerpa'];
const forms=['rhizome_fern','rosette','moss','whorled_stem','rhizome_broadleaf','dissected_stem','floating_fronds','sedge_carpet','floating_leaves','opposite_stem','roundleaf_carpet','filament_alga','emergent_tree','stolon_alga'];
const plant=(id,biomassRatio=1)=>({id,name:'Renamed fern mangrove',biomassRatio,biomass:biomassRatio*4,health:80,zone:'background'});
const dimensions=(volume,shape='standard')=>{const scale=Math.cbrt(volume/20),ratios=shape==='tall'?[.86,1.35,1/(.86*1.35)]:shape==='long'?[1.35,.82,1/(1.35*.82)]:[1,1,1];return {width:12*scale*ratios[0],height:5.2*scale*ratios[1],depth:6.4*scale*ratios[2],volumeGallons:volume,baselineGallons:20,shape};};
const focusCenter=h=>new realThree.Vector3(h.renderer.scene.userData.focusCenterX,h.renderer.scene.userData.focusCenterY,h.renderer.scene.userData.focusCenterZ);
const bodyBounds=object=>{const result=new realThree.Box3();object.updateWorldMatrix(true,true);object.traverse(node=>{if(node.geometry&&!node.userData.ignorePick){node.geometry.computeBoundingBox();result.union(node.geometry.boundingBox.clone().applyMatrix4(node.matrixWorld));}});return result;};
const geometryCount=root=>{let count=0;root.traverse(node=>{count+=node.geometry?.attributes?.position?.count||0;});return count;};
function expectFramed(h,box,limit=.995){for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new realThree.Vector3(x,y,z).project(h.renderer.camera);expect(Math.abs(p.x)).toBeLessThan(limit);expect(Math.abs(p.y)).toBeLessThan(limit);}}

describe('Aquarium botanical forms and selected close-up camera',()=>{
  it('renders all14 exact plant growth forms with their defining visible structures',()=>{
    const h=harness({paused:true,plants:plantIds.map(id=>plant(id))}),groups=h.root('plants').children;
    expect(groups).toHaveLength(14);expect(groups.map(group=>group.userData.visualProfileId)).toEqual(plantIds);expect(groups.map(group=>group.userData.morphology)).toEqual(forms);
    const byId=Object.fromEntries(groups.map(group=>[group.userData.plantId,group]));
    const parts=id=>{const result=[];byId[id].traverse(node=>{if(node.userData.plantPart)result.push(node.userData.plantPart);});return result;};
    expect(parts('java_fern')).toContain('rhizome');expect(byId.java_fern.userData.leafArrangement).toBe('simple-lanceolate-fronds-on-rhizome');
    expect(parts('anubias')).toContain('rhizome');expect(parts('amazon_sword')).toContain('petiole');
    expect(byId.hornwort.userData.trueRoots).toBe(false);expect(parts('hornwort')).not.toContain('root');expect(byId.hornwort.userData.leafArrangement).toBe('forked-leaves-in-whorls');
    expect(parts('dwarf_hairgrass')).toContain('culm');expect(parts('monte_carlo')).toContain('creeping-stem');expect(parts('chaeto')).toContain('unbranched-filament');expect(parts('chaeto')).not.toContain('leaf');
    expect(parts('caulerpa')).toContain('stolon');expect(parts('caulerpa')).toContain('holdfast');expect(byId.caulerpa.userData.trueRoots).toBe(false);
    expect(parts('mangrove')).toContain('woody-stem');expect(byId.red_root_floater.userData.leafArrangement).toBe('two-ranks-on-floating-stems');
    groups.forEach(group=>group.traverse(node=>{if(node.geometry?.attributes?.position)expect(Array.from(node.geometry.attributes.position.array).every(Number.isFinite)).toBe(true);}));
  });
  it('uses real biomass scaling, creates no zero-biomass foliage and reduces geometry at low quality',()=>{
    const h=harness({paused:true,plants:[plant('java_fern',0),plant('anubias',.125),plant('amazon_sword',1)]});
    expect(h.root('plants').children[0].children).toHaveLength(0);expect(h.root('plants').children[0].visible).toBe(false);expect(h.root('plants').children[1].scale.x).toBeCloseTo(.5);
    h.update({plants:plantIds.map(id=>plant(id))});h.flush();const detailed=geometryCount(h.root('plants'));
    h.update({appearance:{quality:'low'}});h.flush();expect(geometryCount(h.root('plants'))).toBeLessThan(detailed*.8);expect(h.root('plants').children).toHaveLength(14);
    const blade=h.root('plants').children.find(group=>group.userData.plantId==='java_fern').children.find(group=>group.children.some(node=>node.userData.plantPart==='leaf')).children.find(node=>node.userData.plantPart==='leaf');
    expect(blade.material.color.equals(new realThree.Color(0x3f7b48).convertSRGBToLinear())).toBe(true);
  });
  it('keeps floating fronds at the real surface and every mangrove leaf in air at all sizes',()=>{
    const h=harness({paused:true});
    for(const [volume,shape,ratio] of [[15,'tall',.001],[20,'standard',1],[200,'tall',.125],[200,'long',1]]){
      h.update({dimensions:dimensions(volume,shape),plants:[plant('mangrove',ratio),plant('duckweed',ratio),plant('red_root_floater',ratio)]});h.engine.setView('front');h.flush();
      const surface=h.root('vessel').userData.waterSurfaceY,groups=h.root('plants').children;
      groups.forEach(group=>{expect(group.userData.waterlineY).toBeCloseTo(surface);group.updateWorldMatrix(true,true);let leafCount=0;group.traverse(node=>{if(node.userData.plantPart==='leaf'){const pos=node.geometry.attributes.position;for(let index=0;index<pos.count;index++){const point=new realThree.Vector3().fromBufferAttribute(pos,index).applyMatrix4(node.matrixWorld);expect(point.y).toBeGreaterThan(surface-.022);}leafCount++;}});expect(leafCount).toBeGreaterThan(0);});
      const mangrove=groups[0],box=bodyBounds(mangrove);expect(box.min.y).toBeLessThan(surface);expect(box.max.y).toBeGreaterThan(surface);expectFramed(h,box);
    }
  });
  it('focuses the requested duplicate resident instance without changing body size or model state',()=>{
    const onFocusChange=vi.fn(),fish=[{...resident('neon',0),targetX:-3},{...resident('neon',1),targetX:3}],before=JSON.stringify(fish);
    const h=harness({paused:true,dimensions:dimensions(200,'long'),fish,onFocusChange}),target=h.root('residents').children[1],scale=target.scale.clone(),wideDistance=h.renderer.camera.position.length();
    expect(h.engine.focusSelection({kind:'fish',id:fish[1].instanceId})).toBe(true);h.flush();
    expect(h.renderer.scene.userData.focusId).toBe(fish[1].instanceId);expect(onFocusChange).toHaveBeenLastCalledWith({kind:'fish',id:fish[1].instanceId});expect(target.scale.equals(scale)).toBe(true);expect(JSON.stringify(fish)).toBe(before);
    expect(h.renderer.camera.position.distanceTo(focusCenter(h))).toBeLessThan(wideDistance/3);expectFramed(h,bodyBounds(target));
    const beforeZoom=h.renderer.camera.position.distanceTo(focusCenter(h));h.engine.nudgeCamera('in');h.flush();expect(h.renderer.camera.position.distanceTo(focusCenter(h))).toBeLessThan(beforeZoom);expect(h.renderer.scene.userData.focusId).toBe(fish[1].instanceId);
    h.engine.nudgeCamera('reset');h.flush();expect(h.renderer.scene.userData.focusKind).toBeNull();expect(onFocusChange).toHaveBeenLastCalledWith(null);
  });
  it('tracks movement in the existing loop and stays idle while paused or reduced motion is active',()=>{
    const h=harness({fish:[resident('guppy')],onFocusChange:vi.fn()});h.engine.focusSelection({kind:'fish',id:'guppy-0'});h.flush();const offset=h.renderer.camera.position.clone().sub(focusCenter(h)),center=focusCenter(h);
    for(let frame=0;frame<30;frame++)h.flush(40);
    expect(focusCenter(h).distanceTo(center)).toBeGreaterThan(.01);expect(h.renderer.camera.position.clone().sub(focusCenter(h)).distanceTo(offset)).toBeLessThan(.000001);
    h.update({paused:true});h.flush();let camera=h.renderer.camera.position.clone(),count=h.renderer.render.mock.calls.length;
    h.flush(1000);expect(h.frames.size).toBe(0);expect(h.renderer.render).toHaveBeenCalledTimes(count);expect(h.renderer.camera.position.equals(camera)).toBe(true);
    h.update({paused:false});h.reduce(true);h.flush();camera=h.renderer.camera.position.clone();count=h.renderer.render.mock.calls.length;h.flush(1000);expect(h.frames.size).toBe(0);expect(h.renderer.render).toHaveBeenCalledTimes(count);expect(h.renderer.camera.position.equals(camera)).toBe(true);
    h.engine.nudgeCamera('left');h.flush();expect(h.renderer.camera.position.equals(camera)).toBe(false);expect(h.renderer.scene.userData.focusId).toBe('guppy-0');
  });
  it('preserves close-up distance on tank resize and camera pose through appearance-only rebuilds',()=>{
    const h=harness({paused:true,dimensions:dimensions(20),fish:[resident('guppy')]});h.engine.focusSelection({kind:'fish',id:'guppy-0'});h.flush();let distance=h.renderer.camera.position.distanceTo(focusCenter(h));
    h.update({dimensions:dimensions(200,'long'),appearance:{quality:'low'}});h.flush();expect(h.renderer.camera.position.distanceTo(focusCenter(h))).toBeCloseTo(distance,8);expect(focusCenter(h).distanceTo(bodyBounds(h.root('residents').children[0]).getCenter(new realThree.Vector3()))).toBeLessThan(.02);
    const camera=h.renderer.camera.position.clone(),quaternion=h.renderer.camera.quaternion.clone();h.update({appearance:{substrate:'dark',quality:'low',animalScale:1.3}});h.flush();
    expect(h.renderer.camera.position.distanceTo(camera)).toBeLessThan(.0000001);expect(1-Math.abs(h.renderer.camera.quaternion.dot(quaternion))).toBeLessThan(.0000001);expect(h.renderer.scene.userData.focusId).toBe('guppy-0');
  });
  it('updates growing plant bounds and clears deleted or zero-biomass targets without stale focus',()=>{
    const onFocusChange=vi.fn(),h=harness({paused:true,plants:[plant('java_fern',.125)],onFocusChange});
    expect(h.engine.focusSelection({kind:'plant',id:'java_fern'})).toBe(true);h.flush();const distance=h.renderer.camera.position.distanceTo(focusCenter(h));
    h.update({plants:[plant('java_fern',1)]});h.flush();expect(h.renderer.camera.position.distanceTo(focusCenter(h))).toBeGreaterThan(distance*1.7);expectFramed(h,bodyBounds(h.root('plants').children[0]));
    h.update({plants:[plant('java_fern',0)]});h.flush();expect(h.renderer.scene.userData.focusKind).toBeNull();expect(onFocusChange).toHaveBeenLastCalledWith(null);
    const camera=h.renderer.camera.position.clone(),calls=onFocusChange.mock.calls.length;expect(h.engine.focusSelection({kind:'plant',id:'java_fern'})).toBe(false);expect(h.engine.focusSelection({kind:'fish',id:'constructor'})).toBe(false);expect(h.renderer.camera.position.equals(camera)).toBe(true);expect(onFocusChange).toHaveBeenCalledTimes(calls);
    h.update({fish:[resident('nerite')]});h.engine.focusSelection({kind:'fish',id:'nerite-0'});h.update({fish:[]});h.flush();expect(h.renderer.scene.userData.focusKind).toBeNull();
  });
  it('supports habitat close-ups and explicitly exits them through camera presets',()=>{
    const h=harness({paused:true,layout:[{id:'rock-1',type:'river_stone',x:0,y:0,z:0,rotation:0,scale:1}],catalog:[{id:'river_stone'}]});
    expect(h.engine.focusSelection({kind:'habitat',id:'rock-1'})).toBe(true);h.flush();expectFramed(h,bodyBounds(h.root('habitat').children[0]));
    h.engine.nudgeCamera('left');h.flush();expect(h.renderer.scene.userData.focusKind).toBe('habitat');
    h.engine.setView('top');h.flush();expect(h.renderer.scene.userData.focusKind).toBeNull();
  });

  it('keeps the entire low carpet above actual substrate and caustics across biomass and vessel sizes',()=>{
    const h=harness({paused:true});
    for(const volume of [5,20,200])for(const ratio of [.001,.75,1]){
      const dims=dimensions(volume,'tall');h.update({dimensions:dims,plants:[{...plant('monte_carlo',ratio),zone:'foreground'}]});h.flush();
      const group=h.root('plants').children[0],leaves=group.children.find(node=>node.userData.plantPart==='leaf');group.updateWorldMatrix(true,true);
      for(let i=0;i<leaves.geometry.attributes.position.count;i++){const p=new realThree.Vector3().fromBufferAttribute(leaves.geometry.attributes.position,i).applyMatrix4(leaves.matrixWorld);expect(p.y).toBeGreaterThan(.095*dims.height/5.2);}
      expect(h.engine.focusSelection({kind:'plant',id:'monte_carlo'})).toBe(true);h.flush();expectFramed(h,bodyBounds(group));
      const offset=h.renderer.camera.position.clone().sub(focusCenter(h)).normalize();expect(offset.y).toBeGreaterThan(.45);
    }
  });
  it('frames mangrove leaves and submerged roots without opaque rim occlusion',()=>{
    const h=harness({paused:true});
    for(const volume of [5,20,200]){
      h.update({dimensions:dimensions(volume),plants:[{...plant('mangrove',.75),zone:'emergent'}]});h.engine.focusSelection({kind:'plant',id:'mangrove'});h.flush();
      const group=h.root('plants').children[0],camera=h.renderer.camera;expectFramed(h,bodyBounds(group));
      group.traverse(node=>{if(node.geometry&&['root','woody-stem'].includes(node.userData.plantPart)){
        node.geometry.computeBoundingBox();const target=node.localToWorld(node.geometry.boundingBox.getCenter(new realThree.Vector3())),direction=target.clone().sub(camera.position),distance=direction.length();
        const ray=new realThree.Raycaster(camera.position,direction.normalize(),0,distance-.02);
        const opaque=ray.intersectObject(h.root('vessel'),true).filter(hit=>hit.object.visible&&hit.object.material&&!Array.isArray(hit.object.material)&&(!hit.object.material.transparent||hit.object.material.opacity>=.95));
        expect(opaque).toHaveLength(0);
      }});
    }
  });
  it('hides only the focused inspection halo and restores other selected indicators on exit',()=>{
    const h=harness({paused:true,fish:[{...resident('neon'),selected:true}],plants:[{...plant('anubias'),selected:true}],selectedId:'rock-1',layout:[{id:'rock-1',type:'river_stone',x:0,y:0,z:0,rotation:0,scale:1}],catalog:[{id:'river_stone'}]});
    const halo=root=>{let found;root.children[0].traverse(node=>{if(node.userData.inspectionHalo)found=node;});return found;};
    const fishHalo=halo(h.root('residents')),plantHalo=halo(h.root('plants')),rockHalo=halo(h.root('habitat'));expect(fishHalo.visible&&plantHalo.visible&&rockHalo.visible).toBe(true);
    h.engine.focusSelection({kind:'fish',id:'neon-0'});h.flush();expect(fishHalo.visible).toBe(false);expect(plantHalo.visible&&rockHalo.visible).toBe(true);
    h.engine.focusSelection({kind:'plant',id:'anubias'});h.flush();expect(fishHalo.visible).toBe(true);expect(plantHalo.visible).toBe(false);
    h.engine.setView('front');h.flush();expect(fishHalo.visible&&plantHalo.visible&&rockHalo.visible).toBe(true);
    h.update({appearance:{showHalos:false}});h.engine.focusSelection({kind:'fish',id:'neon-0'});h.engine.setView('front');h.flush();expect(fishHalo.visible||plantHalo.visible||rockHalo.visible).toBe(false);
  });

  it('allocates no zero-biomass materials and releases unused or replaced botanical resources exactly once',()=>{
    const h=harness({paused:true}),initial=h.createdMaterials.length;
    h.update({plants:plantIds.map(id=>plant(id,0))});h.flush();expect(h.createdMaterials).toHaveLength(initial);
    h.update({plants:plantIds.map(id=>plant(id,1))});h.flush();
    const allocated=h.createdMaterials.slice(initial),attached=new Set(),geometries=new Set();
    h.root('plants').traverse(node=>{if(node.material)attached.add(node.material);if(node.geometry)geometries.add(node.geometry);});
    expect(allocated.length).toBeGreaterThan(attached.size);
    allocated.forEach(mat=>expect(mat.dispose).toHaveBeenCalledTimes(attached.has(mat)?0:1));
    const geometryDisposals=[...geometries].map(geometry=>{const spy=vi.fn();geometry.addEventListener('dispose',spy);return spy;});
    h.update({appearance:{quality:'low'}});h.flush();allocated.forEach(mat=>expect(mat.dispose).toHaveBeenCalledOnce());geometryDisposals.forEach(spy=>expect(spy).toHaveBeenCalledOnce());
    const currentMaterials=h.createdMaterials.slice(initial);h.update({plants:[]});h.flush();currentMaterials.forEach(mat=>expect(mat.dispose).toHaveBeenCalledOnce());
    h.engine.dispose();currentMaterials.forEach(mat=>expect(mat.dispose).toHaveBeenCalledOnce());geometryDisposals.forEach(spy=>expect(spy).toHaveBeenCalledOnce());
  });
});
