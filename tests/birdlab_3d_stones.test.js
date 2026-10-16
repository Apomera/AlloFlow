import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/birdlab_3d_habitat.js', 'utf8');
const math = source.slice(source.indexOf('function smooth('), source.indexOf('function groundHeight('));
const periodic = source.slice(source.indexOf('function tileNoise('), source.indexOf('for (var mossY'));
const stoneBody = source.slice(source.indexOf('var stoneGeo ='), source.indexOf('var stoneMat ='));
const textureBody = source.slice(source.indexOf('var stoneCanvas ='), source.indexOf('var stoneGeo ='));

// Run the production sculpting and seam repair with bundled Three. The optional
// prefix captures geometry immediately before repair, without copying its math.
function stoneGeometry(detailed, beforeRepair = false) {
  const body = beforeRepair ? stoneBody.slice(0, stoneBody.indexOf('// Sphere UVs')) : stoneBody;
  return new Function('THREE', 'detailed', `function geometry(value) { return value; }
    ${math}
    ${body}
    return stoneGeo;`)(THREE, detailed);
}

function stoneTexture() {
  let pixels, calls = 0, state = 972031;
  const random = () => { calls++; state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const canvas = size => ({ width: size, height: size, getContext: () => ({
    createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
    putImageData: image => { pixels = image.data; },
  }) });
  new Function('canvas', 'texture', 'random', `${math}
    ${periodic}
    ${textureBody}`)(canvas, value => value, random);
  return { pixels, calls, state };
}

function positionGroups(geometry) {
  const groups = new Map(), positions = geometry.attributes.position;
  for (let vertex = 0; vertex < positions.count; vertex++) {
    const key = [positions.getX(vertex), positions.getY(vertex), positions.getZ(vertex)].map(v => Math.round(v * 1e6)).join(',');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(vertex);
  }
  return [...groups.values()];
}

describe('BirdLab weathered stone surface', () => {
  it.each([false, true])('closes the UV-seam and pole normals without moving or retessellating stones (high=%s)', detailed => {
    const original = stoneGeometry(detailed, true), repaired = stoneGeometry(detailed);
    try {
      expect(repaired.attributes.position.array).toEqual(original.attributes.position.array);
      expect(repaired.attributes.uv.array).toEqual(original.attributes.uv.array);
      expect(repaired.index.array).toEqual(original.index.array);
      const normals = repaired.attributes.normal, n = new THREE.Vector3(), reference = new THREE.Vector3();
      let repairedGroups = 0;
      for (const vertices of positionGroups(repaired)) {
        if (vertices.length < 2) {
          const vertex = vertices[0];
          expect(normals.getX(vertex)).toBe(original.attributes.normal.getX(vertex));
          expect(normals.getY(vertex)).toBe(original.attributes.normal.getY(vertex));
          expect(normals.getZ(vertex)).toBe(original.attributes.normal.getZ(vertex));
          continue;
        }
        repairedGroups++;
        reference.fromBufferAttribute(normals, vertices[0]);
        for (const vertex of vertices) {
          n.fromBufferAttribute(normals, vertex);
          expect(Number.isFinite(n.x + n.y + n.z)).toBe(true);
          expect(Math.abs(n.length() - 1)).toBeLessThan(1e-6);
          expect(n.distanceTo(reference)).toBeLessThan(1e-7);
          expect(n.dot(new THREE.Vector3().fromBufferAttribute(repaired.attributes.position, vertex))).toBeGreaterThan(0);
        }
      }
      expect(repairedGroups).toBeGreaterThan(5);
    } finally { original.dispose(); repaired.dispose(); }
  });

  it('keeps mineral grain deterministic and consumes the original random stream length', () => {
    const first = stoneTexture(), second = stoneTexture();
    expect(first.pixels).toEqual(second.pixels);
    expect(first.calls).toBe(256 * 256);
    let reference = 972031;
    for (let sample = 0; sample < 256 * 256; sample++) reference = (Math.imul(reference, 1664525) + 1013904223) >>> 0;
    expect(first.state).toBe(reference);
    for (let pixel = 3; pixel < first.pixels.length; pixel += 4) {
      if (first.pixels[pixel] !== 255) throw new Error('Stone texture unexpectedly became translucent');
    }
  });

  it('avoids a coherent mineral step across the longitude wrap and color pinching at the poles', () => {
    const { pixels } = stoneTexture();
    const value = (x, y) => pixels[(y * 256 + x) * 4];
    let seam = 0, interior = 0;
    for (let y = 8; y < 248; y++) {
      seam += Math.abs(value(0, y) - value(255, y));
      for (let x = 0; x < 255; x++) interior += Math.abs(value(x + 1, y) - value(x, y));
    }
    const seamMean = seam / 240, interiorMean = interior / (240 * 255);
    expect(interiorMean).toBeGreaterThan(1); // Retain fine mineral grain.
    expect(seamMean).toBeLessThan(interiorMean * 1.25);
    for (let x = 0; x < 256; x++) for (const y of [0, 255]) {
      for (let channel = 0; channel < 3; channel++) expect(pixels[(y * 256 + x) * 4 + channel]).toBe(pixels[channel]);
    }
  });

  it('matches mineral-field values and first derivatives on both periodic boundaries', () => {
    const sample = new Function(`${math}\n${periodic}\nreturn tileNoise;`)();
    const epsilon = .001;
    for (const frequency of [.032, .18]) for (const along of [0, 17.3, 81.7, 173.4, 256]) for (const axis of [0, 1]) {
      const height = across => axis ? sample(along, across, frequency, 0) : sample(across, along, frequency, 0);
      expect(height(0)).toBeCloseTo(height(256), 12);
      const first = (height(epsilon) - height(-epsilon)) / (2 * epsilon);
      const last = (height(256 + epsilon) - height(256 - epsilon)) / (2 * epsilon);
      expect(Math.abs(first - last)).toBeLessThan(1e-6);
    }
  });
});
