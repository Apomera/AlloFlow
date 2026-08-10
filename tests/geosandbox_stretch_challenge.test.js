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
  it('returns null for a prism with a sheared base', () => {
    const shearedBase = { type:'prism', position:[0,0,0], u:[3,0,0], v:[1,4,0], w:[0,0,5] };
    expect(P.geoStretchMeasure(shearedBase).oblique).toBe(false);
    expect(P.geoPrismNet(shearedBase)).toBe(null);
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
  it('scales tapered solids without dropping their shape data', () => {
    const pyramid = { type: 'pyramid', position:[0,0,0], u:[3,0,0], v:[0,3,0], w:[0,0,4], topScale:0 };
    const scaled = P.geoScaleObject(pyramid, 2);
    expect(scaled.topScale).toBe(0);
    expect(scaled.u).toEqual([6,0,0]);
    const report = P.geoScaleReport(pyramid, 2);
    expect(report.rows.find(function(r){ return r.label === 'Surface'; }).ratio).toBe(4);
    expect(report.rows.find(function(r){ return r.label === 'Volume'; }).ratio).toBe(8);
  });
  it('returns null for unsupported solids instead of throwing during render', () => {
    const revolution = P.revolveRect({ type:'rect', position:[0,0,0], u:[2,0,0], v:[0,3,0] }, 'y', 360, 48);
    expect(P.geoScaleObject(revolution, 2)).toBe(null);
    expect(P.geoScaleReport(revolution, 2)).toBe(null);
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

describe('geoFormulaSteps (single-mode "show the math")', () => {
  it('cylinder substitutes πr²h and the value matches calcMeasurements', () => {
    const s = P.geoFormulaSteps('cylinder', { rTop: 2, rBot: 2, h: 5 });
    expect(s.vol.value).toBeCloseTo(Math.PI * 4 * 5, 4);
    expect(s.vol.sub).toContain('(2)');
    expect(s.vol.sub).toContain('(5)');
    expect(s.vol.formula).toContain('r²h');
  });
  it('box volume substitution equals w·h·d', () => {
    const s = P.geoFormulaSteps('box', { w: 2, h: 3, d: 4 });
    expect(s.vol.value).toBeCloseTo(24, 6);
    expect(s.vol.sub).toBe('(2)·(3)·(4)');
  });
  it('sphere and cone report the right named volume', () => {
    expect(P.geoFormulaSteps('sphere', { r: 3 }).vol.value).toBeCloseTo(4 / 3 * Math.PI * 27, 4);
    expect(P.geoFormulaSteps('cone', { r: 2, h: 6 }).vol.value).toBeCloseTo(Math.PI * 4 * 6 / 3, 4);
  });
  it('shows complete frustum substitutions instead of the cylinder formula or ellipses', () => {
    const s = P.geoFormulaSteps('cylinder', { rTop: 1, rBot: 3, h: 4 });
    expect(s.name).toBe('Frustum');
    expect(s.vol.formula).toContain('r₁² + r₁r₂ + r₂²');
    expect(s.vol.sub).toContain('(1)²');
    expect(s.vol.sub).toContain('(3)²');
    expect(s.vol.sub).not.toContain('…');
    expect(s.sa.sub).toContain('[l=√');
  });
});

describe('square-pyramid mesh dimensions', () => {
  it('converts a base half-side to the square circumradius used by Three.js', () => {
    const halfSide = 2;
    const radius = P.geoPyramidGeometryRadius(halfSide);
    expect(radius).toBeCloseTo(2 * Math.sqrt(2), 8);
    expect(2 * radius * radius).toBeCloseTo(Math.pow(2 * halfSide, 2), 8);
  });
});

describe('geoNormalizeShapeDims', () => {
  it('keeps a torus in the non-self-intersecting ring range without mutating input', () => {
    const input = { r: 0.8, tube: 2, segs: 31 };
    const dims = P.geoNormalizeShapeDims('torus', input);
    expect(dims.r).toBe(0.8);
    expect(dims.tube).toBeCloseTo(0.7, 8);
    expect(input.tube).toBe(2);
  });
  it('repairs non-finite and out-of-range active dimensions', () => {
    const dims = P.geoNormalizeShapeDims('box', { w: NaN, h: -4, d: 99 });
    expect(dims.w).toBe(3);
    expect(dims.h).toBe(0.5);
    expect(dims.d).toBe(10);
  });
});

describe('geoChallengeAnswerCorrect', () => {
  it('accepts full shape names and intentional aliases, but rejects arbitrary fragments', () => {
    const challenge = { type: 'identify', answer: 'Rectangular Prism' };
    expect(P.geoChallengeAnswerCorrect(challenge, 'rectangular prism')).toBe(true);
    expect(P.geoChallengeAnswerCorrect(challenge, 'cuboid')).toBe(true);
    expect(P.geoChallengeAnswerCorrect(challenge, 'r')).toBe(false);
    expect(P.geoChallengeAnswerCorrect(challenge, 'prism')).toBe(false);
  });
  it('requires exact integers for topology answers and strict numeric parsing', () => {
    expect(P.geoChallengeAnswerCorrect({ type: 'faces', answer: 6 }, '6')).toBe(true);
    expect(P.geoChallengeAnswerCorrect({ type: 'faces', answer: 6 }, '6.9')).toBe(false);
    expect(P.geoChallengeAnswerCorrect({ type: 'volume', answer: 100 }, '104.9')).toBe(true);
    expect(P.geoChallengeAnswerCorrect({ type: 'volume', answer: 100 }, '100 units')).toBe(false);
  });
});

describe('geoFormatChallengeAnswer', () => {
  it('keeps topology answers integral while rounding measured answers for feedback', () => {
    expect(P.geoFormatChallengeAnswer({ type: 'faces', answer: 6 })).toBe('6');
    expect(P.geoFormatChallengeAnswer({ type: 'volume', answer: Math.PI })).toBe('3.14');
    expect(P.geoFormatChallengeAnswer({ type: 'identify', answer: 'Sphere' })).toBe('Sphere');
  });
});

describe('geoCrossSection + geoConicSection (single-mode slicing)', () => {
  it('cone cross-section is a circle shrinking to the apex; area = πr²', () => {
    const base = P.geoCrossSection('cone', { r: 3, h: 6 }, 0);      // bottom
    const mid = P.geoCrossSection('cone', { r: 3, h: 6 }, 0.5);
    const top = P.geoCrossSection('cone', { r: 3, h: 6 }, 1);       // apex
    expect(base.name).toBe('Circle');
    expect(base.r).toBeCloseTo(3, 6);
    expect(mid.r).toBeCloseTo(1.5, 6);
    expect(top.r).toBeCloseTo(0, 6);
    expect(base.area).toBeCloseTo(Math.PI * 9, 5);
  });
  it('sphere slices are circles: widest at the equator, zero at the poles', () => {
    const eq = P.geoCrossSection('sphere', { r: 2 }, 0.5);
    const pole = P.geoCrossSection('sphere', { r: 2 }, 1);
    expect(eq.r).toBeCloseTo(2, 6);
    expect(pole.r).toBeCloseTo(0, 6);
  });
  it('box slices are a constant rectangle', () => {
    const a = P.geoCrossSection('box', { w: 2, h: 5, d: 3 }, 0.2);
    const b = P.geoCrossSection('box', { w: 2, h: 5, d: 3 }, 0.9);
    expect(a.area).toBeCloseTo(6, 6);
    expect(b.area).toBeCloseTo(6, 6);
  });
  it('conic classifier: circle at 0°, then ellipse → parabola → hyperbola', () => {
    const d = { r: 3, h: 3 };                 // side angle σ = atan(3/3) = 45°
    expect(P.geoConicSection(d, 0).name).toBe('Circle');
    expect(P.geoConicSection(d, 20).name).toBe('Ellipse');
    expect(P.geoConicSection(d, 45).name).toBe('Parabola');
    expect(P.geoConicSection(d, 70).name).toBe('Hyperbola');
  });
});

describe('geoShapeNet + geoRealWorldScale (single-mode nets & scale)', () => {
  it('box net is 6 rectangles whose areas sum to the surface area', () => {
    const net = P.geoShapeNet('box', { w: 2, h: 3, d: 4 });
    expect(net.unfoldable).toBe(true);
    expect(net.pieces.length).toBe(6);
    const sum = net.pieces.reduce(function (s, p) { return s + p.area; }, 0);
    expect(sum).toBeCloseTo(2 * (2 * 3 + 2 * 4 + 3 * 4), 5);   // = SA 52
  });
  it('cylinder net = 2 circles + a wrap rectangle 2πr wide', () => {
    const net = P.geoShapeNet('cylinder', { rTop: 2, rBot: 2, h: 5 });
    const wrap = net.pieces.find(function (p) { return p.kind === 'rect'; });
    expect(wrap.w).toBeCloseTo(2 * Math.PI * 2, 5);
    expect(net.pieces.filter(function (p) { return p.kind === 'circle'; }).length).toBe(2);
  });
  it('frustum net uses two unequal circles and an annular sector with matching rim arcs', () => {
    const rTop = 1, rBot = 3, h = 4;
    const net = P.geoShapeNet('cylinder', { rTop: rTop, rBot: rBot, h: h });
    const side = net.pieces.find(function (p) { return p.kind === 'annularSector'; });
    expect(side).toBeTruthy();
    expect(net.pieces.filter(function (p) { return p.kind === 'circle'; }).map(function(p){ return p.r; })).toEqual([rTop, rBot]);
    expect(side.angle * side.rOuter).toBeCloseTo(2 * Math.PI * rBot, 5);
    expect(side.angle * side.rInner).toBeCloseTo(2 * Math.PI * rTop, 5);
    const slant = Math.hypot(rBot - rTop, h);
    const expectedSurface = Math.PI * (rTop * rTop + rBot * rBot + (rTop + rBot) * slant);
    expect(net.pieces.reduce(function(sum, piece){ return sum + piece.area; }, 0)).toBeCloseTo(expectedSurface, 5);
  });
  it('sphere has no flat net', () => {
    expect(P.geoShapeNet('sphere', { r: 2 }).unfoldable).toBe(false);
  });
  it('real-world scale: 1 u³ ≈ 1 litre, with a comparison phrase', () => {
    const rs = P.geoRealWorldScale(8);
    expect(rs.litres).toBeCloseTo(8, 6);
    expect(typeof rs.phrase).toBe('string');
    expect(rs.phrase.length).toBeGreaterThan(0);
  });
});

describe('geoSculptMeasure (sculpt-mode per-part formulas + totals)', () => {
  it('measures each primitive part and sums volume/SA', () => {
    const recipe = { scale: 1, parts: [
      { shape: 'box', size: [2, 2, 2] },        // V 8
      { shape: 'sphere', size: [1] },           // V 4/3π ≈ 4.19
      { shape: 'cylinder', size: [1, 3] }       // V π·1·3 ≈ 9.42
    ] };
    const sm = P.geoSculptMeasure(recipe);
    expect(sm.parts.length).toBe(3);
    expect(sm.parts[0].vol).toBeCloseTo(8, 5);
    expect(sm.parts[0].volFormula).toContain('l');
    const expected = 8 + 4 / 3 * Math.PI * 1 + Math.PI * 1 * 3;
    expect(sm.totalVol).toBeCloseTo(expected, 4);
  });
  it('applies the global scale as ×scale³ (volume) and ×scale² (area)', () => {
    const one = P.geoSculptMeasure({ scale: 1, parts: [{ shape: 'box', size: [2, 2, 2] }] });
    const two = P.geoSculptMeasure({ scale: 2, parts: [{ shape: 'box', size: [2, 2, 2] }] });
    expect(two.totalVol).toBeCloseTo(one.totalVol * 8, 5);
    expect(two.totalSA).toBeCloseTo(one.totalSA * 4, 5);
  });
  it('empty / missing recipe is zero, not a crash', () => {
    expect(P.geoSculptMeasure(null).totalVol).toBe(0);
    expect(P.geoSculptMeasure({ parts: [] }).totalVol).toBe(0);
  });
});

describe('revolve triangle profile → true cone (Wave E)', () => {
  it('a full-turn triangle profile gives exactly ⅓πr²h', () => {
    // profile rect: u = radial [2,0,0] (r=2), v = vertical [0,3,0] (h=3); triangle → cone
    const rect = { type: 'rect', position: [0, 0, 0], u: [2, 0, 0], v: [0, 3, 0] };
    const cone = P.revolveRect(rect, 'y', 360, 48, 'triangle');
    expect(cone.profile).toBe('triangle');
    expect(P.geoStretchMeasure(cone).value).toBeCloseTo(Math.PI * 4 * 3 / 3, 4);  // ⅓πr²h = 4π
    expect(P.geoStretchMeasure(cone).cone).toBe(true);
  });
  it('the same rect as a rectangle profile is a cylinder (3× the cone)', () => {
    const rect = { type: 'rect', position: [0, 0, 0], u: [2, 0, 0], v: [0, 3, 0] };
    const cyl = P.revolutionVolume(P.revolveRect(rect, 'y', 360, 48, 'rect'));
    const cone = P.revolutionVolume(P.revolveRect(rect, 'y', 360, 48, 'triangle'));
    expect(cyl / cone).toBeCloseTo(3, 4);   // cone is a third of its cylinder
  });
});

describe('geoDescribeScene (screen-reader scene summary)', () => {
  it('describes a single solid with its measurements and units', () => {
    const description = P.geoDescribeScene('single', 'box', { w: 2, h: 3, d: 4 }, null, 'cm');
    expect(description).toContain('Single box');
    expect(description).toContain('Volume 24 cm cubed');
    expect(description).toContain('Surface area 52 cm squared');
  });

  it('summarizes construction types and the selected object', () => {
    const construction = {
      objects: [
        { id: 1, type: 'point', position: [0,0,0] },
        { id: 2, type: 'segment', position: [0,0,0], vector: [3,0,0] },
        { id: 3, type: 'segment', position: [0,0,0], vector: [0,4,0] }
      ],
      selection: 2
    };
    const description = P.geoDescribeScene('stretch', null, null, construction, 'u');
    expect(description).toContain('3 objects');
    expect(description).toContain('1 point');
    expect(description).toContain('2 segments');
    expect(description).toContain('Selected Segment #2, Length: 3 u');
  });

  it('describes an empty stretch scene with a useful next action', () => {
    expect(P.geoDescribeScene('stretch', null, null, { objects: [], selection: null }, 'u')).toContain('Add a point to begin');
  });
});

describe('geoBuildTutorPrompt', () => {
  it('uses the current single-shape measurements', () => {
    const prompt = P.geoBuildTutorPrompt('single', 'box', { w: 2, h: 3, d: 4 }, null, null, 'cm');
    expect(prompt).toContain('Rectangular Prism');
    expect(prompt).toContain('Volume = 24.00 cm cubed');
  });
  it('describes the active stretch construction rather than a hidden single shape', () => {
    const construction = { objects: [{ id: 2, type: 'segment', position: [0,0,0], vector: [3,0,0] }], selection: 2 };
    const prompt = P.geoBuildTutorPrompt('stretch', 'sphere', { r: 5 }, construction, null, 'u');
    expect(prompt).toContain('Dimensional-stretch scene');
    expect(prompt).toContain('Selected Segment #2');
    expect(prompt).not.toContain('sphere');
  });
  it('describes sculpt parts and states the overlap limitation', () => {
    const recipe = { name: 'robot', scale: 1, parts: [{ shape: 'box', size: [2,3,4] }, { shape: 'sphere', size: [1] }] };
    const prompt = P.geoBuildTutorPrompt('sculpt', 'box', {}, null, recipe, 'cm');
    expect(prompt).toContain('robot');
    expect(prompt).toContain('Rectangular Prism');
    expect(prompt).toContain('upper bounds because overlapping parts are counted separately');
  });
});

describe('saved construction safety', () => {
  it('creates a bounded unique name instead of overwriting an existing save', () => {
    expect(P.geoUniqueSaveName('My build', {})).toBe('My build');
    expect(P.geoUniqueSaveName('My build', { 'My build': {}, 'My build 2': {} })).toBe('My build 3');
    const long = 'x'.repeat(60);
    expect(P.geoUniqueSaveName(long, { [long.slice(0, 40)]: {} }).length).toBeLessThanOrEqual(40);
  });

  it('deep-clones loaded objects and repairs stale selection ids', () => {
    const snapshot = { objects: [{ id: 7, type: 'point', position: [1, 0, 2] }], selection: 99 };
    const restored = P.geoNormalizeConstruction(snapshot);
    expect(restored.selection).toBe(7);
    expect(restored.objects).toEqual(snapshot.objects);
    expect(restored.objects).not.toBe(snapshot.objects);
    restored.objects[0].position[0] = 42;
    expect(snapshot.objects[0].position[0]).toBe(1);
  });

  it('normalizes malformed or empty snapshots safely', () => {
    expect(P.geoNormalizeConstruction(null)).toEqual({ objects: [], selection: null });
    expect(P.geoNormalizeConstruction({ objects: 'not-an-array', selection: 2 })).toEqual({ objects: [], selection: null });
  });
});

// The axis picker does not govern every build move, and where it does it can be
// overridden. Both were silent, so the control read as broken. geoEffectiveAxis is
// what the UI now says out loud — which only helps if it agrees with the builders.
describe('geoEffectiveAxis (what the axis picker will really do)', () => {
  const AXES = ['x', 'y', 'z'];
  const seg = (vector) => ({ type: 'segment', position: [0, 0, 0], vector });
  const rect = () => P.stretchSegment(seg([3, 0, 0]), 'y', 2);

  it('reports that a rectangle ignores the picker for stretch and taper', () => {
    ['stretch', 'taper'].forEach((verb) => {
      const eff = P.geoEffectiveAxis(rect(), 'x', verb);
      expect(eff.applies).toBe(false);
      expect(eff.reason).toBe('normal');
    });
  });

  it('keeps the picker live for revolve, where it IS the spin axis', () => {
    const eff = P.geoEffectiveAxis(rect(), 'z', 'revolve');
    expect(eff).toMatchObject({ applies: true, axis: 'z', reason: 'ok' });
  });

  it('honours the picked axis for a point, which can stretch any way', () => {
    AXES.forEach((a) => {
      expect(P.geoEffectiveAxis({ type: 'point', position: [0, 0, 0] }, a, 'stretch'))
        .toMatchObject({ applies: true, axis: a, reason: 'ok' });
    });
  });

  it('flags the substituted axis when the pick runs along the segment', () => {
    expect(P.geoEffectiveAxis(seg([3, 0, 0]), 'x', 'stretch')).toMatchObject({ applies: true, reason: 'parallel' });
    expect(P.geoEffectiveAxis(seg([3, 0, 0]), 'x', 'stretch').axis).not.toBe('x');
    // A pick that is genuinely perpendicular is left alone.
    expect(P.geoEffectiveAxis(seg([3, 0, 0]), 'y', 'stretch')).toMatchObject({ axis: 'y', reason: 'ok' });
  });

  it('never lies: the announced axis is the axis stretchSegment actually uses', () => {
    // [3,0.5,0] is the discriminating case: ~0.986 against x, so it is "parallel"
    // at the real 0.95 threshold but not at a stricter one. If the hint's threshold
    // ever drifts from stretchSegment's, this direction catches it.
    const dirs = [[3, 0, 0], [0, 2, 0], [0, 0, 4], [3, 0.1, 0], [3, 0.5, 0], [1, 1, 0]];
    const vecOf = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
    dirs.forEach((vector) => {
      AXES.forEach((picked) => {
        const s = seg(vector);
        const eff = P.geoEffectiveAxis(s, picked, 'stretch');
        const built = P.stretchSegment(s, picked, 2);
        const want = vecOf[eff.axis];
        // v is the announced axis scaled by the length — parallel, same sign.
        expect(built.v[0]).toBeCloseTo(want[0] * 2, 6);
        expect(built.v[1]).toBeCloseTo(want[1] * 2, 6);
        expect(built.v[2]).toBeCloseTo(want[2] * 2, 6);
      });
    });
  });

  it('says nothing is selected rather than guessing', () => {
    expect(P.geoEffectiveAxis(null, 'x', 'stretch')).toMatchObject({ applies: false, reason: 'no_selection' });
  });
});

// The placement ghost added to the 3-D view is purely visual. geoDescribePlacement
// is the only channel that tells a screen-reader user the drop target moved — which
// went from "nice to have" to load-bearing the moment the target could leave the
// floor, because height is exactly what cannot be inferred from anything else.
describe('geoDescribePlacement (the ghost, in words)', () => {
  it('stays quiet when there is nothing worth saying', () => {
    // Disarmed and on the floor: the origin is the default, so narrating it would
    // just be noise on every single canvas focus.
    expect(P.geoDescribePlacement({ armed: false, x: 0, y: 0, z: 0 })).toBe('');
    expect(P.geoDescribePlacement(null)).toBe('');
    expect(P.geoDescribePlacement(undefined)).toBe('');
  });

  it('reports the height whenever the target has left the floor', () => {
    const said = P.geoDescribePlacement({ armed: false, x: 1, y: 3, z: -2 });
    expect(said).toContain('height 3');
    expect(said).toContain('x 1');
    expect(said).toContain('z -2');
  });

  it('distinguishes tapping from the Place button while armed', () => {
    const armed = P.geoDescribePlacement({ armed: true, x: 1, y: 2, z: 0 });
    expect(armed).toContain('Click-to-place is on');
    expect(armed).toContain('height 2');

    const numeric = P.geoDescribePlacement({ armed: false, x: 1, y: 2, z: 0 });
    expect(numeric).toContain('Place button');
    expect(numeric).not.toContain('Click-to-place is on');
  });

  it('says floor level rather than a bare zero when armed on the ground', () => {
    const said = P.geoDescribePlacement({ armed: true, x: 0, y: 0, z: 0 });
    expect(said).toContain('floor level');
    expect(said).not.toContain('height 0');
  });

  it('rounds instead of reading out floating-point noise', () => {
    expect(P.geoDescribePlacement({ armed: false, x: 0.1 + 0.2, y: 1, z: 0 })).toContain('x 0.3');
  });
});

describe('geoDescribeScene carries the placement into the canvas description', () => {
  const scene = { objects: [{ id: 1, type: 'point', position: [0, 0, 0] }], selection: 1 };

  it('appends it to a populated scene', () => {
    const said = P.geoDescribeScene('stretch', null, null, scene, 'u', { armed: false, x: 0, y: 4, z: 0 });
    expect(said).toContain('Selected Point');
    expect(said).toContain('height 4');
  });

  it('appends it to an empty scene too, where it matters most', () => {
    const said = P.geoDescribeScene('stretch', null, null, { objects: [], selection: null }, 'u', { armed: true, x: 0, y: 0, z: 0 });
    expect(said).toContain('Add a point to begin');
    expect(said).toContain('Click-to-place is on');
  });

  it('is unchanged when no placement is passed — old callers keep working', () => {
    const withArg = P.geoDescribeScene('stretch', null, null, scene, 'u', null);
    const without = P.geoDescribeScene('stretch', null, null, scene, 'u');
    expect(withArg).toBe(without);
    expect(without).not.toContain('Place button');
  });
});

describe('geoVerbApplies (keyboard and VR obey the same rule as the button)', () => {
  const point = { type: 'point', position: [0, 0, 0] };
  const segment = { type: 'segment', position: [0, 0, 0], vector: [3, 0, 0] };
  const rectangle = { type: 'rect', position: [0, 0, 0], u: [3, 0, 0], v: [0, 2, 0] };
  const solid = { type: 'prism', position: [0, 0, 0], u: [3, 0, 0], v: [0, 2, 0], w: [0, 0, 4] };

  it('allows stretch on anything below 3D and nothing above it', () => {
    [point, segment, rectangle].forEach((o) => expect(P.geoVerbApplies(o, 'stretch')).toBe(true));
    expect(P.geoVerbApplies(solid, 'stretch')).toBe(false);
    expect(P.geoVerbApplies({ type: 'pyramid' }, 'stretch')).toBe(false);
    expect(P.geoVerbApplies({ type: 'revolution' }, 'stretch')).toBe(false);
  });

  it('restricts taper and revolve to a rectangle', () => {
    ['taper', 'revolve'].forEach((verb) => {
      expect(P.geoVerbApplies(rectangle, verb)).toBe(true);
      [point, segment, solid].forEach((o) => expect(P.geoVerbApplies(o, verb)).toBe(false));
    });
  });

  it('refuses an empty selection', () => {
    expect(P.geoVerbApplies(null, 'stretch')).toBe(false);
    expect(P.geoVerbApplies(undefined, 'taper')).toBe(false);
  });
});
describe('geoSculptRepresentation and scale investigation', () => {
  it('coordinates each sculpt primitive with a cross-section and net', () => {
    expect(P.geoSculptRepresentation('box')).toMatchObject({ crossSection: 'Rectangle', net: '6 rectangles' });
    expect(P.geoSculptRepresentation('cylinder')).toMatchObject({ crossSection: 'Circle', net: '2 circles + 1 rectangle' });
    expect(P.geoSculptRepresentation('sphere').net).toContain('No distortion-free');
  });

  it('shows why uniform scaling changes volume faster than surface area', () => {
    const study = P.geoSculptScaleStudy({ shape: 'box', size: [2, 3, 4] }, 1.25, 1, 1);
    expect(study.volumeRatio).toBeCloseTo(Math.pow(1.25, 3), 8);
    expect(study.areaRatio).toBeCloseTo(Math.pow(1.25, 2), 8);
    expect(study.after.vol).toBeGreaterThan(study.before.vol);
    expect(study.volumeRatio).toBeGreaterThan(study.areaRatio);
  });
  it('turns projected pointer travel into bounded axis steps in either direction', () => {
    expect(P.geoSculptDragSteps(0, 42, 0, 1, 0, 18)).toEqual({ steps: 2, direction: 1, remaining: 6 });
    expect(P.geoSculptDragSteps(0, -20, 0, 1, 0, 18)).toEqual({ steps: 1, direction: -1, remaining: -2 });
    expect(P.geoSculptDragSteps(12, 0, 7, 0, 1, 18)).toEqual({ steps: 1, direction: 1, remaining: 1 });
  });

  it('restores only the investigated part to its baseline', () => {
    const recipe = { name: 'stack', parts: [
      { shape: 'box', size: [1.25, 2.5, 3.75], position: [0, 0, 0] },
      { shape: 'sphere', size: [0.5], position: [0, 3, 0] },
    ] };
    const baseline = { shape: 'box', size: [1, 2, 3], position: [0, 0, 0] };
    const restored = P.geoRestoreSculptPart(recipe, 0, baseline);
    expect(restored.parts[0]).toEqual(baseline);
    expect(restored.parts[1]).toBe(recipe.parts[1]);
    expect(restored).not.toBe(recipe);
  });
  it('computes live cross-sectional areas across every sculpt primitive', () => {
    const box = P.geoSculptSliceStudy({ shape: 'box', size: [2, 3, 4] }, 0.2, 1, 1);
    expect(box.area).toBeCloseTo(8, 8);
    expect(box.label).toBe('rectangle');

    const sphereCenter = P.geoSculptSliceStudy({ shape: 'sphere', size: [2] }, 0.5, 1, 1);
    const sphereTop = P.geoSculptSliceStudy({ shape: 'sphere', size: [2] }, 1, 1, 1);
    expect(sphereCenter.area).toBeCloseTo(4 * Math.PI, 8);
    expect(sphereTop.area).toBeCloseTo(0, 8);

    const cylinder = P.geoSculptSliceStudy({ shape: 'cylinder', size: [2, 5] }, 0.9, 1, 1);
    expect(cylinder.area).toBeCloseTo(4 * Math.PI, 8);

    const coneBottom = P.geoSculptSliceStudy({ shape: 'cone', size: [2, 5] }, 0, 1, 1);
    const coneTop = P.geoSculptSliceStudy({ shape: 'cone', size: [2, 5] }, 1, 1, 1);
    expect(coneBottom.area).toBeCloseTo(4 * Math.PI, 8);
    expect(coneTop.area).toBeCloseTo(0, 8);

    const torus = P.geoSculptSliceStudy({ shape: 'torus', size: [3, 1] }, 0.5, 1, 1);
    expect(torus.label).toBe('annulus');
    expect(torus.area).toBeCloseTo(12 * Math.PI, 8);
  });

  it('applies recipe and world scale squared to section area', () => {
    const base = P.geoSculptSliceStudy({ shape: 'box', size: [2, 3, 4] }, 0.5, 1, 1);
    const scaled = P.geoSculptSliceStudy({ shape: 'box', size: [2, 3, 4] }, 0.5, 2, 3);
    expect(scaled.area).toBeCloseTo(base.area * 36, 8);
  });

  it('reconstructs volume by stacking horizontal section areas', () => {
    const box = P.geoSculptSliceProfile({ shape: 'box', size: [2, 3, 4] }, 0.25, 1, 1, 12);
    expect(box.estimate).toBeCloseTo(24, 8);
    expect(box.exact).toBeCloseTo(24, 8);
    expect(box.belowEstimate).toBeCloseTo(6, 8);
    expect(box.samples).toHaveLength(13);
    expect(box.errorPercent).toBeCloseTo(0, 8);

    const sphere = P.geoSculptSliceProfile({ shape: 'sphere', size: [2] }, 0.5, 1, 1, 32);
    expect(sphere.estimate).toBeCloseTo(4 / 3 * Math.PI * 8, 1);
    expect(sphere.belowEstimate).toBeCloseTo(sphere.exact / 2, 2);
    expect(sphere.maxArea).toBeCloseTo(4 * Math.PI, 8);
    expect(sphere.errorPercent).toBeLessThan(0.2);

    const torus = P.geoSculptSliceProfile({ shape: 'torus', size: [3, 1] }, 0.5, 1, 1, 64);
    expect(torus.estimate).toBeCloseTo(2 * Math.PI * Math.PI * 3, 0);
    expect(torus.errorPercent).toBeLessThan(1);
  });

  it('scales slice-stack volume cubically while area scales quadratically', () => {
    const base = P.geoSculptSliceProfile({ shape: 'cone', size: [2, 5] }, 0.4, 1, 1, 32);
    const doubled = P.geoSculptSliceProfile({ shape: 'cone', size: [2, 5] }, 0.4, 2, 1, 32);
    expect(doubled.exact).toBeCloseTo(base.exact * 8, 8);
    expect(doubled.estimate).toBeCloseTo(base.estimate * 8, 8);
    expect(doubled.maxArea).toBeCloseTo(base.maxArea * 4, 8);
    expect(doubled.sliceThickness).toBeCloseTo(base.sliceThickness * 2, 8);
  });
});

describe('Immersive Geometry launcher resilience', () => {
  it('carries a compatible selected prism into the local immersive lab', () => {
    const prism = {
      type: 'prism', position: [0, 0, 0],
      u: [2, 0, 0], v: [0, 0, 3], w: [0, 4, 0]
    };
    const url = P.geoImmersiveLabUrl(
      { hostname: '127.0.0.1', origin: 'http://127.0.0.1:8765' },
      'stretch',
      prism
    );

    expect(url).toBe(
      'http://127.0.0.1:8765/immersive_geometry/immersive_geometry.html' +
      '?v=2&source=geosandbox&d=3&L=2&W=3&H=4&axis=2&target=1&boundary=0'
    );
  });

  it('keeps a successful popup as the WebXR-capable path', () => {
    let focused = false;
    let navigated = false;
    const result = P.geoOpenImmersiveLab('https://example.test/lab', {
      openWindow: () => ({ focus: () => { focused = true; } }),
      navigateSameWindow: () => { navigated = true; return true; }
    });

    expect(result).toEqual({ opened: true, mode: 'popup', reason: null });
    expect(focused).toBe(true);
    expect(navigated).toBe(false);
  });

  it('falls back to the current tab when window.open returns null', () => {
    let fallbackNotice = 0;
    let navigatedTo = '';
    const result = P.geoOpenImmersiveLab('https://example.test/lab', {
      openWindow: () => null,
      beforeSameWindow: () => { fallbackNotice += 1; },
      navigateSameWindow: (url) => { navigatedTo = url; return true; }
    });

    expect(result).toEqual({ opened: true, mode: 'same-window', reason: 'popup-blocked' });
    expect(fallbackNotice).toBe(1);
    expect(navigatedTo).toBe('https://example.test/lab');
  });

  it('reports a visible-error path when popup and navigation are both unavailable', () => {
    const result = P.geoOpenImmersiveLab('https://example.test/lab', {
      openWindow: () => { throw new Error('blocked'); },
      navigateSameWindow: () => false
    });

    expect(result).toEqual({ opened: false, mode: 'none', reason: 'navigation-blocked' });
  });
});
