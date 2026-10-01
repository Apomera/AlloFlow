import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { sliceBetween } from './helpers/anchored_slice.js';

const ROOT = process.cwd();
const SRC = fs.readFileSync(path.join(ROOT, 'stem_lab/stem_tool_optics.js'), 'utf8');

function between(startMarker, endMarker) {
  return sliceBetween(SRC, startMarker, endMarker, { file: 'stem_lab/stem_tool_optics.js' });
}

// The shipped predicates, so the threshold under test is the one that ships.
const M = vm.runInNewContext(
  `(function () {
     ${between('var OP_MASTERY_CORRECT_TARGET =', 'function _pickOpticsQuizQuestions(')}
     return { OP_MASTERY_CORRECT_TARGET, mastered: _opQuestionMastered, seen: _opQuestionSeenCorrect, record: _opRecordQuizMastery };
   })()`,
  { isFinite },
);

describe('Optics mastery — one lucky guess is not mastery', () => {
  // The bug: a four-choice question counted as MASTERED after one correct
  // answer, so a coin flip could paint the Mastery tab green permanently.
  it('needs more than a single correct answer', () => {
    expect(M.OP_MASTERY_CORRECT_TARGET).toBeGreaterThanOrEqual(2);
    expect(M.mastered({ correctCount: 1 }), 'one correct still counts as mastered').toBe(false);
    expect(M.mastered({ correctCount: 2 })).toBe(true);
    expect(M.mastered({ correctCount: 7 })).toBe(true);
  });

  it('still distinguishes "answered once" from "never got it"', () => {
    expect(M.seen({ correctCount: 1 })).toBe(true);
    expect(M.seen({ correctCount: 0 })).toBe(false);
    expect(M.seen(undefined)).toBe(false);
    // Seen-once is explicitly NOT mastered.
    expect(M.mastered({ correctCount: 1 })).toBe(false);
  });

  // A lucky hit followed by a miss must not stay green.
  it('drops back when the question is later missed', () => {
    expect(M.mastered({ correctCount: 2, missedSinceCorrect: true })).toBe(false);
    expect(M.mastered({ correctCount: 9, missedSinceCorrect: true })).toBe(false);
    // Getting it right again settles it.
    expect(M.mastered({ correctCount: 3, missedSinceCorrect: false })).toBe(true);
  });

  it('treats junk entries as not mastered rather than throwing', () => {
    // A string or Infinity from a corrupt save would pass a bare >= 2, so
    // these are the values that actually exercise the numeric guard.
    for (const bad of [null, undefined, 0, 'yes', [], {},
                       { correctCount: 'two' }, { correctCount: NaN },
                       { correctCount: '5' }, { correctCount: '2' },
                       { correctCount: Infinity }, { correctCount: [3] },
                       { correctCount: null }]) {
      expect(M.mastered(bad), JSON.stringify(bad)).toBe(false);
    }
    // A legacy entry from before correctCount existed must not read as mastered.
    expect(M.mastered({ firstCorrectAt: '2026-01-01T00:00:00.000Z' })).toBe(false);
    for (const bad of [{ streak: '2' }, { streak: NaN }, { streak: Infinity, correctCount: 1 }]) {
      expect(M.mastered(bad), JSON.stringify(bad)).toBe(false);
    }
  });

  it('reads the streak when there is one, and a legacy total only when there is not', () => {
    expect(M.mastered({ streak: 2, correctCount: 2 })).toBe(true);
    // A long history does not outvote a broken streak.
    expect(M.mastered({ streak: 1, correctCount: 9 })).toBe(false);
    expect(M.seen({ streak: 0, correctCount: 9 })).toBe(false);
  });
});

describe('Optics mastery — replaying a learner through the shipped recorder', () => {
  // The recorder is the function the quiz's Submit button calls, so these
  // sequences exercise the rule that ships. It used to keep a running total
  // with a "missed" flag that the next correct answer cleared, so right, wrong,
  // right counted as mastered although the copy promises "twice in a row".
  const Q = { q: 'Which way does light bend entering glass?', correct: 2, tags: ['refraction'] };
  const OTHER = { q: 'An unrelated question', correct: 0, tags: [] };
  const NOW = '2026-09-24T00:00:00.000Z';
  function replay(pattern, start = {}) {
    let mastery = start;
    let last = null;
    for (const ch of pattern) {
      last = M.record(mastery, [Q], [ch === 'R' ? Q.correct : (Q.correct + 1) % 4], NOW, [Q, OTHER]);
      mastery = last.mastery;
    }
    return { entry: mastery[Q.q], last };
  }

  it('needs two correct answers IN A ROW', () => {
    expect(M.mastered(replay('R').entry)).toBe(false);
    expect(M.seen(replay('R').entry)).toBe(true);
    expect(M.mastered(replay('RR').entry)).toBe(true);
    expect(M.mastered(replay('RWR').entry), 'right, wrong, right is not two in a row').toBe(false);
    expect(M.mastered(replay('RRW').entry), 'a miss after mastery unlocks it').toBe(false);
    expect(M.mastered(replay('RRWR').entry), 'one correct answer does not re-master').toBe(false);
    expect(M.mastered(replay('RRWRR').entry)).toBe(true);
    expect(replay('W').entry, 'a miss on a never-correct question stores nothing').toBeUndefined();
  });

  it('celebrates only the answer that crosses the threshold, with the true mastered count', () => {
    expect(replay('R').last.newlyMastered).toBeNull();
    expect(replay('RR').last.newlyMastered.question).toBe(Q.q);
    expect(replay('RRR').last.newlyMastered, 'already mastered: no second celebration').toBeNull();
    expect(replay('RWR').last.newlyMastered).toBeNull();
    // Three questions each answered right once, then one crosses: the overlay
    // said "3 / N mastered" (every key ever stored); only one is mastered.
    const once = { [Q.q]: { correctCount: 1, streak: 1 }, [OTHER.q]: { correctCount: 1, streak: 1 }, 'Third': { correctCount: 1, streak: 1 } };
    const out = M.record(once, [Q], [Q.correct], NOW, [Q, OTHER, { q: 'Third' }]);
    expect(out.newlyMastered.question).toBe(Q.q);
    expect(out.masteredTotal).toBe(1);
  });

  it('carries legacy entries over conservatively', () => {
    const legacy = { [Q.q]: { correctCount: 3, missedSinceCorrect: false } };
    expect(M.mastered(legacy[Q.q])).toBe(true);
    expect(M.mastered(replay('W', legacy).entry)).toBe(false);
    expect(M.mastered(replay('WR', legacy).entry)).toBe(false);
    expect(M.mastered(replay('WRR', legacy).entry)).toBe(true);
    const pendingMiss = { [Q.q]: { correctCount: 5, missedSinceCorrect: true } };
    expect(M.mastered(replay('R', pendingMiss).entry), 'a pending miss is a broken streak').toBe(false);
  });

  it('the quiz submit and the celebration use the recorder', () => {
    expect(SRC).toContain('var recorded = _opRecordQuizMastery(d.quizMastery, d.quizQuestions, ans,');
    expect(SRC).toContain('total: recorded.masteredTotal');
    expect(SRC).not.toContain('total: Object.keys(nextMastery).length');
  });

  // Every surface that reports a count must use the same threshold, or the
  // header, the mastery tab and the per-concept bars disagree.
  it('routes every mastery count through the shared predicate', () => {
    const rawLookups = SRC.match(/!!\s*(?:op|_h)?[Mm]astery\[q\.q\]/g) || [];
    expect(rawLookups, 'a surface still counts any entry as mastered').toEqual([]);
    const usages = SRC.match(/_opQuestionMastered\(/g) || [];
    expect(usages.length, 'not every consumer uses the predicate').toBeGreaterThanOrEqual(6);
  });

  it('names each list state in words for a screen reader', () => {
    const list = between('var partial = !done && _opQuestionSeenCorrect(entry);', 'flex: 1, minWidth: 0');
    // Round 12: "missed since a correct answer" got its own mark (it shared ○ with "never answered").
    expect(list).toContain("done ? '✓' : (partial ? '◐' : (missed ? '↺' : '○'))");
    expect(list).toContain('Answered correctly once; get it right once more in a row to master it.');
    expect(list).toContain('Missed since the last correct answer; needs two in a row.');
    expect(list).toMatch(/aria-hidden': 'true'/);
  });
});
