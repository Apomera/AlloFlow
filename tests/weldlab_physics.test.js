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
  // ★ Read BADGE_IDS out of the tool rather than keeping a copy here. This list
  // WAS a copy, and it went stale the moment two modules were added to the tool —
  // which is the same drift that left BADGE_LABELS with 11 entries for 22 ids.
  // A test that hardcodes what it is testing stops testing it.
  const ALL_MODULES = (function () {
    const src = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_weldlab.js'), 'utf8');
    const m = /var BADGE_IDS = \[([^\]]+)\]/.exec(src);
    expect(m, 'BADGE_IDS not found in the tool').toBeTruthy();
    return m[1].split(',').map((x) => x.trim().replace(/^'|'$/g, '')).filter(Boolean);
  })();

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

  it.each([0, 1, 4, 8, ALL_MODULES.length - 1, ALL_MODULES.length])('awards only an exploration tier at %i modules opened', (n) => {
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
    const all = renderWithVisits(ALL_MODULES.length);

    expect(none).toMatch(/New to the shop/);
    expect(some).toMatch(/Finding your way around/);
    expect(all).toMatch(/Toured every station/);

    // Progress counter tracks the real number.
    const N = ALL_MODULES.length;
    expect(none).toMatch(new RegExp('0 \\/ ' + N + ' modules'));
    expect(all).toMatch(new RegExp(N + ' \\/ ' + N + ' modules'));
  });

  it('points a fully-explored student at what certification actually takes', () => {
    const all = renderWithVisits(ALL_MODULES.length);
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

  it('routes every card gradient through the helper, not straight to a class', () => {
    const src = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_weldlab.js'), 'utf8');

    // ★ The assertion above only proves cardGradient() WOULD return a legible
    // pair. It says nothing about whether a card actually calls it. Three card
    // systems built their header as `'bg-gradient-to-br ' + someObj.color`, and
    // because the class names arrive through a VARIABLE, a sweep for literal
    // `from-*` on a `text-white` line walked straight past all three: the menu
    // cards, the Process Comparison cards (TIG 2.15:1) and the Speed Challenge
    // tiers (Apprentice 2.54:1). Ban the concatenated form outright.
    const concatenated = src.match(/bg-gradient-to-[a-z]+ '\s*\+/g) || [];
    expect(concatenated, 'a gradient class is being built by concatenation').toEqual([]);

    // And every object that carries a `from-… to-…` pair must be read through it.
    const pairs = (src.match(/color: 'from-[a-z]+-\d+ to-[a-z]+-\d+'/g) || []).length;
    const calls = (src.match(/cardGradient\(/g) || []).length;
    expect(pairs).toBeGreaterThan(20);
    // one definition + one call per card system
    expect(calls).toBeGreaterThanOrEqual(4);
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

describe('WeldLab never flashes above the photosensitivity threshold', () => {
  // WCAG 2.3.1 draws the line at three flashes per second. This is an ARC
  // simulator: the brightest thing on screen is a near-white core on a black
  // field, which is the worst case the guideline exists for.
  //
  // The top-down bead arc had already been retuned from sin(elapsed * 30)
  // (4.77 Hz) to a compound 2.40 + 0.91 Hz waveform. The Helmet POV bloom — the
  // same effect, on the darkest ground in the tool — kept sin(elapsed * 28) =
  // 4.46 Hz and was missed. One view being fixed is exactly why the other needs
  // a gate rather than a comment.
  const HZ_LIMIT = 3;

  function oscillators() {
    const src = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_weldlab.js'), 'utf8');
    const out = [];
    const re = /Math\.(?:sin|cos)\(\s*([^)]{0,70})\)/g;
    let m;
    while ((m = re.exec(src))) {
      const expr = m[1];
      // Only oscillations driven by wall-clock time flash; the rest are geometry.
      if (!/elapsed|now|time/.test(expr)) continue;
      const mult = /\*\s*([\d.]+)/.exec(expr);
      if (!mult) continue;
      out.push({
        line: src.slice(0, m.index).split('\n').length,
        expr: expr.trim(),
        hz: Number(mult[1]) / (2 * Math.PI),
      });
    }
    return out;
  }

  it('keeps every time-driven oscillation under 3 Hz', () => {
    const found = oscillators();
    expect(found.length, 'no oscillators parsed — the scan broke').toBeGreaterThan(4);
    const over = found
      .filter((o) => o.hz > HZ_LIMIT)
      .map((o) => 'line ' + o.line + ': ' + o.expr + ' = ' + o.hz.toFixed(2) + ' Hz');
    expect(over, 'oscillation faster than 3 flashes per second').toEqual([]);
  });

  it('drives both arc views from the same retuned waveform', () => {
    const src = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_weldlab.js'), 'utf8');
    // THREE views draw a pulsing arc — top-down, 3-D scene and helmet POV. Two
    // carried the retuned waveform and the helmet kept the old one; pin all three
    // to each other so the next edit cannot fix two of them again.
    const waveform = /0\.78 \+ 0\.12 \* Math\.sin\(elapsed \* 15\.1\) \+ 0\.06 \* Math\.sin\(elapsed \* 5\.7\)/g;
    expect((src.match(waveform) || []).length, 'an arc view uses a different pulse').toBe(3);
  });

  it('reads prefers-reduced-motion live rather than once at module load', () => {
    const src = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_weldlab.js'), 'utf8');
    // The CSS guard is a media query and updates itself; the canvas guard is a
    // variable, and a variable sampled at module load never changes — in the
    // bundled desktop shell that is the lifetime of the app.
    expect(src).toMatch(/mq\.addEventListener\('change'/);
    expect(src).toMatch(/mq\.addListener/);
  });
});

describe('WeldLab progress bars survive the contrast theme', () => {
  // Two measured defects, one fix. Light theme: fill-against-track ran 1.74:1
  // (amber-500) to 2.98:1 (rose-500), under the 3:1 WCAG 1.4.11 floor, and no
  // single track shade fixes it because the fills span orange-400 to
  // fuchsia-600. Contrast theme: the host's blanket
  // `.theme-contrast [class*="bg-"] { background-color:#000 !important }`
  // blackened fill AND track, so all six bars measured exactly 1.00:1.
  // Marking the value with an EDGE fixes both: that rule only touches
  // background-color, so a border survives it.
  const read = () => readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_weldlab.js'), 'utf8');

  it('marks the value with a border rather than a hue difference', () => {
    const src = read();
    expect(src).toContain('var BAR_TRACK_STYLE = ');
    expect(src).toContain('function barFillStyle(');
    // currentColor, not a fixed ink: the edge then follows the surrounding text
    // colour, which the contrast theme forces to yellow and light leaves dark —
    // so it is legible against whatever ground it lands on. A hardcoded slate
    // would be invisible on the contrast theme's black.
    const helper = src.slice(src.indexOf('var BAR_TRACK_STYLE = '), src.indexOf('var BAR_TRACK_STYLE = ') + 600);
    expect(helper).toMatch(/border:\s*'1px solid currentColor'/);
    expect(helper).toMatch(/borderRight:.*'2px solid currentColor'/);
  });

  it('routes every bar through the shared style', () => {
    const src = read();
    // A track is a rounded-full overflow-hidden box holding a percentage fill.
    const tracks = src.split('\n').filter((l) => /rounded-full overflow-hidden/.test(l) && /aria-hidden/.test(l));
    expect(tracks.length).toBeGreaterThanOrEqual(6);
    const bare = tracks.filter((l) => !l.includes('BAR_TRACK_STYLE'));
    expect(bare.map((l) => l.trim().slice(0, 70)), 'a bar track with no edge').toEqual([]);

    // And no fill may still set a bare inline width.
    expect((src.match(/barFillStyle\(/g) || []).length).toBeGreaterThanOrEqual(6);
  });

  it('drops the marker at 100%, where there is no edge to mark', () => {
    const src = read();
    const helper = src.slice(src.indexOf('function barFillStyle('), src.indexOf('function barFillStyle(') + 400);
    expect(helper).toMatch(/p > 0 && p < 100/);
  });
});

describe('WeldLab rating dots survive the contrast theme', () => {
  // Probed in Chromium: all 120 dots in Process Comparison computed to
  // rgb(0,0,0) under the host's blanket
  // `.theme-contrast [class*="bg-"] { background-color:#000 !important }` —
  // 76 filled and 44 empty alike — so every cell of the 24-cell side-by-side
  // matrix was six identical black dots, and the module's whole point conveyed
  // nothing. Light was not clean either: orange-500 on slate-200 is 2.27:1,
  // under the 3:1 WCAG 1.4.11 floor for a graphic that carries meaning.
  const read = () => readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_weldlab.js'), 'utf8');

  it('distinguishes filled from empty by border style, not only by fill', () => {
    const src = read();
    const fn = src.slice(src.indexOf('function ratingDots('), src.indexOf('function ratingDots(') + 900);
    // border-style is untouched by a background-color override, so solid vs
    // dashed survives any palette the host forces.
    expect(fn).toMatch(/border:\s*'2px solid currentColor'/);
    expect(fn).toMatch(/border:\s*'1px dashed currentColor'/);
    // currentColor, so the ring follows the surrounding ink in every theme.
    expect(fn).not.toMatch(/border:\s*'[^']*#[0-9a-f]{3,6}/i);
  });

  it('still carries an accessible count for readers who see no dots at all', () => {
    const src = read();
    const fn = src.slice(src.indexOf('function ratingDots('), src.indexOf('function ratingDots(') + 1200);
    expect(fn).toContain("'aria-hidden': true");
    expect(fn).toMatch(/role: 'img', 'aria-label': n \+ ' of ' \+ max/);
  });
});

describe('WeldLab print stylesheet keeps its promises', () => {
  // Every Teacher Notes block carries a Print button, so printing is a first-class
  // path for this tool. The print CSS claimed to "hide interactive controls", but
  // `.weldlab-no-print` was on exactly ONE element — the Print button itself — so a
  // printed module still carried every slider, tab strip and back button. And
  // `.weldlab-page-break` was declared while NO element in the file ever carried
  // the class: confirmed dead at runtime by walking document.styleSheets and
  // counting querySelectorAll matches per rule.
  const read = () => readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_weldlab.js'), 'utf8');

  function printBlock(src) {
    const at = src.indexOf("'@media print {'");
    expect(at, 'no print stylesheet').toBeGreaterThan(-1);
    const raw = src.slice(at, src.indexOf(".join('", at));
    // Strip the JS comments before scanning: a comment naming a selector is not
    // a rule, and one of them deliberately records the dead `.weldlab-page-break`
    // rule that was removed. A gate that cannot tell prose from CSS reports the
    // explanation as the defect.
    return raw.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  }

  it('declares no rule whose class nothing carries', () => {
    const src = read();
    const block = printBlock(src);
    // Every class the print CSS targets must be applied somewhere outside the
    // stylesheet itself. A negative grep is not absence — count usages.
    const classes = [...block.matchAll(/\.(weldlab-[a-z-]+)/g)].map((m) => m[1]);
    const dead = [...new Set(classes)].filter((c) => {
      const uses = (src.match(new RegExp(c, 'g')) || []).length;
      const inCss = (block.match(new RegExp(c, 'g')) || []).length;
      return uses - inCss < 1;
    });
    expect(dead, 'print rule targeting a class no element carries').toEqual([]);
  });

  it('hides navigation but never the quiz options', () => {
    const src = read();
    const block = printBlock(src);
    // Tab strips are navigation the reader cannot use on paper; the selected
    // panel still prints because only the control is hidden.
    expect(block).toMatch(/\[role="tab"\], \[role="tablist"\]/);
    // role=radio carries the answer choices. A printed worksheet without its
    // options is worthless, so these must never be swept up with the chrome.
    expect(block).not.toMatch(/role="radio"/);
    expect(block).not.toMatch(/^\s*'\s*button\s*\{/m);
  });

  it('gives the teacher their notes on a page of their own', () => {
    const block = printBlock(read());
    expect(block).toMatch(/details\.weldlab-teacher-notes \{ page-break-before: always/);
  });

  it('tags the back button as chrome, not content', () => {
    const src = read();
    // The bar itself carries the module title, which a printed page wants.
    expect(src).toMatch(/className: 'weldlab-no-print px-3 py-1\.5 rounded-lg bg-white\/20/);
  });
});

describe('WeldLab saved progress uses one precedence rule', () => {
  // Three collections persisted three different ways:
  //  - defect catalog: window slot first, then localStorage
  //  - badges:         localStorage only, so a fresh mount after a project load
  //                    showed 0/22 modules even with five badges in the slot
  //                    (measured in Chromium against HEAD)
  //  - speed bests:    localStorage ONLY, mirrored to neither the slot nor
  //                    toolData, so they never reached the project file at all —
  //                    in a module whose own card promises
  //                    "Personal-best score saved per tier".
  // The window slot is what the host's handleLoadProject populates, and the
  // project file is the only layer that survives a Canvas session, so the slot
  // has to win.
  const read = () => readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_weldlab.js'), 'utf8');

  it('reads all three collections through the same helper', () => {
    const src = read();
    expect(src).toMatch(/function savedCollection\(slotKey, lsKey\)/);
    ['badges', 'defectCatalog', 'speedBest'].forEach((k) => {
      expect(src, k + ' does not go through savedCollection').toMatch(
        new RegExp("savedCollection\\('" + k + "'")
      );
    });
    // No collection may still read localStorage directly at hydration time —
    // that is exactly how badges came to ignore a loaded project.
    const hyd = src.slice(src.indexOf('// Hydrate persisted state once on mount.'),
      src.indexOf('// Hydrate persisted state once on mount.') + 900);
    expect(hyd).not.toMatch(/lsGet\(/);
  });

  it('mirrors all three into the slot the project file is built from', () => {
    const src = read();
    const mirror = src.slice(src.indexOf('window.__alloflowWeldLab = Object.assign'),
      src.indexOf('window.__alloflowWeldLab = Object.assign') + 420);
    ['defectCatalog:', 'badges:', 'speedBest:'].forEach((k) => {
      expect(mirror, k + ' is not mirrored to the slot').toContain(k);
    });
    // and the effect must re-run when any of them changes
    expect(src).toMatch(/\[d\.defectCatalog, d\.weldBadges, d\.speedBest\]/);
  });

  it('restores all three when the host signals a project load', () => {
    const src = read();
    const onRestore = src.slice(src.indexOf('function onRestore()'), src.indexOf('function onRestore()') + 420);
    expect(onRestore).toContain("upd('defectCatalog'");
    expect(onRestore).toContain("upd('weldBadges'");
    expect(onRestore).toContain("upd('speedBest'");
  });

  it('writes a new personal best to toolData, not only to localStorage', () => {
    const src = read();
    const at = src.indexOf("lsSet('weldLab.speed.best.v1', newBest)");
    expect(at).toBeGreaterThan(-1);
    expect(src.slice(at, at + 200)).toContain("upd('speedBest', newBest)");
  });
});

describe('WeldLab treats a saved project as untrusted input', () => {
  // Everything in `d` arrives from toolData, which arrives from a project file a
  // student can save, copy, hand-edit or carry between tool versions. Mounting
  // the tool against ten malformed states in Chromium crashed SIX of them at
  // HEAD — `V.toFixed is not a function`, `TH.toFixed is not a function`,
  // `Cannot read properties of undefined` — and in this shell one tool's throw
  // takes the surrounding error boundary with it, so a single bad file can blank
  // the whole lab. All ten mount cleanly once the values are coerced on the way in.
  const read = () => readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_weldlab.js'), 'utf8');

  it('coerces and clamps every persisted number', () => {
    const src = read();
    expect(src).toMatch(/function usePersistedNumber\(key, defaultValue, min, max\)/);

    // A numeric default handed to the plain string helper is the bug: it trusts
    // whatever the file said. Every one of these must use the numeric helper.
    const plainNumeric = [...src.matchAll(/usePersistedState\('([a-z_0-9]+)',\s*(-?[\d.]+)\)/g)]
      .map((m) => m[1]);
    expect(plainNumeric, 'numeric key still on the unchecked helper').toEqual([]);

    // and the helper must actually do both jobs
    const fn = src.slice(src.indexOf('function usePersistedNumber('), src.indexOf('function usePersistedNumber(') + 700);
    expect(fn).toMatch(/parseFloat\(raw\)/);
    expect(fn).toMatch(/isFinite\(n\)/);
    expect(fn).toMatch(/clamp\(n, min, max\)/);
  });

  it('bounds every index before it reaches a list', () => {
    const src = read();
    expect(src).toMatch(/function persistedIndex\(raw, len\)/);
    // The two vignette indices read straight off toolData and were used as
    // LIST[i] — a string or an out-of-range number made that undefined and the
    // next property read threw.
    expect(src).toMatch(/var psIdx = persistedIndex\(d\.psIdx, V\.length\)/);
    expect(src).toMatch(/var ddIdx2 = persistedIndex\(d\.dd2Idx, V\.length\)/);
    expect(src).not.toMatch(/d\.psIdx == null \? -1 : d\.psIdx/);
    expect(src).not.toMatch(/d\.dd2Idx == null \? -1 : d\.dd2Idx/);

    const fn = src.slice(src.indexOf('function persistedIndex('), src.indexOf('function persistedIndex(') + 400);
    expect(fn).toMatch(/Math\.floor\(n\)/);
    expect(fn).toMatch(/n >= 0 && n < len/);
  });

  it('never lets a clamp range be open-ended', () => {
    const src = read();
    // usePersistedNumber clamps unconditionally, so a call without bounds would
    // clamp against undefined and pass the bad value straight through.
    const calls = [...src.matchAll(/usePersistedNumber\(([^)]*)\)/g)].map((m) => m[1]);
    expect(calls.length).toBeGreaterThanOrEqual(15);
    calls.forEach((args) => {
      expect(args.split(',').length, 'usePersistedNumber without min/max: ' + args).toBe(4);
    });
  });
});

describe('WeldLab heat-input discovery uses the right units', () => {
  // The widget's slider is labelled mm/SECOND but the formula carried the x60
  // that only belongs to a per-MINUTE travel speed (which is what the main Heat
  // Input Calculator uses, in/min). Every reading came out 60x too large, so the
  // default settings reported "Burn-through risk" at 24.75 kJ/mm when the true
  // figure was 0.41 — on the one screen whose entire job is discovering the
  // relationship between travel speed and heat input.
  const read = () => readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_weldlab.js'), 'utf8');

  it('computes kJ/mm from mm/s without a per-minute factor', () => {
    const src = read();
    expect(src).toMatch(/var heatInput = \(iq\.amperage \* iq\.voltage\) \/ \(iq\.travelSpeed \* 1000\);/);
    expect(src).not.toMatch(/iq\.amperage \* iq\.voltage \* 60/);
  });

  it('keeps the regime thresholds, which were always realistic', () => {
    const src = read();
    // 0.8 / 2.0 / 3.5 kJ/mm are sane arc-welding bands. They were never the bug;
    // only the value fed into them was. Pin them so a later "fix" does not move
    // the bands to accommodate a wrong number.
    const at = src.indexOf('var heatInput = (iq.amperage');
    const block = src.slice(at, at + 420);
    expect(block).toMatch(/heatInput < 0\.8\) state = 'cold'/);
    expect(block).toMatch(/heatInput < 2\.0\) state = 'optimal'/);
    expect(block).toMatch(/heatInput < 3\.5\) state = 'hot'/);
  });

  it('opens on settings that land in the optimal band', () => {
    const src = read();
    const m = /heatHunt \|\| \{ amperage: (\d+), travelSpeed: ([\d.]+), voltage: (\d+)/.exec(src);
    expect(m, 'default state not found').toBeTruthy();
    const [A, v, V] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const kJmm = (A * V) / (v * 1000);
    // A discovery widget should open showing the target regime, not an extreme.
    expect(kJmm).toBeGreaterThanOrEqual(0.8);
    expect(kJmm).toBeLessThan(2.0);
  });
});

describe('WeldLab menu, badges and labels agree with each other', () => {
  // Three lists that had to be kept in sync by hand, and were not:
  //  - 24 menu cards, 22 BADGE_IDS. Opening Process Sleuth or Defect Diagnose
  //    never marked it explored — no tick on the card, no progress credit — and
  //    the counter read "X / 22 modules" beside 24 cards, so a student could
  //    reach 22/22 "Toured every station" with two cards still blank.
  //  - 22 BADGE_IDS, 11 BADGE_LABELS. The "Try next" nudge names the first
  //    UNVISITED id, so every prompt after the first eleven modules rendered
  //    "→ Try next:" and then nothing. Measured: nudge text "" at 11 visits.
  const read = () => readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_weldlab.js'), 'utf8');

  const badgeIds = () => {
    const m = /var BADGE_IDS = \[([^\]]+)\]/.exec(read());
    return m[1].split(',').map((x) => x.trim().replace(/^'|'$/g, '')).filter(Boolean);
  };
  const cardIds = () => [...read().matchAll(/^\s*id: '([A-Za-z0-9_]+)', title:/gm)].map((m) => m[1]);

  it('gives every menu card a badge, and every badge a card', () => {
    const ids = badgeIds();
    const cards = cardIds();
    expect(cards.length).toBeGreaterThan(20);
    expect(cards.filter((c) => !ids.includes(c)), 'card with no badge').toEqual([]);
    expect(ids.filter((i) => !cards.includes(i)), 'badge with no card').toEqual([]);
  });

  it('derives the nudge labels from the cards instead of a second hand-kept map', () => {
    const src = read();
    // A parallel map is exactly how 11-of-22 happened. The cards already carry a
    // title for every id — and the translated one, not an English copy.
    expect(src).toMatch(/var BADGE_LABELS = \{\};/);
    expect(src).toMatch(/bigCards\.concat\(miniCards\)\.forEach\(function \(c\) \{ BADGE_LABELS\[c\.id\] = c\.title; \}\);/);
    // and no literal label map may come back
    expect(src).not.toMatch(/BADGE_LABELS = \{\s*\n\s*heatInput:/);
  });

  it('counts the progress denominator from the badge list, not a typed number', () => {
    const src = read();
    expect(src).toMatch(/var totalCount = BADGE_IDS\.length;/);
    // and the footer sentence too — it once read "All 10 modules live" with 22 on
    // screen. Assert the FALLBACK carries the placeholder rather than banning the
    // old wording outright: the comment that records the bug contains that
    // wording, and a gate matching prose flags its own explanation (same trap the
    // print-CSS gate hit).
    expect(src).toMatch(/value1: BADGE_IDS\.length/);
    expect(src).toMatch(/'All \{value1\} modules live\./);
  });
});
