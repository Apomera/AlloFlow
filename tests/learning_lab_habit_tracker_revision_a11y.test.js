import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Habit Tracker revised accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalHabitTracker(props) {');
  const end = source.indexOf('  function PersonalWeeklyReflection(props)', start);
  const tracker = source.slice(start, end);

  it('uses stable headings and effect-based focus restoration', () => {
    for (const id of ['learning-lab-habit-heading', 'learning-lab-habit-form-heading', 'learning-lab-habit-templates-heading', 'learning-lab-habit-list-heading']) expect(tracker).toContain(`'${id}'`);
    expect(tracker).toContain('document.getElementById(focusTarget)');
  });

  it('uses optional, non-punitive framing', () => {
    expect(tracker).toContain('Optional daily check-ins for routines you choose.');
    expect(tracker).toContain('Missing a check-in does not erase prior progress.');
    expect(tracker).not.toContain('Daily check-ins build the routine.');
  });

  it('frames templates as editable examples rather than health recommendations', () => {
    expect(tracker).toContain('These optional examples are not health recommendations.');
    expect(tracker).toContain('then edit it before saving.');
    expect(tracker).toContain("onClick: function() { openAdd(template); }");
    expect(tracker).not.toContain("onClick: function() { addHabit(h); setView('today'); }");
  });

  it('uses a named semantic list for template choices', () => {
    expect(tracker).toContain("hh('ul', { 'aria-labelledby': 'learning-lab-habit-templates-heading'");
    expect(tracker).toContain("return hh('li', { key: 'tp-' + index }");
    expect(tracker).toContain("'aria-label': 'Use editable example: ' + template.name");
  });

  it('hides template and habit icons as decorative', () => {
    expect(tracker).toContain("hh('span', { 'aria-hidden': 'true', style:");
  });

  it('uses a named native form with an explicit submit control', () => {
    expect(tracker).toContain("hh('form', { 'aria-labelledby': 'learning-lab-habit-custom-heading', onSubmit: saveHabit }");
    expect(tracker).toContain("type: 'submit', 'data-ll-focusable': true");
  });

  it('labels, bounds, and responsively lays out custom fields', () => {
    expect(tracker).toContain("id: 'learning-lab-habit-icon', maxLength: 16");
    expect(tracker).toContain("id: 'learning-lab-habit-name', required: true, maxLength: 240");
    expect(tracker).toContain("id: 'learning-lab-habit-target', maxLength: 500");
    expect(tracker).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))'");
  });

  it('provides inline validation, focus, and announcement for a missing name', () => {
    expect(tracker).toContain("setFormError('Enter a name for the habit.')");
    expect(tracker).toContain("id: 'learning-lab-habit-name-error', role: 'alert'");
    expect(tracker).toContain("setFocusTarget('learning-lab-habit-name')");
    expect(tracker).toContain("llAnnounce('A habit name is required.')");
  });

  it('announces template load, save, and cancel outcomes', () => {
    expect(tracker).toContain("llAnnounce('Editable habit example loaded. Review it before saving.')");
    expect(tracker).toContain("llAnnounce('Habit saved.')");
    expect(tracker).toContain("llAnnounce('Habit creation canceled.')");
  });

  it('uses date-only history calculations immune to local UTC rollover', () => {
    expect(tracker).toContain('Date.UTC(parts[0], parts[1] - 1, parts[2])');
    expect(tracker).toContain('isoFromDayNumber(currentDay - offset)');
    expect(tracker).not.toContain('dt.toISOString().slice(0, 10)');
  });

  it('preserves sibling state on add, toggle, and delete', () => {
    expect(tracker).toContain("setData(Object.assign({}, data, { habits: (data.habits || []).concat([habit]) }))");
    expect(tracker).toContain("setData(Object.assign({}, data, { habits: remaining, logs: logs }))");
    expect(tracker).toContain("setData(Object.assign({}, data, { logs: logs }))");
    expect(tracker).not.toContain('setData({ habits:');
  });

  it('renders tracked habits as a named semantic list', () => {
    expect(tracker).toContain("hh('ul', { 'aria-labelledby': 'learning-lab-habit-list-heading'");
    expect(tracker).toContain("return hh('li', { key: 'h-' + habit.id");
  });

  it('uses textual streak and weekly summaries rather than role img', () => {
    expect(tracker).toContain("'Current streak: ' + streak");
    expect(tracker).toContain("'Last 7 days: ' + thisWeek + ' completed'");
    expect(tracker).not.toContain("role: 'img'");
  });

  it('provides an exact keyboard-accessible 30-day history', () => {
    expect(tracker).toContain("hh('details'");
    expect(tracker).toContain("'View 30-day check-in history (' + completedHistory.length + ' completed)'");
    expect(tracker).toContain("hh('ol', { style:");
    expect(tracker).toContain("hh('time', { dateTime: entry.day }, entry.day)");
  });

  it('keeps the visual strip decorative while preserving exact text history', () => {
    expect(tracker).toContain("hh('div', { 'aria-hidden': 'true', style: { display: 'flex'");
  });

  it('uses item-specific pressed state and full-size today controls', () => {
    expect(tracker).toContain("'aria-pressed': todayDone ? 'true' : 'false'");
    expect(tracker).toContain("'aria-label': (todayDone ? 'Remove today’s check-in for ' : 'Record today’s check-in for ') + habitName");
    expect(tracker).toContain("width: '100%', minHeight: 44");
  });

  it('announces both adding and removing today check-ins', () => {
    expect(tracker).toContain("(wasDone ? 'Removed today’s check-in for ' : 'Recorded today’s check-in for ')");
  });

  it('confirms deletion, announces it, and restores meaningful focus', () => {
    expect(tracker).toContain("title: 'Delete this habit?', confirmText: 'Delete habit'");
    expect(tracker).toContain("llAnnounce('Habit deleted.')");
    expect(tracker).toContain("setFocusTarget(remaining.length ? 'learning-lab-habit-list-heading' : 'learning-lab-habit-add-button')");
  });

  it('uses a named evidence aside with accurate qualified statistics', () => {
    expect(tracker).toContain("'aria-labelledby': 'learning-lab-habit-evidence-heading'");
    expect(tracker).toContain('reported median was 66 days');
    expect(tracker).toContain('range of 18 to 254 days');
    expect(tracker).toContain('do not set a deadline for an individual habit');
    expect(tracker).not.toContain('actual average was 66 DAYS');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
