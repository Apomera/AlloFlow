// Ratios Lab deep rebuild (2026-11-03): the pure layer, run rather than grepped.
// RATIOS_DEEP_FILE points the suite at another copy (to confirm the gates fail
// on the pre-rebuild file).
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.RATIOS_DEEP_FILE || 'stem_lab/stem_tool_ratios.js';
let P;
let byId;
beforeEach(() => {
  resetStemLab();
  loadTool(FILE, 'ratioLab');
  P = window.RatioLabPure;
  byId = {};
  Object.keys(P.challenges).forEach((mode) => P.challenges[mode].forEach((c) => { byId[c.id] = c; }));
});

const MARK = (key, fb) => '⟦' + fb + '⟧';

describe('review bug: number-line scaffold units (MED, was L513-521)', () => {
  it('names the unit in a whole sentence instead of "1 Tickets -> 3 Cost"', () => {
    const models = {
      'line-tickets': [['Tickets', 'Cost ($)'], [[0, 0], [5, 15], [8, '?']]],
      'line-running': [['Distance (km)', 'Time (min)'], [[0, 0], [3, 18], [7, '?']]],
      'line-batches': [['Batches', 'Flour (cups)'], [[0, 0], [2, 5], [6, '?']]],
    };
    const want = {
      'line-tickets': 'For 1 ticket, the cost is $3.',
      'line-running': 'For 1 kilometer, the time is 6 minutes.',
      'line-batches': 'For 1 batch, you need 2.5 cups of flour.',
    };
    for (const id of Object.keys(models)) {
      const scaffold = P.numberLineScaffold(models[id], byId[id]);
      expect(scaffold && scaffold.text, id).toBe(want[id]);
      // The value it shows still leads to an answer the grader accepts.
      const target = models[id][1][2][0];
      expect(P.challengeIsCorrect(byId[id], String(target * scaffold.shown)), id).toBe(true);
    }
    // The parenthetical is the unit, not noise to strip.
    const parsed = P.numberLineScaffold(models['line-running']);
    expect(parsed.valueUnit).toBe('min');
    expect(parsed.unitUnit).toBe('km');
  });
});

describe('review bug: misconceptions missed on most problems (MED, was L372-402)', () => {
  it('names the error on every lesson problem the review probed', () => {
    const cases = [
      ['line-tickets', '18', 'additive'],
      ['line-running', '22', 'additive'],
      ['percent-whole', '6', 'multiplyNotDivide'],
      ['unit-speed', '540', 'multiplyNotDivide'],
      ['percent-rate', '0.25', 'decimalPercent'],
      ['percent-rate', '400', 'inverted'],
      ['percent-part', '6.86', 'divideNotMultiply'],
      ['percent-part', '8400', 'decimalPercent'],
      ['ratio-paint', '18', 'additive'],
      ['ratio-scale', '10', 'additive'],
      ['unit-snacks', 'A', 'stickerPrice'],
      ['prop-no-table', 'yes', 'oneRowCheck'],
    ];
    for (const [id, typed, kind] of cases) {
      const diagnosis = P.diagnoseRatioAnswer(byId[id], typed);
      expect(diagnosis && diagnosis.kind, id + ' ' + typed).toBe(kind);
      expect(diagnosis.message.length, id).toBeGreaterThan(20);
    }
  });
});

describe('review bug: ratio answers (LOW, was L76)', () => {
  it('accepts "3 to 4"; a "simplify" task needs the simplest form; rejects the original', () => {
    const c = byId['ratio-simplify'];
    for (const ok of ['3:4', '3 : 4', '3/4', '3 to 4']) expect(P.challengeIsCorrect(c, ok), ok).toBe(true);
    // Decision 2026-11-03 (Aaron): "Simplify 18:24" means simplest form. 9:12 is part way.
    for (const partWay of ['9:12', '6 to 8']) {
      expect(P.challengeIsCorrect(c, partWay), partWay).toBe(false);
      const note = P.diagnoseRatioAnswer(c, partWay);
      expect(note.kind, partWay).toBe('partlySimplified');
      expect(note.accepted).toBeUndefined();
    }
    // A ratio problem that is not a "simplify" task still accepts an equivalent form, with a note.
    const plain = { id: 'plain', ratioAnswer: [3, 4], answer: '3:4' };
    expect(P.challengeIsCorrect(plain, '9:12')).toBe(true);
    const note = P.diagnoseRatioAnswer(plain, '9:12');
    expect(note).toMatchObject({ kind: 'notSimplest', accepted: true });
    expect(note.message).toContain('3:4');
    expect(P.diagnoseRatioAnswer(c, '3 to 4')).toBeNull();
    expect(P.challengeIsCorrect(c, '18:24')).toBe(false);
    expect(P.diagnoseRatioAnswer(c, '18:24').kind).toBe('notSimplified');
    expect(P.challengeIsCorrect(c, '36:48')).toBe(false);
    expect(P.diagnoseRatioAnswer(c, '4:3').kind).toBe('reversedRatio');
    expect(P.diagnoseRatioAnswer(c, '0.75').kind).toBe('quotientNotRatio');
  });
  it('reads "B." and "Option B" as the choice B', () => {
    expect(P.challengeIsCorrect(byId['unit-snacks'], 'b.')).toBe(true);
    expect(P.challengeIsCorrect(byId['unit-snacks'], 'Option B')).toBe(true);
    expect(P.challengeIsCorrect(byId['unit-snacks'], 'a')).toBe(false);
  });
});

describe('lesson problems keep their keys and gain builders', () => {
  it('every lesson problem is built by a kind whose own answer matches the lesson key', () => {
    for (const c of Object.values(byId)) {
      expect(c.kind, c.id).toBeTruthy();
      const rebuilt = P.buildKindProblem(c.kind, c.params, null, {});
      if (c.answer != null) expect(rebuilt.answer, c.id).toBeCloseTo(c.answer, 9);
      else expect(rebuilt.answers[0], c.id).toBe(c.answers[0]);
      expect(c.steps.length, c.id).toBeGreaterThan(0);
      expect(c.predict.options.some((o) => o.id === c.predict.correct), c.id).toBe(true);
    }
  });
});

function sample(perBand) {
  const out = [];
  for (const mode of Object.keys(P.practiceKinds)) {
    for (const band of P.bands) {
      for (let i = 1; i <= perBand; i++) out.push(P.generateProblem(mode, band, i * 104729 + 7));
    }
  }
  return out;
}

describe('generated practice', () => {
  it('is reproducible from its seed and never runs out', () => {
    const a = P.generateProblem('percent', 'g7', 4242);
    const b = P.generateProblem('percent', 'g7', 4242);
    expect(a.prompt).toBe(b.prompt);
    expect(a.id).toBe(b.id);
    const prompts = new Set();
    for (let s = 1; s <= 200; s++) prompts.add(P.generateProblem('ratioTable', 'g6', s).prompt);
    expect(prompts.size).toBeGreaterThan(120);
    // A new seed changes the kind when the band has more than one.
    const first = P.practiceKindFor('percent', 'g7', 4242);
    const next = P.nextPracticeSeed('percent', 'g7', 4242, () => 0.37);
    expect(P.practiceKindFor('percent', 'g7', next)).not.toBe(first);
  });

  it('scales by grade band (4-5, 6.RP, 7.RP.3, 8.EE.5)', () => {
    expect(P.bandForGrade('4th Grade')).toBe('g45');
    expect(P.bandForGrade('5th Grade')).toBe('g45');
    expect(P.bandForGrade('6th Grade')).toBe('g6');
    expect(P.bandForGrade('7th Grade')).toBe('g7');
    expect(P.bandForGrade('8th Grade')).toBe('g8');
    expect(P.bandForGrade('', 'g35')).toBe('g45');
    expect(P.bandForGrade(undefined, undefined)).toBe('g6');
    const kindsIn = (band) => new Set(Object.keys(P.practiceKinds).flatMap((m) => P.practiceKinds[m][band]));
    expect(kindsIn('g45').has('multCompare')).toBe(true);
    expect(kindsIn('g45').has('percentChange')).toBe(false);
    for (const k of ['percentChange', 'taxTip', 'discountMarkup', 'kFromTable', 'kFromGraph', 'fractionRate']) expect(kindsIn('g7').has(k), k).toBe(true);
    expect(kindsIn('g8').has('slope')).toBe(true);
    expect(kindsIn('g8').has('compareSlopes')).toBe(true);
    // Every listed kind is actually produced by the generator.
    const produced = new Set(sample(40).map((p) => p.kind));
    for (const band of P.bands) for (const k of kindsIn(band)) expect(produced.has(k), k).toBe(true);
  });

  it('every generated problem is gradable, diagnosable, predictable and has a worked example', () => {
    const problems = sample(30);
    for (const pr of problems) {
      const tag = pr.id + ' ' + pr.kind;
      expect(/\{\w+\}|NaN|undefined|Infinity/.test(pr.prompt + pr.hint + pr.explain), tag + ': ' + pr.prompt).toBe(false);
      const canon = P.canonicalChallengeAnswer(pr);
      expect(P.challengeIsCorrect(pr, canon, { strictUnits: true }), tag + ' accepts ' + canon).toBe(true);
      expect(P.diagnoseRatioAnswer(pr, canon), tag).toBeNull();
      expect(pr.predict.options.some((o) => o.id === pr.predict.correct), tag).toBe(true);
      expect(pr.steps.length, tag).toBeGreaterThan(0);
      // Every numeric trap is named when typed, and never equals the key.
      for (const trap of pr.traps || []) {
        const typed = String(Math.round(trap.value * 1000) / 1000);
        expect(P.challengeIsCorrect(pr, typed), tag + ' trap ' + typed).toBe(false);
        const d = P.diagnoseRatioAnswer(pr, typed);
        expect(d && d.message.length > 10, tag + ' trap ' + trap.kind + ' ' + typed).toBe(true);
      }
      for (const [choice, trap] of Object.entries(pr.choiceTraps || {})) {
        expect(P.diagnoseRatioAnswer(pr, choice).kind, tag).toBe(trap.kind);
      }
      const sibling = P.workedSibling(pr, pr.band);
      expect(sibling, tag).toBeTruthy();
      expect(sibling.prompt).not.toBe(pr.prompt);
      // The worked example never shows this problem's own answer.
      expect(sibling.kind, tag).toBe(pr.kind);
      expect(P.canonicalChallengeAnswer(sibling), tag).not.toBe(canon);
    }
  });

  it('carries the misconceptions the brief names on generated problems too', () => {
    const kindsSeen = new Set();
    for (const pr of sample(40)) {
      (pr.traps || []).forEach((t) => kindsSeen.add(t.kind));
      Object.values(pr.choiceTraps || {}).forEach((t) => kindsSeen.add(t.kind));
    }
    for (const k of ['additive', 'multiplyNotDivide', 'partToPart', 'decimalPercent', 'inverted', 'wrongBase', 'partOnly', 'stickerPrice', 'interceptProportional', 'runOverRise']) {
      expect(kindsSeen.has(k), k).toBe(true);
    }
    // Every named kind has a teacher-facing label.
    for (const k of kindsSeen) if (k !== 'other') expect(P.misconceptionLabel(k), k).not.toBe(P.misconceptionLabel('other'));
  });

  it('computes 7.RP.3 and 8.EE.5 answers correctly (re-derived here)', () => {
    for (let s = 1; s <= 120; s++) {
      for (const pr of [P.generateProblem('percent', 'g7', s), P.generateProblem('percent', 'g8', s), P.generateProblem('proportional', 'g8', s), P.generateProblem('unitRates', 'g7', s), P.generateProblem('ratioTable', 'g8', s)]) {
        const p = pr.params;
        if (pr.kind === 'taxTip') expect(pr.answer).toBeCloseTo(p.P * (1 + p.r / 100), 9);
        if (pr.kind === 'discountMarkup') expect(pr.answer).toBeCloseTo(p.ctx === 'discount' ? p.P * (1 - p.r / 100) : p.P * (1 + p.r / 100), 9);
        if (pr.kind === 'percentChange') {
          const n = p.up ? p.o * (1 + p.pct / 100) : p.o * (1 - p.pct / 100);
          expect(Math.abs(n - p.o) / p.o * 100).toBeCloseTo(pr.answer, 9);
        }
        if (pr.kind === 'slope') {
          const pts = pr.graph.points;
          expect((pts[1][1] - pts[0][1]) / (pts[1][0] - pts[0][0])).toBeCloseTo(pr.answer, 9);
        }
        if (pr.kind === 'fractionRate') expect(pr.answer).toBeCloseTo((p.f1[0] / p.f1[1]) / (p.f2[0] / p.f2[1]), 9);
        if (pr.kind === 'mixturePercent') expect(pr.answer).toBeCloseTo(p.a / (p.a + p.b) * 100, 9);
        if (pr.kind === 'betterBuy') {
          const winner = p.pa / p.qa < p.pb / p.qb ? 'a' : 'b';
          expect(pr.answers[0]).toBe(winner);
        }
        if (pr.kind === 'compareSlopes') expect(pr.answers[0]).toBe(p.k1 > p.k2 ? 'a' : 'b');
        if (pr.kind === 'kFromGraph') expect(pr.answer).toBeCloseTo(pr.graph.points[1][1] / pr.graph.points[1][0], 9);
      }
    }
  });

  it('accepts fractions for fraction-rate answers', () => {
    let found = null;
    for (let s = 1; s < 400 && !found; s++) { const pr = P.generateProblem('unitRates', 'g7', s); if (pr.kind === 'fractionRate' && pr.answer === 0.75) found = pr; }
    expect(found).toBeTruthy();
    expect(P.challengeIsCorrect(found, '3/4')).toBe(true);
    expect(P.challengeIsCorrect(found, '0.75')).toBe(true);
    expect(P.parseNumberWithFraction('1 1/2')).toBe(1.5);
  });
});

describe('representations', () => {
  it('the ratio table scales down and has unit-rate rows', () => {
    const rows = P.ratioTableRows(12, 18, 2);
    expect(rows.filter((r) => r.kind === 'divide').map((r) => [r.factor, r.first, r.second])).toEqual([[6, 2, 3], [3, 4, 6], [2, 6, 9]]);
    expect(rows.find((r) => r.kind === 'unitFirst')).toMatchObject({ first: 1, second: 1.5 });
    expect(rows.find((r) => r.kind === 'unitSecond').first).toBeCloseTo(2 / 3, 12);
    expect(rows.filter((r) => r.selected).map((r) => r.factor)).toEqual([2]);
    expect(P.ratioTableRows(3, 5, 4).some((r) => r.kind === 'divide')).toBe(false);
  });

  it('the tape diagram splits the whole into equal units', () => {
    expect(P.tapeModel(3, 5, 40)).toMatchObject({ units: 8, unit: 5, partA: 15, partB: 25, boxes: true });
    expect(P.tapeModel(30, 40, 700).boxes).toBe(false);
    expect(P.tapeModel(0, 0, 10)).toBeNull();
  });

  it('hands y = kx to the Graphing Calculator without clobbering its other functions', () => {
    const prev = { graphCalc: { tier: 'explorer', funcs: [{ expr: 'x^2', color: '#1' }, { expr: '', color: '#2' }] }, other: 1 };
    const next = P.graphCalcHandoff(prev, '2.5*x');
    expect(next.graphCalc.funcs.map((f) => f.expr)).toEqual(['x^2', '2.5*x']);
    expect(next.graphCalc.tier).toBe('explorer');
    expect(next.other).toBe(1);
    expect(P.graphCalcHandoff(next, '2.5*x').graphCalc.funcs.map((f) => f.expr)).toEqual(['x^2', '2.5*x']);
    expect(P.graphCalcHandoff({}, '3*x').graphCalc.funcs[0].expr).toBe('3*x');
  });
});

describe('translation: problem content goes through whole-sentence keys', () => {
  it('lesson and generated prompts, hints and explanations are each one translated sentence', () => {
    const local = P.buildFixedChallenges(MARK);
    const all = Object.values(local).flat();
    for (let s = 1; s <= 25; s++) for (const mode of Object.keys(P.practiceKinds)) for (const band of P.bands) all.push(P.generateProblem(mode, band, s, MARK));
    for (const pr of all) {
      for (const field of ['prompt', 'hint', 'explain']) {
        expect(/^⟦[^⟦⟧]*⟧$/.test(pr[field]), pr.id + ' ' + field + ': ' + pr[field]).toBe(true);
      }
      expect(/^⟦[^⟦⟧]*⟧$/.test(pr.predict.question), pr.id + ' predict').toBe(true);
      pr.steps.forEach((step) => expect(/^⟦[^⟧]*⟧$/.test(step.q), pr.id + ' step').toBe(true));
    }
    expect(P.percentTapeSummary(P.percentTapeModel(235), MARK)).toBe('⟦235% equals 2 complete wholes plus 35% of another whole.⟧');
    expect(P.parsePairInput('1,x', '2,3', MARK).errors[0]).toBe('⟦Row 2: use numbers only.⟧');
    expect(P.localModes(MARK).every((m) => m.title.startsWith('⟦'))).toBe(true);
  });
});
