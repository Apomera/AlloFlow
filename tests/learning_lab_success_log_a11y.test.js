import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Personal Success Log accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalSuccessLog(props) {');
  const end = source.indexOf('  function PersonalTeacherEmail(props) {', start);
  const successLog = source.slice(start, end);

  it('uses a named form with native submit behavior', () => {
    expect(successLog).toContain("onSubmit: function(event) { event.preventDefault(); save(); }");
    expect(successLog).toContain("'aria-labelledby': 'learning-lab-success-form-heading'");
    expect(successLog).toContain("id: 'learning-lab-success-form-heading'");
    expect(successLog).toContain("type: 'submit'");
  });

  it('uses neutral, user-directed progress language without an unsupported citation claim', () => {
    expect(successLog).toContain('Record progress in whatever size feels meaningful to you.');
    expect(successLog).toContain('Use your own words. Small steps and large milestones can both be worth recording.');
    expect(successLog).not.toContain('negativity bias');
    expect(successLog).not.toContain('Goldman 2020');
  });

  it('associates a visible required label with the progress field', () => {
    expect(successLog).toContain("htmlFor: 'learning-lab-success-text'");
    expect(successLog).toContain("'What happened? (required)'");
    expect(successLog).toContain("id: 'learning-lab-success-text', value: form.text, rows: 3, required: true");
  });

  it('reports an empty entry inline and moves focus to the field', () => {
    expect(successLog).toContain("setFormError('Describe the progress or success you want to record.')");
    expect(successLog).toContain("focusById('learning-lab-success-text')");
    expect(successLog).toContain("id: 'learning-lab-success-text-error', role: 'alert'");
    expect(successLog).toContain("'aria-invalid': formError ? 'true' : undefined");
    expect(successLog).not.toContain("alert('Need success text.')");
  });

  it('trims saved text and preserves unrelated section data', () => {
    expect(successLog).toContain('var successText = form.text.trim();');
    expect(successLog).toContain('text: successText');
    expect(successLog).toContain("setData(Object.assign({}, data, { successes: [entry].concat(rawSuccesses) }))");
  });

  it('announces saves and returns focus for another entry', () => {
    expect(successLog).toContain("llAnnounce('Progress saved: ' + successText)");
    expect(successLog).toContain('setForm(emptyForm)');
    expect(successLog).toContain("focusById('learning-lab-success-text')");
  });

  it('discloses browser storage and shared-device privacy considerations', () => {
    expect(successLog).toContain('Entries save in this browser only; saving does not send them to or notify anyone.');
    expect(successLog).toContain('Avoid private details if other people use this device.');
    expect(successLog).toContain("'aria-describedby': 'learning-lab-success-privacy-note'");
  });

  it('uses fieldsets, legends, and native radios for size and category', () => {
    expect(successLog.match(/hh\('fieldset'/g)).toHaveLength(2);
    expect(successLog).toContain("hh('legend', { style: labelStyle }, 'Size')");
    expect(successLog).toContain("hh('legend', { style: labelStyle }, 'Category')");
    expect(successLog).toContain("type: 'radio', name: 'learning-lab-success-size'");
    expect(successLog).toContain("type: 'radio', name: 'learning-lab-success-category'");
    expect(successLog).toContain('checked: selected');
  });

  it('keeps category emoji decorative while preserving category text', () => {
    expect(successLog).toContain("hh('span', { 'aria-hidden': 'true' }, category.icon), category.label");
    expect(successLog).toContain("category.label + ' · ' + size.label + ' success'");
  });

  it('provides a named live total with singular and plural count text', () => {
    expect(successLog).toContain("'aria-labelledby': 'learning-lab-success-total-heading'");
    expect(successLog).toContain("role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
    expect(successLog).toContain("successes.length === 1 ? ' success recorded.' : ' successes recorded.'");
  });

  it('uses a named semantic history list with labeled articles', () => {
    expect(successLog).toContain("'aria-labelledby': 'learning-lab-success-history-heading'");
    expect(successLog).toContain("hh('ul', { 'aria-label': 'Most recent success entries'");
    expect(successLog).toContain("return hh('li', { key: 'sl-' + entry.id }");
    expect(successLog).toContain("hh('article', {");
    expect(successLog).toContain("'aria-labelledby': headingId");
  });

  it('communicates category and size with text in addition to color', () => {
    expect(successLog).toContain("category.label + ' · ' + size.label + ' success'");
    expect(successLog).toContain("hh('dt', { style: { fontWeight: 800 } }, 'Category')");
    expect(successLog).toContain("hh('dt', { style: { fontWeight: 800 } }, 'Size')");
  });

  it('uses definition-list and time semantics for each history item', () => {
    expect(successLog).toContain("hh('dl', { 'aria-label': 'Success entry details'");
    expect(successLog).toContain("hh('time', { dateTime: textValue(entry.date).trim() || undefined }");
    expect(successLog).toContain("relDate(textValue(entry.date).trim())");
  });

  it('preserves whitespace in entry text and provides a legacy-data fallback', () => {
    expect(successLog).toContain("whiteSpace: 'pre-wrap'");
    expect(successLog).toContain("textValue(entry.text).trim() || 'Untitled success'");
  });

  it('explains when history is limited to the most recent 50 entries', () => {
    expect(successLog).toContain('var recentSuccesses = successes.slice(0, 50);');
    expect(successLog).toContain("'Showing the 50 most recent entries out of ' + successes.length + '.'");
  });

  it('uses the accessible app dialog to confirm deletion', () => {
    expect(successLog).toContain("title: 'Remove this success entry?', confirmText: 'Remove entry'");
    expect(successLog).toContain('This cannot be undone.');
    expect(successLog).not.toContain('confirm(');
  });

  it('names removal controls, preserves data, announces removal, and restores focus', () => {
    expect(successLog).toContain("'aria-label': 'Remove success entry: ' + (textValue(entry.text).trim() || 'Untitled success')");
    expect(successLog).toContain("setData(Object.assign({}, data, { successes: rawSuccesses.filter");
    expect(successLog).toContain("llAnnounce('Success entry removed.')");
    expect(successLog).toContain("focusById('learning-lab-success-history-heading')");
  });

  it('provides responsive groups and 44-pixel control targets', () => {
    expect(successLog).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))'");
    expect(successLog).toContain("minWidth: 44, minHeight: 44");
    expect(successLog).toContain("width: '100%', minHeight: 88");
  });

  it('handles malformed legacy success data without crashing', () => {
    expect(successLog).toContain('var rawSuccesses = Array.isArray(data.successes) ? data.successes : [];');
    expect(successLog).toContain('var successes = rawSuccesses.filter(isRecord);');
    expect(source).toContain("stat: (Array.isArray((data.mytkSuccess || {}).successes) ? (data.mytkSuccess || {}).successes.length : 0) + ' wins'");
  });

  it('synchronizes focus with rendered state instead of a focus timer', () => {
    expect(successLog).toContain('if (!pendingFocusId) return;');
    expect(successLog).toContain('function focusById(id) { setPendingFocusId(id); }');
    expect(successLog).not.toContain('setTimeout');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
