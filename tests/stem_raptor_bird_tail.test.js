import {describe, it, expect, vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';

const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const baseline = require('./fixtures/raptor-bird-tail-before.cjs');
const beforeTail = Function('THREE', 'return (' + baseline.tailFactorySource + ');')(THREE);
const source = readFileSync('stem_lab/stem_tool_raptorhunt.js', 'utf8');
const ids = ['pigeon', 'mourningDove', 'songbird', 'shorebird', 'duck', 'waterfowl', 'grouse', 'ptarmigan', 'smallOwl'];
function body(name) {
  const start = source.indexOf('function ' + name + '(');
  if (start < 0) throw Error('Missing helper ' + name);
  let end = source.indexOf('{', start), depth = 1;
  while (depth) { end++; if (end >= source.length) throw Error('Unclosed helper ' + name); if (source[end] === '{') depth++; if (source[end] === '}') depth--; }
  return source.slice(start, end + 1);
}
const names = ['preyBirdPalette', 'createPreyBirdBodyGeometry', 'createPreyWingGeometry', 'createPreyTailGeometry', 'preyKindFor',
  'mergeGroundPreyParts', 'buildGroundPreyParts', 'buildMammalPreyParts', 'buildRainforestPreyParts',
  'bendFishPreyGeometry', 'createFishBodyGeometry', 'createFishFinGeometry', 'buildPreyVisual', 'advancePreyVisualPose', 'setGroundPreyLegPose',
  'advanceBirdPreyHead', 'applyBirdPreyHeadPose'];
const api = Function('THREE', names.map(body).join('\n') + ';return {palette:preyBirdPalette,tail:createPreyTailGeometry,build:buildPreyVisual,advance:advancePreyVisualPose,legPose:setGroundPreyLegPose};')(THREE);
const transformStart = source.indexOf('else pm2.animation.wings.forEach(function(wing, wingIndex) {');
const transformEnd = source.indexOf("if(pm2.animation.gait&&pm2.surfaceMode==='terrain')", transformStart);
if (transformStart < 0 || transformEnd < 0) throw Error('Missing production prey surface transforms');
const transform = Function('pm2', 'preyPose', 'motionPhase', '_rmFX', 'setGroundPreyLegPose', source.slice(transformStart + 5, transformEnd));
const make = (id, size = 1, speed = 2) => api.build({id, color:0x9ca3af, speedMps:speed}, size);
function meshes(model) { const result = []; model.root.traverse(object => { if (object.isMesh) result.push(object); }); return result; }
function resources(model) { const result = new Set(); meshes(model).forEach(mesh => { result.add(mesh.geometry); result.add(mesh.material); }); return result; }
function dispose(model) { resources(model).forEach(resource => resource.dispose()); }
function point(attribute, index) { return new THREE.Vector3().fromBufferAttribute(attribute, index); }
function blend(base, target, index, weight) { return point(base, index).lerp(point(target, index), weight); }
function bytes(attribute) { return Buffer.from(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength); }
function finite(attribute) { expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true); }
function render(model, dt = 1 / 60, reduced = false, vx = 0, vz = 2, height = 2, now = 0) {
  api.advance(model.pose, vx, vz, height, now, .7, false, dt, reduced);
  transform({animation:model}, model.pose, model.pose.phase, reduced, api.legPose);
}
function airborne(model) { model.pose.heading = 0; model.pose.spread = 1; model.pose.motionBlend = 1; return model; }
function beforeModel(id, size) {
  const model = make(id, size), geometry = model.tail.geometry;
  model.tail.geometry = beforeTail(size, api.palette(id)); model.tail.updateMorphTargets(); geometry.dispose();
  return model;
}
function bounds(model) { model.root.updateMatrixWorld(true); return new THREE.Box3().setFromObject(model.root); }
function carryScale(box) { const size = box.getSize(new THREE.Vector3()); return Math.min(1, .68 / Math.max(.01, size.x, size.y, size.z)); }
const carryFixture = Function('THREE', 'prey', 'observe', `
  var scene=new THREE.Scene(),talonGroup=new THREE.Group(),waterWakeGroup=new THREE.Group(),waterWakeEntries=[];
  scene.add(prey.mesh);var carriedPrey=null,studyBoundsDirty=false,motionNow=750,_rmFX=false,strikeFootExtension=0;
  var raptorFeet=[{morphTargetInfluences:[0]},{morphTargetInfluences:[0]}];
  var carriedPreyBounds=new THREE.Box3(),carriedPreySize=new THREE.Vector3(),carriedPreyCenter=new THREE.Vector3();
  var originalMeasure=carriedPreyBounds.setFromObject;
  carriedPreyBounds.setFromObject=function(object){observe(prey.animation);return originalMeasure.call(this,object);};
  ${body('advanceBirdPreyHead')}
  ${body('applyBirdPreyHeadPose')}
  ${body('clearCarriedPrey')}
  ${body('beginCarriedPrey')}
  return {begin:function(){beginCarriedPrey(prey);},clear:clearCarriedPrey,group:talonGroup,state:function(){return carriedPrey;},size:carriedPreySize};
`);
const preferenceFixture = Function('THREE', 'preys', `
  var _rmFX=false,studyBoundsDirty=false,starsList=null,gazeTarget=null,gazeState={yaw:.2,pitch:.1},headMesh=new THREE.Group(),tail=new THREE.Group();
  var raptor={landed:false,crashed:false,cameraRoll:.2,x:5,y:3,z:10},carriedPrey=null,strikeFootExtension=0;
  var raptorFeet=[{morphTargetInfluences:[.3]}],wingPose={fold:.3},preyMeshes=preys,waterWakeEntries=[];
  var vegetationWindState={x:1,z:1},vegetationWind={value:new THREE.Vector3(1,0,1)},speedLineMat={opacity:.3};
  var cameraTargetBlend=.3,cameraLateralLead=.2,studyActive=false,studySavedCamera=null,camera=new THREE.PerspectiveCamera();
  camera.position.set(0,0,5);var cameraRollAxis=new THREE.Vector3(),simPaused=true,motionNow=750,paintCalls=0;
  var diveVig=null,rainSystem={visible:true},snowSystem={visible:true},rainGeometry=new THREE.BufferGeometry(),snowGeometry=new THREE.BufferGeometry(),activePrecipitationCount=10;
  var STRIKE_FX_SLOT_COUNT=0,strikeFxSlotActive=[],strikeFxActiveCount=0,strikeContactActiveCount=0;
  var strikeFxPoints={visible:false},strikeContactMesh={visible:false,instanceMatrix:{needsUpdate:false}},strikeFxPositionAttribute={needsUpdate:false};
  function clearTouchdownFx(){}function hideStrikeFxSlot(){}function updateCarriedPrey(){}function updateTargetFeedback(){}
  function repaintPausedFlight(){paintCalls++;}function updateFlightFov(){}function updateBirdPreyHead(){}
  ${body('onReducedMotionChange')}
  return {change:function(matches){onReducedMotionChange({matches:matches});},state:function(){return {reduced:_rmFX,paused:simPaused,time:motionNow,paintCalls:paintCalls};}};
`);

describe('Bird tail gathering geometry', () => {
  it('preserves exact pass24 neutral buffers, bounds, clearance and folded carry scale for every species at both sizes', {timeout:180000}, () => {
    expect(baseline.sourceSha256).toBe('5b5deb86330632cd874a75ac092483d382dd94408b1053dd736365d5dd084745');
    for (const id of ids) for (const size of [.75, 3.15]) {
      const palette = api.palette(id), current = api.tail(size, palette), before = beforeTail(size, palette);
      for (const key of ['position', 'normal', 'color']) expect(bytes(current.attributes[key])).toEqual(bytes(before.attributes[key]));
      expect(bytes(current.index)).toEqual(bytes(before.index));
      before.computeBoundingBox(); before.computeBoundingSphere();
      expect(current.boundingBox.min.toArray()).toEqual(before.boundingBox.min.toArray());
      expect(current.boundingBox.max.toArray()).toEqual(before.boundingBox.max.toArray());
      expect(current.boundingSphere.center.toArray()).toEqual(before.boundingSphere.center.toArray());
      expect(current.boundingSphere.radius).toBe(before.boundingSphere.radius);
      const a = make(id, size), b = beforeModel(id, size), boxA = bounds(a), boxB = bounds(b);
      expect(boxA.min.toArray()).toEqual(boxB.min.toArray()); expect(boxA.max.toArray()).toEqual(boxB.max.toArray());
      expect(carryScale(boxA)).toBe(carryScale(boxB)); expect(boxA.min.y).toBeCloseTo(-size * .3024, 6);
      current.dispose(); before.dispose(); dispose(a); dispose(b);
    }
  });

  it('pins the root and center feather while gathering mirrored, finite, nondegenerate fans inside the original surface bounds', {timeout:180000}, () => {
    for (const id of ids) for (const size of [.75, 3.15]) {
      const geometry = api.tail(size, api.palette(id)), base = geometry.attributes.position, target = geometry.morphAttributes.position[0];
      expect(base.count).toBe(19); expect(geometry.morphTargetsRelative).toBe(false);
      expect(geometry.morphAttributes.position).toHaveLength(1); expect(geometry.morphAttributes.normal).toHaveLength(1);
      finite(target); expect(point(target, 0).toArray()).toEqual(point(base, 0).toArray());
      for (const center of [5, 14]) expect(point(target, center).toArray()).toEqual(point(base, center).toArray());
      for (let vertex = 0; vertex < base.count; vertex++) {
        expect(target.getY(vertex)).toBe(base.getY(vertex)); expect(target.getZ(vertex)).toBe(base.getZ(vertex));
        expect(target.getX(vertex)).toBeCloseTo(base.getX(vertex) * .42, 6);
        for (const weight of [0, .125, .5, .875, 1]) {
          const p = blend(base, target, vertex, weight);
          expect(geometry.boundingBox.distanceToPoint(p)).toBeLessThan(size * 1e-6);
          expect(p.distanceTo(geometry.boundingSphere.center)).toBeLessThanOrEqual(geometry.boundingSphere.radius + size * 1e-6);
        }
      }
      for (const offset of [1, 10]) for (let i = 0; i <= 8; i++) {
        const a = offset + i, b = offset + 8 - i;
        expect(target.getX(a) + target.getX(b)).toBe(0); expect(target.getY(a)).toBe(target.getY(b)); expect(target.getZ(a)).toBe(target.getZ(b));
      }
      for (const weight of [0, .5, 1]) for (let i = 0; i < geometry.index.count; i += 3) {
        const a = blend(base, target, geometry.index.getX(i), weight), b = blend(base, target, geometry.index.getX(i + 1), weight), c = blend(base, target, geometry.index.getX(i + 2), weight);
        expect(b.sub(a).cross(c.sub(a)).length()).toBeGreaterThan(size * size * 1e-7);
      }
      geometry.dispose();
    }
  });

  it('uses recomputed unit normals and keeps the GPU normal blend aligned with the actual gathered surface', {timeout:180000}, () => {
    for (const id of ids) for (const size of [.75, 3.15]) {
      const geometry = api.tail(size, api.palette(id)), base = geometry.attributes.normal, target = geometry.morphAttributes.normal[0];
      const recomputed = new THREE.BufferGeometry(); recomputed.setIndex(geometry.index); recomputed.setAttribute('position', geometry.morphAttributes.position[0]); recomputed.computeVertexNormals();
      expect(bytes(target)).toEqual(bytes(recomputed.attributes.normal)); finite(target);
      let maximumChange = 0;
      for (const weight of [0, .25, .5, .75, 1]) {
        const actual = new THREE.BufferGeometry(), positions = new Float32Array(geometry.attributes.position.array.length);
        for (let vertex = 0; vertex < 19; vertex++) blend(geometry.attributes.position, geometry.morphAttributes.position[0], vertex, weight).toArray(positions, vertex * 3);
        actual.setIndex(geometry.index); actual.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); actual.computeVertexNormals();
        for (let vertex = 0; vertex < 19; vertex++) {
          expect(point(target, vertex).length()).toBeCloseTo(1, 5);
          const gpuNormal = blend(base, target, vertex, weight).normalize(), actualNormal = point(actual.attributes.normal, vertex);
          expect(gpuNormal.length()).toBeCloseTo(1, 10); expect(gpuNormal.y).toBeGreaterThan(.9);
          expect(gpuNormal.dot(actualNormal)).toBeGreaterThan(.99);
          maximumChange = Math.max(maximumChange, point(target, vertex).distanceTo(point(base, vertex)));
        }
        actual.dispose();
      }
      expect(maximumChange).toBeGreaterThan(.01); recomputed.dispose(); geometry.dispose();
    }
  });
});

describe('Responsive bird tail flight', () => {
  it('gathers during steady cruise and opens while turning, slowing, settling or stationary', {timeout:180000}, () => {
    for (const id of ids) {
      const straight = airborne(make(id)), turning = airborne(make(id)), slow = airborne(make(id));
      for (let frame = 0; frame < 240; frame++) { render(straight); render(turning); render(slow); }
      expect(straight.pose.tailGather).toBeGreaterThan(.81);
      for (let frame = 0; frame < 120; frame++) {
        const heading = (frame + 1) / 60 * 6.2;
        render(turning, 1 / 60, false, Math.sin(heading) * 2, Math.cos(heading) * 2);
        expect(turning.pose.tailGather).toBeGreaterThanOrEqual(0); expect(turning.pose.tailGather).toBeLessThanOrEqual(.82);
      }
      expect(turning.pose.tailGather).toBeLessThan(straight.pose.tailGather * .4);
      for (let frame = 0; frame < 18; frame++) render(slow, 1 / 60, false, 0, .5);
      expect(slow.pose.tailSpeed).toBeGreaterThan(.5); expect(slow.pose.tailGather).toBeLessThan(straight.pose.tailGather * .4);
      for (let frame = 0; frame < 240; frame++) { render(straight, 1 / 60, false, 0, 0); render(slow, 1 / 60, false, 0, 2, 0); }
      expect(straight.pose.tailGather).toBeLessThan(1e-8); expect(slow.pose.tailGather).toBeLessThan(1e-8);
      for (const model of [straight, turning, slow]) dispose(model);
    }
  });

  it('normalizes cruising gather to each bird speed and preserves phase, wing motion and tail rotation', () => {
    const slow = airborne(make('shorebird', 1, 2)), fast = airborne(make('shorebird', 1, 8));
    const reference = {...slow.pose}; delete reference.tailReferenceSpeed;
    for (let frame = 0; frame < 240; frame++) {
      render(slow, 1 / 60, false, 0, 2); render(fast, 1 / 60, false, 0, 2);
      api.advance(reference, 0, 2, 2, 0, .7, false, 1 / 60, false);
      for (const key of ['heading', 'bank', 'spread', 'phase', 'rate', 'wingAmplitude', 'motionBlend', 'wingAngle', 'wingFlex']) expect(slow.pose[key]).toBe(reference[key]);
      expect(slow.tail.rotation.z).toBeCloseTo(Math.sin(slow.pose.phase * .8) * .06 * slow.pose.spread, 12);
      expect(slow.tail.rotation.x).toBe(0); expect(slow.tail.rotation.y).toBe(0);
    }
    expect(slow.pose.tailGather).toBeCloseTo(.82, 8); expect(fast.pose.tailGather).toBeCloseTo(.205, 8);
    dispose(slow); dispose(fast);
  });

  it('keeps cruise and speed-change response consistent at 30, 60 and 120 Hz, freezes and gently resumes', () => {
    const results = [], speedChanges = [];
    for (const hz of [30, 60, 120]) {
      const model = airborne(make('shorebird'));
      for (let frame = 0; frame < hz; frame++) render(model, 1 / hz);
      expect(model.pose.tailGather).toBeCloseTo(.82 * (1 - Math.exp(-6)), 10);
      for (let frame = 0; frame < hz; frame++) render(model, 1 / hz, false, 0, .5);
      const slowed = model.pose.tailGather;
      for (let frame = 0; frame < hz; frame++) render(model, 1 / hz, false, 0, 2);
      speedChanges.push({slowed, recovered:model.pose.tailGather, speed:model.pose.tailSpeed});
      const phase = model.pose.phase, speed = model.pose.tailSpeed, gather = model.pose.tailGather;
      render(model, 0, false, 0, 2, 2, 90000);
      expect(model.pose.phase).toBe(phase); expect(model.pose.tailSpeed).toBe(speed); expect(model.pose.tailGather).toBe(gather);
      render(model, 30, true); expect(model.pose.phase).toBe(phase); expect(model.pose.tailGather).toBe(0); expect(model.pose.tailGatherResponse).toBe(0); expect(model.tail.morphTargetInfluences).toEqual([0]);
      render(model, 0, false, 0, 2, 2, 180000); expect(model.pose.tailGather).toBe(0); expect(model.pose.phase).toBe(phase);
      render(model, 1 / hz, false, 0, 2, 2, 180000 + 1000 / hz);
      expect(model.pose.tailGather).toBeGreaterThan(0); expect(model.pose.tailGather).toBeLessThan(.06);
      for (let frame = 1; frame < hz; frame++) render(model, 1 / hz);
      results.push({...model.pose}); dispose(model);
    }
    for (const key of ['phase', 'rate', 'wingAmplitude', 'motionBlend', 'wingAngle', 'wingFlex', 'tailSpeed', 'tailGather']) {
      expect(results[0][key]).toBeCloseTo(results[1][key], key === 'tailGather' ? 5 : 9);
      expect(results[0][key]).toBeCloseTo(results[2][key], key === 'tailGather' ? 5 : 9);
    }
    for (const key of ['slowed', 'recovered', 'speed']) {
      expect(speedChanges[0][key]).toBeCloseTo(speedChanges[1][key], key === 'speed' ? 9 : 2);
      expect(speedChanges[0][key]).toBeCloseTo(speedChanges[2][key], key === 'speed' ? 9 : 2);
    }
  });

  it('updates only retained tail weights without new geometry, normal recomputation or buffer writes', {timeout:180000}, () => {
    for (const id of ids) {
      const model = airborne(make(id)), before = resources(model), weights = model.tail.morphTargetInfluences;
      const records = meshes(model).map(mesh => ({mesh, geometry:mesh.geometry, material:mesh.material,
        attributes:[
          ...Object.keys(mesh.geometry.attributes).map(key => ({read:() => mesh.geometry.attributes[key], attribute:mesh.geometry.attributes[key]})),
          ...(mesh.geometry.index ? [{read:() => mesh.geometry.index, attribute:mesh.geometry.index}] : []),
          ...Object.entries(mesh.geometry.morphAttributes).flatMap(([kind, targets]) => targets.map((attribute, index) => ({read:() => mesh.geometry.morphAttributes[kind][index], attribute})))
        ].map(slot => ({...slot, array:slot.attribute.array, version:slot.attribute.version, digest:createHash('sha256').update(bytes(slot.attribute)).digest('hex')}))}));
      expect(meshes(model)).toHaveLength(5); expect(before.size).toBe(9); expect(new Set(meshes(model).map(mesh => mesh.material)).size).toBe(4);
      expect(model.tail.material.morphTargets).toBe(true); expect(model.tail.material.morphNormals).toBe(true);
      const normalSpy = vi.spyOn(THREE.BufferGeometry.prototype, 'computeVertexNormals'), attributeSpy = vi.spyOn(THREE.BufferGeometry.prototype, 'setAttribute');
      let replacedWeightFrames = 0, mismatchedWeightFrames = 0, invalidWeightFrames = 0;
      try {
        for (let frame = 0; frame < 360; frame++) {
          const heading = frame < 120 ? 0 : (frame - 120) / 60, speed = frame < 240 ? 2 : .5;
          render(model, 1 / 60, frame >= 300 && frame < 330, Math.sin(heading) * speed, Math.cos(heading) * speed);
          // Check every production frame, then report failures once per species.
          // Repeated assertion machinery and deep Buffer diffs dominate this
          // retained-resource check on a heavily contended host.
          const currentWeights = model.tail.morphTargetInfluences;
          if (currentWeights !== weights) replacedWeightFrames++;
          if (currentWeights[0] !== model.pose.tailGather) mismatchedWeightFrames++;
          if (!Number.isFinite(currentWeights[0]) || currentWeights[0] < 0 || currentWeights[0] > .82) invalidWeightFrames++;
        }
        expect(replacedWeightFrames, id + ' replaced the retained tail weight array').toBe(0);
        expect(mismatchedWeightFrames, id + ' disagreed with the rendered tail pose').toBe(0);
        expect(invalidWeightFrames, id + ' rendered an invalid tail weight').toBe(0);
        expect(normalSpy).not.toHaveBeenCalled(); expect(attributeSpy).not.toHaveBeenCalled();
      } finally { normalSpy.mockRestore(); attributeSpy.mockRestore(); }
      expect(resources(model)).toEqual(before);
      for (const record of records) {
        expect(record.mesh.geometry).toBe(record.geometry); expect(record.mesh.material).toBe(record.material);
        for (const saved of record.attributes) {
          expect(saved.read()).toBe(saved.attribute); expect(saved.attribute.array).toBe(saved.array); expect(saved.attribute.version).toBe(saved.version);
          expect(createHash('sha256').update(bytes(saved.attribute)).digest('hex')).toBe(saved.digest);
        }
      }
      dispose(model);
    }
  });

  it('neutralizes gathered tails in the actual paused reduced-motion handler without changing phase or water draft', () => {
    const models = [airborne(make('shorebird')), airborne(make('duck'))];
    const preys = models.map((model, index) => ({animation:model, visual:model.root, surfaceMode:index ? 'water-surface' : 'terrain', data:{speedMps:2}, bobPhase:.7}));
    models.forEach(model => { for (let frame = 0; frame < 120; frame++) render(model); model.float.offset = -.15; model.root.position.y = .2; });
    const frozen = models.map(model => ({phase:model.pose.phase, spread:model.pose.spread, rate:model.pose.rate, amplitude:model.pose.wingAmplitude})), fixture = preferenceFixture(THREE, preys);
    expect(models.every(model => model.tail.morphTargetInfluences[0] > .8)).toBe(true);
    fixture.change(true); expect(fixture.state()).toEqual({reduced:true, paused:true, time:750, paintCalls:1});
    for (const [index, model] of models.entries()) {
      expect({phase:model.pose.phase, spread:model.pose.spread, rate:model.pose.rate, amplitude:model.pose.wingAmplitude}).toEqual(frozen[index]);
      expect(model.pose.tailGather).toBe(0); expect(model.pose.tailGatherResponse).toBe(0); expect(model.pose.tailSpeed).toBeNull(); expect(model.tail.morphTargetInfluences).toEqual([0]);
      expect(model.root.position.y).toBe(index ? -.15 : 0); expect(model.float.offset).toBe(-.15);
    }
    fixture.change(false); expect(fixture.state().time).toBe(750); expect(fixture.state().paused).toBe(true);
    for (const model of models) { expect(model.tail.morphTargetInfluences).toEqual([0]); render(model); expect(model.pose.tailGather).toBeGreaterThan(0); expect(model.pose.tailGather).toBeLessThan(.02); dispose(model); }
  });
});

describe('Bird tail catching and rendering isolation', () => {
  it('opens gathered tails before native carry bounds are measured, preserves exact carry scale and disposes resources once', {timeout:180000}, () => {
    for (const id of ids) for (const size of [.75, 3.15]) {
      const model = airborne(make(id, size)), reference = beforeModel(id, size), neutral = bounds(reference), expectedScale = carryScale(neutral), before = resources(model), disposals = new Map();
      dispose(reference);
      before.forEach(resource => { disposals.set(resource, 0); resource.addEventListener('dispose', () => disposals.set(resource, disposals.get(resource) + 1)); });
      for (let frame = 0; frame < 120; frame++) render(model);
      expect(model.tail.morphTargetInfluences[0]).toBeGreaterThan(.8); model.tail.rotation.set(.2, -.3, .1);
      const phase = model.pose.phase, mesh = new THREE.Group(); mesh.add(model.root); mesh.position.set(4, 2, 8); mesh.rotation.set(.3, .8, .2); model.root.rotation.set(.2, .4, -.1, 'YXZ');
      const prey = {mesh, visual:model.root, animation:model, data:{id, speedMps:2}, groundClearance:0, bobPhase:.7}; let measures = 0;
      const fixture = carryFixture(THREE, prey, animation => {
        measures++; expect(animation).toBe(model); expect(model.pose.phase).toBe(phase); expect(model.pose.tailGather).toBe(0); expect(model.pose.tailGatherResponse).toBe(0); expect(model.pose.tailSpeed).toBeNull();
        expect(model.tail.morphTargetInfluences).toEqual([0]); expect(model.tail.rotation.toArray().slice(0, 3)).toEqual([0, 0, 0]);
        expect(model.wings.map(wing => wing.morphTargetInfluences)).toEqual([[0, 0], [0, 0]]);
      });
      fixture.begin(); expect(measures).toBe(1); expect(mesh.parent).toBe(fixture.group); expect(fixture.state().materials).toHaveLength(4);
      expect(fixture.size.toArray()).toEqual(neutral.getSize(new THREE.Vector3()).toArray()); expect(mesh.scale.toArray()).toEqual([expectedScale, expectedScale, expectedScale]); expect(resources(model)).toEqual(before);
      fixture.clear(); fixture.clear(); expect(mesh.parent).toBeNull(); expect(Array.from(disposals.values())).toEqual(Array(9).fill(1));
    }
  });

  it('preserves the exact legacy tail factory and leaves other prey on their own rendering paths', () => {
    const legacy = api.tail(2), reference = beforeTail(2);
    for (const key of ['position', 'normal']) expect(bytes(legacy.attributes[key])).toEqual(bytes(reference.attributes[key]));
    expect(bytes(legacy.index)).toEqual(bytes(reference.index)); expect(legacy.attributes.color).toBeUndefined(); expect(legacy.morphAttributes.position).toBeUndefined(); expect(legacy.morphAttributes.normal).toBeUndefined();
    legacy.dispose(); reference.dispose();
    for (const id of ['rodent', 'rabbit', 'fox', 'coati', 'fish']) {
      const model = make(id); expect(model.kind).not.toBe('bird'); expect(model.pose.tailReferenceSpeed).toBe(0); expect(model.pose.tailGather).toBe(0);
      render(model); expect(model.pose.tailGather).toBe(0);
      for (const mesh of meshes(model)) if (model.kind !== 'fish') expect(mesh.geometry.morphAttributes.position).toBeUndefined();
      dispose(model);
    }
  });
});
