import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/stem_tool_raptorhunt.js', 'utf8');
const start = source.indexOf('function sculptMountainGeometry(');
const end = source.indexOf('function detailSnowMaterial(', start);
function sculpt(quality) { return Function('THREE', 'graphicsQuality', 'return (' + source.slice(start, end).trim() + ')')(THREE, quality); }

describe('Raptor cinematic ridge geometry', () => {
  it('keeps snow exactly on its parent surface at every vertex', () => {
    const make = sculpt('balanced');
    const rock = make(new THREE.ConeGeometry(80, 100, 36, 16), 1.7);
    const cap = make(new THREE.ConeGeometry(80 * 0.4 * 1.02, 40, 36, 12), 1.7, 100);
    const a = rock.attributes.position, b = cap.attributes.position;
    expect(a.count).toBe(b.count);
    for (let i = 0; i < a.count; i++) {
      expect(Math.abs(a.getX(i) - b.getX(i))).toBeLessThan(0.00003);
      expect(Math.abs(a.getZ(i) - b.getZ(i))).toBeLessThan(0.00003);
      expect(Math.abs(a.getY(i) - (b.getY(i) + 30))).toBeLessThan(0.00003);
    }
    expect(Array.from(cap.attributes.rhSnow.array).some(v => v < 0)).toBe(true);
    expect(Array.from(cap.attributes.rhSnow.array).some(v => v > 0)).toBe(true);
    rock.dispose(); cap.dispose();
  });

  it('scales detail by quality while keeping finite normals and grounded skirts', () => {
    const counts = [];
    for (const quality of ['low', 'balanced', 'high']) {
      const geometry = sculpt(quality)(new THREE.ConeGeometry(80, 100, 20, 5), 3.2);
      counts.push(geometry.attributes.position.count);
      expect(Array.from(geometry.attributes.normal.array).every(Number.isFinite)).toBe(true);
      const p = geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        if (Math.abs(p.getX(i)) > 79.9 || Math.abs(p.getZ(i)) > 79.9) expect(p.getY(i)).toBeCloseTo(-50, 4);
      }
      geometry.dispose();
    }
    expect(counts[0]).toBeLessThan(counts[1]);
    expect(counts[1]).toBeLessThan(counts[2]);
  });
});

function extractGeometry(name, end, names = [], values = []) {
  const a = source.indexOf('function ' + name + '(');
  const b = source.indexOf(end, a);
  return Function('THREE', ...names, 'return (' + source.slice(a, b).trim() + ')')(THREE, ...values);
}

describe('Raptor refined flight surfaces', () => {
  it('fills the lake interior with grounded, consistently wound rings', () => {
    const make = extractGeometry('createLakeSurfaceGeometry', "        if (species.biome === 'lake')");
    const geometry = make(118, 64, 20);
    const p = geometry.attributes.position;
    expect(p.count).toBe(1281);
    expect(Array.from(geometry.attributes.normal.array).every(Number.isFinite)).toBe(true);
    for (let i = 0; i < p.count; i++) {
      expect(Math.hypot(p.getX(i), p.getY(i))).toBeLessThan(118.00001);
      expect(p.getZ(i)).toBe(0);
      expect(geometry.attributes.normal.getZ(i)).toBeCloseTo(1, 4);
    }
    expect(geometry.index.count).toBe(64 * 3 + 19 * 64 * 6);
    geometry.dispose();
  });

  it('exposes primary tips beyond the supporting wing and preserves bilateral symmetry', () => {
    const make = extractGeometry('createTaperedPrimaryGeometry', '        if (silhouetteProfile.primaryFingers', ['wingSpan', 'wingDepth', 'silhouetteProfile'], [3, 0.64, { sweep: -0.26 }]);
    for (let index = 0; index < 5; index++) {
      const left = make(-1, index, 5), right = make(1, index, 5);
      const a = left.attributes.position, b = right.attributes.position;
      expect(a.count).toBe(b.count);
      expect(Math.abs((a.getX(8) + a.getX(9)) / 2)).toBeGreaterThan(3 * 0.84);
      for (let i = 0; i < a.count; i++) {
        const mirrored = i % 2 ? i - 1 : i + 1;
        expect(a.getX(i)).toBeCloseTo(-b.getX(mirrored), 5);
        expect(a.getY(i)).toBeCloseTo(b.getY(mirrored), 5);
        expect(a.getZ(i)).toBeCloseTo(b.getZ(mirrored), 5);
      }
      expect(Array.from(a.array).every(Number.isFinite)).toBe(true);
      expect(Array.from(left.attributes.normal.array).every(Number.isFinite)).toBe(true);
      left.dispose(); right.dispose();
    }
  });
});
