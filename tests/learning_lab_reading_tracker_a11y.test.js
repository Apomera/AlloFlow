import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Reading Tracker accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalReadingTracker(props) {');
  const end = source.indexOf('  function PersonalSelfCompassion(props) {', start);
  const reading = source.slice(start, end);

  it('frames the tracker as optional, personal, private, and non-evaluative', () => {
    expect(reading).toContain('not a grade, assignment, reading-level test, or measure of ability');
    expect(reading).toContain('There is no requirement to finish, rate, or record a certain amount.');
    expect(reading).toContain('does not itself notify a teacher, school, library, or family member');
    expect(reading).not.toContain('Reading volume supports literacy growth');
    expect(reading).not.toContain('Krashen 2004');
  });

  it('uses blank optional defaults and bounded native controls', () => {
    expect(reading).toContain("var EMPTY_FORM = { title: '', author: '', status: '', pages: '', rating: '', notes: '' }");
    expect(reading).toContain("hh('select', { id: 'learning-lab-reading-status'");
    expect(reading).toContain("hh('select', { id: 'learning-lab-reading-rating'");
    expect(reading).toContain("max: 1000000");
    expect(reading).toContain("maxLength: 6000");
    expect(reading).not.toContain("role: 'radiogroup'");
  });

  it('provides a named form, associated hints, and conditional validation', () => {
    expect(reading).toContain("'aria-labelledby': 'learning-lab-reading-editor-heading'");
    for (const field of ['title', 'author', 'status', 'pages', 'rating', 'notes']) {
      expect(reading).toContain("htmlFor: 'learning-lab-reading-" + field + "'");
      expect(reading).toContain("id: 'learning-lab-reading-" + field + "'");
    }
    expect(reading).toContain("titleError ? hh('p', { id: 'learning-lab-reading-title-error', role: 'alert'");
    expect(reading).toContain("document.getElementById('learning-lab-reading-title')");
  });

  it('confirms dirty cancellation and restores meaningful focus', () => {
    expect(reading).toContain("title: 'Discard unsaved changes?', confirmText: 'Discard changes'");
    expect(reading).toContain("focusTargetRef.current = 'learning-lab-reading-add'");
    expect(reading).toContain("focusTargetRef.current = 'learning-lab-reading-entries-heading'");
    expect(reading).toContain("focusTargetRef.current = 'learning-lab-reading-entry-heading-' + book.id");
    expect(reading).toContain('R.useLayoutEffect(function()');
  });

  it('preserves legacy records and unrelated section data', () => {
    expect(reading).toContain('var index = editing ? nextBooks.indexOf(editing.book) : -1;');
    expect(reading).toContain('books.filter(function(item) { return item !== book; })');
    expect(reading).toContain('setData(Object.assign({}, data, { books:');
    expect(reading).not.toContain('setData({ books:');
  });

  it('uses semantic summaries, visible status, headings, lists, and robust dates', () => {
    expect(reading).toContain("'aria-labelledby': 'learning-lab-reading-summary-heading'");
    expect(reading).toContain("hh('dl'");
    expect(reading).toContain("role: 'status', 'aria-live': 'polite'");
    expect(reading).toContain("hh('ul', { 'aria-label': 'Saved reading entries'");
    expect(reading).toContain("hh('article', { 'aria-labelledby': headingId }");
    expect(reading).toContain("hh('time', { dateTime: date.dateTime }");
    expect(reading).toContain("'Date not recorded'");
  });

  it('uses neutral status language and a native status filter', () => {
    expect(reading).toContain("label: 'Stopped or paused'");
    expect(reading).toContain("hh('select', { id: 'learning-lab-reading-filter'");
    expect(reading).toContain("hh('option', { value: '' }, 'Not recorded')");
    expect(reading).not.toContain("label: 'Didn't finish'");
  });

  it('updates the catalog description without the unsupported claim', () => {
    expect(source).toContain("desc: 'Optional personal reading list + reflections'");
    expect(source).toContain("'Optional personal reading list, status, page notes, and reflections.'");
    expect(source).not.toContain('page counter (Krashen 2004)');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
