import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// The debris model: blocks the wall model has breached fall, collide and come
// to rest. It is pure and fixed-step, so it is tested the way the flight model
// is — by running it, not by reading the scene.

const FILE = 'stem_lab/stem_tool_machinelab.js';
let M;
beforeEach(() => {
  resetStemLab();
  M = loadTool(FILE, 'machineLab')._math;
});

// A wall, a hit at the given column and course, and the debris that starts.
function breach(preset, col, row, v) {
  const before = M.buildWall(preset);
  const ext = M.wallExtent(before);
  const centre = (ext.minCol + ext.maxCol) / 2;
  const impact = { status: 'hit', y: row + 0.5, z: col - centre, v: v || 95, t: 1 };
  const res = M.applyDamage(before, impact, { projMass: 90, projDiameter: 0.45 });
  const start = M.debrisStart(before, res.blocks, res, { gravity: 9.81 });
  return { before, res, start, ext };
}

describe('Machine Lab debris: what a breached block does next', () => {
  it('starts one piece per block this shot set loose, and none for blocks already down', () => {
    const { res, start } = breach('curtain', 4, 0);
    const fresh = res.blocks.filter((b) => b.state === 'breached').length;
    expect(start).not.toBeNull();
    expect(start.pieces).toHaveLength(fresh);
    // Hit the wall again: the pieces from the first shot are not restarted.
    const again = M.applyDamage(res.blocks, { status: 'hit', y: 0.5, z: 0, v: 95, t: 1 }, { projMass: 90, projDiameter: 0.45 });
    const second = M.debrisStart(res.blocks, again.blocks, again, {});
    const newly = again.blocks.filter((b) => b.state === 'breached').length - fresh;
    if (second) expect(second.pieces).toHaveLength(newly);
    else expect(newly).toBe(0);
  });

  it('kicks the struck cell into the castle and lets the rest simply fall', () => {
    const { res, start } = breach('curtain', 4, 1);
    const struck = start.pieces.filter((p) => Math.abs(p.col - res.col) <= 1 && Math.abs(p.row - res.row) <= 1);
    const loose = start.pieces.filter((p) => !(Math.abs(p.col - res.col) <= 1 && Math.abs(p.row - res.row) <= 1));
    expect(struck.length).toBeGreaterThan(0);
    for (const p of struck) expect(p.vz).toBeGreaterThan(1);
    for (const p of loose) { expect(Math.abs(p.vz)).toBeLessThan(0.5); expect(p.vy).toBe(0); }
  });

  it('comes to rest within the budget, with every piece on or above the ground', () => {
    const { start } = breach('curtain', 4, 0);
    const out = M.debrisSettle(start);
    expect(out.settled).toBe(true);
    expect(out.seconds).toBeLessThan(M.DEBRIS_SECONDS);
    for (const key of Object.keys(out.rest)) {
      const r = out.rest[key];
      // y is the centre; half the piece's size is the lowest it can be.
      expect(r[1]).toBeGreaterThanOrEqual(r[6] * 0.5 - 0.02);
      expect(Number.isFinite(r[0]) && Number.isFinite(r[1]) && Number.isFinite(r[2])).toBe(true);
    }
  });

  it('is deterministic: the same shot ends in the same heap, every time', () => {
    const a = M.debrisSettle(breach('gatehouse', 3, 0).start);
    const b = M.debrisSettle(breach('gatehouse', 3, 0).start);
    expect(a).toEqual(b);
  });

  it('never leaves a piece inside the wall that is still standing', () => {
    const { res, start } = breach('curtain', 2, 0);
    const out = M.debrisSettle(start);
    const top = {};
    res.blocks.forEach((b) => { if (b.state !== 'breached' && (top[b.col] == null || b.row > top[b.col])) top[b.col] = b.row; });
    for (const key of Object.keys(out.rest)) {
      const r = out.rest[key];
      const col = Math.round(r[0] + start.midCol);
      if (top[col] != null && r[1] < top[col] + 1) {
        // Inside the standing column's height: it must be clear of the slab.
        expect(Math.abs(r[2])).toBeGreaterThan(0.5 + r[6] * 0.5 - 0.05);
      }
    }
  });

  it('does not stack two pieces in the same place', () => {
    const { start } = breach('keep', 3, 0);
    const out = M.debrisSettle(start);
    const rest = Object.keys(out.rest).map((k) => out.rest[k]);
    for (let i = 0; i < rest.length; i++) {
      for (let j = i + 1; j < rest.length; j++) {
        const d = Math.hypot(rest[i][0] - rest[j][0], rest[i][1] - rest[j][1], rest[i][2] - rest[j][2]);
        const min = (rest[i][6] + rest[j][6]) * 0.5;
        expect(d).toBeGreaterThan(min * 0.7);
      }
    }
  });

  it('keeps a block that only lost its support near the column it fell from', () => {
    const { res, start } = breach('curtain', 4, 0);
    const out = M.debrisSettle(start);
    const loose = start.pieces.filter((p) => !(Math.abs(p.col - res.col) <= 1 && Math.abs(p.row - res.row) <= 1));
    for (const p of loose) {
      const r = out.rest[p.key];
      expect(Math.abs(r[0] - p.x)).toBeLessThan(2.5);
    }
  });

  it('returns nothing to settle for a miss, an over-shot, or a hit that breached nothing', () => {
    const before = M.buildWall('curtain');
    expect(M.debrisStart(before, before, { outcome: 'over' }, {})).toBeNull();
    expect(M.debrisStart(before, before, { outcome: 'miss' }, {})).toBeNull();
    expect(M.debrisSettle(null)).toBeNull();
  });
});
