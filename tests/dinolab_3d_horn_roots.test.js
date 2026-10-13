import { describe, it, expect } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

// Focused geometry regression tests; fixtures are constructed in this file.
const source = readFileSync(process.env.DINO_HORN_ROOT_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));

function extract(name) {
  const start = source.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, name + ' is present');
  const body = source.indexOf('{', start);
  let depth = 0;
  for (let cursor = body; cursor < source.length; cursor++) {
    if (source[cursor] === '{') depth++;
    if (source[cursor] === '}' && --depth === 0) return source.slice(start, cursor + 1);
  }
  throw new Error('Unterminated helper ' + name);
}

const helpers = new Function(extract('dinoSurfaceAnchor') + '\n' + extract('dinoKeratinGeometry') + '\n' + extract('dinoSeatHornRoot') + '\nreturn {dinoSurfaceAnchor,dinoKeratinGeometry,dinoSeatHornRoot};')();

const point = (attribute, index) => new THREE.Vector3().fromBufferAttribute(attribute, index);
const values = attribute => Array.from(attribute.array);

function fixture({ size = 1, direction = [-1, .65, .2], gap = .45, tilt = 0, scale = [1, 1, 1], kind = 'horn', coverage = 1 } = {}) {
  const radius = .09 * size;
  const vector = new THREE.Vector3(...direction).multiplyScalar(size);
  const geometry = helpers.dinoKeratinGeometry(THREE, vector, radius, kind, coverage);
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  const along = vector.clone().normalize();
  const bend = new THREE.Vector3(0, 1, 0).addScaledVector(along, -along.y);
  if (bend.lengthSq() < .000001) bend.set(1, 0, 0).addScaledVector(along, -along.x);
  const axis = along.clone().addScaledVector(bend.normalize(), .26).normalize();
  const across = new THREE.Vector3().crossVectors(axis, bend).normalize();
  const normal = axis.clone().multiplyScalar(Math.sqrt(1 - tilt * tilt)).addScaledVector(across, tilt);
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(radius * 100, radius * 100), material);
  surface.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  surface.position.copy(normal).multiplyScalar(-radius * gap);
  const parent = new THREE.Group();
  parent.position.set(size * .31, size * -.13, size * .23);
  parent.rotation.set(.27, -.48, .19);
  parent.scale.set(...scale);
  parent.add(mesh, surface);
  parent.updateMatrixWorld(true);
  let disposed = 0;
  geometry.addEventListener('dispose', () => disposed++);
  return {
    radius, geometry, mesh, surface, parent, axis, normal,
    disposed: () => disposed,
    release() {
      if (mesh.geometry !== geometry) mesh.geometry.dispose();
      if (!disposed) geometry.dispose();
      surface.geometry.dispose();
      material.dispose();
    }
  };
}

function snapshot(geometry) {
  return {
    position: values(geometry.attributes.position),
    normal: values(geometry.attributes.normal),
    grain: values(geometry.attributes.dinoKeratin),
    index: values(geometry.index),
    parameters: { ...geometry.parameters },
    userData: JSON.stringify(geometry.userData)
  };
}

function verifySurface(geometry, size) {
  const positions = geometry.attributes.position;
  const normals = geometry.attributes.normal;
  for (let vertex = 0; vertex < positions.count; vertex++) {
    const p = point(positions, vertex);
    expect(p.toArray().every(Number.isFinite)).toBe(true);
    expect(Math.abs(point(normals, vertex).length() - 1)).toBeLessThan(1e-6);
    expect(geometry.boundingBox.containsPoint(p)).toBe(true);
    expect(p.distanceTo(geometry.boundingSphere.center)).toBeLessThanOrEqual(geometry.boundingSphere.radius + size * 1e-10);
  }
  for (let triangle = 0; triangle < geometry.index.count; triangle += 3) {
    const ids = [0, 1, 2].map(offset => geometry.index.getX(triangle + offset));
    const [a, b, c] = ids.map(index => point(positions, index));
    const face = new THREE.Vector3().crossVectors(b.sub(a), c.sub(a));
    expect(face.lengthSq()).toBeGreaterThan(0);
  }
}

describe('Cranial horn roots seat into their support surface', () => {
  for (const size of [.01, 1, 100]) {
    for (const direction of [[-1, .65, .2], [0, 1, 0], [.1, -1, 0]]) {
      it('buries the cap while preserving the distal sweep, size ' + size + ', direction ' + direction, () => {
        const f = fixture({ size, direction });
        const before = snapshot(f.geometry);
        try {
          expect(helpers.dinoSeatHornRoot(THREE, f.mesh, f.surface)).toBe(true);
          expect(f.mesh.geometry).not.toBe(f.geometry);
          expect(f.disposed()).toBe(1);
          const after = f.mesh.geometry;
          expect(after.parameters).toEqual(before.parameters);
          expect(values(after.index)).toEqual(before.index);
          expect(values(after.attributes.dinoKeratin)).toEqual(before.grain);
          // Ring six and everything beyond it, including the tip, are bit-exact.
          expect(values(after.attributes.position).slice(6 * 24 * 3, -3)).toEqual(before.position.slice(6 * 24 * 3, -3));
          // Ring six shares faces with the transition; all subsequent normals stay exact.
          expect(values(after.attributes.normal).slice(7 * 24 * 3, -3)).toEqual(before.normal.slice(7 * 24 * 3, -3));
          for (let vertex = 0; vertex < 6 * 24; vertex++) {
            const delta = point(after.attributes.position, vertex).sub(point(f.geometry.attributes.position, vertex));
            expect(delta.dot(f.axis)).toBeLessThanOrEqual(size * 1e-7);
            expect(new THREE.Vector3().crossVectors(delta, f.axis).length()).toBeLessThan(size * 1e-7);
          }
          for (const vertex of [...Array(24).keys(), 577]) {
            const local = point(after.attributes.position, vertex);
            expect(local.clone().sub(f.surface.position).dot(f.normal)).toBeLessThan(-f.radius * .079);
          }
          expect(after.userData.dinoHornRoot).toEqual({ surfaceSeated: true, interpretive: true, blendRows: 6 });
          verifySurface(after, size);
          // The disposed input remains untouched for callers retaining an old reference.
          expect(snapshot(f.geometry)).toEqual(before);
        } finally { f.release(); }
      });
    }
  }

  it('projects onto a tilted plane under a rotated, nonuniform parent transform', () => {
    const f = fixture({ tilt: .3, gap: .65, scale: [1.8, .8, 1.3] });
    try {
      expect(helpers.dinoSeatHornRoot(THREE, f.mesh, f.surface)).toBe(true);
      for (const vertex of [...Array(24).keys(), 577]) {
        const p = point(f.mesh.geometry.attributes.position, vertex);
        expect(p.sub(f.surface.position).dot(f.normal)).toBeLessThan(-f.radius * .06);
      }
      expect(f.disposed()).toBe(1);
      verifySurface(f.mesh.geometry, 1);
    } finally { f.release(); }
  });

  it('keeps already buried root samples in place while extending the exposed side', () => {
    const f = fixture({ tilt: .45, gap: .04 });
    try {
      expect(helpers.dinoSeatHornRoot(THREE, f.mesh, f.surface)).toBe(true);
      let unchanged = 0, extended = 0;
      for (let vertex = 0; vertex < 24; vertex++) {
        const before = point(f.geometry.attributes.position, vertex);
        const after = point(f.mesh.geometry.attributes.position, vertex);
        const delta = after.clone().sub(before);
        expect(delta.dot(f.axis)).toBeLessThanOrEqual(1e-7);
        expect(after.clone().sub(f.surface.position).dot(f.normal)).toBeLessThan(0);
        if (delta.lengthSq() === 0) unchanged++;
        else extended++;
      }
      expect(unchanged).toBeGreaterThan(0);
      expect(extended).toBeGreaterThan(0);
    } finally { f.release(); }
  });
});

describe('Unsupported horn root attachments retain their original geometry', () => {
  const cases = [
    ['missing surface', {}, f => null],
    ['surface without geometry', {}, f => ({})],
    ['surface beyond the search range', { gap: 10 }, f => f.surface],
    ['surface beyond the allowed root extension', { gap: 2.5 }, f => f.surface],
    ['surface almost parallel to the horn axis', { tilt: .98, gap: 0 }, f => f.surface],
    ['claw', { kind: 'claw' }, f => f.surface],
    ['short internal horn core', { coverage: .82 }, f => f.surface],
    ['reflected model transform', { scale: [-1, 1, 1] }, f => f.surface],
    ['singular model transform', { scale: [0, 1, 1] }, f => f.surface]
  ];
  for (const [name, options, surface] of cases) {
    it('falls back atomically for ' + name, () => {
      const f = fixture(options), before = snapshot(f.geometry);
      try {
        expect(helpers.dinoSeatHornRoot(THREE, f.mesh, surface(f))).toBe(false);
        expect(f.mesh.geometry).toBe(f.geometry);
        expect(snapshot(f.geometry)).toEqual(before);
        expect(f.disposed()).toBe(0);
      } finally { f.release(); }
    });
  }
  it('rejects a missing horn mesh', () => {
    expect(helpers.dinoSeatHornRoot(THREE, null, {})).toBe(false);
  });
});
