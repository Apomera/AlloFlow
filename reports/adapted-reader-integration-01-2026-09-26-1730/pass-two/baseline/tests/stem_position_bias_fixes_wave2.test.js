import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Distribution tests for the second wave of answer-position-bias fixes:
// roadready's instructional scenario banks, aquarium, fisherlab,
// aquaculture, and weldlab. (Wave 1: solarsystem/behaviorlab/
// companionplanting in stem_position_bias_fixes.test.js; punnett and
// autorepair are the other session's, with their own coverage.)
//
// Everything is source-extracted — these files are 0.5-2MB and never go
// through the eval harness. "Raw" scopes slice only the authored literal;
// "processed" scopes include the tool's own rotation code, so the tests
// measure exactly what students see.

const read = (p) => fs.readFileSync('stem_lab/' + p, 'utf8');
const alloTStub = (key, fallback) => fallback;

function extract(src, startMarker, endMarker, returns) {
  const start = src.indexOf(startMarker);
  const end = src.indexOf(endMarker, start);
  expect(start, startMarker).toBeGreaterThan(-1);
  expect(end, endMarker + ' bounds ' + startMarker).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function('__alloT', src.slice(start, end) + '\nreturn { ' + returns.join(', ') + ' };')(alloTStub);
}

// Slice a `var NAME = [ ... ];` literal by scanning to the first '];'.
function extractArray(src, marker, name) {
  const start = src.indexOf(marker);
  expect(start, marker).toBeGreaterThan(-1);
  const end = src.indexOf('];', start);
  expect(end, marker + ' close').toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function('__alloT', src.slice(start, end + 2) + '\nreturn ' + name + ';')(alloTStub);
}

function slotCounts(questions, getOpts, getIdx) {
  const counts = [0, 0, 0, 0];
  for (const q of questions) counts[getIdx(q)]++;
  return counts;
}

function assertSpread(counts, total, label, maxShare) {
  const used = counts.filter((c) => c > 0).length;
  expect(used, label + ' distinct slots (' + counts.join('/') + ')').toBeGreaterThanOrEqual(3);
  expect(Math.max(...counts) / total, label + ' max share (' + counts.join('/') + ')').toBeLessThanOrEqual(maxShare || 0.5);
}

describe('roadready scenario banks', () => {
  const src = read('stem_tool_roadready.js');
  const helper = extract(src, 'function rrRotateScenario', 'function buildRandomTest', ['rrRotateScenario']);

  it('rotation preserves the correct answer text and spreads a slot-2 pile-up', () => {
    const authored = Array.from({ length: 12 }, (_, i) => ({
      id: 's' + i, choices: ['w1', 'RIGHT', 'w2', 'w3'], correct: 1
    }));
    const rotated = authored.map((sc, si) => helper.rrRotateScenario(sc, si));
    rotated.forEach((sc, i) => {
      expect(sc.choices[sc.correct], 'scenario ' + i).toBe('RIGHT');
      expect([...sc.choices].sort()).toEqual(['RIGHT', 'w1', 'w2', 'w3']);
    });
    assertSpread(slotCounts(rotated, null, (sc) => sc.correct), rotated.length, 'synthetic');
  });

  it('real banks (moose, emergency, winter) spread after rotation', () => {
    for (const name of ['MOOSE_SCENARIOS', 'EMG_SCENARIOS', 'WINTER_SCENARIOS']) {
      const bank = extractArray(src, 'var ' + name + ' = [', name);
      const rotated = bank.map((sc, si) => helper.rrRotateScenario(sc, si));
      rotated.forEach((sc, i) => {
        expect(sc.choices[sc.correct], name + '[' + i + ']').toBe(bank[i].choices[bank[i].correct]);
      });
      assertSpread(slotCounts(rotated, null, (sc) => sc.correct), rotated.length, name, 0.6);
    }
  });

  it('all eight consumer loops route through the rotation (regression pin)', () => {
    const hits = src.split('.map(rrRotateScenario).map(function(sc) {').length - 1;
    expect(hits).toBe(8);
  });
});

describe('aquarium structured quiz', () => {
  // The bank lives in three source pieces separated by unrelated code: the
  // base literal, a push.apply extension ~1,800 lines later, and the
  // rotation IIFE. Compose them the way the module does at load.
  const src = read('stem_tool_aquarium.js');
  const raw = extractArray(src, 'var AQUARIUM_QUIZ_BANK = [', 'AQUARIUM_QUIZ_BANK');

  const processed = raw.map((q) => ({ ...q, options: [...q.options] }));
  const extStart = src.indexOf('Array.prototype.push.apply(AQUARIUM_QUIZ_BANK, [');
  const extEnd = src.indexOf(']);', extStart);
  expect(extStart).toBeGreaterThan(-1);
  // eslint-disable-next-line no-new-func
  new Function('AQUARIUM_QUIZ_BANK', '__alloT', src.slice(extStart, extEnd + 3))(processed, alloTStub);
  const rotStart = src.indexOf('// The authored bank put 75%');
  const rotEnd = src.indexOf('// SCENARIO RECIPES \\u2014 extended', rotStart);
  expect(rotStart).toBeGreaterThan(-1);
  expect(rotEnd).toBeGreaterThan(rotStart);
  // eslint-disable-next-line no-new-func
  new Function('AQUARIUM_QUIZ_BANK', src.slice(rotStart, rotEnd))(processed);

  it('rotation preserved every authored answer text (base segment)', () => {
    expect(processed.length).toBeGreaterThan(raw.length);
    raw.forEach((q, qi) => {
      const after = processed[qi];
      expect(after.question).toBe(q.question);
      expect(after.options[after.correct], q.id).toBe(q.options[q.correct]);
      expect([...after.options].sort()).toEqual([...q.options].sort());
    });
  });

  it('the 12/75/10/3 pile-up is spread across slots', () => {
    assertSpread(slotCounts(processed, null, (q) => q.correct), processed.length, 'aquarium');
  });
});

describe('fisherlab quiz', () => {
  const src = read('stem_tool_fisherlab.js');
  const raw = extractArray(src, 'var QUIZ_QUESTIONS = [', 'QUIZ_QUESTIONS');
  const processed = extract(src, 'var QUIZ_QUESTIONS = [', '// DATA: MISSIONS', ['QUIZ_QUESTIONS']).QUIZ_QUESTIONS;

  it('rotation preserved every authored answer text and spread the 2/46/22/0 pile-up', () => {
    expect(processed.length).toBe(raw.length);
    raw.forEach((q, qi) => {
      const after = processed[qi];
      expect(after.a[after.correct], 'Q' + qi).toBe(q.a[q.correct]);
    });
    assertSpread(slotCounts(processed, null, (q) => q.correct), processed.length, 'fisherlab');
  });
});

describe('aquaculture checkpoint quiz', () => {
  const src = read('stem_tool_aquaculture.js');
  const raw = extractArray(src, 'var QUIZ_QUESTIONS = [', 'QUIZ_QUESTIONS');
  const processed = extract(src, 'var QUIZ_QUESTIONS = [', '// DATA: MISSIONS', ['QUIZ_QUESTIONS']).QUIZ_QUESTIONS;

  it('rotation preserved every authored answer text and spread the 2/53/12/2 pile-up', () => {
    expect(processed.length).toBe(raw.length);
    raw.forEach((q, qi) => {
      const after = processed[qi];
      expect(after.a[after.correct], 'Q' + qi).toBe(q.a[q.correct]);
    });
    assertSpread(slotCounts(processed, null, (q) => q.correct), processed.length, 'aquaculture');
  });
});

describe('weldlab exams', () => {
  const src = read('stem_tool_weldlab.js');
  const examRaw = extractArray(src, 'var examQuestions = [', 'examQuestions');
  const examProcessed = extract(src, 'var examQuestions = [', 'if (qpView ===', ['examQuestions']).examQuestions;
  const symRaw = extractArray(src, 'var symbolQuestions = [', 'symbolQuestions');
  const symProcessed = extract(src, 'var symbolQuestions = [', 'function renderSymbolViz', ['symbolQuestions']).symbolQuestions;

  it('cert exam: answers preserved, slot-2 pile-up spread', () => {
    expect(examProcessed.length).toBe(examRaw.length);
    examRaw.forEach((q, qi) => {
      expect(examProcessed[qi].opts[examProcessed[qi].correct], 'Q' + qi).toBe(q.opts[q.correct]);
    });
    assertSpread(slotCounts(examProcessed, null, (q) => q.correct), examProcessed.length, 'weld exam');
  });

  it('symbol quiz: answers preserved, spread', () => {
    expect(symProcessed.length).toBe(symRaw.length);
    symRaw.forEach((q, qi) => {
      expect(symProcessed[qi].options[symProcessed[qi].correct], 'S' + qi).toBe(q.options[q.correct]);
    });
    assertSpread(slotCounts(symProcessed, null, (q) => q.correct), symProcessed.length, 'weld symbols', 0.6);
  });
});

describe('deployment copies', () => {
  for (const name of ['roadready', 'aquarium', 'fisherlab', 'aquaculture', 'weldlab']) {
    it(name + ' public mirror is byte-identical to the root copy', () => {
      expect(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_' + name + '.js', 'utf8'))
        .toBe(read('stem_tool_' + name + '.js'));
    });
  }
});
