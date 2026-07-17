import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Search Hub accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalSearchHub(props) {');
  const end = source.indexOf('  function PersonalCheatSheets(props) {', start);
  const search = source.slice(start, end);

  it('uses a named search landmark', () => {
    expect(search).toContain("hh('form', { role: 'search'");
    expect(search).toContain("'aria-labelledby': 'learning-lab-search-heading'");
    expect(search).toContain("onSubmit: function(event) { event.preventDefault(); }");
  });

  it('provides a visible label for the search field', () => {
    expect(search).toContain("htmlFor: 'learning-lab-toolkit-search'");
    expect(search).toContain("id: 'learning-lab-toolkit-search', type: 'search'");
    expect(search).toContain("'aria-describedby': 'learning-lab-toolkit-search-help'");
  });

  it('associates search with the results region', () => {
    expect(search).toContain("'aria-controls': 'learning-lab-search-results-region'");
    expect(search).toContain("id: 'learning-lab-search-results-region'");
    expect(search).toContain("'aria-labelledby': 'learning-lab-search-results-heading'");
  });

  it('applies the two-character threshold after trimming', () => {
    expect(search).toContain('var normalizedQuery = query.trim();');
    expect(search).toContain('if (normalizedQuery.length >= 2)');
    expect(search).toContain("var q = normalizedQuery.toLowerCase();");
    expect(search).not.toContain('if (query.length >= 2)');
  });

  it('provides a named 44-pixel clear action and restores input focus', () => {
    expect(search).toContain("'aria-label': 'Clear toolkit search'");
    expect(search).toContain('minWidth: 44, minHeight: 44');
    expect(search).toContain("document.getElementById('learning-lab-toolkit-search')");
    expect(search).toContain("if (input) input.focus()");
  });

  it('announces result counts and empty states concisely', () => {
    expect(search).toContain("role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
    expect(search).toContain("'No matches found across your toolkit.'");
    expect(search).toContain("results.length === 1 ? ' result found.' : ' results found.'");
  });

  it('discloses when results are capped', () => {
    expect(search).toContain('var visibleResults = results.slice(0, 30);');
    expect(search).toContain("'Showing the first ' + visibleResults.length + ' of ' + results.length + ' results.'");
  });

  it('uses a semantic list of labeled result articles', () => {
    expect(search).toContain("hh('ul', { 'aria-label': 'Search results'");
    expect(search).toContain("return hh('li', { key: 'sr-' + index");
    expect(search).toContain("hh('article', { 'aria-labelledby': headingId }");
    expect(search).toContain("hh('h4', { id: headingId");
  });

  it('does not use source accent colors for small source text', () => {
    expect(search).toContain("color: 'var(--allo-stem-text, #cbd5e1)'");
    expect(search).toContain("hh('span', { 'aria-hidden': 'true' }, result.sourceIcon + ' ')");
    expect(search).not.toContain('color: result.sourceColor, fontWeight: 700');
  });

  it('handles malformed Brain Dump timestamps without eager conversion', () => {
    expect(search).toContain("date: item.createdAt");
    expect(search).not.toContain("new Date(item.createdAt).toISOString()");
    expect(search).toContain('var validDate = resultDate && Number.isFinite(resultDate.getTime());');
  });

  it('uses machine-readable dates when values parse successfully', () => {
    expect(search).toContain("hh('time', { dateTime: resultDate.toISOString()");
    expect(search).toContain("result.date ? validDate ? hh('time'");
  });

  it('provides a 44-pixel search field', () => {
    expect(search).toContain('minHeight: 44');
    expect(search).toContain("autoComplete: 'off', maxLength: 500");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
