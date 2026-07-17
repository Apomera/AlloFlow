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

  it('uses a named editor form with submit and cancel controls', () => {
    expect(reading).toContain("onSubmit: function(event) { event.preventDefault(); save(); }");
    expect(reading).toContain("'aria-labelledby': 'learning-lab-reading-form-heading'");
    expect(reading).toContain("hh('button', { type: 'submit'");
  });

  it('associates title, author, pages, and notes fields', () => {
    for (const field of ['title', 'author', 'pages', 'notes']) {
      expect(reading).toContain(`htmlFor: 'learning-lab-reading-${field}'`);
      expect(reading).toContain(`id: 'learning-lab-reading-${field}'`);
    }
  });

  it('reports a missing title inline and focuses its field', () => {
    expect(reading).toContain("setTitleError('Book title is required.')");
    expect(reading).toContain("document.getElementById('learning-lab-reading-title')");
    expect(reading).toContain("id: 'learning-lab-reading-title-error', role: 'alert'");
    expect(reading).not.toContain("alert('Need a title.')");
  });

  it('exposes reading status as a named selected-state group', () => {
    expect(reading).toContain("role: 'group', 'aria-labelledby': 'learning-lab-reading-status-label'");
    expect(reading).toContain("'aria-pressed': active ? 'true' : 'false'");
    expect(reading).toContain("minHeight: 44, padding: '6px 4px'");
  });

  it('exposes book ratings with radio semantics', () => {
    expect(reading).toContain("role: 'radiogroup', 'aria-labelledby': 'learning-lab-reading-rating-label'");
    expect(reading).toContain("role: 'radio', 'aria-checked': selected ? 'true' : 'false'");
    expect(reading).toContain("'aria-label': rating + ' out of 5 stars'");
    expect(reading).toContain("minWidth: 44, minHeight: 44");
  });

  it('exposes filter selection and announces its result count', () => {
    expect(reading).toContain("role: 'group', 'aria-label': 'Filter books by reading status'");
    expect(reading).toContain("'aria-pressed': active ? 'true' : 'false'");
    expect(reading).toContain("role: 'status', 'aria-live': 'polite'");
    expect(reading).toContain("' book' + (filtered.length === 1 ? '' : 's') + ' shown.'");
  });

  it('uses semantic book lists and article names', () => {
    expect(reading).toContain("hh('ul', { 'aria-label': 'Tracked books'");
    expect(reading).toContain("return hh('li', { key: 'bk-' + book.id");
    expect(reading).toContain("hh('article', { 'aria-label': book.title + '. Status: ' + status.label + ratingText }");
  });

  it('exposes status and rating as text rather than icons alone', () => {
    expect(reading).toContain("'Status: ' + status.label");
    expect(reading).toContain("'Rating ' + book.rating + '/5");
    expect(reading).toContain("'aria-hidden': 'true'");
  });

  it('provides named 44-pixel edit and delete actions', () => {
    expect(reading).toContain("'aria-label': 'Edit book: ' + book.title");
    expect(reading).toContain("'aria-label': 'Delete book: ' + book.title");
    expect(reading.match(/minWidth: 44, minHeight: 44/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('uses app confirmation and announces state changes', () => {
    expect(reading).toContain("title: 'Delete this book?', confirmText: 'Delete book'");
    expect(reading).not.toContain("confirm('Delete this book?')");
    expect(reading).toContain("llAnnounce('Reading tracker book saved: '");
    expect(reading).toContain("llAnnounce('Book deleted from the reading tracker.')");
  });

  it('preserves the original creation date when editing', () => {
    expect(reading).toContain("var createdAt = index >= 0 ? books[index].createdAt : todayISO();");
    expect(reading).toContain("Object.assign({ id: id, createdAt: createdAt }, form");
  });

  it('preserves unrelated section data when updating books', () => {
    expect(reading).toContain("setData(Object.assign({}, data, { books:");
    expect(reading).not.toContain("setData({ books:");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
