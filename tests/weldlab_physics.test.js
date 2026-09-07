import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

describe('WeldLab material colours are canvas-safe', () => {
  it('holds literal hex, never a CSS var()', () => {
    const { MATERIAL } = window.__WeldLabCore;

    // These strings are handed to Canvas2D fillStyle and THREE.Color.setStyle,
    // neither of which resolves a CSS custom property. Canvas2D silently IGNORES
    // an unparseable fillStyle, so 'var(--allo-stem-text-soft, #94a3b8)' left the
    // context painting with whatever colour it already had — the plate's own dark
    // background — and all three materials rendered identically invisible.
    Object.keys(MATERIAL).forEach((key) => {
      const m = MATERIAL[key];
      [m.color, m.sheen].forEach((c) => {
        expect(typeof c).toBe('string');
        expect(c).not.toContain('var(');
        expect(c).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });

  it('gives the three materials visibly different plate colours', () => {
    const { MATERIAL } = window.__WeldLabCore;
    const shades = Object.keys(MATERIAL).map((k) => MATERIAL[k].color);
    expect(new Set(shades).size).toBe(shades.length);
  });
});

describe('WeldLab penetration model', () => {
  it('lands on its own 0.7 x thickness target at the module default', () => {
    const { beadPenetration, heatInputNet, MATERIAL } = window.__WeldLabCore;

    // The Bead Lab opens on MIG, mild steel, 22 V / 180 A / 12 in-min, 1/4" plate,
    // which the Heat Input Calculator classifies MEDIUM ("typical operating range
    // for most structural welds"). The scorecard grades penetration against
    // 0.7 x thickness, so the default must land there — it used to report 0.375"
    // (the 1.5x burn-through ceiling) and score zero.
    const net = heatInputNet(22, 180, 12, 'mig');
    const pen = beadPenetration(net, 0.25, MATERIAL.steel.kFactor);
    expect(pen).toBeCloseTo(0.25 * 0.7, 2);
  });

  it('does not shrink because the plate got thicker', () => {
    const { beadPenetration } = window.__WeldLabCore;

    // An arc does not know how thick the plate is. Thickness sets the TARGET
    // penetration, not the depth achieved; the old form divided by thickness.
    const thin = beadPenetration(20, 0.5, 1);
    const thick = beadPenetration(20, 1.0, 1);
    expect(thick).toBeCloseTo(thin, 6);
  });

  it('deepens with heat input and with a lower conductivity factor', () => {
    const { beadPenetration, MATERIAL } = window.__WeldLabCore;

    expect(beadPenetration(30, 0.5, 1)).toBeGreaterThan(beadPenetration(15, 0.5, 1));
    // Aluminium carries heat away, so the same arc penetrates it less than
    // stainless, which holds heat at the joint.
    const al = beadPenetration(20, 0.5, MATERIAL.aluminum.kFactor);
    const ss = beadPenetration(20, 0.5, MATERIAL.stainless.kFactor);
    expect(al).toBeLessThan(beadPenetration(20, 0.5, MATERIAL.steel.kFactor));
    expect(ss).toBeGreaterThan(beadPenetration(20, 0.5, MATERIAL.steel.kFactor));
  });

  it('stays inside the floor and the burn-through ceiling, and never returns NaN', () => {
    const { beadPenetration } = window.__WeldLabCore;

    expect(beadPenetration(0, 0.25, 1)).toBeGreaterThanOrEqual(0.02);
    expect(beadPenetration(500, 0.25, 1)).toBeLessThanOrEqual(0.25 * 1.5);
    [beadPenetration(20, 0, 0), beadPenetration(20, 0.25, NaN), beadPenetration(20, 0.25, -1)]
      .forEach((v) => expect(Number.isFinite(v)).toBe(true));
  });

  it('agrees with the defect model: a clean bead is not also a burn-through', () => {
    const { beadPenetration, computeWeldDefects, heatInputNet, MATERIAL } = window.__WeldLabCore;

    // One bead must not get two verdicts. At the module default the defect model
    // reports no burn-through, so penetration must not be pinned at the ceiling.
    const net = heatInputNet(22, 180, 12, 'mig');
    const defects = computeWeldDefects(net, 0.25, 22, 180, 12, 'mig');
    const pen = beadPenetration(net, 0.25, MATERIAL.steel.kFactor);
    expect(defects.burnthrough).toBe(0);
    expect(pen).toBeLessThan(0.25 * 1.5);
  });
});

describe('WeldLab menu card colours are measured', () => {
  it('deepens every gradient stop until white ink clears 4.5:1', () => {
    // The module cards paint white titles, subtitles and Core/Lab pills onto a
    // gradient band. Measured before this gate existed: 5 of 23 titles under
    // 3:1 (1.92:1 on yellow-500), 15 subtitles and 20 pills under 4.5:1. axe
    // cannot see any of it — it files gradient-backed text as `incomplete`.
    const src = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_weldlab.js'), 'utf8');
    const helpers = src.slice(src.indexOf('  var TW_HEX = {'), src.indexOf('  // ── localStorage helpers ──'));
    const box = {};
    // eslint-disable-next-line no-new-func
    new Function('exports', helpers + '\nexports.cardGradient=cardGradient;exports.contrastWithWhite=contrastWithWhite;')(box);

    const pairs = [...src.matchAll(/color: '(from-[a-z]+-\d+ to-[a-z]+-\d+)'/g)].map((m) => m[1]);
    expect(pairs.length).toBeGreaterThan(20);

    pairs.forEach((pair) => {
      const g = box.cardGradient(pair);
      // Every stop of the band the ink sits on, not just the average.
      g.deep.forEach((stop) => {
        expect(box.contrastWithWhite(stop)).toBeGreaterThanOrEqual(4.5);
      });
      // The bright original survives as the accent bar, so the card keeps its
      // identity. Deepening is a no-op for a stop already past the floor
      // (purple-600 measures 5.38:1), so the invariant is "never lighter".
      g.deep.forEach((stop, i) => {
        expect(box.contrastWithWhite(stop)).toBeGreaterThanOrEqual(
          box.contrastWithWhite(g.bright[i]) - 1e-9
        );
      });
    });
  });
});

describe('WeldLab quiz answers are not clustered in one slot', () => {
  // Measured before this gate existed: of 61 four-option questions, 37 answered
  // B, 15 A, 9 C and NONE answered D. Always picking B scored 60.7% across the
  // whole tool, and a student who noticed D was never right got a free 25% cut
  // in the answer space on every question. Position is not supposed to be a clue.
  const BS = String.fromCharCode(92);

  function elements(s, start) {
    let d = 0, q = null, els = [], cur = '', began = false;
    for (let i = start; i < s.length; i++) {
      const c = s[i];
      if (q) { cur += c; if (c === BS) { cur += s[++i]; continue; } if (c === q) q = null; continue; }
      if (c === "'" || c === '"') { q = c; cur += c; continue; }
      if (c === '[' || c === '{' || c === '(') { d++; if (d === 1 && c === '[' && !began) { began = true; continue; } cur += c; continue; }
      if (c === ']' || c === '}' || c === ')') { d--; if (d === 0 && c === ']') { if (cur.trim()) els.push(cur); return { els, end: i }; } cur += c; continue; }
      if (c === ',' && d === 1) { els.push(cur); cur = ''; continue; }
      cur += c;
    }
    return null;
  }

  function readQuestions() {
    const src = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_weldlab.js'), 'utf8');
    const re = new RegExp('(opts|choices|options)(\\s*:\\s*)\\[', 'g');
    const out = [];
    let m;
    while ((m = re.exec(src))) {
      const p = elements(src, m.index + m[0].length - 1);
      if (!p) continue;
      const k = /\b(correct|answer)(\s*:\s*)(\d+)/.exec(src.slice(p.end, p.end + 260));
      if (!k) continue;
      out.push({ n: p.els.length, idx: Number(k[3]) });
    }
    return out;
  }

  it('spreads the correct answer across all four slots', () => {
    const four = readQuestions().filter((q) => q.n === 4);
    expect(four.length).toBeGreaterThan(50);

    const counts = [0, 0, 0, 0];
    four.forEach((q) => { counts[q.idx] += 1; });

    // Every slot must be used at all — "D is never right" is itself an answer key.
    counts.forEach((c, i) => {
      expect(c, 'slot ' + 'ABCD'[i] + ' is never the answer').toBeGreaterThan(0);
    });

    // And no slot may carry more than 40% of the questions. Uniform is 25%;
    // the pre-fix cluster was 60.7%. This leaves room for honest drift as
    // questions are added without letting a new cluster form.
    const worst = Math.max.apply(null, counts);
    expect(worst / four.length).toBeLessThanOrEqual(0.4);
  });

  it('keeps every answer index inside its own option list', () => {
    readQuestions().forEach((q) => {
      expect(q.idx).toBeGreaterThanOrEqual(0);
      expect(q.idx).toBeLessThan(q.n);
    });
  });
});

describe('WeldLab 3D defect legend matches the markers it labels', () => {
  it('paints each swatch the colour of the mesh it identifies', () => {
    const { DEFECT_3D_COLOR } = window.__WeldLabCore;
    const src = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_weldlab.js'), 'utf8');

    // The legend and the THREE materials used to be two hand-maintained lists,
    // and three of the six had drifted: undercut showed #7c2d12 against a
    // #431407 mesh, overlap #92400e against #713f12, and lack-of-fusion painted
    // var(--allo-stem-text-soft) so the swatch changed with the theme while the
    // marker never did. Both now read this map, so neither can move alone.
    const keys = ['burnthrough', 'lackOfFusion', 'undercut', 'overlap', 'spatter', 'porosity'];
    keys.forEach((k) => {
      expect(DEFECT_3D_COLOR[k], k + ' has no colour').toMatch(/^#[0-9a-f]{6}$/i);
    });

    // Neither the swatch list nor the material list may carry a literal again.
    const legendBlock = src.slice(src.indexOf('var defectLegend = ['), src.indexOf('var defectLegend = [') + 1400);
    expect(legendBlock).not.toMatch(/color:\s*'(?!.*DEFECT_3D_COLOR)[^']*'/);
    keys.forEach((k) => {
      expect(legendBlock).toContain('DEFECT_3D_COLOR.' + k);
    });

    const matBlock = src.slice(src.indexOf('var defectMatBlack'), src.indexOf('var defectMatBlack') + 900);
    expect(matBlock).not.toMatch(/color:\s*0x[0-9a-f]{6}/i);
    keys.forEach((k) => {
      expect(matBlock).toContain('DEFECT_3D_COLOR.' + k);
    });
  });
});

describe('WeldLab teacher scaffolding covers every module', () => {
  it('gives all 24 view modules standards, questions, misconceptions and an extension', () => {
    const src = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_weldlab.js'), 'utf8');
    const lines = src.split('\n');
    const marks = [];
    lines.forEach((l, i) => {
      const m = /^ {6}function ([A-Z][A-Za-z0-9_]*)\s*\(/.exec(l);
      if (m) marks.push({ name: m[1], at: i });
    });
    const VIEWS = new Set(['HeatInputCalculator', 'WeldBeadLab', 'DefectHuntLab', 'ProcessComparison',
      'JointCatalog', 'SymbolsReader', 'PPESafetyLab', 'CareerPathways', 'UnderwaterLab', 'ProcessSleuth',
      'DefectDiagnose', 'SpeedChallenge', 'DefectCatalogView', 'MetallurgyDeepDive', 'CodesAndStandards',
      'WelderQualPrep', 'PipeWeldingDeepDive', 'RoboticAutomated', 'InspectionCWIPrep', 'ConsumablesDeepDive',
      'MaineEcosystem', 'SafetyHealthDeepDive', 'MathBlueprintLab', 'CareerStories']);
    const missing = [];
    marks.forEach((mk, i) => {
      if (!VIEWS.has(mk.name)) return;
      const end = i + 1 < marks.length ? marks[i + 1].at : lines.length;
      const body = lines.slice(mk.at, end).join('\n');
      const gaps = [];
      if (!/h\(TeacherNotes,/.test(body)) gaps.push('TeacherNotes');
      else {
        if (!/standards:\s*\[/.test(body)) gaps.push('standards');
        if (!/questions:\s*\[/.test(body)) gaps.push('questions');
        if (!/misconceptions:\s*\[/.test(body)) gaps.push('misconceptions');
        if (!/extension:/.test(body)) gaps.push('extension');
      }
      if (gaps.length) missing.push(mk.name + ' (' + gaps.join(', ') + ')');
    });
    expect(missing, 'modules missing teacher scaffolding').toEqual([]);
  });
});

describe('WeldLab quiz chips are readable', () => {
  // Process Sleuth and Defect Diagnose show each category as a coloured chip and
  // paint the LABEL in the category's own colour on an 8% wash of that colour.
  // Measured before this gate: all eleven chips under 4.5:1, four under 3:1
  // (flux-cored 2.02:1, MIG and "heat too low" 2.55:1) — on the text a student
  // must read to answer. axe cannot see it either: these are inline styles over
  // a tint, and the failing runs reported zero violations.
  const CHIP_COLORS = ['#0ea5e9', '#a855f7', '#dc2626', '#f59e0b', '#16a34a', '#64748b'];

  it('darkens the label until it clears 4.5:1 on its own wash', () => {
    const { inkOnWash, contrastPair } = window.__WeldLabCore;

    CHIP_COLORS.forEach((c) => {
      ['15', '12'].forEach((alphaByte) => {
        const a = parseInt(alphaByte, 16) / 255;
        const rgb = [1, 3, 5].map((i) => parseInt(c.substr(i, 2), 16));
        const wash = '#' + rgb
          .map((v) => Math.round(v * a + 255 * (1 - a)).toString(16).padStart(2, '0'))
          .join('');
        const ink = inkOnWash(c, alphaByte);
        expect(ink).toMatch(/^#[0-9a-f]{6}$/i);
        expect(contrastPair(ink, wash), c + ' on its ' + alphaByte + ' wash').toBeGreaterThanOrEqual(4.5);
      });
    });
  });

  it('never hands a raw colour straight to a chip label', () => {
    const src = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_weldlab.js'), 'utf8');
    expect(src).not.toMatch(/color:\s*pr\.color\s*,/);
    expect(src).not.toMatch(/color:\s*c\.color\s*,/);
    expect(src).not.toMatch(/color:\s*psAns \? color : pr\.color\b/);
    expect(src).not.toMatch(/color:\s*ddAns2 \? color : c\.color\b/);
  });

  it('keeps every string-concatenated colour a literal hex', () => {
    const src = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_weldlab.js'), 'utf8');

    // These colours are concatenated with an alpha byte ("#dc2626" + "15") to
    // build a CSS value. A var(--x, #fallback) there produces
    // "var(--x, #fallback)15", which is unparseable — the browser drops the whole
    // declaration. The Defect Diagnose "Technique error" chip did exactly that
    // and rendered with no tint and no border while its five siblings had both.
    const blocks = [
      src.slice(src.indexOf('var PROCESSES = ['), src.indexOf('var PROCESSES = [') + 1600),
      src.slice(src.indexOf('var CAUSES = ['), src.indexOf('var CAUSES = [') + 1900),
    ];
    blocks.forEach((b) => {
      const colours = [...b.matchAll(/color:\s*'([^']+)'/g)].map((m) => m[1]);
      expect(colours.length).toBeGreaterThan(4);
      colours.forEach((c) => {
        expect(c, 'chip colour is concatenated into CSS, so it must be a literal').toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });
});

describe('WeldLab states each career fact the same way everywhere', () => {
  // A career tool aimed at teenagers choosing a path cannot quote two numbers for
  // the same thing. Found 2026-09-07: the CWI exam cost $1,150 in the menu card
  // and in the Inspection module but "~$1500" in Career Pathways; Bath Iron Works
  // had 6,500+ employees in two modules and ~6,800 in a third; dive school cost
  // $20-30K in Underwater Welding and $25-30K in Career Pathways; and CWI pay was
  // ~$70-110K on the menu card against $60-110K in the module that owns the topic.
  // Same defect as one bead getting three verdicts, but in prose, where no gate looked.
  const read = () => readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_weldlab.js'), 'utf8');

  // Each contradiction pattern is SUBJECT-SCOPED. A bare /\$1,?500/ also matches
  // "$1500-3000 industrial machine" and the "$1500-3000 seminar", which are
  // unrelated and correct; a gate that flags those teaches the next reader to
  // ignore it.
  const CLAIMS = [
    ['CWI exam fee', /\$1,150/g,
      /\$1,?500\s*(?:exam|fee)|(?:exam|fee)[^.]{0,25}\$1,?500\b/gi],
    ['Bath Iron Works headcount', /6,500\+? employees|~6,500 employees/g,
      /6,[6-9]\d\d\s*employees/g],
    ['commercial dive school tuition', /\$20-30K/g,
      /\$2[1-9]-30K[^.]{0,45}(?:school|tuition)|(?:school|tuition)[^.]{0,45}\$2[1-9]-30K/gi],
  ];

  CLAIMS.forEach(([name, agreed, contradiction]) => {
    it('quotes one figure for ' + name, () => {
      const src = read();
      const hits = src.match(agreed) || [];
      expect(hits.length, 'the agreed figure for ' + name + ' vanished').toBeGreaterThan(1);
      const bad = src.match(contradiction) || [];
      expect(bad, 'a second figure appeared for ' + name).toEqual([]);
    });
  });

  it('never claims a CWI salary the Inspection module contradicts', () => {
    const src = read();
    // The Inspection module is the authority: $60-110K typical, seniors $100-150K.
    expect(src).toContain('$60-110K per year typical');
    // No other module may promise CWIs the 6G-pipe / underwater band as a typical wage.
    expect(src).not.toMatch(/CWI[^.]{0,60}routinely earn \$80-200K/);
    expect(src).not.toMatch(/~\$70-110K/);
  });
});

describe('WeldLab radiogroups honour the keyboard contract', () => {
  // ARIA says a radiogroup's arrow keys move between its radios. All 17 groups
  // rendered each option as its own <button role="radio"> and handled no keys at
  // all — the only arrow handling in the file was the 3-D camera orbit. Verified
  // in Chromium with `stem_tool_shot.cjs --probe` before and after: at HEAD an
  // ArrowRight left the selection untouched and defaultPrevented false; now the
  // selection and focus both move.
  //
  // These assertions are structural on purpose. jsdom reports focus in ways that
  // do not match a browser, so a jsdom focus assertion would pass whether or not
  // the fix worked; the behaviour is pinned by the browser probe instead.
  const read = () => readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_weldlab.js'), 'utf8');

  it('wires every radiogroup container to the shared key handler', () => {
    const src = read();
    const groups = src.split('\n').filter((l) => /'?role'?:\s*'radiogroup'/.test(l));
    expect(groups.length).toBeGreaterThanOrEqual(17);
    const unwired = groups.filter((l) => !l.includes('onKeyDown: radioGroupKeys'));
    expect(unwired.map((l) => l.trim().slice(0, 80)), 'radiogroups with no key handler').toEqual([]);
  });

  it('gives every radiogroup an accessible name', () => {
    const src = read();
    const groups = src.split('\n').filter((l) => /'?role'?:\s*'radiogroup'/.test(l));
    const unnamed = groups.filter((l) => !/'aria-label':/.test(l));
    expect(unnamed.map((l) => l.trim().slice(0, 80)), 'radiogroups with no aria-label').toEqual([]);
  });

  it('handles both arrow axes plus Home and End', () => {
    const src = read();
    const fn = src.slice(src.indexOf('function radioGroupKeys('), src.indexOf('function radioGroupKeys(') + 1800);
    ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'].forEach((k) => {
      expect(fn, 'radioGroupKeys ignores ' + k).toContain("'" + k + "'");
    });
    // It must consume the key, or the page scrolls under the student.
    expect(fn).toContain('e.preventDefault()');
  });

  it('moves focus off a radio that answering is about to disable', () => {
    const src = read();
    // Both quiz modules set `disabled: <answered>` on every radio. Disabling the
    // focused element blurs it and focus falls to <body>, stranding a keyboard
    // user at the top of the document — confirmed in Chromium at HEAD.
    ['psFeedbackRef', 'ddFeedbackRef'].forEach((ref) => {
      expect(src, ref + ' is missing').toContain('var ' + ref + ' = useRef(null)');
      expect(src).toContain('ref: ' + ref);
      expect(src).toContain(ref + '.current.focus()');
      // Edge-guarded, so re-entering an answered question does not steal focus.
      expect(src).toContain('var ' + ref + 'Prev = useRef(false)');
    });
  });
});
