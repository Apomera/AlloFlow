import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Notes Workbench accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalNotesWorkbench(props) {');
  const end = source.indexOf('  function PersonalDailyAgenda(props) {', start);
  const notesWorkbench = source.slice(start, end);

  it('uses an accessible form dialog to add unique notebooks', () => {
    expect(notesWorkbench).toContain("title: 'Add a notebook'");
    expect(notesWorkbench).toContain("fields: [{ name: 'name', label: 'Notebook name', required: true, maxLength: 80");
    expect(notesWorkbench).toContain("'A notebook with that name already exists.'");
    expect(notesWorkbench).not.toContain("prompt('Notebook name?");
  });

  it('uses app-controlled confirmation for destructive note and notebook actions', () => {
    expect(notesWorkbench).toContain("title: 'Delete this note?', confirmText: 'Delete note'");
    expect(notesWorkbench).toContain("confirmText: 'Delete notebook'");
    expect(notesWorkbench).not.toContain("confirm('Delete this note?')");
    expect(notesWorkbench).not.toContain("confirm('Delete notebook");
    expect(notesWorkbench).not.toContain("alert('Cannot delete General notebook.')");
  });

  it('associates the required note title and reports errors inline', () => {
    expect(notesWorkbench).toContain("htmlFor: 'learning-lab-note-title'");
    expect(notesWorkbench).toContain("id: 'learning-lab-note-title', type: 'text', value: form.title, required: true");
    expect(notesWorkbench).toContain("id: 'learning-lab-note-title-error', role: 'alert'");
    expect(notesWorkbench).toContain("document.getElementById('learning-lab-note-title')");
    expect(notesWorkbench).not.toContain("alert('Need a title.')");
  });

  it('associates Cornell note fields with their labels and instructions', () => {
    for (const field of ['cue', 'main', 'summary']) {
      expect(notesWorkbench).toContain(`htmlFor: 'learning-lab-note-${field}'`);
      expect(notesWorkbench).toContain(`id: 'learning-lab-note-${field}'`);
      expect(notesWorkbench).toContain(`'aria-describedby': 'learning-lab-note-${field}-help'`);
    }
    expect(notesWorkbench).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'");
  });

  it('labels note search and announces its result count', () => {
    expect(notesWorkbench).toContain("htmlFor: 'learning-lab-notes-search'");
    expect(notesWorkbench).toContain("id: 'learning-lab-notes-search', type: 'search'");
    expect(notesWorkbench).toContain("role: 'status', 'aria-live': 'polite'");
    expect(notesWorkbench).toContain("' match your search.'");
  });

  it('provides named 44-pixel note actions', () => {
    expect(notesWorkbench).toContain("'aria-label': 'Edit note: ' + n.title");
    expect(notesWorkbench).toContain("'aria-label': 'Delete note: ' + n.title");
    expect(notesWorkbench.match(/minWidth: 44, minHeight: 44/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('keeps notebook deletion separate from the notebook open button', () => {
    expect(notesWorkbench).toContain("'aria-label': 'Delete notebook: ' + nbName");
    expect(notesWorkbench).toContain("return hh('div', { key: 'nb-' + nbName, style: { position: 'relative', minHeight: 80 } }");
    expect(notesWorkbench).not.toContain("hh('span', { onClick: function(e) { e.stopPropagation(); removeNotebook(nbName);");
  });

  it('announces completed save, add, and delete actions', () => {
    expect(notesWorkbench).toContain("llAnnounce('Note saved.')");
    expect(notesWorkbench).toContain("llAnnounce('Note deleted.')");
    expect(notesWorkbench).toContain("llAnnounce('Notebook added: ' + values.name + '.')");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
