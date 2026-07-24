import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
describe('Learning Lab Daily Agenda accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalDailyAgenda(props) {');
  const end = source.indexOf('  function PersonalEmotionRegulator(props) {', start);
  const agenda = source.slice(start, end);
  it('uses a labelled bounded native form with inline validation and privacy help', () => {
    expect(agenda).toContain("'aria-labelledby': 'learning-lab-agenda-extra-heading'");
    expect(agenda).toContain("htmlFor: 'learning-lab-agenda-item'");
    expect(agenda).toContain("maxLength: 160");
    expect(agenda).toContain("type: 'submit'");
    expect(agenda).toContain("id: 'learning-lab-agenda-item-error', role: 'alert'");
    expect(agenda).toContain("id: 'learning-lab-agenda-privacy'");
  });
  it('accurately scopes the completion snapshot', () => {
    expect(agenda).toContain('The completion snapshot below counts only habit check-ins and extra agenda items.');
    expect(agenda).toContain("'Completion snapshot: '");
    expect(agenda).toContain("' habit check-ins and extra items complete.'");
    expect(agenda).not.toContain("' planned items.'");
    expect(agenda).not.toContain("Today's done-rate");
  });
  it('uses semantic headings, lists, date, and goal progress', () => {
    expect(agenda).toContain("'learning-lab-daily-agenda-heading'");
    expect(agenda).toContain("hh('time', { dateTime: today }");
    for (const section of ['schedule', 'habits', 'goals', 'tasks', 'extra']) expect(agenda).toContain("learning-lab-agenda-" + section + "-heading");
    expect(agenda.match(/hh\('ul'/g)?.length).toBeGreaterThanOrEqual(5);
    expect(agenda).toContain("role: 'progressbar'");
  });
  it('uses native checkbox controls and visible non-color habit state', () => {
    expect(agenda).toContain("hh('input', { type: 'checkbox', checked: !!it.done");
    expect(agenda).toContain("done ? 'Completed' : 'Not completed'");
    expect(agenda).not.toContain("role: 'checkbox'");
  });
  it('preserves data and restores focus after add and delete', () => {
    expect(agenda.match(/setData\(Object\.assign\(\{\}, data,/g)).toHaveLength(3);
    expect(agenda).toContain("focusId('learning-lab-agenda-item')");
    expect(agenda).toContain("'learning-lab-agenda-extra-heading'");
    expect(agenda).toContain("llAnnounce('Agenda item deleted: ' + item.text + '.')");
  });
  it('confirms deletion and keeps the deployed mirror identical', () => {
    expect(agenda).toContain("title: 'Delete this agenda item?', confirmText: 'Delete item'");
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
