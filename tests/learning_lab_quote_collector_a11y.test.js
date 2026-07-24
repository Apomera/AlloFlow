import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Quote Collector accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalQuoteCollector(props) {');
  const end = source.indexOf('  function PersonalCrisisPlan(props) {', start);
  const collector = source.slice(start, end);

  it('uses a named form with native submit behavior', () => {
    expect(collector).toContain("onSubmit: function(event) { event.preventDefault(); save(); }");
    expect(collector).toContain("'aria-labelledby': 'learning-lab-quote-form-heading'");
    expect(collector).toContain("hh('button', { type: 'submit'");
  });

  it('associates visible labels with all quote fields', () => {
    expect(collector).toContain("htmlFor: 'learning-lab-quote-text'");
    for (const id of ['source', 'tag', 'context']) {
      expect(collector).toContain(`textField('learning-lab-quote-${id}'`);
    }
    expect(collector).toContain("'Quote (required)'");
  });

  it('reports and focuses missing quote text inline', () => {
    expect(collector).toContain("setQuoteError('Enter the quote you want to save.')");
    expect(collector).toContain("focusById('learning-lab-quote-text')");
    expect(collector).toContain("id: 'learning-lab-quote-text-error', role: 'alert'");
    expect(collector).toContain("'aria-invalid': quoteError ? 'true' : undefined");
    expect(collector).not.toContain('alert(');
  });

  it('trims saved values and normalizes a leading tag hash', () => {
    expect(collector).toContain('text: text');
    expect(collector).toContain('source: form.source.trim()');
    expect(collector).toContain("tag: form.tag.trim().replace(/^#/, '')");
  });

  it('preserves unrelated section data when saving and deleting', () => {
    expect(collector).toContain("setData(Object.assign({}, data, { quotes: [quote].concat(rawQuotes) }))");
    expect(collector).toContain("setData(Object.assign({}, data, { quotes: rawQuotes.filter");
  });

  it('confirms removal through the accessible app dialog', () => {
    expect(collector).toContain("title: 'Remove this quote?', confirmText: 'Remove quote'");
    expect(collector).not.toContain('confirm(');
  });

  it('uses a labeled search landmark and live result count', () => {
    expect(collector).toContain("hh('form', { role: 'search'");
    expect(collector).toContain("htmlFor: 'learning-lab-quote-search'");
    expect(collector).toContain("type: 'search'");
    expect(collector).toContain("id: 'learning-lab-quote-results-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
  });

  it('searches quote context in addition to quote, source, and tag', () => {
    expect(collector).toContain("textValue(q.context).toLowerCase().indexOf(normalizedSearch)");
    expect(collector).toContain("search.trim().toLowerCase()");
  });

  it('provides a focus-restoring clear-search control', () => {
    expect(collector).toContain("'Clear search'");
    expect(collector).toContain("llAnnounce('Quote search cleared.");
    expect(collector).toContain("focusById('learning-lab-quote-search')");
  });

  it('uses semantic quotation and citation markup', () => {
    expect(collector).toContain("hh('blockquote'");
    expect(collector).toContain("hh('cite', null, textValue(random.source).trim())");
    expect(collector).toContain("hh('cite', null, textValue(q.source).trim())");
    expect(collector).toContain("hh('time', { dateTime: textValue(q.date).trim() }");
  });

  it('uses a semantic results list with labeled articles', () => {
    expect(collector).toContain("hh('ul', { 'aria-label': 'Saved quote results'");
    expect(collector).toContain("return hh('li', { key: 'qu-' + q.id");
    expect(collector).toContain("hh('article', { 'aria-labelledby': 'learning-lab-quote-heading-' + q.id }");
  });

  it('names removal controls using quote text', () => {
    expect(collector).toContain("'aria-label': 'Remove quote: ' + quoteLabel");
    expect(collector).toContain("onClick: function() { remove(q); }");
  });

  it('keeps the featured quote stable across ordinary rerenders', () => {
    expect(collector).toContain("var rs = R.useState(function()");
    expect(collector).toContain("quote.id === featuredId");
    expect(collector).toContain("'Show another quote'");
    expect(collector).toContain("llAnnounce('Another quote is now featured'");
  });

  it('announces save, validation, removal, and search state changes', () => {
    expect(collector).toContain("llAnnounce('Quote was not saved.");
    expect(collector).toContain("llAnnounce('Quote saved'");
    expect(collector).toContain("llAnnounce('Quote removed.')");
    expect(collector).toContain("llAnnounce('Quote search cleared.");
  });

  it('provides 44-pixel fields and controls', () => {
    expect(collector).toContain("width: '100%', minHeight: 44");
    expect(collector).toContain('minWidth: 44, minHeight: 44');
    expect(collector).toContain("minHeight: 44, padding: '9px 12px'");
  });

  it('handles malformed legacy quote data without crashing', () => {
    expect(collector).toContain('var rawQuotes = Array.isArray(data.quotes) ? data.quotes : [];');
    expect(collector).toContain('var quotes = rawQuotes.filter(isRecord);');
    expect(collector).toContain('var initialQuotes = rawQuotes.filter(isRecord);');
    expect(collector).toContain("var quoteLabel = textValue(q.text).trim() || 'Untitled quote';");
    expect(source).toContain("stat: (Array.isArray((data.mytkQuote || {}).quotes) ? (data.mytkQuote || {}).quotes.length : 0) + ' quotes'");
  });

  it('explains local-only saving', () => {
    expect(collector).toContain('Your collection is saved only in your Personal Toolkit and is not shared with or sent to anyone.');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
