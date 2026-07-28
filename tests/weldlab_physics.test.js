import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

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

describe('WeldLab carbon equivalent', () => {
  it('implements the IIW formula CE = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15', () => {
    const { carbonEquivalentIIW } = window.__WeldLabCore;

    // The module's own worked example: AISI 4140, stated in the copy as 0.77.
    expect(carbonEquivalentIIW({ C: 0.40, Mn: 0.85, Cr: 0.95, Mo: 0.20 })).toBeCloseTo(0.7717, 3);
    // Each divisor exercised on its own.
    expect(carbonEquivalentIIW({ C: 0.5 })).toBeCloseTo(0.5, 10);
    expect(carbonEquivalentIIW({ Mn: 6 })).toBeCloseTo(1, 10);
    expect(carbonEquivalentIIW({ Cr: 5 })).toBeCloseTo(1, 10);
    expect(carbonEquivalentIIW({ Mo: 5 })).toBeCloseTo(1, 10);
    expect(carbonEquivalentIIW({ V: 5 })).toBeCloseTo(1, 10);
    expect(carbonEquivalentIIW({ Ni: 15 })).toBeCloseTo(1, 10);
    expect(carbonEquivalentIIW({ Cu: 15 })).toBeCloseTo(1, 10);
    // Cr, Mo and V share a divisor; Ni and Cu share a different one.
    expect(carbonEquivalentIIW({ Cr: 1, Mo: 1, V: 1 })).toBeCloseTo(0.6, 10);
    expect(carbonEquivalentIIW({ Ni: 1, Cu: 1 })).toBeCloseTo(2 / 15, 10);
  });

  it('treats blank, missing and junk entries as zero rather than NaN', () => {
    const { carbonEquivalentIIW } = window.__WeldLabCore;
    // The inputs are free-text number fields, so a half-filled form is normal.
    expect(carbonEquivalentIIW({})).toBe(0);
    expect(carbonEquivalentIIW(undefined)).toBe(0);
    expect(carbonEquivalentIIW({ C: '', Mn: null, Cr: 'abc', Mo: undefined })).toBe(0);
    expect(carbonEquivalentIIW({ C: '0.40', Mn: '0.85' })).toBeCloseTo(0.5417, 3);
    expect(carbonEquivalentIIW({ C: -5, Mn: 0.6 })).toBeCloseTo(0.1, 10); // negatives ignored
  });

  it('bands CE on the boundaries the reference table shows', () => {
    const { ceRisk } = window.__WeldLabCore;

    expect(ceRisk(0)).toBe('LOW');
    expect(ceRisk(0.399)).toBe('LOW');
    expect(ceRisk(0.40)).toBe('MODERATE');
    expect(ceRisk(0.55)).toBe('MODERATE');
    expect(ceRisk(0.551)).toBe('HIGH');
    expect(ceRisk(0.70)).toBe('HIGH');
    expect(ceRisk(0.701)).toBe('VERY HIGH');
  });

  it('only ever returns a band the panel has a row for', () => {
    const { ceRisk } = window.__WeldLabCore;
    // The view looks the band up by name to colour the verdict; an unknown name
    // would leave it undefined and throw on .color.
    const known = ['LOW', 'MODERATE', 'HIGH', 'VERY HIGH'];
    for (let ce = -1; ce <= 3; ce += 0.01) {
      expect(known).toContain(ceRisk(ce));
    }
  });

  it('ships steel presets whose CE lands where the module says it does', () => {
    const { STEEL_PRESETS, carbonEquivalentIIW, ceRisk } = window.__WeldLabCore;

    const by = (id) => STEEL_PRESETS.find((p) => p.id === id);
    expect(STEEL_PRESETS).toHaveLength(4);

    // A36 is named in the LOW row of the table as a mild structural steel.
    expect(ceRisk(carbonEquivalentIIW(by('a36').comp))).toBe('LOW');
    // A572 is the HSLA step up: still weldable, but out of the no-preheat band.
    expect(ceRisk(carbonEquivalentIIW(by('a572').comp))).toBe('MODERATE');
    // 4140 is the module's worked example, called VERY HIGH in the copy.
    expect(carbonEquivalentIIW(by('4140').comp)).toBeCloseTo(0.7717, 3);
    expect(ceRisk(carbonEquivalentIIW(by('4140').comp))).toBe('VERY HIGH');
    // 4340 carries ~1.8% Ni on top of 4140-like alloying, so it must be worse.
    expect(carbonEquivalentIIW(by('4340').comp))
      .toBeGreaterThan(carbonEquivalentIIW(by('4140').comp));
    expect(ceRisk(carbonEquivalentIIW(by('4340').comp))).toBe('VERY HIGH');

    // Every preset must carry all seven fields, or an input renders undefined.
    STEEL_PRESETS.forEach((p) => {
      ['C', 'Mn', 'Cr', 'Mo', 'V', 'Ni', 'Cu'].forEach((k) => {
        expect(typeof p.comp[k], `${p.id} missing ${k}`).toBe('number');
      });
    });
  });

  it('rises monotonically as any single alloying element increases', () => {
    const { carbonEquivalentIIW } = window.__WeldLabCore;
    const base = { C: 0.2, Mn: 0.8, Cr: 0.2, Mo: 0.1, V: 0.05, Ni: 0.3, Cu: 0.2 };
    ['C', 'Mn', 'Cr', 'Mo', 'V', 'Ni', 'Cu'].forEach((k) => {
      const more = Object.assign({}, base);
      more[k] = base[k] + 0.5;
      expect(carbonEquivalentIIW(more), `${k} did not raise CE`)
        .toBeGreaterThan(carbonEquivalentIIW(base));
    });
  });
});

describe('WeldLab progress tier never claims a credential', () => {
  // The menu tier is computed purely from how many modules have been OPENED. It
  // used to be named off the AWS ladder, so touring all 22 announced "AWS Certified
  // Master Welder" and eight announced "Broad expertise ... to AWS-certified".
  // Apprentice and Journeyman are real apprenticeship classifications and AWS
  // certification is a witnessed performance test; none of it is earned by reading,
  // and this same tool teaches that correctly elsewhere. Guard the regression.
  const ALL_MODULES = [
    'heatInput', 'beadLab', 'defectHunt', 'processCompare', 'jointCatalog',
    'symbolsReader', 'ppeSafety', 'careerPaths', 'underwater', 'speedChallenge',
    'defectCatalog', 'metallurgy', 'codes', 'qualPrep', 'pipeWelding', 'robotic',
    'inspection', 'consumables', 'maineEcosystem', 'safetyHealth', 'mathBlueprint',
    'careerStories'
  ];

  const renderWithVisits = (n) => {
    const weldBadges = {};
    ALL_MODULES.slice(0, n).forEach((id) => { weldBadges[id] = true; });
    return renderTool('weldLab', { weldLab: { weldBadges } });
  };

  // Scope to the tier panel. The rest of the menu legitimately discusses the AWS
  // ladder and apprenticeships in module descriptions — that is real content and
  // must not be flagged. Only the tier the student is AWARDED is under test.
  const tierPanel = (html) => {
    const at = html.indexOf('Your tier');
    expect(at, 'tier panel not found in menu markup').toBeGreaterThan(-1);
    return html.slice(at, at + 700);
  };

  const HONEST_TIERS = [
    'New to the shop', 'Looking around', 'Finding your way around',
    'Knows the way around', 'Toured every station'
  ];

  it.each([0, 1, 4, 8, 21, 22])('awards only an exploration tier at %i modules opened', (n) => {
    const panel = tierPanel(renderWithVisits(n));

    // Exactly one of the honest names, and nothing claiming a qualification.
    expect(HONEST_TIERS.filter((t) => panel.includes(t))).toHaveLength(1);
    expect(panel).not.toMatch(/AWS Certified/i);
    expect(panel).not.toMatch(/AWS-certified/i);
    expect(panel).not.toMatch(/Master Welder/i);
    // Real registered-apprenticeship classifications, previously used as tier names.
    expect(panel).not.toMatch(/\bJourneyman\b/);
    expect(panel).not.toMatch(/\bApprentice\b/);
    // A competence claim for what is only a page visit.
    expect(panel).not.toMatch(/Broad expertise/i);
  });

  it('still shows an exploration ladder that moves with progress', () => {
    // The fix must not have flattened the motivation, only the claim.
    const none = renderWithVisits(0);
    const some = renderWithVisits(4);
    const all = renderWithVisits(22);

    expect(none).toMatch(/New to the shop/);
    expect(some).toMatch(/Finding your way around/);
    expect(all).toMatch(/Toured every station/);

    // Progress counter tracks the real number.
    expect(none).toMatch(/0 \/ 22 modules/);
    expect(all).toMatch(/22 \/ 22 modules/);
  });

  it('points a fully-explored student at what certification actually takes', () => {
    const all = renderWithVisits(22);
    expect(all).toMatch(/witnessed weld test/i);
    expect(all).toMatch(/Welder Qualification Prep/);
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
