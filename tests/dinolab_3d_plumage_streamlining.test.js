import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const T = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(process.env.DINO_PLUMAGE_STREAMLINING_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const helper = name => {
  const match = source.match(new RegExp('  function ' + name + '\\([\\s\\S]*?\\r?\\n  \\}\\r?\\n'));
  if (!match) throw new Error('Missing production helper: ' + name);
  return match[0];
};
const { coat, skinCoordinates } = new Function(
  helper('mulberry32') + '\n' + helper('dinoCoatGeometry') + '\n' + helper('dinoSkinCoordinates') +
  '\nreturn {coat:dinoCoatGeometry, skinCoordinates:dinoSkinCoordinates};'
)();
const vector = (attribute, i) => new T.Vector3().fromBufferAttribute(attribute, i);
const bytes = attribute => Buffer.from(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength);
function digest(geometry) {
  const hash = createHash('sha256');
  for (const name of Object.keys(geometry.attributes).sort()) hash.update(name).update(bytes(geometry.attributes[name]));
  hash.update(bytes(geometry.index));
  hash.update(JSON.stringify([geometry.parameters, geometry.boundingBox, geometry.boundingSphere]));
  return hash.digest('hex');
}
const rootCenter = (g, start, row) => vector(g.attributes.position, start + row * 3)
  .add(vector(g.attributes.position, start + row * 3 + 2)).multiplyScalar(.5);

describe('Dino Lab slender overlapping contour plumage', () => {
  for (const scale of [.02, 1, 9]) for (const openVane of [false, true]) {
    it('samples slender, low-camber vanes with finite curved lighting at scale ' + scale + ', open ' + openVane, () => {
      const surface = new T.PlaneGeometry(2 * scale, 2 * scale, 6, 6);
      const g = coat(T, surface, { count: 12, length: .2 * scale, seed: 72, pennaceous: true, streamlined: true, openVane });
      try {
        expect(g.parameters.streamlined).toBe(true); expect(g.parameters.openVane).toBe(openVane);
        expect(g.attributes.position.count).toBe(12 * 18); expect(g.index.count).toBe(12 * 60);
        const p = g.attributes.position, n = g.attributes.normal, root = g.attributes.dinoCoatRoot;
        for (const attribute of Object.values(g.attributes)) expect([...attribute.array].every(Number.isFinite)).toBe(true);
        for (let start = 0; start < p.count; start += 18) {
          const origin = vector(root, start), rootNormal = vector(g.attributes.dinoCoatNormal, start);
          const span = rootCenter(g, start, 5).sub(rootCenter(g, start, 0));
          const along = new T.Vector3(1, -.12, 0).normalize();
          const length = span.dot(along);
          let maxWidth = 0, maxLift = 0, maxCamber = 0, changingNormal = 0;
          for (let row = 0; row <= 5; row++) {
            const center = rootCenter(g, start, row);
            const left = vector(p, start + row * 3), right = vector(p, start + row * 3 + 2);
            maxWidth = Math.max(maxWidth, left.distanceTo(right));
            maxLift = Math.max(maxLift, center.clone().sub(origin).dot(rootNormal));
            maxCamber = Math.max(maxCamber, vector(p, start + row * 3 + 1).sub(center).dot(rootNormal));
            for (let column = 0; column < 3; column++) {
              const vertex = start + row * 3 + column, visibleNormal = vector(n, vertex);
              expect(visibleNormal.length()).toBeCloseTo(1, 5);
              expect(vector(root, vertex).distanceTo(origin)).toBe(0);
              expect(g.boundingBox.containsPoint(vector(p, vertex))).toBe(true);
              expect(vector(p, vertex).distanceTo(g.boundingSphere.center)).toBeLessThanOrEqual(g.boundingSphere.radius + scale * 2e-6);
              changingNormal = Math.max(changingNormal, Math.abs(visibleNormal.dot(along)));
            }
          }
          expect(maxWidth / length).toBeGreaterThan(openVane ? .19 : .16);
          expect(maxWidth / length).toBeLessThan(openVane ? .24 : .21);
          expect(maxLift / length).toBeLessThan(openVane ? .13 : .10);
          expect(maxCamber / length).toBeGreaterThan(.01); expect(maxCamber / length).toBeLessThan(.016);
          expect(changingNormal).toBeGreaterThan(.05);
        }
      } finally { g.dispose(); surface.dispose(); }
    });
  }

  it('retains a looser, broader open-vane interpretation at identical seeded roots', () => {
    const surface = new T.PlaneGeometry(2, 2, 6, 6), options = { count: 24, length: .2, seed: 517, pennaceous: true, streamlined: true };
    const closed = coat(T, surface, options), open = coat(T, surface, { ...options, openVane: true });
    try {
      for (const name of ['dinoCoatRoot', 'dinoCoatNormal', 'color', 'uv', 'dinoCoatVane']) expect(bytes(open.attributes[name])).toEqual(bytes(closed.attributes[name]));
      for (let start = 0; start < closed.attributes.position.count; start += 18) {
        const row = 3, at = start + row * 3;
        const width = g => vector(g.attributes.position, at).distanceTo(vector(g.attributes.position, at + 2));
        const height = g => rootCenter(g, start, row).z - g.attributes.dinoCoatRoot.getZ(start);
        expect(width(open)).toBeGreaterThan(width(closed) * 1.12);
        expect(height(open)).toBeGreaterThan(height(closed) * 1.2);
      }
    } finally { closed.dispose(); open.dispose(); surface.dispose(); }
  });

  it('trades longitudinal subdivisions for denser overlapping roots within the old vertex and triangle budget', () => {
    const surface = new T.SphereGeometry(1, 18, 12);
    try {
      for (const requested of [100, 180, 240, 420, 1100]) for (const coverage of [.2, .35, .61, 1]) {
        const roots = Math.round(requested * coverage), count = Math.floor(roots * 1.5);
        const old = coat(T, surface, { count: roots, length: .12, seed: 42, pennaceous: true });
        const g = coat(T, surface, { count, length: .12, seed: 42, pennaceous: true, streamlined: true });
        try {
          expect(g.parameters.roots).toBe(Math.min(1600, count));
          expect(g.parameters.roots).toBeGreaterThan(old.parameters.roots);
          expect(g.attributes.position.count).toBeLessThanOrEqual(old.attributes.position.count);
          expect(g.index.count).toBeLessThanOrEqual(old.index.count);
          expect(g.groups).toHaveLength(0);
        } finally { old.dispose(); g.dispose(); }
      }
    } finally { surface.dispose(); }
  });

  it('preserves seeded geometry exactly on repeat and changes neighboring root distributions with a new seed', () => {
    const surface = new T.SphereGeometry(1, 18, 12), options = { count: 64, length: .18, seed: 718, pennaceous: true, streamlined: true };
    const a = coat(T, surface, options), b = coat(T, surface, options), c = coat(T, surface, { ...options, seed: 719 });
    try { expect(digest(a)).toBe(digest(b)); expect(digest(a)).not.toBe(digest(c)); }
    finally { a.dispose(); b.dispose(); c.dispose(); surface.dispose(); }
  });

  it('keeps pigment coordinates at the true skin roots and normals after transformed coat geometry is baked', () => {
    const surface = new T.SphereGeometry(1, 18, 12);
    const g = coat(T, surface, { count: 36, length: .2, seed: 531, pennaceous: true, streamlined: true, openVane: true });
    try {
      const before = Object.fromEntries(Object.entries(g.attributes).map(([name, attribute]) => [name, Buffer.from(bytes(attribute))]));
      const matrix = new T.Matrix4().compose(new T.Vector3(2, -.3, 1), new T.Quaternion().setFromEuler(new T.Euler(.2, -.35, .18)), new T.Vector3(1.2, .8, 1.1));
      const normalMatrix = new T.Matrix3().getNormalMatrix(matrix);
      skinCoordinates(T, g, matrix, true);
      for (const [name, content] of Object.entries(before)) expect(bytes(g.attributes[name])).toEqual(content);
      for (let i = 0; i < g.attributes.position.count; i++) {
        expect(vector(g.attributes.dinoSkinPosition, i).distanceTo(vector(g.attributes.dinoCoatRoot, i).applyMatrix4(matrix))).toBeLessThan(5e-7);
        expect(vector(g.attributes.dinoSkinNormal, i).distanceTo(vector(g.attributes.dinoCoatNormal, i).applyMatrix3(normalMatrix).normalize())).toBeLessThan(1e-6);
        expect(g.attributes.dinoSkinRegion.getX(i)).toBe(g.attributes.uv.getX(i)); expect(g.attributes.dinoSkinRegion.getY(i)).toBe(1);
      }
    } finally { g.dispose(); surface.dispose(); }
  });

  it('keeps roots on the eligible side of the skin with anatomical masks and front-edge taper', () => {
    const surface = new T.SphereGeometry(1, 24, 16);
    const g = coat(T, surface, { count: 48, length: .16, seed: 23, pennaceous: true, streamlined: true, dorsalOnly: true, minX: -.3, maxU: .65, taper: { x: [-.3, .25, .2] } });
    try {
      expect(g.parameters.roots).toBe(48);
      for (let start = 0; start < g.attributes.position.count; start += 18) {
        const root = vector(g.attributes.dinoCoatRoot, start), normal = vector(g.attributes.dinoCoatNormal, start);
        expect(root.x).toBeGreaterThanOrEqual(-.300001); expect(normal.y).toBeGreaterThan(.45);
        expect(g.attributes.uv.getX(start)).toBeLessThanOrEqual(.650001);
        expect(root.length()).toBeGreaterThan(.95); expect(root.length()).toBeLessThanOrEqual(1.000001);
      }
    } finally { g.dispose(); surface.dispose(); }
  });

  // Recorded before this change. The production opt-in changes pennaceous coats
  // while these complete hashes guard the existing filament and legacy modes.
  for (const [kind, filamentHash, legacyHash] of [
    ['plane', 'fb7389e14d5cfcf45afa73927eb93a91b1d981059648d2337d64322ba986104c', 'cabc17dc455a92a8b9580c68cab76839ec5fc45335ed651a92e35ecb120b260d'],
    ['sphere', '59474328b15253535114fad1332ec7aec5cf4b281db85859de3058899828b5e5', 'ebd1850b9a38a815f30d6c37d02fde07ef2c8c23c402ea64e36b314571d3adec']
  ]) it('keeps all previous filament buffers and opt-out pennaceous geometry exact on ' + kind, () => {
    const surface = kind === 'plane' ? new T.PlaneGeometry(2, 2, 6, 6) : new T.SphereGeometry(1, 18, 12);
    const options = { count: 23, length: .2, seed: 519, taper: { u: [.55, .4] } };
    const filament = coat(T, surface, { ...options, streamlined: true, openVane: true });
    const legacy = coat(T, surface, { ...options, pennaceous: true });
    try { expect(digest(filament)).toBe(filamentHash); expect(digest(legacy)).toBe(legacyHash); }
    finally { filament.dispose(); legacy.dispose(); surface.dispose(); }
  });
});
