import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

/**
 * WeldLab is a 9.7k-line vocational tool whose numbers a student is graded against,
 * and it had no unit coverage at all. These pin the pure welding physics: the AWS
 * heat-input formula, the arc efficiencies, the tier boundaries, and the defect
 * model that drives "bad parameters produce a visibly bad bead".
 *
 * The point is to catch silent numeric drift. Nothing here asserts prose.
 */

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_weldlab.js', 'weldLab');
});

describe('WeldLab heat input', () => {
  it('computes gross heat input with the AWS formula kJ/in = (V x A x 60) / (TS x 1000)', () => {
    const { heatInputGross } = window.__WeldLabCore;

    // 25 V, 200 A, 12 in/min -> 300000 / 12000
    expect(heatInputGross(25, 200, 12)).toBeCloseTo(25, 10);
    expect(heatInputGross(30, 250, 10)).toBeCloseTo(45, 10);
    expect(heatInputGross(22, 180, 12)).toBeCloseTo(19.8, 10);
  });

  it('is inversely proportional to travel speed', () => {
    const { heatInputGross } = window.__WeldLabCore;
    // Doubling travel speed must halve heat input per inch. This is the single
    // relationship the calculator exists to teach.
    expect(heatInputGross(25, 200, 24)).toBeCloseTo(heatInputGross(25, 200, 12) / 2, 10);
  });

  it('applies process arc efficiency, ordered stick > mig > tig > oxy', () => {
    const { ARC_EFFICIENCY, heatInputNet, heatInputGross } = window.__WeldLabCore;

    expect(ARC_EFFICIENCY).toEqual({ mig: 0.80, tig: 0.70, stick: 0.85, oxy: 0.55 });
    Object.values(ARC_EFFICIENCY).forEach((eta) => {
      expect(eta).toBeGreaterThan(0);
      expect(eta).toBeLessThanOrEqual(1);
    });
    expect(ARC_EFFICIENCY.stick).toBeGreaterThan(ARC_EFFICIENCY.mig);
    expect(ARC_EFFICIENCY.mig).toBeGreaterThan(ARC_EFFICIENCY.tig);
    expect(ARC_EFFICIENCY.tig).toBeGreaterThan(ARC_EFFICIENCY.oxy);

    const gross = heatInputGross(25, 200, 12);
    expect(heatInputNet(25, 200, 12, 'mig')).toBeCloseTo(gross * 0.80, 10);
    expect(heatInputNet(25, 200, 12, 'tig')).toBeCloseTo(gross * 0.70, 10);
    expect(heatInputNet(25, 200, 12, 'stick')).toBeCloseTo(gross * 0.85, 10);
    expect(heatInputNet(25, 200, 12, 'oxy')).toBeCloseTo(gross * 0.55, 10);
  });

  it('falls back to 0.80 efficiency for an unknown process rather than NaN', () => {
    const { heatInputNet, heatInputGross } = window.__WeldLabCore;
    expect(heatInputNet(25, 200, 12, 'laser')).toBeCloseTo(heatInputGross(25, 200, 12) * 0.80, 10);
    expect(Number.isNaN(heatInputNet(25, 200, 12, undefined))).toBe(false);
  });
});

describe('WeldLab heat-input tiers', () => {
  it('classifies on the documented kJ/in boundaries', () => {
    const { heatInputTier } = window.__WeldLabCore;

    expect(heatInputTier(0)).toBe('LOW');
    expect(heatInputTier(24.99)).toBe('LOW');
    expect(heatInputTier(25)).toBe('MEDIUM');   // boundary is inclusive upward
    expect(heatInputTier(50)).toBe('MEDIUM');
    expect(heatInputTier(50.01)).toBe('HIGH');
    expect(heatInputTier(75)).toBe('HIGH');
    expect(heatInputTier(75.01)).toBe('EXCESSIVE');
  });

  it('never returns a tier the calculator has no presentation for', () => {
    const { heatInputTier } = window.__WeldLabCore;
    // The view does TIER_PRESENTATION[tier].color, so an unexpected tier string
    // would throw rather than degrade.
    const known = ['LOW', 'MEDIUM', 'HIGH', 'EXCESSIVE'];
    for (let net = -10; net <= 200; net += 0.5) {
      expect(known).toContain(heatInputTier(net));
    }
  });
});

describe('WeldLab defect model', () => {
  const clean = () => window.__WeldLabCore.computeWeldDefects(20, 0.25, 22, 180, 12, 'mig');

  it('reports no defects for in-range parameters', () => {
    expect(clean()).toEqual({
      burnthrough: 0, lackOfFusion: 0, undercut: 0,
      overlap: 0, spatter: 0, porosity: 0
    });
  });

  it('burns through thin plate and lacks fusion on cold thick plate', () => {
    const { computeWeldDefects } = window.__WeldLabCore;

    // heat density = net / thickness = 20 / 0.125 = 160, over the 100 threshold
    expect(computeWeldDefects(20, 0.125, 22, 180, 12, 'mig').burnthrough).toBeCloseTo(0.75, 10);
    // Same heat on a thicker plate is fine.
    expect(computeWeldDefects(20, 0.25, 22, 180, 12, 'mig').burnthrough).toBe(0);

    // heat density = 5 / 0.5 = 10, under the 25 threshold
    expect(computeWeldDefects(5, 0.5, 22, 180, 12, 'mig').lackOfFusion).toBeCloseTo(0.6, 10);
  });

  it('requires BOTH conditions for undercut and for overlap', () => {
    const { computeWeldDefects } = window.__WeldLabCore;

    // Undercut = high amperage AND fast travel.
    expect(computeWeldDefects(20, 0.25, 22, 270, 20, 'mig').undercut).toBeCloseTo(0.3, 10);
    expect(computeWeldDefects(20, 0.25, 22, 270, 10, 'mig').undercut).toBe(0); // slow travel
    expect(computeWeldDefects(20, 0.25, 22, 200, 20, 'mig').undercut).toBe(0); // low amperage

    // Overlap = low amperage AND slow travel.
    expect(computeWeldDefects(20, 0.25, 22, 100, 6, 'mig').overlap).toBeCloseTo(0.25, 10);
    expect(computeWeldDefects(20, 0.25, 22, 100, 10, 'mig').overlap).toBe(0); // fast travel
    expect(computeWeldDefects(20, 0.25, 22, 150, 6, 'mig').overlap).toBe(0);  // high amperage
  });

  it('uses a process-specific amperage ceiling for spatter', () => {
    const { computeWeldDefects } = window.__WeldLabCore;
    const at = (P) => computeWeldDefects(20, 0.25, 22, 240, 12, P).spatter;

    expect(at('mig')).toBe(0);                 // ceiling 300
    expect(at('stick')).toBe(0);               // ceiling 250
    expect(at('tig')).toBeCloseTo(0.5, 10);    // ceiling 200
    expect(at('oxy')).toBe(1);                 // ceiling 150, clamped
  });

  it('models porosity per process', () => {
    const { computeWeldDefects } = window.__WeldLabCore;

    // MIG: low voltage with high amperage.
    expect(computeWeldDefects(20, 0.25, 14, 200, 12, 'mig').porosity).toBeCloseTo(0.5, 10);
    expect(computeWeldDefects(20, 0.25, 22, 200, 12, 'mig').porosity).toBe(0);
    // TIG: not enough amperage.
    expect(computeWeldDefects(20, 0.25, 22, 65, 12, 'tig').porosity).toBeCloseTo(0.5, 10);
    // Stick: damp-electrode proxy is a flat severity.
    expect(computeWeldDefects(20, 0.25, 20, 150, 12, 'stick').porosity).toBeCloseTo(0.45, 10);
    // Oxy: flame chemistry off target in either direction.
    expect(computeWeldDefects(20, 0.25, 22, 60, 12, 'oxy').porosity).toBeCloseTo(0.8, 10);
    expect(computeWeldDefects(20, 0.25, 22, 140, 12, 'oxy').porosity).toBeCloseTo(0.8, 10);
    expect(computeWeldDefects(20, 0.25, 22, 100, 12, 'oxy').porosity).toBe(0);
  });

  it('keeps every severity inside 0..1 under extreme inputs', () => {
    const { computeWeldDefects } = window.__WeldLabCore;
    const extremes = [
      [500, 0.01, 5, 400, 40, 'oxy'],
      [0, 2, 40, 5, 0.5, 'tig'],
      [200, 0.06, 10, 350, 30, 'stick'],
      [1, 0.5, 30, 300, 1, 'mig']
    ];

    extremes.forEach((args) => {
      const d = computeWeldDefects(...args);
      Object.entries(d).forEach(([name, sev]) => {
        expect(Number.isFinite(sev), `${name} not finite for ${JSON.stringify(args)}`).toBe(true);
        expect(sev).toBeGreaterThanOrEqual(0);
        expect(sev).toBeLessThanOrEqual(1);
      });
    });
  });

  it('guards against a divide-by-zero on zero plate thickness', () => {
    const { computeWeldDefects } = window.__WeldLabCore;
    // Thickness is floored at 0.06 precisely so this cannot become Infinity.
    const d = computeWeldDefects(20, 0, 22, 180, 12, 'mig');
    expect(Number.isFinite(d.burnthrough)).toBe(true);
    expect(d.burnthrough).toBeLessThanOrEqual(1);
  });
});

describe('WeldLab weld positions', () => {
  it('maps each AWS position to its rotation, defaulting to 1G flat', () => {
    const { positionRotation } = window.__WeldLabCore;

    expect(positionRotation('1G')).toEqual({ x: 0, y: 0, z: 0 });
    expect(positionRotation('2G')).toEqual({ x: 0, y: 0, z: Math.PI / 2 });
    expect(positionRotation('3G')).toEqual({ x: -Math.PI / 2, y: 0, z: 0 });
    expect(positionRotation('4G')).toEqual({ x: 0, y: 0, z: Math.PI });
    expect(positionRotation('nonsense')).toEqual({ x: 0, y: 0, z: 0 });
    expect(positionRotation(undefined)).toEqual({ x: 0, y: 0, z: 0 });
  });
});

describe('WeldLab material table', () => {
  it('is normalised to mild steel and keeps the physical ordering', () => {
    const { MATERIAL } = window.__WeldLabCore;

    // kFactor is documented as normalised to mild steel = 1.0.
    expect(MATERIAL.steel.kFactor).toBe(1.0);
    // Aluminium conducts heat away far faster than steel; stainless far slower.
    expect(MATERIAL.aluminum.kFactor).toBeGreaterThan(MATERIAL.steel.kFactor);
    expect(MATERIAL.stainless.kFactor).toBeLessThan(MATERIAL.steel.kFactor);

    // Melting points: aluminium melts well below either steel.
    expect(MATERIAL.aluminum.meltK).toBeLessThan(MATERIAL.stainless.meltK);
    expect(MATERIAL.stainless.meltK).toBeLessThan(MATERIAL.steel.meltK);

    // Densities: aluminium is roughly a third of the steels.
    expect(MATERIAL.aluminum.density).toBeLessThan(MATERIAL.steel.density);
    expect(MATERIAL.steel.density).toBeLessThan(MATERIAL.stainless.density);
  });
});
