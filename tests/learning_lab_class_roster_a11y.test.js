import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Class Roster accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalClassRoster(props) {');
  const end = source.indexOf('  function PersonalQuoteCollector(props) {', start);
  const roster = source.slice(start, end);

  it('uses a named form with native submit behavior', () => {
    expect(roster).toContain("onSubmit: function(event) { event.preventDefault(); saveClass(); }");
    expect(roster).toContain("'aria-labelledby': 'learning-lab-class-form-heading'");
    expect(roster).toContain("hh('button', { type: 'submit'");
  });

  it('associates all roster fields with labels', () => {
    for (const id of ['name', 'teacher', 'period', 'room', 'days', 'friend']) {
      expect(roster).toContain(`field('learning-lab-class-${id}'`);
    }
    expect(roster).toContain("htmlFor: 'learning-lab-class-notes'");
    expect(roster).toContain("id: 'learning-lab-class-notes'");
  });

  it('reports and focuses a missing class name inline', () => {
    expect(roster).toContain("setNameError('Enter a class name.')");
    expect(roster).toContain("focusById('learning-lab-class-name')");
    expect(roster).toContain("id: 'learning-lab-class-name-error', role: 'alert'");
    expect(roster).toContain("'aria-invalid': key === 'name' && nameError ? 'true' : undefined");
    expect(roster).not.toContain('alert(');
  });

  it('trims saved values and preserves the original creation date on edit', () => {
    expect(roster).toContain('createdAt: existing && existing.createdAt ? existing.createdAt : todayISO()');
    expect(roster).toContain('teacher: form.teacher.trim()');
    expect(roster).toContain('notes: form.notes.trim()');
  });

  it('preserves unrelated section data when saving and deleting', () => {
    expect(roster).toContain("setData(Object.assign({}, data, { classes: classes }))");
    expect(roster).toContain("setData(Object.assign({}, data, { classes: (data.classes || []).filter");
  });

  it('confirms removal in an accessible app dialog', () => {
    expect(roster).toContain("title: 'Remove this class?', confirmText: 'Remove class'");
    expect(roster).not.toContain('confirm(');
  });

  it('uses a semantic class list with labeled articles', () => {
    expect(roster).toContain("hh('ul', { 'aria-label': 'Class roster'");
    expect(roster).toContain("return hh('li', { key: 'cl-' + classRecord.id");
    expect(roster).toContain("hh('article', { 'aria-labelledby': 'learning-lab-class-heading-' + classRecord.id }");
  });

  it('uses definition-list semantics for class details', () => {
    expect(roster).toContain("details.length ? hh('dl'");
    expect(roster).toContain("items.push(hh('dt'");
    expect(roster).toContain("items.push(hh('dd'");
    expect(roster.indexOf("items.push(hh('dt'")).toBeLessThan(roster.indexOf("items.push(hh('dd'"));
  });

  it('provides a named action group for each class', () => {
    expect(roster).toContain("role: 'group', 'aria-label': 'Actions for ' + classRecord.name");
    expect(roster).toContain("'aria-label': 'Edit class: ' + classRecord.name");
    expect(roster).toContain("'aria-label': 'Remove class: ' + classRecord.name");
  });

  it('moves focus into editing and restores it after update or cancellation', () => {
    expect(roster).toContain("focusById('learning-lab-class-name')");
    expect(roster).toContain("focusById(wasEditing ? 'learning-lab-class-edit-' + wasEditing : 'learning-lab-class-name')");
    expect(roster).toContain("focusById('learning-lab-class-edit-' + previousId)");
  });

  it('announces add, update, edit, cancel, and removal states', () => {
    expect(roster).toContain("index >= 0 ? 'Class updated: '");
    expect(roster).toContain("llAnnounce('Editing class: '");
    expect(roster).toContain("llAnnounce('Class edit canceled.')");
    expect(roster).toContain("llAnnounce('Class removed.')");
  });

  it('uses a named native-button group for form actions', () => {
    expect(roster).toContain("role: 'group', 'aria-label': 'Class form actions'");
    expect(roster).toContain('Update class');
    expect(roster).toContain('Cancel edit');
  });

  it('provides 44-pixel controls and fields', () => {
    expect(roster).toContain('minWidth: 44, minHeight: 44');
    expect(roster).toContain("minHeight: 44, padding: '9px 14px'");
    expect(roster).toContain("width: '100%', minHeight: 44");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
