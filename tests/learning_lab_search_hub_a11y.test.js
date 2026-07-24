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

  it('explains exact scope, privacy, and non-ranking limits', () => {
    expect(search).toContain('Search saved Cornell Notes, Learning Journal entries, Reflection Prompts, Weekly Reflections, Goals, and Brain Dump items.');
    expect(search).toContain('exact character matching, not a relevance score or assessment of importance');
    expect(search).toContain('This view does not save the search term or create new records');
    expect(search).toContain('does not itself notify a teacher, school, employer, clinician, or family member');
  });

  it('uses explicit submit-based search without stealing focus', () => {
    expect(search).toContain('function submitSearch(event)');
    expect(search).toContain('setSubmittedQuery(nextQuery)');
    expect(search).toContain("hh('button', { type: 'submit'");
    expect(search).toContain('Results do not update while you are typing.');
    expect(search).not.toContain('autoFocus: true');
    expect(search).not.toContain('Results update as you type');
  });

  it('uses a named search landmark and visible labels', () => {
    expect(search).toContain("hh('form', { role: 'search'");
    expect(search).toContain("'aria-labelledby': 'learning-lab-search-heading'");
    expect(search).toContain("htmlFor: 'learning-lab-toolkit-search'");
    expect(search).toContain("id: 'learning-lab-toolkit-search', type: 'search'");
    expect(search).toContain("htmlFor: 'learning-lab-toolkit-source-filter'");
    expect(search).toContain("id: 'learning-lab-toolkit-source-filter'");
  });

  it('uses a native source filter and supports one-character searches', () => {
    expect(search).toContain("hh('select', { id: 'learning-lab-toolkit-source-filter'");
    expect(search).toContain("hh('option', { value: 'all' }, 'All selected sources')");
    expect(search).not.toContain('normalizedQuery.length >= 2');
    expect(search).not.toContain('Enter at least 2 characters');
  });

  it('normalizes legacy values and array shapes safely', () => {
    expect(search).toContain('function asArray(value) { return Array.isArray(value) ? value : []; }');
    expect(search).toContain("function textValue(value) { return value == null ? '' : String(value); }");
    expect(search).toContain('values.map(textValue)');
    expect(search).not.toContain("(note.title || '').toLowerCase()");
  });

  it('deduplicates weekly reflections into one result per record', () => {
    expect(search).toContain('var reflectionValues = [reflection.week, reflection.went_well, reflection.stuck, reflection.will_try, reflection.wins, reflection.proud];');
    expect(search).toContain("addResult('reflections', reflection.id || index");
    expect(search).not.toContain("['went_well', 'stuck', 'will_try', 'wins', 'proud'].forEach");
  });

  it('renders every matching result without a silent cap', () => {
    expect(search).toContain('var filteredResults =');
    expect(search).toContain('filteredResults.map(function(result, index)');
    expect(search).not.toContain('results.slice(0, 30)');
    expect(search).not.toContain('visibleResults');
    expect(search).not.toContain('Showing the first');
  });

  it('uses safe date parsing and stable ordering for malformed dates', () => {
    expect(search).toContain('function dateInfo(raw)');
    expect(search).toContain('Number.isNaN(parsed.getTime())');
    expect(search).toContain('var aTime = a.date ? a.date.timestamp : -Infinity;');
    expect(search).toContain("hh('time', { dateTime: result.date.dateTime");
    expect(search).toContain("'Date not recorded'");
  });

  it('builds contextual bounded snippets around the matching text', () => {
    expect(search).toContain('function makeSnippet(values, query)');
    expect(search).toContain('matchIndex - 80');
    expect(search).toContain('startAt + 240');
    expect(search).toContain("'…'");
  });

  it('announces complete result counts and empty states', () => {
    expect(search).toContain("role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
    expect(search).toContain("'No matches found in the selected saved content.'");
    expect(search).toContain("filteredResults.length === 1 ? ' result found.' : ' results found.'");
  });

  it('provides a clear action that restores input focus', () => {
    expect(search).toContain("'aria-label': 'Clear toolkit search'");
    expect(search).toContain("queueFocus('learning-lab-toolkit-search')");
    expect(search).toContain('setSourceFilter(\'all\')');
  });

  it('uses semantic result headings, lists, and articles', () => {
    expect(search).toContain("'aria-label': 'All matching toolkit search results'");
    expect(search).toContain("hh('article', { 'aria-labelledby': headingId }");
    expect(search).toContain("hh('h4', { id: headingId");
    expect(search).toContain("id: 'learning-lab-search-results-heading'");
  });

  it('updates the catalog to submit-based selected-source wording', () => {
    expect(source).toContain("desc: 'Explicit search across six selected personal tools'");
    expect(source).toContain("'Submit-based local text search across six named personal Learning Lab tools.'");
    expect(source).not.toContain('Instant full-text search across notes');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
