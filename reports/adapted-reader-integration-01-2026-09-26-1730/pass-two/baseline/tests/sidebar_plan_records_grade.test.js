// A sidebar-generated lesson plan must record the grade it was made for.
//
// Saved plans are read back later. handleGenerateExtensionGuide
// (host_handlers_source.jsx ~4389) resolves the grade through a fallback chain:
//
//   savedPlan.config?.gradeLevel ?? savedPlan.config?.grade
//     ?? savedPlan.targetGradeLevel
//     ?? savedPlan.instructionalText?.complexity?.requestedGrade
//     ?? savedPlan.gradeLevel ?? savedPlan.grade
//
// and when every link is missing it puts "Target Grade: Not recorded in this
// lesson" into the prompt -- deliberately, rather than inventing a grade.
//
// The dispatcher's save path fills that chain via _buildItemConfig(), which
// records grade, language, standards, dok, interests, customInstructions,
// provenance and more. The sidebar Lesson Plan button hand-builds its own
// record with exactly two config fields -- { language, generationInputs } --
// so NONE of the chain resolved. Same plan, same panel, and the extension
// guides came out ungraded depending on which button made it.
//
// Scope note: the sidebar handler only has gradeLevel in its deps, and that is
// the field with demonstrated downstream impact, so this fixes that one rather
// than widening the deps for fields nothing has been shown to read back.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';

let cmap, host, dispatcher;

beforeAll(() => {
  cmap = readFileSync('concept_map_handlers_source.jsx', 'utf8');
  host = readFileSync('host_handlers_source.jsx', 'utf8');
  dispatcher = readFileSync('generate_dispatcher_source.jsx', 'utf8');
});

// The saved-record literal the sidebar builds.
const sidebarRecord = () => {
  const i = cmap.indexOf('const newItem = {');
  expect(i).toBeGreaterThan(-1);
  const end = cmap.indexOf('};', i);
  return cmap.slice(i, end + 2);
};

describe('the premise: a missing grade is user-visible downstream', () => {
  it('the extension guide resolves a grade chain and says so when it finds none', () => {
    expect(host).toContain("savedPlan.config?.gradeLevel ?? savedPlan.config?.grade");
    expect(host).toContain("'Not recorded in this lesson'");
  });

  it('the dispatcher records grade on every item it saves', () => {
    const i = dispatcher.indexOf('const _buildItemConfig = (extra) => Object.assign({');
    expect(i).toBeGreaterThan(-1);
    expect(dispatcher.slice(i, i + 1200)).toContain('grade: effectiveGrade,');
  });
});

describe('the sidebar plan records its grade too', () => {
  it('writes gradeLevel into CONFIG, satisfying the first link of the chain', () => {
    // Must assert on the config object, not the record: `meta` already
    // interpolates gradeLevel, so a bare /gradeLevel/ match over the whole
    // record passes even when config omits it. That is how the first draft of
    // this test went green against the unfixed code.
    const rec = sidebarRecord();
    const cfg = rec.slice(rec.indexOf('config:'));
    expect(cfg).toContain('gradeLevel');
  });

  it('still records the language it resolved', () => {
    // The earlier pseudo-value fix must not be undone by this one.
    expect(sidebarRecord()).toContain('language: planLanguage');
  });

  it('still records the planning inputs trace', () => {
    expect(sidebarRecord()).toContain('generationInputs');
  });
});

describe('the resolution chain, exercised', () => {
  // Mirrors host_handlers_source.jsx ~4389 exactly. A saved plan shaped like
  // the sidebar's OLD record resolves to nothing; shaped like the new one it
  // resolves to the grade.
  const resolveGrade = (savedPlan) =>
    savedPlan.config?.gradeLevel ?? savedPlan.config?.grade ?? savedPlan.targetGradeLevel
      ?? savedPlan.instructionalText?.complexity?.requestedGrade
      ?? savedPlan.gradeLevel ?? savedPlan.grade;

  it('the OLD sidebar record resolves to nothing', () => {
    const old = { type: 'lesson-plan', config: { language: 'English', generationInputs: {} } };
    expect(resolveGrade(old)).toBeUndefined();
  });

  it('the NEW sidebar record resolves to the grade', () => {
    const now = { type: 'lesson-plan', config: { gradeLevel: '4th Grade', language: 'English', generationInputs: {} } };
    expect(resolveGrade(now)).toBe('4th Grade');
  });

  it('a dispatcher-shaped record still resolves, via config.grade', () => {
    const disp = { type: 'lesson-plan', config: { grade: '7th Grade', language: 'English' } };
    expect(resolveGrade(disp)).toBe('7th Grade');
  });

  it('an unresolvable grade is what produces the "Not recorded" prompt line', () => {
    const grade = resolveGrade({ type: 'lesson-plan', config: {} });
    const line = (grade == null || grade === '') ? 'Not recorded in this lesson' : grade;
    expect(line).toBe('Not recorded in this lesson');
  });
});
