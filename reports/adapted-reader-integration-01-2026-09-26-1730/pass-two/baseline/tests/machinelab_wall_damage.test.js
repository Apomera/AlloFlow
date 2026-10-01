import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_machinelab.js';
const PRESETS = ['curtain', 'gatehouse', 'keep', 'motte'];

let M;

beforeEach(() => {
  resetStemLab();
  M = loadTool(FILE, 'machineLab')._math;
});

// A shot that reaches the wall at a known height, built by hand so the damage
// tests do not depend on the flight model staying put.
function shotTo(x, y, v) {
  return {
    range: x + 40,
    path: [
      { t: 0, x: 0, y: 2, z: 0, v: v },
      { t: 1, x: x - 5, y: y + 3, z: 0, v: v },
      { t: 2, x: x + 5, y: y - 3, z: 0, v: v }
    ]
  };
}

describe('Machine Lab: wall presets', () => {
  for (const preset of PRESETS) {
    it(`${preset} is a well-formed block list`, () => {
      const blocks = M.buildWall(preset);
      expect(blocks.length).toBeGreaterThan(20);
      for (const b of blocks) {
        expect(Number.isFinite(b.col)).toBe(true);
        expect(Number.isFinite(b.row)).toBe(true);
        expect(b.row).toBeGreaterThanOrEqual(0);
        expect(M.MATERIALS[b.mat]).toBeDefined();
        expect(b.state).toBe('intact');
        expect(b.absorbed).toBe(0);
      }
    });

    it(`${preset} has no floating blocks`, () => {
      // Every block rests on the ground or on another block. A preset with a
      // floater would collapse the instant the first shot lands, for reasons
      // that have nothing to do with the shot.
      const blocks = M.buildWall(preset);
      const ids = new Set(blocks.map((b) => b.col + ',' + b.row));
      for (const b of blocks) {
        if (b.row === 0) continue;
        // An arch course is held by its springing, so diagonal support counts.
        const supported = ids.has(b.col + ',' + (b.row - 1)) ||
          (b.arch && (ids.has((b.col - 1) + ',' + (b.row - 1)) || ids.has((b.col + 1) + ',' + (b.row - 1))));
        expect(supported).toBe(true);
      }
    });

    it(`${preset} carries archStudio-compatible coordinates`, () => {
      const blocks = M.buildWall(preset);
      for (const b of blocks) {
        expect(b).toHaveProperty('x');
        expect(b).toHaveProperty('y');
        expect(b).toHaveProperty('z');
      }
    });
  }

  it('gives each preset a distinct shape', () => {
    const sizes = PRESETS.map((p) => M.buildWall(p).length);
    expect(new Set(sizes).size).toBeGreaterThan(2);
  });

  it('leaves a gateway opening in the gatehouse', () => {
    const blocks = M.buildWall('gatehouse');
    const ids = new Set(blocks.map((b) => b.col + ',' + b.row));
    expect(ids.has('6,0')).toBe(false);
    expect(ids.has('7,1')).toBe(false);
    expect(ids.has('6,3')).toBe(true);      // the arch above the opening
  });

  it('holds the gateway arch on its springing, and drops it when both sides go', () => {
    const blocks = M.buildWall('gatehouse');
    const arch = blocks.filter((b) => b.arch);
    expect(arch.length).toBeGreaterThan(0);

    // The gateway is two columns wide and the arch is one course, so each arch
    // block springs from exactly one side: (6,3) off (5,2), and (7,3) off (8,2).
    // Take one springing and only that half of the arch comes down.
    const oneSide = blocks.map((b) => Object.assign({}, b));
    oneSide.filter((b) => b.col === 5 && b.row === 2).forEach((b) => { b.state = 'breached'; });
    M.collapseUnsupported(oneSide);
    const left = oneSide.find((b) => b.col === 6 && b.row === 3);
    const right = oneSide.find((b) => b.col === 7 && b.row === 3);
    expect(left.state).toBe('breached');
    expect(right.state).not.toBe('breached');

    // Take both and the whole arch goes.
    const bothSides = blocks.map((b) => Object.assign({}, b));
    bothSides.filter((b) => (b.col === 5 || b.col === 8) && b.row === 2).forEach((b) => { b.state = 'breached'; });
    M.collapseUnsupported(bothSides);
    expect(bothSides.filter((b) => b.arch).every((b) => b.state === 'breached')).toBe(true);
  });

  it('builds the motte from earth below and masonry above', () => {
    const blocks = M.buildWall('motte');
    expect(blocks.some((b) => b.mat === 'earth')).toBe(true);
    expect(blocks.some((b) => b.mat === 'limestone')).toBe(true);
    const earthTop = Math.max(...blocks.filter((b) => b.mat === 'earth').map((b) => b.row));
    const stoneBase = Math.min(...blocks.filter((b) => b.mat === 'limestone').map((b) => b.row));
    expect(stoneBase).toBeGreaterThan(earthTop);
  });
});

describe('Machine Lab: ranging the target', () => {
  it('reports a shot that lands short', () => {
    const short = { range: 50, path: [{ t: 0, x: 0, y: 2, z: 0, v: 40 }, { t: 3, x: 50, y: 0, z: 0, v: 35 }] };
    const hit = M.impactAt(short, 80);
    expect(hit.status).toBe('short');
    expect(hit.shortBy).toBeCloseTo(30, 6);
  });

  it('interpolates the height at the wall rather than snapping to a sample', () => {
    const s = { range: 200, path: [{ t: 0, x: 0, y: 0, z: 0, v: 40 }, { t: 1, x: 100, y: 20, z: 0, v: 30 }] };
    const hit = M.impactAt(s, 50);
    expect(hit.status).toBe('hit');
    expect(hit.y).toBeCloseTo(10, 6);
    expect(hit.v).toBeCloseTo(35, 6);
  });

  it('carries lateral drift through to the impact point', () => {
    const s = { range: 200, path: [{ t: 0, x: 0, y: 0, z: 0, v: 40 }, { t: 1, x: 100, y: 20, z: 8, v: 30 }] };
    expect(M.impactAt(s, 50).z).toBeCloseTo(4, 6);
  });

  it('refuses a shot with no path rather than guessing', () => {
    expect(M.impactAt(null, 80)).toBeNull();
    expect(M.impactAt({ range: 100, path: [] }, 80)).toBeNull();
    expect(M.impactAt({ range: 100, path: [{ x: 0, y: 0, z: 0, v: 1 }] }, 0)).toBeNull();
  });
});

describe('Machine Lab: damage is deterministic', () => {
  it('produces an identical wall from an identical shot sequence, every time', () => {
    function run() {
      let blocks = M.buildWall('curtain');
      for (let i = 0; i < 12; i++) {
        const impact = M.impactAt(shotTo(80, 1.5, 60), 80);
        const res = M.applyDamage(blocks, impact, { projMass: 25, projDiameter: 0.24 });
        blocks = res.blocks;
      }
      return blocks.map((b) => b.col + ',' + b.row + ':' + b.state + ':' + b.absorbed.toFixed(6)).join('|');
    }
    const a = run();
    for (let i = 0; i < 20; i++) expect(run()).toBe(a);
  });

  it('never mutates the block list it was handed', () => {
    const blocks = M.buildWall('curtain');
    const before = JSON.stringify(blocks);
    M.applyDamage(blocks, M.impactAt(shotTo(80, 1.5, 60), 80), { projMass: 25, projDiameter: 0.24 });
    expect(JSON.stringify(blocks)).toBe(before);
  });
});

describe('Machine Lab: damage model', () => {
  const hit = (y, v, z) => {
    const im = M.impactAt(shotTo(80, y, v), 80);
    if (z !== undefined) im.z = z;
    return im;
  };

  it('cracks a block before it breaks it', () => {
    const blocks = M.buildWall('curtain');
    // limestone budget 25000 J; a 25 kg stone at 40 m/s carries 20000 J.
    const res = M.applyDamage(blocks, hit(1.5, 40), { projMass: 25, projDiameter: 0.24 });
    expect(res.outcome).toBe('hit');
    const struck = res.blocks.find((b) => b.col === res.col && b.row === res.row);
    expect(struck.state).toBe('cracked');
    expect(res.newlyBreached).toBe(0);
  });

  it('breaks a block once the cumulative energy passes its budget', () => {
    let blocks = M.buildWall('curtain');
    const first = M.applyDamage(blocks, hit(1.5, 40), { projMass: 25, projDiameter: 0.24 });
    const second = M.applyDamage(first.blocks, hit(1.5, 40), { projMass: 25, projDiameter: 0.24 });
    const struck = second.blocks.find((b) => b.col === second.col && b.row === second.row);
    expect(struck.state).toBe('breached');
  });

  it('takes more hits to break granite than limestone', () => {
    function hitsToBreak(preset, row) {
      let blocks = M.buildWall(preset);
      for (let i = 1; i <= 40; i++) {
        const res = M.applyDamage(blocks, hit(row + 0.5, 45), { projMass: 25, projDiameter: 0.24 });
        blocks = res.blocks;
        const b = blocks.find((x) => x.col === res.col && x.row === res.row);
        if (b && b.state === 'breached') return i;
      }
      return Infinity;
    }
    expect(hitsToBreak('keep', 1)).toBeGreaterThan(hitsToBreak('curtain', 1));
  });

  it('spills excess energy into the course below', () => {
    const blocks = M.buildWall('curtain');
    // A very energetic hit on row 2 should mark the row below it too.
    const res = M.applyDamage(blocks, hit(2.5, 300), { projMass: 200, projDiameter: 0.5 });
    const below = res.blocks.find((b) => b.col === res.col && b.row === res.row - 1);
    expect(below.absorbed).toBeGreaterThan(0);
  });

  it('brings down everything above a breached block', () => {
    // Knock out the base course under one column and the whole column follows.
    let blocks = M.buildWall('curtain');
    for (let i = 0; i < 6; i++) {
      const res = M.applyDamage(blocks, hit(0.5, 200), { projMass: 200, projDiameter: 0.4 });
      blocks = res.blocks;
    }
    const cols = {};
    blocks.forEach((b) => {
      if (!cols[b.col]) cols[b.col] = [];
      cols[b.col].push(b);
    });
    const fallen = Object.keys(cols).filter((c) => cols[c].every((b) => b.state === 'breached'));
    expect(fallen.length).toBeGreaterThan(0);
  });

  it('reports a shot that sails over the parapet', () => {
    const blocks = M.buildWall('curtain');       // 6 courses tall
    const res = M.applyDamage(blocks, hit(20, 50), { projMass: 25, projDiameter: 0.24 });
    expect(res.outcome).toBe('over');
    expect(M.wallSummary(res.blocks).breached).toBe(0);
  });

  it('reports a shot that misses to the side', () => {
    const blocks = M.buildWall('curtain');
    const res = M.applyDamage(blocks, hit(1.5, 50, 40), { projMass: 25, projDiameter: 0.24 });
    expect(res.outcome).toBe('miss');
    expect(M.wallSummary(res.blocks).breached).toBe(0);
  });

  it('reports energy density alongside total energy', () => {
    const blocks = M.buildWall('curtain');
    const res = M.applyDamage(blocks, hit(1.5, 50), { projMass: 25, projDiameter: 0.24 });
    const area = Math.PI * Math.pow(0.24 / 2, 2);
    expect(res.energyDensity).toBeCloseTo(res.ke / area, 6);
  });
});

describe('Machine Lab: breach detection', () => {
  it('is false on a fresh wall', () => {
    for (const preset of PRESETS) {
      expect(M.isBreached(M.buildWall(preset))).toBe(false);
    }
  });

  it('is true once one column is gone top to bottom', () => {
    const blocks = M.buildWall('curtain');
    blocks.filter((b) => b.col === 5).forEach((b) => { b.state = 'breached'; });
    expect(M.isBreached(blocks)).toBe(true);
  });

  it('is false when the damage is spread but no column is clear', () => {
    const blocks = M.buildWall('curtain');
    blocks.filter((b) => b.row === 0).forEach((b) => { b.state = 'cracked'; });
    blocks.filter((b) => b.row === 3).forEach((b) => { b.state = 'breached'; });
    expect(M.isBreached(blocks)).toBe(false);
  });

  it('counts the wall honestly', () => {
    const blocks = M.buildWall('curtain');
    const s = M.wallSummary(blocks);
    expect(s.total).toBe(blocks.length);
    expect(s.intact).toBe(blocks.length);
    expect(s.cracked + s.breached).toBe(0);
  });
});
