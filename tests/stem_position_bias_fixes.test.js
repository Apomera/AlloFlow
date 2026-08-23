import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Distribution tests for the answer-position-bias fixes in solarsystem,
// behaviorlab, and companionplanting (the scanner's remaining open tools;
// punnett's fix is a concurrent session's work with its own coverage).
//
// All three files are too large to eval through the smoke harness
// (solarsystem alone is 1.9MB), so every bank and helper is extracted
// straight from source — the same technique the waterCycle fix used.

const read = (p) => fs.readFileSync(p, 'utf8');
const alloTStub = (key, fallback) => fallback;

function extract(src, startMarker, endMarker, returns) {
  const start = src.indexOf(startMarker);
  const end = src.indexOf(endMarker, start);
  expect(start, startMarker).toBeGreaterThan(-1);
  expect(end, endMarker + ' bounds ' + startMarker).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function('__alloT', src.slice(start, end) + '\nreturn { ' + returns.join(', ') + ' };')(alloTStub);
}

// Where each correct answer sits after a transform, as slot counts.
function slotCounts(questions, getOpts, getAnswerIndex) {
  const counts = [0, 0, 0, 0];
  for (const q of questions) counts[getAnswerIndex(q, getOpts(q))]++;
  return counts;
}

function assertSpread(counts, total, label) {
  const used = counts.filter((c) => c > 0).length;
  expect(used, label + ' distinct slots used (' + counts.join('/') + ')').toBeGreaterThanOrEqual(3);
  expect(Math.max(...counts) / total, label + ' max slot share (' + counts.join('/') + ')').toBeLessThanOrEqual(0.5);
}

describe('solarsystem quiz shuffle', () => {
  const src = read('stem_lab/stem_tool_solarsystem.js');
  const scope = extract(src, 'var solarShuffledOpts = function', 'var VOCAB', ['solarShuffledOpts', 'QUIZ_BANK']);

  it('bank integrity: every answer is among its options, feedback keyed by text', () => {
    expect(scope.QUIZ_BANK.length).toBeGreaterThanOrEqual(15);
    for (const q of scope.QUIZ_BANK) {
      expect(q.opts, q.q).toContain(q.a);
      if (q.wrongFeedback) {
        for (const k of Object.keys(q.wrongFeedback)) {
          expect(q.opts, q.q + ' feedback key ' + k).toContain(k);
          expect(k, q.q).not.toBe(q.a);
        }
      }
    }
  });

  it('shuffle is a permutation, leaves the source untouched, and moves the answer to every slot', () => {
    const original = ['A', 'B', 'C', 'D'];
    const landed = [0, 0, 0, 0];
    for (let i = 0; i < 400; i++) {
      const out = scope.solarShuffledOpts(original);
      expect([...out].sort()).toEqual(['A', 'B', 'C', 'D']);
      landed[out.indexOf('B')]++;
    }
    expect(original).toEqual(['A', 'B', 'C', 'D']);
    for (let s = 0; s < 4; s++) {
      expect(landed[s] / 400, 'slot ' + s + ' share').toBeGreaterThan(0.15);
    }
  });

  it('the draw site stores shuffled options into quiz state (regression pin)', () => {
    expect(src).toContain('opts: solarShuffledOpts(q.opts)');
  });
});

describe('behaviorlab rotation', () => {
  const src = read('stem_lab/stem_tool_behaviorlab.js');
  const fn = extract(src, 'var blRotateQuestion = function', 'var QUIZ_BANK', ['blRotateQuestion']);
  const quiz = extract(src, 'var QUIZ_BANK = {', 'Object.keys(QUIZ_BANK).forEach', ['QUIZ_BANK']);
  const scen = extract(src, 'var SCENARIO_CHALLENGES = [', 'SCENARIO_CHALLENGES = SCENARIO_CHALLENGES.map', ['SCENARIO_CHALLENGES']);

  // Re-apply the rotation exactly as the tool does.
  const rotatedQuiz = {};
  for (const level of Object.keys(quiz.QUIZ_BANK)) {
    rotatedQuiz[level] = fn.blRotateQuestion(quiz.QUIZ_BANK[level], Number(level));
  }
  const rotatedScen = scen.SCENARIO_CHALLENGES.map((sc, si) => fn.blRotateQuestion(sc, si));

  it('rotation preserves the correct answer TEXT for every question', () => {
    for (const level of Object.keys(quiz.QUIZ_BANK)) {
      const before = quiz.QUIZ_BANK[level];
      const after = rotatedQuiz[level];
      expect(after.opts[after.correct], 'quiz level ' + level).toBe(before.opts[before.correct]);
      expect([...after.opts].sort()).toEqual([...before.opts].sort());
    }
    rotatedScen.forEach((after, i) => {
      const before = scen.SCENARIO_CHALLENGES[i];
      expect(after.options[after.correct], 'scenario ' + before.id).toBe(before.options[before.correct]);
    });
  });

  it('the authored slot-2 pile-up is gone after rotation', () => {
    const all = Object.values(rotatedQuiz).concat(rotatedScen);
    const counts = slotCounts(all, (q) => q.opts || q.options, (q) => q.correct);
    assertSpread(counts, all.length, 'behaviorlab');
  });

  it('rotation is applied in the tool itself (regression pins)', () => {
    expect(src).toContain('QUIZ_BANK[level] = blRotateQuestion(QUIZ_BANK[level], Number(level));');
    expect(src).toContain('return blRotateQuestion(sc, si);');
  });
});

describe('companionplanting rotation', () => {
  const src = read('stem_lab/stem_tool_companionplanting.js');
  const bank = extract(src, 'var quizzes = [', 'var cpRotateQuestion', ['quizzes']);
  const fn = extract(src, 'var cpRotateQuestion = function', 'quizzes = quizzes.map', ['cpRotateQuestion']);
  const scen = extract(src, 'var GARDEN_SCENARIOS = [', 'function cgRotateScenario', ['GARDEN_SCENARIOS']);
  const scenFn = extract(src, 'function cgRotateScenario', 'GARDEN_SCENARIOS = GARDEN_SCENARIOS.map', ['cgRotateScenario']);

  const rotated = bank.quizzes.map((q, qi) => fn.cpRotateQuestion(q, qi));
  const rotatedScen = scen.GARDEN_SCENARIOS.map((sc, si) => scenFn.cgRotateScenario(sc, si));

  it('quizzes grade by text and the answer survives rotation in every question', () => {
    rotated.forEach((after, i) => {
      const before = bank.quizzes[i];
      expect(typeof before.correct, before.q).toBe('string');
      expect(after.opts, before.q).toContain(before.correct);
      expect([...after.opts].sort()).toEqual([...before.opts].sort());
    });
  });

  it('both banks spread their answers across slots after rotation', () => {
    const quizCounts = slotCounts(rotated, (q) => q.opts, (q, opts) => opts.indexOf(q.correct));
    assertSpread(quizCounts, rotated.length, 'companionplanting quizzes');
    const scenCounts = slotCounts(rotatedScen, (q) => q.options, (q) => q.correct);
    assertSpread(scenCounts, rotatedScen.length, 'garden scenarios');
    rotatedScen.forEach((after, i) => {
      const before = scen.GARDEN_SCENARIOS[i];
      expect(after.options[after.correct], 'scenario ' + before.id).toBe(before.options[before.correct]);
    });
  });

  it('rotation is applied in the tool itself (regression pins)', () => {
    expect(src).toContain('quizzes = quizzes.map(function(q, qi) { return cpRotateQuestion(q, qi); });');
    expect(src).toContain('GARDEN_SCENARIOS = GARDEN_SCENARIOS.map(cgRotateScenario);');
  });
});

describe('galaxy quiz answer position', () => {
  const src = read('stem_lab/stem_tool_galaxy.js');

  // The bank uses t()/__alloT() for many strings; resolving them is not needed to
  // measure POSITION, only to compare answer-to-option, so a stub that returns the
  // key is sufficient and keeps this independent of ui_strings.
  function bank() {
    const start = src.indexOf('var QUIZ_BANK = [');
    expect(start, 'QUIZ_BANK').toBeGreaterThan(-1);
    let i = src.indexOf('[', start), depth = 0, end = -1;
    for (let p = i; p < src.length; p++) {
      if (src[p] === '[') depth++;
      else if (src[p] === ']') { depth--; if (depth === 0) { end = p + 1; break; } }
    }
    const idStub = (k, fb) => (typeof fb === 'string' ? fb : k);
    // eslint-disable-next-line no-new-func
    return new Function('t', '__alloT', 'return ' + src.slice(i, end))(idStub, idStub);
  }

  // Run the SHIPPED rotation, not a copy of it, so this cannot drift from the code
  // it protects.
  function shippedRotate() {
    const start = src.indexOf('var GALAXY_ANSWER_SLOTS');
    expect(start, 'GALAXY_ANSWER_SLOTS').toBeGreaterThan(-1);
    const end = src.indexOf('\n          }', src.indexOf('function rotateAnswerPosition')) + 12;
    // eslint-disable-next-line no-new-func
    return new Function(src.slice(start, end) + '\nreturn rotateAnswerPosition;')();
  }

  it('the authored bank really is biased (calibration — if this passes, the measurement is broken)', () => {
    const counts = [0, 0, 0, 0];
    for (const q of bank()) counts[q.options.indexOf(q.a)]++;
    // A held 1 of 20 when this was found. Pin the shape of the problem, not the sha.
    expect(Math.max(...counts)).toBeGreaterThan(counts.reduce((a, b) => a + b, 0) / 4);
    expect(Math.min(...counts)).toBeLessThan(3);
  });

  it('rotation spreads correct answers evenly across all four slots', () => {
    const rotate = shippedRotate();
    const counts = [0, 0, 0, 0];
    bank().forEach((q, i) => { const r = rotate(q, i); counts[r.options.indexOf(r.a)]++; });
    const expected = bank().length / 4;
    for (const [slot, n] of counts.entries()) {
      expect(Math.abs(n - expected), 'slot ' + slot + ' has ' + n + ' of ' + bank().length).toBeLessThanOrEqual(1);
    }
  });

  it('rotation preserves each question option set exactly', () => {
    const rotate = shippedRotate();
    bank().forEach((q, i) => {
      const r = rotate(q, i);
      expect(r.options.slice().sort(), 'question ' + i).toEqual(q.options.slice().sort());
      expect(new Set(r.options).size, 'duplicate option at question ' + i).toBe(q.options.length);
      expect(r.options).toContain(q.a);
    });
  });

  it('rotation is applied to the bank the tool actually renders', () => {
    // ACTIVE_BANK, not QUIZ_BANK: the AI-generated bank must be rotated too.
    expect(src).toMatch(/var ACTIVE_BANK = \(generatedBank\.length > 0 \? generatedBank : QUIZ_BANK\)[\s\S]{0,120}?rotateAnswerPosition/);
  });

  it('the quiz still grades by option text, which is what makes rotation safe', () => {
    expect(src).toContain('var correct = opt === quizQ.a;');
  });
});

describe('economicslab scenario answer position', () => {
  const src = read('stem_lab/stem_tool_economicslab.js');

  function bank() {
    const start = src.indexOf('var ECON_SCENARIOS = [');
    expect(start, 'ECON_SCENARIOS').toBeGreaterThan(-1);
    let i = src.indexOf('[', start), depth = 0, end = -1;
    for (let p = i; p < src.length; p++) {
      if (src[p] === '[') depth++;
      else if (src[p] === ']') { depth--; if (depth === 0) { end = p + 1; break; } }
    }
    const idStub = (k, fb) => (typeof fb === 'string' ? fb : k);
    // eslint-disable-next-line no-new-func
    return new Function('t', '__alloT', 'return ' + src.slice(i, end))(idStub, idStub);
  }

  // Run the SHIPPED rotation so this cannot drift from the code it protects.
  function rotated(input) {
    const start = src.indexOf('var ECON_ANSWER_SLOTS');
    expect(start, 'ECON_ANSWER_SLOTS').toBeGreaterThan(-1);
    const end = src.indexOf('});', start) + 3;
    // eslint-disable-next-line no-new-func
    return new Function('ECON_SCENARIOS', src.slice(start, end) + '\nreturn ECON_SCENARIOS;')(input);
  }

  it('the authored bank really is biased (calibration)', () => {
    const counts = [0, 0, 0, 0];
    for (const q of bank()) counts[q.correct]++;
    // Was 0/6/4/0: six at B, four at C, and A and D never correct.
    expect(counts.filter((n) => n === 0).length, 'expected dead slots in the authored order').toBeGreaterThan(0);
  });

  it('rotation leaves no dead slot and spreads answers evenly', () => {
    const qs = bank();
    const counts = [0, 0, 0, 0];
    for (const q of rotated(qs.map((o) => ({ ...o })))) counts[q.correct]++;
    expect(counts.filter((n) => n === 0), 'every slot must be reachable').toEqual([]);
    // 10 questions over 4 slots cannot be exactly uniform; allow one either way.
    const expected = qs.length / 4;
    for (const [slot, n] of counts.entries()) {
      expect(Math.abs(n - expected), 'slot ' + slot + ' has ' + n).toBeLessThanOrEqual(1);
    }
  });

  it('rotation moves the index with the options, so the ANSWER never changes', () => {
    const qs = bank();
    const out = rotated(qs.map((o) => ({ ...o })));
    qs.forEach((q, i) => {
      expect(out[i].options[out[i].correct], 'scenario ' + i).toBe(q.options[q.correct]);
      expect(out[i].options.slice().sort(), 'option set ' + i).toEqual(q.options.slice().sort());
    });
  });

  it('rotation is applied to the bank the tool renders', () => {
    expect(src).toMatch(/ECON_SCENARIOS = ECON_SCENARIOS\.map\(/);
    // Grading is by index, which is why `correct` has to move too.
    expect(src).toContain('oi === sc.correct');
  });
});

describe('deployment copies', () => {
  for (const name of ['solarsystem', 'behaviorlab', 'companionplanting', 'galaxy', 'economicslab']) {
    it(name + ' public mirror is byte-identical to the root copy', () => {
      expect(read('desktop/web-app/public/stem_lab/stem_tool_' + name + '.js'))
        .toBe(read('stem_lab/stem_tool_' + name + '.js'));
    });
  }
});
