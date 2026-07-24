import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Sunday Plan accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalSundayPlan(props) {');
  const end = source.indexOf('  // ── ZZZ. PERSONAL FRIENDSHIP TRACKER (Wave 15) ──', start);
  const plan = source.slice(start, end);

  it('frames the activity as flexible rather than Sunday-dependent', () => {
    expect(plan).toContain('A flexible weekly reflection for whenever your week begins.');
    expect(plan).not.toContain('Best done Sunday evening');
  });

  it('uses a named form with native submit behavior', () => {
    expect(plan).toContain("hh('form', { onSubmit: function(event) { event.preventDefault(); save(); }");
    expect(plan).toContain("'aria-labelledby': 'learning-lab-weekly-plan-form-heading'");
    expect(plan).toContain("type: 'submit'");
  });

  it('gives every prompt a stable programmatic label', () => {
    expect(plan).toContain("var inputId = 'learning-lab-weekly-plan-' + section.id");
    expect(plan).toContain("hh('label', { htmlFor: inputId");
    expect(plan).toContain("hh('textarea', { id: inputId");
  });

  it('associates prompt help with every textarea', () => {
    expect(plan).toContain("var helpId = inputId + '-help'");
    expect(plan).toContain("hh('p', { id: helpId");
    expect(plan).toContain("'aria-describedby': helpId +");
  });

  it('hides decorative prompt icons from assistive technology', () => {
    expect(plan).toContain("hh('span', { 'aria-hidden': 'true' }, section.icon + ' ')");
  });

  it('bounds every response and supports multiline entry', () => {
    expect(plan).toContain("hh('textarea'");
    expect(plan).toContain('rows: 3, maxLength: 6000');
    expect(plan).toContain("resize: 'vertical'");
  });

  it('requires content in any prompt rather than one prescribed prompt', () => {
    expect(plan).toContain("SECTIONS.some(function(section) { return !!answers[section.id]; })");
    expect(plan).toContain('Add a response to at least one prompt before saving.');
    expect(plan).not.toContain('required: true');
  });

  it('reports empty submission inline and focuses the first prompt', () => {
    expect(plan).toContain("id: 'learning-lab-weekly-plan-error', role: 'alert'");
    expect(plan).toContain("'aria-invalid': index === 0 && formError ? 'true' : undefined");
    expect(plan).toContain("llAnnounce('Weekly plan not saved. Add a response first.')");
    expect(plan).toContain("focusById('learning-lab-weekly-plan-wins')");
    expect(plan).not.toContain('alert(');
  });

  it('trims all responses before saving', () => {
    expect(plan).toContain("answers[section.id] = String(form[section.id] || '').trim()");
  });

  it('preserves unrelated data while adding a plan', () => {
    expect(plan).toContain("setData(Object.assign({}, data, { plans: [plan].concat(data.plans || []) }))");
  });

  it('clears the form, announces saving, and restores focus', () => {
    expect(plan).toContain("setForm(emptyForm); setFormError('')");
    expect(plan).toContain("llAnnounce('Weekly plan saved in this browser.')");
    expect(plan).toContain("focusById('learning-lab-weekly-plan-wins')");
  });

  it('discloses sensitive local storage', () => {
    expect(plan).toContain('Plans save in this browser and may contain sensitive information.');
    expect(plan).toContain('Avoid names or private details if other people use this device.');
    expect(plan).toContain("'aria-describedby': 'learning-lab-weekly-plan-privacy'");
  });

  it('always provides a named history section and useful empty state', () => {
    expect(plan).toContain("hh('section', { 'aria-labelledby': 'learning-lab-weekly-plan-history-heading'");
    expect(plan).toContain("id: 'learning-lab-weekly-plan-history-heading', tabIndex: -1");
    expect(plan).toContain('No weekly plans saved yet.');
  });

  it('uses a semantic newest-first list of labeled articles', () => {
    expect(plan).toContain("hh('ul', { 'aria-label': 'Saved weekly plans, newest first'");
    expect(plan).toContain("hh('article', { 'aria-labelledby': headingId");
    expect(plan).toContain("hh('h3', { id: headingId");
    expect(plan).not.toContain('plans.slice(0, 10)');
  });

  it('uses time semantics for saved dates and handles missing legacy dates', () => {
    expect(plan).toContain("hh('time', { dateTime: plan.date || undefined }, plan.date || 'date unavailable')");
  });

  it('keeps every nonempty saved response available', () => {
    expect(plan).toContain('function savedAnswers(plan)');
    expect(plan).toContain("'aria-label': 'Weekly plan responses'");
    expect(plan).toContain("hh('dt'");
    expect(plan).toContain("hh('dd'");
  });

  it('uses a keyboard-operable native disclosure for complete records', () => {
    expect(plan).toContain("hh('details'");
    expect(plan).toContain("hh('summary'");
    expect(plan).toContain("'Review complete plan'");
    expect(plan).toContain("alignItems: 'center', minHeight: 44");
  });

  it('preserves response whitespace and wraps long content', () => {
    expect(plan).toContain("whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'");
  });

  it('confirms removal while preserving unrelated data', () => {
    expect(plan).toContain("title: 'Remove this weekly plan?', confirmText: 'Remove plan'");
    expect(plan).toContain('This cannot be undone.');
    expect(plan).toContain("setData(Object.assign({}, data, { plans: (data.plans || []).filter");
  });

  it('provides contextual removal names, announcement, and focus recovery', () => {
    expect(plan).toContain("'aria-label': 'Remove weekly plan from '");
    expect(plan).toContain("llAnnounce('Saved weekly plan removed.')");
    expect(plan).toContain("focusById('learning-lab-weekly-plan-history-heading')");
  });

  it('uses 44-pixel fields and controls', () => {
    expect(plan).toContain("width: '100%', minHeight: 88");
    expect(plan).toContain('minWidth: 44, minHeight: 44');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
