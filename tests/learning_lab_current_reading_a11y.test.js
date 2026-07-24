import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Current Reading accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalCurrentReading(props) {');
  const end = source.indexOf('  function PersonalGreatDay(props) {', start);
  const reading = source.slice(start, end);

  it('uses a named add-book form with native submit behavior', () => {
    expect(reading).toContain("onSubmit: function(event) { event.preventDefault(); add(); }");
    expect(reading).toContain("'aria-labelledby': 'learning-lab-reading-add-heading'");
    expect(reading).toContain("type: 'submit'");
  });

  it('associates visible labels with all add-book fields', () => {
    expect(reading).toContain("htmlFor: 'learning-lab-reading-title'");
    expect(reading).toContain("htmlFor: 'learning-lab-reading-author'");
    expect(reading).toContain("htmlFor: 'learning-lab-reading-current-page'");
    expect(reading).toContain("htmlFor: 'learning-lab-reading-total-pages'");
  });

  it('uses native requirements and bounded field lengths', () => {
    expect(reading).toContain("id: 'learning-lab-reading-title', type: 'text', value: form.title, required: true, maxLength: 1000");
    expect(reading).toContain("id: 'learning-lab-reading-author', type: 'text', value: form.author, maxLength: 500");
    expect(reading).toContain("type: 'number', min: 0, max: 10000000, step: 1");
  });

  it('validates whole-number page values and current-versus-total order', () => {
    expect(reading).toContain('Number.isInteger(number) && number >= 0 && number <= 10000000');
    expect(reading).toContain("'Current page cannot be greater than total pages.'");
    expect(reading).toContain('validatePages(form.currentPage, form.totalPages)');
  });

  it('reports add errors inline and focuses the first invalid field', () => {
    expect(reading).toContain("setFormErrors(nextErrors); llAnnounce('Book not added. Review the highlighted fields.')");
    expect(reading).toContain("id: 'learning-lab-reading-title-error', role: 'alert'");
    expect(reading).toContain("id: 'learning-lab-reading-current-error', role: 'alert'");
    expect(reading).toContain("id: 'learning-lab-reading-total-error', role: 'alert'");
    expect(reading).toContain("'aria-invalid': formErrors.title ? 'true' : undefined");
  });

  it('preserves unrelated data and normalizes book values when adding', () => {
    expect(reading).toContain("title: title, author: form.author.trim(), currentPage: checked.current");
    expect(reading).toContain("setData(Object.assign({}, data, { books: [book].concat(data.books || []) }))");
  });

  it('announces successful addition and restores title focus', () => {
    expect(reading).toContain("llAnnounce('Book added: ' + title)");
    expect(reading).toContain("focusById('learning-lab-reading-title')");
  });

  it('uses per-book draft values instead of saving on every input change', () => {
    expect(reading).toContain('var pageDrafts = ps[0]; var setPageDrafts = ps[1]');
    expect(reading).toContain("setDraft(book, 'currentPage', event.target.value)");
    expect(reading).toContain("setDraft(book, 'totalPages', event.target.value)");
    expect(reading).not.toContain("onChange: function(e) { updatePage");
  });

  it('uses a named explicit form to save each book progress update', () => {
    expect(reading).toContain("onSubmit: function(event) { event.preventDefault(); updateProgress(book); }");
    expect(reading).toContain("'aria-label': 'Update reading progress for ' + String(book.title || 'Untitled book')");
    expect(reading).toContain("}, 'Save progress')");
  });

  it('visibly labels both per-book progress fields', () => {
    expect(reading).toContain("htmlFor: 'learning-lab-reading-progress-' + book.id + '-current'");
    expect(reading).toContain("htmlFor: 'learning-lab-reading-progress-' + book.id + '-total'");
  });

  it('reports per-book progress errors and focuses the invalid field', () => {
    expect(reading).toContain("llAnnounce('Reading progress not saved. Review the highlighted fields.')");
    expect(reading).toContain("'-current-error', role: 'alert'");
    expect(reading).toContain("'-total-error', role: 'alert'");
    expect(reading).toContain("focusById('learning-lab-reading-progress-' + book.id");
  });

  it('preserves unrelated book fields and application data on progress saves', () => {
    expect(reading).toContain("setData(Object.assign({}, data, { books: (data.books || []).map");
    expect(reading).toContain("Object.assign({}, item, { currentPage: checked.current, totalPages:");
    expect(reading).toContain("lastRead: todayISO()");
  });

  it('announces progress saving and restores book-heading focus', () => {
    expect(reading).toContain("llAnnounce('Reading progress saved for '");
    expect(reading).toContain("focusById('learning-lab-reading-book-heading-' + book.id)");
  });

  it('provides a complete textual progress summary', () => {
    expect(reading).toContain("return 'Page ' + current + ' of ' + total + ', '");
    expect(reading).toContain("return 'Page ' + current + '; total pages not set.'");
    expect(reading).toContain('Math.min(100, (current / total) * 100)');
  });

  it('uses a named native progress element when total pages are known', () => {
    expect(reading).toContain("hh('progress', { value: Math.min(current, total), max: total");
    expect(reading).toContain("'aria-label': 'Reading progress for ' + String(book.title || 'Untitled book')");
  });

  it('uses a named semantic book list with labeled articles and headings', () => {
    expect(reading).toContain("'aria-labelledby': 'learning-lab-reading-list-heading'");
    expect(reading).toContain("hh('ul', { 'aria-label': books.length");
    expect(reading).toContain("hh('article', { 'aria-labelledby': headingId");
    expect(reading).toContain("hh('h3', { id: headingId, tabIndex: -1");
  });

  it('hides book icons from assistive technology while retaining title text', () => {
    expect(reading).toContain("hh('span', { 'aria-hidden': 'true' }, '📖 ')");
    expect(reading).toContain("String(book.title || 'Untitled book')");
  });

  it('uses time semantics for start and last-updated dates', () => {
    expect(reading).toContain("hh('time', { dateTime: book.startedAt || undefined }, relDate(book.startedAt))");
    expect(reading).toContain("hh('time', { dateTime: book.lastRead }, relDate(book.lastRead))");
  });

  it('confirms removal and preserves unrelated data', () => {
    expect(reading).toContain("title: 'Remove this book?', confirmText: 'Remove book'");
    expect(reading).toContain('This cannot be undone.');
    expect(reading).toContain("setData(Object.assign({}, data, { books: (data.books || []).filter");
  });

  it('names removal controls, announces removal, and restores list focus', () => {
    expect(reading).toContain("'aria-label': 'Remove book: ' + String(book.title || 'Untitled book')");
    expect(reading).toContain("llAnnounce('Book removed from Currently Reading.')");
    expect(reading).toContain("focusById('learning-lab-reading-list-heading')");
  });

  it('discloses local storage and shared-device privacy', () => {
    expect(reading).toContain('Book details and progress save in this browser.');
    expect(reading).toContain('if other people use this device.');
    expect(reading).toContain("'aria-describedby': 'learning-lab-reading-privacy-note'");
  });

  it('uses responsive forms and 44-pixel fields and controls', () => {
    expect(reading).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))'");
    expect(reading).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))'");
    expect(reading).toContain("width: '100%', minHeight: 44");
    expect(reading).toContain("minWidth: 44, minHeight: 44");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
