import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Exam Prep revised accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalExamPrep(props) {');
  const end = source.indexOf('  function PersonalTaskBreaker(props)', start);
  const planner = source.slice(start, end);

  it('uses stable headings and effect-based focus restoration', () => {
    expect(planner).toContain("'learning-lab-exam-heading'");
    expect(planner).toContain("'learning-lab-exam-form-heading'");
    expect(planner).toContain("'learning-lab-exam-plans-heading'");
    expect(planner).toContain('document.getElementById(focusTarget)');
  });

  it('uses date-only arithmetic that does not change with time of day', () => {
    expect(planner).toContain('Date.UTC(parts[0], parts[1] - 1, parts[2])');
    expect(planner).toContain('target - current');
    expect(planner).not.toContain("new Date(iso + 'T12:00:00').getTime()");
    expect(planner).not.toContain('Math.ceil((target - now) / 86400000)');
  });

  it('requires tomorrow or later so every new plan has a study day', () => {
    expect(planner).toContain('min: tomorrowISO()');
    expect(planner).toContain('Choose tomorrow or a later date');
    expect(planner).toContain("daysUntil(form.date) <= 0 ? 'Choose a future exam date.'");
  });

  it('uses a named native form with an explicit submit button', () => {
    expect(planner).toContain("hh('form', { 'aria-labelledby': 'learning-lab-exam-form-heading', onSubmit: submitExam }");
    expect(planner).toContain("type: 'submit', 'data-ll-focusable': true");
  });

  it('labels and bounds all four required fields', () => {
    for (const id of ['learning-lab-exam-name', 'learning-lab-exam-date', 'learning-lab-exam-units', 'learning-lab-exam-minutes']) {
      expect(planner).toContain(`htmlFor: '${id}'`);
      expect(planner).toContain(`id: '${id}'`);
    }
    expect(planner).toContain("required: true, maxLength: 240");
    expect(planner).toContain("type: 'number', min: 1, max: 50, step: 1, required: true");
    expect(planner).toContain("type: 'number', min: 15, max: 240, step: 15, required: true");
  });

  it('uses an adaptive numeric-field layout', () => {
    expect(planner).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))'");
    expect(planner).not.toContain("gridTemplateColumns: '1fr 1fr'");
  });

  it('provides separate inline alerts for every invalid field', () => {
    for (const id of ['name', 'date', 'units', 'minutes']) {
      expect(planner).toContain(`id: 'learning-lab-exam-${id}-error', role: 'alert'`);
    }
  });

  it('keeps date help associated when a date error appears', () => {
    expect(planner).toContain("'aria-describedby': 'learning-lab-exam-date-help' + (errors.date ? ' learning-lab-exam-date-error' : '')");
  });

  it('focuses the first invalid field and announces the validation summary', () => {
    expect(planner).toContain("var invalidId = nextErrors.name ? 'learning-lab-exam-name'");
    expect(planner).toContain('setFocusTarget(invalidId)');
    expect(planner).toContain("llAnnounce('The exam plan has invalid or missing information.')");
  });

  it('clears individual validation errors during editing', () => {
    expect(planner).toContain("if (errors.name) setErrors(Object.assign({}, errors, { name: '' }))");
    expect(planner).toContain("if (errors.date) setErrors(Object.assign({}, errors, { date: '' }))");
    expect(planner).toContain("if (errors.units) setErrors(Object.assign({}, errors, { units: '' }))");
    expect(planner).toContain("if (errors.dailyMin) setErrors(Object.assign({}, errors, { dailyMin: '' }))");
  });

  it('preserves sibling state on create, toggle, and delete', () => {
    expect(planner).toContain("setData(Object.assign({}, data, { exams: [exam].concat(data.exams || []) }))");
    expect(planner).toContain("setData(Object.assign({}, data, { exams: exams }))");
    expect(planner).toContain("setData(Object.assign({}, data, { exams: remaining }))");
    expect(planner).not.toContain('setData({ exams:');
  });

  it('announces create, cancel, completion toggle, and deletion outcomes', () => {
    expect(planner).toContain("llAnnounce('Exam prep plan generated.')");
    expect(planner).toContain("llAnnounce('Exam plan creation canceled.')");
    expect(planner).toContain("(wasDone ? 'Marked incomplete: ' : 'Marked complete: ')");
    expect(planner).toContain("llAnnounce('Exam prep plan deleted.')");
  });

  it('uses a qualified named note for the scheduling heuristic', () => {
    expect(planner).toContain("'aria-labelledby': 'learning-lab-exam-note-heading'");
    expect(planner).toContain('This is a planning heuristic, not a guarantee of learning or exam performance.');
    expect(planner).not.toContain('Spaced practice + review baked in.');
  });

  it('renders saved exams as a named semantic list', () => {
    expect(planner).toContain("hh('ul', { 'aria-labelledby': 'learning-lab-exam-plans-heading'");
    expect(planner).toContain("return hh('li', { key: 'e-' + exam.id");
  });

  it('uses machine-readable exam and study-day dates', () => {
    expect(planner).toContain("hh('time', { dateTime: exam.date }, exam.date)");
    expect(planner).toContain("hh('time', { dateTime: planDay.day }, planDay.day)");
  });

  it('spells out days, units, chapters, and minutes', () => {
    expect(planner).toContain("' day until exam' : ' days until exam'");
    expect(planner).toContain("' unit or chapter' : ' units or chapters'");
    expect(planner).toContain("minutes + (minutes === 1 ? ' minute' : ' minutes')");
    expect(planner).not.toContain("days + 'd'");
    expect(planner).not.toContain("exam.dailyMin + 'm/day'");
  });

  it('uses a semantic ordered list for generated study days', () => {
    expect(planner).toContain("hh('ol', { style:");
    expect(planner).toContain("return hh('li', { key: 'pl-' + planDay.day }");
  });

  it('provides descriptive pressed completion controls without opacity', () => {
    expect(planner).toContain("'aria-pressed': done ? 'true' : 'false'");
    expect(planner).toContain("'aria-label': (done ? 'Mark incomplete: ' : 'Mark complete: ')");
    expect(planner).toContain("width: '100%', minHeight: 64");
    expect(planner).not.toContain('opacity: done');
  });

  it('uses high-contrast phase colors and visible text labels', () => {
    expect(planner).toContain("'#fca5a5'");
    expect(planner).toContain("'#fde68a'");
    expect(planner).toContain("'#6ee7b7'");
    expect(planner).toContain('Review covered material');
    expect(planner).toContain('Practice retrieval');
  });

  it('makes every generated day accessible through an expanded control', () => {
    expect(planner).toContain('var visiblePlan = showAll ? plan : plan.slice(0, 14)');
    expect(planner).toContain("'aria-expanded': showAll ? 'true' : 'false'");
    expect(planner).toContain("'Show all ' + plan.length + ' days'");
    expect(planner).not.toContain("'+ ' + (plan.length - 14) + ' more days'");
  });

  it('uses item-specific full-size deletion with confirmation and focus recovery', () => {
    expect(planner).toContain("'aria-label': 'Delete exam prep plan: ' + examName");
    expect(planner).toContain("title: 'Delete this exam prep plan?', confirmText: 'Delete plan'");
    expect(planner).toContain("setFocusTarget(remaining.length ? 'learning-lab-exam-plans-heading' : 'learning-lab-exam-new-button')");
    expect(planner).toContain('minHeight: 44');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
