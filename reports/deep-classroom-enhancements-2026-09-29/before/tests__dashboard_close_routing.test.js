import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { sliceBetween, expectAnchorCount } from './helpers/anchored_slice.js';

const source = fs.readFileSync('AlloFlowANTI.txt', 'utf8');

// Both dashboard variants must close back to a REAL main screen. The bug this
// guards is a close button that routes to a view the app does not render, so
// the user lands on a blank screen with no way back.
//
// 2026-09-14: this suite was passing vacuously. It sliced the teacher branch
// with `indexOf("activeView === 'dashboard' && !isTeacherMode")` as the end
// bound, but that branch had been widened to
// `(!isTeacherMode || isIndependentMode)` so independent mode gets the learner
// view. indexOf returned -1, which slice() reads as "one character from the
// end" — so the teacher slice ran to the end of the file and contained every
// onClose in the app, while the learner slice was empty and failed. Both
// halves were wrong; only one of them said so.
//
// The rewrite fixes the anchors AND the failure mode: slicing goes through
// tests/helpers/anchored_slice.js, which throws naming the anchor that moved
// instead of quietly widening the region. Anchors are the branch CONDITIONS,
// which are the thing under test, not incidental prop names.
const TEACHER_BRANCH = "{activeView === 'dashboard' && isTeacherMode && !isIndependentMode &&";
const LEARNER_BRANCH = "{activeView === 'dashboard' && (!isTeacherMode || isIndependentMode) &&";
const FROM = { file: 'AlloFlowANTI.txt' };

describe('Student/Teacher Dashboard close routing', () => {
  it('routes both dashboard variants back to the input view', () => {
    expect(source).toContain("const handleCloseDashboard = useCallback(() => setActiveView('input'), []);");

    // The teacher branch ends where the learner branch begins; the learner
    // branch ends at its own share handler, which sits after its onClose.
    const teacherBranch = sliceBetween(source, TEACHER_BRANCH, LEARNER_BRANCH, { ...FROM, label: 'teacher dashboard branch' });
    const learnerBranch = sliceBetween(source, LEARNER_BRANCH, 'onShareWithTeacher=', { ...FROM, label: 'learner dashboard branch' });

    expect(teacherBranch).toContain('<TeacherDashboard');
    expect(teacherBranch).toContain('onClose={handleCloseDashboard}');
    expect(learnerBranch).toContain('<LearnerProgressView');
    expect(learnerBranch).toContain('onClose={handleCloseDashboard}');

    // 'content' is not a view this app renders — routing there blanks the screen.
    expect(source).not.toContain("setActiveView('content')");
  });

  it('the two branches are mutually exclusive, so every role reaches exactly one', () => {
    // isIndependentMode is the discriminator: it sends a user with
    // isTeacherMode set to the LEARNER view, which is the whole point of the
    // widened condition the old anchors missed.
    expect(source).toContain('!isIndependentMode');
    const teacherIdx = source.indexOf(TEACHER_BRANCH);
    const learnerIdx = source.indexOf(LEARNER_BRANCH);
    expect(teacherIdx).toBeGreaterThan(-1);
    expect(learnerIdx).toBeGreaterThan(teacherIdx);
    // Exactly one of each: a duplicated branch means one is dead code.
    expect(expectAnchorCount(source, TEACHER_BRANCH, 1, FROM)).toBe(1);
    expect(expectAnchorCount(source, LEARNER_BRANCH, 1, FROM)).toBe(1);
  });
});
