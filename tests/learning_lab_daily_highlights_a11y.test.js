import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Daily Moments accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalHighlights(props) {');
  const end = source.indexOf('  function PersonalLifeSkills(props) {', start);
  const daily = source.slice(start, end);

  it('uses inclusive framing for positive, difficult, neutral, and mixed days', () => {
    expect(daily).toContain("'Daily Moments'");
    expect(daily).toContain('positive, difficult, neutral, unfinished, ordinary, or mixed');
    expect(daily).not.toContain('highest-value moments');
    expect(daily).not.toContain('3 brightest moments');
  });

  it('states that the reflection is not a productivity or success measure', () => {
    expect(daily).toContain('not a measure of gratitude, productivity, or success');
    expect(daily).not.toContain('Specific. Achievable.');
  });

  it('uses a named form with native submit behavior', () => {
    expect(daily).toContain("onSubmit: function(event) { event.preventDefault(); save(); }");
    expect(daily).toContain("'aria-labelledby': 'learning-lab-daily-form-heading'");
    expect(daily).toContain("type: 'submit'");
  });

  it('groups moments in a fieldset and legend', () => {
    expect(daily).toContain("hh('fieldset'");
    expect(daily).toContain("hh('legend'");
    expect(daily).toContain("'Up to three moments (optional)'");
  });

  it('associates visible labels with all moment fields', () => {
    expect(daily).toContain("htmlFor: inputId");
    expect(daily).toContain("'Moment ' + (index + 1)");
    expect(daily).toContain("id: inputId, type: 'text', value: moment, maxLength: 2000");
  });

  it('associates visible labels with the optional note and tomorrow thought', () => {
    expect(daily).toContain("htmlFor: 'learning-lab-daily-note'");
    expect(daily).toContain("htmlFor: 'learning-lab-daily-tomorrow'");
  });

  it('reports and focuses an entirely empty reflection', () => {
    expect(daily).toContain("setFormError('Enter at least one moment, note, or thought before saving.')");
    expect(daily).toContain("id: 'learning-lab-daily-error', role: 'alert'");
    expect(daily).toContain("focusById('learning-lab-daily-moment-1')");
  });

  it('accepts content in any one optional field', () => {
    expect(daily).toContain("form.moments.some(function(moment) { return moment.trim(); }) || form.lesson.trim() || form.tomorrow.trim()");
  });

  it('trims values and preserves unrelated data when saving', () => {
    expect(daily).toContain("form.moments.map(function(moment) { return moment.trim(); })");
    expect(daily).toContain("lesson: form.lesson.trim(), tomorrow: form.tomorrow.trim()");
    expect(daily).toContain("setData(Object.assign({}, data, { highlights: [entry].concat(data.highlights || []) }))");
  });

  it('announces saving and restores form focus', () => {
    expect(daily).toContain("llAnnounce('Daily reflection saved in this browser.')");
    expect(daily).toContain("focusById('learning-lab-daily-moment-1')");
  });

  it('uses a named semantic history list with labeled articles', () => {
    expect(daily).toContain("'aria-labelledby': 'learning-lab-daily-history-heading'");
    expect(daily).toContain("hh('ul', { 'aria-label': 'Most recent daily reflections'");
    expect(daily).toContain("hh('article', { 'aria-labelledby': headingId");
    expect(daily).toContain("hh('h3', { id: headingId");
  });

  it('uses time semantics and textual entry summaries', () => {
    expect(daily).toContain("hh('time', { dateTime: entry.date || undefined }, relDate(entry.date))");
    expect(daily).toContain("moments.length === 1 ? ' saved moment' : ' saved moments'");
  });

  it('renders recorded moments as a semantic list', () => {
    expect(daily).toContain("'aria-label': 'Recorded moments'");
    expect(daily).toContain("moments.map(function(moment, index) { return hh('li'");
  });

  it('preserves whitespace and wraps long saved content', () => {
    expect(daily).toContain("whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'");
  });

  it('confirms removal while preserving unrelated data', () => {
    expect(daily).toContain("title: 'Remove this reflection?', confirmText: 'Remove reflection'");
    expect(daily).toContain('This cannot be undone.');
    expect(daily).toContain("setData(Object.assign({}, data, { highlights: (data.highlights || []).filter");
  });

  it('names removal controls, announces removal, and restores focus', () => {
    expect(daily).toContain("'aria-label': 'Remove daily reflection with '");
    expect(daily).toContain("llAnnounce('Saved daily reflection removed.')");
    expect(daily).toContain("focusById('learning-lab-daily-history-heading')");
  });

  it('discloses local storage and shared-device privacy', () => {
    expect(daily).toContain('Daily notes save in this browser.');
    expect(daily).toContain('if other people use this device.');
    expect(daily).toContain("'aria-describedby': 'learning-lab-daily-privacy-note'");
  });

  it('uses 44-pixel fields and controls', () => {
    expect(daily).toContain("width: '100%', minHeight: 44");
    expect(daily).toContain("minWidth: 44, minHeight: 44");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
