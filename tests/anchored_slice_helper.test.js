// The anchored-slice helper itself.
//
// This helper exists to stop source-pin tests from passing vacuously, so it
// has to be trustworthy in exactly the cases that bite: a stale END anchor
// (the silent one — the slice swallows the whole file and every toContain
// passes), a stale START anchor, anchors in the wrong order, and an anchor
// that appears more than once. Each case below is the real failure shape,
// written the way it occurred in tests/dashboard_close_routing.test.js.

import { describe, it, expect } from 'vitest';
import { sliceBetween, indexOfOrThrow, expectAnchorCount } from './helpers/anchored_slice.js';

// A miniature of the host file: two sibling branches, each with its own
// close handler, and a third unrelated handler after them.
const SOURCE = [
  'const handleCloseDashboard = useCallback(() => setActiveView("input"), []);',
  "{activeView === 'dashboard' && isTeacherMode && !isIndependentMode && (",
  '  <TeacherDashboard',
  '      onClose={handleCloseDashboard}',
  '  />)}',
  "{activeView === 'dashboard' && (!isTeacherMode || isIndependentMode) && (",
  '  <LearnerProgressView',
  '      onClose={handleCloseDashboard}',
  '      onShareWithTeacher={() => share()}',
  '  />)}',
  '<SomethingElse onClose={handleSomethingElse} />',
].join('\n');

const TEACHER = "{activeView === 'dashboard' && isTeacherMode && !isIndependentMode && (";
const LEARNER = "{activeView === 'dashboard' && (!isTeacherMode || isIndependentMode) && (";

describe('sliceBetween returns the region the caller meant', () => {
  it('slices from the start anchor up to (not including) the end anchor', () => {
    const branch = sliceBetween(SOURCE, TEACHER, LEARNER);
    expect(branch).toContain('<TeacherDashboard');
    expect(branch).toContain('onClose={handleCloseDashboard}');
    expect(branch).not.toContain('<LearnerProgressView');
    expect(branch).not.toContain('handleSomethingElse');
  });

  it('includeEnd keeps the end anchor, and a null end runs to the end of the source', () => {
    expect(sliceBetween(SOURCE, TEACHER, LEARNER, { includeEnd: true })).toContain(LEARNER);
    expect(sliceBetween(SOURCE, LEARNER, null)).toContain('handleSomethingElse');
  });

  it('finds the end anchor AFTER the start, so a repeated anchor cannot invert the region', () => {
    const learner = sliceBetween(SOURCE, LEARNER, 'onShareWithTeacher=');
    expect(learner).toContain('<LearnerProgressView');
    // 'onClose={handleCloseDashboard}' appears before the start anchor too;
    // searching from index 0 would have produced an empty region.
    expect(learner).toContain('onClose={handleCloseDashboard}');
  });

  it('occurrence picks the nth start anchor', () => {
    const doubled = SOURCE + '\n' + TEACHER + '\n  <SecondCopy />';
    expect(sliceBetween(doubled, TEACHER, null, { occurrence: 2 })).toContain('<SecondCopy');
    expect(sliceBetween(doubled, TEACHER, null, { occurrence: 1 })).toContain('<TeacherDashboard');
  });
});

describe('the vacuous-pass cases now fail loudly', () => {
  it('a stale END anchor throws instead of swallowing the rest of the file', () => {
    // This is the exact regression: the end anchor was renamed, indexOf
    // returned -1, and the slice silently became the whole file.
    const stale = "{activeView === 'dashboard' && !isTeacherMode";
    expect(() => sliceBetween(SOURCE, TEACHER, stale)).toThrow(/End anchor not found/);
    expect(() => sliceBetween(SOURCE, TEACHER, stale)).toThrow(/pass for free/);

    // Prove the hazard is real: the naive form passes while pinning nothing.
    const naive = SOURCE.slice(SOURCE.indexOf(TEACHER), SOURCE.indexOf(stale));
    expect(naive).toContain('handleSomethingElse');
  });

  it('a stale START anchor throws and names it', () => {
    expect(() => sliceBetween(SOURCE, 'isTeacherMode && !isHomeMode', LEARNER))
      .toThrow(/Anchor not found.*isHomeMode/s);
  });

  it('anchors in the wrong order say so, rather than returning an empty region', () => {
    expect(() => sliceBetween(SOURCE, LEARNER, TEACHER)).toThrow(/wrong order/);
  });

  it('messages carry the label and file, and point at the closest surviving line', () => {
    let message = '';
    try {
      sliceBetween(SOURCE, TEACHER, "onClose={handleCloseDashboardRenamed}", { file: 'AlloFlowANTI.txt', label: 'teacher branch' });
    } catch (error) { message = error.message; }
    expect(message).toContain('teacher branch');
    expect(message).toContain('AlloFlowANTI.txt');
    expect(message).toContain('Closest surviving text is line');
    expect(message).toContain('onClose={handleCloseDashboard}');
  });

  it('an occurrence that does not exist throws rather than falling back to the first', () => {
    expect(() => sliceBetween(SOURCE, TEACHER, null, { occurrence: 3 })).toThrow(/occurs only 1 time/);
  });
});

describe('indexOfOrThrow and expectAnchorCount', () => {
  it('returns the index when present and throws when absent', () => {
    expect(indexOfOrThrow(SOURCE, '<TeacherDashboard')).toBe(SOURCE.indexOf('<TeacherDashboard'));
    expect(indexOfOrThrow(SOURCE, 'onClose={handleCloseDashboard}', { from: SOURCE.indexOf(LEARNER) }))
      .toBeGreaterThan(SOURCE.indexOf(LEARNER));
    expect(() => indexOfOrThrow(SOURCE, 'nothing like this here')).toThrow(/Anchor not found/);
    expect(() => indexOfOrThrow(SOURCE, '')).toThrow(TypeError);
    expect(() => indexOfOrThrow(null, 'x')).toThrow(TypeError);
  });

  it('counts anchors, so a duplicate or a vanished pin is caught', () => {
    expect(expectAnchorCount(SOURCE, TEACHER)).toBe(1);
    expect(expectAnchorCount(SOURCE, 'onClose={handleCloseDashboard}', 2)).toBe(2);
    expect(() => expectAnchorCount(SOURCE + '\n' + TEACHER, TEACHER)).toThrow(/appears 2 time\(s\), expected 1/);
    expect(() => expectAnchorCount(SOURCE, 'gone')).toThrow(/appears 0 time\(s\)/);
  });

  it('long anchors are truncated in messages so a failure stays readable', () => {
    const long = 'x'.repeat(400);
    let message = '';
    try { indexOfOrThrow(SOURCE, long); } catch (error) { message = error.message; }
    expect(message).toContain('…');
    expect(message.length).toBeLessThan(400);
  });
});
