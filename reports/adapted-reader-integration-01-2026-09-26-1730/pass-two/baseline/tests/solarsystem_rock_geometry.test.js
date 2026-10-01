// solarSystem — rocks and boulders must not shatter into loose triangles.
//
// THREE.DodecahedronGeometry (every PolyhedronGeometry, in fact) is NON-INDEXED.
// Measured against the pinned three r128 build, detail=1 gives 432 stored
// positions for ~62 distinct corners, so each shared corner is stored about
// seven times. Scaling every STORED vertex by its own Math.random() sends those
// seven copies to seven different points and tears each triangle away from its
// neighbours. On the Mars rover surface that rendered as fans of pale shards
// instead of boulders.
//
// Two guards, because the source scan alone would pass on a helper that is
// itself broken:
//   1. no per-vertex Math.random() writes on a non-indexed geometry, and
//   2. __alloRockDeform actually keeps duplicated corners coincident.
//
// Source-literal extraction: solarSystem is ~1 MB, too slow for loadTool.

import fs from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';

const COPIES = [
  'stem_lab/stem_tool_solarsystem.js',
  'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js',
];
const NON_INDEXED = /Dodecahedron|Icosahedron|Octahedron|Tetrahedron|Polyhedron/;

let src;
let lines;

beforeAll(() => {
  src = fs.readFileSync(COPIES[0], 'utf8');
  lines = src.split(/\r?\n/);
});

function loadRockDeform() {
  const start = src.indexOf('function __alloRockDeform(');
  expect(start, '__alloRockDeform not found').toBeGreaterThan(-1);
  const end = src.indexOf('\n}', start) + 2;
  // eslint-disable-next-line no-new-func
  return new Function(src.slice(start, end) + '\nreturn __alloRockDeform;')();
}

// Minimal stand-in for a non-indexed BufferGeometry.
function fakeGeometry(positions) {
  return {
    attributes: { position: { array: Float32Array.from(positions), needsUpdate: false } },
    computeVertexNormals() { this._normals = true; },
    computeBoundingSphere() { this._bounds = true; },
  };
}

describe('solarSystem — rock and boulder geometry', () => {
  it('ships the same file to the CDN and the desktop bundle', () => {
    expect(fs.readFileSync(COPIES[0], 'utf8')).toBe(fs.readFileSync(COPIES[1], 'utf8'));
  });

  it('never scales a non-indexed geometry per stored vertex with Math.random()', () => {
    const offenders = [];
    lines.forEach((line, i) => {
      if (!/attributes\.position\.array/.test(line)) return;
      const preceding = lines.slice(Math.max(0, i - 6), i).join('\n');
      if (!NON_INDEXED.test(preceding)) return;
      // Only the vertex-write statements themselves: nearby Math.random() calls
      // that pick a position or a radius are fine and must not trip this.
      const writes = lines
        .slice(i, i + 12)
        .filter((l) => /\[\s*\w+\s*(\+\s*\d\s*)?\]\s*[*+]=/.test(l))
        .join('\n');
      if (/Math\.random\(\)/.test(writes)) offenders.push(i + 1);
    });
    expect(offenders, 'per-vertex random on a non-indexed geometry at line(s) ' + offenders.join(', ')).toEqual([]);
  });

  it('routes every rock, boulder and mound through the shared deformer', () => {
    const calls = (src.match(/__alloRockDeform\(/g) || []).length - 1; // minus the definition
    expect(calls).toBeGreaterThanOrEqual(3);
  });

  it('keeps duplicated corners coincident, so the hull stays closed', () => {
    const deform = loadRockDeform();
    // A shared corner as a non-indexed geometry stores it: the same coordinates
    // repeated once per adjoining face.
    const corner = [0.4711, -0.8123, 0.3402];
    const other = [-0.6, 0.5, -0.62];
    const geo = fakeGeometry([...corner, ...other, ...corner, ...other, ...corner]);
    deform(geo, 42.5, 0.7);
    const out = geo.attributes.position.array;
    const at = (n) => [out[n * 3], out[n * 3 + 1], out[n * 3 + 2]];
    for (const copy of [2, 4]) {
      expect(at(copy)[0]).toBeCloseTo(at(0)[0], 12);
      expect(at(copy)[1]).toBeCloseTo(at(0)[1], 12);
      expect(at(copy)[2]).toBeCloseTo(at(0)[2], 12);
    }
    expect(at(3)[0]).toBeCloseTo(at(1)[0], 12);
    expect(at(3)[1]).toBeCloseTo(at(1)[1], 12);
    expect(at(3)[2]).toBeCloseTo(at(1)[2], 12);
    expect(geo.attributes.position.needsUpdate).toBe(true);
  });

  it('actually deforms, and stays within a believable rock envelope', () => {
    const deform = loadRockDeform();
    const dirs = [];
    for (let i = 0; i < 60; i += 1) {
      const a = i * 0.7, b = i * 1.3;
      dirs.push(Math.cos(a) * Math.sin(b), Math.sin(a) * Math.sin(b), Math.cos(b));
    }
    const geo = fakeGeometry(dirs);
    deform(geo, 7.25, 0.72);
    const out = geo.attributes.position.array;
    let moved = 0;
    for (let i = 0; i < out.length; i += 3) {
      const r = Math.hypot(out[i], out[i + 1], out[i + 2]);
      // Unit input: a closed, lumpy rock, never an inside-out or spiky one.
      expect(r).toBeGreaterThan(0.35);
      expect(r).toBeLessThan(1.6);
      if (Math.abs(r - 1) > 0.02) moved += 1;
    }
    expect(moved, 'deformation must not be a no-op').toBeGreaterThan(out.length / 3 * 0.5);
  });

  it('gives different seeds different shapes', () => {
    const deform = loadRockDeform();
    const base = [0.5, 0.5, 0.7071, -0.3, 0.9, 0.31, 0.8, -0.2, 0.56];
    const a = fakeGeometry(base); deform(a, 1, 0.7);
    const b = fakeGeometry(base); deform(b, 55, 0.7);
    expect(Array.from(a.attributes.position.array)).not.toEqual(Array.from(b.attributes.position.array));
  });
});
