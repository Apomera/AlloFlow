import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Learning Journal accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalLearningJournal(props) {');
  const end = source.indexOf('  function PersonalGratitudeLog(props) {', start);
  const journal = source.slice(start, end);

  it('uses a named editor form with submit and cancel controls', () => {
    expect(journal).toContain("onSubmit: function(event) { event.preventDefault(); save(); }");
    expect(journal).toContain("'aria-labelledby': 'learning-lab-journal-editor-heading'");
    expect(journal).toContain("hh('button', { type: 'submit'");
    expect(journal).toContain("hh('button', { type: 'button', onClick: function() { setEntryError('')");
  });

  it('associates title, subject, body, and tag fields', () => {
    for (const field of ['title', 'subject', 'body', 'tags']) {
      expect(journal).toContain(`htmlFor: 'learning-lab-journal-${field}'`);
      expect(journal).toContain(`id: 'learning-lab-journal-${field}'`);
    }
  });

  it('reports missing journal content inline and focuses the entry field', () => {
    expect(journal).toContain("setEntryError('Journal entry content is required.')");
    expect(journal).toContain("document.getElementById('learning-lab-journal-body')");
    expect(journal).toContain("id: 'learning-lab-journal-error', role: 'alert'");
    expect(journal).not.toContain("alert('Need some content.')");
  });

  it('exposes mood choices as a named group with selected state', () => {
    expect(journal).toContain("role: 'group', 'aria-labelledby': 'learning-lab-journal-mood-label'");
    expect(journal).toContain("'aria-label': mood.id, 'aria-pressed': on ? 'true' : 'false'");
    expect(journal).toContain("minWidth: 44, minHeight: 44");
  });

  it('labels search and subject filtering controls', () => {
    expect(journal).toContain("htmlFor: 'learning-lab-journal-search'");
    expect(journal).toContain("id: 'learning-lab-journal-search', type: 'search'");
    expect(journal).toContain("htmlFor: 'learning-lab-journal-subject-filter'");
    expect(journal).toContain("id: 'learning-lab-journal-subject-filter'");
  });

  it('announces the filtered result count', () => {
    expect(journal).toContain("role: 'status', 'aria-live': 'polite'");
    expect(journal).toContain("filtered.length + ' journal entr'");
    expect(journal).toContain("' shown.'");
  });

  it('uses semantic entry and tag lists', () => {
    expect(journal).toContain("hh('ul', { 'aria-label': 'Learning journal entries'");
    expect(journal).toContain("return hh('li', { key: 'je-' + entry.id");
    expect(journal).toContain("hh('article', { 'aria-label':");
    expect(journal).toContain("hh('ul', { 'aria-label': 'Tags'");
  });

  it('exposes mood as text rather than emoji and color alone', () => {
    expect(journal).toContain("'Mood: ' + mood.id");
    expect(journal).toContain("mood.id + ' · '");
    expect(journal).toContain("'aria-hidden': 'true'");
  });

  it('provides named 44-pixel edit and delete controls', () => {
    expect(journal).toContain("'aria-label': 'Edit journal entry: ' + entryLabel");
    expect(journal).toContain("'aria-label': 'Delete journal entry: ' + entryLabel");
    expect(journal.match(/minWidth: 44, minHeight: 44/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('uses app confirmation and announces state changes', () => {
    expect(journal).toContain("title: 'Delete this journal entry?', confirmText: 'Delete entry'");
    expect(journal).not.toContain("confirm('Delete this journal entry?')");
    expect(journal).toContain("llAnnounce('Learning journal entry saved.')");
    expect(journal).toContain("llAnnounce('Learning journal entry deleted.')");
  });

  it('preserves unrelated section data when updating entries', () => {
    expect(journal).toContain("setData(Object.assign({}, data, { entries:");
    expect(journal).not.toContain("setData({ entries:");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
