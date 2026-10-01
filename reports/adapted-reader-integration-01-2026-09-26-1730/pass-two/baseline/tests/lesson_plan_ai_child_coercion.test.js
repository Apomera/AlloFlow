// Lesson-plan overview lists must not hand an AI object to React (2026-09-20).
//
// The overview renders Objectives / Materials / Assessment as `{item}` inside a
// map. Those lists are built by a local `list()` helper that already maps every
// entry through _lessonPlanText, so in practice nothing but a string reached
// React — but the safety lived one hop away, in a helper, behind a destructured
// tuple (`sections.map(([title, items]) => ...)`).
//
// That is fragile in two directions: a static checker cannot prove it (the AI
// object-child gate reported the site as unguarded), and a future edit that
// builds `sections` from anything other than list() would silently start
// shipping objects to React, which blanks the whole lesson plan.
//
// Coercing at the render site is idempotent for strings, so behaviour is
// unchanged, and the guarantee is now local and visible.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'view_lesson_plan_source.jsx');
const src = fs.readFileSync(SOURCE, 'utf8');

// Load the real coercers rather than restating their behaviour here.
function loadCoercers() {
  const start = src.indexOf('function _lessonPlanTextKey');
  const end = src.indexOf('function PlanningInputsSummary');
  expect(start, '_lessonPlanTextKey should exist').toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function(
    src.slice(start, end) + '\nreturn { _lessonPlanText, _lessonPlanCriterionText };',
  )();
}

describe('the overview list coerces at the point of render', () => {
  it('renders items through _lessonPlanText, not bare', () => {
    // Scope this to the OVERVIEW list line. A whole-file `toContain` was
    // vacuous: an unrelated textarea elsewhere in the file already used
    // _lessonPlanText(item), so reverting the fix here still left the string
    // present and the assertion green. Judge the line that renders the <li>.
    const overview = src
      .split(/\r?\n/)
      .find((line) => line.includes('sections.map(([title, items])'));
    expect(overview, 'the overview list render should exist').toBeTruthy();
    expect(overview).toContain('<li key={index}>{_lessonPlanText(item)}</li>');
    expect(overview).not.toContain('<li key={index}>{item}</li>');
  });

  it('still builds the lists through the coercing helper', () => {
    // Belt and braces: the render-site guard is the backstop, not a licence to
    // drop the upstream normalisation.
    expect(src).toMatch(/const list = value =>[^\n]*\.map\(_lessonPlanText\)/);
  });
});

describe('_lessonPlanText makes every AI shape safe to render', () => {
  const { _lessonPlanText } = loadCoercers();

  it('passes strings through unchanged, so the added call is idempotent', () => {
    for (const value of ['Objective one', 'multi word text', '']) {
      expect(_lessonPlanText(value)).toBe(value);
      expect(_lessonPlanText(_lessonPlanText(value))).toBe(value);
    }
  });

  it('turns every non-string an AI can return into a string', () => {
    const shapes = [
      { foo: 'bar' },
      { text: { deep: 'x' } },
      [{ text: 'a' }, { text: 'b' }],
      42,
      true,
      null,
      undefined,
    ];
    for (const shape of shapes) {
      expect(typeof _lessonPlanText(shape), JSON.stringify(shape) || 'undefined').toBe('string');
    }
  });

  it('keeps the readable text when the model wraps it in an object', () => {
    // The point is not just "never crash" — a plan that renders '' where the
    // objective should be is still broken for the teacher.
    expect(_lessonPlanText({ text: 'Compare two ecosystems' })).toBe('Compare two ecosystems');
    expect(_lessonPlanText([{ text: 'a' }, { text: 'b' }])).toBe('a\nb');
  });
});

describe('the built module carries the fix', () => {
  it('ships the coerced render, and the deployed copy matches', () => {
    const built = fs.readFileSync(path.join(ROOT, 'view_lesson_plan_module.js'), 'utf8');
    // Same scoping point as above, but the compiler puts the map and the <li>
    // on different lines, so take a region around the map rather than one line.
    const mapAt = built.indexOf('sections.map');
    expect(mapAt, 'the built overview render should exist').toBeGreaterThan(-1);
    const builtOverview = built.slice(mapAt, mapAt + 900);
    expect(builtOverview).toContain('_lessonPlanText(item)');

    const deployed = path.join(ROOT, 'desktop/web-app/public/view_lesson_plan_module.js');
    if (fs.existsSync(deployed)) {
      expect(fs.readFileSync(deployed, 'utf8')).toBe(built);
    }
  });
});
