import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Gratitude Log accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalGratitudeLog(props) {');
  const end = source.indexOf('  function PersonalReadingTracker(props) {', start);
  const gratitude = source.slice(start, end);

  it('uses a named form with Enter submission', () => {
    expect(gratitude).toContain("onSubmit: function(event) { event.preventDefault(); save(); }");
    expect(gratitude).toContain("'aria-labelledby': 'learning-lab-gratitude-form-heading'");
    expect(gratitude).toContain("hh('button', { type: 'submit'");
  });

  it('associates each gratitude field with a descriptive label', () => {
    expect(gratitude).toContain("var fieldId = 'learning-lab-gratitude-' + number");
    expect(gratitude).toContain("hh('label', { htmlFor: fieldId");
    expect(gratitude).toContain("hh('input', { id: fieldId, type: 'text'");
    expect(gratitude).toContain("'Gratitude ' + number");
  });

  it('reports an empty submission inline and focuses the first field', () => {
    expect(gratitude).toContain("setGratitudeError('Add at least one gratitude before saving.')");
    expect(gratitude).toContain("document.getElementById('learning-lab-gratitude-1')");
    expect(gratitude).toContain("id: 'learning-lab-gratitude-error', role: 'alert'");
    expect(gratitude).not.toContain("alert('Add at least one.')");
  });

  it('exposes today’s saved entry as status and an ordered list', () => {
    expect(gratitude).toContain("role: 'status', 'aria-labelledby': 'learning-lab-gratitude-today-heading'");
    expect(gratitude).toContain("id: 'learning-lab-gratitude-today-heading'");
    expect(gratitude).toContain("hh('ol'");
  });

  it('uses semantic history and entry structure', () => {
    expect(gratitude).toContain("'aria-labelledby': 'learning-lab-gratitude-history-heading'");
    expect(gratitude).toContain("id: 'learning-lab-gratitude-history-heading'");
    expect(gratitude).toContain("return hh('li', { key: 'ge-' + entry.id");
    expect(gratitude).toContain("hh('article', { 'aria-label': 'Gratitude log from ' + entry.date }");
  });

  it('provides named 44-pixel history deletion', () => {
    expect(gratitude).toContain("'aria-label': 'Delete gratitude log from ' + entry.date");
    expect(gratitude).toContain("minWidth: 44, minHeight: 44");
  });

  it('confirms deletion through the app dialog', () => {
    expect(gratitude).toContain("title: 'Delete this gratitude log?', confirmText: 'Delete log'");
    expect(gratitude).not.toContain("confirm('");
  });

  it('announces successful save and deletion', () => {
    expect(gratitude).toContain("llAnnounce('Gratitude log saved with '");
    expect(gratitude).toContain("llAnnounce('Gratitude log deleted.')");
  });

  it('hides decorative summary icons', () => {
    expect(gratitude).toContain("'aria-hidden': 'true'");
    expect(gratitude).toContain("'aria-label': 'Gratitude summary'");
  });

  it('preserves unrelated section data when updating entries', () => {
    expect(gratitude).toContain("setData(Object.assign({}, data, { entries:");
    expect(gratitude).not.toContain("setData({ entries:");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
