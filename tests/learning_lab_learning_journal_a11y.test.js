import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab personal Learning Journal accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalLearningJournal(props) {');
  const end = source.indexOf('  function PersonalGratitudeLog(props) {', start);
  const journal = source.slice(start, end);

  it('frames the journal as optional and explains sensitive-data boundaries', () => {
    expect(journal).toContain('optional personal journal, not a grade, assessment, diagnosis, or required mood check');
    expect(journal).toContain('Entries may contain sensitive information');
    expect(journal).toContain('does not itself notify a teacher, school, family member, or clinician');
    expect(journal).toContain('privacy procedures on managed devices or accounts');
  });

  it('starts mood unselected and uses a native optional select', () => {
    expect(journal).toContain("var EMPTY_FORM = { title: '', body: '', subject: '', mood: '', tags: '' }");
    expect(journal).toContain("id: 'learning-lab-journal-mood', value: form.mood");
    expect(journal).toContain("hh('option', { value: '' }, 'Not recorded')");
    expect(journal).not.toContain("'aria-pressed': on");
  });

  it('uses a bounded native form with conditional errors', () => {
    expect(journal).toContain("onSubmit: save, 'aria-labelledby': 'learning-lab-journal-editor-heading'");
    expect(journal).toContain("maxLength: 160");
    expect(journal).toContain("maxLength: 100");
    expect(journal).toContain("maxLength: 12000");
    expect(journal).toContain("maxLength: 500");
    expect(journal).toContain("entryError ? hh('div', { id: 'learning-lab-journal-error', role: 'alert'");
  });

  it('uses post-render focus for validation, navigation, save, and deletion', () => {
    expect(journal).toContain('var pendingFocusRef = R.useRef(null);');
    expect(journal).toContain('R.useLayoutEffect(function()');
    expect(journal).toContain("requestFocus('learning-lab-journal-body')");
    expect(journal).toContain("requestFocus('learning-lab-journal-editor-heading')");
    expect(journal).toContain("requestFocus(savedEntryVisible ? 'learning-lab-journal-entry-heading-' + id : 'learning-lab-journal-entries-heading')");
    expect(journal).not.toContain('setTimeout(function()');
  });

  it('confirms discarding unsaved changes and destructive deletion', () => {
    expect(journal).toContain("title: 'Discard journal changes?', confirmText: 'Discard changes'");
    expect(journal).toContain("title: 'Delete this journal entry?', confirmText: 'Delete entry'");
    expect(journal).toContain('async function remove(id, legacyEntry)');
    expect(journal).toContain('item !== legacyEntry');
  });

  it('preserves creation dates while normalizing unique, nonblank tags', () => {
    expect(journal).toContain("date: existing && existing.date ? existing.date : todayISO()");
    expect(journal).toContain("time: existing && existing.time ? existing.time : Date.now()");
    expect(journal).toContain("if (!tag || seen[key]) return false");
    expect(journal).toContain("parseTags(form.tags).join(', ')");
  });

  it('searches all advertised fields and announces visible results', () => {
    expect(journal).toContain("(entry.subject || '').toLowerCase().indexOf(query)");
    expect(journal).toContain("role: 'status', 'aria-live': 'polite'");
    expect(journal).toContain("filtered.length + ' journal entr'");
  });

  it('uses semantic summaries, entries, tags, and robust dates', () => {
    expect(journal).toContain("hh('dl'");
    expect(journal).toContain("'aria-label': 'Learning journal entries'");
    expect(journal).toContain("hh('article', { 'aria-labelledby': 'learning-lab-journal-entry-heading-' + entryId");
    expect(journal).toContain("hh('time', { dateTime: safeDateTime(entry) }");
    expect(journal).toContain("'aria-label': 'Tags for ' + entryLabel");
  });

  it('preserves sibling data and updates catalog privacy wording', () => {
    expect(journal).toContain("setData(Object.assign({}, data, { entries:");
    expect(journal).not.toContain('setData({ entries:');
    expect(source).toContain('review privacy before use.');
    expect(source).not.toContain('Free-form journal with subject + mood tags. Search across all entries.');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
