import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_firstresponse.js', 'utf8');
const THREE = {};
new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
const ages = ['adult', 'child', 'infant'];
const scenes = [];
let build, previousRegistry;

beforeAll(() => {
  previousRegistry = window.StemLab;
  window.StemLab = {
    _registry: {}, isRegistered: () => false,
    makeBayViewer(config) {
      build = config.buildScene;
      return { attach() {}, sync() {}, nudge() {}, zoom() {}, reset() {}, status: () => 'failed' };
    },
    registerTool(id, config) { this._registry[id] = config; },
  };
  new Function(source)();
  expect(build).toBeTypeOf('function');
});
afterEach(() => {
  const geometries = new Set(), materials = new Set();
  for (const scene of scenes.splice(0)) scene.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (material) materials.add(material);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
});
afterAll(() => { window.StemLab = previousRegistry; });

function model(age, contrast = false) {
  const scene = new THREE.Scene();
  scenes.push(scene);
  const content = build(THREE, {
    scene, phase: 0, dark: true, contrast, wantShadow: false,
    trim: color => new THREE.MeshPhongMaterial({ color }), sceneProps: { tab: 'depth', age },
  });
  return (motion = 'release') => {
    content.frame(0, { depthLab: { age, motion, lean: 0 }, childHands: 'two' }, true);
    scene.updateMatrixWorld(true);
    return scene;
  };
}
function object(scene, name) {
  const found = scene.getObjectByName(name);
  expect(found, name).toBeTruthy();
  return found;
}
function arms(scene, age) {
  return (age === 'infant' ? ['lower'] : ['lower', 'upper']).map(side => {
    const prefix = 'fr-rescuer-' + side;
    return {
      hand: object(scene, prefix),
      forearm: object(scene, prefix + '-forearm'),
      upper: object(scene, prefix + '-upper-arm'),
    };
  });
}
function end(mesh, direction) {
  return new THREE.Vector3(0, direction * mesh.geometry.parameters.height / 2, 0).applyMatrix4(mesh.matrixWorld);
}
function ring(mesh, direction) {
  const geometry = mesh.geometry, radial = geometry.parameters.radialSegments;
  const row = direction > 0 ? 0 : geometry.parameters.heightSegments;
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
  return Array.from({ length: radial }, (_, i) => {
    const index = row * (radial + 1) + i;
    return {
      point: new THREE.Vector3().fromBufferAttribute(geometry.attributes.position, index).applyMatrix4(mesh.matrixWorld),
      normal: new THREE.Vector3().fromBufferAttribute(geometry.attributes.normal, index).applyMatrix3(normalMatrix).normalize(),
    };
  });
}
function assertJoin(arm) {
  const foreEnd = ring(arm.forearm, 1), upperStart = ring(arm.upper, -1);
  expect(upperStart.length).toBe(foreEnd.length);
  for (const vertex of foreEnd) {
    const nearest = upperStart.reduce((best, candidate) =>
      vertex.point.distanceToSquared(candidate.point) < vertex.point.distanceToSquared(best.point) ? candidate : best);
    expect(vertex.point.distanceTo(nearest.point), arm.hand.name + ' open elbow seam').toBeLessThan(1e-7);
    expect(vertex.normal.distanceTo(nearest.normal), arm.hand.name + ' elbow shading seam').toBeLessThan(1e-6);
  }
  const elbow = end(arm.forearm, 1);
  expect(elbow.distanceTo(end(arm.upper, -1))).toBeLessThan(1e-8);
  const extraJoint = arm.hand.children.filter(part => part.isMesh && /SphereGeometry/.test(part.geometry.type)
    && part.getWorldPosition(new THREE.Vector3()).distanceTo(elbow) < 1e-6);
  expect(extraJoint, arm.hand.name + ' exposed sphere at the elbow').toHaveLength(0);
}
function assertClosedAndShaded(mesh) {
  const geometry = mesh.geometry, position = geometry.attributes.position, normal = geometry.attributes.normal;
  expect(geometry.type).toBe('CylinderGeometry');
  expect(position.array.every(Number.isFinite), mesh.name + ' finite positions').toBe(true);
  expect(normal.array.every(Number.isFinite), mesh.name + ' finite normals').toBe(true);
  const points = Array.from({ length: position.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(position, i));
  const keys = points.map(point => point.toArray().map(value => Math.round(value * 1e7)).join(','));
  const edges = new Map(), indices = Array.from(geometry.index.array);
  let volume = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const [a, b, c] = indices.slice(i, i + 3);
    if (points[b].clone().sub(points[a]).cross(points[c].clone().sub(points[a])).lengthSq() < 1e-20) continue;
    volume += points[a].dot(points[b].clone().cross(points[c])) / 6;
    for (const [from, to] of [[a, b], [b, c], [c, a]]) {
      const key = [keys[from], keys[to]].sort().join('|'), edge = edges.get(key) || { count: 0, winding: 0 };
      edge.count++; edge.winding += keys[from] < keys[to] ? 1 : -1;
      edges.set(key, edge);
    }
  }
  expect(volume, mesh.name + ' outward surface winding').toBeGreaterThan(0);
  expect([...edges.values()].every(edge => edge.count === 2 && edge.winding === 0), mesh.name + ' closed segment and caps').toBe(true);
  for (let i = 0; i < normal.count; i++) {
    expect(new THREE.Vector3().fromBufferAttribute(normal, i).length()).toBeCloseTo(1, 5);
  }
  const radial = geometry.parameters.radialSegments, rows = geometry.parameters.heightSegments;
  for (let row = 0; row <= rows; row++) {
    const first = row * (radial + 1), last = first + radial;
    const a = new THREE.Vector3().fromBufferAttribute(normal, first), b = new THREE.Vector3().fromBufferAttribute(normal, last);
    expect(a.distanceTo(b), mesh.name + ' circumferential shading seam').toBeLessThan(1e-6);
    if (row === 0 || row === rows) expect(Math.abs(a.y), mesh.name + ' flat end tangent').toBeLessThan(1e-6);
    for (let j = 0; j <= radial; j++) {
      const index = first + j;
      expect(position.getX(index) * normal.getX(index) + position.getZ(index) * normal.getZ(index), mesh.name + ' outward side normal').toBeGreaterThan(0);
    }
  }
}
function extentsAt(mesh, row) {
  const radial = mesh.geometry.parameters.radialSegments, p = mesh.geometry.attributes.position;
  let x = 0, z = 0;
  for (let j = 0; j < radial; j++) {
    const index = row * (radial + 1) + j;
    x = Math.max(x, Math.abs(p.getX(index))); z = Math.max(z, Math.abs(p.getZ(index)));
  }
  return { x, z };
}

describe('First Response rescuer arm contours', () => {
  it.each(ages)('joins the %s elbow rings and normals without a separate round joint', age => {
    const scene = model(age)();
    for (const arm of arms(scene, age)) assertJoin(arm);
  });

  it.each(ages)('keeps the %s arm surfaces closed with finite outward seam normals', age => {
    const scene = model(age)();
    for (const arm of arms(scene, age)) for (const mesh of [arm.forearm, arm.upper]) assertClosedAndShaded(mesh);
  });

  it.each(ages)('gives the %s forearm a tapered elliptical contour instead of a circular tube', age => {
    const scene = model(age)();
    for (const arm of arms(scene, age)) {
      for (const mesh of [arm.forearm, arm.upper]) {
        const rows = mesh.geometry.parameters.heightSegments;
        const sections = Array.from({ length: rows + 1 }, (_, row) => extentsAt(mesh, row));
        const ratios = sections.map(section => Math.min(section.x, section.z) / Math.max(section.x, section.z));
        expect(Math.min(...ratios), mesh.name + ' excessively flat section').toBeGreaterThan(.65);
        expect(Math.max(...ratios), mesh.name + ' circular section').toBeLessThan(.95);
        const radius = sections.map(section => Math.max(section.x, section.z));
        const belly = Math.max(...radius.slice(1, -1));
        expect(belly, mesh.name + ' muscle contour').toBeGreaterThan(Math.max(radius[0], radius[rows]) * 1.06);
        expect(belly / Math.min(radius[0], radius[rows]), mesh.name + ' exaggerated contour').toBeLessThan(1.8);
      }
      const rows = arm.forearm.geometry.parameters.heightSegments;
      expect(extentsAt(arm.forearm, rows).x, 'wrist remains narrower than elbow').toBeLessThan(extentsAt(arm.forearm, 0).x * .9);
    }
  });

  it.each(ages)('preserves the %s arm lengths, separation and heel contact through compression', age => {
    const sample = model(age), scene = sample();
    const recorded = arms(scene, age).map(arm => ({
      ...arm, forearmGeometry: arm.forearm.geometry, upperGeometry: arm.upper.geometry,
      foreLength: arm.forearm.geometry.parameters.height, upperLength: arm.upper.geometry.parameters.height,
      localWrist: arm.hand.worldToLocal(end(arm.forearm, -1)),
      localElbow: arm.hand.worldToLocal(end(arm.forearm, 1)),
      localShoulder: arm.hand.worldToLocal(end(arm.upper, 1)),
    }));
    let releasedHeelY;
    for (const motion of ['release', 'press']) {
      sample(motion);
      const heel = object(scene, 'fr-rescuer-lower-heel'), torso = object(scene, 'fr-manikin-torso');
      const centre = heel.getWorldPosition(new THREE.Vector3()), scale = heel.getWorldScale(new THREE.Vector3());
      const heelY = centre.y - scale.y;
      const hit = new THREE.Raycaster(new THREE.Vector3(centre.x, centre.y + 1, centre.z), new THREE.Vector3(0, -1, 0)).intersectObject(torso, false)[0];
      expect(hit, 'actual torso surface below the heel').toBeTruthy();
      expect(heelY).toBeCloseTo(hit.point.y, 6);
      if (motion === 'release') releasedHeelY = heelY;
      else expect(heelY).toBeLessThan(releasedHeelY - .005);
      for (const arm of recorded) {
        expect(arm.forearm.geometry).toBe(arm.forearmGeometry); expect(arm.upper.geometry).toBe(arm.upperGeometry);
        expect(arm.forearm.geometry.parameters.height).toBe(arm.foreLength); expect(arm.upper.geometry.parameters.height).toBe(arm.upperLength);
        for (const [actual, expected] of [[end(arm.forearm, -1), arm.localWrist], [end(arm.forearm, 1), arm.localElbow], [end(arm.upper, 1), arm.localShoulder]]) {
          expect(arm.hand.worldToLocal(actual).distanceTo(expected)).toBeLessThan(1e-8);
        }
        const axis = end(arm.upper, 1).sub(end(arm.forearm, -1)).normalize();
        expect(axis.y, arm.hand.name + ' straight vertical arm').toBeCloseTo(1, 8);
        assertJoin(arm);
      }
      if (recorded.length === 2) {
        const [lower, upper] = recorded;
        expect(end(lower.forearm, 1).y).toBeCloseTo(end(upper.forearm, 1).y, 8);
        for (const part of ['forearm', 'upper']) {
          const a = new THREE.Box3().setFromObject(lower[part]), b = new THREE.Box3().setFromObject(upper[part]);
          expect(a.intersectsBox(b), part + ' surfaces overlap between arms').toBe(false);
        }
      }
    }
  });

  it('keeps the same joined arm geometry in app contrast', () => {
    const normal = model('adult', false)(), contrast = model('adult', true)();
    const normalArms = arms(normal, 'adult'), contrastArms = arms(contrast, 'adult');
    for (let i = 0; i < normalArms.length; i++) {
      assertJoin(contrastArms[i]);
      for (const part of ['forearm', 'upper']) {
        expect(Array.from(contrastArms[i][part].geometry.attributes.position.array)).toEqual(Array.from(normalArms[i][part].geometry.attributes.position.array));
        expect(Array.from(contrastArms[i][part].geometry.attributes.normal.array)).toEqual(Array.from(normalArms[i][part].geometry.attributes.normal.array));
      }
    }
  });
});
