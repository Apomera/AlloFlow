import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Screen-Time Tracker accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalScreenTime(props) {');
  const end = source.indexOf('  // ── DDDD. PERSONAL DAILY 3 (Wave 17) ──', start);
  const tracker = source.slice(start, end);

  it('uses contextual, nonjudgmental framing', () => {
    expect(tracker).toContain('Record optional estimates and notice patterns in context.');
    expect(tracker).toContain('A number alone does not determine whether screen use was helpful or harmful.');
    expect(tracker).toContain('Estimates in context, not a health score');
    expect(tracker).not.toContain('Honest framing');
  });

  it('states monitoring, diagnostic, and privacy boundaries', () => {
    expect(tracker).toContain('This tool does not monitor your device or collect usage automatically.');
    expect(tracker).toContain('are not a diagnosis or medical recommendation');
    expect(tracker).toContain('avoid sensitive details on a shared device');
  });

  it('uses a named form with native submit behavior', () => {
    expect(tracker).toContain("hh('form', { onSubmit: function(event) { event.preventDefault(); save(); }");
    expect(tracker).toContain("'aria-labelledby': 'learning-lab-screen-time-form-heading'");
    expect(tracker).toContain("type: 'submit'");
  });

  it('gives each range a stable programmatic label', () => {
    expect(tracker).toContain("var inputId = 'learning-lab-screen-time-' + config.id");
    expect(tracker).toContain("hh('label', { htmlFor: inputId");
    expect(tracker).toContain("hh('input', { id: inputId, type: 'range'");
  });

  it('associates each range with visible output and help', () => {
    expect(tracker).toContain("hh('output', { id: outputId, htmlFor: inputId");
    expect(tracker).toContain("hh('p', { id: helpId");
    expect(tracker).toContain("'aria-describedby': helpId + ' ' + outputId");
  });

  it('provides range value text including units', () => {
    expect(tracker).toContain("'aria-valuetext': config.valueText");
    expect(tracker).toContain("number === 1 ? ' hour' : ' hours'");
    expect(tracker).toContain("number.toFixed(0) + ' out of 10'");
  });

  it('uses explicit endpoints for the reflective range', () => {
    expect(tracker).toContain("endpoints: ['1 — Not at all', '10 — Very well']");
    expect(tracker).toContain('there is no correct score');
  });

  it('allows a valid full-day range in half-hour increments', () => {
    expect(tracker).toContain("min: 0, max: 24, step: 0.5");
  });

  it('constrains component estimates to total time', () => {
    expect(tracker).toContain('scrolling: Math.min(form.scrolling, total)');
    expect(tracker).toContain('productive: Math.min(form.productive, total)');
    expect(tracker).toContain('max: form.total');
    expect(tracker).toContain('neither can be greater than total time');
  });

  it('normalizes values before saving', () => {
    expect(tracker).toContain('clampNumber(form.total, 0, 24, 0)');
    expect(tracker).toContain('clampNumber(form.scrolling, 0, total, 0)');
    expect(tracker).toContain('clampNumber(form.productive, 0, total, 0)');
    expect(tracker).toContain('clampNumber(form.reflective, 1, 10, 5)');
  });

  it('preserves unrelated data while saving', () => {
    expect(tracker).toContain("setData(Object.assign({}, data, { logs: [entry].concat(data.logs || []) }))");
  });

  it('announces saving and moves focus to persistent history', () => {
    expect(tracker).toContain("llAnnounce('Screen-time estimate saved for today.')");
    expect(tracker).toContain("focusById('learning-lab-screen-time-history-heading')");
  });

  it('uses local dates to build the seven-day window', () => {
    expect(tracker).toContain('function localISO(date)');
    expect(tracker).toContain('startDate.setDate(startDate.getDate() - 6)');
    expect(tracker).toContain('var sevenDayStart = localISO(startDate)');
  });

  it('calculates averages from actual logged dates rather than record position', () => {
    expect(tracker).toContain("log.date >= sevenDayStart && log.date <= today");
    expect(tracker).toContain("function averageFor(key)");
    expect(tracker).not.toContain('logs.slice(0, 7)');
  });

  it('distinguishes no summary data from zero hours', () => {
    expect(tracker).toContain("avg7Total === null ? 'No data'");
    expect(tracker).toContain("avg7Scroll === null ? 'No data'");
    expect(tracker).not.toContain("'—'");
  });

  it('uses a named semantic description list for statistics', () => {
    expect(tracker).toContain("'aria-labelledby': 'learning-lab-screen-time-stats-heading'");
    expect(tracker).toContain("hh('dl'");
    expect(tracker).toContain("hh('dt'");
    expect(tracker).toContain("hh('dd'");
  });

  it('provides a named today summary with every metric', () => {
    expect(tracker).toContain("'aria-labelledby': 'learning-lab-screen-time-today-heading'");
    expect(tracker).toContain("{ label: 'Total', value: hourText(todayLog.total) }");
    expect(tracker).toContain("{ label: 'Scrolling or feeds', value: hourText(todayLog.scrolling) }");
    expect(tracker).toContain("{ label: 'Intentional or task-focused', value: hourText(todayLog.productive) }");
    expect(tracker).toContain("{ label: 'Fit with your needs', value: scoreText(todayLog.reflective) }");
  });

  it('explains how to change the one-per-day estimate', () => {
    expect(tracker).toContain('remove today’s saved entry below and enter it again');
  });

  it('always provides a named history and useful empty state', () => {
    expect(tracker).toContain("hh('section', { 'aria-labelledby': 'learning-lab-screen-time-history-heading'");
    expect(tracker).toContain("id: 'learning-lab-screen-time-history-heading', tabIndex: -1");
    expect(tracker).toContain('No screen-time entries saved yet.');
  });

  it('sorts saved entries by date and does not hide older records', () => {
    expect(tracker).toContain("logs.slice().sort(function(a, b)");
    expect(tracker).toContain("hh('ul', { 'aria-label': 'Saved screen-time entries, newest first'");
    expect(tracker).not.toContain('logs.slice(0, 14)');
  });

  it('uses labeled articles and time semantics for saved entries', () => {
    expect(tracker).toContain("hh('article', { 'aria-labelledby': headingId");
    expect(tracker).toContain("hh('h3', { id: headingId");
    expect(tracker).toContain("hh('time', { dateTime: entry.date || undefined }, entry.date || 'date unavailable')");
  });

  it('makes every saved metric available in a semantic description list', () => {
    expect(tracker).toContain("'aria-label': 'Screen-time estimates'");
    expect(tracker).toContain("{ label: 'Total', value: hourText(entry.total) }");
    expect(tracker).toContain("{ label: 'Scrolling or feeds', value: hourText(entry.scrolling) }");
    expect(tracker).toContain("{ label: 'Intentional or task-focused', value: hourText(entry.productive) }");
    expect(tracker).toContain("{ label: 'Fit with your needs', value: scoreText(entry.reflective) }");
  });

  it('handles missing or invalid legacy values without presenting false zeroes', () => {
    expect(tracker).toContain("return 'Not recorded'");
    expect(tracker).toContain("number === null ? 'Not recorded'");
  });

  it('confirms removal while preserving unrelated data', () => {
    expect(tracker).toContain("title: 'Remove this screen-time entry?', confirmText: 'Remove entry'");
    expect(tracker).toContain('This cannot be undone.');
    expect(tracker).toContain("setData(Object.assign({}, data, { logs: (data.logs || []).filter");
  });

  it('names removal, announces it, and restores history focus', () => {
    expect(tracker).toContain("'aria-label': 'Remove screen-time entry from '");
    expect(tracker).toContain("llAnnounce('Saved screen-time entry removed.')");
    expect(tracker).toContain("focusById('learning-lab-screen-time-history-heading')");
  });

  it('uses responsive layouts and 44-pixel controls', () => {
    expect(tracker).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'");
    expect(tracker).toContain("width: '100%', minHeight: 44");
    expect(tracker).toContain('minWidth: 44, minHeight: 44');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
