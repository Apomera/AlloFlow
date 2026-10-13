import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(process.env.DINO_FRILL_REFINEMENT_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const fixture = JSON.parse(readFileSync(process.env.DINO_FRILL_LEGACY_FIXTURE || resolve('tests/fixtures/dinolab_frill_legacy_samples.json'), 'utf8'));
const start = source.indexOf('// DINO_DISPLAY_SHELL_START'), end = source.indexOf('// DINO_DISPLAY_SHELL_END', start);
if (start < 0 || end < start) throw new Error('Display shell helper markers missing');
const api = new Function(source.slice(start, end) + ';return {dinoDisplayShellGeometry,dinoFrillGeometry,dinoBonyFrillGeometry,dinoPlateGeometry};')();
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = array => Buffer.from(array.buffer, array.byteOffset, array.byteLength);
const point = (g, i) => new THREE.Vector3().fromBufferAttribute(g.attributes.position, i);

// The fixture was measured from the preceding source and vendor build, not from
// this implementation. Reassemble every original angular sample in its original
// buffer order; all newly interleaved samples are excluded from this comparison.
function legacyHash(geometry, name, rings) {
  const attr = geometry.attributes[name], oldBack = 1 + rings * 64, newBack = 1 + rings * 128;
  const originalCount = 2 + (2 * rings - 1) * 64, values = new Float32Array(originalCount * attr.itemSize);
  for (let i = 0; i < originalCount; i++) {
    const back = i >= oldBack, faceIndex = back ? i - oldBack : i;
    const current = (back ? newBack : 0) + (faceIndex === 0 ? 0 : 1 + Math.floor((faceIndex - 1) / 64) * 128 + ((faceIndex - 1) % 64) * 2);
    for (let c = 0; c < attr.itemSize; c++) values[i * attr.itemSize + c] = attr.array[current * attr.itemSize + c];
  }
  return sha(bytes(values));
}
function fullHash(geometry) {
  const hash = createHash('sha256');
  for (const name of ['position', 'normal', 'uv']) { hash.update(name); hash.update(bytes(geometry.attributes[name].array)); }
  hash.update('index'); hash.update(bytes(geometry.index.array)); return hash.digest('hex');
}
function closed(geometry, scale) {
  const p = geometry.attributes.position, n = geometry.attributes.normal, index = geometry.index.array, edges = new Map();
  let volume = 0, minArea = Infinity, maxNormalError = 0;
  for (let i = 0; i < p.count; i++) {
    const v = point(geometry, i), normal = new THREE.Vector3().fromBufferAttribute(n, i);
    expect([...v.toArray(), ...normal.toArray()].every(Number.isFinite)).toBe(true);
    maxNormalError = Math.max(maxNormalError, Math.abs(normal.length() - 1));
    expect(geometry.boundingBox.containsPoint(v)).toBe(true);
    expect(v.distanceTo(geometry.boundingSphere.center)).toBeLessThanOrEqual(geometry.boundingSphere.radius + scale * 1e-6);
  }
  for (let i = 0; i < index.length; i += 3) {
    const a = point(geometry, index[i]), b = point(geometry, index[i + 1]), c = point(geometry, index[i + 2]);
    minArea = Math.min(minArea, b.clone().sub(a).cross(c.clone().sub(a)).length());
    volume += a.dot(b.clone().cross(c)) / 6;
    for (let edge = 0; edge < 3; edge++) {
      const from = index[i + edge], to = index[i + (edge + 1) % 3], key = Math.min(from, to) + ':' + Math.max(from, to);
      const entry = edges.get(key) || { count: 0, direction: 0 }; entry.count++; entry.direction += from < to ? 1 : -1; edges.set(key, entry);
    }
  }
  expect(maxNormalError).toBeLessThan(1e-6); expect(minArea).toBeGreaterThan(scale * scale * 1e-9); expect(volume).toBeGreaterThan(0);
  expect([...edges.values()].every(edge => edge.count === 2 && edge.direction === 0)).toBe(true);
  expect(p.count - edges.size + index.length / 3).toBe(2);
}
function rimError(geometry, sides, height, width, bow) {
  let sum = 0, maximum = 0;
  for (let i = 0; i < 4096; i++) {
    const angle = (i + .5) / 4096 * Math.PI * 2, t = angle / (Math.PI * 2) * sides, side = Math.floor(t), fraction = t - side;
    const a = point(geometry, 1 + 8 * 128 + side * (128 / sides));
    const b = point(geometry, 1 + 8 * 128 + ((side + 1) % sides) * (128 / sides));
    const edge = 1 + .025 * Math.cos(angle * 14), y = Math.max(-height * .48, Math.sin(angle) * height * edge);
    const expected = new THREE.Vector3(y * .60 + bow, y, Math.cos(angle) * width * edge);
    const error = a.lerp(b, fraction).distanceTo(expected); sum += error * error; maximum = Math.max(maximum, error);
  }
  return { rms: Math.sqrt(sum / 4096), maximum };
}

describe('Dino Lab frill angular refinement', () => {
  it('uses measurements pinned to the previous source and the installed Three.js build', () => {
    expect(fixture.sourceSHA256).toBe('b0eead4432bd2e80ca579ac358d528905d28d9faafe05441f13ae97c31ea275e');
    expect(sha(readFileSync(resolve('vendor/three-r128/three.min.js')))).toBe(fixture.vendorSHA256);
    expect(fixture.samples).toHaveLength(12);
  });
  for (const sample of fixture.samples) {
    it('retains every legacy position and UV with a closed shell: ' + JSON.stringify({ scale: sample.scale, bow: sample.bow, solid: sample.solid }), () => {
      const { scale, bow, solid } = sample, g = api.dinoFrillGeometry(THREE, scale, .82 * scale, bow * scale, solid);
      try {
        expect(g.userData.dinoDisplayShell.angularSamples).toBe(128);
        expect(g.attributes.position.count).toBe(2178); expect(g.index.count).toBe(13056);
        expect(legacyHash(g, 'position', 9)).toBe(sample.position); expect(legacyHash(g, 'uv', 9)).toBe(sample.uv);
        closed(g, scale);
      } finally { g.dispose(); }
    });
  }
  for (const sample of fixture.samples.filter(row => row.solid)) {
    it('matches the denser skin and preserves all legacy bone coordinates at scale ' + sample.scale + ', bow ' + sample.bow, () => {
      const skin = api.dinoFrillGeometry(THREE, sample.scale, .82 * sample.scale, sample.bow * sample.scale, true), bone = api.dinoBonyFrillGeometry(THREE, skin);
      try {
        expect(bone.userData.dinoDisplayShell.angularSamples).toBe(128);
        expect(bone.attributes.position.count).toBe(1666); expect(bone.index.count).toBe(9984);
        expect(legacyHash(bone, 'position', 7)).toBe(sample.bonePosition); expect(legacyHash(bone, 'uv', 7)).toBe(sample.boneUV);
        closed(bone, sample.scale);
        const boneBack = 1 + 7 * 128, skinBack = 1 + 9 * 128;
        for (let i = 0; i < bone.attributes.position.count; i++) {
          const skinIndex = i >= boneBack ? i - boneBack : i, a = point(skin, skinIndex), b = point(skin, skinIndex + skinBack), p = point(bone, i), segment = b.clone().sub(a);
          const t = p.clone().sub(a).dot(segment) / segment.lengthSq();
          expect(t).toBeGreaterThan(.1); expect(t).toBeLessThan(.9);
          expect(a.addScaledVector(segment, t).distanceTo(p)).toBeLessThan(sample.scale * 1e-6);
        }
      } finally { skin.dispose(); bone.dispose(); }
    });
  }
  for (const scale of [.03, 1, 12]) it('reduces error against the established scalloped outline at scale ' + scale, () => {
    const g = api.dinoFrillGeometry(THREE, scale, .82 * scale, .13 * scale, true);
    try {
      const legacy = rimError(g, 64, scale, .82 * scale, .13 * scale), refined = rimError(g, 128, scale, .82 * scale, .13 * scale);
      expect(refined.rms).toBeLessThan(legacy.rms * .4); expect(refined.maximum).toBeLessThan(legacy.maximum * .7);
    } finally { g.dispose(); }
  });
  it('retains the exact established Stegosaurus plate buffers and default resolution', () => {
    const g = api.dinoPlateGeometry(THREE, .7, 1.2, .07);
    try { expect(g.attributes.position.count).toBe(1090); expect(g.userData.dinoDisplayShell.angularSamples).toBe(64); expect(fullHash(g)).toBe('f44d719978d6da1b211e3088cd6d3417c6bd4a582c41f76c33c9a616278d8033'); }
    finally { g.dispose(); }
  });
  it('keeps default shell buffers unchanged for unsupported angular sample inputs', () => {
    const make = value => api.dinoDisplayShellGeometry(THREE, (r, angle) => new THREE.Vector3(Math.cos(angle) * r, -Math.sin(angle) * r, 0), new THREE.Vector3(0, 0, 1), .06, null, value);
    const baseline = make();
    try {
      for (const value of [undefined, null, false, true, 0, 32, 64, 127, 129, 256, '128', NaN, Infinity, {}]) {
        const g = make(value); try { expect(g.attributes.position.count).toBe(1090); expect(g.userData.dinoDisplayShell.angularSamples).toBe(64); expect(fullHash(g)).toBe(fullHash(baseline)); } finally { g.dispose(); }
      }
    } finally { baseline.dispose(); }
  });
});
