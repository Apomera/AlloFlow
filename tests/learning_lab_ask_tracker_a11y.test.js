import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Optional Support Request Notes accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalAskTracker(props) {');
  const end = source.indexOf('  function PersonalMindfulness(props) {', start);
  const tracker = source.slice(start, end);

  it('frames the section as optional, private, and non-communicating', () => {
    expect(tracker).toContain("'Optional Support Request Notes'");
    expect(tracker).toContain('Saving a note does not send a request or notify a teacher, school, employer, clinician, family member, or the person named.');
    expect(tracker).toContain('Avoid including private details you do not want stored.');
    expect(tracker).toContain('Save personal notes about support requests when that is useful to you.');
  });

  it('uses a named form with explicit submit behavior', () => {
    expect(tracker).toContain("hh('form', { noValidate: true, onSubmit: function(event) { event.preventDefault(); saveNote(); }, 'aria-labelledby': 'learning-lab-ask-form-heading' }");
    expect(tracker).toContain("hh('button', { type: 'submit'");
    expect(tracker).toContain("typeof editIndex === 'number' ? 'Update support note' : 'Save support note'");
  });

  it('associates all text fields with labels and marks them optional', () => {
    for (const field of ['who', 'what', 'notes']) {
      expect(tracker).toContain(`htmlFor: 'learning-lab-ask-${field}'`);
      expect(tracker).toContain(`id: 'learning-lab-ask-${field}'`);
    }
    expect(tracker).toContain("'Person or resource (optional)'");
    expect(tracker).toContain("'Support requested (optional)'");
    expect(tracker).toContain("'Additional notes (optional)'");
    expect(tracker).toContain("'All fields are optional, but enter at least one detail before saving.'");
  });

  it('requires only one user-chosen detail and reports failure accessibly', () => {
    expect(tracker).toContain("setDetailsError('Enter at least one detail before saving this support note.')");
    expect(tracker).toContain("focusById('learning-lab-ask-what')");
    expect(tracker).toContain("id: 'learning-lab-ask-details-error', role: 'alert'");
    expect(tracker).toContain("'aria-invalid': detailsError ? 'true' : undefined");
    expect(tracker).toContain("'aria-describedby': detailsError ? 'learning-lab-ask-details-error' : 'learning-lab-ask-form-help'");
    expect(tracker).not.toContain('alert(');
  });

  it('uses a fieldset of native radios with no preselected outcome and a clear control', () => {
    expect(tracker).toContain("emptyForm = { who: '', what: '', outcome: '', notes: '' }");
    expect(tracker).toContain("hh('legend', { style: labelStyle }, 'Optional reflection on how it went')");
    expect(tracker).toContain("id: 'learning-lab-ask-outcome-' + outcome.id, type: 'radio'");
    expect(tracker).toContain("name: 'learning-lab-ask-outcome'");
    expect(tracker).toContain('checked: selected');
    expect(tracker).toContain("'Clear outcome'");
  });

  it('does not rely on color alone for outcome information', () => {
    expect(tracker).toContain("hh('span', null, hh('span', { 'aria-hidden': 'true' }, outcome.icon + ' '), outcome.label)");
    expect(tracker).toContain("hh('strong', null, 'Optional outcome: '), outcome.label");
  });

  it('preserves the storage schema and legacy outcome identifiers', () => {
    for (const id of ['helpful', 'partial', 'not-useful', 'hard']) {
      expect(tracker).toContain(`{ id: '${id}', label:`);
    }
    expect(tracker).toContain("Object.assign({ id: tkId(), date: todayISO(), time: Date.now() }, cleaned)");
    expect(tracker).toContain("setData(Object.assign({}, data, { asks: next }))");
  });

  it('supports editing with dirty-cancel confirmation', () => {
    expect(tracker).toContain('function startEdit(index)');
    expect(tracker).toContain("typeof editIndex === 'number' ? 'Edit support note' : 'Add a support note'");
    expect(tracker).toContain('if (!formsMatch(form, editBaseline) && !(await askLearningLabConfirmation(');
    expect(tracker).toContain("title: 'Discard unsaved changes?', confirmText: 'Discard changes'");
    expect(tracker).toContain("'Cancel editing'");
    expect(tracker).toContain("Object.assign({}, entry, cleaned, { updatedAt: Date.now() })");
  });

  it('synchronizes focus with rendered state instead of timers', () => {
    expect(tracker).toContain('if (!pendingFocusId) return;');
    expect(tracker).toContain('var target = document.getElementById(pendingFocusId);');
    expect(tracker).toContain('}, [pendingFocusId, data, editIndex]);');
    expect(tracker).not.toContain('setTimeout');
    expect(tracker).not.toContain('autoFocus');
  });

  it('renders every saved entry without a silent history cap', () => {
    expect(tracker).toContain('var entries = rawAsks.map(function(entry, index)');
    expect(tracker).not.toContain('.slice(0,');
    expect(tracker).not.toContain('.slice(0, 15)');
  });

  it('handles malformed and legacy data without crashing or exposing Invalid Date', () => {
    expect(tracker).toContain("var rawAsks = Array.isArray(data.asks) ? data.asks : [];");
    expect(tracker).toContain("function isRecord(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }");
    expect(tracker).toContain("'No readable details recorded in this legacy note.'");
    expect(tracker).toContain("return { text: 'Date not recorded', iso: '' };");
    expect(tracker).toContain("when.iso ? hh('time', { dateTime: when.iso }, when.text) : when.text");
  });

  it('uses visible delete text with accessible in-app confirmation and focus recovery', () => {
    expect(tracker).toContain("'aria-label': 'Delete support note ' + (visibleIndex + 1)");
    expect(tracker).toContain("}, 'Delete note')");
    expect(tracker).toContain("title: 'Delete this support note?', confirmText: 'Delete note'");
    expect(tracker).toContain('function nextRecordIndex(items, preferred)');
    expect(tracker).toContain("focusById(focusIndex === null ? 'learning-lab-ask-what' : 'learning-lab-ask-edit-' + focusIndex)");
    expect(tracker).not.toContain('confirm(');
  });

  it('announces save, update, cancel, and delete outcomes', () => {
    expect(tracker).toContain("llAnnounce('Support note saved.')");
    expect(tracker).toContain("llAnnounce('Support note updated.')");
    expect(tracker).toContain("llAnnounce('Support note editing canceled.')");
    expect(tracker).toContain("llAnnounce('Support note deleted.')");
  });

  it('contains no counts-based scoring, percentages, ranking, or streak metrics', () => {
    expect(tracker).toContain("'Notes are shown in saved order without scores or rankings.'");
    expect(tracker).not.toContain('toFixed(');
    expect(tracker).not.toContain('statistics');
    expect(tracker).not.toContain('Streak');
    expect(tracker).not.toContain('This week');
    expect(tracker).not.toContain("+ '%'");
  });

  it('uses semantic history structure with labeled articles and timestamps', () => {
    expect(tracker).toContain("'aria-labelledby': 'learning-lab-ask-history-heading'");
    expect(tracker).toContain("hh('ul', { 'aria-label': 'All saved support notes'");
    expect(tracker).toContain("hh('article', { 'aria-labelledby': headingId }");
    expect(tracker).toContain("'Support note ' + (visibleIndex + 1)");
  });

  it('meets minimum 44-pixel target sizing for fields and actions', () => {
    expect(tracker).toContain("width: '100%', minHeight: 44");
    expect(tracker).toContain('minHeight: 44, padding:');
    expect(tracker).toContain('boxSizing: \'border-box\', minHeight: 44');
  });

  it('frames possible uses without evidentiary or normative claims', () => {
    expect(tracker).toContain("hh('aside', { 'aria-label': 'Possible uses for support request notes'");
    expect(tracker).toContain('A saved note is not evidence that support was requested, received, effective, or required.');
    expect(tracker).not.toContain('normalizing');
    expect(tracker).not.toContain('destigmatiz');
    expect(tracker).not.toContain('most successful');
  });

  it('updates catalog and navigation fallback descriptions everywhere', () => {
    expect(source).toContain("desc: 'Save personal notes about support requests'");
    expect(source).toContain("'Save and edit personal notes about support requests when useful.'");
    expect(source).not.toContain('Log every help ask');
    expect(source).not.toContain('Ask-for-Help Tracker');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
