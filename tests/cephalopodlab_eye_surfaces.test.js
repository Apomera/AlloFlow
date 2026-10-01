import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/stem_tool_cephalopodlab.js', 'utf8');
const start = source.indexOf('function createCLHuntAnimal(');
const end = source.indexOf('// Compact, individually owned prey rig.', start);
if (start < 0 || end <= start) throw new Error('Cannot find the actual animal rig');
const build = new Function('T', 'species', 'Math', source.slice(start, end) + ';return createCLHuntAnimal(T,species);');
const noRandom = Object.assign(Object.create(Math), { random() { throw new Error('Eye construction consumed dive RNG'); } });
const ids = ['cuttlefish', 'bobtailSquid', 'dumboOcto', 'vampireSquid'];
const eyeNames = new Set(['cl-eye-rim', 'cl-iris', 'cl-pupil', 'cl-eye-highlight', 'cl-eye-lid']);
const allocated = [];
const state = (extra = {}) => ({ moving: false, jet: false, strike: 0, camo: 0, substrate: 'sand', reducedMotion: false, ...extra });
function rig(id) { const animal = build(THREE, { id, bodyColor: 0xbc6048 }, noRandom); allocated.push(animal); return animal; }
function meshes(animal) { const all = []; animal.root.traverse(object => { if (object.isMesh) all.push(object); }); return all; }
function eyes(animal) { return meshes(animal).filter(object => eyeNames.has(object.name)); }
function pair(animal, name) { return meshes(animal).filter(object => object.name === name); }
function worldPoints(mesh) { mesh.updateWorldMatrix(true, false); const p = mesh.geometry.attributes.position; return Array.from({ length: p.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld)); }

// Captured before pass-fifteen: exclude only the intentionally replaced shell subtree.
// Pass sixteen excludes only the four approved nautilus eye subtrees; other species and anatomy remain protected.
function insideNautilusEye(o){let eye=false;for(let p=o;p;p=p.parent){if(['cl-eye-rim','cl-iris','cl-pupil','cl-eye-highlight'].includes(p.name))eye=true;if(p.userData.species==='nautilus')return eye;}return false;}
function insideNautilusShell(o){for(let p=o;p;p=p.parent)if(p.name==='cl-shell')return true;return false;}
// Pass twenty-three excludes only Humboldt's intentionally replaced siphon subtree.
function insideSquidSiphon(o){let siphon=false;for(let p=o;p;p=p.parent){if(p.name==='cl-siphon')siphon=true;if(p.userData.species==='humboldtSquid')return siphon;}return false;}
function geometryRecords(animal, excludeEyes = false) {
  return meshes(animal).filter(object => (!excludeEyes || !eyeNames.has(object.name)) && !insideNautilusShell(object) && !insideNautilusEye(object) && !insideSquidSiphon(object)).map(object => {
    const geometry = object.geometry;
    return [object.name, Array.from(geometry.attributes.position.array), geometry.attributes.normal ? Array.from(geometry.attributes.normal.array) : null,
      geometry.index ? Array.from(geometry.index.array) : null, object.position.toArray(), object.quaternion.toArray(), object.scale.toArray(),
      object.isInstancedMesh ? Array.from(object.instanceMatrix.array) : null];
  });
}
function hash(animal, excludeEyes) { return createHash('sha256').update(JSON.stringify(geometryRecords(animal, excludeEyes))).digest('hex'); }
afterEach(() => {
  for (const animal of allocated.splice(0)) {
    const geometries = new Set(), materials = new Set();
    for (const mesh of meshes(animal)) { geometries.add(mesh.geometry); materials.add(mesh.material); }
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
  }
});

function hullYZ(points) {
  const p = points.map(point => [point.z, point.y]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const unique = p.filter((point, i) => !i || Math.hypot(point[0] - p[i - 1][0], point[1] - p[i - 1][1]) > 1e-8);
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const lower = [], upper = [];
  for (const point of unique) { while (lower.length > 1 && cross(lower.at(-2), lower.at(-1), point) <= 0) lower.pop(); lower.push(point); }
  for (const point of unique.slice().reverse()) { while (upper.length > 1 && cross(upper.at(-2), upper.at(-1), point) <= 0) upper.pop(); upper.push(point); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

describe('Cephalopod curved swimmer eyes', () => {
  it('uses finite unit normals and outward triangles on both curved iris and pupil surfaces', () => {
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), ab = new THREE.Vector3(), ac = new THREE.Vector3(), normal = new THREE.Vector3();
    for (const id of ids) for (const mesh of eyes(rig(id))) {
      const geometry = mesh.geometry, p = geometry.attributes.position, n = geometry.attributes.normal;
      expect(Array.from(p.array).every(Number.isFinite), id + ' ' + mesh.name).toBe(true);
      expect(Array.from(n.array).every(Number.isFinite)).toBe(true);
      for (let i = 0; i < n.count; i++) expect(Math.hypot(n.getX(i), n.getY(i), n.getZ(i))).toBeCloseTo(1, 5);
      if (!['cl-iris', 'cl-pupil'].includes(mesh.name)) continue;
      let surfaceArea = 0;
      const indices = geometry.index.array;
      for (let i = 0; i < indices.length; i += 3) {
        a.fromBufferAttribute(p, indices[i]); b.fromBufferAttribute(p, indices[i + 1]); c.fromBufferAttribute(p, indices[i + 2]);
        ab.subVectors(b, a); ac.subVectors(c, a); ab.cross(ac);
        if (ab.lengthSq() < 1e-18) continue;
        normal.fromBufferAttribute(n, indices[i]);
        expect(ab.dot(normal), id + ' ' + mesh.name + ' face ' + i / 3).toBeGreaterThan(0);
        surfaceArea += ab.length() / 2;
      }
      expect(surfaceArea).toBeGreaterThan(.001 * (id === 'bobtailSquid' ? .75 ** 2 : 1));
    }
  });

  it('mirrors complete eyes across the head and keeps upper skin lids clear of the pupil', () => {
    for (const id of ids) {
      const animal = rig(id);
      for (const name of ['cl-iris', 'cl-pupil']) {
        const [left, right] = pair(animal, name), lp = worldPoints(left), rp = worldPoints(right);
        expect(lp).toHaveLength(rp.length);
        lp.forEach((point, i) => { expect(point.x).toBeCloseTo(-rp[i].x, 6); expect(point.y).toBeCloseTo(rp[i].y, 6); expect(point.z).toBeCloseTo(rp[i].z, 6); });
        const ln = left.geometry.attributes.normal, rn = right.geometry.attributes.normal;
        for (let i = 0; i < ln.count; i++) { expect(ln.getX(i)).toBeCloseTo(-rn.getX(i), 6); expect(ln.getY(i)).toBeCloseTo(rn.getY(i), 6); expect(ln.getZ(i)).toBeCloseTo(rn.getZ(i), 6); }
      }
      const rimBounds = pair(animal, 'cl-eye-rim').map(mesh => new THREE.Box3().setFromObject(mesh));
      expect(rimBounds[0].min.x).toBeCloseTo(-rimBounds[1].max.x, 6);
      expect(rimBounds[0].max.y).toBeCloseTo(rimBounds[1].max.y, 6);
      const pupil = worldPoints(pair(animal, 'cl-pupil')[0]), lid = worldPoints(pair(animal, 'cl-eye-lid')[0]);
      const middleZ = (Math.min(...pupil.map(p => p.z)) + Math.max(...pupil.map(p => p.z))) / 2;
      const centralPupilTop = Math.max(...pupil.filter(p => Math.abs(p.z - middleZ) < .015 * animal.scale).map(p => p.y));
      const centralLidBottom = Math.min(...lid.filter(p => Math.abs(p.z - middleZ) < .025 * animal.scale).map(p => p.y));
      expect(centralLidBottom - centralPupilTop).toBeGreaterThan(.015 * animal.scale);
    }
  });

  it('contains each aperture within the actual iris outline and seats it just above the rendered dome', () => {
    const ray = new THREE.Ray(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), hit = new THREE.Vector3();
    for (const id of ids) {
      const animal = rig(id), pupils = pair(animal, 'cl-pupil'), irises = pair(animal, 'cl-iris');
      for (let sideIndex = 0; sideIndex < 2; sideIndex++) {
        const pupilPoints = worldPoints(pupils[sideIndex]), irisPoints = worldPoints(irises[sideIndex]), outline = hullYZ(irisPoints), indices = irises[sideIndex].geometry.index.array;
        const side = Math.sign(pupilPoints[0].x);
        for (const point of pupilPoints) {
          for (let i = 0; i < outline.length; i++) {
            const q = outline[i], r = outline[(i + 1) % outline.length];
            const edgeCross = (r[0] - q[0]) * (point.y - q[1]) - (r[1] - q[1]) * (point.z - q[0]);
            expect(edgeCross, id + ' pupil leaves iris').toBeGreaterThanOrEqual(-1e-8);
          }
          ray.origin.set(side, point.y, point.z); ray.direction.set(-side, 0, 0); let nearest = Infinity;
          for (let i = 0; i < indices.length; i += 3) {
            a.copy(irisPoints[indices[i]]); b.copy(irisPoints[indices[i + 1]]); c.copy(irisPoints[indices[i + 2]]);
            if (ray.intersectTriangle(a, b, c, false, hit)) nearest = Math.min(nearest, ray.origin.distanceTo(hit));
          }
          expect(Number.isFinite(nearest), id + ' aperture misses iris').toBe(true);
          const pupilDistance = ray.origin.distanceTo(point), lift = nearest - pupilDistance;
          expect(lift).toBeGreaterThan(.001 * animal.scale);
          expect(lift).toBeLessThan(.01 * animal.scale);
        }
      }
    }
  });

  it('keeps both cuttle apertures clear of the wide mantle and moving front skirt while sockets remain embedded in the head', () => {
    const ray = new THREE.Raycaster();
    for (const duration of [.5, 1, 1.5]) {
      const animal = rig('cuttlefish');
      for (let frame = 1; frame <= duration * 20; frame++) animal.update(frame * .05, .05, state());
      animal.root.updateMatrixWorld(true);
      const all = meshes(animal), occluders = all.filter(mesh => mesh.name === 'cl-mantle' || mesh.name === 'cl-head' || mesh.name.startsWith('cl-fin-'));
      const center = new THREE.Box3().setFromObject(animal.root).getCenter(new THREE.Vector3());
      const inverseMantle = animal.mantle.matrixWorld.clone().invert(), inverseHead = animal.root.getObjectByName('cl-head').matrixWorld.clone().invert();
      for (const pupil of pair(animal, 'cl-pupil')) {
        const points = worldPoints(pupil), side = Math.sign(points[0].x);
        // The standard inspection view after one Orbit right and Higher input, mirrored for the other eye.
        const camera = center.clone().add(new THREE.Vector3(side * Math.sin(1.72) * Math.cos(.33), Math.sin(.33), -Math.cos(1.72) * Math.cos(.33)).multiplyScalar(3.6));
        for (const point of points) {
          const delta = point.clone().sub(camera), distance = delta.length();
          ray.set(camera, delta.normalize()); ray.far = distance - .0001;
          expect(ray.intersectObjects(occluders, false), `cuttle pupil occluded at ${duration}s`).toHaveLength(0);
          const local = point.clone().applyMatrix4(inverseMantle);
          expect((local.x / .65) ** 2 + (local.y / .25) ** 2 + (local.z / .88) ** 2, 'pupil penetrates mantle').toBeGreaterThan(1);
        }
      }
      for (const socket of pair(animal, 'cl-eye-rim')) {
        const points = worldPoints(socket), embedded = points.filter(point => point.clone().applyMatrix4(inverseHead).length() < .34 * .99);
        // Require an area of the socket inside the rendered head, not a disconnected cap near its bounding box.
        expect(embedded.length / points.length).toBeGreaterThan(.10);
      }
    }
  });

  it('gives cuttlefish a continuous W-shaped aperture while retaining the other pupil silhouettes', () => {
    const cuttle = rig('cuttlefish'), points = worldPoints(pair(cuttle, 'cl-pupil')[0]);
    const minZ = Math.min(...points.map(p => p.z)), maxZ = Math.max(...points.map(p => p.z));
    const centers = [0, .25, .5, .75, 1].map(fraction => {
      const z = minZ + (maxZ - minZ) * fraction, column = points.filter(point => Math.abs(point.z - z) < 1e-6);
      expect(column.length).toBeGreaterThan(0);
      return (Math.min(...column.map(point => point.y)) + Math.max(...column.map(point => point.y))) / 2;
    });
    expect(centers[0] - centers[1]).toBeGreaterThan(.025);
    expect(centers[2] - centers[1]).toBeGreaterThan(.025);
    expect(centers[2] - centers[3]).toBeGreaterThan(.025);
    expect(centers[4] - centers[3]).toBeGreaterThan(.025);
    for (const id of ['bobtailSquid', 'dumboOcto', 'vampireSquid']) {
      const animal = rig(id), bounds = new THREE.Box3().setFromObject(pair(animal, 'cl-pupil')[0]), ratio = (bounds.max.y - bounds.min.y) / (bounds.max.z - bounds.min.z);
      if (id === 'vampireSquid') expect(ratio).toBeGreaterThan(.75); else expect(ratio).toBeLessThan(.4);
    }
  });

  it('keeps pupil colors dark in linear space and patches the actual bundled physical shader without a clock', () => {
    for (const id of ids) {
      const animal = rig(id), [left, right] = pair(animal, 'cl-pupil'), material = left.material;
      expect(material).toBe(right.material); expect(material.isMeshPhysicalMaterial).toBe(true);
      expect(Math.max(...material.color.toArray())).toBeLessThan(.004);
      expect(material.transparent).toBe(false); expect(material.emissive.getHex()).toBe(0);
      const shader = { fragmentShader: THREE.ShaderLib.physical.fragmentShader };
      material.onBeforeCompile(shader);
      expect(shader.fragmentShader).toContain('vec3 clSwimEyeN=');
      expect(shader.fragmentShader.match(/vec3 clSwimEyeN=/g)).toHaveLength(1);
      expect(material.customProgramCacheKey()).toBe('cl-swimmer-pupil-water-v11');
      expect(shader.fragmentShader).not.toMatch(/clPhase|clTime|clSwimEyeTime/);
      const irises = pair(animal, 'cl-iris'); expect(irises[0].material).toBe(irises[1].material);
      expect(irises[0].material.vertexColors).toBe(true);
      expect(Array.from(irises[0].geometry.attributes.color.array).every(value => Number.isFinite(value) && value > 0 && value < 1)).toBe(true);
      expect(pair(animal, 'cl-eye-lid').every(lid => lid.material === animal.mantleMat)).toBe(true);
    }
    const squid = rig('humboldtSquid');
    expect(pair(squid, 'cl-pupil')[0].material.customProgramCacheKey()).not.toBe('cl-swimmer-pupil-water-v11');
  });

  it('keeps static eye buffers and owned resources through swimming, strike, reduced motion and inspection-like updates', () => {
    for (const id of ids) {
      const animal = rig(id), all = eyes(animal), before = all.map(mesh => [mesh.geometry, mesh.material, mesh.geometry.attributes.position.array, Array.from(mesh.geometry.attributes.position.array), mesh.geometry.attributes.normal.array, Array.from(mesh.geometry.attributes.normal.array)]);
      for (let step = 0; step < 30; step++) animal.update(90 + step * .1, step > 20 ? 0 : .05, state({ moving: true, jet: step % 3 === 0, strike: step % 5 === 0 ? 1 : 0, reducedMotion: step > 15 }));
      all.forEach((mesh, i) => {
        expect(mesh.geometry).toBe(before[i][0]); expect(mesh.material).toBe(before[i][1]);
        expect(mesh.geometry.attributes.position.array).toBe(before[i][2]); expect(Array.from(mesh.geometry.attributes.position.array)).toEqual(before[i][3]);
        expect(mesh.geometry.attributes.normal.array).toBe(before[i][4]); expect(Array.from(mesh.geometry.attributes.normal.array)).toEqual(before[i][5]);
      });
      expect(all).toHaveLength(8);
      expect(all.reduce((sum, mesh) => sum + mesh.geometry.attributes.position.count, 0)).toBeLessThanOrEqual(2040);
      expect(all.reduce((sum, mesh) => sum + mesh.geometry.index.count / 3, 0)).toBeLessThanOrEqual(3408);
      const compatibility = animal.root.children.filter(object => object.name === 'cl-eye-highlight');
      expect(compatibility).toHaveLength(2); expect(compatibility.every(object => object.isGroup && object.children.length === 1 && object.children[0].name === 'cl-eye-lid')).toBe(true);
      const second = rig(id), firstGeometries = new Set(all.map(mesh => mesh.geometry)), firstMaterials = new Set(all.map(mesh => mesh.material));
      expect(eyes(second).every(mesh => !firstGeometries.has(mesh.geometry) && !firstMaterials.has(mesh.material))).toBe(true);
    }
  });

  it('preserves pre-change non-eye swimmers and protected rigs outside later nautilus shell and eye upgrades', () => {
    // Captured before the relevant eye patches. Pass thirteen additionally excludes the named common-octopus eyes, not its body.
    const before = {
      cuttlefish: '86e78517f7209f7bbc6429b8bdfb04844a868e8ea482e8a0297b36caf4201b7a',
      bobtailSquid: 'fd05978c0148e0670fdfb7ddd42e28f06552a03730b23dc544f1f3792b198936',
      dumboOcto: 'ac1328af5fef7d39e22a860ad5c9458e91729b96f211e975906ac73388d1926b',
      vampireSquid: '28a7f2cf71c767b454e657f23840bce3032c7e52531f9f59d977d7bdb6d3d9c3',
      humboldtSquid: 'f32056ab0f70f4fda57fd4ef28aae9447dd5e4873ebb16f0eba3b2ac4f08adec',
      commonOcto: '9f67f8a43befbca0672310972a170a6c0b8e374fbb73062affe72b56e3bdbbfb',
      nautilus: 'b368c9aaf0111fbe689dd64288b7dae52bd626866626e3334291ade22685b086',
    };
    for (const [id, expected] of Object.entries(before)) expect(hash(rig(id), ids.includes(id)||id==='commonOcto'), id).toBe(expected);
  });
});
