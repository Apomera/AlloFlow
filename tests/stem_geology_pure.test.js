// Pure-logic tests for stem_tool_geologyexplorer.js (the WebGL is Canvas-smoke-only).
// Pins the strata generator (a CHARACTERIZATION baseline to lock current behavior before
// the upcoming resolution/world-voxel refactor) and the new ambient-occlusion helper.

import { describe, it, expect, beforeAll } from 'vitest';
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

describe('Geology Explorer — strata generator (characterization lock)', () => {
  it('default grid is 14×12×14 with 0.9 km/voxel', () => {
    expect(P.grid()).toEqual({ NX: 14, NY: 12, NZ: 14, KM_PER_VOXEL: 0.9 });
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

describe('Geology Explorer — ambient occlusion (the de-Minecrafting shade)', () => {
  it('counts present face-neighbours (more enclosed → higher → darker)', () => {
    expect(P.aoCount({}, 5, 5, 5)).toBe(0);                                   // fully exposed
    expect(P.aoCount({ '6,5,5': 1, '4,5,5': 1 }, 5, 5, 5)).toBe(2);
    const full = {}; ['6,5,5', '4,5,5', '5,6,5', '5,4,5', '5,5,6', '5,5,4'].forEach((k) => { full[k] = 1; });
    expect(P.aoCount(full, 5, 5, 5)).toBe(6);                                 // fully enclosed
  });
});
