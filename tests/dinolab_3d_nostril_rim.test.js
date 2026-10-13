import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const T = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(process.env.DINO_NASAL_LIP_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
function functionText(name) {
  const start = source.indexOf('function ' + name + '('), open = source.indexOf('{', start);
  if (start < 0 || open < start) throw new Error('Missing production helper: ' + name);
  let depth = 1, end = open + 1;
  while (depth && end < source.length) { if (source[end] === '{') depth++; if (source[end] === '}') depth--; end++; }
  if (depth) throw new Error('Unbalanced production helper: ' + name);
  return source.slice(start, end);
}
const { anchorFor, rimFor } = new Function(functionText('dinoSurfaceAnchor') + '\n' + functionText('dinoNostrilRimGeometry') + '\nreturn { anchorFor: dinoSurfaceAnchor, rimFor: dinoNostrilRimGeometry };')();
function fingerprint(geometry) {
  const hash = createHash('sha256');
  for (const key of Object.keys(geometry.attributes).sort()) {
    const a = geometry.attributes[key]; hash.update(key + ':' + a.itemSize + ':' + a.normalized);
    hash.update(Buffer.from(a.array.buffer, a.array.byteOffset, a.array.byteLength));
  }
  if (geometry.index) hash.update(Buffer.from(geometry.index.array.buffer, geometry.index.array.byteOffset, geometry.index.array.byteLength));
  return hash.digest('hex');
}
function fixture(size, side, transformed) {
  const parent = new T.Group(), material = new T.MeshBasicMaterial({ side: T.DoubleSide });
  const surface = new T.Mesh(new T.SphereGeometry(size, 64, 48), material);
  surface.scale.set(1.15, .8, 1); parent.add(surface);
  const radius = size * .06, rim = new T.Mesh(new T.TorusGeometry(radius * 1.18, radius * .2, 7, 18), material);
  rim.position.set(0, 0, side * (size + radius * .15)); rim.scale.set(1.25, .56, 1); parent.add(rim);
  if (transformed) {
    parent.position.set(2 * size, -3 * size, .4 * size); parent.rotation.set(.21, -.19, .08); parent.scale.set(1.2, .85, 1.1);
    rim.rotation.set(.03, -.03, .04);
  }
  parent.updateMatrixWorld(true);
  return { parent, surface, rim, radius, dispose() { surface.geometry.dispose(); rim.geometry.dispose(); material.dispose(); } };
}
function expectVectorClose(a, b, tolerance) { expect(a.distanceTo(b)).toBeLessThan(tolerance); }

describe('Dino Lab nostril lips seated on the snout', () => {
  for (const size of [.003, 1, 24]) for (const side of [-1, 1]) for (const transformed of [false, true]) {
    it(`preserves the aperture and seats the outer edge at scale ${size}, side ${side}, transformed ${transformed}`, () => {
      const f = fixture(size, side, transformed), { rim, surface, radius } = f;
      const oldGeometry = rim.geometry, oldMaterial = rim.material;
      const before = { rim: fingerprint(oldGeometry), surface: fingerprint(surface.geometry), position: rim.position.toArray(), quaternion: rim.quaternion.toArray(), scale: rim.scale.toArray(), material: oldMaterial.toJSON() };
      const geometry = rimFor(T, rim, surface, radius, side);
      expect(geometry).not.toBeNull(); expect(geometry).not.toBe(oldGeometry);
      expect(rim.geometry).toBe(oldGeometry); expect(rim.material).toBe(oldMaterial);
      expect(fingerprint(oldGeometry)).toBe(before.rim); expect(fingerprint(surface.geometry)).toBe(before.surface);
      expect(rim.position.toArray()).toEqual(before.position); expect(rim.quaternion.toArray()).toEqual(before.quaternion); expect(rim.scale.toArray()).toEqual(before.scale); expect(oldMaterial.toJSON()).toEqual(before.material);
      const p = geometry.attributes.position, n = geometry.attributes.normal, uv = geometry.attributes.uv;
      const columns = geometry.userData.dinoNostrilRim.columns, rows = geometry.userData.dinoNostrilRim.rows, stride = columns + 1;
      expect(columns).toBe(32); expect(rows).toBe(7); expect(p.count).toBe(264); expect(geometry.index.count).toBe(1344);
      expect(geometry.userData.dinoNostrilRim.surfaceSeated).toBe(true); expect(geometry.userData.dinoNostrilRim.interpretive).toBe(true);
      const axis = new T.Vector3(0, 0, side).transformDirection(rim.matrixWorld), reach = radius * 4 * rim.getWorldScale(new T.Vector3()).length();
      const normalMatrix = new T.Matrix3().getNormalMatrix(rim.matrixWorld);
      let maxRelief = -Infinity;
      for (let i = 0; i < p.count; i++) {
        const point = new T.Vector3().fromBufferAttribute(p, i), normal = new T.Vector3().fromBufferAttribute(n, i), radial = Math.hypot(point.x, point.y);
        expect([...point.toArray(), ...normal.toArray(), uv.getX(i), uv.getY(i)].every(Number.isFinite)).toBe(true);
        expect(normal.length()).toBeCloseTo(1, 5); expect(radial).toBeGreaterThanOrEqual(.98 * radius - size * 1e-7); expect(radial).toBeLessThanOrEqual(1.62 * radius + size * 1e-7);
        expect(geometry.boundingBox.containsPoint(point)).toBe(true); expect(point.distanceTo(geometry.boundingSphere.center)).toBeLessThanOrEqual(geometry.boundingSphere.radius + size * 1e-7);
        expect(point.z * side).toBeLessThanOrEqual(.10 * radius + size * 1e-7); expect(point.z * side).toBeGreaterThan(-.92 * radius - size * 1e-7); maxRelief = Math.max(maxRelief, point.z * side);
        if (i < stride) { expect(point.z).toBe(0); expect(radial).toBeCloseTo(.98 * radius, size < 1 ? 9 : 5); }
        if (i >= rows * stride) {
          const planar = new T.Vector3(point.x, point.y, 0).applyMatrix4(rim.matrixWorld);
          const hit = anchorFor(T, surface, planar.clone().addScaledVector(axis, reach), axis.clone().negate(), 2 * reach);
          expect(hit).not.toBeNull();
          const projected = rim.worldToLocal(hit.point.clone());
          expect(Math.abs(point.z - projected.z + side * .02 * radius)).toBeLessThan(size * 2e-7);
          expectVectorClose(normal.applyMatrix3(normalMatrix).normalize(), hit.normal, 2e-6);
        }
      }
      expect(Math.abs(maxRelief - .10 * radius)).toBeLessThan(size * 1e-7);
      for (let row = 0; row <= rows; row++) {
        expectVectorClose(new T.Vector3().fromBufferAttribute(p, row * stride), new T.Vector3().fromBufferAttribute(p, row * stride + columns), 1e-12);
        expectVectorClose(new T.Vector3().fromBufferAttribute(n, row * stride), new T.Vector3().fromBufferAttribute(n, row * stride + columns), 1e-12);
        expect(uv.getX(row * stride)).toBe(0); expect(uv.getX(row * stride + columns)).toBe(1);
      }
      for (let i = 0; i < geometry.index.count; i += 3) {
        const [a, b, c] = Array.from(geometry.index.array.slice(i, i + 3), id => new T.Vector3().fromBufferAttribute(p, id));
        const face = b.sub(a).cross(c.sub(a));
        expect(face.z * side).toBeGreaterThan(size * size * 1e-9);
      }
      const generatedMesh = new T.Mesh(geometry, oldMaterial);
      generatedMesh.updateMatrixWorld(true);
      expect(new T.Raycaster(new T.Vector3(0, 0, side * radius * 4), new T.Vector3(0, 0, -side), 0, radius * 8).intersectObject(generatedMesh, false)).toHaveLength(0);
      geometry.dispose(); f.dispose();
    });
  }

  const failures = [
    ['missing rim', f => [null, f.surface, f.radius, 1]],
    ['missing surface', f => [f.rim, null, f.radius, 1]],
    ['surface without geometry', f => [f.rim, {}, f.radius, 1]],
    ['zero radius', f => [f.rim, f.surface, 0, 1]],
    ['negative radius', f => [f.rim, f.surface, -f.radius, 1]],
    ['NaN radius', f => [f.rim, f.surface, NaN, 1]],
    ['infinite radius', f => [f.rim, f.surface, Infinity, 1]],
    ['unsupported projection', f => { f.rim.position.x = 4; return [f.rim, f.surface, f.radius, 1]; }],
    ['distant surface', f => { f.rim.position.z += f.radius * 1.2; return [f.rim, f.surface, f.radius, 1]; }],
    ['steep surface', f => { f.surface.geometry.dispose(); f.surface.geometry = new T.PlaneGeometry(10, 10); f.surface.rotation.y = Math.acos(.1); f.surface.position.copy(f.rim.position); return [f.rim, f.surface, f.radius, 1]; }]
  ];
  for (const [name, argsFor] of failures) {
    it(`keeps the existing rim and allocates no replacement for ${name}`, () => {
      const f = fixture(1, 1, false), original = f.rim.geometry;
      const dispose = vi.spyOn(original, 'dispose'), geometryConstructor = vi.fn(function () { throw new Error('Fallback must not allocate a BufferGeometry'); });
      const checkedT = { ...T, BufferGeometry: geometryConstructor };
      expect(rimFor(checkedT, ...argsFor(f))).toBeNull(); expect(geometryConstructor).not.toHaveBeenCalled(); expect(dispose).not.toHaveBeenCalled(); expect(f.rim.geometry).toBe(original);
      dispose.mockRestore(); f.dispose();
    });
  }
});

describe('Nostril construction replacement ownership', () => {
  const start = source.indexOf('                if (nostrilFrame) {\n                  var nasalLip = dinoNostrilRimGeometry('), end = source.indexOf('                var mouthStart = ', start);
  if (start < 0 || end < start) throw new Error('Nostril replacement branch missing');
  const replace = new Function('THREE', 'nostrilRim', 'headShell', 'nostrilRadius', 'faceSide', 'nostrilFrame', 'dinoNostrilRimGeometry', source.slice(start, end));
  for (const mode of ['success', 'unsupported', 'no frame']) {
    it(`disposes the old torus only after a complete replacement: ${mode}`, () => {
      const f = fixture(1, 1, true), old = f.rim.geometry, dispose = vi.spyOn(old, 'dispose');
      const helper = vi.fn((...args) => mode === 'unsupported' ? null : rimFor(...args));
      replace(T, f.rim, f.surface, f.radius, 1, mode !== 'no frame', helper);
      if (mode === 'success') { expect(helper).toHaveBeenCalledTimes(1); expect(dispose).toHaveBeenCalledTimes(1); expect(f.rim.geometry).not.toBe(old); expect(f.rim.geometry.userData.dinoNostrilRim.surfaceSeated).toBe(true); }
      else { expect(dispose).not.toHaveBeenCalled(); expect(f.rim.geometry).toBe(old); expect(helper).toHaveBeenCalledTimes(mode === 'no frame' ? 0 : 1); }
      expect(f.rim.parent).toBe(f.parent); expect(f.rim.material).toBe(f.surface.material);
      dispose.mockRestore(); f.dispose();
    });
  }
});
