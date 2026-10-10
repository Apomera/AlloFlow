import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_firstresponse.js', 'utf8');
const THREE = {};
new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
const scenes = [];
let build, previous;
beforeAll(() => {
  previous = window.StemLab;
  window.StemLab = { _registry: {}, isRegistered: () => false,
    makeBayViewer(config) { build = config.buildScene; return { attach() {}, sync() {}, nudge() {}, zoom() {}, reset() {}, status: () => 'failed' }; },
    registerTool(id, config) { this._registry[id] = config; } };
  new Function(source)();
});
afterEach(() => {
  const geometries = new Set(), materials = new Set();
  for (const scene of scenes.splice(0)) scene.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) materials.add(material);
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
});
afterAll(() => { window.StemLab = previous; });

function model(age, tab = 'depth', contrast = false) {
  const scene = new THREE.Scene(); scenes.push(scene);
  const content = build(THREE, { scene, phase: 0, dark: true, contrast, wantShadow: false,
    trim: color => new THREE.MeshPhongMaterial({ color }), sceneProps: { age, tab, childHands: 'two' } });
  return { scene, sample(values = {}, reduced = true) {
    content.frame(0, { childHands: 'two', placed: 'correct', depthLab: { age, motion: 'release', lean: 0 }, ...values }, reduced);
    scene.updateMatrixWorld(true); return scene;
  } };
}
const position = object => object.getWorldPosition(new THREE.Vector3());
const endpoint = (mesh, side) => new THREE.Vector3(0, side * mesh.geometry.parameters.height / 2, 0).applyMatrix4(mesh.matrixWorld);
const horizontal = vector => vector.setY(0).normalize();
function hand(scene, id) {
  const prefix = 'fr-rescuer-' + id, group = scene.getObjectByName(prefix);
  const heel = group.getObjectByName(prefix + '-heel'), forearm = group.getObjectByName(prefix + '-forearm');
  const tips = [0,1,2,3].map(i => position(group.getObjectByName(prefix + '-finger-' + i + '-tip')));
  const forward = horizontal(tips.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(.25).sub(position(heel)));
  const thumb = horizontal(position(group.getObjectByName(prefix + '-thumb-tip')).sub(position(heel)));
  thumb.addScaledVector(forward, -thumb.dot(forward)).normalize();
  return { group, heel, forearm, upper: group.getObjectByName(prefix + '-upper-arm'),
    bridge: group.getObjectByName(prefix + '-wrist-bridge'), forward, thumb, wrist: endpoint(forearm, -1) };
}
function assertArm(arm) {
  const elbow = endpoint(arm.forearm, 1), shoulder = endpoint(arm.upper, 1);
  expect(elbow.distanceTo(endpoint(arm.upper, -1)), 'connected elbow').toBeLessThan(1e-7);
  const foreAxis = elbow.clone().sub(arm.wrist).normalize(), upperAxis = shoulder.clone().sub(elbow).normalize();
  expect(foreAxis.dot(upperAxis), 'locked elbow').toBeGreaterThan(.99999);
  expect(foreAxis.y, 'arm remains nearly upright').toBeGreaterThan(.96);
  expect(arm.bridge.worldToLocal(arm.wrist.clone()).lengthSq(), 'wrist connects inside the bridge').toBeLessThan(1);
}
function assertChestContact(scene) {
  const heel = scene.getObjectByName('fr-rescuer-lower-heel'), center = position(heel);
  const hit = new THREE.Raycaster(new THREE.Vector3(center.x, center.y + 1, center.z), new THREE.Vector3(0,-1,0))
    .intersectObject(scene.getObjectByName('fr-manikin-torso'), false)[0];
  expect(hit, 'heel has a torso surface below it').toBeTruthy();
  expect(center.y - heel.getWorldScale(new THREE.Vector3()).y).toBeCloseTo(hit.point.y, 6);
}
function supportMetrics(lower, upper) {
  const surfaces = ['palm','heel','wrist-bridge'].map(part => lower.group.getObjectByName(lower.group.name + '-' + part));
  const ray = new THREE.Raycaster(), down = new THREE.Vector3(0,-1,0), up = new THREE.Vector3(0,1,0);
  const geometry = upper.heel.geometry, p = geometry.attributes.position, indices = geometry.index.array;
  const points = Array.from({ length: p.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(p, i));
  for (let i = 0; i < indices.length; i += 3) {
    points.push(new THREE.Vector3().fromBufferAttribute(p,indices[i]).add(new THREE.Vector3().fromBufferAttribute(p,indices[i+1]))
      .add(new THREE.Vector3().fromBufferAttribute(p,indices[i+2])).multiplyScalar(1/3));
  }
  let minimum = Infinity, samples = 0;
  for (const local of points) {
    if (local.y > 0) continue;
    const point = local.clone().applyMatrix4(upper.heel.matrixWorld);
    ray.set(new THREE.Vector3(point.x, point.y + 1, point.z), down);
    const hit = ray.intersectObjects(surfaces, false)[0];
    if (hit) { minimum = Math.min(minimum, point.y - hit.point.y); samples++; }
  }
  // Independent footprint grid tests the rendered triangles between vertices.
  const box = new THREE.Box3().setFromObject(upper.heel);
  let gridMinimum = Infinity, gridSamples = 0;
  for (let x = 0; x < 29; x++) for (let z = 0; z < 31; z++) {
    const px = box.min.x + (x + .371) / 29 * (box.max.x - box.min.x);
    const pz = box.min.z + (z + .219) / 31 * (box.max.z - box.min.z);
    ray.set(new THREE.Vector3(px, box.min.y - 1, pz), up);
    const underside = ray.intersectObject(upper.heel, false)[0];
    if (!underside) continue;
    ray.set(new THREE.Vector3(px, box.max.y + 1, pz), down);
    const surface = ray.intersectObjects(surfaces, false)[0];
    if (surface) { gridMinimum = Math.min(gridMinimum, underside.point.y - surface.point.y); gridSamples++; }
  }
  return { minimum, samples, gridMinimum, gridSamples };
}
function vertices(mesh) {
  const p = mesh.geometry.attributes.position;
  return Array.from({ length: p.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld));
}
function section(mesh, points, y, lateral) {
  const indices = mesh.geometry.index.array; let min = Infinity, max = -Infinity;
  for (let i = 0; i < indices.length; i += 3) for (const [a,b] of [[indices[i],indices[i+1]],[indices[i+1],indices[i+2]],[indices[i+2],indices[i]]]) {
    const start = points[a], end = points[b], dy = end.y - start.y;
    if (Math.abs(dy) < 1e-10) continue;
    const t = (y - start.y) / dy; if (t < 0 || t > 1) continue;
    const value = start.clone().lerp(end, t).dot(lateral); min = Math.min(min, value); max = Math.max(max, value);
  }
  return { min, max };
}
function assertNoArmOverlap(lower, upper) {
  const lateral = horizontal(upper.wrist.clone().sub(lower.wrist));
  for (const part of ['forearm','upper']) {
    const a = lower[part], b = upper[part], av = vertices(a), bv = vertices(b);
    const ab = new THREE.Box3().setFromObject(a), bb = new THREE.Box3().setFromObject(b);
    const start = Math.max(ab.min.y, bb.min.y), end = Math.min(ab.max.y, bb.max.y);
    for (let i = 1; i < 17; i++) {
      const y = start + (end - start) * i / 17;
      expect(section(b,bv,y,lateral).min - section(a,av,y,lateral).max, part + ' surfaces remain separate').toBeGreaterThan(.002);
    }
  }
  // Test the actual upper palm/heel/bridge against the lower arm and its wrist joint.
  const lowerParts = lower.group.children.filter(mesh => mesh.isMesh && (!mesh.name || /-(forearm|upper-arm)$/.test(mesh.name)));
  const upperParts = ['palm','heel','wrist-bridge'].map(part => upper.group.getObjectByName(upper.group.name + '-' + part));
  const ray = new THREE.Raycaster(), direction = new THREE.Vector3(1,.023,.019).normalize();
  for (const lowerPart of lowerParts) {
    const box = new THREE.Box3().setFromObject(lowerPart), originalSide = lowerPart.material.side;
    lowerPart.material.side = THREE.DoubleSide;
    try {
      for (const upperPart of upperParts) for (const point of vertices(upperPart)) {
        if (!box.containsPoint(point)) continue;
        ray.set(point,direction);
        const distances = ray.intersectObject(lowerPart,false).map(hit => hit.distance)
          .filter((distance,index,all) => !index || Math.abs(distance - all[index-1]) > 1e-7);
        expect(distances.length % 2, upperPart.name + ' inside lower ' + (lowerPart.name || 'wrist joint')).toBe(0);
      }
    } finally { lowerPart.material.side = originalSide; }
  }
}

describe('First Response hand alignment', () => {
  it.each(['adult','child'])('stacks the %s hands in the same direction with two separate wrists on one side', age => {
    const sample = model(age), scene = sample.sample(), lower = hand(scene,'lower'), upper = hand(scene,'upper');
    expect(lower.forward.dot(upper.forward)).toBeGreaterThan(.85);
    expect(lower.thumb.dot(upper.thumb), 'left and right thumbs remain on opposite sides').toBeLessThan(-.85);
    for (const arm of [lower,upper]) {
      const wristSide = horizontal(arm.wrist.clone().sub(position(arm.heel)));
      expect(wristSide.dot(arm.forward.clone().negate()), 'wrist approaches from behind its fingers').toBeGreaterThan(.75);
      assertArm(arm);
    }
    expect(horizontal(lower.wrist.clone().sub(position(lower.heel))).dot(horizontal(upper.wrist.clone().sub(position(upper.heel))))).toBeGreaterThan(0);
    expect(position(upper.heel).clone().sub(position(lower.heel)).setY(0).length()).toBeLessThan(1e-7);
    assertNoArmOverlap(lower,upper); assertChestContact(scene);
    const support = supportMetrics(lower,upper);
    expect(support.samples).toBeGreaterThan(500); expect(support.gridSamples).toBeGreaterThan(500);
    expect(support.minimum, 'upper heel does not pass through the lower hand').toBeGreaterThan(-.0001);
    expect(support.minimum, 'upper heel remains supported').toBeLessThan(.002);
    expect(support.gridMinimum).toBeGreaterThan(-.0003); expect(support.gridMinimum).toBeLessThan(.003);
  });

  it.each(['adult','child','infant'].flatMap(age => ['depth','place','coach'].map(tab => [age,tab])))('preserves %s hand contact and local poses in %s', (age,tab) => {
    const sample = model(age,tab), scene = sample.sample(), lower = hand(scene,'lower');
    const hands = lower.group.parent, original = new Map();
    hands.traverse(object => original.set(object, { geometry: object.geometry, matrix: object.matrix.toArray() }));
    const values = tab === 'depth'
      ? [{ depthLab: { age,motion:'release',lean:0 } },{ depthLab: { age,motion:'press',lean:0 } },{ depthLab: { age,motion:'inspect',phase:35,lean:1 } }]
      : tab === 'coach' ? [{},{ coach: { mode:'scenario',activeCompressionAt:1,phase:'compressions' } }] : [{ placed:'correct' }];
    for (const value of values) {
      sample.sample(value, tab !== 'coach'); assertChestContact(scene); assertArm(hand(scene,'lower'));
      for (const [object,record] of original) {
        expect(object.geometry).toBe(record.geometry);
        if (object !== hands) expect(object.matrix.toArray()).toEqual(record.matrix);
      }
    }
    if (age === 'child') {
      const upper = hand(scene,'upper').group;
      sample.sample({ childHands:'one' }); expect(upper.visible).toBe(false); assertChestContact(scene);
      sample.sample({ childHands:'two' }); expect(upper.visible).toBe(true); assertChestContact(scene);
      expect(hand(scene,'lower').group).toBe(lower.group);
    }
  });

  it('preserves the same hand and arm shape in app contrast', () => {
    const normal = model('adult').sample(), contrast = model('adult','depth',true).sample();
    for (const id of ['lower','upper']) {
      const a = hand(normal,id), b = hand(contrast,id); assertArm(b);
      a.group.traverse(object => {
        if (!object.name || !object.geometry) return;
        const other = b.group.getObjectByName(object.name);
        expect(Array.from(other.geometry.attributes.position.array)).toEqual(Array.from(object.geometry.attributes.position.array));
        expect(other.matrix.toArray()).toEqual(object.matrix.toArray());
      });
    }
  });
});
