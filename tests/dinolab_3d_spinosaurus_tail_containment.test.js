import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { THREE, vec, nativeTailHarness } from './helpers/dino_native_tail_harness.js';

const source = readFileSync(process.env.DINO_SPINOSAURUS_TAIL_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const { art, build } = nativeTailHarness(source);

function outsideVertices(built) {
  // Intersect each native triangle along Z. A small XY bucket grid avoids
  // repeating the renderer raycaster's thousands of triangle allocations for
  // every bone vertex; the barycentric test still uses the actual loft mesh.
  const geometry = built.skin.geometry, p = geometry.attributes.position, ix = geometry.index;
  const vertices = Array.from({ length: p.count }, (_, index) => vec().fromBufferAttribute(p, index).applyMatrix4(built.skin.matrixWorld));
  const box = new THREE.Box3().setFromPoints(vertices), grid = new Map(), cells = 64;
  const sx = (cells - 1) / (box.max.x - box.min.x), sy = (cells - 1) / (box.max.y - box.min.y);
  const gx = x => Math.max(0, Math.min(cells - 1, Math.floor((x - box.min.x) * sx)));
  const gy = y => Math.max(0, Math.min(cells - 1, Math.floor((y - box.min.y) * sy)));
  for (let index = 0; index < ix.count; index += 3) {
    const a = vertices[ix.getX(index)], b = vertices[ix.getX(index + 1)], c = vertices[ix.getX(index + 2)];
    const denominator = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
    if (Math.abs(denominator) < built.context.ht * built.context.ht * 1e-15) continue;
    const triangle = { a, b, c, denominator };
    for (let x = gx(Math.min(a.x, b.x, c.x)); x <= gx(Math.max(a.x, b.x, c.x)); x++) {
      for (let y = gy(Math.min(a.y, b.y, c.y)); y <= gy(Math.max(a.y, b.y, c.y)); y++) {
        const key = x * cells + y, bucket = grid.get(key) || [];
        bucket.push(triangle); grid.set(key, bucket);
      }
    }
  }
  const point = vec(), tolerance = built.context.ht * 1e-7;
  function isInside(point) {
    let minZ = Infinity, maxZ = -Infinity;
    for (const { a, b, c, denominator } of grid.get(gx(point.x) * cells + gy(point.y)) || []) {
      const u = ((b.y - c.y) * (point.x - c.x) + (c.x - b.x) * (point.y - c.y)) / denominator;
      const v = ((c.y - a.y) * (point.x - c.x) + (a.x - c.x) * (point.y - c.y)) / denominator;
      const w = 1 - u - v;
      if (u < -1e-8 || v < -1e-8 || w < -1e-8) continue;
      const z = u * a.z + v * b.z + w * c.z;
      minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    }
    return point.z >= minZ - tolerance && point.z <= maxZ + tolerance;
  }
  const failures = new Map();
  for (const bone of built.bones) {
    const positions = bone.geometry.attributes.position;
    for (let index = 0; index < positions.count; index++) {
      point.fromBufferAttribute(positions, index).applyMatrix4(bone.matrixWorld);
      if (!isInside(point)) {
        const label = bone.name || bone.geometry.type;
        const previous = failures.get(label) || { count: 0, example: point.toArray() };
        previous.count++; failures.set(label, previous);
      }
    }
  }
  return Object.fromEntries(failures);
}

describe('Spinosaurus deep-tail evidence boundaries', () => {
  it('confines the new shape to the named theropod without changing other native envelopes', () => {
    const envelope = { points: [vec(-1, 1, 0), vec(0, 1, 0), vec(1, 1, 0), vec(2, 1, 0)], radii: [[.3, .2], [.25, .15], [.1, .05], [.01, .01]] };
    for (const dn of art.DINOS.filter(dino => dino.id !== 'spinosaurus')) {
      expect(art.dinoSpinosaurusTailSection(dn, .5, 4), dn.id).toBeNull();
      expect(art.dinoSpinosaurusTailEnvelope(THREE, dn, envelope, envelope.points[1], envelope.points.at(-1), 4, 1), dn.id).toBe(envelope);
    }
    expect(art.dinoSpinosaurusTailSection({ id: 'spinosaurus', group: 'outgroup' }, .5, 4)).toBeNull();
    for (const height of [0, -1, Infinity, NaN]) expect(art.dinoSpinosaurusTailSection({ id: 'spinosaurus', group: 'theropod' }, .5, height)).toBeNull();
    expect(art.dinoSpinosaurusTailSection({ id: 'spinosaurus', group: 'theropod' }, NaN, 4)).toBeNull();
  });
  it('keeps a laterally narrow, deep middle and graded finite distal taper', () => {
    const dn = { id: 'spinosaurus', group: 'theropod' };
    let priorHeight = Infinity, priorWidth = Infinity;
    for (let index = 0; index <= 100; index++) {
      const shape = art.dinoSpinosaurusTailSection(dn, index / 100, 4);
      expect(shape.height).toBeGreaterThan(0); expect(shape.width).toBeGreaterThan(0);
      expect(shape.height).toBeGreaterThan(shape.width);
      expect(shape.height).toBeLessThanOrEqual(priorHeight + 1e-9); expect(shape.width).toBeLessThanOrEqual(priorWidth + 1e-9);
      priorHeight = shape.height; priorWidth = shape.width;
    }
    const middle = art.dinoSpinosaurusTailSection(dn, .52, 4);
    expect(middle.height / middle.width).toBeGreaterThan(5);
    const distal = art.dinoSpinosaurusTailSection(dn, .89, 4);
    expect(distal.height / distal.width).toBeGreaterThan(7);
  });
});

describe('Native Spinosaurus tail surface and skeletal support', () => {
  for (const scale of [.05, 1, 8]) for (const tissueScale of [.90, 1, 1.04]) {
    it('contains the native caudal skeleton at model scale ' + scale + ', tissue scale ' + tissueScale, () => {
      const built = build(scale, tissueScale);
      try {
        const { context, skin, bones } = built;
        expect(context.tailSkinEnvelope.points).toHaveLength(8);
        expect(context.tailSkinEnvelope.points[1]).toBe(context.hip);
        expect(context.tailSkinEnvelope.points.at(-1)).toBe(context.tail);
        expect(skin.position.toArray()).toEqual(context.hip.toArray());
        expect(skin.userData.dinoDeepTail.source).toBe('https://doi.org/10.1038/s41586-020-2190-3');
        const neural = bones.filter(bone => bone.name === 'spinosaurus-caudal-neural-spine');
        const haemal = bones.filter(bone => bone.name === 'spinosaurus-elongate-chevron');
        expect(neural).toHaveLength(13); expect(haemal).toHaveLength(12);
        expect(neural.every(bone => bone.userData.dinoTailSupport.inferred)).toBe(true);
        for (const bone of [skin, ...bones]) {
          for (const attr of Object.values(bone.geometry.attributes)) expect(Array.from(attr.array).every(Number.isFinite)).toBe(true);
        }
        expect(outsideVertices(built)).toEqual({});
      } finally { built.dispose(); }
    }, 30000);
  }
});
