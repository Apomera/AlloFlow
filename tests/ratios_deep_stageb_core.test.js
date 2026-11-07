// Ratios Lab stage B (2026-11-03): scale drawings, mixtures, recipes, the
// proportional detective, the Unit Converter handoff, and the encoding fix.
// Pure logic, run (not grepped). RATIOS_DEEP_FILE points the suite at another copy.
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.RATIOS_DEEP_FILE || 'stem_lab/stem_tool_ratios.js';
let P;
beforeAll(() => { resetStemLab(); loadTool(FILE, 'ratioLab'); P = window.RatioLabPure; });

const MOJIBAKE = /Ã|Â|â€|âˆ/;
function texts(pr) {
  const out = [pr.prompt, pr.hint, pr.explain];
  (pr.steps || []).forEach((s) => out.push(s.q, s.a));
  (pr.traps || []).forEach((t) => out.push(t.message));
  Object.values(pr.choiceTraps || {}).forEach((t) => out.push(t.message));
  if (pr.predict) out.push(pr.predict.question, pr.predict.why, ...pr.predict.options.map((o) => o.label));
  return out.join(' | ');
}
function kindSample(kind, n, band) {
  const out = [];
  for (let s = 1; s <= n; s++) out.push(P.buildKindProblem(kind, P.makeKindParams(kind, s * 7919 + 3, band || 'g7'), null, { id: kind + s }));
  return out;
}

describe('encoding: multiplication and division signs are real characters', () => {
  it('no generated or lesson text shows double-encoded symbols such as "Ã—"', () => {
    const all = Object.values(P.buildFixedChallenges(null)).flat();
    for (let s = 1; s <= 30; s++) for (const mode of Object.keys(P.practiceKinds)) for (const band of P.bands) all.push(P.generateProblem(mode, band, s));
    for (const pr of all) expect(MOJIBAKE.test(texts(pr)), pr.id + ': ' + texts(pr).match(/.{0,30}(Ã|â).{0,10}/)).toBe(false);
    const mc = P.buildKindProblem('multCompare', { s: 4, m: 3, ctx: 'ribbon' });
    expect(mc.explain).toBe('3 × 4 = 12. "Times as many" compares by multiplying.');
    expect(P.buildKindProblem('kFromTable', { k: 2, xs: [2, 4, 6], ctx: 'plain' }).hint).toBe('k is y ÷ x. Use any row.');
  });
});

describe('recipe scaling (6.RP.3, 7.RP.1)', () => {
  it('scales by non-integer factors with kitchen fractions, and the key is q × T ÷ S', () => {
    const factors = new Set();
    for (const pr of kindSample('recipeScale', 200)) {
      const p = pr.params;
      factors.add(p.T / p.S);
      expect(Number.isInteger(p.T / p.S), pr.prompt).toBe(false);
      expect(pr.answer).toBeCloseTo(p.q * p.T / p.S, 12);
      expect(Math.abs(pr.answer * 8 - Math.round(pr.answer * 8)) < 1e-9, pr.prompt).toBe(true);
      expect(P.challengeIsCorrect(pr, P.canonicalChallengeAnswer(pr), { strictUnits: true }), pr.prompt).toBe(true);
      expect(P.challengeIsCorrect(pr, String(pr.answer)), pr.prompt).toBe(true);
    }
    for (const f of [1.5, 0.75, 2.5, 1.25, 0.5]) expect(factors.has(f), String(f)).toBe(true);
  });

  it('reads and writes mixed numbers and names the scaling mistakes', () => {
    const pr = P.buildKindProblem('recipeScale', { ing: 'flour', S: 4, T: 6, q: 0.75 });
    expect(pr.prompt).toBe('A pancake recipe for 4 servings uses 3/4 cups of flour. How many cups of flour do you need for 6 servings?');
    expect(P.canonicalChallengeAnswer(pr)).toBe('1 1/8');
    expect(P.challengeIsCorrect(pr, '1 1/8')).toBe(true);
    expect(P.challengeIsCorrect(pr, '9/8')).toBe(true);
    expect(P.challengeIsCorrect(pr, '1.125')).toBe(true);
    expect(P.diagnoseRatioAnswer(pr, '2.75').kind).toBe('additive');
    expect(P.diagnoseRatioAnswer(pr, '4.5').kind).toBe('unitRateSkipped');
    expect(P.diagnoseRatioAnswer(pr, '0.5').kind).toBe('inverted');
    expect(P.mixedText(2.625)).toBe('2 5/8');
    expect(P.mixedText(0.75)).toBe('3/4');
    expect(P.mixedText(3)).toBe('3');
    const factor = P.buildKindProblem('recipeFactor', { S: 8, T: 6 });
    expect(factor.answer).toBe(0.75);
    expect(P.challengeIsCorrect(factor, '3/4')).toBe(true);
    expect(P.diagnoseRatioAnswer(factor, '2').kind).toBe('additive');
    expect(P.diagnoseRatioAnswer(factor, '4/3').kind).toBe('inverted');
  });
});

describe('scale drawings (7.G.1)', () => {
  it('real lengths multiply by the scale, drawing lengths divide by it', () => {
    for (const pr of kindSample('scaleLength', 150)) {
      const p = pr.params;
      expect(pr.answer).toBeCloseTo(p.toDrawing ? p.d : p.d * p.k, 12);
      expect(pr.link.tool).toBe('unitConvert');
      expect(pr.link.value).toBeCloseTo(p.d * p.k, 12);
    }
    const toReal = P.buildKindProblem('scaleLength', { ctx: 'map', k: 5, d: 3.5, toDrawing: false });
    expect(toReal.answer).toBe(17.5);
    expect(P.diagnoseRatioAnswer(toReal, '8.5').kind).toBe('additive');
    expect(P.diagnoseRatioAnswer(toReal, '0.7').kind).toBe('divideNotMultiply');
  });

  it('names "area scales by k, not k²" and predicts the k² factor', () => {
    for (const pr of kindSample('scaleArea', 120)) {
      const p = pr.params;
      expect(pr.answer).toBe(p.w * p.l * p.k * p.k);
      const labels = pr.predict.options.map((o) => o.label);
      expect(new Set(labels).size).toBe(3);
      expect(pr.predict.options.find((o) => o.id === pr.predict.correct).label).toBe(p.k * p.k + ' times');
      const d = P.diagnoseRatioAnswer(pr, String(p.w * p.l * p.k));
      expect(d.kind).toBe('areaScaleK');
      expect(d.message).toContain('Area does not scale by k');
      expect(P.diagnoseRatioAnswer(pr, String(p.w * p.l)).kind).toBe('drawingAreaOnly');
    }
    expect(P.misconceptionLabel('areaScaleK')).toBe('Area scaled by k, not k²');
  });

  it('redrawing at a new scale goes through the real length', () => {
    for (const pr of kindSample('scaleRedraw', 120)) {
      const p = pr.params;
      expect(pr.answer).toBeCloseTo(p.w * p.k1 / p.k2, 12);
      expect(Math.abs(pr.answer * 2 - Math.round(pr.answer * 2)) < 1e-9).toBe(true);
    }
    const pr = P.buildKindProblem('scaleRedraw', { ctx: 'garden', k1: 4, w: 6, k2: 3 });
    expect(pr.answer).toBe(8);
    expect(P.diagnoseRatioAnswer(pr, '4.5').kind).toBe('inverted');
    expect(P.diagnoseRatioAnswer(pr, '24').kind).toBe('stoppedEarly');
  });
});

describe('mixtures: part-to-whole, not additive, comparison', () => {
  it('the key comes from the shares of the whole, and the additive answer is always a named trap', () => {
    let sameSeen = false, diffSeen = false;
    for (const pr of kindSample('mixtureCompare', 300)) {
      const { a, b, c, e } = pr.params;
      const fa = a / (a + b), fb = c / (c + e);
      const want = Math.abs(fa - fb) < 1e-12 ? 'same' : fa > fb ? 'a' : 'b';
      expect(P.normalizeChoice(pr.answers[0])).toBe(want);
      const additive = (b - a) === (e - c) ? 'same' : (b - a) < (e - c) ? 'a' : 'b';
      expect(additive).not.toBe(want);
      expect(P.diagnoseRatioAnswer(pr, additive).kind, pr.prompt).toBe('additiveComparison');
      if (want === 'same') sameSeen = true; else diffSeen = true;
    }
    expect(sameSeen && diffSeen).toBe(true);
    const pr = P.buildKindProblem('mixtureCompare', { a: 2, b: 3, c: 4, e: 5, ctx: 'juice' });
    expect(P.challengeIsCorrect(pr, 'Mix B')).toBe(true);
    expect(P.diagnoseRatioAnswer(pr, 'equal').kind).toBe('additiveComparison');
    expect(P.diagnoseRatioAnswer(pr, 'A').kind).toBe('partToPart');
    expect(P.misconceptionLabel('additiveComparison')).toContain('additive comparison');
  });

  it('fraction of a mix: part over whole, with part-to-part named', () => {
    const pr = P.buildKindProblem('mixtureFraction', { a: 2, b: 3, ctx: 'juice' });
    expect(pr.answer).toBe(0.4);
    expect(P.canonicalChallengeAnswer(pr)).toBe('2/5');
    expect(P.challengeIsCorrect(pr, '2/5')).toBe(true);
    expect(P.challengeIsCorrect(pr, '0.4')).toBe(true);
    expect(P.diagnoseRatioAnswer(pr, '2/3').kind).toBe('partToPart');
    expect(P.diagnoseRatioAnswer(pr, '3/5').kind).toBe('otherPart');
  });
});

describe('proportional relationship detective (7.RP.2)', () => {
  function independentVerdict(c) {
    if (c.rows) { const r = c.rows.map(([x, y]) => y / x); return r.every((v) => Math.abs(v - r[0]) < 1e-9); }
    if (c.graph) return c.graph.points[0][0] === 0 && c.graph.points[0][1] === 0;
    return c.type === 'storyRate';
  }
  it('every case is decided correctly and carries named, true evidence', () => {
    for (const type of P.detectiveTypes) {
      for (let s = 1; s <= 40; s++) {
        const c = P.buildDetectiveCase(P.makeDetectiveParams(type, s));
        expect(c.proportional, type + ' ' + c.text).toBe(independentVerdict(c));
        expect(c.evidenceOptions).toContain(c.evidence);
        expect(c.evidenceTrue[c.evidence]).toBe(true);
        expect(c.evidenceNote.length).toBeGreaterThan(20);
        expect(c.evidenceNote.startsWith(c.proportional ? 'Proportional.' : 'Not proportional.')).toBe(true);
        expect(P.checkDetectiveAnswer(c, c.proportional ? 'yes' : 'no', c.evidence).correct).toBe(true);
        const wrong = P.checkDetectiveAnswer(c, c.proportional ? 'no' : 'yes', c.evidence);
        expect(wrong.correct).toBe(false);
        expect(wrong.message.length).toBeGreaterThan(20);
      }
    }
  });

  it('linear but not through (0, 0) is named, and "same step" alone does not settle it', () => {
    const line = P.buildDetectiveCase(P.makeDetectiveParams('graphIntercept', 5));
    expect(line.graph.points[0][0]).toBe(0);
    expect(line.graph.points[0][1]).toBeGreaterThan(0);
    expect(P.checkDetectiveAnswer(line, 'yes', 'lineMisses').kind).toBe('interceptProportional');
    const same = P.checkDetectiveAnswer(line, 'no', 'sameStep');
    expect(same.kind).toBe('constantDifference');
    expect(same.message).toContain('does not settle it');
    expect(P.checkDetectiveAnswer(line, 'no', 'lineOrigin').kind).toBe('evidenceFalse');
    const table = P.buildDetectiveCase(P.makeDetectiveParams('tableLinear', 5));
    const diffs = table.rows.slice(1).map((r, i) => r[1] - table.rows[i][1]);
    expect(diffs[0]).toBeCloseTo(diffs[1], 9);
    expect(P.checkDetectiveAnswer(table, 'yes', 'ratioSame').kind).toBe('constantDifference');
    const fee = P.buildDetectiveCase(P.makeDetectiveParams('storyFee', 5));
    expect(P.checkDetectiveAnswer(fee, 'yes', 'startAmount').kind).toBe('interceptProportional');
    expect(P.checkDetectiveAnswer(fee, 'no', null).complete).toBe(false);
  });

  it('practice serves graph and story cases in grade 7 and 8 proportional practice', () => {
    for (const band of ['g7', 'g8']) expect(P.practiceKinds.proportional[band]).toContain('propDetective');
    const types = new Set();
    for (let s = 1; s <= 200; s++) { const pr = P.generateProblem('proportional', 'g8', s); if (pr.kind === 'propDetective') types.add(pr.params.type); }
    expect([...types].sort()).toEqual(['graphIntercept', 'graphOrigin', 'storyFee', 'storyRate']);
  });
});

describe('missions are regenerable and internally consistent', () => {
  it('builds all four missions for many seeds with matching keys', () => {
    expect(P.missionIds).toEqual(['scale', 'mixture', 'recipe', 'detective']);
    for (let s = 1; s <= 60; s++) {
      const sc = P.buildMission('scale', s);
      expect(sc.steps.map((x) => x.id)).toEqual(['length', 'area', 'redrawL', 'redrawW']);
      expect(sc.steps[0].problem.answer).toBe(sc.l * sc.k1);
      expect(sc.steps[1].problem.answer).toBe(sc.l * sc.w * sc.k1 * sc.k1);
      expect(sc.steps[2].problem.answer).toBeCloseTo(sc.L2, 12);
      expect(sc.steps[3].problem.answer).toBeCloseTo(sc.W2, 12);
      expect(sc.k2).not.toBe(sc.k1);
      const rc = P.buildMission('recipe', s);
      expect(Number.isInteger(rc.f)).toBe(false);
      expect(rc.steps[0].problem.answer).toBeCloseTo(rc.T / rc.S, 12);
      rc.items.forEach((it2) => { expect(Math.abs(it2.scaled * 8 - Math.round(it2.scaled * 8)) < 1e-9).toBe(true); expect(it2.problem.answer).toBeCloseTo(it2.q * rc.f, 12); });
      const mx = P.buildMission('mixture', s);
      expect(mx.steps[0].problem.answer).toBeCloseTo(mx.params.a / (mx.params.a + mx.params.b), 12);
      expect(mx.predict.options.some((o) => o.id === mx.predict.correct)).toBe(true);
      const dt = P.buildMission('detective', s);
      expect(dt.cases.map((c) => c.type).sort()).toEqual([...P.detectiveTypes].sort());
      expect(P.buildMission('detective', s).cases.map((c) => c.text)).toEqual(dt.cases.map((c) => c.text));
    }
    const layouts = new Set();
    for (let s = 1; s <= 30; s++) { const sc = P.buildMission('scale', s); layouts.add([sc.l, sc.w, sc.k1, sc.k2].join(',')); }
    expect(layouts.size).toBeGreaterThan(10);
  });
});

describe('Unit Converter handoff', () => {
  it('fills only the conversion inputs and keeps everything else', () => {
    const prev = { unitConvert: { badges: { first: true }, quizTotal: 7, category: 'time', value: 3, fromUnit: 'sec', toUnit: 'min', tab: 'quiz' }, other: 1 };
    const next = P.unitConvertHandoff(prev, { category: 'area', from: 'm²', to: 'ft²', value: 432 });
    expect(next.unitConvert).toEqual({ badges: { first: true }, quizTotal: 7, category: 'area', value: 432, valueDraft: '432', fromUnit: 'm²', toUnit: 'ft²', tab: 'convert' });
    expect(next.other).toBe(1);
    expect(P.unitConvertHandoff(prev, { category: 'area', from: 'm²', to: 'parsecs', value: 1 })).toBe(prev);
    expect(P.unitConvertHandoff(prev, { category: 'length', from: 'm', to: 'ft', value: -2 })).toBe(prev);
    const car = P.buildFixedChallenges(null).unitRates.find((c) => c.id === 'unit-speed');
    expect(car.link).toEqual({ tool: 'unitConvert', category: 'speed', from: 'mph', to: 'km/h', value: 60 });
  });
});
