import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';

/**
 * Lane MET: the Metallurgy module's HAZ Explorer, Fe-C explorer, CE -> preheat
 * advisor and Crack Detective. The point is that every number the module shows
 * comes from a model that is pinned here against hand calculations and the
 * physical direction of each effect, and that hostile saved state cannot break it.
 */

beforeEach(() => {
  resetStemLab();
  loadTool(SRC, 'weldLab');
});
const core = () => window.__WeldLabCore;
const KJIN = 1000 / 25.4;
// The tool reads its own slice: toolData.weldLab.
const render = (state) => renderTool('weldLab', { weldLab: Object.assign({ view: 'metallurgy' }, state) });
const stripTags = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

describe('MET: Adams peak-temperature equation', () => {
  it('reproduces a hand calculation for thin plate (2-D)', () => {
    const { met2PeakThin, met2YThin, met2 } = core();
    expect(met2.RHO_C).toBe(0.0044);
    expect(met2.TM).toBe(1510);
    expect(met2.A1).toBe(727);
    // H = 1000 J/mm, t = 10 mm, T0 = 25 °C, Y = 2 mm, by hand:
    // 1/(Tp-25) = 4.13*0.0044*10*2/1000 + 1/1485 = 3.6344e-4 + 6.7340e-4 = 1.036845e-3
    // Tp = 25 + 964.465 = 989.47 °C
    expect(met2PeakThin(2, 1000, 10, 25)).toBeCloseTo(989.47, 1);
    // At the fusion line the peak IS the melting temperature.
    expect(met2PeakThin(0, 1000, 10, 25)).toBeCloseTo(1510, 6);
    // And the inverse lands back on 2 mm.
    expect(met2YThin(989.465, 1000, 10, 25)).toBeCloseTo(2, 2);
  });

  it('reproduces a hand calculation for thick plate (3-D Rosenthal peak)', () => {
    const { met2PeakThick, met2YThick } = core();
    // rf^2 = H / (4.2699*0.0044*(1510-25)) = 1000/27.899 = 35.843 -> rf = 5.987 mm
    // Y = 2 mm -> r = 7.987 mm -> Tp = 25 + 1000/(4.2699*0.0044*63.79) = 25 + 834.4
    expect(met2PeakThick(2, 1000, 25)).toBeCloseTo(859.4, 0);
    expect(met2PeakThick(0, 1000, 25)).toBeCloseTo(1510, 6);
    expect(met2YThick(met2PeakThick(3.5, 1000, 25), 1000, 25)).toBeCloseTo(3.5, 6);
  });

  it('orders the zones outward: coarse grain, fine grain, intercritical, sub-critical', () => {
    const { met2HazModel } = core();
    [0.05, 0.2, 0.4, 0.6].forEach((C) => {
      ['thin', 'thick', 'auto'].forEach((mode) => {
        const m = met2HazModel({ H: 16 * KJIN, t: 6.35, T0: 21, C, mode });
        expect(m.yCg).toBeGreaterThan(0);
        expect(m.yA3).toBeGreaterThan(m.yCg);
        expect(m.yA1).toBeGreaterThan(m.yA3);
        expect(m.ySub).toBeGreaterThan(m.yA1);
        expect(m.hazWidth).toBe(m.yA1);
      });
    });
  });

  it('puts the visible HAZ at a few millimetres for an ordinary weld', () => {
    const { met2HazModel } = core();
    // The Heat Input Calculator default (MIG 22 V / 180 A / 12 ipm = 15.8 kJ/in)
    // on 1/4 in plate: a few mm, inside the 1/16-1/4 in range the copy states.
    const m = met2HazModel({ H: 15.84 * KJIN, t: 6.35, T0: 21, C: 0.2, mode: 'auto' });
    expect(m.hazWidth).toBeGreaterThan(25.4 / 16);
    expect(m.hazWidth).toBeLessThan(25.4 / 4);
  });
});

describe('MET: zone widths respond to heat input and thickness', () => {
  const widths = (m) => [m.yCg, m.yA3 - m.yCg, m.yA1 - m.yA3, m.ySub - m.yA1, m.hazWidth];

  it('grows every zone with heat input, in every model', () => {
    const { met2HazModel } = core();
    ['thin', 'thick', 'auto'].forEach((mode) => {
      let prev = null;
      for (let kj = 5; kj <= 100; kj += 5) {
        const w = widths(met2HazModel({ H: kj * KJIN, t: 9.5, T0: 21, C: 0.2, mode }));
        if (prev) w.forEach((v, i) => expect(v, mode + ' zone ' + i + ' at ' + kj).toBeGreaterThan(prev[i]));
        prev = w;
      }
    });
  });

  it('shrinks every zone with thickness in the thin-plate form, exactly as H/t', () => {
    const { met2HazModel } = core();
    let prev = null;
    for (let t = 3; t <= 50; t += 1) {
      const w = widths(met2HazModel({ H: 1000, t, T0: 21, C: 0.2, mode: 'thin' }));
      if (prev) w.forEach((v, i) => expect(v, 'zone ' + i + ' at t=' + t).toBeLessThan(prev[i]));
      prev = w;
    }
    // Doubling H and t together leaves the thin-plate zones unchanged; doubling H alone doubles them.
    const a = met2HazModel({ H: 800, t: 6, T0: 21, C: 0.2, mode: 'thin' });
    const b = met2HazModel({ H: 1600, t: 12, T0: 21, C: 0.2, mode: 'thin' });
    const c = met2HazModel({ H: 1600, t: 6, T0: 21, C: 0.2, mode: 'thin' });
    expect(b.yA1).toBeCloseTo(a.yA1, 9);
    expect(c.yA1).toBeCloseTo(2 * a.yA1, 9);
  });

  it('never widens the HAZ as the plate gets thicker in auto mode, and ignores thickness in 3-D', () => {
    const { met2HazModel } = core();
    let prev = Infinity;
    for (let t = 3; t <= 60; t += 0.5) {
      const w = met2HazModel({ H: 900, t, T0: 21, C: 0.2, mode: 'auto' }).hazWidth;
      expect(w).toBeLessThanOrEqual(prev + 1e-12);
      prev = w;
    }
    const thick1 = met2HazModel({ H: 900, t: 20, T0: 21, C: 0.2, mode: 'thick' });
    const thick2 = met2HazModel({ H: 900, t: 50, T0: 21, C: 0.2, mode: 'thick' });
    expect(thick2.hazWidth).toBeCloseTo(thick1.hazWidth, 12);
  });

  it('classifies thin vs thick plate by relative thickness', () => {
    const { met2HazModel } = core();
    expect(met2HazModel({ H: 630, t: 3, T0: 21 }).regime).toBe('thin');
    expect(met2HazModel({ H: 630, t: 40, T0: 21 }).regime).toBe('thick');
    expect(met2HazModel({ H: 630, t: 3, T0: 21 }).used).toBe('thin');
    expect(met2HazModel({ H: 630, t: 40, T0: 21 }).used).toBe('thick');
  });
});

describe('MET: preheat (T0) effects', () => {
  it('widens the HAZ and lengthens t8/5 as preheat rises', () => {
    const { met2HazModel, met2T85 } = core();
    let prevW = 0, prevThin = 0, prevThick = 0;
    for (let T0 = 0; T0 <= 300; T0 += 25) {
      const w = met2HazModel({ H: 700, t: 8, T0, C: 0.2, mode: 'auto' }).hazWidth;
      const thin = met2T85(0.7, 6, T0).t85;
      const thick = met2T85(0.7, 40, T0).t85;
      expect(w).toBeGreaterThan(prevW);
      expect(thin).toBeGreaterThan(prevThin);
      expect(thick).toBeGreaterThan(prevThick);
      prevW = w; prevThin = thin; prevThick = thick;
    }
  });

  it('matches the EN 1011-2 t8/5 formulas by hand, and they agree at the transition thickness', () => {
    const { met2T85 } = core();
    // 3-D, Q = 1 kJ/mm, T0 = 20: (6700 - 100)*1*(1/480 - 1/780) = 5.2885 s
    expect(met2T85(1, 60, 20).t85).toBeCloseTo(5.2885, 3);
    expect(met2T85(1, 60, 20).regime).toBe('3d');
    // 2-D, Q = 1, d = 6, T0 = 20: 4214e5/36 * (1/480^2 - 1/780^2) = 31.565 s
    expect(met2T85(1, 6, 20).t85).toBeCloseTo(31.565, 2);
    expect(met2T85(1, 6, 20).regime).toBe('2d');
    const r = met2T85(0.8, 10, 50);
    expect(met2T85(0.8, r.transition, 50).t2).toBeCloseTo(r.t3, 9);
    // Thicker plate cools faster until 3-D takes over, then thickness stops mattering.
    let prev = Infinity;
    for (let d = 3; d <= 60; d++) { const v = met2T85(0.8, d, 50).t85; expect(v).toBeLessThanOrEqual(prev + 1e-12); prev = v; }
  });

  it('shows preheat doing its job on 1-inch plate: a fast quench becomes a slower one', () => {
    const { met2T85, met2T85Band } = core();
    const cold = met2T85(16 * KJIN / 1000, 25.4, 21);
    const hot = met2T85(16 * KJIN / 1000, 25.4, (400 - 32) * 5 / 9);
    expect(met2T85Band(cold.t85)).toBe('fast');
    expect(hot.t85).toBeGreaterThan(cold.t85 * 1.5);
  });
});

describe('MET: iron-carbon diagram', () => {
  it('looks up the phase field at known points', () => {
    const { met2FeCPhase } = core();
    expect(met2FeCPhase(0.4, 850)).toBe('austenite');
    expect(met2FeCPhase(0.4, 750)).toBe('ferrite_austenite');
    expect(met2FeCPhase(0.4, 600)).toBe('ferrite_pearlite');
    expect(met2FeCPhase(1.0, 800)).toBe('austenite_cementite');
    expect(met2FeCPhase(1.0, 700)).toBe('pearlite_cementite');
    expect(met2FeCPhase(0.77, 700)).toBe('pearlite');
    expect(met2FeCPhase(0, 1000)).toBe('austenite');
    expect(met2FeCPhase(0.01, 800)).toBe('ferrite');
    expect(met2FeCPhase(0.4, 1600)).toBe('liquid');
    expect(met2FeCPhase(1.5, 1350)).toBe('mushy');
    expect(met2FeCPhase(0.05, 1450)).toBe('delta');
    expect(met2FeCPhase('x', 800)).toBe('unknown');
  });

  it('uses the textbook key points for A3, A1 and Acm', () => {
    const { met2A3, met2Acm, met2 } = core();
    expect(met2.EUTECTOID_C).toBe(0.77);
    expect(met2A3(0)).toBe(912);
    expect(met2A3(0.77)).toBe(727);
    expect(met2Acm(0.77)).toBe(727);
    expect(met2Acm(2.11)).toBe(1148);
    // A3 falls and Acm rises, without a kink back.
    for (let c = 0.01; c <= 0.77; c += 0.01) expect(met2A3(c)).toBeLessThan(met2A3(c - 0.01));
    for (let c = 0.78; c <= 2.11; c += 0.01) expect(met2Acm(c)).toBeGreaterThan(met2Acm(c - 0.01));
  });

  it('applies the lever rule and the quench rule', () => {
    const { met2PearliteFraction, met2QuenchProduct, met2SlowCoolProduct } = core();
    expect(met2PearliteFraction(0.4)).toBeCloseTo((0.4 - 0.022) / (0.77 - 0.022), 9);
    expect(met2PearliteFraction(0.77)).toBeCloseTo(1, 9);
    expect(met2PearliteFraction(0.95)).toBeCloseTo((6.7 - 0.95) / (6.7 - 0.77), 9);
    expect(met2PearliteFraction(0.01)).toBe(0);
    expect(met2QuenchProduct(0.4, 850)).toBe('martensite');
    expect(met2QuenchProduct(0.4, 750)).toBe('ferrite_martensite');
    expect(met2QuenchProduct(0.4, 600)).toBe('no_change');
    expect(met2QuenchProduct(1.0, 780)).toBe('martensite_cementite');
    expect(met2SlowCoolProduct(0.2)).toBe('ferrite_pearlite');
    expect(met2SlowCoolProduct(0.95)).toBe('pearlite_cementite');
  });
});

describe('MET: CE -> preheat advisor', () => {
  it('rises monotonically with CE and with thickness', () => {
    const { met2PreheatAdvice } = core();
    const thk = [0.125, 0.5, 0.75, 0.76, 1, 1.5, 1.6, 2, 2.5, 2.6, 4];
    for (const lowH of [true, false]) {
      thk.forEach((t) => {
        let prev = -1;
        for (let ce = 0; ce <= 1.2; ce += 0.005) {
          const f = met2PreheatAdvice(ce, t, lowH).minF;
          expect(f, 'CE ' + ce.toFixed(3) + ' t ' + t).toBeGreaterThanOrEqual(prev);
          prev = f;
        }
      });
      for (let ce = 0; ce <= 1.2; ce += 0.05) {
        let prev = -1;
        thk.forEach((t) => {
          const f = met2PreheatAdvice(ce, t, lowH).minF;
          expect(f).toBeGreaterThanOrEqual(prev);
          prev = f;
        });
      }
    }
  });

  it('agrees with ceRisk and with each band\'s own text', () => {
    const { met2PreheatAdvice, ceRisk } = core();
    for (let ce = 0; ce <= 1.2; ce += 0.01) {
      [0.25, 1, 2, 3].forEach((t) => {
        const a = met2PreheatAdvice(ce, t, true);
        expect(a.band).toBe(ceRisk(ce));
        if (a.band === 'VERY HIGH') { expect(a.minF).toBeGreaterThanOrEqual(400); expect(a.minF).toBeLessThanOrEqual(600); }
        if (a.band === 'HIGH') expect(a.minF).toBeGreaterThanOrEqual(300);
        if (a.band !== 'LOW') { expect(a.lowHydrogenRequired).toBe(true); expect(met2PreheatAdvice(ce, t, false).acceptable).toBe(false); }
        expect(met2PreheatAdvice(ce, t, false).minF).toBeGreaterThanOrEqual(a.minF);
      });
    }
    // Boundaries exactly where ceRisk puts them.
    expect(met2PreheatAdvice(0.399, 0.5, true).band).toBe('LOW');
    expect(met2PreheatAdvice(0.40, 0.5, true).band).toBe('MODERATE');
    expect(met2PreheatAdvice(0.55, 0.5, true).band).toBe('MODERATE');
    expect(met2PreheatAdvice(0.551, 0.5, true).band).toBe('HIGH');
    expect(met2PreheatAdvice(0.701, 0.5, true).band).toBe('VERY HIGH');
  });

  it('reproduces the AWS D1.1 prequalified rows for LOW-CE steel', () => {
    const { met2PreheatAdvice } = core();
    // Category B (low-hydrogen): none / 50 / 150 / 225 °F; Category A: none / 150 / 225 / 300 °F.
    expect([0.5, 1, 2, 3].map((t) => met2PreheatAdvice(0.3, t, true).minF)).toEqual([0, 50, 150, 225]);
    expect([0.5, 1, 2, 3].map((t) => met2PreheatAdvice(0.3, t, false).minF)).toEqual([0, 150, 225, 300]);
    expect(met2PreheatAdvice(0.3, 0.5, true).none).toBe(true);
  });

  it('fixes the 4140 contradiction: VERY HIGH band, never the old 300 °F', () => {
    const { met2PreheatAdvice, carbonEquivalentIIW, STEEL_PRESETS } = core();
    const ce = carbonEquivalentIIW(STEEL_PRESETS.find((p) => p.id === '4140').comp);
    [0.25, 0.75, 1, 2, 3].forEach((t) => {
      const a = met2PreheatAdvice(ce, t, true);
      expect(a.band).toBe('VERY HIGH');
      expect(a.minF).toBeGreaterThanOrEqual(400);
    });
    const html = stripTags(render({ met_sect: 'ce' }));
    expect(html).not.toMatch(/use 300°F preheat/);
    expect(html).toMatch(/VERY HIGH\. That band calls for roughly 400-600 °F preheat/);
    expect(html).toContain('the advisor gives ' + met2PreheatAdvice(ce, 1, true).minF + ' °F for a 1-inch section');
  });

  it('treats junk inputs conservatively', () => {
    const { met2PreheatAdvice } = core();
    expect(met2PreheatAdvice(NaN, 1, true).band).toBe('VERY HIGH');
    expect(met2PreheatAdvice('abc', 1, true).band).toBe('VERY HIGH');
    expect(met2PreheatAdvice(0.3, NaN, true).col).toBe(3);
    expect(met2PreheatAdvice(0.3, -2, true).col).toBe(3);
    // Unknown electrode is NOT low-hydrogen.
    expect(met2PreheatAdvice(0.3, 1, 'yes').lowHydrogen).toBe(false);
    expect(met2PreheatAdvice(0.3, 1, undefined).minF).toBe(150);
  });
});

describe('MET: importing the Heat Input Calculator settings', () => {
  it('survives hostile values and always returns a usable net heat input', () => {
    const { met2CoerceHiSettings, ARC_EFFICIENCY } = core();
    const throwing = {};
    Object.defineProperty(throwing, 'hi_V', { get() { throw new Error('boom'); }, enumerable: true });
    const hostile = [
      null, undefined, 'str', 42, [], [1, 2, 3], throwing,
      { hi_V: 'abc', hi_A: {}, hi_TS: null, hi_process: 'constructor' },
      { hi_process: '__proto__' }, { hi_process: 'toString' }, { hi_process: 7 },
      { hi_V: Infinity, hi_A: -1e9, hi_TS: 1e9 }, { hi_V: NaN, hi_A: NaN, hi_TS: NaN },
      { hi_TS: 0 }, { hi_TS: -5 }, { hi_V: [30], hi_A: '200abc' }, JSON.parse('{"__proto__": {"hi_V": 5}, "hi_A": 100}')
    ];
    hostile.forEach((h, i) => {
      const s = met2CoerceHiSettings(h);
      expect(Number.isFinite(s.net), 'case ' + i).toBe(true);
      expect(s.net).toBeGreaterThan(0);
      expect(Object.prototype.hasOwnProperty.call(ARC_EFFICIENCY, s.process), 'case ' + i).toBe(true);
      expect(s.V).toBeGreaterThanOrEqual(10); expect(s.V).toBeLessThanOrEqual(40);
      expect(s.A).toBeGreaterThanOrEqual(50); expect(s.A).toBeLessThanOrEqual(350);
      expect(s.TS).toBeGreaterThanOrEqual(3); expect(s.TS).toBeLessThanOrEqual(30);
    });
  });

  it('uses the calculator\'s own formula for good values', () => {
    const { met2CoerceHiSettings, heatInputNet } = core();
    const s = met2CoerceHiSettings({ hi_V: 25, hi_A: 200, hi_TS: 10, hi_process: 'stick' });
    expect(s.found).toBe(true);
    expect(s.net).toBeCloseTo(heatInputNet(25, 200, 10, 'stick'), 12);
    const def = met2CoerceHiSettings({});
    expect(def.found).toBe(false);
    expect(def.net).toBeCloseTo(heatInputNet(22, 180, 12, 'mig'), 12);
  });

  it('renders the HAZ Explorer from a hostile saved project without throwing', () => {
    const bad = {
      met_sect: 'haz', hi_V: 'x', hi_process: 'constructor', met2_hazH: 'abc', met2_hazTh: -4, met2_hazT0F: 1e9,
      met2_hazC: {}, met2_hazMode: { a: 1 }, met2_hazMat: 5, met2_hazPred: 'NaN', met2_hazProbe: 'far',
      met2_fecC: [], met2_fecT: null, met2_cdPicks: 'zzz', met2_cdIdx: 99, met2_cePred: [1, 2], met2_ceTally: { n: -5, right: 'x' },
      met2_ceFree: 'yes', met2_ceHyd: 7, met2_ceThk: 'thick', met_ce_comp: 'junk'
    };
    ['haz', 'phase', 'ce', 'cracking', 'nonsense'].forEach((sect) => {
      const html = render(Object.assign({}, bad, { met_sect: sect }));
      expect(html.length, sect).toBeGreaterThan(2000);
      expect(html).toContain('Welding Metallurgy');
    });
    const haz = stripTags(render(bad));
    expect(haz).toContain('HAZ Explorer');
    expect(haz).not.toMatch(/NaN/);
    // Element fields that are objects, arrays or runaway strings never reach an input.
    const ce = render({ met_sect: 'ce', met2_ceFree: true, met_ce_comp: { C: { x: 1 }, Mn: [1, 2], Cr: 'abcdefghijklmnopqrstuvwxyz', Mo: 0.2 } });
    expect(ce).not.toContain('[object Object]');
    expect(ce).not.toContain('abcdefghijklmnop');
    expect(ce).toMatch(/id="ce-el-C"[^>]*value="0"/);
    expect(stripTags(ce)).toContain('CE = 0.040');
  });
});

describe('MET: every new section renders', () => {
  it('overview links to the four explorers', () => {
    const html = stripTags(render({ met_sect: 'overview' }));
    expect(html).toContain('Four explorers in this module');
    expect(html).toContain('a tensile test usually breaks out here');
    expect(html).not.toContain('Should be the strongest region');
  });

  it('phase: the Fe-C explorer with its readout, and the corrected definitions', () => {
    const raw = render({ met_sect: 'phase', met2_fecC: 0.4, met2_fecT: 850 });
    const html = stripTags(raw);
    expect(raw).toMatch(/role="img" aria-label="Iron-carbon diagram, steel corner/);
    expect(html).toContain('0.40 % C at 850 °C (1562 °F): 4. Austenite (γ)');
    expect(html).toContain('A3 = 800 °C');
    expect(html).toContain('all becomes martensite');
    expect(html).toContain('about 51 % pearlite');
    expect(html).not.toMatch(/Above ~1340°F/);
    expect(html).not.toMatch(/heats above 1340°F \(full austenite\)/);
    expect(html).toContain('about 1566 °F (852 °C) for 0.20 % carbon steel');
    expect(html).toContain('(thick section, cold base metal, no preheat)');
    // All three preset steels are marked on the diagram.
    ['A36', '4140', '1095'].forEach((s) => expect(raw).toContain('>' + s + '<'));
  });

  it('haz: prediction first, slider locked, model-driven zones and t8/5', () => {
    const raw = render({ met_sect: 'haz' });
    const html = stripTags(raw);
    expect(html).toContain('predict before you touch the heat-input slider');
    expect(raw).toMatch(/id="met2-haz-h"[^>]*disabled=""/);
    expect(html).toContain('Make your prediction above to unlock this slider');
    expect(raw).toMatch(/aria-label="Weld cross-section/);
    expect(raw).toMatch(/aria-label="Peak temperature against distance/);
    expect(html).toContain('Zone widths at these settings');
    expect(html).toContain('Cooling time t8/5');
    expect(html).not.toMatch(/3-5x the weld bead width/);
    const { met2HazModel } = core();
    const m = met2HazModel({ H: 16 * KJIN, t: 6.35, T0: (70 - 32) * 5 / 9, C: 0.2, mode: 'auto' });
    expect(html).toContain('At these settings the model puts it at ' + m.hazWidth.toFixed(1) + ' mm');
    // links out
    ['Underwater', 'Inspection', 'Heat Input Calculator'].forEach((s) => expect(html).toContain(s));
  });

  it('haz: after predicting and moving the slider, the verdict and observation appear', () => {
    const right = stripTags(render({ met_sect: 'haz', met2_hazPred: 2, met2_hazPredH0: 16, met2_hazH: 40 }));
    expect(right).toContain('Your prediction holds');
    expect(right).toMatch(/Observed: at 16 kJ\/in the HAZ reached [\d.]+ mm/);
    const wrong = stripTags(render({ met_sect: 'haz', met2_hazPred: 0, met2_hazPredH0: 16, met2_hazH: 40 }));
    expect(wrong).toContain('Not what the model shows');
    expect(wrong).toContain('Why not A:');
    const waiting = render({ met_sect: 'haz', met2_hazPred: 2, met2_hazPredH0: 16, met2_hazH: 18 });
    expect(stripTags(waiting)).toContain('Locked in: C.');
    expect(waiting).not.toMatch(/id="met2-haz-h"[^>]*disabled=""/);
  });

  it('haz: aluminum and stainless explain why the steel zones do not apply', () => {
    const al = stripTags(render({ met_sect: 'haz', met2_hazMat: 'aluminum' }));
    expect(al).toContain('Why aluminum has no steel-style zones');
    expect(al).not.toContain('Zone widths at these settings');
    const ss = stripTags(render({ met_sect: 'haz', met2_hazMat: 'stainless' }));
    expect(ss).toContain('Why austenitic stainless has no steel-style zones');
  });

  it('ce: the prediction gate, then the result, contributions and advisor', () => {
    const gate = stripTags(render({ met_sect: 'ce' }));
    expect(gate).toContain('predict the band before you calculate');
    expect(gate).not.toContain('Minimum preheat and interpass temperature');
    const free = stripTags(render({ met_sect: 'ce', met2_ceFree: true, met2_ceThk: 1 }));
    expect(free).toContain('CE = 0.772');
    expect(free).toContain('Minimum preheat and interpass temperature: 450 °F (232 °C)');
    expect(free).toContain('carbon 0.400 + manganese/6 0.142');
    expect(free).not.toContain('Common mild steel (A36, A572)');
    // A prediction for THIS composition reveals the result and grades it.
    const sig = ['0.400', '0.850', '0.950', '0.200', '0', '0', '0'].join('|');
    const pred = stripTags(render({ met_sect: 'ce', met2_cePred: { sig, band: 'HIGH' } }));
    expect(pred).toContain('You predicted HIGH; it is VERY HIGH.');
    // ... and a prediction for a different composition does not.
    const stale = stripTags(render({ met_sect: 'ce', met2_cePred: { sig: '0.2|0|0|0|0|0|0', band: 'LOW' } }));
    expect(stale).toContain('predict the band before you calculate');
    const noLowH = stripTags(render({ met_sect: 'ce', met2_ceFree: true, met2_ceHyd: 'std' }));
    expect(noLowH).toContain('Not acceptable: every band above LOW calls for low-hydrogen practice');
  });

  it('cracking: the Crack Detective, unanswered and answered', () => {
    const fresh = stripTags(render({ met_sect: 'cracking' }));
    expect(fresh).toContain('Crack Detective');
    expect(fresh).toContain('Case 1 of 6');
    expect(fresh).toContain('Lamellar tearing');
    expect(fresh).not.toContain('build up filler before final pass');
    const rightPick = stripTags(render({ met_sect: 'cracking', met2_cdPicks: { 0: 1 } }));
    expect(rightPick).toContain('Right: Hot (solidification) cracking');
    expect(rightPick).toContain('Score 1 / 1');
    const wrongPick = stripTags(render({ met_sect: 'cracking', met2_cdIdx: 1, met2_cdPicks: { 1: 2 } }));
    expect(wrongPick).toContain('It is Cold (hydrogen) cracking');
    expect(wrongPick).toContain('Why not B:');
    const all = stripTags(render({ met_sect: 'cracking', met2_cdPicks: { 0: 1, 1: 0, 2: 3, 3: 2, 4: 0, 5: 1 } }));
    expect(all).toContain('All six cases: 6 of 6 on the first try');
  });

  it('aluminum: corrected conductivity and cleaning advice', () => {
    const html = stripTags(render({ met_sect: 'aluminum' }));
    expect(html).not.toMatch(/2\.4× faster than steel/);
    expect(html).toContain('roughly 3-4× faster than mild steel (about 167 vs 50 W/m·K)');
    expect(html).toContain('spreading factor of 2.4');
    expect(html).not.toMatch(/stays clean for ~30-60 sec/);
  });
});

describe('MET: SVG text stays inside its viewBox', () => {
  function svgTexts(raw) {
    const out = [];
    const svgRe = /<svg[^>]*viewBox="0 0 ([\d.]+) ([\d.]+)"[^>]*>([\s\S]*?)<\/svg>/g;
    let m;
    while ((m = svgRe.exec(raw))) {
      const W = Number(m[1]), H = Number(m[2]);
      const tRe = /<text[^>]*\sx="([-\d.]+)"[^>]*\sy="([-\d.]+)"[^>]*>([^<]*)</g;
      let t;
      while ((t = tRe.exec(m[3]))) out.push({ W, H, x: Number(t[1]), y: Number(t[2]), s: t[3] });
    }
    return out;
  }
  it('across heat inputs, thicknesses, carbon and Fe-C points', () => {
    const states = [
      { met_sect: 'haz' },
      { met_sect: 'haz', met2_hazPred: 2, met2_hazH: 100, met2_hazTh: 0.125, met2_hazT0F: 600 },
      { met_sect: 'haz', met2_hazPred: 2, met2_hazH: 5, met2_hazTh: 2, met2_hazC: 0.6 },
      { met_sect: 'haz', met2_hazMode: 'thick', met2_hazTh: 1 },
      { met_sect: 'phase', met2_fecC: 0, met2_fecT: 400 },
      { met_sect: 'phase', met2_fecC: 2.1, met2_fecT: 1600 },
      { met_sect: 'cracking' }, { met_sect: 'cracking', met2_cdIdx: 2 }, { met_sect: 'cracking', met2_cdIdx: 4 }
    ];
    let n = 0;
    states.forEach((st) => {
      svgTexts(render(st)).forEach((t) => {
        n++;
        // anchor inside, with room for a glyph's height above the baseline
        expect(t.x, JSON.stringify(st) + ' "' + t.s + '"').toBeGreaterThanOrEqual(0);
        expect(t.x).toBeLessThanOrEqual(t.W);
        expect(t.y, JSON.stringify(st) + ' "' + t.s + '"').toBeGreaterThanOrEqual(10);
        expect(t.y).toBeLessThanOrEqual(t.H);
        // words belong in the HTML legend: SVG text is numbers, units and symbols
        expect(t.s.length, t.s).toBeLessThanOrEqual(8);
      });
    });
    expect(n).toBeGreaterThan(60);
  });
});

describe('MET: quiz shape and balance', () => {
  it('uses opts/answer/why/whyNot with every slot used and none over 35%', () => {
    const src = readFileSync(resolve(process.cwd(), SRC), 'utf8');
    const mod = src.slice(src.indexOf('      function MetallurgyDeepDive() {'), src.indexOf('      // MODULE 12: CODES AND STANDARDS'));
    const answers = [...mod.matchAll(/opts: \[[^\]]*\],?\s*answer: (\d)/g)].map((m) => Number(m[1]));
    expect(answers.length).toBe(7);
    const counts = [0, 0, 0, 0];
    answers.forEach((a) => counts[a]++);
    counts.forEach((c) => expect(c).toBeGreaterThan(0));
    expect(Math.max(...counts) / answers.length).toBeLessThanOrEqual(0.35);
    expect((mod.match(/whyNot: \[/g) || []).length).toBe(7);
  });
});
