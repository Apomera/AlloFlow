// Geometry World STL export fidelity.
//
// The exporter emitted a unit cube per block and ignored userData.shape, so a build
// made of half-slabs (½ unit) and quarter wedges (¼ unit) printed as solid cubes.
// In a tool whose entire purpose is teaching volume, the physical manipulative would
// have contradicted the lesson — a student could measure 12 cubic units on screen and
// hold 24 in their hand.
//
// It now derives triangles from the ACTUAL rendered mesh, so the print and the screen
// cannot drift apart and any shape added later is handled for free. These pin the
// transform maths; the companion WebGL e2e checks the enclosed volume of the real
// meshes against the volume each shape claims to be.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const PATHS = [
  'stem_lab/stem_tool_geometryworld.js',
  'desktop/web-app/public/stem_lab/stem_tool_geometryworld.js',
];
const SOURCE = readFileSync(PATHS[0], 'utf8');

/** Pull the pure STL helpers out of the IIFE without running the tool. */
function loadStlMath() {
  const start = SOURCE.indexOf('  function applyMatrix4(e, v) {');
  const end = SOURCE.indexOf('  // Format fractional volume for display');
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function(SOURCE.slice(start, end)
    + '\nreturn { applyMatrix4, triangleNormal, stlTrianglesFromMesh, coversFullFace, windOutward };')();
}

const stl = loadStlMath();

// A THREE-shaped stand-in: column-major elements, plus a position attribute.
const identity = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const translation = (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];

function fakeMesh(verts, matrixElements, index) {
  return {
    matrixWorld: { elements: matrixElements || identity() },
    geometry: {
      index: index ? { array: index } : null,
      attributes: {
        position: {
          count: verts.length / 3,
          getX: (i) => verts[i * 3],
          getY: (i) => verts[i * 3 + 1],
          getZ: (i) => verts[i * 3 + 2],
        },
      },
    },
  };
}

describe('applyMatrix4', () => {
  it('leaves a point alone under identity', () => {
    expect(stl.applyMatrix4(identity(), [2, 3, 4])).toEqual([2, 3, 4]);
  });

  it('applies translation from the correct (column-major) slots', () => {
    // Reading translation from the wrong row is the classic matrix bug and would
    // silently place every exported block at the origin.
    expect(stl.applyMatrix4(translation(10, 20, 30), [1, 2, 3])).toEqual([11, 22, 33]);
  });

  it('applies a 90° Y rotation in the expected direction', () => {
    // Column-major Y-rotation by +90°: x -> -z... expressed as the matrix THREE builds.
    const c = Math.cos(Math.PI / 2), s = Math.sin(Math.PI / 2);
    const rotY = [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
    const out = stl.applyMatrix4(rotY, [1, 0, 0]);
    expect(out[0]).toBeCloseTo(0, 10);
    expect(out[1]).toBeCloseTo(0, 10);
    expect(out[2]).toBeCloseTo(-1, 10);
  });
});

describe('triangleNormal', () => {
  it('gives a unit normal with the right sign for CCW winding', () => {
    const n = stl.triangleNormal([0, 0, 0], [1, 0, 0], [0, 1, 0]);
    expect(n[0]).toBeCloseTo(0, 10);
    expect(n[1]).toBeCloseTo(0, 10);
    expect(n[2]).toBeCloseTo(1, 10);
  });

  it('flips with the winding', () => {
    const n = stl.triangleNormal([0, 0, 0], [0, 1, 0], [1, 0, 0]);
    expect(n[2]).toBeCloseTo(-1, 10);
  });

  it('returns a zero normal for a degenerate triangle rather than NaN', () => {
    // NaN in an STL normal makes slicers reject the whole file.
    const n = stl.triangleNormal([0, 0, 0], [1, 1, 1], [2, 2, 2]);
    expect(n).toEqual([0, 0, 0]);
    n.forEach((c) => expect(Number.isNaN(c)).toBe(false));
  });
});

describe('stlTrianglesFromMesh', () => {
  it('reads a non-indexed buffer (the hand-authored wedges)', () => {
    const tris = stl.stlTrianglesFromMesh(fakeMesh([0, 0, 0, 1, 0, 0, 0, 1, 0]));
    expect(tris).toHaveLength(1);
    expect(tris[0].v).toEqual([[0, 0, 0], [1, 0, 0], [0, 1, 0]]);
    expect(tris[0].n[2]).toBeCloseTo(1, 10);
  });

  it('reads an indexed buffer (BoxGeometry) and follows the index order', () => {
    const tris = stl.stlTrianglesFromMesh(
      fakeMesh([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0], null, [0, 1, 2, 2, 1, 3]));
    expect(tris).toHaveLength(2);
    expect(tris[1].v).toEqual([[0, 1, 0], [1, 0, 0], [1, 1, 0]]);
  });

  it('bakes the world transform into the emitted vertices', () => {
    // Without this every block would print stacked at the origin.
    const tris = stl.stlTrianglesFromMesh(
      fakeMesh([0, 0, 0, 1, 0, 0, 0, 1, 0], translation(5, 6, 7)));
    expect(tris[0].v[0]).toEqual([5, 6, 7]);
    expect(tris[0].v[1]).toEqual([6, 6, 7]);
  });

  it('is empty rather than throwing for a mesh with no geometry', () => {
    expect(stl.stlTrianglesFromMesh(null)).toEqual([]);
    expect(stl.stlTrianglesFromMesh({})).toEqual([]);
    expect(stl.stlTrianglesFromMesh({ geometry: {}, matrixWorld: { elements: identity() } })).toEqual([]);
  });

  it('ignores a trailing partial triangle instead of emitting undefined vertices', () => {
    const tris = stl.stlTrianglesFromMesh(fakeMesh([0, 0, 0, 1, 0, 0, 0, 1, 0, 9, 9, 9]));
    expect(tris).toHaveLength(1);
  });
});

describe('coversFullFace', () => {
  const block = (shape, type) => ({ userData: { shape, blockType: type || 'stone' } });

  it('only culls against a neighbour that really covers the face', () => {
    // The old test culled against ANY non-grass neighbour, so a slab or wedge next
    // door punched a hole straight through the printed model.
    expect(stl.coversFullFace(block('cube'))).toBe(true);
    expect(stl.coversFullFace(block('halfA'))).toBe(false);
    expect(stl.coversFullFace(block('halfB'))).toBe(false);
    expect(stl.coversFullFace(block('quarter'))).toBe(false);
  });

  it('treats a missing shape as a cube (older blocks predate the field)', () => {
    expect(stl.coversFullFace({ userData: { blockType: 'stone' } })).toBe(true);
  });

  it('never culls against empty space or ground', () => {
    expect(stl.coversFullFace(null)).toBe(false);
    expect(stl.coversFullFace(undefined)).toBe(false);
    expect(stl.coversFullFace(block('cube', 'grass'))).toBe(false);
    expect(stl.coversFullFace({})).toBe(false);
  });
});

// Signed enclosed volume by the divergence theorem: positive when every triangle
// is wound counter-clockwise seen from outside, which is what STL and three.js
// both take to mean "this side is out".
function signedVolume(verts) {
  let vol = 0;
  for (let i = 0; i + 8 < verts.length; i += 9) {
    const a = verts.slice(i, i + 3), b = verts.slice(i + 3, i + 6), c = verts.slice(i + 6, i + 9);
    vol += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
  }
  return Math.round(vol * 10000) / 10000;
}

/** The two hand-authored vertex tables, in the order they appear: halfA, quarter. */
function authoredShapeVertices() {
  const start = SOURCE.indexOf('  function createShapeGeometry(shapeId) {');
  const end = SOURCE.indexOf('  function applyMatrix4(e, v) {');
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const body = SOURCE.slice(start, end);
  const tables = [...body.matchAll(/new Float32Array\(\[([\s\S]*?)\]\)/g)]
    .map((m) => m[1].replace(/\/\/[^\n]*/g, '').split(',').map((s) => s.trim()).filter(Boolean).map(Number));
  expect(tables).toHaveLength(2);
  tables.forEach((t) => expect(t.every(Number.isFinite)).toBe(true));
  return { halfA: tables[0], quarter: tables[1] };
}

describe('hand-authored shapes are wound outward', () => {
  // Both tables are written clockwise seen from outside, so their raw signed
  // volume is negative: face normals pointed INTO the solid. On screen that culled
  // the near faces and lit the far ones, so a wedge read as a dark hollow; in the
  // STL a 12-block build summed to 8.25 units instead of 9.75. createShapeGeometry
  // passes both tables through windOutward, which is what this pins.
  it('the raw tables are inside-out, which is why windOutward exists', () => {
    const { halfA, quarter } = authoredShapeVertices();
    expect(signedVolume(halfA)).toBeCloseTo(-0.5, 4);
    expect(signedVolume(quarter)).toBeCloseTo(-0.25, 4);
  });

  it('windOutward turns them right-side out with the volume each claims', () => {
    const { halfA, quarter } = authoredShapeVertices();
    expect(signedVolume(stl.windOutward(halfA.slice()))).toBeCloseTo(0.5, 4);
    expect(signedVolume(stl.windOutward(quarter.slice()))).toBeCloseTo(0.25, 4);
  });

  it('windOutward is applied to both authored shapes and nothing else', () => {
    const start = SOURCE.indexOf('  function createShapeGeometry(shapeId) {');
    const end = SOURCE.indexOf('  function applyMatrix4(e, v) {');
    const body = SOURCE.slice(start, end);
    expect(body.match(/BufferAttribute\(windOutward\(verts\), 3\)/g)).toHaveLength(2);
    // BoxGeometry is already outward-wound; wrapping it would turn the cube inside out.
    expect(body).not.toMatch(/windOutward\(new THREE\.BoxGeometry/);
  });

  it('windOutward is an involution and leaves a partial trailing triangle alone', () => {
    const tri = [0, 0, 0, 1, 0, 0, 0, 1, 0, 9, 9];
    const once = stl.windOutward(tri.slice());
    expect(once).toEqual([0, 0, 0, 0, 1, 0, 1, 0, 0, 9, 9]);
    expect(stl.windOutward(once.slice())).toEqual(tri);
  });
});

describe('Geometry World STL wiring', () => {
  PATHS.forEach((p) => {
    const src = readFileSync(p, 'utf8');

    it(`exports non-cube shapes from their real mesh — ${p}`, () => {
      expect(src).toContain("if ((m.userData.shape || 'cube') !== 'cube') {");
      expect(src).toContain('var shapeTris = stlTrianglesFromMesh(m);');
      // The blanket cull is gone.
      expect(src).not.toContain("if (!neighbor || (neighbor.userData.blockType === 'grass')) {");
      expect(src).toContain('if (!coversFullFace(neighbor)) {');
    });

    it(`reports how many shaped blocks were included — ${p}`, () => {
      expect(src).toContain('shapedBlocks: shapedCount');
      expect(src).toContain('at true volume)');
    });
  });
});
