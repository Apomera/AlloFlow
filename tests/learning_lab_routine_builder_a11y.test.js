import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Routine Builder accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalRoutineBuilder(props) {');
  const end = source.indexOf('  function PersonalPriorities(props) {', start);
  const routines = source.slice(start, end);

  it('uses a named creation form with native submit behavior', () => {
    expect(routines).toContain("onSubmit: function(event) { event.preventDefault(); createRoutine(); }");
    expect(routines).toContain("'aria-labelledby': 'learning-lab-routine-create-heading'");
    expect(routines).toContain("id: 'learning-lab-routine-create-heading'");
    expect(routines).toContain("type: 'submit'");
  });

  it('associates a visible required label with the routine name', () => {
    expect(routines).toContain("htmlFor: 'learning-lab-routine-title'");
    expect(routines).toContain("'Routine name (required)'");
    expect(routines).toContain("id: 'learning-lab-routine-title', type: 'text', value: newTitle, required: true, maxLength: 500");
  });

  it('reports and focuses an empty routine name inline', () => {
    expect(routines).toContain("setCreateError('Enter a name for this routine.')");
    expect(routines).toContain("focusById('learning-lab-routine-title')");
    expect(routines).toContain("id: 'learning-lab-routine-title-error', role: 'alert'");
    expect(routines).toContain("'aria-invalid': createError ? 'true' : undefined");
  });

  it('uses a fieldset, legend, and native radios for routine type', () => {
    expect(routines).toContain("hh('fieldset'");
    expect(routines).toContain("hh('legend', { style: labelStyle }, 'Routine type')");
    expect(routines).toContain("type: 'radio', name: 'learning-lab-routine-type'");
    expect(routines).toContain('checked: selected');
  });

  it('marks type emoji decorative while retaining type text', () => {
    expect(routines).toContain("hh('span', { 'aria-hidden': 'true' }, type.icon)");
    expect(routines).toContain('type.label');
  });

  it('preserves unrelated data, announces creation, and focuses the editor', () => {
    expect(routines).toContain("setData(Object.assign({}, data, { routines: [routine].concat(data.routines || []) }))");
    expect(routines).toContain("llAnnounce('Routine created: ' + title + '. Add the first step.')");
    expect(routines).toContain("focusById('learning-lab-routine-editor-heading')");
  });

  it('does not mutate view state while rendering a missing routine', () => {
    expect(routines).toContain("if (!routine) {");
    expect(routines).toContain("'Routine unavailable'");
    expect(routines).not.toContain("if (!r) { setView('list'); return null; }");
  });

  it('uses a named step form with visible labels', () => {
    expect(routines).toContain("onSubmit: function(event) { event.preventDefault(); addStep(routine); }");
    expect(routines).toContain("'aria-labelledby': 'learning-lab-routine-step-form-heading'");
    expect(routines).toContain("htmlFor: 'learning-lab-routine-step-text'");
    expect(routines).toContain("htmlFor: 'learning-lab-routine-step-minutes'");
  });

  it('uses native constraints and script validation for step duration', () => {
    expect(routines).toContain("type: 'number', min: 1, max: 240, step: 1");
    expect(routines).toContain("Number.isFinite(number) && number >= 1 && number <= 240");
    expect(routines).toContain("'Enter a whole number from 1 through 240 minutes.'");
    expect(routines).toContain("'1 to 240 minutes.'");
  });

  it('reports and focuses invalid step fields inline', () => {
    expect(routines).toContain("'Enter a description for this step.'");
    expect(routines).toContain("id: 'learning-lab-routine-step-text-error', role: 'alert'");
    expect(routines).toContain("id: 'learning-lab-routine-step-minutes-error', role: 'alert'");
    expect(routines).toContain("focusById(nextErrors.text ? 'learning-lab-routine-step-text' : 'learning-lab-routine-step-minutes')");
  });

  it('saves normalized step values while preserving unrelated data', () => {
    expect(routines).toContain("var step = { id: tkId(), text: text, mins: mins };");
    expect(routines).toContain("setData(Object.assign({}, data, { routines: (data.routines || []).map");
    expect(routines).toContain("llAnnounce('Routine step added: ' + text)");
  });

  it('confirms removing a step and restores focus', () => {
    expect(routines).toContain("title: 'Remove this routine step?', confirmText: 'Remove step'");
    expect(routines).toContain("llAnnounce('Routine step removed.')");
    expect(routines).toContain("focusById('learning-lab-routine-steps-heading')");
  });

  it('confirms before discarding an unsaved step draft', () => {
    expect(routines).toContain("title: 'Discard this step draft?', confirmText: 'Discard step'");
    expect(routines).toContain('Return to all routines and discard the unsaved step?');
  });

  it('exposes today completion as a reversible pressed button', () => {
    expect(routines).toContain("'aria-pressed': todayDone ? 'true' : 'false'");
    expect(routines).toContain("todayDone ? 'Completed today — undo' : 'Mark complete today'");
    expect(routines).toContain("llAnnounce(completed ? 'Today’s completion removed.' : 'Routine marked complete for today.')");
  });

  it('deduplicates completion dates and preserves unrelated data', () => {
    expect(routines).toContain("filter(function(date, index, list) { return list.indexOf(date) === index; })");
    expect(routines).toContain("updateRoutine(routine.id, { completions: next })");
  });

  it('calculates a clearly bounded streak using UTC date arithmetic', () => {
    expect(routines).toContain('function streakEndingToday(routine)');
    expect(routines).toContain('new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))');
    expect(routines).toContain('consecutive days ending today.');
  });

  it('uses a named ordered list and labeled articles for steps', () => {
    expect(routines).toContain("'aria-labelledby': 'learning-lab-routine-steps-heading'");
    expect(routines).toContain("hh('ol'");
    expect(routines).toContain("hh('li', { key: 'rs-' + step.id");
    expect(routines).toContain("hh('article', { 'aria-label': String(step.text || 'Untitled step')");
  });

  it('names step deletion controls and provides textual durations', () => {
    expect(routines).toContain("'aria-label': 'Remove routine step: ' + String(step.text || 'Untitled step')");
    expect(routines).toContain("+ ' minutes'");
  });

  it('confirms routine deletion before changing the view', () => {
    expect(routines).toContain("title: 'Delete this routine?', confirmText: 'Delete routine'");
    expect(routines).toContain('This cannot be undone.');
    expect(routines).not.toContain("confirm('Delete this routine?')");
  });

  it('announces routine deletion and restores list focus', () => {
    expect(routines).toContain("llAnnounce('Routine deleted.')");
    expect(routines).toContain("focusById('learning-lab-routine-list-heading')");
  });

  it('uses a named semantic routine list with separate actions', () => {
    expect(routines).toContain("'aria-labelledby': 'learning-lab-routine-list-heading'");
    expect(routines).toContain("hh('ul', { 'aria-label': routines.length");
    expect(routines).toContain("return hh('li', { key: 'ru-' + routine.id }");
    expect(routines).toContain("hh('article', { 'aria-labelledby': headingId");
    expect(routines).toContain("'Open routine'");
  });

  it('uses time semantics and complete textual summaries on routine cards', () => {
    expect(routines).toContain("hh('time', { dateTime: routine.createdAt || undefined }, relDate(routine.createdAt))");
    expect(routines).toContain("' step' : ' steps'");
    expect(routines).toContain("' dates.'");
  });

  it('discloses local storage and shared-device privacy considerations', () => {
    expect(routines).toContain('Routines and completion dates save in this browser.');
    expect(routines).toContain('if other people use this device.');
    expect(routines).toContain("'aria-describedby': 'learning-lab-routine-privacy-note'");
  });

  it('uses neutral copy without a fixed 30-day habit claim', () => {
    expect(routines).toContain('Build a reusable sequence of steps with optional time estimates.');
    expect(routines).not.toContain('30 days to lock in');
  });

  it('provides responsive forms and 44-pixel targets', () => {
    expect(routines).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))'");
    expect(routines).toContain("width: '100%', minHeight: 44");
    expect(routines).toContain("minWidth: 44, minHeight: 44");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
