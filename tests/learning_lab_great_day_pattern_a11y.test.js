import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Day Pattern Reflection accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalGreatDay(props) {');
  const end = source.indexOf('  function PersonalSensoryProfile(props) {', start);
  const pattern = source.slice(start, end);

  it('frames the tool as an optional reflection rather than a formula', () => {
    expect(pattern).toContain("'Day Pattern Reflection'");
    expect(pattern).toContain('Record a personal rating and any details you want');
    expect(pattern).not.toContain('Find YOUR formula');
  });

  it('explains that the scale is user-defined and nonjudgmental', () => {
    expect(pattern).toContain("'Your scale, your interpretation'");
    expect(pattern).toContain('You decide what each rating means.');
    expect(pattern).toContain('A lower number is not a failure');
  });

  it('states that prompts are not a health or productivity assessment', () => {
    expect(pattern).toContain('not a formula, health assessment, or measure of productivity');
    expect(pattern).toContain('This does not need to be an accomplishment or productivity measure.');
  });

  it('uses a named form with native submit behavior', () => {
    expect(pattern).toContain("onSubmit: function(event) { event.preventDefault(); save(); }");
    expect(pattern).toContain("'aria-labelledby': 'learning-lab-day-pattern-form-heading'");
    expect(pattern).toContain("type: 'submit'");
  });

  it('associates a visible dynamic label with the rating range', () => {
    expect(pattern).toContain("htmlFor: 'learning-lab-day-pattern-rating'");
    expect(pattern).toContain("'Personal day rating: ' + form.rating + ' out of 10'");
    expect(pattern).toContain("id: 'learning-lab-day-pattern-rating', type: 'range', min: 1, max: 10, step: 1");
  });

  it('provides a linked live output and scale instructions', () => {
    expect(pattern).toContain("hh('output', { htmlFor: 'learning-lab-day-pattern-rating', 'aria-live': 'polite'");
    expect(pattern).toContain("form.rating + ' out of 10'");
    expect(pattern).toContain('There are no predefined labels for the ends of the scale.');
  });

  it('validates and reports an invalid rating inline', () => {
    expect(pattern).toContain('Number.isInteger(number) && number >= 1 && number <= 10');
    expect(pattern).toContain("setRatingError('Choose a whole-number rating from 1 through 10.')");
    expect(pattern).toContain("id: 'learning-lab-day-pattern-rating-error', role: 'alert'");
    expect(pattern).toContain("focusById('learning-lab-day-pattern-rating')");
  });

  it('associates every optional prompt with visible label and help text', () => {
    expect(pattern).toContain("htmlFor: inputId");
    expect(pattern).toContain("'aria-describedby': helpId");
    expect(pattern).toContain("hh('p', { id: helpId");
  });

  it('uses inclusive prompt choices and avoids prescriptive examples', () => {
    expect(pattern).toContain('Movement, stillness, or physical comfort (optional)');
    expect(pattern).toContain('Connection or time alone (optional)');
    expect(pattern).not.toContain('had breakfast, real lunch');
    expect(pattern).not.toContain('actually talked to mom at dinner');
  });

  it('bounds optional note length while preserving multiline display', () => {
    expect(pattern).toContain("type: 'text', value: form[prompt.id], maxLength: 2000");
    expect(pattern).toContain("whiteSpace: 'pre-wrap'");
  });

  it('preserves unrelated data and trims note values when saving', () => {
    expect(pattern).toContain("slept: form.slept.trim(), ate: form.ate.trim()");
    expect(pattern).toContain("setData(Object.assign({}, data, { entries: [entry].concat(data.entries || []) }))");
  });

  it('announces successful saving and restores rating focus', () => {
    expect(pattern).toContain("llAnnounce('Day pattern reflection saved with a rating of '");
    expect(pattern).toContain("focusById('learning-lab-day-pattern-rating')");
  });

  it('does not impose an arbitrary great-day threshold or traffic-light colors', () => {
    expect(pattern).not.toContain('greatEntries');
    expect(pattern).not.toContain('rating >= 8');
    expect(pattern).not.toContain("? '#22c55e'");
    expect(pattern).toContain('ratings do not have a fixed interpretation');
  });

  it('uses a named semantic history list of labeled articles', () => {
    expect(pattern).toContain("'aria-labelledby': 'learning-lab-day-pattern-history-heading'");
    expect(pattern).toContain("hh('ul', { 'aria-label': 'Most recent day reflections'");
    expect(pattern).toContain("hh('article', { 'aria-labelledby': headingId");
    expect(pattern).toContain("hh('h3', { id: headingId");
  });

  it('provides textual rating headings and time semantics', () => {
    expect(pattern).toContain("'Day rated ' + rating + ' out of 10'");
    expect(pattern).toContain("hh('time', { dateTime: entry.date || undefined }, relDate(entry.date))");
  });

  it('renders optional notes as a named definition list', () => {
    expect(pattern).toContain("hh('dl', { 'aria-label': 'Optional notes for this day reflection'");
    expect(pattern).toContain("hh('dt'");
    expect(pattern).toContain("hh('dd'");
    expect(pattern).toContain('No optional notes were saved with this rating.');
  });

  it('confirms removal while preserving unrelated data', () => {
    expect(pattern).toContain("title: 'Remove this reflection?', confirmText: 'Remove reflection'");
    expect(pattern).toContain('This cannot be undone.');
    expect(pattern).toContain("setData(Object.assign({}, data, { entries: (data.entries || []).filter");
  });

  it('names removal controls, announces removal, and restores focus', () => {
    expect(pattern).toContain("'aria-label': 'Remove day reflection rated ' + rating + ' out of 10'");
    expect(pattern).toContain("llAnnounce('Saved day reflection removed.')");
    expect(pattern).toContain("focusById('learning-lab-day-pattern-history-heading')");
  });

  it('discloses local storage and shared-device privacy', () => {
    expect(pattern).toContain('Ratings and notes save in this browser.');
    expect(pattern).toContain('if other people use this device.');
    expect(pattern).toContain("'aria-describedby': 'learning-lab-day-pattern-privacy-note learning-lab-day-pattern-rating-help'");
  });

  it('uses responsive 44-pixel fields and controls', () => {
    expect(pattern).toContain("width: '100%', minHeight: 44");
    expect(pattern).toContain("minWidth: 44, minHeight: 44");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
