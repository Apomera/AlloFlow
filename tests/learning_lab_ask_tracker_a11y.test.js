import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Ask-for-Help Tracker accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalAskTracker(props) {');
  const end = source.indexOf('  function PersonalMindfulness(props) {', start);
  const tracker = source.slice(start, end);

  it('uses a named form with native submit behavior', () => {
    expect(tracker).toContain("onSubmit: function(event) { event.preventDefault(); logAsk(); }");
    expect(tracker).toContain("'aria-labelledby': 'learning-lab-ask-form-heading'");
    expect(tracker).toContain("hh('button', { type: 'submit'");
  });

  it('associates all text fields with labels', () => {
    for (const field of ['who', 'what', 'notes']) {
      expect(tracker).toContain(`htmlFor: 'learning-lab-ask-${field}'`);
      expect(tracker).toContain(`id: 'learning-lab-ask-${field}'`);
    }
  });

  it('reports and focuses a missing required request inline', () => {
    expect(tracker).toContain("setWhatError('Describe what you asked for.')");
    expect(tracker).toContain("document.getElementById('learning-lab-ask-what')");
    expect(tracker).toContain("id: 'learning-lab-ask-what-error', role: 'alert'");
    expect(tracker).toContain("'aria-invalid': whatError ? 'true' : undefined");
    expect(tracker).not.toContain('alert(');
  });

  it('uses a fieldset with native radio outcomes', () => {
    expect(tracker).toContain("hh('fieldset', { style:");
    expect(tracker).toContain("hh('legend', { style: labelStyle }, 'How did it go?')");
    expect(tracker).toContain("id: 'learning-lab-ask-outcome-' + outcome.id, type: 'radio'");
    expect(tracker).toContain("name: 'learning-lab-ask-outcome'");
    expect(tracker).toContain('checked: selected');
  });

  it('uses a named definition list for help-request statistics', () => {
    expect(tracker).toContain("'aria-label': 'Help request statistics'");
    expect(tracker).toContain("hh('dl', { style:");
    expect(tracker).toContain("hh('dt', { style:");
    expect(tracker).toContain("hh('dd', { style:");
    expect(tracker.indexOf("hh('dt', { style:")).toBeLessThan(tracker.indexOf("hh('dd', { style:"));
  });

  it('does not rely on color alone for outcome information', () => {
    expect(tracker).toContain("hh('span', null, hh('span', { 'aria-hidden': 'true' }, outcome.icon + ' '), outcome.label)");
    expect(tracker).toContain("outcome.label + '. '");
    expect(tracker).toContain("'. Outcome: ' + outcome.label + '.'");
  });

  it('normalizes saved text values', () => {
    expect(tracker).toContain('who: form.who.trim()');
    expect(tracker).toContain('what: what');
    expect(tracker).toContain('notes: form.notes.trim()');
  });

  it('preserves unrelated section data when saving and deleting', () => {
    expect(tracker).toContain("setData(Object.assign({}, data, { asks: [entry].concat(data.asks || []) }))");
    expect(tracker).toContain("setData(Object.assign({}, data, { asks: (data.asks || []).filter");
  });

  it('announces saving and deletion', () => {
    expect(tracker).toContain("llAnnounce('Help request logged. Outcome: '");
    expect(tracker).toContain("llAnnounce('Help request deleted.')");
  });

  it('confirms deletion in an accessible app dialog', () => {
    expect(tracker).toContain("title: 'Delete this help request?', confirmText: 'Delete request'");
    expect(tracker).not.toContain('confirm(');
  });

  it('uses semantic history lists and labeled articles', () => {
    expect(tracker).toContain("'aria-labelledby': 'learning-lab-ask-history-heading'");
    expect(tracker).toContain("hh('ul', { style:");
    expect(tracker).toContain("return hh('li', { key: 'as-' + entry.id");
    expect(tracker).toContain("hh('article', { 'aria-label':");
  });

  it('provides machine-readable request timestamps', () => {
    expect(tracker).toContain('var validDate = Number.isFinite(askedAt.getTime());');
    expect(tracker).toContain("hh('time', { dateTime: askedAt.toISOString() }");
  });

  it('provides named 44-pixel controls and fields', () => {
    expect(tracker).toContain("'aria-label': 'Delete help request: ' + entry.what");
    expect(tracker).toContain('minWidth: 44, minHeight: 44');
    expect(tracker).toContain('minHeight: 44, padding:');
    expect(tracker).toContain("width: '100%', minHeight: 44");
  });

  it('exposes explanatory guidance as a named aside', () => {
    expect(tracker).toContain("hh('aside', { 'aria-label': 'Why tracking help requests matters'");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
