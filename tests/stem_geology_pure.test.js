// Pure-logic tests for stem_tool_geologyexplorer.js (the WebGL is Canvas-smoke-only).
// Pins the strata generator (a CHARACTERIZATION baseline to lock current behavior before
// the upcoming resolution/world-voxel refactor) and the new ambient-occlusion helper.

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let P;
beforeAll(() => {
  window.StemLab = { registerTool: function () {}, isRegistered: function () { return false; } };
  delete window.__alloGeologyPure;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_geologyexplorer.js'), 'utf8'))();
  P = window.__alloGeologyPure;
  if (!P) throw new Error('geology pure hook not exposed (window.__alloGeologyPure)');
});
beforeEach(() => { if (P.setScene) P.setScene('crust'); P.setGrid('standard'); });   // every test starts at the default scene + detail

describe('Geology Explorer — strata generator (characterization lock)', () => {
  it('default grid is 14×12×14 with 0.9 km/voxel', () => {
    expect(P.grid()).toMatchObject({ NX: 14, NY: 12, NZ: 14, KM_PER_VOXEL: 0.9, VOXEL: 1 });
    expect(P.grid().NY * P.grid().KM_PER_VOXEL).toBeCloseTo(10.8); // total crust depth — invariant the refactor must preserve
  });

  it('rockKeyAt lays the expected vertical sequence away from the pluton', () => {
    expect(P.rockKeyAt(1, 0, 1)).toBe('soil');
    expect(P.rockKeyAt(1, 2, 1)).toBe('sandstone');
    expect(P.rockKeyAt(1, 4, 1)).toBe('shale');
    expect(P.rockKeyAt(1, 6, 1)).toBe('limestone');
    expect(P.rockKeyAt(1, 8, 1)).toBe('basement');
    expect(P.rockKeyAt(1, 11, 1)).toBe('magma');
  });

  it('rockKeyAt places the cross-cutting pluton + contact aureole at the centre', () => {
    expect(P.rockKeyAt(7, 7, 7)).toBe('intrusion');  // pluton core
    expect(P.rockKeyAt(10, 7, 7)).toBe('marble');    // baked limestone rim (y in 6..8)
  });

  it('computeCore merges the column into ordered bands (oldest deepest)', () => {
    const segs = P.computeCore(1, 1);
    expect(segs[0].key).toBe('soil');
    expect(segs[segs.length - 1].key).toBe('magma');
    expect(segs.every((s) => s.y1 >= s.y0)).toBe(true);
  });
});

describe('Geology Explorer — resolution / detail refactor (world↔voxel decouple)', () => {
  it('Standard detail is byte-identical to the original grid (14×12×14 @0.9, voxel 1)', () => {
    P.setGrid('standard');
    expect(P.grid()).toEqual({ NX: 14, NY: 12, NZ: 14, KM_PER_VOXEL: 0.9, VOXEL: 1 });
    // and the strata generator is unchanged at Standard
    expect(P.rockKeyAt(1, 0, 1)).toBe('soil');
    expect(P.rockKeyAt(7, 7, 7)).toBe('intrusion');
    expect(P.rockKeyAt(10, 7, 7)).toBe('marble');
  });

  it('total crust depth (NY × km/voxel) stays physically constant across every detail level', () => {
    ['low', 'standard', 'high'].forEach((r) => {
      P.setGrid(r);
      expect(P.grid().NY * P.grid().KM_PER_VOXEL).toBeCloseTo(10.8, 5);   // depth invariant
    });
  });

  it('higher detail = more, smaller voxels — but stays under the ~12k Chromebook ceiling', () => {
    const counts = {};
    ['low', 'standard', 'high'].forEach((r) => { P.setGrid(r); const g = P.grid(); counts[r] = g.NX * g.NY * g.NZ; expect(g.NX * g.NY * g.NZ).toBeLessThanOrEqual(12000); });
    expect(counts.high).toBeGreaterThan(counts.standard);
    expect(counts.standard).toBeGreaterThan(counts.low);
    expect(counts.standard).toBe(2352);                                   // unchanged default
  });

  it('the generalized strata generator still reads soil→…→magma top-to-bottom at High detail', () => {
    P.setGrid('high');
    const g = P.grid();
    expect(P.rockKeyAt(1, 0, 1)).toBe('soil');                            // top
    expect(P.rockKeyAt(1, g.NY - 1, 1)).toBe('magma');                    // bottom
    const cx = Math.round((g.NX - 1) / 2);
    expect(P.rockKeyAt(cx, Math.round(g.NY * 0.6), cx)).toBe('intrusion'); // pluton still down the centre
  });
});

describe('Geology Explorer — scene registry + Crystal Cavern (geode)', () => {
  it('crust stays the default scene and its generator is unchanged (registry is behavior-preserving)', () => {
    expect(P.sceneId()).toBe('crust');
    expect(P.scenes()).toEqual(['crust', 'geode']);
    P.setScene('crust');
    expect(P.rockKeyAt(1, 0, 1)).toBe('soil');
    expect(P.rockKeyAt(7, 7, 7)).toBe('intrusion');
    P.setScene('crust');
  });

  it('crust geotherm matches the original linear shallow-crust model (no regression)', () => {
    // tempC = 15 + depthKm*25, presMPa = depthKm*27
    expect(P.crustGeotherm(2.7, 'shale')).toEqual({ tempC: 83, presMPa: 73, state: 'solid' });
    expect(P.crustGeotherm(10, 'magma').tempC).toBe('≈ 1000+');
  });

  it('geode generator carves a hollow void, lines it with crystal, and hosts it in limestone', () => {
    P.setScene('geode'); P.setGrid('standard');
    const g = P.grid();
    const cx = Math.round((g.NX - 1) / 2), cy = Math.round((g.NY - 1) / 2), cz = Math.round((g.NZ - 1) / 2);
    expect(P.geodeKeyAt(cx, cy, cz)).toBe('void');                 // hollow centre
    const corner = P.geodeKeyAt(0, 0, 0);
    expect(corner).toBe('limestone');                              // host rock at the edges
    // some crystal/rind exists between the void and the host
    const keys = {};
    for (let x = 0; x < g.NX; x++) for (let y = 0; y < g.NY; y++) for (let z = 0; z < g.NZ; z++) keys[P.geodeKeyAt(x, y, z)] = 1;
    expect(keys.void && keys.limestone && (keys.amethyst || keys.quartz) && (keys.agate || keys.chalcedony)).toBeTruthy();
    P.setScene('crust');
  });

  it('the geode scene uses a shallower depth scale than the crust', () => {
    P.setScene('geode'); P.setGrid('standard');
    const geodeKm = P.grid().KM_PER_VOXEL;
    P.setScene('crust'); P.setGrid('standard');
    expect(geodeKm).toBeLessThan(P.grid().KM_PER_VOXEL);   // 2.0/NY < 10.8/NY
    P.setScene('crust');
  });
});

describe('Geology Explorer — ambient occlusion (the de-Minecrafting shade)', () => {
  it('counts present face-neighbours (more enclosed → higher → darker)', () => {
    expect(P.aoCount({}, 5, 5, 5)).toBe(0);                                   // fully exposed
    expect(P.aoCount({ '6,5,5': 1, '4,5,5': 1 }, 5, 5, 5)).toBe(2);
    const full = {}; ['6,5,5', '4,5,5', '5,6,5', '5,4,5', '5,5,6', '5,5,4'].forEach((k) => { full[k] = 1; });
    expect(P.aoCount(full, 5, 5, 5)).toBe(6);                                 // fully enclosed
  });
});
