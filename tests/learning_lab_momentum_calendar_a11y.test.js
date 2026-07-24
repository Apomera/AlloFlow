import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Momentum Calendar accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalMomentum(props) {');
  const end = source.indexOf('  // ── CCCC. PERSONAL SCREEN-TIME TRACKER (Wave 16) ──', start);
  const calendar = source.slice(start, end);

  it('uses neutral progress language rather than streak pressure', () => {
    expect(calendar).toContain('Mark days using your own definition of progress.');
    expect(calendar).toContain('Missed or unmarked days do not erase progress, reset a score, or indicate failure.');
    expect(calendar).not.toContain("don't break the chain");
    expect(calendar).not.toContain('🔥');
    expect(calendar).not.toContain('streak');
  });

  it('labels the non-scoring context as an aside', () => {
    expect(calendar).toContain("hh('aside', { 'aria-labelledby': 'learning-lab-momentum-context-heading'");
    expect(calendar).toContain('A neutral record, not a score');
  });

  it('uses a named form with native submit behavior', () => {
    expect(calendar).toContain("hh('form', { onSubmit: function(event) { event.preventDefault(); addHabit(); }");
    expect(calendar).toContain("'aria-labelledby': 'learning-lab-momentum-form-heading'");
    expect(calendar).toContain("type: 'submit'");
  });

  it('provides visible labels for the name and color controls', () => {
    expect(calendar).toContain("htmlFor: 'learning-lab-momentum-label'");
    expect(calendar).toContain("htmlFor: 'learning-lab-momentum-color'");
  });

  it('replaces unnamed color dots with a named native select', () => {
    expect(calendar).toContain("hh('select', { id: 'learning-lab-momentum-color'");
    expect(calendar).toContain("hh('option', { key: color.value, value: color.value }, color.label)");
    expect(calendar).toContain("{ value: '#10b981', label: 'Green' }");
    expect(calendar).not.toContain("key: 'cl-'");
  });

  it('states that color is not the only state indicator', () => {
    expect(calendar).toContain('Color is a visual preference only; marked state is also shown in text.');
    expect(calendar).toContain("'aria-describedby': 'learning-lab-momentum-privacy learning-lab-momentum-color-note'");
  });

  it('requires and bounds the habit or activity name', () => {
    expect(calendar).toContain('Habit or activity name (required)');
    expect(calendar).toContain('required: true, maxLength: 1000');
  });

  it('reports and focuses an empty name inline', () => {
    expect(calendar).toContain("setLabelError('Enter a habit or activity name before saving.')");
    expect(calendar).toContain("id: 'learning-lab-momentum-label-error', role: 'alert'");
    expect(calendar).toContain("'aria-invalid': labelError ? 'true' : undefined");
    expect(calendar).toContain("focusById('learning-lab-momentum-label')");
  });

  it('trims names and normalizes unknown legacy colors', () => {
    expect(calendar).toContain('var label = form.label.trim()');
    expect(calendar).toContain('color: colorFor(form.color).value');
    expect(calendar).toContain('return COLORS.filter(function(color) { return color.value === value; })[0] || COLORS[0]');
  });

  it('preserves unrelated data while adding a calendar', () => {
    expect(calendar).toContain("setData(Object.assign({}, data, { habits: (data.habits || []).concat([habit]) }))");
  });

  it('announces saving and restores form focus', () => {
    expect(calendar).toContain("llAnnounce('Momentum item saved: ' + label)");
    expect(calendar).toContain("setForm(emptyForm); setLabelError('')");
    expect(calendar).toContain("focusById('learning-lab-momentum-label')");
  });

  it('discloses local storage privacy', () => {
    expect(calendar).toContain('Names and marked dates save in this browser.');
    expect(calendar).toContain('Avoid sensitive details if other people use this device.');
  });

  it('uses local calendar dates instead of UTC conversion', () => {
    expect(calendar).toContain('function localISO(date)');
    expect(calendar).toContain("date.setHours(12, 0, 0, 0)");
    expect(calendar).not.toContain("dt.toISOString().slice(0, 10)");
  });

  it('provides localized full-date labels with an ISO fallback', () => {
    expect(calendar).toContain("date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })");
    expect(calendar).toContain('isNaN(date.getTime()) ? iso');
  });

  it('always provides a named calendar section and useful empty state', () => {
    expect(calendar).toContain("hh('section', { 'aria-labelledby': 'learning-lab-momentum-list-heading'");
    expect(calendar).toContain("id: 'learning-lab-momentum-list-heading', tabIndex: -1");
    expect(calendar).toContain('No momentum calendars saved yet.');
  });

  it('uses a semantic list of labeled calendar articles', () => {
    expect(calendar).toContain("hh('ul', { 'aria-label': 'Saved momentum calendars'");
    expect(calendar).toContain("hh('article', { 'aria-labelledby': headingId");
    expect(calendar).toContain("hh('h3', { id: headingId");
  });

  it('uses time semantics for created dates', () => {
    expect(calendar).toContain("hh('time', { dateTime: habit.createdAt }, relDate(habit.createdAt))");
  });

  it('uses a keyboard-operable disclosure before the dense grid', () => {
    expect(calendar).toContain("hh('details'");
    expect(calendar).toContain("hh('summary'");
    expect(calendar).toContain('Review or edit 12-week calendar');
    expect(calendar).toContain("alignItems: 'center', minHeight: 44");
  });

  it('names the 84-day calendar and describes its operation', () => {
    expect(calendar).toContain("role: 'group', 'aria-label': '84-day calendar for '");
    expect(calendar).toContain("'aria-describedby': instructionsId");
    expect(calendar).toContain('Press a date to switch between marked and not marked.');
  });

  it('groups dates into twelve named weeks', () => {
    expect(calendar).toContain('for (var weekIndex = 0; weekIndex < 12; weekIndex++)');
    expect(calendar).toContain("role: 'group', 'aria-label': 'Week ' + (index + 1)");
  });

  it('gives every date button a contextual accessible name', () => {
    expect(calendar).toContain("var accessibleLabel = dateLabel(day.date) + ': ' + (marked ? 'marked' : 'not marked')");
    expect(calendar).toContain("'aria-label': accessibleLabel");
  });

  it('exposes each date state programmatically', () => {
    expect(calendar).toContain("'aria-pressed': marked ? 'true' : 'false'");
  });

  it('meets the WCAG 2.2 AA 24-pixel target minimum for dense date controls', () => {
    expect(calendar).toContain('minWidth: 28, minHeight: 28, width: 28, height: 28');
    expect(calendar).toContain("gridTemplateColumns: 'repeat(12, 28px)', gap: 4");
    expect(calendar).not.toContain('height: 12');
  });

  it('supports small screens without shrinking date targets', () => {
    expect(calendar).toContain("overflowX: 'auto'");
    expect(calendar).toContain('The grid may scroll horizontally on a small screen.');
  });

  it('copies legacy logs and preserves unrelated data when toggling', () => {
    expect(calendar).toContain('Array.isArray(nextLogs[habit.id]) ? nextLogs[habit.id].slice() : []');
    expect(calendar).toContain("setData(Object.assign({}, data, { logs: nextLogs }))");
  });

  it('announces date changes and restores date-button focus', () => {
    expect(calendar).toContain("llAnnounce((wasMarked ? 'Cleared ' : 'Marked ')");
    expect(calendar).toContain("focusById('learning-lab-momentum-day-' + safeDomId(habit.id) + '-' + day)");
  });

  it('shows a text count limited to the visible 84-day window', () => {
    expect(calendar).toContain('var visibleCount = days.filter');
    expect(calendar).toContain("visibleCount + ' of 84 days marked in this calendar.'");
  });

  it('confirms removal and preserves unrelated data while clearing associated logs', () => {
    expect(calendar).toContain("title: 'Remove this momentum item?', confirmText: 'Remove item'");
    expect(calendar).toContain('This cannot be undone.');
    expect(calendar).toContain('delete nextLogs[habit.id]');
    expect(calendar).toContain("setData(Object.assign({}, data, { habits:");
  });

  it('names removal, announces it, and restores list focus', () => {
    expect(calendar).toContain("'aria-label': 'Remove momentum calendar: '");
    expect(calendar).toContain("llAnnounce('Momentum item and its marked dates removed.')");
    expect(calendar).toContain("focusById('learning-lab-momentum-list-heading')");
  });

  it('wraps long names and uses 44-pixel primary controls', () => {
    expect(calendar).toContain("whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'");
    expect(calendar).toContain("width: '100%', minHeight: 44");
    expect(calendar).toContain('minWidth: 44, minHeight: 44');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
