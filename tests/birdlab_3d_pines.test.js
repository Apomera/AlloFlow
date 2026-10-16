import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/birdlab_3d_habitat.js', 'utf8');
const treeBody = source.slice(source.indexOf('var branches = [], leaves ='), source.indexOf('// Reserve a corridor'));
const cardsBody = source.slice(source.indexOf('function cardGeometry('), source.indexOf('function applyWind('));
const paintingBody = source.slice(source.indexOf('function canopyCanvas('), source.indexOf('function canopyTexture('));
const math = source.slice(source.indexOf('function smooth('), source.indexOf('function groundHeight('));

function pine(detailed, initialSeed = 972031, height = 20) {
  let seed = initialSeed, calls = 0;
  const random = () => { calls++; seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const result = new Function('detailed', 'random', 'height', `
    function groundHeight() { return 0; }
    ${math}
    ${treeBody}
    tree(0, 0, height, true);
    return { branches, leaves, treeLocations };
  `)(detailed, random, height);
  return { ...result, calls, seed };
}
function cardGeometry() {
  return new Function('THREE', 'geometry', `const detailed = true; ${cardsBody} return cardGeometry(false);`)(THREE, value => value);
}

describe('BirdLab living pine crowns', () => {
  it('retains the low-quality budget and seeded stream used by later trees and ground cover', () => {
    for (const seed of [972031, 23, 653104, 4203401]) {
      const high = pine(true, seed), low = pine(false, seed), again = pine(true, seed);
      expect(high.calls).toBe(278);
      expect(high.calls).toBe(low.calls); expect(high.seed).toBe(low.seed);
      expect(high.branches).toHaveLength(37); expect(low.branches).toHaveLength(37);
      expect(high.leaves[1]).toHaveLength(30); expect(low.leaves[1]).toHaveLength(30);
      expect(high.leaves[0]).toHaveLength(0);
      expect(high).toEqual(again);
      expect(high.treeLocations).toEqual(low.treeLocations);
      // Trunk and roots retain the same footprint and soil contact.
      expect(high.branches.slice(0, 4)).toEqual(low.branches.slice(0, 4));
      expect(high.branches.slice(-3)).toEqual(low.branches.slice(-3));
    }
  });

  it('covers the leader with progressively narrower whorls without expanding the reserved flight envelope', () => {
    const geometry = cardGeometry(), point = new THREE.Vector3(), instance = new THREE.Object3D();
    try {
      expect(geometry.index.count / 3).toBe(8);
      for (let seed = 1; seed <= 48; seed++) {
        const height = seed % 2 ? 10 : 21, tree = pine(true, seed * 7919, height);
        let crownTop = -Infinity, radialExtent = 0;
        const whorlWidths = Array(6).fill(0);
        tree.leaves[1].forEach((spray, index) => {
          whorlWidths[Math.floor(index / 5)] += spray.sx;
          instance.position.set(spray.x, spray.y, spray.z);
          instance.rotation.set(spray.lean, spray.angle, spray.lean * .6);
          instance.scale.set(spray.sx, spray.sy, spray.sz); instance.updateMatrix();
          for (let vertex = 0; vertex < geometry.attributes.position.count; vertex++) {
            point.fromBufferAttribute(geometry.attributes.position, vertex).applyMatrix4(instance.matrix);
            expect([point.x, point.y, point.z].every(Number.isFinite)).toBe(true);
            crownTop = Math.max(crownTop, point.y);
            radialExtent = Math.max(radialExtent, Math.hypot(point.x, point.z));
          }
        });
        expect(crownTop / height).toBeGreaterThan(.99);
        expect(crownTop / height).toBeLessThan(1.10);
        expect(radialExtent / height).toBeLessThan(.37);
        // Neighboring whorls may vary naturally; the crown still narrows over
        // each pair of tiers and encloses a slender terminal shoot.
        for (let tier = 2; tier < whorlWidths.length; tier++) expect(whorlWidths[tier]).toBeLessThan(whorlWidths[tier - 2]);
        expect(whorlWidths[5]).toBeLessThan(whorlWidths[0] * .25);
      }
    } finally { geometry.dispose(); }
  });

  it('paints curved needles inside the existing atlas with the same deterministic seed consumption', () => {
    function paint(detailed) {
      let seed = 972031, calls = 0, curves = 0;
      const points = [];
      const context = {
        beginPath() {}, stroke() {},
        moveTo(...coordinates) { points.push(coordinates); }, lineTo(...coordinates) { points.push(coordinates); },
        quadraticCurveTo(...coordinates) { curves++; points.push(coordinates.slice(0, 2), coordinates.slice(2)); }
      };
      const random = () => { calls++; seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      const canvas = size => ({ width: size, height: size, getContext: () => context });
      const result = new Function('detailed', 'canvas', 'random', `${math} ${paintingBody} return canopyCanvas(true, 0);`)(detailed, canvas, random);
      return { result, calls, seed, curves, points };
    }
    const high = paint(true), low = paint(false);
    expect(high.calls).toBe(5715); expect(high.seed).toBe(low.seed);
    expect(high.curves).toBeGreaterThan(1000); expect(low.curves).toBe(0);
    expect(high.result.color.width).toBe(512); expect(high.result.normal).toBeNull();
    for (const point of high.points) for (const coordinate of point) {
      expect(Number.isFinite(coordinate)).toBe(true);
      expect(coordinate).toBeGreaterThan(8); expect(coordinate).toBeLessThan(504);
    }
  });
});
