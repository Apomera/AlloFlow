// Geometry Sandbox SCENE-BUILDER tests (window.StemLab.geoRender).
//
// The pure-math suite proves a prism MEASURES right. It cannot tell you whether
// the prism is on screen. These three properties decide that, and all three were
// broken in shipped code:
//   1. face winding      — an inside-out face is back-face culled and invisible
//   2. per-object sort   — geometry baked in world coords with the mesh at the
//                          origin gives every transparent solid the SAME depth
//                          sort key, so they punch holes through each other
//   3. overlay depth     — the cross-section lives inside the solid it slices
//
// Driven by a stub THREE whose vectors and Box3 do real arithmetic, so these are
// assertions about geometry, not about source text.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { installGeoThreeStub, triangles, outwardness, worldVertices, findByKind } from './helpers/geosandbox_three_stub.js';

let P, R, restore;

beforeAll(() => {
  loadAlloModule('stem_lab/stem_tool_geosandbox.js');
  P = window.StemLab && window.StemLab.geoPure;
  R = window.StemLab && window.StemLab.geoRender;
  if (!P) throw new Error('geoPure not exposed on window.StemLab');
  if (!R) throw new Error('geoRender not exposed on window.StemLab');
  restore = installGeoThreeStub();
});
afterAll(() => { if (restore) restore(); });

// Build the way a student does: point -> segment -> rectangle -> solid, so the
// u/v/w handedness under test is the handedness the tool actually produces.
function builtRect() {
  const seg = P.stretchPoint({ type: 'point', position: [0, 0, 0] }, 'x', 3);
  return P.stretchSegment(seg, 'y', 2);
}
function builtPrism() { return Object.assign({ id: 1 }, P.stretchRect(builtRect(), 'z', 4)); }

function group(objects, selectedId = null) {
  return R.buildConstructionGroup(window.THREE, objects, selectedId, false, 'u');
}

describe('face winding — solids are not culled from any angle', () => {
  it('winds every prism face outward, base included', () => {
    const g = group([builtPrism()]);
    const mesh = findByKind(g.children[0], 'Mesh');
    const tris = triangles(mesh.geometry);

    expect(tris).toHaveLength(12);                       // 6 faces x 2 triangles
    outwardness(tris).forEach((d) => expect(d).toBeGreaterThan(0));
  });

  it('winds every face of a tapered solid outward', () => {
    const frustum = Object.assign({ id: 1 }, P.taperRect(builtRect(), 'z', 4, 0.5));
    const g = group([frustum]);
    const tris = triangles(findByKind(g.children[0], 'Mesh').geometry);

    outwardness(tris).forEach((d) => expect(d).toBeGreaterThan(0));
  });

  it('winds the base of a full pyramid outward even as the top collapses', () => {
    const pyramid = Object.assign({ id: 1 }, P.taperRect(builtRect(), 'z', 4, 0));
    const tris = triangles(findByKind(group([pyramid]).children[0], 'Mesh').geometry);

    // The top face degenerates to the apex (zero-area, normal 0), so only the
    // faces that still have area can be judged — the base is the first two.
    const d = outwardness(tris);
    expect(d[0]).toBeGreaterThan(0);
    expect(d[1]).toBeGreaterThan(0);
    expect(d.filter((n) => Math.abs(n) > 1e-9).every((n) => n > 0)).toBe(true);
  });

  it('gives the prism a double-sided material like every other solid', () => {
    const mesh = findByKind(group([builtPrism()]).children[0], 'Mesh');
    expect(mesh.material.side).toBe(window.THREE.DoubleSide);
    expect(mesh.material.transparent).toBe(true);
  });
});

describe('transparent sort keys — solids stop hiding each other', () => {
  it('moves each solid off the shared origin, onto its own centroid', () => {
    const near = Object.assign({ id: 1 }, P.stretchRect(builtRect(), 'z', 4));
    const far = Object.assign({ id: 2 }, P.stretchRect(builtRect(), 'z', 4), { position: [12, 0, 9] });
    const g = group([near, far]);

    const a = g.children[0].position, b = g.children[1].position;
    // Before the fix both of these were (0,0,0) — identical sort keys, so draw
    // order fell back to creation order and the later solid vanished behind the
    // earlier one wherever they overlapped on screen.
    expect([a.x, a.y, a.z]).not.toEqual([0, 0, 0]);
    expect([a.x, a.y, a.z]).not.toEqual([b.x, b.y, b.z]);
    expect(b.x - a.x).toBeCloseTo(12, 6);
    expect(b.z - a.z).toBeCloseTo(9, 6);
  });

  it('does not move a single vertex in world space while doing it', () => {
    const prism = builtPrism();
    const g = group([prism]);
    const verts = worldVertices(g.children[0]);

    const [px, py, pz] = prism.position;
    const corners = [];
    for (const a of [0, 1]) for (const b of [0, 1]) for (const c of [0, 1]) {
      corners.push([
        px + a * prism.u[0] + b * prism.v[0] + c * prism.w[0],
        py + a * prism.u[1] + b * prism.v[1] + c * prism.w[1],
        pz + a * prism.u[2] + b * prism.v[2] + c * prism.w[2],
      ]);
    }
    const near = (p, q) => Math.abs(p[0] - q[0]) < 1e-9 && Math.abs(p[1] - q[1]) < 1e-9 && Math.abs(p[2] - q[2]) < 1e-9;

    expect(verts.length).toBeGreaterThan(0);
    verts.forEach((v) => expect(corners.some((c) => near(v, c))).toBe(true));
    corners.forEach((c) => expect(verts.some((v) => near(v, c))).toBe(true));
  });

  it('leaves a point where it was — a lone sphere never tied for sort order', () => {
    const g = group([{ id: 1, type: 'point', position: [2, 0, -3] }]);
    const mesh = g.children[0];
    expect([mesh.position.x, mesh.position.y, mesh.position.z]).toEqual([2, 0, -3]);
  });

  it('keeps a segment’s endpoints in place after recentring', () => {
    const seg = Object.assign({ id: 1 }, P.stretchPoint({ type: 'point', position: [1, 0, 1] }, 'x', 3));
    const verts = worldVertices(group([seg]).children[0]);
    const xs = verts.map((v) => v[0]);
    expect(Math.min(...xs)).toBeCloseTo(1 - 0.08, 6);   // sphere cap at the near end
    expect(Math.max(...xs)).toBeCloseTo(4 + 0.08, 6);   // and at the far end
  });
});

describe('selection is legible without relying on colour', () => {
  const outlineOf = (obj, selectedId) =>
    findByKind(group([obj], selectedId).children[0], 'LineSegments');

  it('outlines the selected solid so it reads through whatever is in front', () => {
    const outline = outlineOf(builtPrism(), 1);
    expect(outline.material.color).toBe(0xfbbf24);
    expect(outline.material.depthTest).toBe(false);   // visible even when occluded
    expect(outline.renderOrder).toBeGreaterThan(0);
  });

  it('leaves unselected solids with a plain depth-tested edge', () => {
    const outline = outlineOf(builtPrism(), null);
    expect(outline.material.color).toBe(0x0f172a);
    expect(outline.material.depthTest).toBe(true);
    expect(outline.renderOrder).toBe(0);
  });

  it('grows a selected point, so the cue survives without colour', () => {
    const point = { id: 1, type: 'point', position: [0, 0, 0] };
    const extent = (selectedId) => {
      const v = worldVertices(group([point], selectedId).children[0]);
      return Math.max(...v.map((p) => Math.abs(p[0])));
    };
    expect(extent(1)).toBeGreaterThan(extent(null));
  });

  it('floats a selected segment above the depth buffer like the solids', () => {
    const seg = Object.assign({ id: 1 }, P.stretchPoint({ type: 'point', position: [0, 0, 0] }, 'x', 3));
    const line = findByKind(group([seg], 1).children[0], 'Line');
    expect(line.material.depthTest).toBe(false);
    expect(line.renderOrder).toBeGreaterThan(0);

    const plain = findByKind(group([seg], null).children[0], 'Line');
    expect(plain.material.depthTest).toBe(true);
    expect(plain.renderOrder).toBe(0);
  });

  it('applies the same treatment to rectangles and tapered solids', () => {
    const cases = [builtRect(), P.taperRect(builtRect(), 'z', 4, 0.5)];
    cases.forEach((shape) => {
      expect(outlineOf(Object.assign({ id: 1 }, shape), 1).material.color).toBe(0xfbbf24);
      expect(outlineOf(Object.assign({ id: 1 }, shape), null).material.color).toBe(0x0f172a);
    });
  });
});

describe('coplanar sources cannot fight the solid stretched from them', () => {
  it('offsets a rectangle away from the viewer, but never the solid', () => {
    const rect = Object.assign({ id: 1 }, builtRect());
    const prism = builtPrism();
    const g = group([rect, prism], null);

    const rectMat = findByKind(g.children[0], 'Mesh').material;
    const prismMat = findByKind(g.children[1], 'Mesh').material;

    // stretchRect reuses position/u/v, so these two share a plane exactly.
    expect(rect.position).toEqual(prism.position);
    expect(rect.u).toEqual(prism.u);
    expect(rect.v).toEqual(prism.v);

    expect(rectMat.polygonOffset).toBe(true);
    expect(rectMat.polygonOffsetFactor).toBeGreaterThan(0);
    // The solid keeps true depth — offsetting both would just move the fight.
    expect(prismMat.polygonOffset).toBeFalsy();
  });
});

describe('placement ghost — where the next point lands', () => {
  const ghost = (x, y, z) => R.buildPlacementGhost(window.THREE, x, y, z);
  const spread = (verts, i) => {
    const vals = verts.map((v) => v[i]);
    return { min: Math.min(...vals), max: Math.max(...vals) };
  };

  it('marks the target with a ring on the floor', () => {
    const g = ghost(1, 0, 2);
    expect(g.children).toHaveLength(1);            // no drop line needed at ground level
    const v = worldVertices(g);
    expect((spread(v, 0).min + spread(v, 0).max) / 2).toBeCloseTo(1, 6);
    expect((spread(v, 2).min + spread(v, 2).max) / 2).toBeCloseTo(2, 6);
    expect(spread(v, 1).min).toBeCloseTo(0, 6);
  });

  it('adds a drop line and a footprint once the target is off the floor', () => {
    const g = ghost(1, 3, 2);
    expect(g.children).toHaveLength(3);            // ring + drop line + footprint
    const v = worldVertices(g);
    // The drop line is what makes the height readable against the grid, so it must
    // actually span target height down to the floor.
    expect(spread(v, 1).max).toBeCloseTo(3, 6);
    expect(spread(v, 1).min).toBeLessThan(0.01);
  });

  it('draws over everything, like the other affordances', () => {
    ghost(0, 2, 0).children.forEach((child) => {
      expect(child.material.depthTest).toBe(false);
      expect(child.renderOrder).toBeGreaterThan(0);
    });
  });
});

describe('cross-section overlay reads through the solid', () => {
  it('draws on top instead of being depth-rejected by the prism', () => {
    const sg = R.buildSliceGroup(window.THREE, builtPrism(), 0.5);
    const fill = findByKind(sg, 'Mesh');

    expect(fill.material.depthTest).toBe(false);
    expect(fill.material.depthWrite).toBe(false);
    expect(fill.renderOrder).toBeGreaterThan(0);
    // The outline must not sort behind its own fill.
    expect(findByKind(sg, 'Line').renderOrder).toBeGreaterThan(fill.renderOrder);
  });

  it('keeps the slice congruent to the base at every height — the whole point', () => {
    const prism = builtPrism();
    const area = (tris) => tris.reduce((sum, [p0, p1, p2]) => {
      const e1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
      const e2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
      const c = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      return sum + 0.5 * Math.hypot(c[0], c[1], c[2]);
    }, 0);

    const baseArea = P.objectVolume({ type: 'rect', position: prism.position, u: prism.u, v: prism.v });
    [0, 0.25, 0.5, 1].forEach((t) => {
      const tris = triangles(findByKind(R.buildSliceGroup(window.THREE, prism, t), 'Mesh').geometry);
      expect(area(tris)).toBeCloseTo(baseArea, 6);
    });
  });

  it('returns an empty group for anything that is not a prism', () => {
    expect(R.buildSliceGroup(window.THREE, builtRect(), 0.5).children).toHaveLength(0);
    expect(R.buildSliceGroup(window.THREE, null, 0.5).children).toHaveLength(0);
  });
});

// ── Mutation guards ─────────────────────────────────────────────────────────
// A visibility test that also passes on the broken code is worth nothing. These
// re-load the module with the original defects patched back in and assert the
// checks above go RED, so the suite is proven to detect the regression rather
// than merely to agree with the current source.
function loadWithDefect(replacements) {
  const src = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_geosandbox.js'), 'utf8');
  let out = src;
  replacements.forEach(([from, to]) => {
    if (!out.includes(from)) throw new Error('mutation target no longer in source: ' + from);
    out = out.split(from).join(to);
  });
  const keep = { pure: window.StemLab.geoPure, render: window.StemLab.geoRender };
  // eslint-disable-next-line no-new-func
  new Function(out)();
  const defective = window.StemLab.geoRender;
  window.StemLab.geoPure = keep.pure;
  window.StemLab.geoRender = keep.render;
  return defective;
}

describe('regression guards (the checks above are proven to fail on the old code)', () => {
  it('catches the inside-out prism base', () => {
    const defective = loadWithDefect([['[0, 3, 2, 1], // bottom', '[0, 1, 2, 3], // bottom']]);
    const g = defective.buildConstructionGroup(window.THREE, [builtPrism()], null, false, 'u');
    const d = outwardness(triangles(findByKind(g.children[0], 'Mesh').geometry));

    expect(d.some((n) => n < 0)).toBe(true);              // base normal points INTO the solid
    expect(d.filter((n) => n < 0)).toHaveLength(2);       // exactly the two base triangles
  });

  it('catches every solid sharing one depth sort key', () => {
    const defective = loadWithDefect([['recentreForSort(THREE, mesh);', '']]);
    const near = Object.assign({ id: 1 }, P.stretchRect(builtRect(), 'z', 4));
    const far = Object.assign({ id: 2 }, P.stretchRect(builtRect(), 'z', 4), { position: [12, 0, 9] });
    const g = defective.buildConstructionGroup(window.THREE, [near, far], null, false, 'u');

    const a = g.children[0].position, b = g.children[1].position;
    expect([a.x, a.y, a.z]).toEqual([0, 0, 0]);
    expect([b.x, b.y, b.z]).toEqual([0, 0, 0]);           // identical -> draw order = creation order
  });
});

describe('recentreForSort is a no-op where it must be', () => {
  it('ignores a bare mesh, an empty group, and a null node', () => {
    const THREE = window.THREE;
    expect(() => R.recentreForSort(THREE, null)).not.toThrow();

    const empty = new THREE.Group();
    R.recentreForSort(THREE, empty);
    expect([empty.position.x, empty.position.y, empty.position.z]).toEqual([0, 0, 0]);

    const bare = new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshBasicMaterial({}));
    bare.position.set(5, 6, 7);
    R.recentreForSort(THREE, bare);
    expect([bare.position.x, bare.position.y, bare.position.z]).toEqual([5, 6, 7]);
  });
});
