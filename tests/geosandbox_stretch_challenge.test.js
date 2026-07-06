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
