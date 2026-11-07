// Unit Converter stage B (2026-11-03): the math of the new engines, run
// directly. Locale number marks and parsing, significant figures, scientific
// notation, the prefix ladder, time and money, moles and density chains.
// UNITCONVERT_DEEP_SRC points the suite at another copy (e.g. the stage-A
// file) to confirm each gate fails on the old behaviour.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.UNITCONVERT_DEEP_SRC || 'stem_lab/stem_tool_unitconvert.js';
let C;
beforeEach(() => {
  resetStemLab();
  loadTool(FILE, 'unitConvert');
  C = window.__UnitConvertCore;
  C.setNumberLocale('en');
});
afterEach(() => { if (C && C.setNumberLocale) C.setNumberLocale('en'); });

function find(family, band, mode, pred, limit = 6000) {
  for (let s = 1; s < limit; s++) {
    const x = C.makeExtraItem(family, band, s, mode);
    if (pred(x)) return Object.assign(x, { seed: s });
  }
  throw new Error('no item for ' + family + '/' + mode);
}
const diag = (item, raw) => C.diagnosePracticeItem(item, raw);

describe('number locale', () => {
  it('groups and marks decimals in the student language, with English as the fallback', () => {
    C.setNumberLocale('German');
    expect(C.formatUnitNumber(1234.5, 'auto')).toBe('1.234,5');
    expect(C.formatUnitNumber(0.0005, 'auto')).toBe('0,0005');
    C.setNumberLocale('Spanish (Castilian)');
    expect(C.formatUnitNumber(1234.5, 'auto')).toBe('1.234,5');
    C.setNumberLocale('es');
    expect(C.formatUnitNumber(12345.25, 'auto')).toBe('12.345,25');
    expect(C.formatUnitNumber(1234567, 'auto')).toBe('1.234.567');
    C.setNumberLocale('English');
    expect(C.formatUnitNumber(1234.5, 'auto')).toBe('1,234.5');
    expect(C.resolveNumberLocale(['Klingon', null, ''])).toBe('en');
    expect(C.resolveNumberLocale([undefined, 'French'])).toBe('fr');
  });

  it('falls back to English marks when Intl is missing', () => {
    const saved = Intl.NumberFormat;
    try {
      Intl.NumberFormat = undefined;
      C.setNumberLocale('de');
      expect(C.formatUnitNumber(1234.5, 'auto')).toBe('1,234.5');
    } finally {
      Intl.NumberFormat = saved;
      C.setNumberLocale('en');
    }
  });

  it('reads the decimal comma in comma locales and keeps English input strict', () => {
    C.setNumberLocale('de');
    expect(C.parseNumericDraft('2,5')).toMatchObject({ valid: true, value: 2.5 });
    expect(C.parseNumericDraft('1.234,5')).toMatchObject({ valid: true, value: 1234.5 });
    expect(C.parseNumericDraft('1 234,5')).toMatchObject({ valid: true, value: 1234.5 });
    expect(C.parseNumericDraft('1.234.567')).toMatchObject({ valid: true, value: 1234567 });
    // A lone point stays a decimal point, so machine-written values keep their meaning.
    expect(C.parseNumericDraft('2.5')).toMatchObject({ valid: true, value: 2.5 });
    expect(C.evaluateNumericAnswer('2,54', 2.54, 1e-9).correct).toBe(true);
    expect(C.parseNumericDraft('1,2,3').valid).toBe(false);
    C.setNumberLocale('en');
    expect(C.parseNumericDraft('2,5').valid).toBe(false);
    expect(C.parseNumericDraft('1,250.5')).toMatchObject({ valid: true, value: 1250.5 });
    expect(C.evaluateNumericAnswer('2,54', 2.54, 1e-9).valid).toBe(false);
  });

  it('accepts scientific notation typed several ways, and waits for an unfinished exponent', () => {
    for (const s of ['6.02 × 10^23', '6.02x10^23', '6.02*10^23', '6.02e23', '6.02·10²³', '6.02 × 10²³']) {
      expect(C.parseNumericDraft(s).value, s).toBeCloseTo(6.02e23, -18);
    }
    expect(C.parseNumericDraft('4.5 × 10⁻⁵').value).toBeCloseTo(4.5e-5, 15);
    expect(C.parseNumericDraft('-3.1x10^-2').value).toBeCloseTo(-0.031, 12);
    expect(C.parseNumericDraft('2 × 10^')).toMatchObject({ valid: false, complete: false });
    expect(C.parseNumericDraft('2e')).toMatchObject({ valid: false, complete: false });
    C.setNumberLocale('de');
    expect(C.parseNumericDraft('6,02 × 10^23').value).toBeCloseTo(6.02e23, -18);
    expect(C.normalizeNumberText('4,5e-3')).toMatchObject({ state: 'ok', sci: true, mantissa: '4.5', exponent: -3 });
  });
});

describe('significant figures and scientific notation helpers', () => {
  it('counts significant figures, flagging ambiguous trailing zeros', () => {
    expect(C.countSigFigs('0.01250')).toMatchObject({ count: 4, ambiguous: false });
    expect(C.countSigFigs('1500')).toMatchObject({ count: 2, maxCount: 4, ambiguous: true });
    expect(C.countSigFigs('1500.')).toMatchObject({ count: 4, ambiguous: false });
    expect(C.countSigFigs('1.500e3')).toMatchObject({ count: 4 });
    expect(C.countSigFigs('-0.0040')).toMatchObject({ count: 2 });
  });
  it('writes n significant figures unambiguously and rounds or cuts on request', () => {
    expect(C.sigText(0.0125, 4)).toBe('0.01250');
    expect(C.sigText(1500, 4)).toBe('1.500 × 10³');
    expect(C.sigText(19.725, 3)).toBe('19.7');
    expect(C.sigText(480, 3)).toBe('4.80 × 10²');
    expect(C.roundSig(19.05, 3)).toBe(19.1);
    expect(C.truncSig(19.05, 3)).toBe(19);
    expect(C.sciText(4.5e-5, 2)).toBe('4.5 × 10⁻⁵');
    C.setNumberLocale('de');
    expect(C.sigText(0.0125, 4)).toBe('0,01250');
  });
});

describe('every generated item grades its own answer right and names each trap', () => {
  const families = { ladder: [['b45', null], ['b67', null], ['b8', null]], everyday: [['b35', 'time'], ['b35', 'elapsed'], ['b35', 'money']], chem: [['chem', 'sigfigs'], ['chem', 'sci'], ['chem', 'mole'], ['chem', 'density']] };
  for (const fam of Object.keys(families)) {
    for (const [band, mode] of families[fam]) {
      it(fam + ' / ' + (mode || band), () => {
        const problems = [];
        for (let s = 1; s <= 300; s++) {
          const it2 = C.makeExtraItem(fam, band, s, mode);
          if (!Number.isFinite(it2.a) || !it2.id || !Array.isArray(it2.steps) || !it2.steps.length) problems.push(['shape', s]);
          const time = it2.answerType === 'hm' || it2.answerType === 'clock';
          const right = time ? { h: String(it2.ah), m: String(it2.am) } : it2.grade === 'sigfigs' ? C.sigText(it2.a, it2.sf) : it2.grade === 'sciForm' ? Number(it2.a).toExponential(it2.sf - 1) : String(it2.a);
          if (!diag(it2, right).correct) problems.push(['right answer marked wrong', s, it2.q, JSON.stringify(right)]);
          for (const tr of it2.traps) {
            const raw = time ? { h: String(tr.h), m: String(tr.m) } : it2.grade === 'sciForm' ? Number(tr.value).toExponential(it2.sf - 1) : it2.grade === 'sigfigs' ? Number(tr.value).toPrecision(it2.sf) : String(tr.value);
            const r = diag(it2, raw);
            if (r.correct || r.misconception !== tr.id) problems.push(['trap', s, tr.id, r.misconception, it2.q]);
          }
        }
        expect(problems.slice(0, 5)).toEqual([]);
      });
    }
  }
});

describe('metric prefix ladder', () => {
  it('adds micro and mega only from grade 8', () => {
    expect(C.ladderRungs('b45').map((r) => r.id)).toEqual(['kilo', 'hecto', 'deca', 'base', 'deci', 'centi', 'milli']);
    expect(C.ladderRungs('b8').map((r) => r.id)).toEqual(['mega', 'kilo', 'hecto', 'deca', 'base', 'deci', 'centi', 'milli', 'micro']);
    for (let s = 1; s < 300; s++) {
      const x = C.makeExtraItem('ladder', 'b45', s);
      expect(/[µM]/.test(x.fromUnit + x.toUnit), x.q).toBe(false);
      expect(x.params.places).toBeLessThanOrEqual(3);
    }
  });
  it('names the decimal point moved the wrong way, a miscounted place, and rungs counted as powers', () => {
    const down = find('ladder', 'b67', null, (x) => x.params.fromRung === 'kilo' && x.params.toRung === 'base');
    expect(down.a).toBeCloseTo(down.inputValue * 1000, 9);
    expect(diag(down, String(down.inputValue / 1000)).misconception).toBe('ladderWrongWay');
    expect(diag(down, String(down.inputValue * 100)).misconception).toBe('ladderCount');
    const wide = find('ladder', 'b8', null, (x) => x.params.fromRung === 'mega' && x.params.toRung === 'kilo');
    expect(wide.a).toBeCloseTo(wide.inputValue * 1000, 6);
    expect(diag(wide, String(wide.inputValue * 10)).misconception).toBe('ladderRungsNotPowers');
  });
  it('shifts the decimal point exactly', () => {
    expect(C.shiftDecimal(3.4, 3)).toBe(3400);
    expect(C.shiftDecimal(0.07, 2)).toBe(7);
    expect(C.shiftDecimal(3.4, -3)).toBe(0.0034);
  });
});

describe('time and money (grades 3-5)', () => {
  it('minutes to hours: 100-minute hour, decimal hours and regrouping are told apart', () => {
    const x = find('everyday', 'b35', 'time', (i) => i.kind === 'minToHours' && i.a === 150);
    expect(diag(x, { h: '2', m: '30' }).correct).toBe(true);
    expect(diag(x, { h: '1', m: '50' }).misconception).toBe('hundredMinutes');
    expect(diag(x, { h: '2', m: '50' }).misconception).toBe('decimalHours');
    expect(diag(x, { h: '0', m: '150' }).misconception).toBe('regroupMinutes');
    expect(diag(x, { h: '', m: '' }).valid).toBe(false);
    expect(diag(x, { h: '2.5', m: '' }).valid).toBe(false);
  });
  it('hours and minutes to minutes names the 100-minute hour', () => {
    const x = find('everyday', 'b35', 'time', (i) => i.kind === 'hoursToMin');
    expect(diag(x, String(x.params.h * 100 + x.params.m)).misconception).toBe('hundredMinutes');
  });
  it('elapsed time: number-line jumps add up, and subtracting clock readings as decimals is named', () => {
    expect(C.elapsedJumps(9 * 60 + 45, 11 * 60 + 20).map((j) => j.d)).toEqual([15, 60, 20]);
    expect(C.elapsedJumps(13 * 60 + 10, 13 * 60 + 50).map((j) => j.d)).toEqual([40]);
    for (let s = 1; s < 300; s++) {
      const x = C.makeExtraItem('everyday', 'b35', s, 'elapsed');
      expect(x.jumps.reduce((sum, j) => sum + j.d, 0), x.q).toBe(x.kind === 'elapsed' ? x.a : x.a - x.params.start);
    }
    const e = find('everyday', 'b35', 'elapsed', (i) => i.kind === 'elapsed' && i.params.start === 9 * 60 + 45 && i.params.end === 11 * 60 + 20, 20000);
    expect(diag(e, { h: '1', m: '35' }).correct).toBe(true);
    expect(diag(e, { h: '1', m: '75' }).misconception).toBe('hundredMinutes');
    expect(diag(e, { h: '2', m: '25' }).misconception).toBe('subtractedBackwards');
  });
  it('an end time is read on a 12-hour or 24-hour clock', () => {
    const x = find('everyday', 'b35', 'elapsed', (i) => i.kind === 'elapsedEnd' && i.ah >= 13);
    expect(diag(x, { h: String(x.ah), m: String(x.am) }).correct).toBe(true);
    expect(diag(x, { h: String(x.ah - 12), m: String(x.am) }).correct).toBe(true);
  });
  it('money: the dropped zero and the one-place decimal slip are named, exactly', () => {
    const x = find('everyday', 'b35', 'money', (i) => i.kind === 'dollarsToCents' && i.a === 305, 40000);
    expect(diag(x, '305').correct).toBe(true);
    expect(diag(x, '35').misconception).toBe('droppedZero');
    expect(diag(x, '30.5').misconception).toBe('centsTenths');
    const y = find('everyday', 'b35', 'money', (i) => i.kind === 'centsToDollars');
    expect(diag(y, '$' + y.a.toFixed(2)).correct).toBe(true);
    expect(diag(y, String(y.params.c / 10)).misconception).toBe('centsTenths');
  });
});

describe('chemistry: significant figures', () => {
  it('a prefix change keeps the trailing zero; each wrong count has its own name', () => {
    const x = find('chem', 'chem', 'sigfigs', (i) => i.params.mode === 'prefix' && i.params.given === '12.50' && i.params.from === 'g' && i.params.to === 'kg', 200000);
    expect(x.sf).toBe(4);
    expect(diag(x, '0.01250').correct).toBe(true);
    expect(diag(x, '1.250 × 10^-2').correct).toBe(true);
    expect(diag(x, '0.0125').misconception).toBe('sigTooFew');
    expect(diag(x, '0.012500').misconception).toBe('sigTooMany');
    expect(diag(x, '0.01').misconception).toBe('sigExactFactor');
    expect(diag(x, '12500').correct).toBe(false);
  });
  it('a product keeps the smaller count; calculator digits and cutting off are named', () => {
    const x = find('chem', 'chem', 'sigfigs', (i) => i.params.mode === 'density' && i.params.nV > i.params.nRho && !C.sigText(i.a, i.sf).includes('×') && C.truncSig(i.exact, i.sf) !== i.a);
    expect(x.sf).toBe(x.params.nRho);
    expect(diag(x, C.sigText(x.a, x.sf)).correct).toBe(true);
    expect(diag(x, String(x.exact)).misconception).toBe('sigTooMany');
    expect(diag(x, String(C.truncSig(x.exact, x.sf).toPrecision(x.sf))).misconception).toBe('sigTruncated');
  });
  it('a whole number with unclear zeros is named and fixed by a decimal point or scientific notation', () => {
    const x = find('chem', 'chem', 'sigfigs', (i) => /0$/.test(String(i.a)) && Number.isInteger(i.a) && C.sigText(i.a, i.sf).includes('×') && C.countSigFigs(String(i.a)).count < i.sf);
    expect(diag(x, String(x.a)).misconception).toBe('sigAmbiguousZeros');
    expect(diag(x, String(x.a) + '.').correct).toBe(C.countSigFigs(String(x.a) + '.').count === x.sf);
    expect(diag(x, Number(x.a).toExponential(x.sf - 1)).correct).toBe(true);
  });
});

describe('chemistry: scientific notation', () => {
  it('right value but plain, or not normalised, or the exponent sign flipped, are each named', () => {
    const x = find('chem', 'chem', 'sci', (i) => i.params.mode === 'toSci' && i.a < 1);
    const e = Math.floor(Math.log10(x.a));
    const mant = x.a / Math.pow(10, e);
    expect(diag(x, Number(x.a).toExponential(x.sf - 1)).correct).toBe(true);
    expect(diag(x, String(x.a)).misconception).toBe('sciNotSci');
    expect(diag(x, (mant * 10).toPrecision(x.sf + 1) + 'e' + (e - 1)).misconception).toBe('sciNotNormalized');
    expect(diag(x, mant.toPrecision(x.sf) + 'e' + (-e)).misconception).toBe('sciExponentSign');
  });
  it('writing as an ordinary number grades the value exactly', () => {
    const x = find('chem', 'chem', 'sci', (i) => i.params.mode === 'fromSci');
    expect(diag(x, String(x.a)).correct).toBe(true);
    expect(diag(x, String(x.a * 1.003)).correct).toBe(false);
  });
});

describe('chemistry: moles and density chains', () => {
  it('pins the atomic-mass table (IUPAC/CIAAW 2021 abridged, conventional values) and the molar masses built from it', () => {
    expect(C.atomicMass).toEqual({ H: 1.008, C: 12.011, N: 14.007, O: 15.999, Na: 22.990, Mg: 24.305, Al: 26.982, S: 32.06, Cl: 35.45, K: 39.098, Ca: 40.078, Fe: 55.845, Cu: 63.546, Zn: 65.38, Ag: 107.87, Au: 196.97 });
    const M = (id) => C.molarMass(C.compounds.find((c) => c.id === id));
    expect(M('water')).toBe(18.015);
    expect(M('co2')).toBe(44.009);
    expect(M('nacl')).toBe(58.44);
    expect(M('glucose')).toBe(180.156);
    expect(M('o2')).toBe(31.998);
    expect(C.avogadroExact).toBe(6.02214076e23);
  });
  it('names the molar mass used the wrong way, the atom mass used for O₂, a skipped step and a chain stopped early', () => {
    const m = find('chem', 'chem', 'mole', (i) => i.params.mode === 'massToMol' && i.params.cmp === 'o2');
    const mass = Number(m.params.mass);
    expect(diag(m, String(mass / 31.998)).correct).toBe(true);
    expect(diag(m, String(mass * 31.998)).misconception).toBe('molarMassWrongWay');
    expect(diag(m, String(mass / 15.999)).misconception).toBe('moleAtomicMass');
    const p = find('chem', 'chem', 'mole', (i) => i.params.mode === 'massToParticles' && i.params.cmp === 'water');
    const g = Number(p.params.mass);
    expect(diag(p, (g / 18.015 * 6.022e23).toExponential(3)).correct).toBe(true);
    expect(diag(p, String(g * 6.022e23)).misconception).toBe('moleSkippedStep');
    expect(diag(p, String(g / 18.015)).misconception).toBe('moleStoppedEarly');
    expect(diag(p, String(g / (1.008 + 15.999) * 6.022e23)).misconception).toBe('moleSubscripts');
  });
  it('density chains name the inverted density and the missing last factor', () => {
    const x = find('chem', 'chem', 'density', (i) => i.params.mode === 'mLtoKg');
    expect(x.a).toBeCloseTo(x.params.v * 0.789 / 1000, 12);
    expect(diag(x, String(x.params.v * 0.789)).misconception).toBe('chainMissedStep');
    expect(diag(x, String(x.params.v / 0.789 / 1000)).misconception).toBe('densityInverted');
  });
});

describe('benchmark comparisons', () => {
  it('offer the true size and one wrong size that is ten times off or in the wrong unit', () => {
    const ids = new Set();
    for (let s = 1; s < 400; s++) {
      const x = C.makeCompareItem('b45', s);
      expect(x.options).toHaveLength(2);
      const right = x.options[x.correctIndex];
      const wrong = x.options[1 - x.correctIndex];
      expect(wrong.value !== right.value || wrong.unit !== right.unit).toBe(true);
      if (x.alt.mis === 'estTenTimes') expect([10, 0.1]).toContainEqual(Number((wrong.value / right.value).toPrecision(6)));
      else expect(wrong.value).toBe(right.value);
      ids.add(x.id);
    }
    expect(ids.size).toBeGreaterThan(20);
  });
});
