import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_machinelab.js';

let M;

beforeEach(() => {
  resetStemLab();
  M = loadTool(FILE, 'machineLab')._math;
});

describe('Machine Lab: mechanical advantage formulas', () => {
  it('computes lever MA as the ratio of the arms, independent of load', () => {
    expect(M.leverMA(2, 1)).toBe(2);
    expect(M.leverMA(1, 2)).toBe(0.5);
    expect(M.leverMA(3, 3)).toBe(1);
  });

  it('counts pulley MA as supporting rope segments', () => {
    expect(M.pulleyMA(1)).toBe(1);
    expect(M.pulleyMA(4)).toBe(4);
  });

  it('computes wheel-and-axle MA as handle radius over drum radius', () => {
    expect(M.windlassMA(0.45, 0.15)).toBeCloseTo(3, 12);
    expect(M.windlassMA(0.2, 0.2)).toBe(1);
  });

  it('computes ramp MA as length over height', () => {
    expect(M.rampMA(4, 1)).toBe(4);
    expect(M.rampMA(5, 2.5)).toBe(2);
  });

  it('computes wedge MA as length over thickness', () => {
    expect(M.wedgeMA(0.3, 0.06)).toBeCloseTo(5, 12);
  });

  it('computes screw MA as one circumference per pitch', () => {
    expect(M.screwMA(0.15, 0.005)).toBeCloseTo((2 * Math.PI * 0.15) / 0.005, 9);
  });

  it('matches a hand-computed screw MA to the documented formula', () => {
    // R = 0.1 m handle, 2 mm pitch -> 2*pi*0.1/0.002 = 314.159...
    expect(M.screwMA(0.1, 0.002)).toBeCloseTo(314.159265, 5);
  });
});

describe('Machine Lab: invalid geometry returns null rather than a nonsense number', () => {
  it('rejects non-positive lever arms', () => {
    expect(M.leverMA(0, 1)).toBeNull();
    expect(M.leverMA(2, 0)).toBeNull();
    expect(M.leverMA(-2, 1)).toBeNull();
  });

  it('rejects a ramp taller than it is long', () => {
    // A "ramp" with height > length is not a triangle that exists.
    expect(M.rampMA(1, 4)).toBeNull();
    // Equal height and length is the degenerate vertical case, MA exactly 1.
    expect(M.rampMA(2, 2)).toBe(1);
  });

  it('rejects fractional pulley segments', () => {
    expect(M.pulleyMA(2.5)).toBeNull();
    expect(M.pulleyMA(0)).toBeNull();
  });

  it('rejects non-finite inputs everywhere', () => {
    expect(M.leverMA(NaN, 1)).toBeNull();
    expect(M.windlassMA(Infinity, 1)).toBeNull();
    expect(M.screwMA(0.1, 0)).toBeNull();
  });
});

describe('Machine Lab: the force/distance trade', () => {
  it('divides force by MA', () => {
    expect(M.effortForce(400, 4)).toBe(100);
    expect(M.effortForce(400, 1)).toBe(400);
  });

  it('multiplies distance by MA', () => {
    expect(M.effortDistance(0.5, 4)).toBe(2);
  });

  it('keeps work in equal to work out for every machine and every MA', () => {
    const cases = [
      M.leverMA(2, 1),
      M.pulleyMA(3),
      M.windlassMA(0.45, 0.1),
      M.rampMA(4, 1),
      M.wedgeMA(0.3, 0.06),
      M.screwMA(0.15, 0.005)
    ];
    for (const ma of cases) {
      const w = M.workCheck(400, 0.5, ma);
      expect(w).not.toBeNull();
      expect(w.equal).toBe(true);
      expect(w.workIn).toBeCloseTo(w.workOut, 9);
    }
  });

  it('holds the work invariant across a sweep of mechanical advantages', () => {
    for (let ma = 0.25; ma <= 20; ma += 0.25) {
      const w = M.workCheck(750, 1.25, ma);
      expect(w.equal).toBe(true);
    }
  });

  it('returns null work when the machine geometry is invalid', () => {
    expect(M.workCheck(400, 0.5, null)).toBeNull();
    expect(M.workCheck(400, 0.5, 0)).toBeNull();
  });
});

describe('Machine Lab: answer parsing', () => {
  it('refuses blank and whitespace instead of reading them as zero', () => {
    // Number('') and Number(' ') are both 0. A blank box must not score as a
    // real prediction of zero.
    expect(M.parseNum('')).toBeNull();
    expect(M.parseNum('   ')).toBeNull();
    expect(M.parseNum(null)).toBeNull();
    expect(M.parseNum(undefined)).toBeNull();
  });

  it('refuses text and partial numbers', () => {
    expect(M.parseNum('abc')).toBeNull();
    expect(M.parseNum('12n')).toBeNull();
    expect(M.parseNum('1.2.3')).toBeNull();
  });

  it('accepts plain decimals', () => {
    expect(M.parseNum('100')).toBe(100);
    expect(M.parseNum(' 12.5 ')).toBe(12.5);
    expect(M.parseNum('.5')).toBe(0.5);
    expect(M.parseNum('-3')).toBe(-3);
  });

  it('grades predictions on a relative tolerance with an absolute floor', () => {
    expect(M.withinTolerance(100, 100, 0.05)).toBe(true);
    expect(M.withinTolerance(104, 100, 0.05)).toBe(true);
    expect(M.withinTolerance(120, 100, 0.05)).toBe(false);
    // Near-zero forces stay gradeable thanks to the absolute floor.
    expect(M.withinTolerance(0.005, 0, 0.05)).toBe(true);
  });
});
