// Unit Converter deep pass (2026-11-03): the conversion core, number display,
// the grade-band practice generator, named misconceptions, the factor-chain
// checker and estimation. Everything here RUNS the code.
// UNITCONVERT_DEEP_SRC points the suite at another copy (e.g. the pre-pass
// original) to confirm each gate fails on the old behaviour.
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.UNITCONVERT_DEEP_SRC || 'stem_lab/stem_tool_unitconvert.js';
const DEG = String.fromCharCode(0xB0);
const SQ = String.fromCharCode(0xB2);
const CU = String.fromCharCode(0xB3);
let C;

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, 'unitConvert');
  C = window.__UnitConvertCore;
});

// Exact definitions, written independently of the tool: international
// yard and pound (1959), US liquid gallon = 231 in³, imperial gallon,
// thermochemical calorie, nautical mile, standard atmosphere.
const IN = 0.0254, FT = 12 * IN, YD = 3 * FT, MI = 5280 * FT;
const LB = 0.45359237 * 1000, OZ = LB / 16;
const GAL = 231 * Math.pow(IN * 10, 3); // in L: (dm)³
const EXACT = {
  length: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: IN, ft: FT, yd: YD, mi: MI },
  weight: { mg: 0.001, g: 1, kg: 1000, t: 1e6, oz: OZ, lb: LB, ton: 2000 * LB },
  speed: { 'm/s': 1, 'km/h': 1000 / 3600, mph: MI / 3600, 'ft/s': FT, knots: 1852 / 3600 },
  volume: { mL: 0.001, L: 1, ['cm' + CU]: 0.001, ['m' + CU]: 1000, 'fl oz': GAL / 128, cup: GAL / 16, pt: GAL / 8, qt: GAL / 4, gal: GAL, 'imp gal': 4.54609 },
  time: { sec: 1, min: 60, hr: 3600, day: 86400, week: 7 * 86400, year: 365 * 86400 },
  area: { ['mm' + SQ]: 1e-6, ['cm' + SQ]: 1e-4, ['m' + SQ]: 1, ha: 1e4, ['km' + SQ]: 1e6, ['in' + SQ]: IN * IN, ['ft' + SQ]: FT * FT, ['yd' + SQ]: YD * YD, acre: 43560 * FT * FT },
  pressure: { Pa: 1, kPa: 1000, bar: 1e5, psi: LB / 1000 * 9.80665 / (IN * IN), atm: 101325 },
  energy: { J: 1, kJ: 1000, cal: 4.184, kcal: 4184, Wh: 3600, kWh: 3.6e6 }
};

describe('conversion core: every factor pinned against exact definitions', () => {
  it('has exactly the expected units in every category', () => {
    for (const cat of Object.keys(EXACT)) {
      expect(Object.keys(C.factors[cat]).sort(), cat).toEqual(Object.keys(EXACT[cat]).sort());
    }
  });

  it('every unit pair in every category converts by the exact ratio', () => {
    let checked = 0;
    for (const cat of Object.keys(EXACT)) {
      const units = Object.keys(EXACT[cat]);
      for (const a of units) {
        for (const b of units) {
          const got = C.convertUnitValue(1, a, b, cat);
          const want = EXACT[cat][a] / EXACT[cat][b];
          expect(Math.abs(got - want) / want, cat + ' ' + a + '->' + b).toBeLessThan(1e-12);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(400);
  });

  it('keeps every temperature pair exact, including -40 and absolute zero', () => {
    const C2F = (c) => c * 9 / 5 + 32;
    for (const c of [-273.15, -40, 0, 37, 100]) {
      expect(C.convertUnitValue(c, DEG + 'C', DEG + 'F', 'temperature')).toBeCloseTo(C2F(c), 10);
      expect(C.convertUnitValue(c, DEG + 'C', 'K', 'temperature')).toBeCloseTo(c + 273.15, 10);
      expect(C.convertUnitValue(C2F(c), DEG + 'F', DEG + 'C', 'temperature')).toBeCloseTo(c, 10);
      expect(C.convertUnitValue(c + 273.15, 'K', DEG + 'F', 'temperature')).toBeCloseTo(C2F(c), 9);
    }
  });

  it('separates the US short ton from the metric tonne', () => {
    expect(C.convertUnitValue(1, 'ton', 'kg', 'weight')).toBeCloseTo(907.18474, 9);
    expect(C.convertUnitValue(1, 't', 'kg', 'weight')).toBe(1000);
    expect(C.convertUnitValue(1, 'imp gal', 'gal', 'volume')).toBeCloseTo(1.200950, 6);
  });
});

describe('plain number display', () => {
  it('never uses e-notation and groups thousands', () => {
    const f = C.formatUnitNumber;
    expect(f(1609.344, 2)).toBe('1,600');
    expect(f(1000, 3)).toBe('1,000');
    expect(f(1000, 'auto')).toBe('1,000');
    expect(f(0.0005, 'auto')).toBe('0.0005');
    expect(f(0.000001, 'auto')).toBe('0.000001');
    expect(f(12345.678, 4)).toBe('12,350');
    expect(f(0.1 + 0.2, 'auto')).toBe('0.3');
    expect(f(-40, 'auto')).toBe('-40');
    expect(f(9.996, 3)).toBe('10.0');
    for (const v of [1e-7, 6.2137e-7, 1e15, 1e22, 1609.344, 1e6, 0.001, 123456789]) {
      for (const s of ['auto', 2, 3, 4, 5, 6]) expect(f(v, s), v + ' @ ' + s).not.toMatch(/e[+-]/);
    }
    expect(f(6.2137e-7, 'auto')).toBe('6.2137 × 10⁻⁷');
  });

  it('accepts typed thousands separators but rejects other commas', () => {
    expect(C.parseNumericDraft('1,250.5')).toMatchObject({ valid: true, value: 1250.5 });
    expect(C.parseNumericDraft('1,5').valid).toBe(false);
    expect(C.evaluateNumericAnswer('5,280', 5280, 0.01).correct).toBe(true);
  });
});

describe('quantities that cannot be negative', () => {
  it('rejects negative length, mass, volume, time, area, speed, pressure and energy, but not temperature', () => {
    for (const cat of ['length', 'weight', 'volume', 'time', 'area', 'speed', 'pressure', 'energy']) {
      const unit = Object.keys(C.factors[cat])[0];
      expect(C.validateQuantityValue(-5, cat, unit), cat).toMatchObject({ valid: false, code: 'negative' });
      expect(C.validateQuantityValue(0, cat, unit).valid, cat).toBe(true);
    }
    expect(C.validateQuantityValue(-40, 'temperature', DEG + 'C').valid).toBe(true);
  });

  it('shows the negative-value error instead of "-5000 ant lengths" and full bars', () => {
    const html = renderTool('unitConvert', { unitConvert: { tab: 'convert', category: 'length', value: -5, fromUnit: 'm', toUnit: 'cm' } });
    expect(html).toContain('A length cannot be negative');
    expect(html).toContain('role="alert"');
    expect(html).not.toContain('ant lengths');
    expect(html).not.toContain('data-equal-quantity-bar');
  });

  it('refuses an AI word problem with a negative length', () => {
    const raw = ['CONTEXT: A team measures a board.', 'INPUT_VALUE: -5', 'FROM_UNIT: m', 'TO_UNIT: cm', 'ANSWER_VALUE: -500', 'ANSWER_UNIT: cm'].join('\n');
    expect(C.parseWordProblemResponse(raw, 'length', ['m', 'cm'])).toBeNull();
  });
});

describe('reversed-ratio diagnosis uses a relative window', () => {
  it('does not call 0.01 a reversed ratio for 1 hr -> 3,600 s (the flip is 0.000278)', () => {
    expect(C.diagnoseNumericAnswer(0.01, 3600, 'sec', 0.01)).not.toContain('reversed');
    expect(C.diagnoseNumericAnswer(1 / 3600, 3600, 'sec', 0.01)).toContain('reversed');
    expect(C.diagnosePracticeAnswer(0.01, 3600, 'sec', 1)).not.toContain('reversed');
  });
});

describe('offline word problems vary', () => {
  it('keeps the classic first problem, then never repeats across twelve requests', () => {
    expect(C.makeOfflineWordProblem('length', 'm', 'cm', 0)).toMatchObject({ inputValue: 3, fromUnit: 'm', toUnit: 'cm' });
    const seen = new Set();
    for (let s = 0; s < 12; s++) {
      const p = C.makeOfflineWordProblem('length', 'm', 'cm', s);
      expect(p.answer).toBeCloseTo(C.convertUnitValue(p.inputValue, p.fromUnit, p.toUnit, 'length'), 9);
      seen.add(C.wordProblemSignature(p));
    }
    expect(seen.size).toBe(12);
  });

  it('keeps temperature problems physical', () => {
    for (let s = 0; s < 30; s++) {
      const p = C.makeOfflineWordProblem('temperature', DEG + 'F', 'K', s);
      expect(Number.isFinite(p.answer), 'seq ' + s).toBe(true);
    }
  });
});

describe('grade-band practice generator', () => {
  const BANDS = { b45: ['mixedToSmall', 'bigToSmall', 'smallToBig', 'metricDecimal'], b67: ['unitRate', 'rateConvert', 'givenFactor', 'prefix', 'temperature'], b8: ['chainRate', 'area', 'volume', 'density', 'temperature', 'usImperial', 'prefix'] };

  it('maps host grade bands onto practice levels', () => {
    expect(C.practiceBandFor('k2')).toBe('b45');
    expect(C.practiceBandFor('g35')).toBe('b45');
    expect(C.practiceBandFor('g68')).toBe('b67');
    expect(C.practiceBandFor('g912')).toBe('b8');
    expect(C.practiceBandFor(undefined)).toBe('b67');
  });

  it('every within-system pair matches the conversion core', () => {
    for (const p of C.withinSystemPairs.concat(C.metricPairs)) {
      expect(C.convertUnitValue(1, p.big, p.small, p.cat), p.big + '->' + p.small).toBeCloseTo(p.ratio, 9);
    }
  });

  it('produces every kind for its band, never runs dry, and grades its own answer correct', () => {
    for (const band of Object.keys(BANDS)) {
      const kinds = new Set();
      const ids = new Set();
      for (let seed = 1; seed <= 600; seed++) {
        const item = C.makePracticeItem(band, seed);
        kinds.add(item.kind);
        ids.add(item.id);
        expect(Number.isFinite(item.a), item.id).toBe(true);
        expect(item.steps.length, item.id).toBeGreaterThan(0);
        expect(C.diagnosePracticeItem(item, String(item.a)).correct, item.id).toBe(true);
      }
      expect([...kinds].sort()).toEqual(BANDS[band].slice().sort());
      expect(ids.size, band + ' variety').toBeGreaterThan(250);
    }
  });

  it('agrees with the conversion core wherever both can answer', () => {
    for (const band of Object.keys(BANDS)) {
      for (let seed = 1; seed <= 600; seed++) {
        const it2 = C.makePracticeItem(band, seed);
        if (it2.kind === 'mixedToSmall' || it2.kind === 'givenFactor' || !it2.cat) continue;
        const exact = C.convertUnitValue(it2.inputValue, it2.fromUnit, it2.toUnit, it2.cat);
        expect(Math.abs(exact - it2.a), it2.id).toBeLessThanOrEqual(Math.max(1e-9, Math.abs(it2.a) * 1e-9));
      }
    }
  });

  it('builds 4.MD.1 mixed measures: 5 ft 3 in is 63 in', () => {
    let item = null;
    for (let s = 1; s < 5000 && !item; s++) { const x = C.makePracticeItem('b45', s, 'mixedToSmall'); if (x.params.big === 'ft' && x.params.small === 'in') item = x; }
    expect(item.a).toBe(item.params.n * 12 + item.params.s);
  });
});

describe('named misconceptions', () => {
  function find(band, kind, pred) {
    for (let s = 1; s < 20000; s++) { const x = C.makePracticeItem(band, s, kind); if (pred(x)) return x; }
    throw new Error('no item');
  }
  it('multiplying when you should divide', () => {
    const item = find('b45', 'smallToBig', (x) => x.params.from === 'in');
    expect(C.diagnosePracticeItem(item, String(item.inputValue * 12)).misconception).toBe('inverse');
  });
  it('using the linear factor for area or volume', () => {
    const area = find('b8', 'area', (x) => x.fromUnit === 'm' + SQ && x.toUnit === 'cm' + SQ);
    expect(C.diagnosePracticeItem(area, String(area.inputValue * 100)).misconception).toBe('linearForArea');
    const vol = find('b8', 'volume', (x) => x.fromUnit === 'm' + CU);
    expect(C.diagnosePracticeItem(vol, String(vol.inputValue * 100)).misconception).toBe('linearForVolume');
    expect(C.diagnosePracticeItem(vol, String(vol.inputValue * 10000)).misconception).toBe('linearForVolume');
  });
  it('the order of operations in temperature conversion', () => {
    const fc = find('b67', 'temperature', (x) => x.fromUnit === DEG + 'F' && x.inputValue === 212);
    expect(fc.a).toBe(100);
    expect(C.diagnosePracticeItem(fc, String(212 * 5 / 9 - 32)).misconception).toBe('tempOrder');
    expect(C.diagnosePracticeItem(fc, '180').misconception).toBe('tempNoScale');
    const cf = find('b67', 'temperature', (x) => x.fromUnit === DEG + 'C' && x.inputValue === 100);
    expect(C.diagnosePracticeItem(cf, '180').misconception).toBe('tempNoOffset');
    expect(C.diagnosePracticeItem(cf, String((100 + 32) * 9 / 5)).misconception).toBe('tempOrder');
  });
  it('US vs imperial gallons', () => {
    const item = find('b8', 'usImperial', (x) => x.params.mode === 'impToL');
    expect(C.diagnosePracticeItem(item, String(item.params.n * 3.785411784)).misconception).toBe('usImperial');
  });
  it('a slipped prefix power (and not for a tiny trap swallowing a big answer)', () => {
    const item = find('b67', 'prefix', (x) => x.fromUnit === 'km' && x.toUnit === 'm');
    expect(C.diagnosePracticeItem(item, String(item.a * 10)).misconception).toBe('prefixSlip');
    expect(C.diagnosePracticeItem(item, String(item.a / 1000)).misconception).toBe('prefixSlip');
    expect(C.diagnosePracticeItem(item, String(item.inputValue / 1000)).misconception).toBe('inverse');
  });
  it('a chain that converts only one part of km/h', () => {
    const item = find('b8', 'chainRate', (x) => x.fromUnit === 'km/h');
    expect(C.diagnosePracticeItem(item, String(item.inputValue * 1000)).misconception).toBe('chainOneStep');
    expect(C.diagnosePracticeItem(item, String(item.inputValue * 3.6)).misconception).toBe('inverse');
  });
  it('mixed measures: left out the extra units, read as a decimal, counted in tens', () => {
    const item = find('b45', 'mixedToSmall', (x) => x.params.big === 'ft' && x.params.s < 10 && x.params.s > 0);
    const { n, s } = item.params;
    expect(C.diagnosePracticeItem(item, String(n * 12)).misconception).toBe('mixedIgnoredSmall');
    expect(C.diagnosePracticeItem(item, String((n + s / 10) * 12)).misconception).toBe('mixedDecimal');
    expect(C.diagnosePracticeItem(item, String(n * 10 + s)).misconception).toBe('baseTenHabit');
  });
  it('an unrecognised wrong answer is "generic", and garbage is invalid', () => {
    const item = C.makePracticeItem('b45', 3, 'bigToSmall');
    expect(C.diagnosePracticeItem(item, String(item.a + 1)).misconception).toBe('generic');
    expect(C.diagnosePracticeItem(item, 'abc').valid).toBe(false);
  });
});

describe('factor-chain checker', () => {
  const step = (topN, topU, botN, botU, pow) => ({ topN: String(topN), topU, botN: String(botN), botU, pow: pow || 1 });
  it('accepts a correct two-step km/h -> m/s chain', () => {
    const r = C.checkFactorChain('km/h', 'm/s', [step(1000, 'm', 1, 'km'), step(1, 'h', 3600, 's')]);
    expect(r.ok).toBe(true);
    expect(r.factor).toBeCloseTo(1 / 3.6, 12);
  });
  it('names an upside-down factor', () => {
    expect(C.checkFactorChain('ft', 'in', [step(1, 'ft', 12, 'in')]).code).toBe('upsideDown');
  });
  it('names a false equality', () => {
    expect(C.checkFactorChain('ft', 'in', [step(10, 'in', 1, 'ft')]).code).toBe('falseEquality');
  });
  it('names the linear-factor-for-area mistake (needs a square)', () => {
    expect(C.checkFactorChain('m' + SQ, 'cm' + SQ, [step(100, 'cm', 1, 'm', 1)]).code).toBe('needPower');
    expect(C.checkFactorChain('m' + SQ, 'cm' + SQ, [step(100, 'cm', 1, 'm', 2)]).ok).toBe(true);
  });
  it('names units left over when only one part of a compound unit changed', () => {
    expect(C.checkFactorChain('km/h', 'm/s', [step(1000, 'm', 1, 'km')]).code).toBe('leftover');
  });
  it('suggests a working chain for every chain-able pair, matching the core', () => {
    const pairs = [['km/h', 'm/s'], ['mph', 'ft/s'], ['g/cm' + CU, 'kg/m' + CU], ['ft' + CU, 'in' + CU], ['acre', 'm' + SQ], ['m' + CU, 'L'], ['knots', 'km/h'], ['gal', 'L'], ['cm' + CU, 'mL']];
    for (const cat of Object.keys(EXACT)) {
      for (const a of Object.keys(EXACT[cat])) for (const b of Object.keys(EXACT[cat])) if (a !== b) pairs.push([a, b, cat]);
    }
    for (const [a, b, cat] of pairs) {
      const s = C.suggestFactorChain(a, b);
      const r = C.checkFactorChain(a, b, s);
      expect(r.ok, a + '->' + b + ' ' + JSON.stringify(r)).toBe(true);
      if (cat) expect(Math.abs(r.exactFactor - C.convertUnitValue(1, a, b, cat)) / r.exactFactor, a + '->' + b).toBeLessThan(1e-9);
    }
  });
});

describe('estimation and unit-size models', () => {
  it('offers three choices ten times apart with the nearest round value correct', () => {
    for (let s = 1; s < 300; s++) {
      const e = C.makeEstimateItem(['b45', 'b67', 'b8'][s % 3], s);
      expect(e.options).toHaveLength(3);
      expect(e.options).toContain(e.correct);
      const sorted = e.options.slice().sort((x, y) => x - y);
      expect(sorted[1] / sorted[0]).toBeCloseTo(10, 6);
      if (e.type === 'convert') {
        const logErr = (x) => Math.abs(Math.log10(x) - Math.log10(e.exact));
        expect(e.options.every((o) => logErr(e.correct) <= logErr(o) + 1e-12), e.id).toBe(true);
      }
    }
  });
  it('shows scale: 1 ft holds 12 inch ticks; a 1 km bar is ticked by hundreds of m', () => {
    expect(C.unitSizeComparison('length', 'ft', 'in')).toMatchObject({ big: 'ft', small: 'in' });
    expect(C.unitSizeComparison('length', 'ft', 'in').ratio).toBeCloseTo(12, 9);
    expect(C.tickPlan(12)).toMatchObject({ every: 1, ticks: 12 });
    expect(C.tickPlan(1000)).toMatchObject({ every: 100, ticks: 10 });
    expect(C.tickPlan(0)).toBeNull();
  });
});
