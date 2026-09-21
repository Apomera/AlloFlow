// The Lesson Plan instructions box is dropped for parents and independent
// learners on the sidebar path.
//
// Three prompt builders back the one panel:
//   teacher     -> buildLessonPlanPrompt
//   parent      -> buildParentGuidePrompt   ("family guide")
//   independent -> buildStudyGuidePrompt    ("study guide")
//
// All three accept customAdditions -- the panel's free-text instructions box,
// added 2026-07-28 -- and all three interpolate it into the prompt. There are
// TWO entry points:
//
//   Full Pack / dispatcher (generate_dispatcher_source.jsx ~7558) passes it to
//   all three branches.
//
//   Sidebar (concept_map_handlers_source.jsx ~655) passed it ONLY to the
//   teacher branch. customAdditions is a plain positional parameter with no
//   default (the ANTI adapter at buildStudyGuidePrompt just forwards it), so
//   omitting it sends undefined and hasCustom is false. A parent typing "focus
//   on fractions, he gets frustrated with word problems" into a box the panel
//   renders for them got it silently discarded -- but only via the sidebar
//   button, not via Full Pack.
//
// This is the same divergence class the comment directly above that call site
// already documents for LANGUAGE ("the lesson plan is inconsistent about
// honouring a non-English output language ... it was never model flakiness").
// Same two entry points, same shape, a second field.
//
// Second defect, same area: both non-teacher builders labelled the text
// "TEACHER REQUESTS" inside a study guide written for a lone adult learner and
// a family guide written for a caregiver. The model is told a teacher asked for
// something that a parent or the learner themselves asked for.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';

let cmap, dispatcher, prompts, sidebar;

beforeAll(() => {
  cmap = readFileSync('concept_map_handlers_source.jsx', 'utf8');
  dispatcher = readFileSync('generate_dispatcher_source.jsx', 'utf8');
  prompts = readFileSync('prompts_library_source.jsx', 'utf8');
  sidebar = readFileSync('view_sidebar_panels_source.jsx', 'utf8');
});

describe('the premise: the box is shown to these roles', () => {
  it('the Lesson Plan panel renders the instructions box and knows about parent mode', () => {
    expect(sidebar).toContain('value={lessonCustomAdditions} onChange={setLessonCustomAdditions}');
    expect(sidebar).toContain('const lessonPlanActionLabel = isParentMode');
  });

  it('all three builders accept and interpolate customAdditions', () => {
    for (const fn of ['buildParentGuidePrompt', 'buildStudyGuidePrompt']) {
      const i = prompts.indexOf('const ' + fn + ' = ({');
      expect(i).toBeGreaterThan(-1);
      const body = prompts.slice(i, i + 3000);
      expect(body).toContain('customAdditions');
      expect(body).toContain('const hasCustom = customAdditions && customAdditions.trim().length > 0;');
    }
  });
});

describe('the sidebar path passes the instructions box for every role', () => {
  // Matched tolerantly of the mixed CRLF/LF in this file.
  const call = (name) => new RegExp('prompt = ' + name + '\(([^)]*)\)');

  it('study guide (independent) receives customAdditions', () => {
    const m = cmap.match(call('buildStudyGuidePrompt'));
    expect(m).toBeTruthy();
    expect(m[1]).toContain('lessonCustomAdditions');
  });

  it('family guide (parent) receives customAdditions', () => {
    const m = cmap.match(call('buildParentGuidePrompt'));
    expect(m).toBeTruthy();
    expect(m[1]).toContain('lessonCustomAdditions');
  });

  it('the teacher branch still receives it (unchanged)', () => {
    const m = cmap.match(call('buildLessonPlanPrompt'));
    expect(m).toBeTruthy();
    expect(m[1]).toContain('lessonCustomAdditions');
  });
});

describe('the dispatcher path already passed it, and still does', () => {
  it.each(['buildStudyGuidePrompt', 'buildParentGuidePrompt'])('%s receives custom instructions', (fn) => {
    const m = dispatcher.match(new RegExp('prompt = ' + fn + '\(([^)]*)\)'));
    expect(m).toBeTruthy();
    expect(m[1]).toContain('effCustomInstructions');
  });
});

describe('the instruction label names who actually asked', () => {
  it('the study guide does not attribute the learner\'s own request to a teacher', () => {
    const i = prompts.indexOf('const buildStudyGuidePrompt = ({');
    const body = prompts.slice(i, i + 3000);
    expect(body).not.toContain('TEACHER REQUESTS');
  });

  it('the family guide does not attribute the caregiver\'s request to a teacher', () => {
    const i = prompts.indexOf('const buildParentGuidePrompt = ({');
    const body = prompts.slice(i, i + 3000);
    expect(body).not.toContain('TEACHER REQUESTS');
  });

  it('the teacher lesson plan keeps its own wording', () => {
    const i = prompts.indexOf('const buildLessonPlanPrompt = ({');
    expect(i).toBeGreaterThan(-1);
    const body = prompts.slice(i, i + 6000);
    // It already used the role-neutral wording; the two guide builders were
    // the outliers, so this is the form they were brought in line WITH.
    expect(body).toContain('USER CUSTOM REQUESTS');
  });
});
