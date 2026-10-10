import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_firstresponse.js','utf8'), THREE = {};
new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(THREE,{exports:THREE});
const scenes = [], ageInfo = { adult: { scale:1, hand:1, maximum:7, chest:18, reference:5.5 }, child: { scale:.72, hand:.88, maximum:6.5, chest:15, reference:5 }, infant: { scale:.46, hand:.76, maximum:5.5, chest:12, reference:4 } };
let build, previous;
beforeAll(() => {
  previous = window.StemLab;
  window.StemLab = { isRegistered: () => false,
    makeBayViewer(config) { build = config.buildScene; return { attach() {},sync() {},reset() {},nudge() {},zoom() {},status: () => 'failed' }; }, registerTool() {} };
  new Function(source)();
});
afterEach(() => {
  const geometries = new Set(), materials = new Set();
  for (const scene of scenes.splice(0)) scene.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) materials.add(material);
  });
  for (const geometry of geometries) geometry.dispose(); for (const material of materials) material.dispose();
});
afterAll(() => { window.StemLab = previous; });

function model(age, contrast = false, tab = 'depth') {
  const scene = new THREE.Scene(); scenes.push(scene);
  const content = build(THREE,{ scene,phase:0,dark:true,contrast,wantShadow:false,trim:color=>new THREE.MeshPhongMaterial({color}),sceneProps:{ age,tab } });
  return { scene, sample(settings = {}, childHands = 'one', saved = null) {
    content.frame(0,{ depthLab:{ age,motion:'inspect',phase:0,depth:ageInfo[age].reference,lean:0,measure:true,...settings },childHands,depthReference:saved },true);
    scene.updateMatrixWorld(true); return scene;
  } };
}
function object(scene,name) { const found = scene.getObjectByName(name); expect(found,name).toBeTruthy(); return found; }
const bounds = mesh => new THREE.Box3().setFromObject(mesh);

describe('First Response resting reference clearance', () => {
  it.each(Object.keys(ageInfo).flatMap(age => [false,true].map(contrast => [age,contrast])))('clears the %s hands and torso throughout compression (contrast %s)', (age,contrast) => {
    const info = ageInfo[age], run = model(age,contrast), scene = run.sample(), rest = object(scene,'fr-depth-resting-line');
    expect(rest.isGroup).toBe(true); expect(rest.children).toHaveLength(2);
    const left = object(scene,'fr-depth-resting-left'), right = object(scene,'fr-depth-resting-right');
    const recorded = [rest,left,right].map(part => ({ part,matrix:part.matrix.toArray(),geometry:part.geometry }));
    const settings = [{depth:0,lean:0},{depth:info.maximum,lean:0},{depth:info.maximum,lean:1.5},{depth:info.maximum,lean:info.maximum}];
    for (const childHands of ['one','two']) for (const value of settings) for (const phase of [0,25,50,75,100]) {
      run.sample({...value,phase},childHands);
      const a = bounds(left), b = bounds(right);
      // This includes hidden upper-hand meshes, fingers, wrists and arms, so
      // the gap stays valid when a learner changes the child hand arrangement.
      const occupied = bounds(object(scene,'fr-depth-hands')).union(bounds(object(scene,'fr-manikin-torso')));
      expect(occupied.min.x-a.max.x,'left reference clears all surfaces').toBeGreaterThan(.04*info.hand);
      expect(b.min.x-occupied.max.x,'right reference clears all surfaces').toBeGreaterThan(.04*info.hand);
      expect(a.max.x-a.min.x,'visible left reference segment').toBeGreaterThan(.04*info.scale);
      expect(b.max.x-b.min.x,'visible right reference segment').toBeGreaterThan(.04*info.scale);
      expect(a.min.x).toBeCloseTo(-.825*info.scale,6); expect(b.max.x).toBeCloseTo(.825*info.scale,6);
      expect(rest.position.y,'rest reference never follows compression').toBeCloseTo(.55*info.scale,8);
      for (const record of recorded) {
        expect(record.part.matrix.toArray()).toEqual(record.matrix); expect(record.part.geometry).toBe(record.geometry);
      }
    }
    run.sample({hands:false}); expect(rest.parent.visible).toBe(true);
    expect(object(scene,'fr-depth-hands').visible).toBe(false);
    for (const part of [left,right]) {
      expect(part.material.depthTest).toBe(true); expect(part.material.depthWrite).toBe(true);
      expect(part.material.color.getHexString()).toBe(contrast?'ffffff':'5eead4');
      expect(part.userData.partId).toBeUndefined();
    }
  });

  it.each(Object.keys(ageInfo))('preserves %s rest, current, reference and travel coordinates', age => {
    const info = ageInfo[age], run = model(age), scene = run.sample(), rest = object(scene,'fr-depth-resting-line');
    const marker = object(scene,'fr-depth-marker'), reference = object(scene,'fr-depth-reference');
    const release = object(scene,'fr-depth-travel-release'), peak = object(scene,'fr-depth-travel-peak'), travel = object(scene,'fr-depth-travel');
    const cmWorld = .5*info.scale/info.chest, depth = info.maximum, lean = 1;
    for (const phase of [0,50,100]) {
      run.sample({depth,lean,phase});
      const expected = (phase===50?depth:lean)*cmWorld;
      expect(marker.position.y).toBeCloseTo(rest.position.y-expected,8);
      expect(reference.position.y).toBeCloseTo(rest.position.y-info.reference*cmWorld,8);
      expect(release.position.y).toBeCloseTo(rest.position.y-lean*cmWorld,8);
      expect(peak.position.y).toBeCloseTo(rest.position.y-depth*cmWorld,8);
      expect(travel.scale.y).toBeCloseTo((depth-lean)*cmWorld,8);
      for (const part of [marker,reference]) { expect(part.position.x).toBeCloseTo(-.82*info.scale,8); expect(part.position.z).toBeCloseTo(-.18*info.scale,8); }
    }
    const positions = scene.getObjectByName('fr-depth-measure').children.filter(part => Number.isFinite(part.userData.centimetres));
    expect(positions.length).toBe(Math.floor(info.maximum)+1);
    for (const tick of positions) expect(tick.position.y).toBeCloseTo(rest.position.y-tick.userData.centimetres*cmWorld,8);
  });

  it.each(['place','coach','recovery'])('keeps the depth-only reference hidden in %s', tab => {
    const run = model('adult',false,tab), scene = run.sample();
    expect(object(scene,'fr-depth-resting-line').parent.visible).toBe(false);
  });
});
