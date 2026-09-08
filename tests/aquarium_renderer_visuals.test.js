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

describe('Aquarium visual scene lifecycle', () => {
  it('renders every supplied resident with real, finite species geometry and no extra stock', () => {
    const ids = ['neon', 'guppy', 'angel', 'clownfish', 'shrimp', 'snail', 'crab', 'pufferfish', 'turtle', 'frog', 'anemone', 'urchin', 'starfish', 'clam', 'octopus', 'goldfish', 'cory', 'tang'];
    const h = harness({ paused: true, fish: ids.map(resident), plants: [{ id: 'anubias', name: 'Anubias', zone: 'background', health: 80 }] });
    expect(h.root('residents').children).toHaveLength(ids.length);
    expect(new Set(h.root('residents').children.map(group => group.userData.shape)).size).toBeGreaterThan(14);
    expect(h.root('plants').children).toHaveLength(1);
    h.renderer.scene.traverse(node => {
      expect([node.position.x, node.position.y, node.position.z, node.scale.x, node.scale.y, node.scale.z].every(Number.isFinite)).toBe(true);
      const positions = node.geometry?.attributes?.position?.array;
      if (positions) expect(Array.from(positions).every(Number.isFinite)).toBe(true);
    });
    const grid = h.root('vessel').children.find(node => node.type === 'GridHelper');
    expect(grid.visible).toBe(false);
    expect(h.renderer.scene.getObjectByName('aeration-bubbles').visible).toBe(false);
  });


  it('keeps enlarged residents and their tails inside the glass through a full swimming sample', () => {
    const h = harness({ fish: [{ ...resident('goldfish'), displaySize: { w: 90 }, targetX: 5.5, targetZ: 3, pathSpan: 2.7 }, { ...resident('anemone', 1), displaySize: { w: 90 }, zone: 'bottom', targetX: -5.5, targetZ: -3 }] });
    for (let frame = 0; frame < 180; frame++) {
      h.flush(40);
      h.root('residents').children.forEach(group => {
        const box = new realThree.Box3().setFromObject(group);
        expect(box.min.x).toBeGreaterThan(-6);
        expect(box.max.x).toBeLessThan(6);
        expect(box.min.z).toBeGreaterThan(-3.3);
        expect(box.max.z).toBeLessThan(3.3);
        expect(box.min.y).toBeGreaterThan(0);
        expect(box.max.y).toBeLessThan(5.2);
      });
    }
  });

  it('changes lighting and modeled stress without rebuilding resident or plant meshes', () => {
    const fish = resident('neon');
    const h = harness({ paused: true, fish: [fish], plants: [{ id: 'grass', health: 80 }] });
    const body = h.root('residents').children[0], plant = h.root('plants').children[0], speed = body.userData.speed;
    const initialBackground = h.renderer.scene.background.getHex();
    h.update({ lighting: 'night', simHour: 0, fish: [{ ...fish, stress: 90 }] }); h.flush();
    expect(h.root('residents').children[0]).toBe(body);
    expect(h.root('plants').children[0]).toBe(plant);
    expect(body.userData.speed).toBe(speed);
    expect(body.userData.stress).toBe(90);expect(body.userData.health).toBeNull();
    expect(h.renderer.scene.background.getHex()).not.toBe(initialBackground);
    h.update({ fish: [{ ...fish, health: 0 }] }); h.flush();
    expect(body.userData.health).toBe(0);expect(body.userData.speed).toBeLessThan(speed);
    h.update({ fish: [] }); h.flush();
    expect(h.root('residents').children).toHaveLength(0);
  });

  it('pauses visual time and continuous drawing while camera controls still redraw', () => {
    const h = harness({ paused: true, fish: [resident('guppy')], simRunning: true });
    const group = h.root('residents').children[0], position = group.position.clone();
    expect(h.frames.size).toBe(0);
    const count = h.renderer.render.mock.calls.length;
    h.flush(1000); expect(h.renderer.render).toHaveBeenCalledTimes(count);
    expect(group.position.equals(position)).toBe(true);
    h.engine.setView('front'); h.flush();
    expect(h.renderer.camera.position.x).toBe(0);
    const camera = h.renderer.camera.position.clone();
    h.engine.nudgeCamera('left'); h.flush();
    expect(h.renderer.camera.position.equals(camera)).toBe(false);
    expect(h.frames.size).toBe(0);
    h.update({ paused: false }); h.flush(); h.flush(100);
    expect(h.frames.size).toBe(1);
    expect(group.position.equals(position)).toBe(false);
    h.update({ paused: true }); h.flush();
    expect(h.frames.size).toBe(0);
  });

  it('honors reduced motion at startup and when the OS preference changes', () => {
    const h = harness({ fish: [resident('betta')] }, true);
    expect(h.frames.size).toBe(0);
    h.reduce(false); h.flush(); h.flush(100);
    expect(h.frames.size).toBe(1);
    h.reduce(true); h.flush();
    expect(h.frames.size).toBe(0);
    const group = h.root('residents').children[0], rotation = group.userData.tail.rotation.y;
    h.flush(2000); expect(group.userData.tail.rotation.y).toBe(rotation);
  });

  it('picks the nearest resident ahead of hardscape and ignores an orbit drag release', () => {
    const onSelectFish = vi.fn(), onSelect = vi.fn(), onSelectPlant = vi.fn();
    const h = harness({ paused: true, fish: [resident('clownfish')], layout: [{ id: 'rock-1', type: 'river_stone', x: 0, y: 2, z: -1, rotation: 0, scale: 1 }], catalog: [{ id: 'river_stone' }], plants: [{ id: 'grass', health: 80 }], onSelectFish, onSelect, onSelectPlant });
    const fish = h.root('residents').children[0]; fish.position.set(0, 2.4, 2); fish.rotation.set(0, 0, 0);
    h.engine.setView('front'); h.flush();
    const point = h.point(fish.children[0]);
    h.event('pointerdown', point); h.event('pointerup', point);
    expect(onSelectFish).toHaveBeenCalledWith('clownfish-0');
    expect(onSelect).not.toHaveBeenCalled();
    h.event('pointerdown', point); h.event('pointermove', { ...point, clientX: point.clientX + 30 }); h.event('pointerup', point);
    expect(onSelectFish).toHaveBeenCalledTimes(1);
    let blade; h.root('plants').children[0].traverse(node => { if (!blade && node.isMesh && node.userData.plantId) blade = node; });
    // A clump's bounding-box center can be empty space between thin culms.
    // Click the center of one actual indexed triangle on its foliage instead.
    const positions = blade.geometry.attributes.position, order = blade.geometry.index;
    const surfacePoint = new realThree.Vector3();
    for (let i = 0; i < 3; i++) surfacePoint.add(new realThree.Vector3().fromBufferAttribute(positions, order ? order.getX(i) : i));
    const projected = blade.localToWorld(surfacePoint.multiplyScalar(1 / 3)).project(h.renderer.camera);
    const plantPoint = { clientX: (projected.x + 1) * 380, clientY: (1 - projected.y) * 210 };
    h.event('pointerdown', plantPoint); h.event('pointerup', plantPoint);
    expect(onSelectPlant).toHaveBeenCalledWith('grass');
  });

  it('cancels frames on context loss and disposes GPU resources and listeners exactly once', () => {
    const onContextLost = vi.fn(), preventDefault = vi.fn();
    const h = harness({ fish: [resident('neon')], onContextLost });
    const geometries = new Set(), materials = new Set(), textures = new Set(), calls = [];
    h.renderer.scene.traverse(node => { if (node.geometry) geometries.add(node.geometry); (Array.isArray(node.material) ? node.material : [node.material]).filter(Boolean).forEach(mat => { materials.add(mat); Object.values(mat).forEach(value => { if (value?.isTexture) textures.add(value); }); }); });
    [...geometries, ...materials, ...textures].forEach(resource => { const spy = vi.fn(); resource.addEventListener('dispose', spy); calls.push(spy); });
    h.event('webglcontextlost', { preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce(); expect(onContextLost).toHaveBeenCalledOnce(); expect(h.frames.size).toBe(0);
    h.engine.dispose(); h.engine.dispose();
    calls.forEach(spy => expect(spy).toHaveBeenCalledOnce());
    expect(h.renderer.dispose).toHaveBeenCalledOnce();
    expect(h.canvasListeners.size).toBe(0); expect(h.documentListeners.size).toBe(0);
  });
  it('renders only installed hardware and ties bubbles and status lights to actual output', () => {
    const onSelectEquipment=vi.fn();
    const h=harness({paused:true,fish:[resident('neon')],model:{daylight:true},equipment:{filter:{installed:true,on:true,type:'Sponge Filter',intensity:.7},aerator:{installed:true,on:true,intensity:.5},heater:{installed:false},light:{installed:false}},onSelectEquipment});
    expect(h.root('equipment').children.map(group=>group.userData.equipmentId).sort()).toEqual(['airPump','filter']);
    const bubbles=h.renderer.scene.getObjectByName('aeration-bubbles');
    expect(bubbles.visible).toBe(true);expect(bubbles.children.filter(particle=>particle.visible)).toHaveLength(7);
    const body=h.root('residents').children[0];
    h.engine.setView('front');h.flush();
    const hardware=h.root('equipment').getObjectByName('equipment-filter').children[0],point=h.point(hardware);
    h.event('pointerdown',point);h.event('pointerup',point);expect(onSelectEquipment).toHaveBeenCalledWith('filter');
    h.update({equipment:{filter:{installed:true,on:true,type:'Sponge Filter',intensity:.7},aerator:{installed:true,on:false,intensity:1},light:{installed:false}}});h.flush();
    expect(bubbles.visible).toBe(false);expect(h.root('residents').children[0]).toBe(body);
    h.update({appearance:{showEquipment:false}});h.flush();expect(h.root('equipment').visible).toBe(false);
    h.event('pointerdown',point);h.event('pointerup',point);expect(onSelectEquipment).toHaveBeenCalledTimes(1);
  });

  it('shows algae film only from the modeled algae index and clears it after cleaning', () => {
    const h=harness({paused:true,algaeLevel:0});
    const film=h.renderer.scene.getObjectByName('modeled-algae-film'),glass=film.children[0];
    expect(film.visible).toBe(false);
    h.update({algaeLevel:60});h.flush();
    expect(film.visible).toBe(true);expect(glass.material.opacity).toBeGreaterThan(.2);
    const opacity=glass.material.opacity;
    h.update({algaeLevel:90});h.flush();expect(glass.material.opacity).toBeGreaterThan(opacity);
    h.update({algaeLevel:0});h.flush();expect(film.visible).toBe(false);expect(glass.material.opacity).toBe(0);
    expect(h.root('residents').children).toHaveLength(0);expect(h.root('plants').children).toHaveLength(0);
  });

  it('applies actual visual settings and room-light phase without changing stock or modeled state', () => {
    const fish=resident('neon'),h=harness({paused:true,fish:[fish],model:{daylight:true},equipment:{light:{installed:false}}});
    const old=h.root('residents').children[0],beforeSize=new realThree.Box3().setFromObject(old).getSize(new realThree.Vector3());
    const sand=h.root('vessel').children.find(node=>node.geometry?.parameters?.width===11.9&&node.geometry?.parameters?.height===.3);
    h.update({appearance:{substrate:'dark',backdrop:'black',quality:'low',animalScale:1.3,lightIntensity:.7}});h.flush();
    expect(h.renderer.pixelRatio).toBe(1);expect(sand.material.color.getHex()).toBe(0x464e4a);
    const after=h.root('residents').children[0],afterSize=new realThree.Box3().setFromObject(after).getSize(new realThree.Vector3());
    expect(afterSize.x).toBeGreaterThan(beforeSize.x*1.2);expect(after.userData.fishInstanceId).toBe(old.userData.fishInstanceId);
    expect(h.root('residents').children).toHaveLength(1);
    expect(h.root('environment').userData.lightActive).toBe(true);
    h.update({model:{daylight:false}});h.flush();
    expect(h.root('environment').userData.lightActive).toBe(false);expect(sand.material.color.getHex()).toBe(0x464e4a);
    expect(h.root('residents').children[0]).toBe(after);
  });

  it('uses true plant growth ratio including zero, and distinguishes morphology', () => {
    const h=harness({paused:true,plants:[{id:'moss',morphology:'moss',biomassRatio:0,biomass:0,health:80},{id:'fern',morphology:'fern',biomassRatio:.125,health:80}]});
    const zero=h.root('plants').children[0],small=h.root('plants').children[1];
    expect(zero.visible).toBe(false);expect(zero.children).toHaveLength(0);expect(zero.userData.biomassRatio).toBe(0);
    expect(small.userData.morphology).toBe('fern');expect(small.scale.x).toBeCloseTo(.5);
    h.update({plants:[{id:'moss',morphology:'moss',biomassRatio:1,health:80},{id:'fern',morphology:'fern',biomassRatio:1,health:80}]});h.flush();
    expect(h.root('plants').children[0].visible).toBe(true);expect(h.root('plants').children[0].userData.morphology).toBe('moss');
    expect(h.root('plants').children[1].scale.x).toBe(1);expect(h.root('plants').children).toHaveLength(2);
  });

  it('forms schools only from real eligible conspecifics and retains individual identities', () => {
    const fish=[{...resident('neon',0),schooling:true,schoolGroup:'community'},{...resident('neon',1),schooling:true,schoolGroup:'community'},{...resident('guppy',2),schooling:true,schoolGroup:'community'},{...resident('neon',3),schooling:false,schoolGroup:'community'}];
    const h=harness({paused:true,fish}),groups=h.root('residents').children.slice();
    expect(groups.map(group=>group.userData.schoolSize)).toEqual([2,2,0,0]);
    expect(groups[0].userData.schoolId).toBe(groups[1].userData.schoolId);
    const phase=groups[0].userData.phase;
    h.update({fish:fish.slice().reverse()});h.flush();
    expect(h.root('residents').children).toHaveLength(4);expect(h.root('residents').children.find(group=>group.userData.fishInstanceId==='neon-0')).toBe(groups[0]);
    expect(groups[0].userData.phase).toBe(phase);
    h.update({fish:fish.filter(item=>item.instanceId!=='neon-1')});h.flush();
    expect(groups[0].userData.schoolSize).toBe(0);
  });

  it('animates only newly observed feeding events and attracts only actual accepted residents', () => {
    const fish=[{...resident('neon'),hunger:90},{...resident('guppy',1),hunger:90}];
    const oldEvent={eventId:'saved-feed',foodType:'flake',ageHours:0,acceptedIds:['neon-0']};
    const h=harness({paused:true,fish,feeding:oldEvent}),food=h.root('food');
    expect(food.visible).toBe(false);expect(food.children).toHaveLength(0);
    const event={...oldEvent,eventId:'new-feed'};
    h.update({feeding:event});h.flush();
    expect(food.visible).toBe(true);expect(food.children).toHaveLength(12);
    const neon=h.root('residents').children[0],guppy=h.root('residents').children[1];
    expect(neon.userData.foodInterest).toBeGreaterThan(0);expect(guppy.userData.foodInterest).toBe(0);
    expect(h.frames.size).toBe(0);
    h.update({paused:false});for(let i=0;i<275;i++)h.flush(40);
    expect(food.visible).toBe(false);
    h.update({paused:true,appearance:{backdrop:'black'},feeding:event});h.flush();
    expect(food.visible).toBe(false);
    h.update({feeding:{eventId:'hospital-feed',scope:'hospital',ageHours:0,acceptedIds:['neon-0']}});h.flush();expect(food.visible).toBe(false);
    const remount=harness({paused:true,fish,feeding:event});expect(remount.root('food').visible).toBe(false);
  });

  it('uses biological identity rather than custom display names for body shape and locomotion', () => {
    const fish={...resident('guppy'),name:'Coral'},h=harness({paused:true,fish:[fish]});
    const original=h.root('residents').children[0],size=new realThree.Box3().setFromObject(original).getSize(new realThree.Vector3());
    expect(original.userData.shape).toBe('guppy');expect(original.userData.stationary).toBe(false);
    h.update({fish:[{...fish,name:'Shrimp',color:'#d98048'}]});h.flush();
    const renamed=h.root('residents').children[0],nextSize=new realThree.Box3().setFromObject(renamed).getSize(new realThree.Vector3());
    expect(renamed.userData.shape).toBe('guppy');expect(renamed.userData.stationary).toBe(false);
    expect(renamed.userData.fishInstanceId).toBe(original.userData.fishInstanceId);
    expect(nextSize.x).toBeCloseTo(size.x);expect(nextSize.y).toBeCloseTo(size.y);expect(nextSize.z).toBeCloseTo(size.z);
    const box=new realThree.Box3().setFromObject(renamed);
    expect(box.min.x).toBeGreaterThan(-6);expect(box.max.x).toBeLessThan(6);
    expect(box.min.z).toBeGreaterThan(-3.3);expect(box.max.z).toBeLessThan(3.3);
  });

  it('distinguishes cucumber and copepod bodies and honors explicit locomotion within tank bounds', () => {
    const fish=[
      {...resident('seacucumber',0),bodyPlan:'echinoderm',organismType:'Echinoderm',zone:'bottom',locomotion:'crawl'},
      {...resident('copepods',1),organismType:'Microcrustacean colony',zone:'mid',locomotion:'swim'},
      {...resident('urchin',2),bodyPlan:'echinoderm',organismType:'Echinoderm',zone:'bottom',locomotion:'crawl'},
      {...resident('shrimp',3),bodyPlan:'crustacean',organismType:'Crustacean',zone:'mid',locomotion:'swim'},
      {...resident('stonycoral',4),organismType:'Cnidarian colony',zone:'bottom',locomotion:'sessile'}
    ];
    const h=harness({fish}),groups=h.root('residents').children;
    expect(groups.map(group=>group.userData.shape)).toEqual(['seacucumber','copepod','urchin','shrimp','coral']);
    expect(groups.map(group=>group.userData.stationary)).toEqual([false,false,false,false,true]);
    expect(groups.map(group=>group.userData.bottom)).toEqual([true,false,true,false,true]);
    expect(groups[1].position.y).toBeGreaterThan(1.5);expect(groups[3].position.y).toBeGreaterThan(1.5);
    const positions=groups.map(group=>group.position.clone());
    for(let frame=0;frame<160;frame++){
      h.flush(40);
      groups.forEach(group=>{
        const box=new realThree.Box3().setFromObject(group);
        expect(box.min.x).toBeGreaterThan(-6);expect(box.max.x).toBeLessThan(6);
        expect(box.min.z).toBeGreaterThan(-3.3);expect(box.max.z).toBeLessThan(3.3);
        expect(box.min.y).toBeGreaterThan(0);expect(box.max.y).toBeLessThan(5.2);
      });
    }
    expect(groups[1].position.equals(positions[1])).toBe(false);
    expect(groups[4].position.equals(positions[4])).toBe(true);
    expect(h.root('residents').children).toHaveLength(fish.length);
    h.update({paused:true,fish:fish.map(item=>({...item,locomotion:undefined}))});h.flush();
    expect(groups.map(group=>group.userData.locomotion)).toEqual(['crawl','swim','crawl','crawl','sessile']);
  });

  it('uses supplied room-light output without inventing a fixture or changing legacy defaults', () => {
    const h=harness({paused:true,model:{daylight:true},equipment:{light:{installed:false,intensity:1}}});
    const keyLight=h.renderer.scene.children.find(node=>node.isDirectionalLight&&node.position.y===10);
    const full=keyLight.intensity;
    h.update({equipment:{light:{installed:false,intensity:.5}}});h.flush();
    expect(keyLight.intensity).toBeCloseTo(full*.5);
    expect(h.root('environment').userData.lightOutput).toBe(.5);
    expect(h.root('equipment').children).toHaveLength(0);
    h.update({equipment:{light:{installed:false,output:.25}}});h.flush();
    expect(keyLight.intensity).toBeCloseTo(full*.25);
    h.update({equipment:{light:{installed:false}}});h.flush();
    expect(keyLight.intensity).toBeCloseTo(full);
  });

});
