// Arc City solvability + gate-slip validator (design §9.6 / §10.1).
//
// For EVERY level in LEVELS — including any added by concurrent work — this proves:
//   1. SOLVABLE: at least one parameter combo on the player's ACTUAL slider grid
//      (respecting locked params) produces a 'hit'. A new geometrically-impossible
//      level fails CI here instead of stranding a student in a classroom.
//   2. STABLE: that grid solution stays a 'hit' under 5x-finer sampling, so the
//      shipped dx isn't masking a sub-sample miss / gate-slip.
//   3. LOAD-BEARING: a random param on the grid wins only rarely (you can't fish
//      your way to a solve — the math is the mechanic, design §2.4).
//
// Pure-core only (no DOM); mirrors the golden master's import style.

import { describe, it, expect } from 'vitest';
import * as ArcMod from '../stem_lab/stem_tool_arccity.js';

const arc = ArcMod.default || ArcMod;
const { LEVELS, classifyShot } = arc;

// Values a param can take on the real control: a locked param is pinned to its
// default (the UI hides its slider); otherwise the full min..max step grid.
function paramValues(spec) {
  if (spec.locked) return [spec.default];
  const out = [];
  for (let v = spec.min; v <= spec.max + 1e-9; v += spec.step) out.push(Math.round(v * 1000) / 1000);
  return out;
}

// First solving combo on the grid (odometer over paramOrder), or null.
function findSolution(level) {
  const order = level.paramOrder;
  const grids = order.map(n => paramValues(level.params[n]));
  const idx = order.map(() => 0);
  for (;;) {
    const p = {};
    for (let i = 0; i < order.length; i++) p[order[i]] = grids[i][idx[i]];
    if (classifyShot(level, p).result === 'hit') return p;
    let k = 0;
    while (k < idx.length) { idx[k]++; if (idx[k] < grids[k].length) break; idx[k] = 0; k++; }
    if (k === idx.length) return null;
  }
}

describe('Arc City — every level is solvable on its own slider grid (§9.6)', () => {
  LEVELS.forEach(level => {
    it(`${level.id} (${level.title}) has at least one winning combo`, () => {
      const sol = findSolution(level);
      expect(sol, `no winning param combo found for ${level.id} on its grid`).not.toBeNull();
    }, 20000);
  });
});

describe('Arc City — shipped sampling does not mask a sub-sample miss (§9.6/§10.1)', () => {
  LEVELS.forEach(level => {
    it(`${level.id}: a grid solution stays a hit at 5x-finer sampling`, () => {
      const sol = findSolution(level);
      expect(sol).not.toBeNull();
      expect(classifyShot(level, sol).result).toBe('hit');
      const fine = Object.assign({}, level, { dx: level.dx / 5 });
      expect(classifyShot(fine, sol).result).toBe('hit');
    }, 20000);
  });
});

describe('Arc City — the math is load-bearing (not trivially winnable, §2.4)', () => {
  LEVELS.forEach(level => {
    it(`${level.id}: random-grid hit rate stays low`, () => {
      const order = level.paramOrder;
      // coarse sample (every 3rd grid step) just to bound the rate cheaply
      const grids = order.map(n => {
        const s = level.params[n];
        if (s.locked) return [s.default];
        const out = [];
        for (let v = s.min; v <= s.max + 1e-9; v += s.step * 3) out.push(Math.round(v * 1000) / 1000);
        return out;
      });
      let hits = 0, total = 0;
      (function rec(i, p) {
        if (i === order.length) { total++; if (classifyShot(level, p).result === 'hit') hits++; return; }
        for (const v of grids[i]) { const q = Object.assign({}, p); q[order[i]] = v; rec(i + 1, q); }
      })(0, {});
      expect(total).toBeGreaterThan(0);
      expect(hits / total).toBeLessThan(0.4); // can't fish a win from random params
    }, 20000);
  });
});
