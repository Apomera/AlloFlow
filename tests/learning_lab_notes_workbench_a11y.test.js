import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Notes Workbench accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalNotesWorkbench(props) {');
  const end = source.indexOf('  function PersonalDailyAgenda(props) {', start);
  const notes = source.slice(start, end);

  it('adds unique bounded notebook names through an accessible dialog', () => {
    expect(notes).toContain("title: 'Add a notebook'");
    expect(notes).toContain("fields: [{ name: 'name', label: 'Notebook name', required: true, maxLength: 80");
    expect(notes).toContain("'A notebook with that name already exists.'");
    expect(notes).not.toContain("prompt('Notebook name?");
  });

  it('preserves sibling data for all notebook and note writes', () => {
    expect(notes.match(/setData\(Object\.assign\(\{\}, data,/g)).toHaveLength(4);
    expect(notes).not.toContain('setData({');
  });

  it('uses a native bounded note form with explicit save and privacy guidance', () => {
    expect(notes).toContain("hh('form', { 'aria-labelledby': 'learning-lab-note-editor-heading', onSubmit: saveNote, noValidate: true }");
    expect(notes).toContain("type: 'submit'");
    expect(notes).toContain('Your changes are not saved until you choose Save note.');
    expect(notes).toContain("id: 'learning-lab-notes-privacy'");
    expect(notes).toContain("required: true, maxLength: 160");
    expect(notes).toContain("rows: 12, maxLength: 12000");
    expect(notes).toContain("rows: 12, maxLength: 20000");
    expect(notes).toContain("rows: 3, maxLength: 4000");
    expect(notes).not.toContain('with auto-save');
  });

  it('labels every field and reports title errors inline with focus', () => {
    for (const field of ['title', 'cue', 'main', 'summary']) {
      expect(notes).toContain("htmlFor: 'learning-lab-note-" + field + "'");
      expect(notes).toContain("id: 'learning-lab-note-" + field + "'");
    }
    expect(notes).toContain("id: 'learning-lab-note-title-error', role: 'alert'");
    expect(notes).toContain("focusId('learning-lab-note-title')");
  });

  it('confirms destructive actions and unsaved-change discard', () => {
    expect(notes).toContain("title: 'Delete this note?', confirmText: 'Delete note'");
    expect(notes).toContain("confirmText: 'Delete notebook'");
    expect(notes).toContain("title: 'Discard changes to this note?', confirmText: 'Discard changes'");
    expect(notes).toContain('function formIsDirty()');
  });

  it('provides semantic notebook and note collections with meaningful dates', () => {
    expect(notes).toContain("hh('ul', { 'aria-label': 'Notebooks'");
    expect(notes).toContain("hh('article', { 'aria-labelledby': 'learning-lab-note-card-title-' + note.id");
    expect(notes).toContain("hh('time', { dateTime: note.updatedAt || note.createdAt");
    expect(notes).toContain("'aria-labelledby': 'learning-lab-note-results-heading'");
  });

  it('labels search, exposes a visible result heading, and announces counts', () => {
    expect(notes).toContain("htmlFor: 'learning-lab-notes-search'");
    expect(notes).toContain("id: 'learning-lab-notes-search', type: 'search'");
    expect(notes).toContain("id: 'learning-lab-note-search-status', role: 'status', 'aria-live': 'polite'");
    expect(notes).toContain("id: 'learning-lab-note-results-heading', tabIndex: -1");
  });

  it('restores focus and announces navigation, saving, and deletion', () => {
    for (const id of ['learning-lab-notebook-heading', 'learning-lab-notebooks-heading', 'learning-lab-note-editor-heading', 'learning-lab-note-results-heading']) {
      expect(notes).toContain("focusId('" + id + "')");
    }
    expect(notes).toContain("llAnnounce('Note saved: '");
    expect(notes).toContain("llAnnounce('Note deleted: '");
    expect(notes).toContain("llAnnounce('Notebook deleted: '");
  });

  it('qualifies the optional learning strategy and keeps the deployed mirror identical', () => {
    expect(notes).toContain('It may help some learners organize and revisit information');
    expect(notes).toContain('Use, rename, or leave fields blank based on what helps you.');
    expect(notes).toContain('does not assess note quality or guarantee learning');
    expect(notes).not.toContain('active-processing magic');
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
