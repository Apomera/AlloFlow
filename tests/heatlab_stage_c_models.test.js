import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Stage C pure models: the convection driver (Rayleigh number and Nusselt
// correlations), surface radiation in sunlight and infrared, the vacuum flask,
// heating and cooling curves for four substances (with supercooling), the
// "keep it frozen" cooler, and the investigation definitions. Expected values
// are computed here from the published formulas, never read back from the tool.
const SIGMA = 5.670374419e-8, NA = 6.02214076e23;
let M;

beforeEach(() => {
  resetStemLab();
  M = loadTool('stem_lab/stem_tool_heatlab.js', 'heatLab').models;
});

// Midpoint rule; the integrands here are smooth except at known corners.
function integrate(f, a, b, n = 200000) {
  const h = (b - a) / n;
  let s = 0;
  for (let i = 0; i < n; i++) s += f(a + (i + 0.5) * h);
  return s * h;
}

describe('convection driver', () => {
  const water = { rho: 998, c: 4182, k: 0.598, nu: 1.004e-6, beta: 2.07e-4 };
  const alpha = water.k / (water.rho * water.c);

  it('computes Ra = g beta dT L^3 / (nu alpha) from the fluid table', () => {
    const hand = 9.81 * water.beta * 1 * Math.pow(0.01, 3) / (water.nu * alpha);
    expect(M.rayleigh('water', 1, 0.01)).toBeCloseTo(hand, 6);
    // L^3: ten times deeper is a thousand times the Rayleigh number
    expect(M.rayleigh('water', 1, 0.1) / M.rayleigh('water', 1, 0.01)).toBeCloseTo(1000, 6);
  });

  it('uses Nu = 1 below Ra 1708 and the published correlations above it', () => {
    expect(M.raOnset).toBe(1708);
    expect(M.nusselt(1000, 7)).toBe(1);
    expect(M.nusselt(1708, 7)).toBe(1);
    // continuous at onset
    expect(M.nusselt(1708.01, 7)).toBeCloseTo(1, 4);
    // Hollands, Raithby & Konicek (1975) at Ra = 1e4 (it exceeds Globe-Dropkin there for Pr 7)
    const hol = 1 + 1.44 * (1 - 1708 / 1e4) + (Math.cbrt(1e4 / 5830) - 1);
    expect(M.nusselt(1e4, 7)).toBeCloseTo(hol, 10);
    // Globe & Dropkin (1959) at Ra = 1e7, Pr 7
    const gd = 0.069 * Math.cbrt(1e7) * Math.pow(7, 0.074);
    expect(M.nusselt(1e7, 7)).toBeCloseTo(gd, 10);
    // never below either correlation
    [2e3, 5e4, 3e5, 1e6, 1e8].forEach((ra) => {
      const h = 1 + 1.44 * (1 - 1708 / ra) + Math.max(0, Math.cbrt(ra / 5830) - 1);
      const g = 0.069 * Math.cbrt(ra) * Math.pow(0.7, 0.074);
      expect(M.nusselt(ra, 0.7)).toBeCloseTo(Math.max(h, g), 10);
    });
  });

  it('closes the power balance P = Nu k A dT / L and walks through the regimes as power rises', () => {
    const seen = [];
    for (let e = -3; e <= 2; e += 0.5) {
      const r = M.convection({ fluid: 'water', powerW: Math.pow(10, e), depthM: 0.01 });
      expect(r.Nu * water.k * 0.01 * r.dT / 0.01).toBeCloseTo(Math.pow(10, e), 6);
      expect(r.Ra).toBeCloseTo(M.rayleigh('water', r.dT, 0.01), 6);
      if (seen[seen.length - 1] !== r.regime) seen.push(r.regime);
    }
    expect(seen).toEqual(['conduction', 'rolls', 'plumes']);
  });

  it('puts the onset power exactly where Ra reaches 1708', () => {
    const r = M.convection({ fluid: 'oil', powerW: 1, depthM: 0.01 });
    const atOnset = M.convection({ fluid: 'oil', powerW: r.onsetW * 0.999, depthM: 0.01 });
    const past = M.convection({ fluid: 'oil', powerW: r.onsetW * 1.01, depthM: 0.01 });
    expect(atOnset.regime).toBe('conduction');
    expect(past.regime).toBe('rolls');
    expect(M.rayleigh('oil', r.onsetW * 0.01 / (0.17 * 0.01), 0.01)).toBeCloseTo(1708, 6);
  });

  it('heated from above stays still: conduction only, dT = P L / (k A), and no flow', () => {
    const r = M.convection({ fluid: 'water', powerW: 1, depthM: 0.01, from: 'above' });
    expect(r.regime).toBe('stable');
    expect(r.Nu).toBe(1);
    expect(r.dT).toBeCloseTo(1 * 0.01 / (water.k * 0.01), 8);
    expect(r.speedMs).toBe(0);
    expect(r.Ra).toBeLessThan(0);
    const below = M.convection({ fluid: 'water', powerW: 1, depthM: 0.01, from: 'below' });
    expect(below.dT).toBeLessThan(r.dT / 2);
    expect(below.speedMs).toBeGreaterThan(0);
  });

  it('flags temperature differences beyond constant-property honesty', () => {
    expect(M.convection({ fluid: 'air', powerW: 100, depthM: 0.01 }).valid).toBe(false);
    expect(M.convection({ fluid: 'water', powerW: 10, depthM: 0.01 }).valid).toBe(true);
  });
});

describe('surfaces: sunlight against infrared', () => {
  it('uses the published emissivities and Kirchhoff band by band', () => {
    const s = Object.fromEntries(M.surfaces.map((x) => [x.id, x]));
    expect(s.black.eps).toBe(0.95);
    expect(s.white.eps).toBe(0.9);
    expect(s.silver.eps).toBe(0.03);
    expect(s.skin.eps).toBe(0.98);
    expect(s.white.aSun).toBeLessThan(0.3);
  });

  it('settles where absorbed sunlight = radiated + convected, and black runs hotter than white', () => {
    const b = M.surfaceSun('black'), w = M.surfaceSun('white');
    [b, w, M.surfaceSun('silver')].forEach((r) => expect(r.absorbedWm2 - r.radiatedAtEqWm2 - r.convectedAtEqWm2).toBeCloseTo(0, 6));
    const K = (c) => c + 273.15;
    const hand = 0.95 * SIGMA * (K(b.eqC) ** 4 - K(30) ** 4) + 10 * (b.eqC - 30);
    expect(hand).toBeCloseTo(0.95 * 800, 6);
    expect(b.eqC - w.eqC).toBeGreaterThan(25);
    // in the infrared the two paints radiate within 6 % of each other
    expect(Math.abs(b.emittedAtWm2 - w.emittedAtWm2) / b.emittedAtWm2).toBeLessThan(0.06);
    expect(b.emittedAtWm2).toBeCloseTo(0.95 * SIGMA * K(40) ** 4, 6);
  });
});

describe('vacuum flask', () => {
  it('splits the heat into four parallel paths with the textbook formulas', () => {
    const F = M.flask;
    const p = M.flaskPaths(90, {});
    const To = p.outerC;
    expect(p.gasW).toBeCloseTo(F.kAir * F.areaM2 / F.gapM * (90 - To), 8);
    expect(p.radW).toBeCloseTo(SIGMA * F.areaM2 * ((363.15) ** 4 - (To + 273.15) ** 4) / (2 / 0.9 - 1), 8);
    // the outer wall's air film carries exactly what crosses the gap
    expect(F.hOut * F.areaOutM2 * (To - 20)).toBeCloseTo(p.gasW + p.radW, 6);
    expect(p.neckW).toBeCloseTo(F.neckG * 70, 10);
    expect(p.topW).toBeCloseTo(F.openG * 70, 10);
    const sealed = M.flaskPaths(90, { vacuum: true, silver: true, stopper: true });
    expect(sealed.gasW).toBe(0);
    expect(sealed.radW).toBeCloseTo(SIGMA * F.areaM2 * ((363.15) ** 4 - (sealed.outerC + 273.15) ** 4) / (2 / 0.03 - 1), 8);
  });

  it('closes the energy ledger and ranks the builds as the physics says', () => {
    const runs = {};
    for (const v of [false, true]) for (const s of [false, true]) for (const c of [false, true]) {
      const r = M.flaskModel({ vacuum: v, silver: s, stopper: c });
      expect(Math.abs(r.residualJ) / r.outJ).toBeLessThan(1e-9);
      runs[(v ? 'v' : '-') + (s ? 's' : '-') + (c ? 'c' : '-')] = r;
    }
    const full = runs.vsc;
    Object.entries(runs).forEach(([k, r]) => { if (k !== 'vsc') expect(full.at6hC, k).toBeGreaterThan(r.at6hC); });
    // vacuum alone leaves radiation as the big leak; silvering alone leaves the gas
    expect(runs['v--'].start.radW).toBeGreaterThan(runs['v--'].start.gasW);
    expect(runs['-s-'].start.gasW).toBeGreaterThan(runs['-s-'].start.radW);
    // a real flask's biggest leak is the neck, as the everyday card says
    const s = full.start;
    expect(s.neckW).toBeGreaterThan(Math.max(s.gasW, s.radW, s.topW));
    expect(full.at6hC).toBeGreaterThan(70);
    expect(runs['---'].at6hC).toBeLessThan(30);
  });
});

describe('heating and cooling curves, four substances', () => {
  it('reproduces heatWaterState exactly for water', () => {
    for (let kJ = 0; kJ <= 3100; kJ += 3.7) {
      const a = M.waterState(kJ), b = M.phaseState('water', kJ * 1000);
      expect(b.temp).toBeCloseTo(a.temp, 9);
      expect(b.frac).toBeCloseTo(a.frac, 9);
    }
  });

  it('uses the published constants (CRC / NIST) for ethanol, wax and lead', () => {
    const s = Object.fromEntries(M.phaseSubstances.map((x) => [x.id, x]));
    expect(s.ethanol.mpC).toBeCloseTo(-114.1, 6);
    expect(s.ethanol.bpC).toBeCloseTo(78.4, 6);
    expect(s.ethanol.lF).toBeCloseTo(4930 / 0.046069, -3);    // 4.93 kJ/mol
    expect(s.ethanol.lV).toBeCloseTo(38560 / 0.046069, -3);   // 38.56 kJ/mol
    expect(s.lead.mpC).toBeCloseTo(327.5, 6);
    expect(s.lead.lF).toBeCloseTo(4770 / 0.2072, -3);         // 4.77 kJ/mol
    expect(s.lead.cS).toBe(129);
    expect(s.wax.mpC).toBe(58);
    expect(s.wax.bpC).toBeNull();
    const st = M.phaseStages('ethanol');
    expect(st.map((p) => p.id)).toEqual(['solid', 'melt', 'liquid', 'boil', 'gas']);
    expect(st[0].J).toBeCloseTo(1600 * (-114.1 + 130), 6);
    expect(st[2].J).toBeCloseTo(2440 * (78.4 + 114.1), 6);
    expect(M.phaseStages('lead').map((p) => p.id)).toEqual(['solid', 'melt', 'liquid']);
  });

  it('turns energy into time with an ideal heater: t = E / P, flat on the plateaus', () => {
    const h = M.phaseHeating('lead', 500, 1);
    const st = M.phaseStages('lead');
    expect(h.stages[1].startS).toBeCloseTo(st[0].J / 500, 9);
    expect(h.stages[1].endS - h.stages[1].startS).toBeCloseTo(23000 / 500, 6);
    expect(h.at((h.stages[1].startS + h.stages[1].endS) / 2).temp).toBeCloseTo(327.5, 9);
    expect(h.at((h.stages[1].startS + h.stages[1].endS) / 2).phase).toBe('melting');
    expect(M.phaseHeating('water', 2000, 1).endS).toBeCloseTo(M.phaseHeating('water', 1000, 1).endS / 2, 6);
  });

  it('cools by Newton’s law, freezes on a plateau and closes the energy balance', () => {
    ['water', 'ethanol', 'wax', 'lead'].forEach((id) => {
      const c = M.phaseCooling(id);
      const s = M.phaseSubstances.find((x) => x.id === id);
      const C = c.massKg * s.cL;
      const tq = c.freezeStartS / 2;
      expect(c.at(tq).temp).toBeCloseTo(c.envC + (c.startC - c.envC) * Math.exp(-c.G * tq / C), 9);
      expect(c.plateauS).toBeCloseTo(c.massKg * s.lF / (c.G * (s.mpC - c.envC)), 6);
      expect(c.at((c.freezeStartS + c.freezeEndS) / 2).temp).toBe(s.mpC);
      const out = integrate((t) => c.G * (c.at(t).temp - c.envC), 0, c.endS);
      expect(out / c.heatOutJ(c.endS)).toBeCloseTo(1, 5);
      const end = c.at(c.endS).temp;
      const hand = c.massKg * (s.cL * (c.startC - s.mpC) + s.lF + s.cS * (s.mpC - end));
      expect(c.heatOutJ(c.endS)).toBeCloseTo(hand, 6);
    });
  });

  it('supercools water: c dK / L freezes at once, the rest on the plateau, energy unchanged', () => {
    const c0 = M.phaseCooling('water'), c5 = M.phaseCooling('water', { supercoolK: 5 });
    expect(c5.frozenAtOnce).toBeCloseTo(4186 * 5 / 334000, 12);
    expect(c5.at(c5.freezeStartS).temp).toBeCloseTo(-5, 9);       // the dip
    expect(c5.at(c5.freezeStartS + 1e-6).temp).toBe(0);            // the jump back
    expect(c5.plateauS).toBeCloseTo((1 - c5.frozenAtOnce) * c0.plateauS, 6);
    const out = integrate((t) => c5.G * (c5.at(t).temp - c5.envC), 0, c5.endS);
    expect(out / c5.heatOutJ(c5.endS)).toBeCloseTo(1, 5);
    // only water supercools here
    expect(M.phaseCooling('ethanol', { supercoolK: 5 }).supercoolK).toBe(0);
  });

  it('counts bonds for any substance, and still defaults to water', () => {
    const wax = M.phaseChangeCount('melt', 0.5, 1, 'wax');
    expect(wax.perMoleKJ).toBeCloseTo(210000 * 0.3527 / 1000, 9);
    expect(wax.total).toBeCloseTo(1 / 0.3527 * NA, -18);
    expect(wax.freed).toBeCloseTo(wax.total / 2, -18);
    const lead = M.phaseChangeCount('melt', 1, 0.05, 'lead');
    expect(lead.kJ).toBeCloseTo(23000 * 0.05 / 1000, 9);
    expect(M.phaseChangeCount('boil', 1, 1).perMoleKJ).toBeCloseTo(2260000 * 0.018015 / 1000, 9);
    expect(M.phaseChangeCount('boil', 1, 1, 'lead').kJ).toBe(0);   // lead does not boil on this chart
  });
});

describe('“Keep it frozen” cooler', () => {
  const sigma = 5.670374419e-8;
  function seriesR(shellK, shellMm, linerK, linerMm, eps) {
    const s0 = 0.1, s1 = s0 + 2 * linerMm / 1000, s2 = s1 + 2 * shellMm / 1000;
    const hRad = 4 * eps * sigma * Math.pow(303.15, 3);
    return 1 / (10 * 6 * s0 * s0) + (linerMm ? (linerMm / 1000) / (linerK * 6 * s0 * s1) : 0) + (shellMm / 1000) / (shellK * 6 * s1 * s2) + 1 / ((8 + hRad) * 6 * s2 * s2);
  }

  it('with no melt yet, the warming time constant is C / (1/R_series + G_seal)', () => {
    const m = M.coolerModel({ shell: 'plywood', liner: 'eps', mm: 20, seal: 'foam', foil: false });
    const R = seriesR(0.12, 6, 0.036, 20, 0.9);
    expect(m.Rsum).toBeCloseTo(R, 10);
    const C = 0.2 * 2090;
    expect(m.tauS).toBeCloseTo(C / (1 / R + 0.02), 8);
    // Newton warming from -18 C towards 30 C, exactly
    const t = m.warmS / 3;
    expect(m.at(t).temp).toBeCloseTo(30 - 48 * Math.exp(-t / m.tauS), 9);
    expect(m.warmS).toBeCloseTo(m.tauS * Math.log(48 / 30), 9);
    // foil lowers the outside emissivity to 0.05
    expect(M.coolerModel({ liner: 'eps', mm: 20, foil: true }).Rsum).toBeCloseTo(seriesR(0.2, 2, 0.036, 20, 0.05), 10);
  });

  it('with melt, the heat that came in equals sensible + latent heat', () => {
    [{}, { liner: 'eps', mm: 25 }, { liner: 'pu', mm: 25, seal: 'gasket', foil: true }, { shell: 'steel', liner: 'cork', mm: 15 }].forEach((d) => {
      const m = M.coolerModel(d);
      const inJ = integrate((t) => m.G * (30 - m.at(t).temp), 0, m.meltS);
      const need = 0.2 * 2090 * 18 + 0.2 * 334000;
      expect(inJ / need, JSON.stringify(d)).toBeCloseTo(1, 6);
      expect(m.meltS - m.warmS).toBeCloseTo(0.2 * 334000 / (m.G * 30), 6);
      expect(m.at(m.meltS + 1).iceFrac).toBe(0);
    });
  });

  it('prices and sizes the design, and the bare box fails the brief', () => {
    const bare = M.coolerModel({});
    expect(bare.cost).toBe(3);
    expect(bare.meltH).toBeLessThan(4);
    expect(bare.meets).toBe(false);
    const m = M.coolerModel({ shell: 'plastic', liner: 'pu', mm: 25, seal: 'gasket', foil: true });
    expect(m.cost).toBeCloseTo(3 + 1.6 * 2.5 + 3 + 1.5, 9);
    expect(m.outerCm).toBeCloseTo(10 + 2 * 2.7, 9);
    // too thick for the 16 cm space
    expect(M.coolerModel({ liner: 'eps', mm: 40 }).meetsSize).toBe(false);
    // several different designs meet the brief: no single dominant answer
    const passing = [{ liner: 'eps', mm: 25, seal: 'foam' }, { liner: 'pu', mm: 20, seal: 'gasket' }, { liner: 'aerogel', mm: 10, seal: 'gasket' }, { liner: 'wool', mm: 25, seal: 'foam' }]
      .filter((d) => M.coolerModel(d).meets);
    expect(passing.length).toBeGreaterThanOrEqual(3);
  });

  it('lists single upgrades best first, each one genuinely longer', () => {
    const base = M.coolerModel({ liner: 'eps', mm: 25 });
    const ups = M.coolerUpgrades({ liner: 'eps', mm: 25 });
    expect(ups.length).toBeGreaterThan(2);
    ups.forEach((u, i) => {
      expect(u.meltH).toBeCloseTo(M.coolerModel(u.design).meltH, 12);
      expect(u.gainH).toBeCloseTo(u.meltH - base.meltH, 12);
      if (i) expect(u.gainH).toBeLessThanOrEqual(ups[i - 1].gainH);
    });
    expect(ups[0].kind).toBe('seal');
  });
});

describe('investigations', () => {
  it('defines four complete investigations whose plans point at real sections', () => {
    const t = (k, fb) => fb;
    const inv = M.investigations(t);
    expect(inv.map((x) => x.id)).toEqual(['massmaterial', 'cosy', 'layers', 'coldtohot']);
    const html = renderTool('heatLab', {});
    inv.forEach((x) => {
      ['title', 'q', 'iv', 'dv', 'cv', 'idea'].forEach((k) => expect(typeof x[k] === 'string' && x[k].length > 10, x.id + '.' + k).toBe(true));
      expect(x.plan.length).toBeGreaterThanOrEqual(3);
      ['claim', 'evidence', 'reasoning'].forEach((k) => expect(x.frames[k]).toMatch(/…|___/));
      x.go.forEach((g) => {
        expect(html, x.id).toContain('id="htsec-' + g.section + '"');
        expect(JSON.parse(JSON.stringify(g.setup))).toEqual(g.setup);   // plain data only
      });
      x.kinds.forEach((k) => expect(Array.isArray(x.cols[k]) && x.cols[k].length > 0, x.id + ' ' + k).toBe(true));
      expect(x.ideas.test('the heat capacity, specific heat, resistance in series, entropy and work')).toBe(true);
    });
    expect(M.cerRubric).toEqual(['claim', 'rows', 'fair', 'idea', 'limit']);
  });
});
