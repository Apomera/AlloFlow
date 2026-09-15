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
     return { OP_MASTERY_CORRECT_TARGET, mastered: _opQuestionMastered, seen: _opQuestionSeenCorrect };
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
  });
});

describe('Optics mastery — the recorder and the readers agree', () => {
  it('records a miss on a question the learner had previously got right', () => {
    const submit = between('var isCorrect = ans[qi] === q.correct;', 'upd({');
    expect(submit).toContain('missedSinceCorrect: true');
    // A miss on a question never answered correctly needs no extra state.
    expect(submit).toContain('var missedEntry = nextMastery[q.q];');
    expect(submit).toContain('if (missedEntry) {');
  });

  it('clears the miss flag when the question is answered right again', () => {
    const submit = between('var isCorrect = ans[qi] === q.correct;', 'upd({');
    // BOTH branches must clear it: the existing-entry update (a question that
    // was missed and is now right again) and the brand-new entry. Asserting
    // the string once passes even if the update branch drops it.
    expect((submit.match(/missedSinceCorrect: false/g) || []).length,
      'a mastery branch no longer clears the miss flag').toBe(2);
  });

  // Otherwise the overlay congratulates a coin flip.
  it('celebrates at the mastery threshold, not on the first correct answer', () => {
    const submit = between('var isCorrect = ans[qi] === q.correct;', 'upd({');
    expect(submit).toContain('_opQuestionMastered(nextMastery[key])');
    expect(submit).toContain('!_opQuestionMastered(existingEntry)');
  });

  // Every surface that reports a count must use the same threshold, or the
  // header, the mastery tab and the per-concept bars disagree.
  it('routes every mastery count through the shared predicate', () => {
    const rawLookups = SRC.match(/!!\s*(?:op|_h)?[Mm]astery\[q\.q\]/g) || [];
    expect(rawLookups, 'a surface still counts any entry as mastered').toEqual([]);
    const usages = SRC.match(/_opQuestionMastered\(/g) || [];
    expect(usages.length, 'not every consumer uses the predicate').toBeGreaterThanOrEqual(6);
  });

  it('shows the seen-once middle state instead of hiding real progress', () => {
    const list = between('var partial = !done && _opQuestionSeenCorrect(entry);', 'flex: 1, minWidth: 0');
    expect(list).toContain("done ? '✓' : (partial ? '◐' : '○')");
    // The marker is decorative, so the state needs a text alternative.
    expect(list).toMatch(/Answered correctly once; needs one more/);
    expect(list).toMatch(/aria-hidden': 'true'/);
  });
});
