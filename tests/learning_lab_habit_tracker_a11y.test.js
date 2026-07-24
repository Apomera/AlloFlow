import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Habit Tracker accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalHabitTracker(props) {');
  const end = source.indexOf('  function PersonalWeeklyReflection(props) {', start);
  const habitTracker = source.slice(start, end);

  it('associates all custom-habit labels with their controls', () => {
    for (const id of ['learning-lab-habit-icon', 'learning-lab-habit-name', 'learning-lab-habit-target']) {
      expect(habitTracker).toContain(`htmlFor: '${id}'`);
      expect(habitTracker).toContain(`id: '${id}'`);
    }
  });

  it('marks the habit name required and reports validation inline', () => {
    expect(habitTracker).toContain("id: 'learning-lab-habit-name', required: true, maxLength: 240");
    expect(habitTracker).toContain("id: 'learning-lab-habit-name-error', role: 'alert'");
    expect(habitTracker).toContain("setFocusTarget('learning-lab-habit-name')");
    expect(habitTracker).not.toContain("alert('Need a name.')");
  });

  it('gives template and custom controls suitable target sizes', () => {
    expect(habitTracker).toContain("key: 'tp-' + index");
    expect(habitTracker).toContain("type: 'button', onClick: function() { openAdd(template); }");
    expect(habitTracker.match(/minHeight: 44/g)?.length).toBeGreaterThanOrEqual(6);
  });

  it('provides text summaries and an exact accessible 30-day history', () => {
    expect(habitTracker).toContain("'Current streak: ' + streak");
    expect(habitTracker).toContain("'Last 7 days: ' + thisWeek + ' completed'");
    expect(habitTracker).toContain("'View 30-day check-in history (' + completedHistory.length + ' completed)'");
    expect(habitTracker).toContain("hh('time', { dateTime: entry.day }, entry.day)");
  });

  it('confirms deletion and names its 44-pixel control', () => {
    expect(habitTracker).toContain("'aria-label': 'Delete habit: ' + habitName");
    expect(habitTracker).toContain("title: 'Delete this habit?', confirmText: 'Delete habit'");
    expect(habitTracker).toContain('minHeight: 44');
    expect(habitTracker).not.toContain("confirm('Remove this habit and all its history?')");
  });

  it('exposes today completion as a pressed-state toggle', () => {
    expect(habitTracker).toContain("type: 'button', 'aria-pressed': todayDone ? 'true' : 'false'");
    expect(habitTracker).toContain("style: { width: '100%', minHeight: 44");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
