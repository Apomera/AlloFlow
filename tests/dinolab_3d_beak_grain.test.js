import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { internals } from './helpers/dino_lab_harness.js';

const T = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const mapBeak = new Function('return ' + source.match(/  function dinoBeakGrainCoordinates\([\s\S]*?\r?\n  \}/)[0])();
const { dinoSurfaceGeometry } = internals();
const digest = array => createHash('sha256').update(Buffer.from(array.buffer, array.byteOffset, array.byteLength)).digest('hex');
function beak(scale = 1, sides = 24) {
  return dinoSurfaceGeometry(T, [new T.Vector3(), new T.Vector3(-scale, -.04 * scale, 0), new T.Vector3(-1.3 * scale, -.1 * scale, 0)],
    [[.2 * scale, .3 * scale], [.15 * scale, .2 * scale], [.01 * scale, .04 * scale]], { smoothProfile: true, sides });
}
function snapshot(g) {
  return { attrs: Object.fromEntries(Object.entries(g.attributes).map(([name, attr]) => [name, { object: attr, array: attr.array, hash: digest(attr.array), version: attr.version }])),
    index: g.index ? { object: g.index, hash: digest(g.index.array) } : null, bounds: [g.boundingBox.min.toArray(), g.boundingBox.max.toArray(), g.boundingSphere.center.toArray(), g.boundingSphere.radius] };
}

describe('Plain beak material coordinates', () => {
  for (const scale of [.03, 1, 12]) for (const sides of [24, 48]) {
    it('retains the exact surface and a continuous wrapped seam at scale ' + scale + ', sides ' + sides, () => {
      const g = beak(scale, sides), before = snapshot(g);
      try {
        expect(mapBeak(T, g)).toBe(true);
        const after = snapshot(g), coords = g.attributes.dinoKeratin, uv = g.attributes.uv;
        for (const name of Object.keys(before.attrs)) expect(after.attrs[name]).toEqual(before.attrs[name]);
        expect(after.index).toEqual(before.index); expect(after.bounds).toEqual(before.bounds);
        expect(coords.count).toBe(g.attributes.position.count); expect([...coords.array].every(Number.isFinite)).toBe(true);
        for (let ring = 0; ring <= 48; ring++) {
          const first = ring * (sides + 1), last = first + sides;
          expect(Array.from(coords.array.slice(first * 4, first * 4 + 4))).toEqual(Array.from(coords.array.slice(last * 4, last * 4 + 4)));
        }
        for (let i = 0; i < coords.count - 2; i++) {
          expect(Math.hypot(coords.getX(i), coords.getY(i))).toBeCloseTo(1, 6);
          expect(coords.getZ(i)).toBe(uv.getX(i)); expect(coords.getW(i)).toBeCloseTo(.55, 6);
        }
        for (const i of [coords.count - 2, coords.count - 1]) {
          expect(coords.getX(i)).toBe(0); expect(coords.getY(i)).toBe(0); expect(coords.getW(i)).toBe(0);
        }
        const same = coords.array; expect(mapBeak(T, g)).toBe(false); expect(g.attributes.dinoKeratin.array).toBe(same);
      } finally { g.dispose(); }
    });
  }
  it('preserves an existing mapped beak and its metadata', () => {
    const g = beak(), existing = new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 4).fill(.2), 4), metadata = { keep: true };
    g.setAttribute('dinoKeratin', existing); g.userData.dinoBeakGrain = metadata;
    try { expect(mapBeak(T, g)).toBe(false); expect(g.attributes.dinoKeratin).toBe(existing); expect(g.userData.dinoBeakGrain).toBe(metadata); } finally { g.dispose(); }
  });
  it('rejects missing, unsupported or invalid lofts without a partial material mapping', () => {
    expect(mapBeak(T, null)).toBe(false);
    for (const kind of ['unsupported', 'uv', 'index', 'invalid']) {
      const g = beak(1, kind === 'unsupported' ? 12 : 24);
      if (kind === 'uv') g.deleteAttribute('uv');
      if (kind === 'index') g.setIndex(null);
      if (kind === 'invalid') g.attributes.uv.setX(g.attributes.uv.count - 1, NaN);
      try { const before = snapshot(g); expect(mapBeak(T, g)).toBe(false); expect(g.attributes.dinoKeratin).toBeUndefined(); expect(g.userData.dinoBeakGrain).toBeUndefined(); expect(snapshot(g)).toEqual(before); }
      finally { g.dispose(); }
    }
  });
});
