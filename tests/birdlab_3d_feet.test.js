import { loadAvianFeatherArt } from './helpers/avian_feather_art_fixture.js';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
function fixture() {
  const context = {};
  for (const method of ['save', 'restore', 'translate', 'rotate', 'beginPath', 'closePath', 'clip',
    'fillRect', 'moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'stroke', 'fill']) context[method] = () => {};
  context.createLinearGradient = () => ({ addColorStop() {} });
  const canvas = () => ({ width: 16, height: 16, getContext: () => context });
  const local = { AvianFeatherArt: { ...loadAvianFeatherArt(), createFlightFeatherCanvas: canvas,
    createVaneDetailCanvases: () => ({ normal: canvas(), roughness: canvas() }) } };
  new Function('window', 'document', readFileSync('stem_lab/birdlab_3d_bird.js', 'utf8'))(local, { createElement: canvas });
  return local.BirdLab3DBird.create(THREE);
}
function feetMeshes(bird) {
  const meshes = [];
  for (const foot of bird.joints.feet) foot.traverse(mesh => {
    if (mesh.name === 'tarsus' || /^(toe-|curved-talon-)/.test(mesh.name)) meshes.push(mesh);
  });
  return meshes;
}

describe('BirdLab scaled feet and tapered talons', () => {
  it('gives every tarsus and toe finite, millimetre-sized scale coordinates with a wrapped circumference', () => {
    const bird = fixture();
    try {
      const scaled = feetMeshes(bird).filter(mesh => mesh.name === 'tarsus' || mesh.name.startsWith('toe-'));
      expect(scaled).toHaveLength(10);
      for (const mesh of scaled) {
        const g = mesh.geometry, p = g.attributes.position, coord = g.attributes.birdScaleCoord;
        const { tubularSegments: rows, radialSegments: columns, path } = g.parameters;
        expect(coord.itemSize).toBe(3); expect(coord.count).toBe(p.count);
        expect(Array.from(coord.array).every(Number.isFinite)).toBe(true);
        const rowCount = coord.getX(p.count - 1), spacing = path.getLength() / rowCount;
        expect(spacing).toBeGreaterThan(.002); expect(spacing).toBeLessThan(.006);
        const exposures = [];
        for (let row = 0; row <= rows; row++) {
          const first = row * (columns + 1), last = first + columns;
          expect(coord.getX(first)).toBeCloseTo(coord.getX(last), 7);
          expect(coord.getY(first)).toBe(0); expect(coord.getY(last)).toBeCloseTo(Math.round(coord.getY(last)), 7);
          expect(coord.getY(last)).toBeGreaterThan(1);
          expect(coord.getZ(first)).toBeCloseTo(coord.getZ(last), 6);
          if (row) expect(coord.getX(first)).toBeGreaterThan(coord.getX(first - columns - 1));
          for (let column = 0; column <= columns; column++) {
            const exposure = coord.getZ(first + column);
            expect(exposure).toBeGreaterThanOrEqual(0); expect(exposure).toBeLessThanOrEqual(1);
            exposures.push(exposure);
          }
        }
        // Broad plates and side scales both exist; a constant attribute would
        // erase their distinction even if the material compiled successfully.
        expect(Math.min(...exposures)).toBe(0); expect(Math.max(...exposures)).toBeGreaterThan(.9);
      }
    } finally { bird.dispose(); }
  });

  it('keeps scales attached to retained vertices while hocks compress and toes curl', () => {
    const bird = fixture();
    try {
      const meshes = feetMeshes(bird), snapshots = meshes.map(mesh => ({ mesh, geometry: mesh.geometry,
        attributes: Object.entries(mesh.geometry.attributes).map(([name, attribute]) => ({ name, attribute,
          array: attribute.array, values: attribute.array.slice() })),
        morphs: Object.values(mesh.geometry.morphAttributes).flat().map(attribute => ({ attribute, values: attribute.array.slice() })) }));
      const legs = bird.joints.feet.map(foot => foot.userData.leg);
      const toe = bird.joints.feet[0].userData.digits[0].joint, extendedRotation = toe.rotation.x;
      for (const pose of [{ fold: 1, feet: 1, crouch: 1 }, { fold: .3, feet: 1, touchdown: 1 },
        { fold: 0, feet: 0 }, { fold: 1, feet: .5 }, { fold: 1, feet: 1 }]) {
        bird.update(pose, 1 / 60); bird.root.updateMatrixWorld(true);
        if (pose.crouch) for (const leg of legs) expect(leg.morphTargetInfluences[0]).toBe(1);
        if (pose.feet === 0) expect(Math.abs(toe.rotation.x - extendedRotation)).toBeGreaterThan(.1);
        for (const snapshot of snapshots) {
          expect(snapshot.mesh.geometry).toBe(snapshot.geometry);
          expect(snapshot.mesh.matrixWorld.elements.every(Number.isFinite)).toBe(true);
          for (const retained of snapshot.attributes) {
            expect(snapshot.geometry.attributes[retained.name]).toBe(retained.attribute);
            expect(retained.attribute.array).toBe(retained.array);
            expect(retained.attribute.array).toEqual(retained.values);
          }
          for (const retained of snapshot.morphs) expect(retained.attribute.array).toEqual(retained.values);
        }
      }
      for (const leg of legs) {
        expect(leg.geometry.morphAttributes.position[0].count).toBe(leg.geometry.attributes.birdScaleCoord.count);
        expect(leg.morphTargetInfluences[0]).toBe(0);
      }
    } finally { bird.dispose(); }
  });

  it('preserves all eight claw roots and curved centerlines while narrowing to a fine tip', () => {
    const bird = fixture(), point = new THREE.Vector3(), opposite = new THREE.Vector3();
    try {
      for (const foot of bird.joints.feet) for (let digit = 0; digit < 4; digit++) {
        const mesh = foot.getObjectByName(`curved-talon-${digit}`), g = mesh.geometry, p = g.attributes.position;
        const length = [.036, .049, .037, .031][digit];
        const curve = new THREE.CatmullRomCurve3([[0, -.013, -length], [0, -.012, -length * 1.17],
          [0, -.019, -length * 1.30]].map(xyz => new THREE.Vector3(...xyz)));
        const { tubularSegments: rows, radialSegments: columns } = g.parameters;
        let previousRadius = Infinity;
        expect(mesh.parent).toBe(foot.getObjectByName(`toe-${digit}`).parent);
        expect(mesh.position.toArray()).toEqual([0, 0, 0]);
        for (let row = 0; row <= rows; row++) {
          const first = row * (columns + 1), center = curve.getPointAt(row / rows);
          point.fromBufferAttribute(p, first); opposite.fromBufferAttribute(p, first + columns / 2);
          expect(point.clone().add(opposite).multiplyScalar(.5).distanceTo(center)).toBeLessThan(1e-8);
          const radius = point.distanceTo(center);
          expect(radius).toBeLessThan(previousRadius); expect(radius).toBeGreaterThan(0);
          if (row === 0) expect(radius).toBeCloseTo(.0019, 8);
          if (row === rows) expect(radius).toBeLessThan(.0001);
          previousRadius = radius;
        }
      }
    } finally { bird.dispose(); }
  });

  it('keeps curved claw faces outward and nondegenerate, with smooth normals across their UV seam', () => {
    const bird = fixture(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), radial = new THREE.Vector3();
    try {
      const talons = feetMeshes(bird).filter(mesh => mesh.name.startsWith('curved-talon-'));
      expect(talons).toHaveLength(8);
      for (const mesh of talons) {
        const g = mesh.geometry, { position: p, normal: n } = g.attributes;
        const { tubularSegments: rows, radialSegments: columns, path } = g.parameters;
        const centers = Array.from({ length: rows + 1 }, (_, row) => path.getPointAt(row / rows));
        for (let vertex = 0; vertex < p.count; vertex++) {
          expect(a.fromBufferAttribute(p, vertex).toArray().every(Number.isFinite)).toBe(true);
          expect(a.fromBufferAttribute(n, vertex).length()).toBeCloseTo(1, 5);
        }
        for (let row = 0; row <= rows; row++) {
          const first = row * (columns + 1), last = first + columns;
          expect(a.fromBufferAttribute(p, first).distanceTo(b.fromBufferAttribute(p, last))).toBeLessThan(1e-8);
          expect(a.fromBufferAttribute(n, first).distanceTo(b.fromBufferAttribute(n, last))).toBeLessThan(1e-6);
        }
        for (let face = 0; face < g.index.count; face += 3) {
          a.fromBufferAttribute(p, g.index.getX(face)); b.fromBufferAttribute(p, g.index.getX(face + 1));
          c.fromBufferAttribute(p, g.index.getX(face + 2));
          const normal = b.sub(a).cross(c.sub(a));
          expect(normal.lengthSq()).toBeGreaterThan(1e-22);
          radial.set(0, 0, 0);
          for (let corner = 0; corner < 3; corner++) {
            const vertex = g.index.getX(face + corner);
            radial.add(a.fromBufferAttribute(p, vertex).sub(centers[Math.floor(vertex / (columns + 1))]));
          }
          expect(normal.dot(radial)).toBeGreaterThan(0);
        }
      }
    } finally { bird.dispose(); }
  });

  it('shares two foot materials, retains resources during movement, and disposes them exactly once', () => {
    const bird = fixture(), parent = new THREE.Group(); parent.add(bird.root);
    const meshes = feetMeshes(bird), materials = new Set(meshes.map(mesh => mesh.material));
    const geometries = new Set(meshes.map(mesh => mesh.geometry));
    expect(meshes).toHaveLength(18); expect(materials.size).toBe(2);
    const legMaterial = bird.joints.feet[0].userData.leg.material;
    for (const mesh of meshes) {
      if (!mesh.name.startsWith('curved-talon-')) expect(mesh.material).toBe(legMaterial);
      expect(mesh.material.map).toBeNull(); expect(mesh.material.normalMap).toBeNull();
    }
    const before = bird.getStats();
    for (let step = 0; step < 40; step++) bird.update({ fold: step % 2, feet: (step % 5) / 4,
      crouch: (step % 3) / 2, touchdown: (step % 4) / 3 }, 1 / 60);
    const after = bird.getStats();
    for (const key of ['geometries', 'materials', 'textures']) expect(after[key]).toBe(before[key]);
    const disposals = new Map([...materials, ...geometries].map(resource => [resource, 0]));
    for (const resource of disposals.keys()) resource.addEventListener('dispose', () => disposals.set(resource, disposals.get(resource) + 1));
    bird.dispose(); bird.dispose();
    expect(bird.root.parent).toBeNull();
    for (const count of disposals.values()) expect(count).toBe(1);
  });
});
