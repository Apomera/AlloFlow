import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 30000 });
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const local = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(local);
const S = local.Reef3DSpecies;

function meshes(root) { const out = []; root.traverse((node) => { if (node.isMesh) out.push(node); }); return out; }
function batchPart(root, name) {
  for (const mesh of meshes(root)) {
    const range = mesh.geometry.userData.batch?.find((part) => part.part === name);
    if (range) return { mesh, range };
  }
  throw new Error('Missing batch part: ' + name);
}
function bodyWidthNear(handle, id, x) {
  const geometry = handle.root.getObjectByName(id + '-body').geometry;
  const positions = geometry.attributes.position;
  const unit = geometry.boundingBox.max.x / 0.503;
  let ringX = Infinity, nearest = Infinity, width = 0, maximum = 0;
  for (let i = 0; i < positions.count; i++) {
    const distance = Math.abs(positions.getX(i) / unit - x);
    if (distance < nearest) { nearest = distance; ringX = positions.getX(i); }
    maximum = Math.max(maximum, Math.abs(positions.getZ(i)));
  }
  for (let i = 0; i < positions.count; i++) if (Math.abs(positions.getX(i) - ringX) < 1e-7) width = Math.max(width, Math.abs(positions.getZ(i)));
  return { width, maximum, unit };
}
function membraneRow(handle, part) {
  const { mesh, range } = batchPart(handle.root, part);
  const uv = mesh.geometry.attributes.uv, own = mesh.geometry.attributes.reefPart;
  let closest = Infinity, rowU = 0;
  for (let i = range.first; i < range.first + range.count; i++) {
    const distance = Math.abs(uv.getX(i) - 0.5);
    if (distance < closest) { closest = distance; rowU = uv.getX(i); }
  }
  const row = [];
  for (let i = range.first; i < range.first + range.count; i++) if (Math.abs(uv.getX(i) - rowU) < 1e-7) {
    row.push({ v: uv.getY(i), x: own.getX(i), z: own.getZ(i) });
  }
  return row.sort((a, b) => a.v - b.v);
}
function relativeFin(body, fin, index) {
  const bodyMatrix = new THREE.Matrix4(), finMatrix = new THREE.Matrix4();
  body.getMatrixAt(index, bodyMatrix); fin.getMatrixAt(index, finMatrix);
  return bodyMatrix.invert().multiply(finMatrix);
}
function placement(root) { return [...root.position.toArray(), ...root.quaternion.toArray(), ...root.scale.toArray()]; }

describe('reef fish morphology and recovery strokes', () => {
  it('gives the cheek a rounded transition into the shoulder without growing the whole body', () => {
    for (const id of ['clownfish', 'blue_tang']) {
      const fish = S.create(THREE, id, { quality: 'high', seed: 7 });
      try {
        const cheek = bodyWidthNear(fish, id, 0.315);
        expect(cheek.width / cheek.maximum, id + ' cheek joins the shoulder instead of forming a narrow cone').toBeGreaterThan(0.945);
        expect(cheek.width / cheek.maximum, id + ' restrained head volume').toBeLessThanOrEqual(1);
        const body = fish.root.getObjectByName(id + '-body');
        expect(body.geometry.boundingBox.max.x - body.geometry.boundingBox.min.x).toBeLessThan(S.info(id).lengthM);
        // A pectoral root follows this same surface rather than remaining
        // embedded in, or detached from, the refined cheek.
        const pivot = fish.root.getObjectByName(id + '-pectoral-pivot');
        body.updateWorldMatrix(true, false);
        const anchor = pivot.getWorldPosition(new THREE.Vector3());
        const ray = new THREE.Raycaster(new THREE.Vector3(anchor.x, anchor.y, anchor.z + S.info(id).lengthM), new THREE.Vector3(0, 0, -1));
        const hit = ray.intersectObject(body)[0];
        expect(hit, id + ' body beneath the fin root').toBeTruthy();
        expect(anchor.z - hit.point.z, id + ' fin root stays seated').toBeGreaterThanOrEqual(-cheek.unit * 0.003);
        expect(anchor.z - hit.point.z, id + ' no floating fin root').toBeLessThan(cheek.unit * 0.012);
      } finally { fish.dispose(); }
    }
  });

  it('cups the pectoral web behind its leading support while keeping its root fixed and the membrane thin', () => {
    for (const id of ['clownfish', 'blue_tang', 'parrotfish']) {
      const fish = S.create(THREE, id, { quality: 'high', seed: 7 });
      try {
        const row = membraneRow(fish, 'pectoral'), root = row[0], edge = row.at(-1);
        const at = (v) => row.find((point) => Math.abs(point.v - v) < 1e-6);
        const bow = (point) => point.z - (root.z + (edge.z - root.z) * point.v);
        expect(root.x, id + ' attached leading support').toBeCloseTo(0, 8);
        expect(root.z, id + ' no deformation at attachment').toBeCloseTo(0, 8);
        expect(bow(at(0.6)), id + ' camber peaks behind mid chord').toBeGreaterThan(bow(at(0.4)) * 1.05);
        const body = fish.root.getObjectByName(id + '-body').geometry.boundingBox;
        const depth = Math.max(...row.map((point) => point.z)) - Math.min(...row.map((point) => point.z));
        expect(depth, id + ' thin membrane').toBeLessThan((body.max.z - body.min.z) * 0.2);
      } finally { fish.dispose(); }
    }
  });

  it('feathers a single fish fin during recovery without moving its attachment or placement root', () => {
    const fish = S.create(THREE, 'clownfish', { quality: 'low', seed: 18 });
    const fin = fish.root.getObjectByName('clownfish-pectoral-pivot'), anchor = fin.position.clone();
    fish.root.position.set(3, 2, -5); fish.root.rotation.y = 0.7;
    const originalPlacement = placement(fish.root);
    let maximum = 0;
    try {
      for (let frame = 0; frame < 240; frame++) {
        fish.update(1 / 60, frame / 60, { speed: 0.02, turn: 0.35 });
        maximum = Math.max(maximum, Math.abs(fin.rotation.x));
        expect(fin.position.distanceTo(anchor), 'the fin rotates about a fixed root').toBeLessThan(1e-9);
        expect(placement(fish.root)).toEqual(originalPlacement);
      }
      expect(maximum, 'recovery has an observable edge-first feather, not a flat reverse paddle').toBeGreaterThan(0.18);
      expect(maximum, 'restrained fin twist').toBeLessThan(0.5);
    } finally { fish.dispose(); }
  });

  it('gives instanced school members their own feathering phase while preserving each root and deterministic sampling', () => {
    const school = S.createSchool(THREE, 'anthias', 12, { quality: 'low', seed: 7 });
    const body = school.root.getObjectByName('anthias-body'), fin = school.root.getObjectByName('anthias-pectoral-left');
    const position = new THREE.Vector3(), quaternion = new THREE.Quaternion(), scale = new THREE.Vector3(), angle = new THREE.Euler();
    let anchor, maximum = 0, difference = 0;
    try {
      for (let frame = 0; frame < 180; frame++) {
        school.update(1 / 60, frame / 60, { speed: 0.04, turn: 0.2 });
        const first = relativeFin(body, fin, 0), second = relativeFin(body, fin, 1);
        first.decompose(position, quaternion, scale);
        if (!anchor) anchor = position.clone();
        expect(position.distanceTo(anchor), 'local attachment survives schooling motion').toBeLessThan(1e-6);
        angle.setFromQuaternion(quaternion); maximum = Math.max(maximum, Math.abs(angle.x));
        const firstRotation = quaternion.clone(); second.decompose(position, quaternion, scale);
        difference = Math.max(difference, firstRotation.angleTo(quaternion));
      }
      expect(maximum, 'visible recovery feather in instanced fish').toBeGreaterThan(0.12);
      expect(difference, 'neighbours keep independent strokes').toBeGreaterThan(0.05);
      school.update(1 / 60, 5.13, { speed: 0.04, turn: 0.2 });
      const before = relativeFin(body, fin, 0).elements.slice();
      school.update(0.9, 5.13, { speed: 0.04, turn: 0.2 });
      expect(relativeFin(body, fin, 0).elements).toEqual(before);
    } finally { school.dispose(); }
  });

  it('keeps the richer silhouette frozen for reduced motion', () => {
    const fish = S.create(THREE, 'blue_tang', { quality: 'high', reducedMotion: true, seed: 7 });
    const fin = fish.root.getObjectByName('blue_tang-pectoral-pivot');
    const initial = [...fin.position.toArray(), ...fin.rotation.toArray()];
    const geometry = fish.root.getObjectByName('blue_tang-body').geometry.attributes.position.array.slice();
    try {
      for (const time of [0.1, 3, 50]) fish.update(0.2, time, { speed: 2, turn: 1 });
      expect([...fin.position.toArray(), ...fin.rotation.toArray()]).toEqual(initial);
      expect(fish.root.getObjectByName('blue_tang-body').geometry.attributes.position.array).toEqual(geometry);
    } finally { fish.dispose(); }
  });

  it('adds no draw calls or per-frame geometry uploads for the refined fish', () => {
    for (const id of ['clownfish', 'blue_tang', 'parrotfish', 'peacock_grouper', 'humphead_wrasse']) {
      const fish = S.create(THREE, id, { quality: 'high', seed: 7 });
      try {
        const parts = meshes(fish.root);
        expect(parts.length, id + ' stays batched').toBe(2);
        expect(parts.reduce((total, mesh) => total + mesh.geometry.index.count / 3, 0), id + ' detailed tier budget').toBeLessThan(6000);
        const versions = parts.map((mesh) => [mesh.geometry.attributes.position.version, mesh.geometry.attributes.normal.version]);
        for (let frame = 0; frame < 120; frame++) fish.update(1 / 60, frame / 60, { speed: 0.2, turn: 0.3 });
        expect(parts.map((mesh) => [mesh.geometry.attributes.position.version, mesh.geometry.attributes.normal.version]), id + ' animation updates the existing rig').toEqual(versions);
      } finally { fish.dispose(); }
    }
  });
});
