import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Exercise the geometry builder itself; a full scene mount would add unrelated
// random star generation and cannot establish whether branch roots really meet.
const source = readFileSync('stem_lab/stem_tool_galaxy.js', 'utf8');
const start = source.indexOf('            function makeCrabFilamentGeometry() {');
const end = source.indexOf('            var crabFilamentFragmentShader =', start);
if (start < 0 || end < 0) throw new Error('Crab filament geometry builder not found');
const build = new Function('THREE', 'resolvedQuality', source.slice(start, end) + '\nreturn makeCrabFilamentGeometry();');
const THREE = {
  BufferGeometry: class {
    attributes = {};
    setAttribute(name, attribute) { this.attributes[name] = attribute; return this; }
  },
  BufferAttribute: class {
    constructor(array, itemSize) { this.array = array; this.itemSize = itemSize; this.count = array.length / itemSize; }
  },
};
const qualities = [
  ['low', 36, 10, 10],
  ['balanced', 36, 10, 10],
  ['high', 52, 12, 14],
  ['cinematic', 64, 14, 18],
];

function centerAt(geometry, strand, step, segments) {
  const last = step === segments;
  const base = (strand * segments + (last ? segments - 1 : step)) * 12;
  const left = (base + (last ? 1 : 0)) * 3;
  const right = (base + (last ? 2 : 5)) * 3;
  const position = geometry.attributes.position.array;
  return [0, 1, 2].map(axis => (position[left + axis] + position[right + axis]) * 0.5);
}
function distance(a, b) { return Math.hypot(...a.map((value, axis) => value - b[axis])); }
function radialDepth(point) { return Math.hypot(point[0] / 0.76, point[1] / 0.96, point[2] / 0.62); }
function originalTrunk(index, t) {
  const phase = index * 2.399963, start = -0.95 + ((index * 0.618034) % 1) * 0.65;
  const latitude = start + t * (1.22 + 0.38 * Math.sin(phase * 1.7)) + Math.sin(t * 15 + phase) * Math.sin(t * Math.PI) * 0.055;
  const angle = phase + t * (index % 2 ? -0.34 : 0.27) + Math.sin(t * 13 - phase) * Math.sin(t * Math.PI) * 0.07;
  const radius = 1 + Math.sin(angle * 3 + latitude * 7) * 0.065 + Math.cos(angle * 8 - latitude * 11) * 0.035;
  return [Math.cos(latitude) * Math.cos(angle) * 0.76 * radius, Math.sin(latitude) * 0.96 * radius, Math.cos(latitude) * Math.sin(angle) * 0.62 * radius];
}

describe('Crab layered filament geometry', () => {
  it.each(qualities)('keeps the %s mesh finite, deterministic and within its existing budget', (quality, strands, trunks, segments) => {
    const geometry = build(THREE, quality), repeat = build(THREE, quality);
    expect(geometry.attributes.position.count / 3).toBe(strands * segments * 4);
    for (const name of ['position', 'normal', 'uv']) {
      expect(Array.from(geometry.attributes[name].array).every(Number.isFinite)).toBe(true);
      expect(geometry.attributes[name].array).toEqual(repeat.attributes[name].array);
      expect(geometry.attributes[name].count).toBe(geometry.attributes.position.count);
    }
    const normals = geometry.attributes.normal.array;
    let maxNormalError = 0;
    for (let at = 0; at < normals.length; at += 3) maxNormalError = Math.max(maxNormalError, Math.abs(Math.hypot(normals[at], normals[at + 1], normals[at + 2]) - 1));
    expect(maxNormalError).toBeLessThan(0.000001);
  });

  it.each(qualities)('connects every %s branch to an actual sampled trunk vertex', (quality, strands, trunks, segments) => {
    const geometry = build(THREE, quality), trunkVertices = [];
    for (let strand = 0; strand < trunks; strand++) for (let step = 1; step < segments; step++) trunkVertices.push(centerAt(geometry, strand, step, segments));
    let maxAttachmentGap = 0;
    for (let strand = trunks; strand < strands; strand++) {
      const root = centerAt(geometry, strand, 0, segments);
      maxAttachmentGap = Math.max(maxAttachmentGap, Math.min(...trunkVertices.map(point => distance(point, root))));
    }
    expect(maxAttachmentGap).toBeLessThan(0.000001);
  });

  it.each(qualities)('adds interior depth to a minority of %s branches while preserving the outer trunks', (quality, strands, trunks, segments) => {
    const geometry = build(THREE, quality);
    let maxTrunkChange = 0, interiorBranches = 0, surfaceBranches = 0;
    for (let strand = 0; strand < trunks; strand++) for (let step = 0; step <= segments; step++) {
      maxTrunkChange = Math.max(maxTrunkChange, distance(centerAt(geometry, strand, step, segments), originalTrunk(strand, step / segments)));
    }
    for (let strand = trunks; strand < strands; strand++) {
      const rootDepth = radialDepth(centerAt(geometry, strand, 0, segments));
      const middleDepth = radialDepth(centerAt(geometry, strand, Math.round(segments * 0.75), segments));
      const endDepth = radialDepth(centerAt(geometry, strand, segments, segments));
      expect(rootDepth).toBeGreaterThan(0.89);
      if (endDepth < 0.86) {
        interiorBranches++;
        expect(middleDepth).toBeLessThan(0.91);
        expect(endDepth).toBeGreaterThan(0.53);
      } else surfaceBranches++;
    }
    expect(maxTrunkChange).toBeLessThan(0.000001);
    expect(interiorBranches).toBeGreaterThan((strands - trunks) * 0.25);
    expect(interiorBranches).toBeLessThan((strands - trunks) * 0.42);
    expect(surfaceBranches).toBeGreaterThan(interiorBranches);
  });
});
