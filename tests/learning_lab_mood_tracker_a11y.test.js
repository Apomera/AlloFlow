import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Personal Mood Tracker accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalMoodTracker(props) {');
  const end = source.indexOf('  function PersonalFutureSelf(props) {', start);
  const tracker = source.slice(start, end);

  it('uses a named form with native submit behavior', () => {
    expect(tracker).toContain("hh('form', { onSubmit: function(event) { event.preventDefault(); save(); }, 'aria-labelledby': 'learning-lab-mood-form-heading' }");
    expect(tracker).toContain("hh('button', { type: 'submit'");
    expect(tracker).toContain("id: 'learning-lab-mood-form-heading'");
  });

  it('associates visible labels with both range controls', () => {
    expect(tracker).toContain("rangeField('learning-lab-mood-rating', 'Mood'");
    expect(tracker).toContain("rangeField('learning-lab-energy-rating', 'Energy'");
    expect(tracker).toContain("hh('label', { htmlFor: id");
    expect(tracker).toContain("hh('input', { id: id, type: 'range'");
  });

  it('exposes numeric range output and descriptive value text', () => {
    expect(tracker).toContain("hh('output', { htmlFor: id");
    expect(tracker).toContain("'aria-valuetext': value + ' out of 10, from ' + lowLabel + ' to ' + highLabel");
    expect(tracker).toContain("value + ' / 10'");
  });

  it('associates a visible optional label with the context note', () => {
    expect(tracker).toContain("htmlFor: 'learning-lab-mood-note'");
    expect(tracker).toContain("id: 'learning-lab-mood-note', type: 'text'");
    expect(tracker).toContain("'Context note (optional)'");
  });

  it('discloses local saving and sensitive-data considerations', () => {
    expect(tracker).toContain('Your check-in saves in this browser.');
    expect(tracker).toContain('Mood information can be personal');
    expect(tracker).toContain("'aria-describedby': 'learning-lab-mood-privacy-note'");
  });

  it('trims the optional note and preserves unrelated section data', () => {
    expect(tracker).toContain('note: form.note.trim()');
    expect(tracker).toContain("setData(Object.assign({}, data, { logs: [entry].concat(rawMoodLogs) }))");
    expect(tracker).toContain("setData(Object.assign({}, data, { logs: rawMoodLogs.filter");
  });

  it('announces saved mood and energy values', () => {
    expect(tracker).toContain("llAnnounce('Mood check-in saved. Mood ' + entry.mood + ' out of 10 and energy ' + entry.energy + ' out of 10.')");
  });

  it('uses a semantic definition list for summary statistics', () => {
    expect(tracker).toContain("hh('dl', { 'aria-label': 'Mood tracker summary'");
    expect(tracker).toContain("hh('dt'");
    expect(tracker).toContain("hh('dd'");
  });

  it('calculates averages from the same displayed 14-day window', () => {
    expect(tracker).toContain("var recentLogs = last14.map(function(day) { return day.log; }).filter(Boolean)");
    expect(tracker).toContain('recentLogs.reduce');
    expect(tracker).not.toContain('logs.slice(0, 14).reduce');
  });

  it('labels the completed daily state as a semantic section', () => {
    expect(tracker).toContain("'aria-labelledby': 'learning-lab-mood-today-heading'");
    expect(tracker).toContain("id: 'learning-lab-mood-today-heading'");
    expect(tracker).toContain("'Mood ' + ratingOf(todayLog.mood) + ' out of 10; energy '");
  });

  it('uses a named semantic list for the 14-day history', () => {
    expect(tracker).toContain("'aria-labelledby': 'learning-lab-mood-history-heading'");
    expect(tracker).toContain("hh('ul', { 'aria-label': 'Fourteen-day mood history'");
    expect(tracker).toContain("return hh('li', { key: 'mo-' + day.date");
  });

  it('provides dates and numeric text for every chart column', () => {
    expect(tracker).toContain("hh('time', { dateTime: day.date, 'aria-label': day.date");
    expect(tracker).toContain("'aria-label': moodVal ? 'Mood ' + moodVal + ' out of 10' : 'No mood logged'");
    expect(tracker).toContain("moodVal || '—'");
  });

  it('marks chart decoration hidden and explains that color is supplemental', () => {
    expect(tracker).toContain("hh('div', { 'aria-hidden': 'true', style: { height: 56");
    expect(tracker).toContain('color is only an additional cue');
    expect(tracker).not.toContain('title: d.date');
  });

  it('uses a semantic recent-history list with labeled articles', () => {
    expect(tracker).toContain("'aria-labelledby': 'learning-lab-mood-recent-heading'");
    expect(tracker).toContain("return hh('li', { key: 'ml-' + log.id");
    expect(tracker).toContain("hh('article', { 'aria-labelledby': headingId");
  });

  it('uses definition-list semantics for mood and energy details', () => {
    expect(tracker).toContain("ratingOf(log.mood) + ' out of 10'");
    expect(tracker).toContain("ratingOf(log.energy) + ' out of 10'");
    expect(tracker).toContain("'Context: ' + textValue(log.note).trim()");
  });

  it('confirms deletion in the accessible app dialog', () => {
    expect(tracker).toContain("title: 'Remove this mood check-in?', confirmText: 'Remove check-in'");
    expect(tracker).not.toContain('confirm(');
  });

  it('names deletion controls and restores focus after removal', () => {
    expect(tracker).toContain("'aria-label': 'Remove mood check-in from ' + logDate");
    expect(tracker).toContain("focusById('learning-lab-mood-recent-heading')");
    expect(tracker).toContain("llAnnounce('Mood check-in removed.')");
  });

  it('provides 44-pixel fields and controls', () => {
    expect(tracker).toContain("width: '100%', minHeight: 44");
    expect(tracker).toContain("minWidth: 44, minHeight: 44");
    expect(tracker).toContain("minHeight: 44, padding: '9px 14px'");
  });

  it('builds the fourteen-day history from local dates, not UTC', () => {
    expect(tracker).toContain("var iso = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');");
    expect(tracker).not.toContain('toISOString');
  });

  it('handles malformed legacy log data and renders every check-in without a cap', () => {
    expect(tracker).toContain('var rawMoodLogs = Array.isArray(data.logs) ? data.logs : [];');
    expect(tracker).toContain('var logs = rawMoodLogs.filter(isRecord);');
    expect(tracker).toContain('function ratingOf(value) { return Math.max(0, Math.min(10, Number(value) || 0)); }');
    expect(tracker).toContain("textValue(log.date).trim() || 'Date not recorded'");
    expect(tracker).toContain('logs.map(function(log)');
    expect(tracker).not.toContain('.slice(0, 20)');
    expect(source).toContain("stat: (Array.isArray((data.mytkMood || {}).logs) ? (data.mytkMood || {}).logs.length : 0) + ' logs'");
  });

  it('explains optional use, non-notification, and no-target framing with a support nudge', () => {
    expect(tracker).toContain('saving does not notify a teacher, school, clinician, or family member');
    expect(tracker).toContain('there is no target or good score');
    expect(tracker).toContain('consider talking with someone you trust, such as a counselor, family member, or friend');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
