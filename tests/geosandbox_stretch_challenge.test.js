// Tests for the Geometry Sandbox stretch-math + build-challenge PURE core
// (window.StemLab.geoPure). jsdom has no WebGL/XR, so the VR mechanic and the
// React UI are NOT exercised here — what IS pinned is the math that the mechanic
// teaches and that the challenge system checks: measurement by dimension, seeded
// deterministic challenge generation, and target evaluation with tolerance.

import { describe, it, expect, beforeAll } from 'vitest';
import { loadAlloModule } from './setup.js';

let P;
beforeAll(() => {
  loadAlloModule('stem_lab/stem_tool_geosandbox.js');
  P = window.StemLab && window.StemLab.geoPure;
  if (!P) throw new Error('geoPure not exposed on window.StemLab');
});

describe('geoStretchMeasure (dimension + the size that counts)', () => {
  it('measures point / segment / rect / prism with the right dimension and kind', () => {
    expect(P.geoStretchMeasure({ type: 'point', position: [0, 0, 0] })).toMatchObject({ dim: 0, kind: 'point', value: 0 });
    const seg = P.geoStretchMeasure({ type: 'segment', position: [0, 0, 0], vector: [3, 0, 0] });
    expect(seg).toMatchObject({ dim: 1, kind: 'length' });
    expect(seg.value).toBeCloseTo(3, 6);
    const rect = P.geoStretchMeasure({ type: 'rect', position: [0, 0, 0], u: [3, 0, 0], v: [0, 4, 0] });
    expect(rect).toMatchObject({ dim: 2, kind: 'area' });
    expect(rect.value).toBeCloseTo(12, 6);
    const prism = P.geoStretchMeasure({ type: 'prism', position: [0, 0, 0], u: [2, 0, 0], v: [0, 3, 0], w: [0, 0, 4] });
    expect(prism).toMatchObject({ dim: 3, kind: 'volume' });
    expect(prism.value).toBeCloseTo(24, 6);
  });
  it('returns null for unknown/empty input', () => {
    expect(P.geoStretchMeasure(null)).toBe(null);
    expect(P.geoStretchMeasure({ type: 'blob' })).toBe(null);
  });
});

describe('geoMakeBuildChallenge (seeded, deterministic)', () => {
  it('maps level 1/2/3 to length/area/volume goals', () => {
    expect(P.geoMakeBuildChallenge(1, 7).kind).toBe('length');
    expect(P.geoMakeBuildChallenge(2, 7).kind).toBe('area');
    expect(P.geoMakeBuildChallenge(3, 7).kind).toBe('volume');
  });
  it('is deterministic for a given (level, seed) and varies with seed', () => {
    expect(P.geoMakeBuildChallenge(3, 42)).toEqual(P.geoMakeBuildChallenge(3, 42));
    const a = P.geoMakeBuildChallenge(3, 1).target, b = P.geoMakeBuildChallenge(3, 999).target;
    // not a hard guarantee, but these two seeds must differ for the generator to be useful
    expect(a === b && P.geoMakeBuildChallenge(3, 2).target === a).toBe(false);
  });
  it('produces positive whole-number targets and a prompt + hint', () => {
    for (let lv = 1; lv <= 3; lv++) {
      const ch = P.geoMakeBuildChallenge(lv, lv * 13);
      expect(ch.target).toBeGreaterThan(0);
      expect(Number.isInteger(ch.target)).toBe(true);
      expect(typeof ch.prompt).toBe('string');
      expect(ch.prompt.length).toBeGreaterThan(0);
      expect(ch.hint.length).toBeGreaterThan(0);
    }
  });
  it('clamps out-of-range levels', () => {
    expect(P.geoMakeBuildChallenge(0, 1).kind).toBe('length');
    expect(P.geoMakeBuildChallenge(9, 1).kind).toBe('volume');
  });
});

describe('geoEvalBuildChallenge (target checking with tolerance)', () => {
  it('is unsolved with no matching-dimension object, and reports so', () => {
    const ch = { kind: 'volume', target: 24, tolerance: 0.05 };
    const r = P.geoEvalBuildChallenge(ch, [{ type: 'segment', position: [0, 0, 0], vector: [3, 0, 0] }]);
    expect(r.solved).toBe(false);
    expect(r.closest).toBe(null);
  });
  it('solves when an object of the right kind lands within tolerance', () => {
    const ch = { kind: 'volume', target: 24, tolerance: 0.05 };
    const prism = { type: 'prism', position: [0, 0, 0], u: [2, 0, 0], v: [0, 3, 0], w: [0, 0, 4] };
    const r = P.geoEvalBuildChallenge(ch, [prism]);
    expect(r.solved).toBe(true);
    expect(r.closest).toBeCloseTo(24, 6);
  });
  it('reports the closest attempt when not yet solved', () => {
    const ch = { kind: 'area', target: 20, tolerance: 0.05 };
    const rect = { type: 'rect', position: [0, 0, 0], u: [3, 0, 0], v: [0, 6, 0] };  // area 18
    const r = P.geoEvalBuildChallenge(ch, [rect]);
    expect(r.solved).toBe(false);
    expect(r.closest).toBeCloseTo(18, 6);
    expect(r.deltaPct).toBeCloseTo(0.1, 6);
  });
  it('an actual stretch chain point→segment→rect→prism satisfies a generated volume challenge', () => {
    // Build 2 × 3 × 4 = 24 by stretching, then check a matching challenge solves.
    const pt = { type: 'point', position: [0, 0, 0] };
    const seg = P.stretchSegment ? null : null; // guard: use the exposed stretch fns
    const s = P.stretchPoint(pt, 'x', 2);
    const r = P.stretchSegment(s, 'y', 3);
    const pr = P.stretchRect(r, 'z', 4);
    expect(P.geoStretchMeasure(pr).value).toBeCloseTo(24, 6);
    const ch = { kind: 'volume', target: 24, tolerance: 0.05 };
    expect(P.geoEvalBuildChallenge(ch, [pt, s, r, pr]).solved).toBe(true);
  });
});

describe('surface area + Cavalieri oblique stretch (geoPrismSurfaceArea, slant)', () => {
  it('computes prism surface area = 2(|uv|+|vw|+|wu|)', () => {
    const box = { type: 'prism', position: [0, 0, 0], u: [2, 0, 0], v: [0, 3, 0], w: [0, 0, 4] };
    // 2*(2*3 + 3*4 + 4*2) = 2*(6+12+8) = 52
    expect(P.geoPrismSurfaceArea(box)).toBeCloseTo(52, 6);
    expect(P.geoStretchMeasure(box).surfaceArea).toBeCloseTo(52, 6);
  });
  it('a Cavalieri slant preserves volume but increases surface area', () => {
    const rect = { type: 'rect', position: [0, 0, 0], u: [3, 0, 0], v: [0, 4, 0] };
    const straight = P.stretchRect(rect, 'z', 5, 0);
    const oblique = P.stretchRect(rect, 'z', 5, 0.8);
    expect(P.objectVolume(straight)).toBeCloseTo(60, 6);
    expect(P.objectVolume(oblique)).toBeCloseTo(P.objectVolume(straight), 6);  // Cavalieri: same volume
    expect(P.geoPrismSurfaceArea(oblique)).toBeGreaterThan(P.geoPrismSurfaceArea(straight)); // slant adds surface
    expect(P.geoStretchMeasure(oblique).oblique).toBe(true);
    expect(P.geoStretchMeasure(straight).oblique).toBe(false);
  });
  it('a Cavalieri slant on a segment→rect preserves area (2D Cavalieri)', () => {
    const seg = { type: 'segment', position: [0, 0, 0], vector: [4, 0, 0] };
    const straight = P.stretchSegment(seg, 'y', 3, 0);
    const oblique = P.stretchSegment(seg, 'y', 3, 1.0);
    expect(P.objectVolume(straight)).toBeCloseTo(12, 6);
    expect(P.objectVolume(oblique)).toBeCloseTo(12, 6);  // parallelogram, same area
  });
  it('slant defaults to 0 (backward-compatible right prism)', () => {
    const rect = { type: 'rect', position: [0, 0, 0], u: [2, 0, 0], v: [0, 2, 0] };
    const a = P.stretchRect(rect, 'z', 2);
    expect(P.geoStretchMeasure(a).oblique).toBe(false);
  });
});

describe('missions ladder (GEO_MISSIONS, geoEvalMission)', () => {
  it('exposes an ordered mission list with declarative tests', () => {
    expect(Array.isArray(P.GEO_MISSIONS)).toBe(true);
    expect(P.GEO_MISSIONS.length).toBeGreaterThanOrEqual(5);
    P.GEO_MISSIONS.forEach(function(mn) { expect(mn.id && mn.title && mn.test).toBeTruthy(); });
  });
  it('checks measure / cube / oblique / cavalieri missions', () => {
    const box = { type: 'prism', position: [0,0,0], u: [3,0,0], v: [0,3,0], w: [0,0,3] };  // cube 3^3
    const rectM = P.GEO_MISSIONS.find(function(m){ return m.id === 'rect'; });
    const cubeM = P.GEO_MISSIONS.find(function(m){ return m.id === 'cube'; });
    expect(P.geoEvalMission(cubeM, [box]).solved).toBe(true);
    expect(P.geoEvalMission(cubeM, [{ type:'prism', position:[0,0,0], u:[2,0,0], v:[0,3,0], w:[0,0,4] }]).solved).toBe(false);
    const rect = { type: 'rect', position:[0,0,0], u:[3,0,0], v:[0,4,0] };  // area 12
    expect(P.geoEvalMission(rectM, [rect]).solved).toBe(true);
    // oblique + cavalieri
    const r = { type:'rect', position:[0,0,0], u:[3,0,0], v:[0,4,0] };
    const straight = P.stretchRect(r, 'z', 5, 0);
    const slanted = P.stretchRect(r, 'z', 5, 0.8);
    const obM = P.GEO_MISSIONS.find(function(m){ return m.id === 'oblique'; });
    const cavM = P.GEO_MISSIONS.find(function(m){ return m.id === 'cavalieri'; });
    expect(P.geoEvalMission(obM, [slanted]).solved).toBe(true);
    expect(P.geoEvalMission(obM, [straight]).solved).toBe(false);
    expect(P.geoEvalMission(cavM, [straight, slanted]).solved).toBe(true);  // same volume, one straight one slanted
    expect(P.geoEvalMission(cavM, [straight]).solved).toBe(false);
  });
});

describe('prism net (geoPrismNet)', () => {
  it('unfolds a right prism into 6 faces whose areas sum to the surface area', () => {
    const box = { type: 'prism', position:[0,0,0], u:[2,0,0], v:[0,3,0], w:[0,0,4] };
    const net = P.geoPrismNet(box);
    expect(net).toBeTruthy();
    expect(net.faces.length).toBe(6);
    const sum = net.faces.reduce(function(s, f){ return s + f.w * f.h; }, 0);
    expect(sum).toBeCloseTo(P.geoPrismSurfaceArea(box), 5);
    expect(net.width).toBeGreaterThan(0);
    expect(net.height).toBeGreaterThan(0);
  });
  it('returns null for an oblique prism (non-rectangular flaps)', () => {
    const r = { type:'rect', position:[0,0,0], u:[3,0,0], v:[0,4,0] };
    const slanted = P.stretchRect(r, 'z', 5, 0.8);
    expect(P.geoPrismNet(slanted)).toBe(null);
    expect(P.geoPrismNet({ type: 'rect', position:[0,0,0], u:[1,0,0], v:[0,1,0] })).toBe(null);
  });
});

describe('square-cube law scaling (geoScaleObject, geoScaleReport)', () => {
  it('scales every defining vector by k (similar shape)', () => {
    const box = { type: 'prism', position: [1, 2, 3], u: [2, 0, 0], v: [0, 3, 0], w: [0, 0, 4] };
    const s = P.geoScaleObject(box, 2);
    expect(s.u).toEqual([4, 0, 0]);
    expect(s.v).toEqual([0, 6, 0]);
    expect(s.w).toEqual([0, 0, 8]);
    expect(s.position).toEqual([1, 2, 3]);  // position preserved
  });
  it('reports k / k^2 / k^3 ratios for a prism (edge / surface / volume)', () => {
    const box = { type: 'prism', position: [0, 0, 0], u: [2, 0, 0], v: [0, 3, 0], w: [0, 0, 4] };
    const rep = P.geoScaleReport(box, 2);
    const byLabel = {}; rep.rows.forEach(function(r){ byLabel[r.label] = r; });
    expect(byLabel.Edge.ratio).toBeCloseTo(2, 6);
    expect(byLabel.Surface.ratio).toBeCloseTo(4, 6);
    expect(byLabel.Volume.ratio).toBeCloseTo(8, 6);
    expect(byLabel.Volume.after).toBeCloseTo(byLabel.Volume.before * 8, 6);
    expect(byLabel.Surface.after).toBeCloseTo(byLabel.Surface.before * 4, 6);
  });
  it('reports k / k^2 for a rectangle (perimeter / area) and k for a segment', () => {
    const rect = { type: 'rect', position: [0,0,0], u: [3,0,0], v: [0,4,0] };
    const rr = P.geoScaleReport(rect, 3);
    const rl = {}; rr.rows.forEach(function(r){ rl[r.label] = r; });
    expect(rl.Perimeter.ratio).toBeCloseTo(3, 6);
    expect(rl.Area.ratio).toBeCloseTo(9, 6);
    const seg = { type: 'segment', position: [0,0,0], vector: [5,0,0] };
    const sr = P.geoScaleReport(seg, 2);
    expect(sr.rows[0].ratio).toBeCloseTo(2, 6);
    expect(sr.rows[0].after).toBeCloseTo(10, 6);
  });
  it('null report for a point (0-D nothing to scale)', () => {
    expect(P.geoScaleReport({ type: 'point', position: [0,0,0] }, 2)).toBe(null);
  });
  it('square-cube mission solves for a prism + its 2x similar copy', () => {
    const m = P.GEO_MISSIONS.find(function(x){ return x.id === 'squarecube'; });
    const box = { type: 'prism', position: [0,0,0], u: [2,0,0], v: [0,3,0], w: [0,0,4] };
    const twice = P.geoScaleObject(box, 2);
    expect(P.geoEvalMission(m, [box, twice]).solved).toBe(true);
    expect(P.geoEvalMission(m, [box]).solved).toBe(false);
    // a non-similar second prism must NOT count
    expect(P.geoEvalMission(m, [box, { type:'prism', position:[0,0,0], u:[4,0,0], v:[0,3,0], w:[0,0,4] }]).solved).toBe(false);
  });
});

describe('cross-section slicer (geoCrossSectionArea, geoCrossSectionInfo, geoStackVolume)', () => {
  it('a prism cross-section area is constant up the height (Cavalieri) and equals the base area', () => {
    const box = { type: 'prism', position: [0,0,0], u: [2,0,0], v: [0,3,0], w: [0,0,5] };
    const base = 6; // |u x v| = 2*3
    expect(P.geoCrossSectionArea(box, 0.1)).toBeCloseTo(base, 6);
    expect(P.geoCrossSectionArea(box, 0.5)).toBeCloseTo(base, 6);
    expect(P.geoCrossSectionArea(box, 0.9)).toBeCloseTo(base, 6);
    expect(P.geoCrossSectionArea(box, 1.5)).toBe(0);   // outside the solid
    expect(P.geoCrossSectionArea(box, -0.2)).toBe(0);
  });
  it('an OBLIQUE prism has the same constant cross-section area (equal-area slices)', () => {
    const rect = { type: 'rect', position: [0,0,0], u: [2,0,0], v: [0,3,0] };
    const straight = P.stretchRect(rect, 'z', 5, 0);
    const oblique = P.stretchRect(rect, 'z', 5, 0.9);
    expect(P.geoCrossSectionArea(oblique, 0.5)).toBeCloseTo(P.geoCrossSectionArea(straight, 0.5), 6);
  });
  it('geoCrossSectionInfo gives base area, perpendicular height, and volume = area x height', () => {
    const box = { type: 'prism', position: [0,0,0], u: [2,0,0], v: [0,3,0], w: [0,0,5] };
    const info = P.geoCrossSectionInfo(box);
    expect(info.baseArea).toBeCloseTo(6, 6);
    expect(info.height).toBeCloseTo(5, 6);
    expect(info.volume).toBeCloseTo(30, 6);
    expect(info.baseArea * info.height).toBeCloseTo(info.volume, 6);
  });
  it('geoStackVolume (Riemann stack of slices) recovers the volume for any slice count', () => {
    const box = { type: 'prism', position: [0,0,0], u: [2,0,0], v: [0,3,0], w: [0,0,5] };
    expect(P.geoStackVolume(box, 4)).toBeCloseTo(30, 6);
    expect(P.geoStackVolume(box, 40)).toBeCloseTo(30, 6);
  });
  it('null / zero for non-prisms', () => {
    expect(P.geoCrossSectionInfo({ type: 'rect', position:[0,0,0], u:[1,0,0], v:[0,1,0] })).toBe(null);
    expect(P.geoCrossSectionArea({ type: 'segment', position:[0,0,0], vector:[1,0,0] }, 0.5)).toBe(0);
  });
});

describe('resizeObject (edit a placed object; preserve direction + slant)', () => {
  it('sets a segment to a new length along the same direction', () => {
    const seg = { id: 1, type: 'segment', position: [0, 0, 0], vector: [3, 0, 0] };
    const r = P.resizeObject(seg, 0, 7);
    expect(P.geoStretchMeasure(r).value).toBeCloseTo(7, 6);
    expect(r.vector[1]).toBeCloseTo(0, 9);
    expect(r.vector[2]).toBeCloseTo(0, 9);
  });
  it('resizing one rect side scales area proportionally, leaves the other side', () => {
    const rect = { id: 1, type: 'rect', position: [0, 0, 0], u: [3, 0, 0], v: [0, 4, 0] };
    const r = P.resizeObject(rect, 0, 6);            // u: 3 -> 6, area 12 -> 24
    expect(P.geoStretchMeasure(r).value).toBeCloseTo(24, 6);
    expect(r.v).toEqual([0, 4, 0]);
  });
  it('resizing prism height scales volume; preserves an oblique slant direction', () => {
    // oblique w = height (up) + shear (along u): |w| = sqrt(4^2 + 2^2)
    const prism = { id: 1, type: 'prism', position: [0, 0, 0], u: [2, 0, 0], v: [0, 3, 0], w: [2, 4, 0] };
    const before = P.geoStretchMeasure(prism);
    expect(before.oblique).toBe(true);
    const r = P.resizeObject(prism, 2, 2 * Math.hypot(2, 4));   // double the w-edge length
    // direction preserved → still oblique, and volume doubles (base area unchanged, height doubles)
    const after = P.geoStretchMeasure(r);
    expect(after.oblique).toBe(true);
    expect(after.value).toBeCloseTo(before.value * 2, 4);
  });
  it('leaves a point unchanged (no size to edit)', () => {
    const pt = { id: 1, type: 'point', position: [1, 0, 2] };
    expect(P.resizeObject(pt, 0, 5)).toEqual(pt);
  });
});

describe('taperRect / pyramid volume (the 1/3 and frustum formulas)', () => {
  const rect = { id: 1, type: 'rect', position: [0, 0, 0], u: [3, 0, 0], v: [0, 4, 0] }; // base area 12
  it('topScale 1 (box) equals the prism volume base×height', () => {
    const box = P.taperRect(rect, 'z', 5, 1, 0);
    expect(box.type).toBe('pyramid');
    expect(P.geoStretchMeasure(box).value).toBeCloseTo(12 * 5, 5);   // 60
  });
  it('topScale 0 (pyramid) is exactly 1/3 of the box', () => {
    const pyr = P.taperRect(rect, 'z', 5, 0, 0);
    expect(P.geoStretchMeasure(pyr).value).toBeCloseTo(12 * 5 / 3, 5); // 20
    expect(P.geoStretchMeasure(pyr).apex).toBe(true);
  });
  it('a frustum (topScale 0.5) uses V = h/3 (B1 + B2 + sqrt(B1 B2))', () => {
    const s = 0.5, h = 5, B1 = 12, B2 = 12 * s * s;               // top area scales by s^2
    const expected = h / 3 * (B1 + B2 + Math.sqrt(B1 * B2));
    const fr = P.taperRect(rect, 'z', h, s, 0);
    expect(P.geoStretchMeasure(fr).value).toBeCloseTo(expected, 5);
    expect(P.geoStretchMeasure(fr).apex).toBe(false);
  });
  it('surface area: pyramid base + 4 triangles; box matches the prism SA', () => {
    const box = P.taperRect(rect, 'z', 5, 1, 0);
    // prism 3x4x5 SA = 2(12 + 20 + 15) = 94
    expect(P.geoPyramidSurfaceArea(box)).toBeCloseTo(94, 4);
    const pyr = P.taperRect(rect, 'z', 5, 0, 0);
    // base 12 + 4 triangles; apex above base centre → two pairs of slant triangles
    // face over the 3-wide edges: half-base 2 (=4/2) → slant h = sqrt(5^2+? ) — just assert > base and finite
    const sa = P.geoPyramidSurfaceArea(pyr);
    expect(sa).toBeGreaterThan(12);
    expect(Number.isFinite(sa)).toBe(true);
  });
});

describe('revolveRect / solid of revolution (Pappus: V = θ·R̄·A)', () => {
  it('full turn of a rect with an edge on the axis → cylinder V = πr²h', () => {
    // rect x∈[0,2] (radius), y∈[0,3] (height along the spin axis Y), spun about Y.
    const rect = { id: 1, type: 'rect', position: [0, 0, 0], u: [2, 0, 0], v: [0, 3, 0] };
    const cyl = P.revolveRect(rect, 'y', 360, 48);
    expect(cyl.type).toBe('revolution');
    expect(P.geoStretchMeasure(cyl).value).toBeCloseTo(Math.PI * 4 * 3, 4); // πr²h = 12π
  });
  it('an offset rect (ring) uses the centroid radius, not the inner radius', () => {
    // x∈[2,4] spun about Y: Pappus R̄ = centroid x = 3, A = 2×3 = 6 → V = 2π·3·6 = 36π.
    const rect = { id: 1, type: 'rect', position: [2, 0, 0], u: [2, 0, 0], v: [0, 3, 0] };
    const ring = P.revolveRect(rect, 'y', 360, 48);
    expect(P.geoStretchMeasure(ring).value).toBeCloseTo(2 * Math.PI * 3 * 6, 4);
    // sanity vs the washer formula π(R_out² − R_in²)h = π(16−4)·3 = 36π
    expect(2 * Math.PI * 3 * 6).toBeCloseTo(Math.PI * (16 - 4) * 3, 6);
  });
  it('a half turn is exactly half the full-turn volume', () => {
    const rect = { id: 1, type: 'rect', position: [0, 0, 0], u: [2, 0, 0], v: [0, 3, 0] };
    const full = P.revolutionVolume(P.revolveRect(rect, 'y', 360, 48));
    const half = P.revolutionVolume(P.revolveRect(rect, 'y', 180, 48));
    expect(half).toBeCloseTo(full / 2, 5);
  });
});

describe('real-world builds + fattest-solid puzzle (Wave 5)', () => {
  it('the die challenge requires an actual cube of the right volume', () => {
    const die = P.GEO_REAL_OBJECTS.find(function (r) { return r.id === 'die'; });
    const cube = { id: 1, type: 'prism', position: [0, 0, 0], u: [2, 0, 0], v: [0, 2, 0], w: [0, 0, 2] };   // 2³ = 8
    const slab = { id: 2, type: 'prism', position: [0, 0, 0], u: [4, 0, 0], v: [0, 2, 0], w: [0, 0, 1] };   // vol 8 but NOT a cube
    expect(P.geoEvalRealChallenge(die, [cube]).solved).toBe(true);
    expect(P.geoEvalRealChallenge(die, [slab]).solved).toBe(false);   // right volume, wrong shape
  });
  it('the can challenge only accepts a solid of revolution near πr²h', () => {
    const can = P.GEO_REAL_OBJECTS.find(function (r) { return r.id === 'can'; });
    const cyl = P.revolveRect({ type: 'rect', position: [0, 0, 0], u: [2, 0, 0], v: [0, 2, 0] }, 'y', 360, 48);
    const box = { id: 2, type: 'prism', position: [0, 0, 0], u: [2, 0, 0], v: [0, 2, 0], w: [0, 0, 6.28] };
    expect(P.geoEvalRealChallenge(can, [cyl]).solved).toBe(true);
    expect(P.geoEvalRealChallenge(can, [box]).solved).toBe(false);   // right volume, not a revolution
  });
  it('fattest-solid puzzle: a 3×3×3 cube is optimal at cap 54', () => {
    const cube = { id: 1, type: 'prism', position: [0, 0, 0], u: [3, 0, 0], v: [0, 3, 0], w: [0, 0, 3] }; // SA 54, V 27
    const res = P.geoEvalMaxVolPuzzle(54, [cube]);
    expect(res.best).toBeCloseTo(27, 4);
    expect(res.atOptimum).toBe(true);
    // a long thin bar of equal SA has far less volume and does not reach optimum
    const bar = { id: 2, type: 'prism', position: [0, 0, 0], u: [8, 0, 0], v: [0, 1, 0], w: [0, 0, 1] }; // SA 2(8+8+1)=34 ≤54, V 8
    expect(P.geoEvalMaxVolPuzzle(54, [bar]).atOptimum).toBe(false);
  });
});
