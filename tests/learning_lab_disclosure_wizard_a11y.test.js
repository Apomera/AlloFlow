import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Disclosure Wizard accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalDisclosure(props) {');
  const end = source.indexOf('  function PersonalFocusPlaylist(props) {', start);
  const wizard = source.slice(start, end);

  it('uses a named form with native submit behavior', () => {
    expect(wizard).toContain("hh('form', { onSubmit: function(event) { event.preventDefault(); save(); }, 'aria-labelledby': 'learning-lab-disclosure-form-heading' }");
    expect(wizard).toContain("hh('button', { type: 'submit'");
    expect(wizard).toContain("id: 'learning-lab-disclosure-form-heading'");
  });

  it('associates every visible field label with its control', () => {
    expect(wizard).toContain("var fieldId = 'learning-lab-disclosure-' + field.id");
    expect(wizard).toContain("hh('label', { htmlFor: fieldId");
    expect(wizard).toContain("hh('textarea', { id: fieldId");
    expect(wizard).toContain("hh('input', { id: fieldId, type: 'text'");
    expect(wizard).not.toContain('tkInput(');
  });

  it('visibly identifies the required and optional planning fields', () => {
    expect(wizard).toContain("field.label + (field.required ? ' (required)' : ' (optional)')");
    expect(wizard).toContain("{ id: 'what', label: 'Information or need I might share', required: true");
  });

  it('programmatically associates each field with its instructions', () => {
    expect(wizard).toContain("var helpId = fieldId + '-help'");
    expect(wizard).toContain("'aria-describedby': describedBy");
    expect(wizard).toContain("id: helpId");
  });

  it('reports and focuses a missing required sharing field inline', () => {
    expect(wizard).toContain("setWhatError('Describe what information or need you are considering sharing.')");
    expect(wizard).toContain("focusById('learning-lab-disclosure-what')");
    expect(wizard).toContain("id: 'learning-lab-disclosure-what-error', role: 'alert'");
    expect(wizard).toContain("'aria-invalid': field.id === 'what' && whatError ? 'true' : undefined");
    expect(wizard).not.toContain('alert(');
  });

  it('uses a fieldset and legend for the paired ratings', () => {
    expect(wizard).toContain("hh('fieldset'");
    expect(wizard).toContain("hh('legend'");
    expect(wizard).toContain("'Your current estimate'");
  });

  it('associates labels and outputs with both range controls', () => {
    expect(wizard).toContain("ratingField('learning-lab-disclosure-risk'");
    expect(wizard).toContain("ratingField('learning-lab-disclosure-gain'");
    expect(wizard).toContain("hh('label', { htmlFor: id");
    expect(wizard).toContain("hh('output', { htmlFor: id");
    expect(wizard).toContain("hh('input', { id: id, type: 'range'");
  });

  it('provides descriptive range value text', () => {
    expect(wizard).toContain("'aria-valuetext': value + ' out of 10, from ' + lowLabel + ' to ' + highLabel");
    expect(wizard).toContain("'Possible risk'");
    expect(wizard).toContain("'Possible benefit'");
  });

  it('explains that ratings are not a formula or recommendation', () => {
    expect(wizard).toContain('they are not a formula, safety assessment, or recommendation');
  });

  it('uses cautious, setting-dependent disclosure guidance', () => {
    expect(wizard).toContain('Accommodation processes, documentation rules, and confidentiality protections vary by setting and location.');
    expect(wizard).toContain('This reflection tool is not legal advice');
    expect(wizard).not.toContain('only the office handling accommodations needs documentation');
    expect(wizard).not.toContain("There's no rule that says you must share");
  });

  it('labels guidance as a complementary region', () => {
    expect(wizard).toContain("hh('aside', { 'aria-labelledby': 'learning-lab-disclosure-guidance-heading'");
    expect(wizard).toContain("id: 'learning-lab-disclosure-guidance-heading'");
  });

  it('discloses local saving and sensitive-data considerations', () => {
    expect(wizard).toContain('Responses save in this browser and may contain disability, health, or relationship information.');
    expect(wizard).toContain('Use a device and account you trust.');
  });

  it('trims text values and preserves unrelated section data', () => {
    expect(wizard).toContain('context: form.context.trim()');
    expect(wizard).toContain('who: form.who.trim()');
    expect(wizard).toContain('why: form.why.trim()');
    expect(wizard).toContain("setData(Object.assign({}, data, { logs: [entry].concat(rawLogs) }))");
  });

  it('announces saves with both rating values and restores focus', () => {
    expect(wizard).toContain("llAnnounce('Disclosure decision saved. Risk ' + entry.risk + ' out of 10 and possible benefit ' + entry.gain + ' out of 10.')");
    expect(wizard).toContain("focusById('learning-lab-disclosure-context')");
  });

  it('confirms removal through the accessible app dialog', () => {
    expect(wizard).toContain("title: 'Remove this disclosure decision?', confirmText: 'Remove decision'");
    expect(wizard).not.toContain('confirm(');
  });

  it('announces removal and restores focus to history', () => {
    expect(wizard).toContain("llAnnounce('Disclosure decision removed.')");
    expect(wizard).toContain("focusById('learning-lab-disclosure-history-heading')");
    expect(wizard).toContain("tabIndex: -1");
  });

  it('uses a semantic saved-decision list with labeled articles', () => {
    expect(wizard).toContain("'aria-labelledby': 'learning-lab-disclosure-history-heading'");
    expect(wizard).toContain("return hh('li', { key: 'dl-' + entry.id");
    expect(wizard).toContain("hh('article', { 'aria-labelledby': headingId }");
  });

  it('uses definition-list semantics for saved decision details', () => {
    expect(wizard).toContain("hh('dl', { style: { display: 'grid'");
    expect(wizard).toContain("items.push(hh('dt'");
    expect(wizard).toContain("items.push(hh('dd'");
    expect(wizard).toContain("hh('time', { dateTime: textValue(entry.date) }");
    expect(wizard).toContain('logs.map(function(entry)');
    expect(wizard).not.toContain('.slice(0, 10)');
  });

  it('provides named 44-pixel deletion controls and fields', () => {
    expect(wizard).toContain("'aria-label': 'Remove disclosure decision: '");
    expect(wizard).toContain("minWidth: 44, minHeight: 44");
    expect(wizard).toContain("width: '100%', minHeight: 44");
    expect(wizard).toContain("minHeight: 44, padding: '9px 14px'");
  });

  it('defines its own render-synchronized focus helper (regression: free focusById crashed saves)', () => {
    expect(wizard).toContain('function focusById(id) { setPendingFocusId(id); }');
    expect(wizard).toContain('if (!pendingFocusId) return;');
    expect(wizard).toContain('var target = document.getElementById(pendingFocusId);');
    expect(wizard).not.toContain('setTimeout');
  });

  it('handles malformed legacy log data without crashing', () => {
    expect(wizard).toContain('var rawLogs = Array.isArray(data.logs) ? data.logs : [];');
    expect(wizard).toContain('var logs = rawLogs.filter(isRecord);');
    expect(wizard).toContain("textValue(entry.context).trim() || 'Disclosure decision'");
    expect(wizard).toContain("Number.isFinite(Number(entry.risk))");
    expect(source).toContain("stat: (Array.isArray((data.mytkDisc || {}).logs) ? (data.mytkDisc || {}).logs.length : 0) + ' decisions'");
  });

  it('states that saving never discloses or notifies anyone', () => {
    expect(wizard).toContain('Saving a decision here does not disclose anything');
    expect(wizard).toContain('does not send or show your notes to a teacher, school, employer, clinician, or family member');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
